import mongoose from "mongoose"
import Farmer from "../model/Farmer.js"
import AppError from "../utils/AppError.js"
import { validateFarmerInput, parseListQuery } from "../utils/farmerValidator.js"
import { processProfileImage, deleteProfileImage } from "../utils/imageProcessor.js"
import { ROLES, ADMIN_ROLES } from "../constant/roles.js"

// Changing these on a verified profile sends it back for re-verification
const IDENTITY_FIELDS = ["lastName", "firstName", "middleName", "age", "region"]

// Who may submit a farmer profile (a "user" applying, or an existing farmer)
const CAN_CREATE_PROFILE = [ROLES.USER, ROLES.FARMER]

const VERIFICATION_STATES = ["False", "Pending", "Verified"]

// What a buyer is allowed to see. No age, email, phone or Facebook link.
const PUBLIC_FIELDS = "firstName middleName lastName suffix region bio profile isVerified"

// requester = req.user = { id, role }, built from the verified token (never from req.body)
const isAdmin = (requester) => ADMIN_ROLES.includes(requester.role)

function assertValidId(id) {
    if (typeof id !== "string" || !mongoose.isValidObjectId(id)) {
        throw new AppError("Invalid id", 400)
    }
}

// Defense in depth: even if checkOwnership is skipped or misconfigured, the service still checks
function assertCanAccess(farmer, requester) {
    if (isAdmin(requester)) return
    if (farmer.ssoUserId !== requester.id) {
        throw new AppError("Forbidden", 403)
    }
}

async function findFarmerOrFail(id) {
    assertValidId(id)
    const farmer = await Farmer.findById(id)
    if (!farmer) throw new AppError("Farmer profile not found", 404)
    return farmer
}

// ---------- Farmer / user (owner) ----------

export async function createFarmer(body, file, requester) {
    if (!CAN_CREATE_PROFILE.includes(requester.role)) {
        throw new AppError("Forbidden", 403)
    }

    const { data, errors, isValid } = validateFarmerInput(body, { partial: false })
    if (!isValid) throw new AppError("Validation failed", 400, errors)

    if (await Farmer.exists({ ssoUserId: requester.id })) {
        throw new AppError("You already have a farmer profile", 409)
    }

    // The image is verified and processed only after the text fields pass
    let imagePath
    if (file) imagePath = await processProfileImage(file.buffer)

    try {
        return await Farmer.create({
            ...data,
            ssoUserId: requester.id, // always from the token, never from req.body
            isVerified: "False",     // users can't verify themselves
            ...(imagePath && { profile: imagePath })
        })
    } catch (err) {
        await deleteProfileImage(imagePath) // don't leave orphan files
        if (err.code === 11000) throw new AppError("You already have a farmer profile", 409)
        throw err
    }
}

// Used after login: 404 -> go to the verification page, 200 -> check isVerified
export async function getOwnProfile(requester) {
    const farmer = await Farmer.findOne({ ssoUserId: requester.id }).lean()
    if (!farmer) throw new AppError("Farmer profile not found", 404)
    return farmer
}

export async function getFarmerById(id, requester) {
    const farmer = await findFarmerOrFail(id)
    assertCanAccess(farmer, requester) // owner or admin
    return farmer
}

export async function updateFarmer(id, body, file, requester) {
    const farmer = await findFarmerOrFail(id)
    assertCanAccess(farmer, requester)

    const { data, errors, isValid } = validateFarmerInput(body, { partial: true })
    if (!isValid) throw new AppError("Validation failed", 400, errors)

    if (Object.keys(data).length === 0 && !file) {
        throw new AppError("Nothing to update", 400)
    }

    // A verified farmer who changes their identity must be re-checked (admin edits are exempt)
    const identityChanged = IDENTITY_FIELDS.some(
        (field) => field in data && data[field] !== farmer[field]
    )

    const oldImage = farmer.profile
    let newImage
    if (file) newImage = await processProfileImage(file.buffer)

    farmer.set(data)
    if (newImage) farmer.profile = newImage
    if (identityChanged && farmer.isVerified === "Verified" && !isAdmin(requester)) {
        farmer.isVerified = "Pending"
    }

    try {
        await farmer.save()
    } catch (err) {
        await deleteProfileImage(newImage)
        throw err
    }

    if (newImage) await deleteProfileImage(oldImage) // remove the replaced image
    return farmer
}

export async function deleteFarmer(id, requester) {
    const farmer = await findFarmerOrFail(id)
    assertCanAccess(farmer, requester)

    await farmer.deleteOne()
    await deleteProfileImage(farmer.profile)
}

// ---------- Admin ----------

export async function getAllFarmers(query) {
    const { filter, page, limit, errors, isValid } = parseListQuery(query)
    if (!isValid) throw new AppError("Invalid query", 400, errors)

    const [farmers, total] = await Promise.all([
        Farmer.find(filter).sort({ createdAt: -1 }).skip((page - 1) * limit).limit(limit).lean(),
        Farmer.countDocuments(filter)
    ])

    return { farmers, pagination: { page, limit, total, totalPages: Math.ceil(total / limit) } }
}

// Approve / reject / set pending
export async function updateVerificationStatus(id, status) {
    if (typeof status !== "string" || !VERIFICATION_STATES.includes(status)) {
        throw new AppError("Invalid verification status", 400, {
            isVerified: `must be one of: ${VERIFICATION_STATES.join(", ")}`
        })
    }

    const farmer = await findFarmerOrFail(id)
    farmer.isVerified = status
    await farmer.save()
    return farmer
}

// ---------- Buyer ----------

export async function getPublicFarmer(id) {
    assertValidId(id)

    const farmer = await Farmer.findById(id).select(PUBLIC_FIELDS).lean()

    // Same 404 for "doesn't exist" and "not verified", so buyers can't probe for unverified profiles
    if (!farmer || farmer.isVerified !== "Verified") {
        throw new AppError("Farmer profile not found", 404)
    }

    const { profile, ...rest } = farmer
    const base = (process.env.PUBLIC_BASE_URL || "").replace(/\/$/, "")
    return { ...rest, profileUrl: profile ? `${base}${profile}` : null }
}
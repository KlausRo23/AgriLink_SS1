import mongoose from "mongoose"
import Farm from "../model/Farm.js"
import Farmer from "../model/Farmer.js"
import AppError from "../utils/AppError.js"
import { validateFarmInput, parseFarmListQuery } from "../utils/farmValidator.js"
import { processFarmPhoto, deleteFarmPhoto } from "../utils/imageProcessor.js"
import { ROLES, ADMIN_ROLES } from "../constant/roles.js"

// Changing these on a verified farm sends it back for re-verification
const IDENTITY_FIELDS = ["farmName", "location"]

// Who may submit a farm (a "user" applying, or an existing farmer)
const CAN_CREATE_FARM = [ROLES.USER, ROLES.FARMER]

const VERIFICATION_STATES = ["False", "Pending", "Verified"]

// What a buyer is allowed to see
const PUBLIC_FIELDS =
    "farmName farmPhoto location deliveryMode deliverableRegions startedFarming specialty naturallyGrown description owner"

// requester = req.user = { id, role }, built from the verified token (never from req.body)
const isAdmin = (requester) => ADMIN_ROLES.includes(requester.role)

function assertValidId(id) {
    if (typeof id !== "string" || !mongoose.isValidObjectId(id)) {
        throw new AppError("Invalid id", 400)
    }
}

// farm.owner is a Farmer _id, so we resolve the requester's Farmer profile first
async function getRequesterFarmer(requester) {
    return Farmer.findOne({ ssoUserId: requester.id }).select("_id").lean()
}

// Defense in depth: even if checkFarmOwnership is skipped or misconfigured, the service still checks
async function assertCanAccess(farm, requester) {
    if (isAdmin(requester)) return
    const farmer = await getRequesterFarmer(requester)
    if (!farmer || String(farm.owner) !== String(farmer._id)) {
        throw new AppError("Forbidden", 403)
    }
}

async function findFarmOrFail(id) {
    assertValidId(id)
    const farm = await Farm.findById(id)
    if (!farm) throw new AppError("Farm not found", 404)
    return farm
}

function withPhotoUrl(doc) {
    const { farmPhoto, ...rest } = doc
    const base = (process.env.PUBLIC_BASE_URL || "").replace(/\/$/, "")
    return {
        ...rest,
        naturallyGrown: rest.naturallyGrown ?? true,
        farmPhotoUrl: farmPhoto ? `${base}${farmPhoto}` : null
    }
}

// ---------- Farmer / user (owner) ----------

export async function createFarm(body, file, requester) {
    if (!CAN_CREATE_FARM.includes(requester.role)) {
        throw new AppError("Forbidden", 403)
    }

    const { data, errors, isValid } = validateFarmInput(body, { partial: false })
    if (!isValid) throw new AppError("Validation failed", 400, errors)

    // The farm hangs off a Farmer profile, so that must exist first (any verification status)
    const farmer = await getRequesterFarmer(requester)
    if (!farmer) throw new AppError("Create your farmer profile first", 400)

    if (await Farm.exists({ owner: farmer._id })) {
        throw new AppError("You already have a farm", 409)
    }

    // The image is verified and processed only after the text fields pass
    let photoPath
    if (file) photoPath = await processFarmPhoto(file.buffer)

    try {
        return await Farm.create({
            ...data,
            owner: farmer._id,        // always from the token's farmer, never from req.body
            isVerified: "False",      // users can't verify themselves
            ...(photoPath && { farmPhoto: photoPath })
        })
    } catch (err) {
        await deleteFarmPhoto(photoPath) // don't leave orphan files
        if (err.code === 11000) throw new AppError("You already have a farm", 409)
        throw err
    }
}

// Used after login to decide what the dashboard shows. 404 means no farm yet.
export async function getOwnFarm(requester) {
    const farmer = await getRequesterFarmer(requester)
    if (!farmer) throw new AppError("Farm not found", 404)

    const farm = await Farm.findOne({ owner: farmer._id }).lean()
    if (!farm) throw new AppError("Farm not found", 404)
    return farm
}

export async function getFarmById(id, requester) {
    const farm = await findFarmOrFail(id)
    await assertCanAccess(farm, requester) // owner or admin
    return farm
}

export async function updateFarm(id, body, file, requester) {
    const farm = await findFarmOrFail(id)
    await assertCanAccess(farm, requester)

    const { data, errors, isValid } = validateFarmInput(body, { partial: true })
    if (!isValid) throw new AppError("Validation failed", 400, errors)

    if (Object.keys(data).length === 0 && !file) {
        throw new AppError("Nothing to update", 400)
    }

    // A verified farm that changes its name or location must be re-checked (admin edits are exempt)
    const identityChanged = IDENTITY_FIELDS.some(
        (field) => field in data && data[field] !== farm[field]
    )

    const oldPhoto = farm.farmPhoto
    let newPhoto
    if (file) newPhoto = await processFarmPhoto(file.buffer)

    farm.set(data)
    if (newPhoto) farm.farmPhoto = newPhoto
    if (identityChanged && farm.isVerified === "Verified" && !isAdmin(requester)) {
        farm.isVerified = "Pending"
    }

    try {
        await farm.save()
    } catch (err) {
        await deleteFarmPhoto(newPhoto)
        throw err
    }

    if (newPhoto) await deleteFarmPhoto(oldPhoto) // remove the replaced photo
    return farm
}

export async function deleteFarm(id, requester) {
    const farm = await findFarmOrFail(id)
    await assertCanAccess(farm, requester)

    await farm.deleteOne()
    await deleteFarmPhoto(farm.farmPhoto)
}

// ---------- Admin ----------

export async function getAllFarms(query) {
    const { filter, page, limit, errors, isValid } = parseFarmListQuery(query)
    if (!isValid) throw new AppError("Invalid query", 400, errors)

    const [farms, total] = await Promise.all([
        Farm.find(filter)
            .populate("owner", "firstName lastName suffix isVerified")
            .sort({ createdAt: -1 })
            .skip((page - 1) * limit)
            .limit(limit)
            .lean(),
        Farm.countDocuments(filter)
    ])

    return { farms, pagination: { page, limit, total, totalPages: Math.ceil(total / limit) } }
}

// Approve / reject / set pending
export async function updateVerificationStatus(id, status) {
    if (typeof status !== "string" || !VERIFICATION_STATES.includes(status)) {
        throw new AppError("Invalid verification status", 400, {
            isVerified: `must be one of: ${VERIFICATION_STATES.join(", ")}`
        })
    }

    const farm = await findFarmOrFail(id)
    farm.isVerified = status
    await farm.save()
    return farm
}

// ---------- Buyer ----------

export async function getPublicFarm(id) {
    assertValidId(id)

    const farm = await Farm.findById(id)
        .select(PUBLIC_FIELDS)
        .populate("owner", "firstName lastName suffix") // owner name only, no contact details
        .lean()

    // Same 404 for "doesn't exist" and "not verified", so buyers can't probe for unverified farms
    if (!farm) throw new AppError("Farm not found", 404)

    const verified = await Farm.exists({ _id: id, isVerified: "Verified" })
    if (!verified) throw new AppError("Farm not found", 404)

    return withPhotoUrl(farm)
}
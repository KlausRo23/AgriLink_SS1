import Farmer from "../model/Farmer.js"
import Farm from "../model/Farm.js"
import Verification from "../model/Verification.js"
import AppError from "../utils/AppError.js"
import { deleteVerificationFile, storeVerificationFile } from "../utils/verificationStorage.js"
import mongoose from "mongoose"
import path from "node:path"
import { sanitizeInput } from "../utils/sanitizeInput.js"

const VERIFICATION_STATUSES = ["pending", "approved", "rejected"]

function assertValidId(id) {
    if (typeof id !== "string" || !mongoose.isValidObjectId(id)) {
        throw new AppError("Invalid verification id", 400)
    }
}

function parseListQuery(query = {}) {
    const filter = {}
    const errors = {}
    if (query.status !== undefined) {
        if (typeof query.status !== "string" || !VERIFICATION_STATUSES.includes(query.status)) {
            errors.status = `must be one of: ${VERIFICATION_STATUSES.join(", ")}`
        } else filter.status = query.status
    }

    const page = query.page === undefined ? 1 : Number(query.page)
    const limit = query.limit === undefined ? 12 : Number(query.limit)
    if (!Number.isInteger(page) || page < 1) errors.page = "must be a positive integer"
    if (!Number.isInteger(limit) || limit < 1 || limit > 50) errors.limit = "must be an integer from 1 to 50"

    return { filter, page, limit, errors }
}

function normalizeRemarks(rawRemarks) {
    if (rawRemarks === undefined || rawRemarks === null || rawRemarks === "") return ""
    if (typeof rawRemarks !== "string") {
        throw new AppError("Invalid remarks", 400, { remarks: "must be text" })
    }
    const remarks = sanitizeInput(rawRemarks).trim()
    if (remarks.length > 200) {
        throw new AppError("Invalid remarks", 400, { remarks: "must be 200 characters or fewer" })
    }
    return remarks
}

function presentVerification(verification) {
    const { supportingDocuments, facePhoto, ...data } = verification
    const id = String(verification._id)
    return {
        ...data,
        supportingDocumentsUrl: supportingDocuments
            ? `/verification/${id}/files/supportingDocuments`
            : null,
        facePhotoUrl: facePhoto
            ? `/verification/${id}/files/facePhoto`
            : null
    }
}

const NAME_REGEX = /^[\p{L}][\p{L}\s.'-]*$/u
const SUFFIXES = ["Jr", "Sr", "I", "II", "III"]

function validateSubmission(body, files) {
    const errors = {}
    const data = {}

    for (const field of ["firstName", "middleName", "lastName"]) {
        const value = typeof body[field] === "string" ? body[field].trim() : ""
        if (value.length < 2 || value.length > 30 || !NAME_REGEX.test(value)) {
            errors[field] = `${field} must be 2-30 characters and contain only letters, spaces, . ' or -`
        } else data[field] = value
    }

    if (body.suffix) {
        if (typeof body.suffix !== "string" || !SUFFIXES.includes(body.suffix)) {
            errors.suffix = "Invalid suffix"
        } else data.suffix = body.suffix
    }

    const age = Number(body.Age ?? body.age)
    if (!Number.isInteger(age) || age < 18 || age > 99) errors.age = "Age must be a whole number from 18 to 99"
    else data.Age = age

    const registration = typeof body.rsbsaRegistration === "string" ? body.rsbsaRegistration.trim() : ""
    if (!registration || registration.length > 50) {
        errors.rsbsaRegistration = "Enter an RSBSA registration number of 50 characters or fewer"
    } else data.rsbsaRegistration = registration

    const supportingDocument = files?.supportingDocuments?.[0]
    const facePhoto = files?.facePhoto?.[0]
    if (!supportingDocument) errors.supportingDocuments = "Supporting document is required"
    if (!facePhoto) errors.facePhoto = "Face photo is required"

    return { data, errors, supportingDocument, facePhoto }
}

export async function getOwnVerificationStatus(requester) {
    const verification = await Verification.findOne({ ssoUserId: requester.id })
        .select("status")
        .lean()
    const submitted = Boolean(verification && verification.status !== "rejected")
    return { submitted, status: verification?.status ?? null }
}

export async function submitVerification(body, files, requester) {
    const { data, errors, supportingDocument, facePhoto } = validateSubmission(body, files)
    if (Object.keys(errors).length) throw new AppError("Validation failed", 400, errors)

    const farmer = await Farmer.findOne({ ssoUserId: requester.id }).select("_id").lean()
    if (!farmer) throw new AppError("Create your farmer profile first", 400)
    const farmExists = await Farm.exists({ owner: farmer._id })
    if (!farmExists) throw new AppError("Create your farm profile first", 400)

    const existing = await Verification.findOne({ ssoUserId: requester.id })
    if (existing && existing.status !== "rejected") {
        throw new AppError("Your verification has already been submitted", 409)
    }

    let supportingPath
    let facePath
    let record
    try {
        supportingPath = await storeVerificationFile(supportingDocument, { allowPdf: true })
        facePath = await storeVerificationFile(facePhoto)

        record = existing || new Verification({ ssoUserId: requester.id })
        record.set({
            ...data,
            supportingDocuments: supportingPath,
            facePhoto: facePath,
            status: "pending",
            reviewedBy: undefined,
            remarks: undefined,
            reviewAt: undefined
        })
        await record.save()
    } catch (error) {
        await Promise.all(
            [supportingPath, facePath].filter(Boolean).map(deleteVerificationFile)
        ).catch((cleanupError) => console.error("Could not remove incomplete verification files:", cleanupError))
        if (error.code === 11000) {
            throw new AppError("Your verification has already been submitted", 409)
        }
        throw error
    }

    if (existing) {
        await Promise.all([existing.supportingDocuments, existing.facePhoto].map(deleteVerificationFile))
            .catch((error) => console.error("Could not remove replaced verification files:", error))
    }
    await Farmer.updateOne({ ssoUserId: requester.id }, { $set: { isVerified: "Pending" } })
    return { status: record.status }
}

export async function getAllVerification(query = {}) {
    const { filter, page, limit, errors } = parseListQuery(query)
    if (Object.keys(errors).length) throw new AppError("Invalid query", 400, errors)

    const [verifications, total] = await Promise.all([
        Verification.find(filter)
            .sort({ createdAt: -1 })
            .skip((page - 1) * limit)
            .limit(limit)
            .lean(),
        Verification.countDocuments(filter)
    ])

    return {
        verifications: verifications.map(presentVerification),
        pagination: { page, limit, total, totalPages: Math.ceil(total / limit) }
    }
}

export async function getVerificationById(id) {
    assertValidId(id)
    const verification = await Verification.findById(id).lean()
    if (!verification) throw new AppError("Verification not found", 404)
    return presentVerification(verification)
}

export async function getVerificationFile(id, fileType) {
    assertValidId(id)
    if (!["supportingDocuments", "facePhoto"].includes(fileType)) {
        throw new AppError("Invalid verification file type", 400)
    }

    const verification = await Verification.findById(id)
        .select("supportingDocuments facePhoto")
        .lean()
    if (!verification) throw new AppError("Verification not found", 404)

    const relativePath = verification[fileType]
    if (!relativePath) throw new AppError("Verification file not found", 404)

    return path.join(
        process.cwd(),
        "uploads",
        "verification",
        path.basename(relativePath)
    )
}

export async function reviewVerification(id, status, rawRemarks, reviewer) {
    assertValidId(id)
    if (!["approved", "rejected"].includes(status)) {
        throw new AppError("Invalid verification status", 400)
    }

    const remarks = normalizeRemarks(rawRemarks)
    const verification = await Verification.findById(id)
    if (!verification) throw new AppError("Verification not found", 404)
    if (verification.status !== "pending") {
        throw new AppError(`Only pending verifications can be reviewed (this one is ${verification.status})`, 409)
    }

    const farmer = await Farmer.findOne({ ssoUserId: verification.ssoUserId })
    if (!farmer) throw new AppError("Farmer profile not found", 404)

    const reviewedVerification = await Verification.findOneAndUpdate(
        { _id: id, status: "pending" },
        {
            $set: {
                status,
                reviewedBy: {
                    userId: reviewer.id,
                    role: reviewer.role
                },
                remarks: remarks || undefined,
                reviewAt: new Date()
            }
        },
        { new: true, runValidators: true }
    )
    if (!reviewedVerification) {
        throw new AppError("This verification has already been reviewed", 409)
    }

    farmer.isVerified = status === "approved" ? "Verified" : "False"

    await farmer.save()

    return presentVerification(reviewedVerification.toObject())
}

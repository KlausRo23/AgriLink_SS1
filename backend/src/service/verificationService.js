import Farmer from "../model/Farmer.js"
import Farm from "../model/Farm.js"
import Verification from "../model/Verification.js"
import AppError from "../utils/AppError.js"
import { deleteVerificationFile, storeVerificationFile } from "../utils/verificationStorage.js"

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
    return { status: record.status }
}

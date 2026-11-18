import * as verificationService from "../service/verificationService.js"

function handleError(res, error) {
    if (error.statusCode) {
        return res.status(error.statusCode).json({
            success: false,
            message: error.message,
            data: error.errors ?? null
        })
    }
    if (error.name === "ValidationError") {
        return res.status(400).json({ success: false, message: "Validation failed", data: null })
    }
    console.error("Verification controller error:", error)
    return res.status(500).json({ success: false, message: "Internal server error", data: null })
}

export async function getOwnVerificationStatus(req, res) {
    try {
        const status = await verificationService.getOwnVerificationStatus(req.user)
        return res.status(200).json({ success: true, data: status })
    } catch (error) {
        return handleError(res, error)
    }
}

export async function submitVerification(req, res) {
    try {
        const verification = await verificationService.submitVerification(req.body, req.files, req.user)
        return res.status(201).json({
            success: true,
            message: "Verification submitted",
            data: verification
        })
    } catch (error) {
        return handleError(res, error)
    }
}

export async function getAllVerification(req, res) {
    try {
        const result = await verificationService.getAllVerification(req.query)
        return res.status(200).json({ success: true, message: "Verifications fetched", data: result })
    } catch (error) {
        return handleError(res, error)
    }
}

export async function getFarmerVerification(req, res) {
    try {
        const result = await verificationService.getVerificationById(req.params.id)
        return res.status(200).json({ success: true, message: "Verification fetched", data: result })
    } catch (error) {
        return handleError(res, error)
    }
}

export async function getVerificationFile(req, res) {
    try {
        const filePath = await verificationService.getVerificationFile(
            req.params.id,
            req.params.fileType
        )
        return res.sendFile(filePath, {
            headers: { "Content-Disposition": "inline" }
        }, (error) => {
            if (!error || res.headersSent) return
            if (error.code === "ENOENT") {
                return res.status(404).json({ success: false, message: "Verification file not found", data: null })
            }
            console.error("Could not send verification file:", error)
            return res.status(500).json({ success: false, message: "Internal server error", data: null })
        })
    } catch (error) {
        return handleError(res, error)
    }
}

export async function approveVerification(req, res) {
    try {
        const result = await verificationService.reviewVerification(
            req.params.id,
            "approved",
            req.body?.remarks,
            req.user
        )
        return res.status(200).json({ success: true, message: "Verification approved", data: result })
    } catch (error) {
        return handleError(res, error)
    }
}

export async function rejectVerification(req, res) {
    try {
        const result = await verificationService.reviewVerification(
            req.params.id,
            "rejected",
            req.body?.remarks,
            req.user
        )
        return res.status(200).json({ success: true, message: "Verification rejected", data: result })
    } catch (error) {
        return handleError(res, error)
    }
}

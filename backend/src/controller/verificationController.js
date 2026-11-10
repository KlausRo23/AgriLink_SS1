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

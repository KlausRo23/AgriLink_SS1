import * as farmService from "../service/farmService.js"

function handleError(res, err) {
    if (err.statusCode) {
        return res.status(err.statusCode).json({
            success: false,
            message: err.message,
            data: err.errors ?? null
        })
    }
    if (err.name === "ValidationError") {
        return res.status(400).json({ success: false, message: "Validation failed", data: null })
    }
    console.error("Farm controller error:", err)
    return res.status(500).json({ success: false, message: "Internal server error", data: null })
}

// ---------- Farmer / user ----------

export async function createFarmProfile(req, res) {
    try {
        const farm = await farmService.createFarm(req.body, req.file, req.user)
        return res.status(201).json({ success: true, message: "Farm created", data: farm })
    } catch (err) {
        return handleError(res, err)
    }
}

export async function getOwnFarm(req, res) {
    try {
        const farm = await farmService.getOwnFarm(req.user)
        return res.status(200).json({ success: true, message: "Farm fetched", data: farm })
    } catch (err) {
        return handleError(res, err)
    }
}

export async function getMyFarmProfile(req, res) {
    try {
        const farm = await farmService.getFarmById(req.params.id, req.user)
        return res.status(200).json({ success: true, message: "Farm fetched", data: farm })
    } catch (err) {
        return handleError(res, err)
    }
}

export async function editFarmProfile(req, res) {
    try {
        const farm = await farmService.updateFarm(req.params.id, req.body, req.file, req.user)
        return res.status(200).json({ success: true, message: "Farm updated", data: farm })
    } catch (err) {
        return handleError(res, err)
    }
}

export async function deleteFarm(req, res) {
    try {
        await farmService.deleteFarm(req.params.id, req.user)
        return res.status(200).json({ success: true, message: "Farm deleted", data: null })
    } catch (err) {
        return handleError(res, err)
    }
}

// ---------- SuperAdmin and Admin ----------

export async function getFarmProfile(req, res) {
    try {
        const farm = await farmService.getFarmById(req.params.id, req.user)
        return res.status(200).json({ success: true, message: "Farm fetched", data: farm })
    } catch (err) {
        return handleError(res, err)
    }
}

export async function getAllFarmList(req, res) {
    try {
        const result = await farmService.getAllFarms(req.query)
        return res.status(200).json({ success: true, message: "Farm list fetched", data: result })
    } catch (err) {
        return handleError(res, err)
    }
}

export async function updateFarmVerification(req, res) {
    try {
        const farm = await farmService.updateVerificationStatus(req.params.id, req.body?.isVerified)
        return res.status(200).json({ success: true, message: "Verification status updated", data: farm })
    } catch (err) {
        return handleError(res, err)
    }
}

// ---------- Buyer ----------

export async function getPublicFarm(req, res) {
    try {
        const farm = await farmService.getPublicFarm(req.params.id)
        return res.status(200).json({ success: true, message: "Farm fetched", data: farm })
    } catch (err) {
        return handleError(res, err)
    }
}
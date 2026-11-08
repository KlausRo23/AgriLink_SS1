import * as farmerService from "../service/farmerService.js"

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
    console.error("Farmer controller error:", err)
    return res.status(500).json({ success: false, message: "Internal server error", data: null })
}

// ---------- Farmer / user ----------

export async function createProfile(req, res) {
    try {
        const farmer = await farmerService.createFarmer(req.body, req.file, req.user)
        return res.status(201).json({ success: true, message: "Profile created", data: farmer })
    } catch (err) {
        return handleError(res, err)
    }
}

export async function getOwnProfile(req, res) {
    try {
        const farmer = await farmerService.getOwnProfile(req.user)
        return res.status(200).json({ success: true, message: "Profile fetched", data: farmer })
    } catch (err) {
        return handleError(res, err)
    }
}

export async function getMyProfile(req, res) {
    try {
        const farmer = await farmerService.getFarmerById(req.params.id, req.user)
        return res.status(200).json({ success: true, message: "Profile fetched", data: farmer })
    } catch (err) {
        return handleError(res, err)
    }
}

export async function editProfile(req, res) {
    try {
        const farmer = await farmerService.updateFarmer(req.params.id, req.body, req.file, req.user)
        return res.status(200).json({ success: true, message: "Profile updated", data: farmer })
    } catch (err) {
        return handleError(res, err)
    }
}

export async function deleteFarmer(req, res) {
    try {
        await farmerService.deleteFarmer(req.params.id, req.user)
        return res.status(200).json({ success: true, message: "Profile deleted", data: null })
    } catch (err) {
        return handleError(res, err)
    }
}

// ---------- SuperAdmin and Admin ----------

export async function getFarmerProfile(req, res) {
    try {
        const farmer = await farmerService.getFarmerById(req.params.id, req.user)
        return res.status(200).json({ success: true, message: "Farmer profile fetched", data: farmer })
    } catch (err) {
        return handleError(res, err)
    }
}

export async function getAllFarmerList(req, res) {
    try {
        const result = await farmerService.getAllFarmers(req.query)
        return res.status(200).json({ success: true, message: "Farmer list fetched", data: result })
    } catch (err) {
        return handleError(res, err)
    }
}

export async function updateVerification(req, res) {
    try {
        const farmer = await farmerService.updateVerificationStatus(req.params.id, req.body?.isVerified)
        return res.status(200).json({ success: true, message: "Verification status updated", data: farmer })
    } catch (err) {
        return handleError(res, err)
    }
}

// ---------- Buyer ----------

export async function getPublicProfile(req, res) {
    try {
        const farmer = await farmerService.getPublicFarmer(req.params.id)
        return res.status(200).json({ success: true, message: "Farmer profile fetched", data: farmer })
    } catch (err) {
        return handleError(res, err)
    }
}
import * as cropService from "../service/cropService.js"

function handleError(res, err) {
    if (err.statusCode) {
        return res.status(err.statusCode).json({
            success: false,
            message: err.message,
            data: err.errors ?? null
        })
    }
    if (err.name === "ValidationError" || err.name === "CastError") {
        return res.status(400).json({ success: false, message: "Validation failed", data: null })
    }
    console.error("Crop controller error:", err)
    return res.status(500).json({ success: false, message: "Internal server error", data: null })
}

export async function getAllCrops(req, res) {
    try {
        const result = await cropService.getAllCrops(req.query, req.user)
        return res.status(200).json({ success: true, message: "Crops fetched", data: result })
    } catch (err) {
        return handleError(res, err)
    }
}

export async function getCropDetail(req, res) {
    try {
        const crop = await cropService.getCropById(req.params.id, req.user)
        return res.status(200).json({ success: true, message: "Crop fetched", data: crop })
    } catch (err) {
        return handleError(res, err)
    }
}

export async function createCrop(req, res) {
    try {
        const crop = await cropService.createCrop(req.body, req.file, req.user)
        return res.status(201).json({ success: true, message: "Crop added", data: crop })
    } catch (err) {
        return handleError(res, err)
    }
}

export async function editCrop(req, res) {
    try {
        const crop = await cropService.updateCrop(req.params.id, req.body, req.file, req.user)
        return res.status(200).json({ success: true, message: "Crop updated", data: crop })
    } catch (err) {
        return handleError(res, err)
    }
}

export async function archiveCrop(req, res) {
    try {
        await cropService.archiveCrop(req.params.id, req.body?.reason, req.user)
        return res.status(200).json({ success: true, message: "Crop moved to archive", data: null })
    } catch (err) {
        return handleError(res, err)
    }
}
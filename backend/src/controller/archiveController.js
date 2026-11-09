import * as archiveService from "../service/archiveService.js"

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
    console.error("Archive controller error:", err)
    return res.status(500).json({ success: false, message: "Internal server error", data: null })
}

export async function getAllArchive(req, res) {
    try {
        const result = await archiveService.getAllArchive(req.query, req.user)
        return res.status(200).json({ success: true, message: "Archive fetched", data: result })
    } catch (err) {
        return handleError(res, err)
    }
}

export async function getArchiveDetail(req, res) {
    try {
        const item = await archiveService.getArchiveById(req.params.id, req.user)
        return res.status(200).json({ success: true, message: "Archived item fetched", data: item })
    } catch (err) {
        return handleError(res, err)
    }
}

export async function createArchive(req, res) {
    try {
        const item = await archiveService.createArchive(req.body, req.user)
        return res.status(201).json({ success: true, message: "Item moved to archive", data: item })
    } catch (err) {
        return handleError(res, err)
    }
}

export async function restoreArchive(req, res) {
    try {
        const result = await archiveService.restoreArchive(req.params.id, req.user)
        return res.status(200).json({ success: true, message: "Item restored", data: result })
    } catch (err) {
        return handleError(res, err)
    }
}

export async function deleteArchive(req, res) {
    try {
        await archiveService.deleteArchive(req.params.id, req.user)
        return res.status(200).json({ success: true, message: "Item permanently deleted", data: null })
    } catch (err) {
        return handleError(res, err)
    }
}
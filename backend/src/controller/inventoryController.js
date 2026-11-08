import * as inventoryService from "../service/inventoryService.js"

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
    console.error("Inventory controller error:", err)
    return res.status(500).json({ success: false, message: "Internal server error", data: null })
}

export async function getAllInventory(req, res) {
    try {
        const result = await inventoryService.getAllInventory(req.query, req.user)
        return res.status(200).json({ success: true, message: "Inventory fetched", data: result })
    } catch (err) {
        return handleError(res, err)
    }
}

export async function getInventoryDetail(req, res) {
    try {
        const item = await inventoryService.getInventoryById(req.params.id, req.user)
        return res.status(200).json({ success: true, message: "Inventory item fetched", data: item })
    } catch (err) {
        return handleError(res, err)
    }
}

export async function createInventory(req, res) {
    try {
        const item = await inventoryService.createInventory(req.body, req.file, req.user)
        return res.status(201).json({ success: true, message: "Inventory item added", data: item })
    } catch (err) {
        return handleError(res, err)
    }
}

export async function editInventory(req, res) {
    try {
        const item = await inventoryService.updateInventory(req.params.id, req.body, req.file, req.user)
        return res.status(200).json({ success: true, message: "Inventory item updated", data: item })
    } catch (err) {
        return handleError(res, err)
    }
}

export async function deleteInventory(req, res) {
    try {
        await inventoryService.deleteInventory(req.params.id, req.body?.reason, req.user)
        return res.status(200).json({ success: true, message: "Inventory item moved to archive", data: null })
    } catch (err) {
        return handleError(res, err)
    }
}
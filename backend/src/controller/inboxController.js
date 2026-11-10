import * as inboxService from "../service/inboxService.js"

function handleError(res, error) {
    if (error.statusCode) {
        return res.status(error.statusCode).json({
            success: false,
            message: error.message,
            data: error.errors ?? null
        })
    }
    if (error.name === "ValidationError" || error.name === "CastError") {
        return res.status(400).json({ success: false, message: "Validation failed", data: null })
    }
    console.error("Inbox controller error:", error)
    return res.status(500).json({ success: false, message: "Could not process inbox request", data: null })
}

export async function getConversations(req, res) {
    try {
        const conversations = await inboxService.listConversations(req.user)
        return res.status(200).json({ success: true, message: "Inbox fetched", data: conversations })
    } catch (error) {
        return handleError(res, error)
    }
}

export async function createOrderRequest(req, res) {
    try {
        const conversation = await inboxService.createOrderRequest(req.body, req.user)
        return res.status(201).json({ success: true, message: "Order request submitted", data: conversation })
    } catch (error) {
        return handleError(res, error)
    }
}

export async function respondToRequest(req, res) {
    try {
        const conversation = await inboxService.updateRequest(req.params.id, req.body.action, req.user)
        return res.status(200).json({ success: true, message: "Order request updated", data: conversation })
    } catch (error) {
        return handleError(res, error)
    }
}

export async function updateOrderStatus(req, res) {
    try {
        const conversation = await inboxService.updateOrderStatus(req.params.id, req.body.orderStatus, req.user)
        return res.status(200).json({ success: true, message: "Order status updated", data: conversation })
    } catch (error) {
        return handleError(res, error)
    }
}

export async function sendMessage(req, res) {
    try {
        const conversation = await inboxService.addMessage(req.params.id, req.body, req.user)
        return res.status(201).json({ success: true, message: "Message sent", data: conversation })
    } catch (error) {
        return handleError(res, error)
    }
}

export async function updateArchive(req, res) {
    try {
        const conversation = await inboxService.setArchived(req.params.id, req.body.archived, req.user)
        return res.status(200).json({ success: true, message: "Conversation updated", data: conversation })
    } catch (error) {
        return handleError(res, error)
    }
}

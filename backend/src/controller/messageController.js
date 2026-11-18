import * as messageService from "../service/messageService.js"

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
    console.error("Message controller error:", error)
    return res.status(500).json({ success: false, message: "Could not process message request", data: null })
}

function handleRequest(handler) {
    return async (req, res) => {
        try {
            return await handler(req, res)
        } catch (error) {
            return handleError(res, error)
        }
    }
}

export const getMessages = handleRequest(async (req, res) => {
    const messages = await messageService.listMessages(req.query.conversationId, req.user)
    return res.status(200).json({ success: true, message: "Messages fetched", data: messages })
})

export const createMessage = handleRequest(async (req, res) => {
    const conversation = await messageService.createMessage(req.body, req.user)
    return res.status(201).json({ success: true, message: "Message sent", data: conversation })
})

export const editMessage = handleRequest(async (req, res) => {
    const conversation = await messageService.editMessage(req.params.id, req.body, req.user)
    return res.status(200).json({ success: true, message: "Message updated", data: conversation })
})

export const deleteMessage = handleRequest(async (req, res) => {
    const conversation = await messageService.deleteMessage(req.params.id, req.user)
    return res.status(200).json({ success: true, message: "Message deleted", data: conversation })
})

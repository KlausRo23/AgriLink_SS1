import mongoose from "mongoose"
import InboxConversation from "../model/InboxConversation.js"
import AppError from "../utils/AppError.js"
import {
    addMessage as addInboxMessage,
    findParticipantConversation,
    presentConversation
} from "./inboxService.js"

function assertMessageId(id) {
    if (!mongoose.isValidObjectId(id)) throw new AppError("Invalid message id", 400)
}

function getMessageText(body = {}) {
    const text = body.text ?? body.content
    if (typeof text !== "string" || !text.trim() || text.trim().length > 2000) {
        throw new AppError("Message must be non-empty text no longer than 2000 characters", 400)
    }
    return text.trim()
}

async function findEditableMessage(id, requester) {
    assertMessageId(id)
    const conversation = await InboxConversation.findOne({
        "messages._id": id,
        $or: [{ farmerId: requester.id }, { buyerId: requester.id }]
    })
    if (!conversation) throw new AppError("Message not found", 404)
    if (conversation.status !== "active") {
        throw new AppError("Messages can only be changed in an active conversation", 409)
    }

    const message = conversation.messages.id(id)
    if (!message || message.type !== "message") throw new AppError("Message not found", 404)
    if (message.senderId !== requester.id) throw new AppError("You can only change your own messages", 403)
    return { conversation, message }
}

export async function listMessages(conversationId, requester) {
    const conversation = await findParticipantConversation(conversationId, requester)
    if (conversation.status !== "active") {
        throw new AppError("Messages are available only in an active conversation", 409)
    }
    return presentConversation(conversation, requester).messages
}

export async function createMessage(body = {}, requester) {
    if (!body || typeof body !== "object" || Array.isArray(body)) body = {}
    const text = getMessageText(body)
    return addInboxMessage(body.conversationId, { text }, requester)
}

export async function editMessage(id, body = {}, requester) {
    const text = getMessageText(body)
    const { conversation, message } = await findEditableMessage(id, requester)
    message.text = text
    await conversation.save()
    return presentConversation(conversation, requester)
}

export async function deleteMessage(id, requester) {
    const { conversation } = await findEditableMessage(id, requester)
    conversation.messages.pull(id)
    await conversation.save()
    return presentConversation(conversation, requester)
}

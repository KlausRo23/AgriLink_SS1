import mongoose from "mongoose"
import InboxConversation from "../model/InboxConversation.js"
import Listing from "../model/Listing.js"
import Inventory from "../model/Inventory.js"
import Farmer from "../model/Farmer.js"
import Farm from "../model/Farm.js"
import User from "../model/User.js"
import AppError from "../utils/AppError.js"

const ORDER_STATUSES = ["confirmed", "preparing", "ready", "delivered", "cancelled"]
const text = (value, maxLength, field, { required = false } = {}) => {
    if (value === undefined || value === null) {
        if (required) throw new AppError(`${field} is required`, 400)
        return ""
    }
    if (typeof value !== "string" || value.trim().length > maxLength || (required && !value.trim())) {
        throw new AppError(`${field} must be ${required ? "non-empty text" : "text"} no longer than ${maxLength} characters`, 400)
    }
    return value.trim()
}

function assertConversationId(id) {
    if (!mongoose.isValidObjectId(id)) throw new AppError("Invalid conversation id", 400)
}

async function findParticipantConversation(id, requester) {
    assertConversationId(id)
    const conversation = await InboxConversation.findOne({
        _id: id,
        $or: [{ farmerId: requester.id }, { buyerId: requester.id }]
    })
    if (!conversation) throw new AppError("Conversation not found", 404)
    return conversation
}

function displayTime(date) {
    return new Intl.DateTimeFormat("en-PH", { hour: "numeric", minute: "2-digit" }).format(date)
}

function presentConversation(conversation, requester) {
    const ownAsFarmer = conversation.farmerId === requester.id
    const archived = conversation.archivedFor.includes(requester.id)
    const messages = conversation.messages.map((message) => ({
        id: String(message._id),
        sender: message.type === "system" ? "system" : message.senderId === requester.id ? "farmer" : "customer",
        own: message.senderId === requester.id,
        type: message.type,
        text: message.text,
        time: displayTime(message.createdAt)
    }))

    return {
        id: String(conversation._id),
        isFarmer: ownAsFarmer,
        customerName: ownAsFarmer ? conversation.buyerName : conversation.farmName || conversation.farmerName,
        buyer: {
            fullName: conversation.buyerName,
            businessName: conversation.buyerBusinessName || conversation.buyerName,
            location: conversation.buyerLocation || "Buyer location not provided",
            customerType: "Customer",
            memberSince: "AgriLink member",
            orderCount: 0,
            avatarUrl: ""
        },
        listingId: String(conversation.listingId),
        listingName: conversation.listingName,
        listingPrice: conversation.listingPrice,
        quantity: conversation.quantity,
        unit: conversation.unit,
        subtotal: conversation.subtotal,
        orderStatus: conversation.orderStatus,
        completedAt: conversation.completedAt,
        archived,
        deliveryMethod: conversation.deliveryMethod,
        requestedDeliveryDate: conversation.requestedDeliveryDate,
        requestNote: conversation.requestNote,
        requestedAt: conversation.createdAt.toLocaleString("en-PH", { dateStyle: "medium", timeStyle: "short" }),
        status: conversation.status,
        updatedAt: displayTime(conversation.updatedAt),
        messages
    }
}

export async function listConversations(requester) {
    const conversations = await InboxConversation.find({
        $or: [{ farmerId: requester.id }, { buyerId: requester.id }]
    }).sort({ updatedAt: -1 }).limit(100).lean()
    return conversations.map((conversation) => presentConversation(conversation, requester))
}

export async function createOrderRequest(body = {}, requester) {
    if (!body || typeof body !== "object" || Array.isArray(body)) body = {}
    if (!mongoose.isValidObjectId(body.listingId)) throw new AppError("Invalid listing id", 400)
    const quantity = Number(body.quantity)
    if (!Number.isFinite(quantity) || quantity <= 0 || Math.round(quantity * 100) / 100 !== quantity) {
        throw new AppError("Quantity must be greater than zero with at most 2 decimal places", 400)
    }

    const listing = await Listing.findOne({ _id: body.listingId, status: "approved" }).lean()
    if (!listing) throw new AppError("Listing is not available", 404)
    if (listing.owner === requester.id) throw new AppError("You cannot order your own listing", 403)

    const inventory = await Inventory.findOne({ _id: listing.inventory, owner: listing.owner }).lean()
    if (!inventory || inventory.expirationDate && inventory.expirationDate < new Date()) {
        throw new AppError("This listing is no longer available", 409)
    }
    if (quantity > listing.stock || quantity > inventory.quantity) {
        throw new AppError("Requested quantity exceeds available stock", 400)
    }

    const [buyer, farmer] = await Promise.all([
        User.findById(requester.id).select("name").lean(),
        Farmer.findOne({ ssoUserId: listing.owner }).select("_id firstName lastName suffix").lean()
    ])
    if (!buyer) throw new AppError("Buyer account not found", 404)
    const farm = farmer ? await Farm.findOne({ owner: farmer._id }).select("farmName location").lean() : null
    const buyerName = buyer.name.trim() || "Buyer"
    const conversation = await InboxConversation.create({
        farmerId: listing.owner,
        buyerId: requester.id,
        listingId: listing._id,
        listingName: listing.name,
        listingPrice: listing.price,
        quantity,
        unit: listing.unit,
        subtotal: Math.round(quantity * listing.price * 100) / 100,
        buyerName,
        buyerBusinessName: text(body.businessName, 100, "businessName"),
        buyerLocation: text(body.location, 200, "location"),
        farmerName: [farmer?.firstName, farmer?.lastName, farmer?.suffix].filter(Boolean).join(" ") || "Farmer",
        farmName: farm?.farmName || "",
        farmLocation: farm?.location || "",
        deliveryMethod: text(body.deliveryMethod, 100, "deliveryMethod") || "To be arranged",
        requestedDeliveryDate: text(body.requestedDeliveryDate, 100, "requestedDeliveryDate") || "To be arranged",
        requestNote: text(body.requestNote, 1000, "requestNote"),
        status: "pending",
        orderStatus: "pending"
    })

    return presentConversation(conversation, requester)
}

export async function updateRequest(id, action, requester) {
    if (requester.role !== "farmer") throw new AppError("Only the farmer can respond to an order request", 403)
    if (!["accept", "reject"].includes(action)) throw new AppError("Invalid request action", 400)
    const conversation = await findParticipantConversation(id, requester)
    if (conversation.farmerId !== requester.id) throw new AppError("Only the farmer can respond to this request", 403)
    if (conversation.status !== "pending") throw new AppError("This request is no longer pending", 409)

    const now = new Date()
    conversation.status = action === "accept" ? "active" : "declined"
    conversation.orderStatus = action === "accept" ? "confirmed" : "cancelled"
    if (action === "accept") {
        conversation.messages.push({
            senderId: requester.id,
            type: "system",
            text: "Your order has been accepted by farmer.",
            createdAt: now,
            updatedAt: now
        })
    } else {
        conversation.archivedFor.addToSet(requester.id)
    }
    await conversation.save()
    return presentConversation(conversation, requester)
}

export async function updateOrderStatus(id, orderStatus, requester) {
    if (requester.role !== "farmer") throw new AppError("Only the farmer can update order status", 403)
    if (!ORDER_STATUSES.includes(orderStatus)) throw new AppError("Invalid order status", 400)
    const conversation = await findParticipantConversation(id, requester)
    if (conversation.farmerId !== requester.id) throw new AppError("Only the farmer can update this order", 403)
    if (conversation.status !== "active") throw new AppError("Only active orders can be updated", 409)
    conversation.orderStatus = orderStatus
    conversation.completedAt = orderStatus === "delivered" ? new Date() : null
    await conversation.save()
    return presentConversation(conversation, requester)
}

export async function addMessage(id, body, requester) {
    const content = text(body.text, 2000, "text", { required: true })
    const conversation = await findParticipantConversation(id, requester)
    if (conversation.status !== "active") throw new AppError("Messages can only be sent in an active conversation", 409)
    conversation.messages.push({ senderId: requester.id, text: content, type: "message" })
    await conversation.save()
    return presentConversation(conversation, requester)
}

export async function setArchived(id, archived, requester) {
    if (typeof archived !== "boolean") throw new AppError("archived must be true or false", 400)
    const conversation = await findParticipantConversation(id, requester)
    if (archived) conversation.archivedFor.addToSet(requester.id)
    else conversation.archivedFor.pull(requester.id)
    await conversation.save()
    return presentConversation(conversation, requester)
}

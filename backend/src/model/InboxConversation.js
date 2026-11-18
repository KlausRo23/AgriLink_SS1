import mongoose from "mongoose"
import { messageSchema } from "./Message.js"

const inboxConversationSchema = new mongoose.Schema({
    farmerId: { type: String, required: true, index: true },
    buyerId: { type: String, required: true, index: true },
    orderId: { type: mongoose.Schema.Types.ObjectId, ref: "Order", default: null },
    listingId: { type: mongoose.Schema.Types.ObjectId, ref: "Listing", required: true },
    listingName: { type: String, required: true },
    listingPrice: { type: Number, required: true, min: 0 },
    quantity: { type: Number, required: true, min: 0.01 },
    unit: { type: String, required: true },
    subtotal: { type: Number, required: true, min: 0 },
    buyerName: { type: String, required: true },
    buyerLocation: { type: String, default: "" },
    buyerBusinessName: { type: String, default: "" },
    farmerName: { type: String, required: true },
    farmName: { type: String, default: "" },
    farmLocation: { type: String, default: "" },
    deliveryMethod: { type: String, default: "To be arranged" },
    requestedDeliveryDate: { type: String, default: "To be arranged" },
    requestNote: { type: String, default: "" },
    status: { type: String, enum: ["pending", "active", "declined"], default: "pending", index: true },
    orderStatus: {
        type: String,
        enum: ["pending", "confirmed", "preparing", "ready", "delivered", "completed", "cancelled"],
        default: "pending"
    },
    completedAt: { type: Date, default: null },
    archivedFor: { type: [String], default: [] },
    messages: { type: [messageSchema], default: [] }
}, { timestamps: true })

inboxConversationSchema.index({ farmerId: 1, updatedAt: -1 })
inboxConversationSchema.index({ buyerId: 1, updatedAt: -1 })

const InboxConversation = mongoose.model("InboxConversation", inboxConversationSchema)

export default InboxConversation

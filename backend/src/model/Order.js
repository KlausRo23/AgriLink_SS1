import mongoose from "mongoose";

const orderSchema = new mongoose.Schema(
    {
        customer: {
            type: mongoose.Schema.Types.ObjectId,
            required: true,
        },

        listingId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "Listing",
            default: null
        },

        conversation: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "InboxConversation",
            default: null
        },

        status: {
            type: String,
            enum: [
                "pending",
                "confirmed",
                "preparing",
                "ready",
                "delivering",
                "delivered",
                "completed",
                "cancelled"
            ],
            default: "pending"
        },

        date: {
            type: Date,
            default: Date.now
        },
        quantity: {
            type: Number,
            required: true,
            min: 0
        },
        cost: {
            type: Number,
            required: true
        }
    },
    {
        timestamps: true
    }
);

const Order = mongoose.model("Order", orderSchema);

export default Order;
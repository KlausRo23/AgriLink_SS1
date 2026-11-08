import mongoose from "mongoose";

const messageSchema = new mongoose.Schema({
    tarnsactWith: {
        type: String,
        required: true
    },
    product: {

    },
    buyer: {

    },
    conversation: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Conversation"
    }
}, {timestamps: true})

const Message = mongoose.model("")
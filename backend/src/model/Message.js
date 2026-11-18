
import mongoose from "mongoose"

export const messageSchema = new mongoose.Schema({
    senderId: { type: String, required: true },
    text: { type: String, required: true, trim: true, maxLength: 2000 },
    type: { type: String, enum: ["message", "system"], default: "message" }
}, { timestamps: true })

const Message = mongoose.model("Message", messageSchema)

export default Message

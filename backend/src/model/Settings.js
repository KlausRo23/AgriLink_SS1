import mongoose from "mongoose";

export const ALLOWED_FONT_SIZES = ["small", "default", "large"]
export const ALLOWED_THEMES = ["light", "dark"]

const settingsSchema = new mongoose.Schema({
    fontSize: {
        type: String,
        enum: ALLOWED_FONT_SIZES,
        default: "default"
    },
    theme: {
        type: String,
        enum: ALLOWED_THEMES,
        default: "light" // was "ligth", which isn't in your own enum
    },
    user: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true,
        unique: true
    }
}, {timestamps: true})

const Settings = mongoose.model("Settings", settingsSchema)

export default Settings
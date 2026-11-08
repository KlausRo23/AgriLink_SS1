import mongoose from "mongoose"
import { LOG_TITLE, LOG_LEVEL } from "../constant/enums.js"

const logSchema = new mongoose.Schema({

    date: {
        type: Date,
        required: true,
        default: Date.now()
    },

    title: {
        type: String,
        enum: Object.values(LOG_TITLE),
        required: true
    },

    description: {
        type: String,
        required: true
    },

    crop: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Crop",
        required: true
    },

    owner: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
        required: true
    },

    level: {
        type: String,
        enum: Object.values(LOG_LEVEL),
        required: true
    }

}, { timestamps: true })

const Log = mongoose.model("Log", logSchema)

export default Log
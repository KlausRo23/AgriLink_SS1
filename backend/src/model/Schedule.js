import mongoose from "mongoose"
import { ACTIVITY_ACTIONS } from "../constant/schedule.js"

// One entry per crop per day: the actions done that day, an optional note and an optional photo.
const scheduleSchema = new mongoose.Schema({
    crop: { 
        type: mongoose.Schema.Types.ObjectId, 
        ref: "Crop", 
        required: true, 
        immutable: true, 
        index: true 
    },

    // SS1's user id (req.user.id). A plain string because the user lives in SS1's DB.
    owner: { 
        type: String, 
        required: true, 
        immutable: true, 
        index: true 
    },

    // The calendar day, stored as UTC midnight (built from a "YYYY-MM-DD" string)
    date: { 
        type: Date, 
        required: true, 
        immutable: true 
    },

    actions: {
        type: [{ type: String, enum: ACTIVITY_ACTIONS }],
        default: []
    },
    note: { 
        type: String, 
        trim: true, 
        maxLength: 200, 
        default: "" 
    },
    photo: { 
        type: String, 
        default: null 
    } // relative path of the processed image
}, { timestamps: true })

// A crop can only have one entry per day
scheduleSchema.index({ crop: 1, date: 1 }, { unique: true })

const Schedule = mongoose.model("Schedule", scheduleSchema)

export default Schedule
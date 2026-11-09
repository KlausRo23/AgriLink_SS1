import mongoose from "mongoose"
import { ARCHIVE_TYPES } from "../constant/archive.js"

const archiveSchema = new mongoose.Schema({
    itemType: {
        type: String,
        enum: ARCHIVE_TYPES,
        required: true
    },
    originalId: {
        type: mongoose.Schema.Types.ObjectId,
        required: true,
        immutable: true
    },
    // Full copy of the item as it was, so it can be restored exactly
    snapshot: {
        type: mongoose.Schema.Types.Mixed,
        required: true
    },
    reason: {
        type: String,
        maxlength: 200,
        default: ""
    },
    // SS1's user id (req.user.id). A plain string because the user lives in SS1's DB.
    owner: {
        type: String,
        required: true,
        immutable: true,
        index: true
    }
}, { timestamps: true })

archiveSchema.index({ owner: 1, itemType: 1, createdAt: -1 })

const Archive = mongoose.model("Archive", archiveSchema)

export default Archive
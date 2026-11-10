// model/History.js
import mongoose from "mongoose"

const historySchema = new mongoose.Schema({
    itemType: { 
        type: String, 
        enum: ["Crop", "Supply", "Listing"],
        required: true 
    },
    itemId: { 
        type: mongoose.Schema.Types.ObjectId, 
        required: true
    },
    action: { 
        type: String, 
        enum: ["added", "edited", "archived", "restored", "deleted", "harvested"],
        required: true 
    },
    previousState: { 
        type: mongoose.Schema.Types.Mixed, 
        default: null 
    },
    newState: { 
        type: mongoose.Schema.Types.Mixed, 
        default: null 
    },
    owner: { 
        type: String, 
        required: true, 
        immutable: true, 
        index: true 
    }
}, { timestamps: true })

historySchema.index({ owner: 1, createdAt: -1 })

export default mongoose.model("History", historySchema)
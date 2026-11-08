import mongoose from "mongoose"
import { cropPresets, CROP_CATEGORY, CROP_STATUS } from "../constant/cropPreset.js"

const cropSchema = new mongoose.Schema({
    name: { 
        type: String, 
        enum: Object.keys(cropPresets), 
        required: true 
    },
    image: { 
        type: String, 
        default: null 
    }, // relative path of the processed image
    category: { 
        type: String, 
        enum: Object.values(CROP_CATEGORY), 
        required: true 
    },
    status: {
        type: String,
        enum: Object.values(CROP_STATUS),
        default: CROP_STATUS.GROWING,
        required: true,
        index: true
    },
    description: { 
        type: String, 
        maxlength: 300, 
        default: "", 
        trim: true
    },
    seedlings: { 
        type: Number, 
        min: 1, 
        max: 1000000, 
        default: null 
    },
    isOrganic: { 
        type: Boolean, 
        default: false 
    },
    datePlanted: { 
        type: Date, 
        required: true 
    },
    harvestDate: { 
        type: Date, 
        required: true 
    },
    shelfLifeDays: { 
        type: Number, 
        min: 1, 
        max: 3650, 
        required: true 
    },
    sellDate: { 
        type: Date, 
        required: true 
    },
    actualHarvestDate: { 
        type: Date, 
        default: null 
    },
    actualSellDate: { 
        type: Date, 
        default: null 
    },
    schedule: { 
        type: mongoose.Schema.Types.ObjectId, 
        ref: "Schedule", 
        required: false 
    },

    // SS1's user id (req.user.id). A plain string because the user lives in SS1's DB.
    owner: { 
        type: String, 
        required: true, 
        immutable: true, 
        index: true 
    }
}, { timestamps: true })

cropSchema.index({ owner: 1, createdAt: -1 })

const Crop = mongoose.model("Crop", cropSchema)

export default Crop
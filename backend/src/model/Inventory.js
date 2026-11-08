import mongoose from "mongoose"
import { INVENTORY_CATEGORIES, INVENTORY_UNITS, SOURCE_TYPES } from "../constant/inventory.js"

const inventorySchema = new mongoose.Schema({
    name: { 
        type: String, 
        required: true, 
        trim: true, 
        minLength: 2, 
        maxLength: 50 
    },
    category: { 
        type: String, 
        enum: INVENTORY_CATEGORIES, 
        required: true, 
        index: true 
    },
    description: { 
        type: String, 
        maxLength: 500, 
        default: "", 
        trim: true 
    },
    notes: { 
        type: String, 
        maxLength: 500, 
        default: "", 
        trim: true 
    },
    image: { 
        type: String, 
        default: null 
    }, // relative path of the processed image
    icon: { 
        type: String, 
        default: "📦", 
        maxLength: 16 
    },
    quantity: { 
        type: Number, 
        required: true, 
        min: 0 
    },
    unit: { 
        type: String, 
        enum: INVENTORY_UNITS, 
        required: true 
    },
    dateReceived: { 
        type: Date, 
        required: true, 
        default: Date.now 
    },
    // only set when sourceType is "HARVEST"
    harvestDate: { type: Date },
    expirationDate: { type: Date },
    sourceType: { type: String, 
        enum: Object.values(SOURCE_TYPES), 
        default: SOURCE_TYPES.MANUAL, 
        index: true 
    },

    // SS1's user id (req.user.id). A plain string because the user lives in SS1's DB.
    owner: { 
        type: String, 
        required: true, 
        immutable: true, 
        index: true 
    },
    crop: { 
        type: mongoose.Schema.Types.ObjectId, 
        ref: "Crop", 
        default: null 
    }
}, { timestamps: true })

inventorySchema.index({ owner: 1, createdAt: -1 })

// A given crop can only ever produce one harvest-sourced inventory row
// (prevents double-harvesting the same crop into inventory twice).
inventorySchema.index(
    { crop: 1 },
    {
        unique: true,
        partialFilterExpression: {
            sourceType: "HARVEST",
            crop: { $type: "objectId" }
        }
    }
)

const Inventory = mongoose.model("Inventory", inventorySchema)

export default Inventory
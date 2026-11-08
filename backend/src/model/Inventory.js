import mongoose from "mongoose"

const inventorySchema = new mongoose.Schema({

    name: {
        type: String,
        required: true
    },
    category: {
        type: String,
        enum: ["crop", "supply"],
        required: true
    },
    description: {
        type: String
    },
    image: {
        type: String,
        default: null
    },
    icon: {
        type: String,
        default: "📦"
    },
    quantity: {
        type: Number,
        required: true,
        min: 0
    },
    unit: {
        type: String,
        enum: ["kg", "pieces", "heads", "sack", "liters", "bottles"],
        required: true
    },
    dateReceived: {
        type: Date,
        required: true,
        default: Date.now
    },
    harvestDate: {
        type: Date
        // only set by cropController.harvestCrop when sourceType is "HARVEST"
    },
    expirationDate: {
        type: Date
    },
    sourceType: {
        type: String,
        enum: ["HARVEST", "MANUAL"],
        default: "MANUAL"
    },
    owner: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
        required: true,
        index: true
    },
    crop: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Crop",
        default: null
    }

}, {
    timestamps: true
})

// Ensures a given crop can only ever produce one harvest-sourced inventory
// row (prevents double-harvesting the same crop into inventory twice).
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
import mongoose from "mongoose"
import { LISTING_STATUS, ACTIVE_LISTING_STATUSES, LISTING_UNITS } from "../constant/listing.js"

const listingSchema = new mongoose.Schema({
    // The inventory item this listing sells from. Can't be changed after creation.
    inventory: { 
        type: mongoose.Schema.Types.ObjectId, 
        ref: "Inventory", 
        required: true, 
        immutable: true 
    },
    crop: { 
        type: mongoose.Schema.Types.ObjectId, 
        ref: "Crop", 
        default: null 
    },

    // Snapshot of the crop name taken from inventory when the listing is created
    name: { 
        type: String, 
        required: true, 
        trim: true, 
        maxLength: 50 
    },
    price: { 
        type: Number, 
        required: true, 
        min: 0.01, 
        max: 99999 
    },
    stock: { 
        type: Number, 
        required: true, 
        min: 0.01, 
        max: 99999999 
    },
    unit: { 
        type: String, 
        enum: LISTING_UNITS, 
        required: true 
    },
    description: { 
        type: String, 
        maxLength: 300, default: "", trim: true },

    status: {
        type: String,
        enum: Object.values(LISTING_STATUS),
        default: LISTING_STATUS.PENDING,
        required: true
    },

    // Filled in by the admin who reviews the listing
    reviewNote: { type: String, maxLength: 300, default: "" },
    reviewedBy: { type: String, default: null },
    reviewedAt: { type: Date, default: null },

    // Maintained automatically from status. Powers the "one active listing per inventory item" index.
    isActive: { type: Boolean, default: true },

    // SS1's user id (req.user.id). A plain string because the user lives in SS1's DB.
    owner: { type: String, required: true, immutable: true, index: true }
}, { timestamps: true })

listingSchema.pre("save", function (next) {
    this.isActive = ACTIVE_LISTING_STATUSES.includes(this.status)
    next()
})

listingSchema.index({ owner: 1, createdAt: -1 })
listingSchema.index({ status: 1, createdAt: -1 })

// An inventory item can only have one active listing at a time
listingSchema.index(
    { inventory: 1 },
    { unique: true, partialFilterExpression: { isActive: true } }
)

const Listing = mongoose.model("Listing", listingSchema)

export default Listing
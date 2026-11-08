import mongoose, { mongo } from "mongoose";

const listingSchema = new mongoose.Schema({
    name: {
        type: mongoose.Types.ObjectId.Schema,
        ref: "Crops"
    },
    price: {
        type: Number,
        required: true,
        trim: true,
        maxLength: 5
    },
    status: {
        type: String,
        enum: ["pending", "rejected", "approved"],
        default: "pending"
    },
    stock: {
        type: Number,
        required: true,
        trim: true,
        maxLength: 8
    },
    unit: {
        type: String,
        enum: ["kg", "sack", "heads"],
        required: true
    }
}, {timestamps: true})

const Listing = mongoose.model("Listing", listingSchema)
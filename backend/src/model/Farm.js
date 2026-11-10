import mongoose from "mongoose"
import { REGION_IDS } from "../constant/region.js"
import { cropPresets } from "../constant/cropPreset.js"

const SPECIALTIES = Object.keys(cropPresets)

const farmSchema = new mongoose.Schema({
    farmName: { 
		type: String, 
		required: true, 
		minLength: 2, 
		maxLength: 30, 
		trim: true 
	},
    farmPhoto: { 
		type: String, 
		required: false 
	}, // relative path of the processed image
    location: { 
		type: String, 
		required: true, 
		minLength: 5, 
		maxLength: 200, 
		trim: true 
	},
    deliveryMode: {
        type: [{ type: String, enum: ["deliver", "3rd party service"] }],
        required: true,
        validate: {
            validator: (arr) => Array.isArray(arr) && arr.length > 0,
            message: "At least one delivery method is required"
        }
    },
    deliverableRegions: {
        type: [{ type: String, enum: REGION_IDS }],
        required: true,
        validate: {
            validator: (arr) => Array.isArray(arr) && arr.length > 0,
            message: "At least one deliverable region is required"
        },
        index: true
    },
    startedFarming: { 
		type: Date 
	},
    specialty: {
        type: [{ type: String, enum: SPECIALTIES }],
        required: false
    },
    naturallyGrown: {
        type: Boolean,
        default: true
    },

    // The Farmer document (not the SS1 user). One farm per farmer.
    // Remove "unique" if a farmer may own several farms.
    owner: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Farmer",
        required: true,
        unique: true,
        immutable: true,
        index: true
    },

    // Managed by other modules. Never accepted from request input.
    activeProduct: { 
		type: mongoose.Schema.Types.ObjectId, 
		ref: "Product", 
		required: false 
	},
    review: { 
		type: mongoose.Schema.Types.ObjectId, 
		ref: "Review", 
		required: false 
	},

    isVerified: {
        type: String,
        enum: ["False", "Pending", "Verified"],
        default: "False",
        required: true,
        index: true
    },
    description: { 
		type: String, 
		required: true, 
		maxLength: 200, 
		trim: true 
	}
}, { timestamps: true })

const Farm = mongoose.model("Farm", farmSchema)

export default Farm
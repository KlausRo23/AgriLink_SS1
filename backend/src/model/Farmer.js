import mongoose from "mongoose"
import { REGION_IDS } from "../constant/region.js"

const farmerSchema = new mongoose.Schema({
    // SS1's user id (req.user.id). A plain string because the user lives in SS1's DB.
    ssoUserId: {
        type: String,
        required: true,
        unique: true, // one farmer profile per account
        index: true,
        immutable: true
    },
    lastName: { 
		type: String, 
		required: true, 
		minLength: 2, 
		maxLength: 30, 
		trim: true 
	},
    firstName: { 
		type: String, 
		required: true, 
		minLength: 2, 
		maxLength: 30, 
		trim: true 
	},
    middleName: { 
		type: String, 
		required: true, 
		minLength: 2, 
		maxLength: 30, 
		trim: true 
	},
    suffix: { 
		type: String, 
		enum: ["Jr", "Sr", "I", "II", "III"], 
		required: false 
	},
    age: { 
		type: Number, 
		required: true, 
		min: 18, 
		max: 99 
	},
    profile: { 
		type: String, 
		required: false 
	}, // relative path of the processed image
    region: { 
		type: String, 
		enum: REGION_IDS, 
		required: true, 
		index: true 
	},
    bio: { 
		type: String, 
		required: true, 
		maxLength: 200, 
		trim: true 
	},
    mobileNumber: { 
		type: String, 
		required: false, 
		trim: true, 
		maxLength: 13 
	},
    email: { 
		type: String, 
		required: false, 
		trim: true, 
		lowercase: true, 
		maxLength: 100 
	},
    facebook: { 
		type: String, 
		required: false, 
		trim: true, 
		maxLength: 200 
	},
    isVerified: {
        type: String,
        enum: ["False", "Pending", "Verified"],
        default: "False",
        required: true,
        index: true
    }
}, { timestamps: true })

const Farmer = mongoose.model("Farmer", farmerSchema)

export default Farmer
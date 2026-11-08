import mongoose from "mongoose"
import { REGION_IDS } from "../constant/region.js"

const userSchema = new mongoose.Schema({
    name: {
        type: String,
        required: true
    },
    email: {
        type: String,
        required: true,
        unique: true,
        lowercase: true,
        trim: true,
        validate: {
            validator: (v) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v),
            message: 'Invalid email format'
        }
    },
    password: {
        type: String,
        required: true,
        minlength: 8,
    },
    // Used to list region-popular crops first on the add-crop page
    region: {
        type: String,
        enum: REGION_IDS,
        default: null
    },
    role: {
        type: String,
        enum: ['superadmin', 'farmer', 'user'],
        default: 'user'
    },
    status: {
        type: String,
        enum: ["active", "banned", "restricted"],
        default: "active"
    },
    isVerified: {
        type: Boolean,
        default: false
    },
    farm: {
        type: String,
        required: false,
    },
    resetPasswordToken: String,
    resetPasswordExpiresAt: Date,
    verificationToken: String,
    verificationTokenExpiresAt: Date,
    refreshToken: String
}, { timestamps: true })

const User = mongoose.model("User", userSchema)

export default User;
import mongoose from "mongoose"
import Farmer from "../model/Farmer.js"
import { ADMIN_ROLES } from "../constant/roles.js"

export default async function checkOwnership(req, res, next) {
    try {
        if (ADMIN_ROLES.includes(req.user.role)) return next()

        const { id } = req.params
        if (!mongoose.isValidObjectId(id)) {
            return res.status(400).json({ success: false, message: "Invalid id", data: null })
        }

        const farmer = await Farmer.findById(id).select("ssoUserId").lean()
        if (!farmer) {
            return res.status(404).json({ success: false, message: "Farmer profile not found", data: null })
        }
        if (farmer.ssoUserId !== req.user.id) {
            return res.status(403).json({ success: false, message: "Forbidden", data: null })
        }
        return next()
    } catch (err) {
        console.error("checkOwnership error:", err)
        return res.status(500).json({ success: false, message: "Internal server error", data: null })
    }
}
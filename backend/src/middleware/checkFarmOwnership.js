import mongoose from "mongoose"
import Farm from "../model/Farm.js"
import Farmer from "../model/Farmer.js"
import { ADMIN_ROLES } from "../constant/roles.js"

const fail = (res, status, message) =>
    res.status(status).json({ success: false, message, data: null })

export default async function checkFarmOwnership(req, res, next) {
    try {
        if (ADMIN_ROLES.includes(req.user.role)) return next()

        const { id } = req.params
        if (!mongoose.isValidObjectId(id)) return fail(res, 400, "Invalid id")

        const farm = await Farm.findById(id).select("owner").lean()
        if (!farm) return fail(res, 404, "Farm not found")

        // farm.owner is a Farmer _id, so find the requester's Farmer first
        const farmer = await Farmer.findOne({ ssoUserId: req.user.id }).select("_id").lean()
        if (!farmer || String(farm.owner) !== String(farmer._id)) return fail(res, 403, "Forbidden")

        return next()
    } catch (err) {
        console.error("checkFarmOwnership error:", err)
        return fail(res, 500, "Internal server error")
    }
}
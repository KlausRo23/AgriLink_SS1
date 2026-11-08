import mongoose from "mongoose"
import Inventory from "../model/Inventory.js"

const fail = (res, status, message) =>
    res.status(status).json({ success: false, message, data: null })

// Owner only. No admin bypass.
// Returns 404 for "doesn't exist" AND "not yours", so nobody can probe for other people's ids.
export default async function checkInventoryOwnership(req, res, next) {
    try {
        const { id } = req.params
        if (!mongoose.isValidObjectId(id)) return fail(res, 400, "Invalid id")

        const owned = await Inventory.exists({ _id: id, owner: req.user.id })
        if (!owned) return fail(res, 404, "Inventory item not found")

        return next()
    } catch (err) {
        console.error("checkInventoryOwnership error:", err)
        return fail(res, 500, "Internal server error")
    }
}
import mongoose from "mongoose"
import Archive from "../model/Archive.js"

const fail = (res, status, message) =>
    res.status(status).json({ success: false, message, data: null })

// Owner only. Returns 404 for "doesn't exist" AND "not yours", so nobody can probe for other people's ids.
export default async function checkArchiveOwnership(req, res, next) {
    try {
        const { id } = req.params
        if (!mongoose.isValidObjectId(id)) return fail(res, 400, "Invalid id")

        const owned = await Archive.exists({ _id: id, owner: req.user.id })
        if (!owned) return fail(res, 404, "Archived item not found")

        return next()
    } catch (err) {
        console.error("checkArchiveOwnership error:", err)
        return fail(res, 500, "Internal server error")
    }
}
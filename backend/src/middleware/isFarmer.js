import { ROLES } from "../constant/roles.js"

export default function isFarmer(req, res, next) {
    if (req.user?.role !== ROLES.FARMER) {
        return res.status(403).json({ success: false, message: "Forbidden", data: null })
    }
    return next()
}
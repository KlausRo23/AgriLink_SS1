import jwt from "jsonwebtoken"

const fail = (res, message) =>
    res.status(401).json({ success: false, message, data: null })

export function verifyAccessToken(req, res, next) {
    const authHeader = req.headers.authorization

    if (typeof authHeader !== "string" || !authHeader.startsWith("Bearer ")) {
        return fail(res, "No access token provided")
    }

    const token = authHeader.split(" ")[1]
    if (!token) return fail(res, "No access token provided")

    try {
        // Pinning the algorithm blocks algorithm-confusion tricks
        const decoded = jwt.verify(token, process.env.ACCESS_SECRET_TOKEN, { algorithms: ["HS256"] })

        if (!decoded?.id || typeof decoded.role !== "string") {
            return fail(res, "Invalid or expired access token")
        }

        req.user = { id: String(decoded.id), role: decoded.role } // only what we need
        return next()
    } catch {
        return fail(res, "Invalid or expired access token")
    }
}
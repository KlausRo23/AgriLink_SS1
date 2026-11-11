import jwt from "jsonwebtoken"

const fail = (res, message) =>
    res.status(401).json({ success: false, message, data: null })

// Shows at startup which secrets this process actually loaded (booleans only, no values)
console.log("[auth] ACCESS_SECRET_TOKEN set:", Boolean(process.env.ACCESS_SECRET_TOKEN))
console.log("[auth] SS1_JWT_SECRET set:", Boolean(process.env.SS1_JWT_SECRET))

// Two token issuers:
//  - SS2's own tokens: { id, role }, signed with ACCESS_SECRET_TOKEN
//  - SS1's SSO tokens: { sub, accountType }, signed with SS1's JWT_SECRET
const ISSUERS = [
    {
        name: "ss2",
        secret: () => process.env.ACCESS_SECRET_TOKEN,
        toUser: (d) =>
            d?.id && typeof d.role === "string"
                ? { id: String(d.id), role: d.role }
                : null,
    },
    {
        name: "ss1",
        secret: () => process.env.SS1_JWT_SECRET,
        toUser: (d) =>
            typeof d?.sub === "string" && d.sub
                ? { id: d.sub, role: typeof d.role === "string" ? d.role : null }
                : null,
    },
]

export function verifyAccessToken(req, res, next) {
    const authHeader = req.headers.authorization

    if (typeof authHeader !== "string" || !authHeader.startsWith("Bearer ")) {
        return fail(res, "No access token provided")
    }

    const token = authHeader.split(" ")[1]
    if (!token) return fail(res, "No access token provided")

    const reasons = []

    for (const issuer of ISSUERS) {
        const secret = issuer.secret()
        if (!secret) {
            reasons.push(`${issuer.name}: secret not set`)
            continue
        }

        let decoded
        try {
            // Pinning the algorithm blocks algorithm-confusion tricks
            decoded = jwt.verify(token, secret, { algorithms: ["HS256"] })
        } catch (error) {
            reasons.push(`${issuer.name}: ${error.message}`)
            continue
        }

        const user = issuer.toUser(decoded)
        if (!user) {
            reasons.push(`${issuer.name}: verified but payload unusable, keys: ${Object.keys(decoded || {}).join(",")}`)
            continue
        }

        req.user = user // only what we need
        return next()
    }

    console.warn("[auth] rejected token ->", reasons.join(" | "))
    return fail(res, "Invalid or expired access token")
}
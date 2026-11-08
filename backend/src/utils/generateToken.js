import jwt from "jsonwebtoken"

export const generateAccessToken = (user) => {
    return jwt.sign(
        {id: user._id, role: user.role},
        process.env.ACCESS_SECRET_TOKEN,
        {expiresIn: '15m'}
    )
}

export const generateRefreshToken = (user) => {
    return jwt.sign(
        {id: user._id},
        process.env.REFRESH_SECRET_TOKEN,
        {expiresIn: '7d'}
    )
}
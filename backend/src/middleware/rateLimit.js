import rateLimit from 'express-rate-limit'

export const globalLimit = rateLimit({
    windowMs: 5 * 60 * 1000,
    max: 100,
    message: "Slow down, you are making too many requests in a short time",
    standardHeaders: true,
    legacyHeaders: false,
})

export const loginLimit = rateLimit({
    windowMs: 5 * 60 * 1000,
    max: 100,
    message: "Slow down, you are making too many login attempts",
    standardHeaders: true,
    legacyHeaders: false,
})

export const otpLimit = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 5,
    message: "Too many attempts, please try again later",
    standardHeaders: true,
    legacyHeaders: false,
})
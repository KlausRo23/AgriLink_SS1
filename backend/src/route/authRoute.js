import express from "express"

import { registerUser, login, refreshToken, resetPassword,
    logout, verifyOTP, resendOTP, forgotPassword } from "../controller/authController.js"
import { loginLimit, otpLimit } from "../middleware/rateLimit.js"

const router = express.Router()

router.post('/register',
    registerUser)

router.post('/verify-otp',
    otpLimit,
    verifyOTP)

router.post('/verify-email',
    otpLimit,
    verifyOTP)

router.post('/resend-otp',
    otpLimit,
    resendOTP)

router.post('/forgot-password',
    otpLimit,
    forgotPassword)

router.post('/reset-password',
    otpLimit,
    resetPassword)

router.post('/login',
    loginLimit,
    login)

router.post('/refresh',
    refreshToken)

router.post('/logout',
    logout)

export default router;
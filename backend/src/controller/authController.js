import User from "../model/User.js";
import bcrypt from 'bcryptjs'
import jwt from 'jsonwebtoken'

import { generateAccessToken, generateRefreshToken } from '../utils/generateToken.js'
import { generateVerificationToken } from "../utils/generateVerificationCode.js"
import { validateEmail, validatePassword, sanitizeInput } from '../utils/sanitizeInput.js'
import { toPublicUser } from '../utils/publicUser.js'
import { REGION_IDS } from '../constant/region.js'
import transporter from "../config/nodemailer.js";
import { buildWelcomeEmail, buildVerificationEmail, 
    buildPasswordResetEmail } from '../utils/emailTemplates.js'

//Registering User
export async function registerUser(req, res) {
    try {
        const {name, email, password, region} = req.body

        if (!name || !email || !password) {
            return res.status(400).json({ message: "All fields are required" })
        }

        const sanitizeEmail = email.trim().toLowerCase()
        const sanitizeName = sanitizeInput(name)

        if (!validateEmail(sanitizeEmail)) {
            return res.status(400).json({ message: "Invalid Email" })
        }
        if (!validatePassword(password)) {
            return res.status(400).json({ message: "Invalid Password" })
        }
        if (sanitizeName.length <= 1 || sanitizeName.length >= 60) {
            return res.status(400).json({ message: "Invalid Username" })
        }
        // Region is optional, but if it's sent it must be a known id
        if (region && !REGION_IDS.includes(region)) {
            return res.status(400).json({ message: "Invalid region" })
        }

        const checkEmail = await User.findOne({ email: sanitizeEmail })
        if (checkEmail) {
            return res.status(400).json({ message: "User already exist" })
        }

        const hashPassword = await bcrypt.hash(password, 10)
        const verificationCode = generateVerificationToken()

        const newUser = await User.create({
            name: sanitizeName,
            email: sanitizeEmail,
            password: hashPassword,
            region: region || null,
            verificationToken: verificationCode,
            verificationTokenExpiresAt: Date.now() + 15 * 60 * 1000
        })

        // Send welcome email AFTER the user is confirmed saved.
        // The account already exists at this point, so a mail failure must not
        // look like a failed signup. Report it and let the user use "Resend code".
        let emailSent = true
        try {
            await transporter.sendMail({
                from: process.env.SENDER_EMAIL,
                to: sanitizeEmail,
                subject: "Welcome to AgriLink",
                html: buildWelcomeEmail(sanitizeName, verificationCode)
            })
        } catch (emailError) {
            console.error("Failed to send welcome email", emailError)
            emailSent = false
        }

        return res.status(201).json({
            message: emailSent
                ? 'successfully created user'
                : 'User created, but the verification email could not be sent. Use "Resend code".',
            emailSent,
            user: toPublicUser(newUser)
        })
    } catch (error) {
        console.error("Error in registering account", error)
        return res.status(500).json({message: "Internal Error"})
    }
}

export async function verifyOTP(req, res) {
    try {
        const {email, otp} = req.body

        if (!email || !otp) {
            return res.status(400).json({message: "All fields are required"})
        }

        const validEmail = email.trim().toLowerCase()

        if (!validateEmail(validEmail)) {
            return res.status(400).json({message: "Invalid email"})
        }

        const user = await User.findOne({email: validEmail})

        if (!user) {
            return res.status(404).json({message: "User doesn't exist"})
        }

        if (user.isVerified) {
            return res.status(400).json({message: "Account already verified"})
        }

        if (!user.verificationToken || user.verificationToken !== otp) {
            return res.status(400).json({message: "Invalid verification code"})
        }

        if (user.verificationTokenExpiresAt < Date.now()) {
            return res.status(400).json({message: "Verification code has expired"})
        }

        user.isVerified = true
        user.verificationToken = undefined
        user.verificationTokenExpiresAt = undefined
        await user.save()

        return res.status(200).json({
            message: "Account verified successfully",
            user: {
                id: user._id,
                name: user.name,
                email: user.email
            }
        })
    } catch (error) {
        console.error("Failed to verify OTP", error)
        return res.status(500).json({message: "Internal Error"})
    }
}

export async function resendOTP(req, res) {
    try {
        const {email} = req.body

        if (!email) {
            return res.status(400).json({message: "Email is required"})
        }

        const validEmail = email.trim().toLowerCase()

        if (!validateEmail(validEmail)) {
            return res.status(400).json({message: "Invalid email"})
        }

        const user = await User.findOne({email: validEmail})

        if (!user) {
            return res.status(404).json({message: "User doesn't exist"})
        }

        if (user.isVerified) {
            return res.status(400).json({message: "Account already verified"})
        }

        // Basic cooldown: block resending within 60 seconds of the last code
 

        const newVerificationCode = generateVerificationToken()

        user.verificationToken = newVerificationCode
        user.verificationTokenExpiresAt = Date.now() + 15 * 60 * 1000
        await user.save()

        try {
            await transporter.sendMail({
                from: process.env.SENDER_EMAIL,
                to: user.email,
                subject: "Your new AgriLink verification code",
                html: buildVerificationEmail(user.name, newVerificationCode)
            })
        } catch (emailError) {
            console.error("Failed to resend verification email:", emailError.message)
            return res.status(500).json({message: "Failed to send verification email, try again shortly"})
        }

        return res.status(200).json({message: "Verification code resent"})
    } catch (error) {
        console.error("Failed to resend OTP", error)
        return res.status(500).json({message: "Internal Error"})
    }
}

export async function forgotPassword(req, res) {
    try {
        const {email} = req.body

        if (!email) {
            return res.status(400).json({message: "Email is required"})
        }

        const validEmail = email.trim().toLowerCase()

        if (!validateEmail(validEmail)) {
            return res.status(400).json({message: "Invalid email"})
        }

        const user = await User.findOne({email: validEmail})

        // Respond the same way whether or not the account exists,
        // so this endpoint can't be used to check which emails are registered.
        if (!user) {
            return res.status(200).json({
                message: "If an account exists for this email, a reset code has been sent"
            })
        }

        const COOLDOWN_MS = 60 * 1000
        if (user.resetPasswordExpiresAt) {
            const lastSentAt = user.resetPasswordExpiresAt - 15 * 60 * 1000
            if (Date.now() - lastSentAt < COOLDOWN_MS) {
                const waitSeconds = Math.ceil((COOLDOWN_MS - (Date.now() - lastSentAt)) / 1000)
                return res.status(429).json({message: `Please wait ${waitSeconds}s before requesting another code`})
            }
        }

        const resetCode = generateVerificationToken()

        user.resetPasswordToken = resetCode
        user.resetPasswordExpiresAt = Date.now() + 15 * 60 * 1000
        await user.save()

        try {
            await transporter.sendMail({
                from: process.env.SENDER_EMAIL,
                to: user.email,
                subject: "Reset your AgriLink password",
                html: buildPasswordResetEmail(user.name, resetCode)
            })
        } catch (emailError) {
            console.error("Failed to send password reset email:", emailError.message)
            return res.status(500).json({message: "Failed to send reset email, try again shortly"})
        }

        return res.status(200).json({
            message: "If an account exists for this email, a reset code has been sent"
        })
    } catch (error) {
        console.error("Failed to process forgot password request", error)
        return res.status(500).json({message: "Internal Error"})
    }
}

export async function resetPassword(req, res) {
    try {
        const {email, otp, newPassword} = req.body

        if (!email || !otp || !newPassword) {
            return res.status(400).json({message: "All fields are required"})
        }

        const validEmail = email.trim().toLowerCase()

        if (!validateEmail(validEmail)) {
            return res.status(400).json({message: "Invalid email"})
        }

        if (!validatePassword(newPassword)) {
            return res.status(400).json({message: "Invalid Password"})
        }

        const user = await User.findOne({email: validEmail})

        if (!user) {
            return res.status(404).json({message: "User doesn't exist"})
        }

        if (!user.resetPasswordToken || user.resetPasswordToken !== otp) {
            return res.status(400).json({message: "Invalid or expired reset code"})
        }

        if (user.resetPasswordExpiresAt < Date.now()) {
            return res.status(400).json({message: "Reset code has expired"})
        }

        const hashPassword = await bcrypt.hash(newPassword, 10)

        user.password = hashPassword
        user.resetPasswordToken = undefined
        user.resetPasswordExpiresAt = undefined
        user.refreshToken = undefined // log the user out of any existing sessions
        await user.save()

        return res.status(200).json({message: "Password reset successfully, please log in"})
    } catch (error) {
        console.error("Failed to reset password", error)
        return res.status(500).json({message: "Internal Error"})
    }
}

export async function login(req, res) {
    try {
        const {email, password} = req.body

        if (!email || !password) {
            return res.status(400).json({message: "All fields are required"})
        }

        const validEmail = email.trim().toLowerCase()

        if (!validateEmail(validEmail)) {
            return res.status(400).json({message: "Invalid email"})
        }

        const user = await User.findOne({email: validEmail})

        if (!user) {
            return res.status(404).json({message: "User doesn't exist"})
        }

        const isCorrect = await bcrypt.compare(password, user.password)

        if (!isCorrect) {
            return res.status(401).json({message: "Wrong Credentials"})
        }

        if (user.status === "banned") {
            return res.status(403).json({message: "Your account is banned"})
        }

        const accessToken = generateAccessToken(user)
        const refreshToken = generateRefreshToken(user)

        user.refreshToken = refreshToken
        await user.save()

        res.cookie("refreshToken", refreshToken, {
            httpOnly: true,
            secure: process.env.NODE_ENV === "production",
            sameSite: "strict",
            maxAge: 7 * 24 * 60 * 60 * 1000,
            path: '/'
        })

        return res.status(200).json({
            message: "Login Successfully",
            accessToken,
            user: toPublicUser(user)
        })
    } catch (error) {
        console.error("Internal Error", error)
        return res.status(500).json({message: "Failed to Login"})
    }
}

export async function logout(req, res) {
    try {
        res.clearCookie('refreshToken', {path: '/'})
        return res.status(200).json({message: "Logged out successfully"})
    } catch (error) {
        console.error("Failed to log out", error)
        return res.status(500).json({message: "Internal Error"})   
    }
}

export async function refreshToken(req, res) {
    const token = req.cookies.refreshToken

    if (!token) {
        return res.status(401).json({
            success: false,
            message: "No Refresh Token Provided", data: null
        })
    }

    try {
        const decoded = jwt.verify(token, process.env.REFRESH_SECRET_TOKEN)

        const user = await User.findById(decoded.id)

        if (!user) {
            return res.status(404).json({success: false, message: "User doesn't exist"})
        }

        const accessToken = generateAccessToken(user)

        return res.status(200).json({
            success: true,
            message: "Access token refreshed",
            data: {
                accessToken,
                user: toPublicUser(user)
            }
        })
    } catch (error) {
        console.error("Failed to refresh token", error)
        return res.status(500).json({success: false, message: "Invalid to refresh the token", data: null})
    }
}
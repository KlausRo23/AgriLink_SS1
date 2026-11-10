import Settings, {
    ALLOWED_FONT_SIZES,
    ALLOWED_THEMES
} from '../model/Settings.js'
import User from '../model/User.js'
import { REGION_IDS } from '../constant/region.js'
import { toPublicUser } from '../utils/publicUser.js'
import bcrypt from 'bcryptjs'
import { validatePassword } from '../utils/sanitizeInput.js'
import { generateAccessToken, generateRefreshToken } from '../utils/generateToken.js'

// Each updatable field: allowed values, error message, and success phrase
const FIELD_RULES = {
    fontSize: {
        allowed: ALLOWED_FONT_SIZES,
        error: "Invalid font size",
        describe: (value) => `font size changed to ${value}`
    },
    theme: {
        allowed: ALLOWED_THEMES,
        error: "Invalid theme",
        describe: (value) => `switched to ${value} theme`
    }
}

// Turns ["a", "b", "c"] into "a, b and c", and handles 1 or 2 items cleanly too
function joinWithAnd(items) {
    if (items.length === 1) return items[0]
    if (items.length === 2) return items.join(' and ')
    return items.slice(0, -1).join(', ') + ' and ' + items[items.length - 1]
}

// Upsert can race on the unique `user` index (two requests at once).
// On E11000, the other request already created the doc, so just read it.
async function findOrCreateSettings(userId) {
    const query = {user: userId}
    const update = {$setOnInsert: {user: userId}}
    const options = {new: true, upsert: true, setDefaultsOnInsert: true}

    try {
        return await Settings.findOneAndUpdate(query, update, options)
    } catch (error) {
        if (error.code === 11000) {
            return await Settings.findOne(query)
        }
        throw error
    }
}

export async function getSettings(req, res) {
    try {
        const settings = await findOrCreateSettings(req.user.id)
        return res.status(200).json({settings})
    } catch (error) {
        console.error("Failed to get settings", error)
        return res.status(500).json({message: "Internal Error"})
    }
}

export async function updateSettings(req, res) {
    try {
        const userId = req.user.id

        const updates = {}
        const changes = []

        for (const [field, rule] of Object.entries(FIELD_RULES)) {
            const value = req.body[field]
            if (value === undefined) continue

            if (!rule.allowed.includes(value)) {
                return res.status(400).json({message: rule.error})
            }
            updates[field] = value
            changes.push(rule.describe(value))
        }

        if (changes.length === 0) {
            return res.status(400).json({message: "No valid fields to update"})
        }

        const settings = await Settings.findOneAndUpdate(
            {user: userId},
            {$set: updates},
            {new: true, upsert: true, runValidators: true, setDefaultsOnInsert: true}
        )

        const message = `Successfully ${joinWithAnd(changes)}`

        return res.status(200).json({message, settings})
    } catch (error) {
        console.error("Failed to update settings", error)
        return res.status(500).json({message: "Internal Error"})
    }
}

// PATCH /settings/region — region lives on the User (not the Settings doc).
// Send { region: "<id>" } to set it, or { region: null } to clear it.
export async function updateRegion(req, res) {
    try {
        const { region } = req.body ?? {}

        if (region === undefined) {
            return res.status(400).json({message: "Region is required"})
        }
        if (region !== null && !REGION_IDS.includes(region)) {
            return res.status(400).json({message: "Invalid region"})
        }

        const user = await User.findByIdAndUpdate(
            req.user.id,
            {$set: {region}},
            {new: true, runValidators: true}
        )

        if (!user) {
            return res.status(404).json({message: "User doesn't exist"})
        }

        return res.status(200).json({
            message: region ? "Region updated" : "Region cleared",
            user: toPublicUser(user)
        })
    } catch (error) {
        console.error("Failed to update region", error)
        return res.status(500).json({message: "Internal Error"})
    }
}

export async function changePassword(req, res) {
    try {
        const { currentPassword, newPassword } = req.body ?? {}
        if (
            typeof currentPassword !== "string" ||
            !currentPassword ||
            currentPassword.length > 100 ||
            typeof newPassword !== "string"
        ) {
            return res.status(400).json({ message: "Current and new passwords are required" })
        }
        if (!validatePassword(newPassword)) {
            return res.status(400).json({
                message: "Password must be 8-100 characters and include uppercase, lowercase, a number, and a symbol"
            })
        }

        const user = await User.findById(req.user.id)
        if (!user) return res.status(404).json({ message: "User doesn't exist" })

        if (!(await bcrypt.compare(currentPassword, user.password))) {
            return res.status(401).json({ message: "Current password is incorrect" })
        }
        if (await bcrypt.compare(newPassword, user.password)) {
            return res.status(400).json({ message: "Choose a password you haven't used before" })
        }

        user.password = await bcrypt.hash(newPassword, 10)
        user.refreshToken = generateRefreshToken(user)
        await user.save()

        res.cookie("refreshToken", user.refreshToken, {
            httpOnly: true,
            secure: process.env.NODE_ENV === "production",
            sameSite: "strict",
            maxAge: 7 * 24 * 60 * 60 * 1000,
            path: '/'
        })

        return res.status(200).json({
            message: "Password updated",
            accessToken: generateAccessToken(user),
            user: toPublicUser(user)
        })
    } catch (error) {
        console.error("Failed to change password", error)
        return res.status(500).json({ message: "Internal Error" })
    }
}
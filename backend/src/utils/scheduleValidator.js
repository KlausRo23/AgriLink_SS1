import { ACTIVITY_ACTIONS } from "../constant/schedule.js"
import { sanitizeInput } from "./sanitizeInput.js"

const DAY_REGEX = /^\d{4}-\d{2}-\d{2}$/
const MONTH_REGEX = /^(\d{4})-(0[1-9]|1[0-2])$/
const MIN_YEAR = 2000
const MAX_YEAR = 2100

// Strips angle brackets (no HTML/script tags in stored text) and collapses spaces
const clean = (value) => sanitizeInput(value).replace(/[<>]/g, "").replace(/\s+/g, " ")

// multipart forms send arrays as repeated fields, a single value, a comma list or a JSON array
function toArray(value) {
    if (Array.isArray(value)) return value
    if (typeof value === "string") {
        const t = value.trim()
        if (t.startsWith("[")) {
            try {
                const parsed = JSON.parse(t)
                return Array.isArray(parsed) ? parsed : null
            } catch {
                return null
            }
        }
        return t.split(",")
    }
    return null
}

function parseBoolean(value) {
    if (typeof value === "boolean") return value
    if (value === "true") return true
    if (value === "false") return false
    return null
}

// "YYYY-MM-DD" -> Date at UTC midnight. Rejects impossible dates like 2026-02-31.
export function parseDay(value) {
    if (typeof value !== "string" || !DAY_REGEX.test(value)) return null
    const [y, m, d] = value.split("-").map(Number)
    if (y < MIN_YEAR || y > MAX_YEAR) return null

    const date = new Date(Date.UTC(y, m - 1, d))
    if (date.toISOString().slice(0, 10) !== value) return null
    return date
}

// "YYYY-MM" -> { start, end, label }. No value means the current month.
export function parseMonth(value) {
    let year, month

    if (value === undefined) {
        const now = new Date()
        year = now.getUTCFullYear()
        month = now.getUTCMonth() + 1
    } else {
        const match = typeof value === "string" ? MONTH_REGEX.exec(value) : null
        if (!match) return null
        year = Number(match[1])
        month = Number(match[2])
        if (year < MIN_YEAR || year > MAX_YEAR) return null
    }

    return {
        start: new Date(Date.UTC(year, month - 1, 1)),
        end: new Date(Date.UTC(year, month, 1)),
        label: `${year}-${String(month).padStart(2, "0")}`
    }
}

/**
 * Whitelists, sanitizes and validates what a farmer saves for a day.
 * Only fields that were sent are returned, so a save can change just the note, just the photo, etc.
 * Anything else (owner, crop, date, _id...) is ignored.
 */
export function validateActivityInput(body = {}) {
    const errors = {}
    const data = {}
    const has = (key) => Object.prototype.hasOwnProperty.call(body, key)

    if (has("actions")) {
        const list = toArray(body.actions)

        if (!list || list.some((a) => typeof a !== "string")) {
            errors.actions = "actions must be a list of activity names"
        } else {
            const actions = [...new Set(list.map((a) => clean(a).toLowerCase()).filter(Boolean))]
            if (actions.some((a) => !ACTIVITY_ACTIONS.includes(a))) {
                errors.actions = `actions can only contain: ${ACTIVITY_ACTIONS.join(", ")}`
            } else data.actions = actions // an empty list clears the actions
        }
    }

    if (has("note")) {
        if (typeof body.note !== "string" || body.note.length > 200) {
            errors.note = "note must be text of 200 characters or less"
        } else data.note = clean(body.note)
    }

    data.removePhoto = false
    if (has("removePhoto") && body.removePhoto !== "" && body.removePhoto !== null) {
        const b = parseBoolean(body.removePhoto)
        if (b === null) errors.removePhoto = "removePhoto must be true or false"
        else data.removePhoto = b
    }

    return { data, errors, isValid: Object.keys(errors).length === 0 }
}
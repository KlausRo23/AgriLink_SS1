import { INVENTORY_CATEGORIES, INVENTORY_UNITS, SOURCE_TYPES } from "../constant/inventory.js"
import { sanitizeInput } from "./sanitizeInput.js"

const NAME_REGEX = /^[\p{L}\p{N}][\p{L}\p{N}\s.,'&()/-]*$/u
const EMOJI_REGEX = /^[\p{Extended_Pictographic}\p{Emoji_Modifier}\u200d\ufe0f]+$/u
const MIN_DATE = new Date("2000-01-01")
const MAX_DATE = new Date("2100-01-01")
const MAX_QUANTITY = 10_000_000
const DAY_MS = 86_400_000

// Strips angle brackets (no HTML/script tags in stored text) and collapses spaces
const clean = (value) => sanitizeInput(value).replace(/[<>]/g, "").replace(/\s+/g, " ")
// Same, but keeps line breaks for longer text
const cleanText = (value) => sanitizeInput(value).replace(/[<>]/g, "").replace(/[ \t]+/g, " ")

const isBlank = (v) => v === "" || v === null || v === undefined

function parseBoolean(value) {
    if (typeof value === "boolean") return value
    if (value === "true") return true
    if (value === "false") return false
    return null
}

function parseDate(value, { allowFuture }) {
    if (typeof value !== "string") return null
    const date = new Date(value)
    if (Number.isNaN(date.getTime()) || date < MIN_DATE || date > MAX_DATE) return null
    // +1 day tolerance so a user ahead of UTC (e.g. the Philippines) can enter "today"
    if (!allowFuture && date > new Date(Date.now() + DAY_MS)) return null
    return date
}

// Whole numbers or up to 2 decimals (e.g. 12.5 kg)
function parseQuantity(value, { min }) {
    const n = typeof value === "number" ? value : Number(value)
    if (!Number.isFinite(n) || n < min || n > MAX_QUANTITY) return null
    if (Math.round(n * 100) / 100 !== n) return null
    return n
}

/**
 * Whitelists, sanitizes and validates inventory input (manual create / edit).
 * Anything not listed here (owner, sourceType, crop, harvestDate, _id...) is ignored.
 */
export function validateInventoryInput(body = {}, { partial = false } = {}) {
    const errors = {}
    const data = {}
    const has = (key) => Object.prototype.hasOwnProperty.call(body, key)

    if (!partial) {
        for (const key of ["name", "category", "quantity", "unit"]) {
            if (!has(key) || isBlank(body[key])) errors[key] = `${key} is required`
        }
    }

    if (has("name") && !errors.name) {
        const v = typeof body.name === "string" ? clean(body.name) : ""
        if (v.length < 2 || v.length > 50 || !NAME_REGEX.test(v)) {
            errors.name = "name must be 2-50 characters (letters, numbers, spaces and . , ' & ( ) / - only)"
        } else data.name = v
    }

    if (has("category") && !errors.category) {
        const v = typeof body.category === "string" ? clean(body.category) : ""
        if (!INVENTORY_CATEGORIES.includes(v)) errors.category = `category must be one of: ${INVENTORY_CATEGORIES.join(", ")}`
        else data.category = v
    }

    if (has("unit") && !errors.unit) {
        const v = typeof body.unit === "string" ? clean(body.unit) : ""
        if (!INVENTORY_UNITS.includes(v)) errors.unit = `unit must be one of: ${INVENTORY_UNITS.join(", ")}`
        else data.unit = v
    }

    if (has("quantity") && !errors.quantity) {
        const n = parseQuantity(body.quantity, { min: 0 })
        if (n === null) errors.quantity = "quantity must be a number from 0 to 10,000,000 (max 2 decimals)"
        else data.quantity = n
    }

    for (const key of ["description", "notes"]) {
        if (has(key)) {
            if (typeof body[key] !== "string" || body[key].length > 500) {
                errors[key] = `${key} must be text of 500 characters or less`
            } else data[key] = cleanText(body[key])
        }
    }

    if (has("icon") && !isBlank(body.icon)) {
        const v = typeof body.icon === "string" ? body.icon.trim() : ""
        if (v.length === 0 || v.length > 16 || !EMOJI_REGEX.test(v)) errors.icon = "icon must be a single emoji"
        else data.icon = v
    }

    if (has("dateReceived") && !isBlank(body.dateReceived)) {
        const d = parseDate(body.dateReceived, { allowFuture: false })
        if (!d) errors.dateReceived = "dateReceived must be a valid date (YYYY-MM-DD) that is not in the future"
        else data.dateReceived = d
    }

    if (has("expirationDate")) {
        if (isBlank(body.expirationDate)) data.expirationDate = null
        else {
            const d = parseDate(body.expirationDate, { allowFuture: true })
            if (!d) errors.expirationDate = "expirationDate must be a valid date (YYYY-MM-DD)"
            else data.expirationDate = d
        }
    }

    if (data.dateReceived && data.expirationDate && data.expirationDate < data.dateReceived) {
        errors.expirationDate = "expirationDate cannot be before dateReceived"
    }

    return { data, errors, isValid: Object.keys(errors).length === 0 }
}

/**
 * Validates the harvest form: quantity + unit (required), notes, shelf life, early-harvest confirmation.
 */
export function validateHarvestInput(body = {}) {
    const errors = {}
    const data = {}
    const has = (key) => Object.prototype.hasOwnProperty.call(body, key)

    for (const key of ["quantity", "unit"]) {
        if (!has(key) || isBlank(body[key])) errors[key] = `${key} is required`
    }

    if (has("quantity") && !errors.quantity) {
        const n = parseQuantity(body.quantity, { min: 0.01 })
        if (n === null) errors.quantity = "quantity must be greater than 0 and at most 10,000,000 (max 2 decimals)"
        else data.quantity = n
    }

    if (has("unit") && !errors.unit) {
        const v = typeof body.unit === "string" ? clean(body.unit) : ""
        if (!INVENTORY_UNITS.includes(v)) errors.unit = `unit must be one of: ${INVENTORY_UNITS.join(", ")}`
        else data.unit = v
    }

    if (has("notes") && !isBlank(body.notes)) {
        if (typeof body.notes !== "string" || body.notes.length > 500) {
            errors.notes = "notes must be text of 500 characters or less"
        } else data.notes = cleanText(body.notes)
    }

    if (has("shelfLifeDays") && !isBlank(body.shelfLifeDays)) {
        const n = Number(body.shelfLifeDays)
        if (!Number.isInteger(n) || n < 1 || n > 3650) {
            errors.shelfLifeDays = "shelfLifeDays must be a whole number from 1 to 3650"
        } else data.shelfLifeDays = n
    }

    data.confirmEarly = false
    if (has("confirmEarly") && !isBlank(body.confirmEarly)) {
        const b = parseBoolean(body.confirmEarly)
        if (b === null) errors.confirmEarly = "confirmEarly must be true or false"
        else data.confirmEarly = b
    }

    return { data, errors, isValid: Object.keys(errors).length === 0 }
}

// Validates the list query. Guards against NoSQL injection through
// query strings such as ?category[$ne]=x (those arrive as objects, not strings).
export function parseInventoryListQuery(query = {}) {
    const filter = {}
    const errors = {}

    if (query.category !== undefined) {
        if (typeof query.category !== "string" || !INVENTORY_CATEGORIES.includes(query.category)) errors.category = "invalid category"
        else filter.category = query.category
    }

    if (query.sourceType !== undefined) {
        if (typeof query.sourceType !== "string" || !Object.values(SOURCE_TYPES).includes(query.sourceType)) errors.sourceType = "invalid sourceType"
        else filter.sourceType = query.sourceType
    }

    if (query.unit !== undefined) {
        if (typeof query.unit !== "string" || !INVENTORY_UNITS.includes(query.unit)) errors.unit = "invalid unit"
        else filter.unit = query.unit
    }

    const page = Math.max(parseInt(query.page, 10) || 1, 1)
    const limit = Math.min(Math.max(parseInt(query.limit, 10) || 20, 1), 50)

    return { filter, page, limit, errors, isValid: Object.keys(errors).length === 0 }
}
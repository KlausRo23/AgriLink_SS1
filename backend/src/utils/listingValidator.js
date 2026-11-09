import { cropPresets } from "../constant/cropPreset.js"
import { LISTING_STATUS, LISTING_UNITS } from "../constant/listing.js"
import { sanitizeInput } from "./sanitizeInput.js"

const OBJECT_ID_REGEX = /^[a-f\d]{24}$/i // stricter than isValidObjectId, which accepts any 12-char string
const CROP_NAMES = Object.keys(cropPresets)
const STATUSES = Object.values(LISTING_STATUS)

// Strips angle brackets (no HTML/script tags in stored text), keeps line breaks
const cleanText = (value) => sanitizeInput(value).replace(/[<>]/g, "").replace(/[ \t]+/g, " ").trim()

const isBlank = (v) => v === "" || v === null || v === undefined

// multipart forms send booleans as "true"/"false" strings
function parseBoolean(value) {
    if (typeof value === "boolean") return value
    if (value === "true") return true
    if (value === "false") return false
    return null
}

// Numbers with up to 2 decimals inside [min, max]. Multipart forms send everything as strings.
function parseAmount(value, { min, max }) {
    let n = NaN
    if (typeof value === "number") n = value
    else if (typeof value === "string" && value.trim() !== "") n = Number(value)

    if (!Number.isFinite(n) || n < min || n > max) return null
    if (Math.round(n * 100) / 100 !== n) return null
    return n
}

/**
 * Whitelists, sanitizes and validates listing input.
 * partial = true  -> edit: only price, stock, description and showCareLog can change
 * partial = false -> create: inventoryId, price and stock are required
 * Anything else (owner, status, name, unit, crop, review fields...) is ignored.
 */
export function validateListingInput(body = {}, { partial = false } = {}) {
    const errors = {}
    const data = {}
    const has = (key) => Object.prototype.hasOwnProperty.call(body, key)

    if (!partial) {
        for (const key of ["inventoryId", "price", "stock"]) {
            if (!has(key) || isBlank(body[key])) errors[key] = `${key} is required`
        }

        if (has("inventoryId") && !errors.inventoryId) {
            const v = typeof body.inventoryId === "string" ? body.inventoryId.trim() : ""
            if (!OBJECT_ID_REGEX.test(v)) errors.inventoryId = "invalid inventoryId"
            else data.inventoryId = v
        }
    }

    if (has("price") && !errors.price) {
        const n = parseAmount(body.price, { min: 0.01, max: 99999 })
        if (n === null) errors.price = "price must be between 0.01 and 99,999 (max 2 decimals)"
        else data.price = n
    }

    if (has("stock") && !errors.stock) {
        const n = parseAmount(body.stock, { min: 0.01, max: 99_999_999 })
        if (n === null) errors.stock = "stock must be between 0.01 and 99,999,999 (max 2 decimals)"
        else data.stock = n
    }

    if (has("description")) {
        if (typeof body.description !== "string" || body.description.length > 300) {
            errors.description = "description must be text of 300 characters or less"
        } else data.description = cleanText(body.description)
    }

    if (has("showCareLog") && !isBlank(body.showCareLog)) {
        const b = parseBoolean(body.showCareLog)
        if (b === null) errors.showCareLog = "showCareLog must be true or false"
        else data.showCareLog = b
    }

    return { data, errors, isValid: Object.keys(errors).length === 0 }
}

// Admin note for reject / return. Required when the farmer needs to know what to fix.
export function validateReviewNote(raw, { required }) {
    if (isBlank(raw)) {
        return required ? { error: "A note is required" } : { note: "" }
    }
    if (typeof raw !== "string") return { error: "note must be text" }

    const note = cleanText(raw)
    if (note.length > 300) return { error: "note must be 300 characters or less" }
    if (required && note.length === 0) return { error: "A note is required" }
    return { note }
}

// Validates list queries. Guards against NoSQL injection through
// query strings such as ?status[$ne]=x (those arrive as objects, not strings).
export function parseListingListQuery(query = {}) {
    const filter = {}
    const errors = {}

    if (query.status !== undefined) {
        if (typeof query.status !== "string" || !STATUSES.includes(query.status)) errors.status = "invalid status"
        else filter.status = query.status
    }

    if (query.name !== undefined) {
        if (typeof query.name !== "string" || !CROP_NAMES.includes(query.name)) errors.name = "invalid crop name"
        else filter.name = query.name
    }

    if (query.unit !== undefined) {
        if (typeof query.unit !== "string" || !LISTING_UNITS.includes(query.unit)) errors.unit = "invalid unit"
        else filter.unit = query.unit
    }

    const page = Math.max(parseInt(query.page, 10) || 1, 1)
    const limit = Math.min(Math.max(parseInt(query.limit, 10) || 12, 1), 50)

    return { filter, page, limit, errors, isValid: Object.keys(errors).length === 0 }
}
import { cropPresets, CROP_CATEGORY, CROP_STATUS } from "../constant/cropPreset.js"
import { sanitizeInput } from "./sanitizeInput.js"

const CROP_NAMES = Object.keys(cropPresets)
const CATEGORIES = Object.values(CROP_CATEGORY)
const STATUSES = Object.values(CROP_STATUS)
const MIN_DATE = new Date("2000-01-01")
const DAY_MS = 86_400_000

// Strips angle brackets (no HTML/script tags in stored text) and collapses spaces
const clean = (value) => sanitizeInput(value).replace(/[<>]/g, "").replace(/\s+/g, " ")
// Same, but keeps line breaks for descriptions
const cleanText = (value) => sanitizeInput(value).replace(/[<>]/g, "").replace(/[ \t]+/g, " ")

// multipart forms send booleans as "true"/"false" strings
function parseBoolean(value) {
    if (typeof value === "boolean") return value
    if (value === "true") return true
    if (value === "false") return false
    return null
}

const isBlank = (v) => v === "" || v === null || v === undefined

/**
 * Whitelists, sanitizes and validates crop input.
 * partial = true  -> only validates fields that were sent (edit)
 * partial = false -> required fields must exist (create)
 * Anything not listed here (owner, category, status, sellDate, _id...) is ignored.
 */
export function validateCropInput(body = {}, { partial = false } = {}) {
    const errors = {}
    const data = {}
    const has = (key) => Object.prototype.hasOwnProperty.call(body, key)

    if (!partial) {
        for (const key of ["name", "datePlanted"]) {
            if (!has(key) || isBlank(body[key])) errors[key] = `${key} is required`
        }
    }

    if (has("name") && !errors.name) {
        const v = typeof body.name === "string" ? clean(body.name) : ""
        if (!CROP_NAMES.includes(v)) errors.name = "invalid crop name"
        else data.name = v
    }

    if (has("datePlanted") && !errors.datePlanted) {
        const date = typeof body.datePlanted === "string" ? new Date(body.datePlanted) : null
        // +1 day tolerance so a farmer ahead of UTC (e.g. the Philippines) can enter "today"
        const latest = new Date(Date.now() + DAY_MS)
        if (!date || Number.isNaN(date.getTime()) || date > latest || date < MIN_DATE) {
            errors.datePlanted = "datePlanted must be a valid date (YYYY-MM-DD) that is not in the future"
        } else data.datePlanted = date
    }

    if (has("harvestDate") && !isBlank(body.harvestDate)) {
        const date = typeof body.harvestDate === "string" ? new Date(body.harvestDate) : null
        const latest = new Date(Date.now() + 3650 * DAY_MS)
        if (!date || Number.isNaN(date.getTime()) || date > latest || date < MIN_DATE) {
            errors.harvestDate = "harvestDate must be a valid date from 2000 through the next 10 years"
        } else data.harvestDate = date
    }

    if (data.datePlanted && data.harvestDate && data.harvestDate < data.datePlanted) {
        errors.harvestDate = "harvestDate cannot be before datePlanted"
    }

    if (has("description")) {
        if (typeof body.description !== "string" || body.description.length > 1000) {
            errors.description = "description must be text of 1000 characters or less"
        } else data.description = cleanText(body.description)
    }

    if (has("field")) {
        if (typeof body.field !== "string" || body.field.length > 80) {
            errors.field = "field must be text of 80 characters or less"
        } else data.field = clean(body.field)
    }

    if (has("isSpecialty")) {
        const isSpecialty = parseBoolean(body.isSpecialty)
        if (isSpecialty === null) errors.isSpecialty = "isSpecialty must be true or false"
        else data.isSpecialty = isSpecialty
    }

    if (has("removeImage")) {
        const removeImage = parseBoolean(body.removeImage)
        if (removeImage === null) errors.removeImage = "removeImage must be true or false"
        else data.removeImage = removeImage
    }

    if (has("shelfLifeDays") && !isBlank(body.shelfLifeDays)) {
        const n = Number(body.shelfLifeDays)
        if (!Number.isInteger(n) || n < 1 || n > 3650) {
            errors.shelfLifeDays = "shelfLifeDays must be a whole number from 1 to 3650"
        } else data.shelfLifeDays = n
    }

    if (has("seedlings")) {
        if (isBlank(body.seedlings)) data.seedlings = null
        else {
            const n = Number(body.seedlings)
            if (!Number.isInteger(n) || n < 1 || n > 1_000_000) {
                errors.seedlings = "seedlings must be a whole number from 1 to 1,000,000"
            } else data.seedlings = n
        }
    }

    if (has("isOrganic")) {
        const b = parseBoolean(body.isOrganic)
        if (b === null) errors.isOrganic = "isOrganic must be true or false"
        else data.isOrganic = b
    }

    return { data, errors, isValid: Object.keys(errors).length === 0 }
}

// Validates the list query. Guards against NoSQL injection through
// query strings such as ?status[$ne]=x (those arrive as objects, not strings).
export function parseCropListQuery(query = {}) {
    const filter = {}
    const errors = {}

    if (query.status !== undefined) {
        if (typeof query.status !== "string" || !STATUSES.includes(query.status)) errors.status = "invalid status"
        else filter.status = query.status
    }

    if (query.category !== undefined) {
        if (typeof query.category !== "string" || !CATEGORIES.includes(query.category)) errors.category = "invalid category"
        else filter.category = query.category
    }

    if (query.name !== undefined) {
        if (typeof query.name !== "string" || !CROP_NAMES.includes(query.name)) errors.name = "invalid crop name"
        else filter.name = query.name
    }

    const page = Math.max(parseInt(query.page, 10) || 1, 1)
    const limit = Math.min(Math.max(parseInt(query.limit, 10) || 12, 1), 50)

    return { filter, page, limit, errors, isValid: Object.keys(errors).length === 0 }
}
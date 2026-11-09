import { REGION_IDS } from "../constant/region.js"
import { cropPresets } from "../constant/cropPreset.js"
import { sanitizeInput } from "./sanitizeInput.js"

const DELIVERY_MODES = ["deliver", "3rd party service"]
const VERIFIED_STATES = ["False", "Pending", "Verified"]

const SPECIALTIES = Object.keys(cropPresets)

const FARM_NAME_REGEX = /^[\p{L}\p{N}][\p{L}\p{N}\s.,'&-]*$/u // letters, digits, spaces, . , ' & -
const MIN_DATE = new Date("1900-01-01")

// Trims, caps length, strips angle brackets (no HTML/script tags in stored text), collapses spaces
const clean = (value) => sanitizeInput(value).replace(/[<>]/g, "").replace(/\s+/g, " ")

// multipart forms send arrays as repeated fields, a single value, or a comma list
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

/**
 * Whitelists, sanitizes and validates farm input.
 * partial = true  -> only validates fields that were sent (edit)
 * partial = false -> required fields must exist (create)
 * Anything not listed here (owner, isVerified, activeProduct, review, _id...) is ignored.
 */
export function validateFarmInput(body = {}, { partial = false } = {}) {
    const errors = {}
    const data = {}
    const has = (key) => Object.prototype.hasOwnProperty.call(body, key)

    const required = ["farmName", "location", "deliveryMode", "deliverableRegions", "description"]
    if (!partial) {
        for (const key of required) {
            if (!has(key) || body[key] === "" || body[key] === null) errors[key] = `${key} is required`
        }
    }

    if (has("farmName") && !errors.farmName) {
        const v = clean(body.farmName)
        if (v.length < 2 || v.length > 30 || !FARM_NAME_REGEX.test(v)) {
            errors.farmName = "farmName must be 2-30 characters (letters, numbers, spaces, . , ' & - only)"
        } else data.farmName = v
    }

    if (has("location") && !errors.location) {
        const v = clean(body.location)
        if (v.length < 5 || v.length > 200) errors.location = "location must be 5-200 characters"
        else data.location = v
    }

    if (has("deliveryMode") && !errors.deliveryMode) {
        const v = clean(body.deliveryMode)
        if (!DELIVERY_MODES.includes(v)) errors.deliveryMode = `deliveryMode must be one of: ${DELIVERY_MODES.join(", ")}`
        else data.deliveryMode = v
    }

    if (has("deliverableRegions") && !errors.deliverableRegions) {
        const list = toArray(body.deliverableRegions)
        const regions = list ? [...new Set(list.map((r) => clean(r)).filter(Boolean))] : null

        if (!regions || regions.length === 0) {
            errors.deliverableRegions = "deliverableRegions must contain at least one region"
        } else if (regions.some((r) => !REGION_IDS.includes(r))) {
            errors.deliverableRegions = "deliverableRegions contains an invalid region"
        } else data.deliverableRegions = regions
    }

    if (has("startedFarming") && body.startedFarming !== "") {
        const value = typeof body.startedFarming === "string" ? body.startedFarming.trim() : ""
        if (/^\d{4}$/.test(value)) {
            const year = Number(value)
            if (year < 1900 || year > new Date().getFullYear()) {
                errors.startedFarming = "startedFarming must be a year from 1900 through the current year"
            } else {
                data.startedFarming = new Date(Date.UTC(year, 0, 1))
            }
        } else {
            const date = /^\d{4}-\d{2}-\d{2}$/.test(value) ? new Date(`${value}T00:00:00.000Z`) : null
            if (
                !date ||
                Number.isNaN(date.getTime()) ||
                date.toISOString().slice(0, 10) !== value ||
                date > new Date() ||
                date < MIN_DATE
            ) {
                errors.startedFarming = "startedFarming must be a year or valid past date (YYYY or YYYY-MM-DD)"
            } else data.startedFarming = date
        }
    }

    if (has("specialty") && body.specialty !== "") {
        const list = toArray(body.specialty)
        const specialties = list ? [...new Set(list.map((item) => clean(item)).filter(Boolean))] : null
        if (!specialties) {
            errors.specialty = "specialty must be a list of supported crops"
        } else if (specialties.some((item) => !SPECIALTIES.includes(item))) {
            errors.specialty = "specialty contains an invalid crop"
        } else data.specialty = specialties
    }

    if (has("description") && !errors.description) {
        const v = clean(body.description)
        if (v.length === 0 || v.length > 200) errors.description = "description must be 1-200 characters"
        else data.description = v
    }

    return { data, errors, isValid: Object.keys(errors).length === 0 }
}

// Validates the admin list query. Guards against NoSQL injection through
// query strings such as ?region[$ne]=x (those arrive as objects, not strings).
export function parseFarmListQuery(query = {}) {
    const filter = {}
    const errors = {}

    if (query.region !== undefined) {
        if (typeof query.region !== "string" || !REGION_IDS.includes(query.region)) errors.region = "invalid region"
        else filter.deliverableRegions = query.region // matches farms that deliver to this region
    }

    if (query.isVerified !== undefined) {
        if (typeof query.isVerified !== "string" || !VERIFIED_STATES.includes(query.isVerified))
            errors.isVerified = "invalid isVerified value"
        else filter.isVerified = query.isVerified
    }

    if (query.deliveryMode !== undefined) {
        if (typeof query.deliveryMode !== "string" || !DELIVERY_MODES.includes(query.deliveryMode))
            errors.deliveryMode = "invalid deliveryMode"
        else filter.deliveryMode = query.deliveryMode
    }

    const page = Math.max(parseInt(query.page, 10) || 1, 1)
    const limit = Math.min(Math.max(parseInt(query.limit, 10) || 10, 1), 50)

    return { filter, page, limit, errors, isValid: Object.keys(errors).length === 0 }
}
import { REGION_IDS } from "../constant/region.js"
import { sanitizeInput, validateEmail } from "./sanitizeInput.js"

const SUFFIXES = ["Jr", "Sr", "I", "II", "III"]
const VERIFIED_STATES = ["False", "Pending", "Verified"]
const NAME_REGEX = /^[\p{L}][\p{L}\s.'-]*$/u // letters, spaces, . ' -
const PH_MOBILE_REGEX = /^(09\d{9}|\+639\d{9})$/
const FACEBOOK_HOSTS = ["facebook.com", "www.facebook.com", "m.facebook.com", "fb.com", "www.fb.com"]

// Trims, caps length, strips angle brackets (no HTML/script tags in stored text), collapses spaces
const clean = (value) => sanitizeInput(value).replace(/[<>]/g, "").replace(/\s+/g, " ")

function validateName(value, label, errors) {
    const v = clean(value)
    if (v.length < 2 || v.length > 30 || !NAME_REGEX.test(v)) {
        errors[label] = `${label} must be 2-30 characters (letters, spaces, . ' - only)`
        return undefined
    }
    return v
}

/**
 * Whitelists, sanitizes and validates farmer input.
 * partial = true  -> only validates fields that were sent (edit)
 * partial = false -> required fields must exist (create)
 * Anything not listed here (isVerified, ssoUserId, role, _id...) is ignored.
 */
export function validateFarmerInput(body = {}, { partial = false } = {}) {
    const errors = {}
    const data = {}
    const has = (key) => Object.prototype.hasOwnProperty.call(body, key)

    const required = ["lastName", "firstName", "middleName", "age", "region"]
    if (!partial) {
        for (const key of required) {
            if (!has(key) || body[key] === "" || body[key] === null) errors[key] = `${key} is required`
        }
    }

    for (const key of ["lastName", "firstName", "middleName"]) {
        if (has(key) && !errors[key]) {
            const v = validateName(body[key], key, errors)
            if (v !== undefined) data[key] = v
        }
    }

    if (has("suffix") && body.suffix !== "") {
        const v = clean(body.suffix)
        if (!SUFFIXES.includes(v)) errors.suffix = `suffix must be one of: ${SUFFIXES.join(", ")}`
        else data.suffix = v
    }

    if (has("age") && !errors.age) {
        const age = Number(body.age)
        if (!Number.isInteger(age) || age < 18 || age > 99) errors.age = "age must be a whole number from 18 to 99"
        else data.age = age
    }

    if (has("region") && !errors.region) {
        const v = clean(body.region)
        if (!REGION_IDS.includes(v)) errors.region = "invalid region"
        else data.region = v
    }

    if (has("bio") && !errors.bio) {
        const v = clean(body.bio)
        if (v.length > 200) errors.bio = "bio must be at most 200 characters"
        else data.bio = v
    }

    if (has("mobileNumber") && body.mobileNumber !== "") {
        const v = clean(body.mobileNumber).replace(/[\s-]/g, "")
        if (!PH_MOBILE_REGEX.test(v)) errors.mobileNumber = "mobile number must look like 09XXXXXXXXX or +639XXXXXXXXX"
        else data.mobileNumber = v
    }

    if (has("email") && body.email !== "") {
        if (!validateEmail(body.email)) errors.email = "invalid email"
        else data.email = body.email.trim().toLowerCase()
    }

    if (has("facebook") && body.facebook !== "") {
        const v = clean(body.facebook)
        try {
            const url = new URL(v)
            if (url.protocol !== "https:" || !FACEBOOK_HOSTS.includes(url.hostname) || v.length > 200) throw new Error()
            data.facebook = url.toString()
        } catch {
            errors.facebook = "facebook must be a valid https facebook.com link"
        }
    }

    return { data, errors, isValid: Object.keys(errors).length === 0 }
}

// Validates the admin list query. Guards against NoSQL injection through
// query strings such as ?region[$ne]=x (those arrive as objects, not strings).
export function parseListQuery(query = {}) {
    const filter = {}
    const errors = {}

    if (query.region !== undefined) {
        if (typeof query.region !== "string" || !REGION_IDS.includes(query.region)) errors.region = "invalid region"
        else filter.region = query.region
    }

    if (query.isVerified !== undefined) {
        if (typeof query.isVerified !== "string" || !VERIFIED_STATES.includes(query.isVerified))
            errors.isVerified = "invalid isVerified value"
        else filter.isVerified = query.isVerified
    }

    const page = Math.max(parseInt(query.page, 10) || 1, 1)
    const limit = Math.min(Math.max(parseInt(query.limit, 10) || 10, 1), 50)

    return { filter, page, limit, errors, isValid: Object.keys(errors).length === 0 }
}
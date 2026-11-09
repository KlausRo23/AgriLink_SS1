import { ARCHIVE_TYPES } from "../constant/archive.js"
import { sanitizeInput } from "./sanitizeInput.js"

const OBJECT_ID_REGEX = /^[a-f\d]{24}$/i // stricter than isValidObjectId, which accepts any 12-char string

// Strips angle brackets (no HTML/script tags in stored text) and collapses spaces
const clean = (value) => sanitizeInput(value).replace(/[<>]/g, "").replace(/\s+/g, " ").trim()

// Lenient: used by the delete endpoints, where the reason is optional and anything odd just becomes ""
export function normalizeReason(raw) {
    return typeof raw === "string" ? clean(raw).slice(0, 200) : ""
}

/**
 * Validates POST /create-archive.
 * Anything else in the body (owner, snapshot, originalId...) is ignored.
 */
export function validateCreateArchive(body = {}) {
    const errors = {}
    const data = {}

    const itemType = typeof body.itemType === "string" ? body.itemType.trim() : ""
    if (!ARCHIVE_TYPES.includes(itemType)) {
        errors.itemType = `itemType must be one of: ${ARCHIVE_TYPES.join(", ")}`
    } else data.itemType = itemType

    const itemId = typeof body.itemId === "string" ? body.itemId.trim() : ""
    if (!OBJECT_ID_REGEX.test(itemId)) errors.itemId = "invalid itemId"
    else data.itemId = itemId

    if (body.reason !== undefined && body.reason !== "" && body.reason !== null) {
        if (typeof body.reason !== "string" || body.reason.length > 200) {
            errors.reason = "reason must be text of 200 characters or less"
        } else data.reason = clean(body.reason)
    }

    return { data, errors, isValid: Object.keys(errors).length === 0 }
}

// Validates the list query. Guards against NoSQL injection through
// query strings such as ?itemType[$ne]=x (those arrive as objects, not strings).
export function parseArchiveListQuery(query = {}) {
    const filter = {}
    const errors = {}

    if (query.itemType !== undefined) {
        if (typeof query.itemType !== "string" || !ARCHIVE_TYPES.includes(query.itemType)) errors.itemType = "invalid itemType"
        else filter.itemType = query.itemType
    }

    const page = Math.max(parseInt(query.page, 10) || 1, 1)
    const limit = Math.min(Math.max(parseInt(query.limit, 10) || 20, 1), 50)

    return { filter, page, limit, errors, isValid: Object.keys(errors).length === 0 }
}
export const LISTING_STATUS = Object.freeze({
    PENDING: "pending",
    APPROVED: "approved",
    REJECTED: "rejected",
    RETURNED: "returned" // sent back to the farmer for changes
})

// A listing in one of these states occupies its inventory item
export const ACTIVE_LISTING_STATUSES = Object.freeze([
    LISTING_STATUS.PENDING,
    LISTING_STATUS.APPROVED,
    LISTING_STATUS.RETURNED
])

export const LISTING_UNITS = Object.freeze(["kg", "sack", "heads"])
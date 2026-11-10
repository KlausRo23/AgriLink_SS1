import History from "../model/History.js"
import AppError from "../utils/AppError.js"

const ITEM_TYPES = ["Crop", "Supply", "Listing"]
const ACTIONS = ["added", "edited", "archived", "restored", "deleted", "harvested"]

function describeState(state) {
    if (!state || typeof state !== "object") return ""
    const quantity = state.quantity ?? state.seedlings
    const unit = state.unit
    if (quantity !== undefined) return `${quantity}${unit ? ` ${unit}` : ""}`
    if (state.price !== undefined) return `${state.status || "Listing"} · ₱${state.price}`
    return state.status || state.category || ""
}

function presentHistory(entry) {
    const state = entry.newState || entry.previousState
    const name = state?.name || "Farm item"
    const stateSummary = describeState(state)
    const actionDetails = {
        added: stateSummary ? `Added · ${stateSummary}` : "Added to farm records",
        edited: stateSummary ? `Updated · ${stateSummary}` : "Farm record updated",
        archived: entry.previousState?.reason || "Moved to archive",
        restored: stateSummary ? `Restored · ${stateSummary}` : "Returned from archive",
        deleted: entry.previousState?.reason || "Permanently removed",
        harvested: stateSummary ? `Harvested · ${stateSummary}` : "Crop harvested"
    }

    return {
        id: String(entry._id),
        action: entry.action,
        itemType: entry.itemType,
        name,
        detail: actionDetails[entry.action],
        createdAt: entry.createdAt
    }
}

export async function getHistory(query, requester) {
    const errors = {}
    const filter = { owner: requester.id }

    if (query.action !== undefined) {
        if (typeof query.action !== "string" || !ACTIONS.includes(query.action)) errors.action = "invalid action"
        else filter.action = query.action
    }
    if (query.itemType !== undefined) {
        if (typeof query.itemType !== "string" || !ITEM_TYPES.includes(query.itemType)) errors.itemType = "invalid itemType"
        else filter.itemType = query.itemType
    }
    if (Object.keys(errors).length) throw new AppError("Invalid history filter", 400, errors)

    const rawPage = query.page === undefined ? 1 : Number(query.page)
    const rawLimit = query.limit === undefined ? 50 : Number(query.limit)
    if (!Number.isInteger(rawPage) || rawPage < 1 || !Number.isInteger(rawLimit) || rawLimit < 1 || rawLimit > 100) {
        throw new AppError("Invalid pagination", 400, { page: "page and limit must be positive integers; limit cannot exceed 100" })
    }

    const [entries, total] = await Promise.all([
        History.find(filter)
            .sort({ createdAt: -1, _id: -1 })
            .skip((rawPage - 1) * rawLimit)
            .limit(rawLimit)
            .lean(),
        History.countDocuments(filter)
    ])

    return {
        entries: entries.map(presentHistory),
        pagination: {
            page: rawPage,
            limit: rawLimit,
            total,
            totalPages: Math.ceil(total / rawLimit)
        }
    }
}

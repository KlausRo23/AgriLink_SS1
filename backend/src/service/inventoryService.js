import mongoose from "mongoose"
import Inventory from "../model/Inventory.js"
import Archive from "../model/Archive.js"
import History from "../model/History.js"
import AppError from "../utils/AppError.js"
import { validateInventoryInput, parseInventoryListQuery } from "../utils/inventoryValidator.js"
import { processInventoryPhoto, deleteInventoryPhoto } from "../utils/imageProcessor.js"
import { SOURCE_TYPES } from "../constant/inventory.js"
import { archiveItem } from "./archiveService.js"

const DAY_MS = 86_400_000

function assertValidId(id) {
    if (typeof id !== "string" || !mongoose.isValidObjectId(id)) {
        throw new AppError("Invalid id", 400)
    }
}

// Owner-only. The query itself is scoped to the requester, so another farmer's item is simply "not found".
async function findOwnItemOrFail(id, requester) {
    assertValidId(id)
    const item = await Inventory.findOne({ _id: id, owner: requester.id })
    if (!item) throw new AppError("Inventory item not found", 404)
    return item
}

// Adds a full image URL and expiry info for the UI
export function presentInventory(item) {
    const { image, __v, ...rest } = item

    let daysToExpire = null
    let isExpired = false
    if (item.expirationDate) {
        daysToExpire = Math.ceil((new Date(item.expirationDate).getTime() - Date.now()) / DAY_MS)
        isExpired = daysToExpire < 0
    }

    const base = (process.env.PUBLIC_BASE_URL || "").replace(/\/$/, "")
    const status = isExpired
        ? "spoiled"
        : daysToExpire !== null && daysToExpire <= 7
            ? "near-spoiling"
            : "fresh"
    return { ...rest, imageUrl: image ? `${base}${image}` : null, daysToExpire, isExpired, status }
}

// Best effort: history writes must never break the real inventory operation.
async function recordInventoryHistory(action, item, previousState, newState = null) {
    try {
        await History.create({
            itemType: item.category === "crop" ? "Crop" : "Supply",
            itemId: item._id,
            action,
            previousState,
            newState,
            owner: item.owner
        })
    } catch (err) {
        console.error("History write failed:", err.message)
    }
}

// ---------- Farmer (owner only) ----------

export async function getAllInventory(query, requester) {
    const { filter, page, limit, errors, isValid } = parseInventoryListQuery(query)
    if (!isValid) throw new AppError("Invalid query", 400, errors)

    const scoped = { ...filter, owner: requester.id }

    const [items, total] = await Promise.all([
        Inventory.find(scoped).sort({ createdAt: -1 }).skip((page - 1) * limit).limit(limit).lean(),
        Inventory.countDocuments(scoped)
    ])

    return {
        items: items.map(presentInventory),
        pagination: { page, limit, total, totalPages: Math.ceil(total / limit) }
    }
}

export async function getInventoryById(id, requester) {
    const item = await findOwnItemOrFail(id, requester)
    return presentInventory(item.toObject())
}

// Manual entry (supplies, or crop stock that didn't come from a harvest)
export async function createInventory(body, file, requester) {
    const { data, errors, isValid } = validateInventoryInput(body, { partial: false })
    if (!isValid) throw new AppError("Validation failed", 400, errors)

    // The image is verified and processed only after the text fields pass
    let imagePath
    if (file) imagePath = await processInventoryPhoto(file.buffer)

    try {
        const item = await Inventory.create({
            ...data,
            sourceType: SOURCE_TYPES.MANUAL, // harvest rows can only be created by harvesting
            owner: requester.id,             // always from the token, never from req.body
            ...(imagePath && { image: imagePath })
        })
        if (item.sourceType === SOURCE_TYPES.MANUAL) {
            await recordInventoryHistory("added", item, null, item.toObject())
        }
        return presentInventory(item.toObject())
    } catch (err) {
        await deleteInventoryPhoto(imagePath) // don't leave orphan files
        throw err
    }
}

export async function updateInventory(id, body, file, requester) {
    const item = await findOwnItemOrFail(id, requester)

    const { data, errors, isValid } = validateInventoryInput(body, { partial: true })
    if (!isValid) throw new AppError("Validation failed", 400, errors)
    const removeImage = data.removeImage === true
    delete data.removeImage

    // Items created by a harvest keep their identity. Quantity, notes, expiry etc. can still be edited.
    if (item.sourceType === SOURCE_TYPES.HARVEST) {
        if (data.name !== undefined && data.name !== item.name) {
            throw new AppError("Harvested items cannot be renamed", 400, { name: "cannot be changed" })
        }
        if (data.category !== undefined && data.category !== item.category) {
            throw new AppError("Harvested items cannot change category", 400, { category: "cannot be changed" })
        }
        delete data.name
        delete data.category
    }

    if (Object.keys(data).length === 0 && !file && !removeImage) {
        throw new AppError("Nothing to update", 400)
    }

    const previous = item.toObject()

    item.set(data)
    if (item.expirationDate && item.dateReceived && item.expirationDate < item.dateReceived) {
        throw new AppError("Validation failed", 400, { expirationDate: "expirationDate cannot be before dateReceived" })
    }

    const oldImage = item.image
    let newImage
    if (file) {
        newImage = await processInventoryPhoto(file.buffer)
        item.image = newImage
    } else if (removeImage) {
        item.image = null
    }

    try {
        await item.save()
    } catch (err) {
        await deleteInventoryPhoto(newImage)
        throw err
    }

    if (newImage || removeImage) await deleteInventoryPhoto(oldImage) // remove the replaced or deleted photo

    const updated = item.toObject()
    await recordInventoryHistory("edited", item, previous, updated)
    return presentInventory(updated)
}

// "Delete" moves the item to the Archive so it can be restored.
// The photo file is kept on purpose: it's only removed when the archive entry is permanently deleted.
export async function deleteInventory(id, rawReason, requester) {
    await archiveItem("Inventory", id, rawReason, requester)
}
import mongoose from "mongoose"
import Archive from "../model/Archive.js"
import Crop from "../model/Crop.js"
import Inventory from "../model/Inventory.js"
import Listing from "../model/Listing.js"
import Schedule from "../model/Schedule.js"
import History from "../model/History.js"
import AppError from "../utils/AppError.js"
import { validateCreateArchive, parseArchiveListQuery, normalizeReason } from "../utils/archiveValidator.js"
import { deleteCropPhoto, deleteInventoryPhoto, deleteActivityPhoto } from "../utils/imageProcessor.js"
import { LISTING_STATUS } from "../constant/listing.js"

const baseUrl = () => (process.env.PUBLIC_BASE_URL || "").replace(/\/$/, "")

// Best effort: a failed history write must never break the real operation
async function recordHistory(itemType, action, owner, itemId, previousState) {
    try {
        await History.create({ itemType, action, owner, itemId, previousState, newState: null })
    } catch (err) {
        console.error("History write failed:", err.message)
    }
}

// Copies the item into the Archive, then removes the original. Rolls back if the removal fails.
async function moveToArchive({ doc, itemType, reason, owner }) {
    const snapshot = doc.toObject()
    delete snapshot.__v

    const archived = await Archive.create({
        itemType,
        originalId: doc._id,
        snapshot,
        reason,
        owner
    })

    try {
        await doc.deleteOne()
    } catch (err) {
        await Archive.deleteOne({ _id: archived._id }) // so the item isn't in both places
        throw err
    }

    return { archived, snapshot }
}

/**
 * The registry: everything that differs between item types lives here.
 * To add Message: import its model and add one entry with { model, label, describe, imageOf, ... }.
 *   afterArchive(snapshot, owner)    runs after the item was moved to the archive
 *   beforeRestore(snapshot, owner)   throws if the item can't come back right now
 *   restoreOverrides(snapshot)       fields to force when the item is restored
 *   cleanup(snapshot, owner)         runs after a permanent delete (files, related data)
 */
const TYPES = {
    Crop: {
        model: Crop,
        label: "Crop",
        describe: (s) => ({ status: s.status, datePlanted: s.datePlanted }),
        imageOf: (s) => s.image,
        afterArchive: async (snapshot, owner) => {
            await recordHistory("Crop", "deleted", owner, snapshot._id, snapshot)
        },
        cleanup: async (snapshot, owner) => {
            await deleteCropPhoto(snapshot.image)

            // The care-log entries (and their photos) belong to the crop and go with it
            const entries = await Schedule.find({ crop: snapshot._id, owner }).select("photo").lean()
            for (const entry of entries) await deleteActivityPhoto(entry.photo)
            await Schedule.deleteMany({ crop: snapshot._id, owner })
        }
    },

    Inventory: {
        model: Inventory,
        label: "Inventory item",
        describe: (s) => ({ category: s.category, quantity: s.quantity, unit: s.unit, sourceType: s.sourceType }),
        imageOf: (s) => s.image,
        afterArchive: async (snapshot, owner) => {
            // History tracks Crop and Supply only
            if (snapshot.category === "supply") {
                await recordHistory("Supply", "deleted", owner, snapshot._id, snapshot)
            }

            // Listings can't sell stock that no longer exists, so they go to the archive too (restorable)
            const listings = await Listing.find({ inventory: snapshot._id, owner })
            for (const listing of listings) {
                try {
                    await moveToArchive({ doc: listing, itemType: "Listing", reason: "Inventory item was archived", owner })
                } catch (err) {
                    console.error("Could not archive listing of archived inventory:", err.message)
                }
            }
        },
        cleanup: async (snapshot) => {
            await deleteInventoryPhoto(snapshot.image)
        }
    },

    Listing: {
        model: Listing,
        label: "Listing",
        describe: (s) => ({ price: s.price, stock: s.stock, unit: s.unit, status: s.status }),
        imageOf: () => null,
        beforeRestore: async (snapshot, owner) => {
            const inventory = await Inventory.findOne({ _id: snapshot.inventory, owner })
                .select("quantity expirationDate")
                .lean()

            if (!inventory) {
                throw new AppError("The inventory item for this listing is not available. Restore it first.", 409)
            }
            if (inventory.expirationDate && new Date(inventory.expirationDate) < new Date()) {
                throw new AppError("The inventory item for this listing has expired", 409)
            }
            if (snapshot.stock > inventory.quantity) {
                throw new AppError("Not enough stock in inventory to restore this listing", 409)
            }
        },
        // A restored listing always needs another review
        restoreOverrides: () => ({
            status: LISTING_STATUS.PENDING,
            isActive: true,
            reviewNote: "",
            reviewedBy: null,
            reviewedAt: null
        })
    }
}

function getType(itemType) {
    // Object.hasOwn blocks keys like "constructor" or "__proto__"
    if (typeof itemType !== "string" || !Object.hasOwn(TYPES, itemType)) {
        throw new AppError("Invalid item type", 400)
    }
    return TYPES[itemType]
}

function assertValidId(id) {
    if (typeof id !== "string" || !mongoose.isValidObjectId(id)) {
        throw new AppError("Invalid id", 400)
    }
}

// Owner-only. The query itself is scoped to the requester, so another farmer's entry is simply "not found".
async function findOwnEntryOrFail(id, requester) {
    assertValidId(id)
    const entry = await Archive.findOne({ _id: id, owner: requester.id })
    if (!entry) throw new AppError("Archived item not found", 404)
    return entry
}

function presentSummary(entry) {
    const snapshot = entry.snapshot ?? {}
    const type = TYPES[entry.itemType]
    const image = type?.imageOf?.(snapshot)

    return {
        id: entry._id,
        itemType: entry.itemType,
        originalId: entry.originalId,
        name: snapshot.name ?? "Unnamed item",
        imageUrl: image ? `${baseUrl()}${image}` : null,
        reason: entry.reason,
        info: type?.describe(snapshot) ?? {},
        archivedAt: entry.createdAt
    }
}

function presentDetail(entry) {
    const { owner, __v, image, ...rest } = entry.snapshot ?? {} // SS1 user id never leaves the server
    return {
        ...presentSummary(entry),
        snapshot: { ...rest, imageUrl: image ? `${baseUrl()}${image}` : null }
    }
}

// ---------- Farmer (owner only) ----------

// Used by POST /create-archive AND by the crop/inventory/listing delete endpoints
export async function archiveItem(itemType, id, rawReason, requester) {
    const type = getType(itemType)
    assertValidId(id)

    // Scoped to the requester: you can only archive your own items
    const doc = await type.model.findOne({ _id: id, owner: requester.id })
    if (!doc) throw new AppError(`${type.label} not found`, 404)

    const reason = normalizeReason(rawReason) || "Deleted by owner"

    const { archived, snapshot } = await moveToArchive({
        doc,
        itemType,
        reason,
        owner: requester.id // always from the token, never from req.body
    })

    await type.afterArchive?.(snapshot, requester.id)
    return presentSummary(archived.toObject())
}

export async function createArchive(body, requester) {
    const { data, errors, isValid } = validateCreateArchive(body)
    if (!isValid) throw new AppError("Validation failed", 400, errors)

    return archiveItem(data.itemType, data.itemId, data.reason, requester)
}

export async function getAllArchive(query, requester) {
    const { filter, page, limit, errors, isValid } = parseArchiveListQuery(query)
    if (!isValid) throw new AppError("Invalid query", 400, errors)

    const scoped = { ...filter, owner: requester.id }

    const [entries, total] = await Promise.all([
        Archive.find(scoped).sort({ createdAt: -1 }).skip((page - 1) * limit).limit(limit).lean(),
        Archive.countDocuments(scoped)
    ])

    return {
        items: entries.map(presentSummary),
        pagination: { page, limit, total, totalPages: Math.ceil(total / limit) }
    }
}

export async function getArchiveById(id, requester) {
    const entry = await findOwnEntryOrFail(id, requester)
    return presentDetail(entry.toObject())
}

export async function restoreArchive(id, requester) {
    const entry = await findOwnEntryOrFail(id, requester)
    const type = getType(entry.itemType)

    const snapshot = { ...entry.toObject().snapshot }
    delete snapshot.__v

    await type.beforeRestore?.(snapshot, requester.id)

    if (await type.model.exists({ _id: entry.originalId })) {
        throw new AppError("An item with this id already exists", 409)
    }

    let restored
    try {
        restored = await type.model.create({
            ...snapshot,
            ...(type.restoreOverrides?.(snapshot) ?? {}),
            _id: entry.originalId, // keeps references to this item valid
            owner: requester.id
        })
    } catch (err) {
        if (err.code === 11000) {
            throw new AppError("This item conflicts with an existing one and cannot be restored", 409)
        }
        if (err.name === "ValidationError") {
            throw new AppError("This item no longer passes validation and cannot be restored", 409)
        }
        throw err
    }

    try {
        await entry.deleteOne()
    } catch (err) {
        await type.model.deleteOne({ _id: restored._id }) // so the item isn't in both places
        throw err
    }

    return { itemType: entry.itemType, id: restored._id }
}

// Permanent. This is the only place where the files of an archived item are removed.
export async function deleteArchive(id, requester) {
    const entry = await findOwnEntryOrFail(id, requester)
    const type = getType(entry.itemType)

    const snapshot = entry.toObject().snapshot
    await entry.deleteOne()

    try {
        await type.cleanup?.(snapshot, requester.id)
    } catch (err) {
        // The entry is already gone, so don't fail the request over leftover files
        console.error("Archive cleanup failed:", err.message)
    }
}
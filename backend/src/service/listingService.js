import mongoose from "mongoose"
import Listing from "../model/Listing.js"
import Inventory from "../model/Inventory.js"
import Farmer from "../model/Farmer.js"
import Crop from "../model/Crop.js"
import Schedule from "../model/Schedule.js"
import AppError from "../utils/AppError.js"
import { validateListingInput, validateReviewNote, parseListingListQuery } from "../utils/listingValidator.js"
import { LISTING_STATUS, LISTING_UNITS } from "../constant/listing.js"
import { ACTIVITY_ACTIONS } from "../constant/schedule.js"
import { archiveItem } from "./archiveService.js"

const DAY_MS = 86_400_000
const MAX_CARE_ENTRIES = 200
const POPULATE_INVENTORY = { path: "inventory", select: "image icon quantity expirationDate" }

// Editing any of these means the admin should look at the listing again.
// Changing only showCareLog does not (it only changes what buyers can see).
const REVIEWED_FIELDS = ["price", "stock", "description"]

function assertValidId(id) {
    if (typeof id !== "string" || !mongoose.isValidObjectId(id)) {
        throw new AppError("Invalid id", 400)
    }
}

const isExpired = (inventory) =>
    Boolean(inventory?.expirationDate) && new Date(inventory.expirationDate) < new Date()

const dayKey = (date) => new Date(date).toISOString().slice(0, 10) // "YYYY-MM-DD"

const utcDay = (date) => {
    const d = new Date(date)
    return Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate())
}

// Owner-only. The query itself is scoped to the requester, so another farmer's listing is simply "not found".
async function findOwnListingOrFail(id, requester) {
    assertValidId(id)
    const listing = await Listing.findOne({ _id: id, owner: requester.id })
    if (!listing) throw new AppError("Listing not found", 404)
    return listing
}

// The listing can only sell what the inventory item really holds
function assertInventoryCanBackListing(inventory, stock) {
    if (!inventory) {
        throw new AppError("The inventory item for this listing no longer exists", 409)
    }
    if (inventory.category !== "crop") {
        throw new AppError("Only crop inventory can be listed for sale", 400, { inventoryId: "not a crop item" })
    }
    if (!LISTING_UNITS.includes(inventory.unit)) {
        throw new AppError(
            `Items measured in "${inventory.unit}" cannot be listed. Supported units: ${LISTING_UNITS.join(", ")}`,
            400,
            { inventoryId: "unsupported unit" }
        )
    }
    if (isExpired(inventory)) {
        throw new AppError("This inventory item has expired and cannot be listed", 400, { inventoryId: "expired" })
    }
    if (stock > inventory.quantity) {
        throw new AppError("Not enough stock in inventory", 400, {
            stock: `only ${inventory.quantity} ${inventory.unit} available in inventory`
        })
    }
}

function clearReview(listing) {
    listing.reviewNote = ""
    listing.reviewedBy = null
    listing.reviewedAt = null
}

// Adds a full image URL and the inventory info the UI needs
function presentListing(listing, { withQuantity = false } = {}) {
    const { inventory, __v, isActive, ...rest } = listing
    const inv = inventory && typeof inventory === "object" && "quantity" in inventory ? inventory : null

    const base = (process.env.PUBLIC_BASE_URL || "").replace(/\/$/, "")
    return {
        ...rest,
        inventoryId: inv ? inv._id : inventory ?? null,
        imageUrl: inv?.image ? `${base}${inv.image}` : null,
        icon: inv?.icon ?? "📦",
        expirationDate: inv?.expirationDate ?? null,
        ...(withQuantity && { inventoryQuantity: inv ? inv.quantity : null })
    }
}

/**
 * The care log: how this crop was grown, built live from the crop's Schedule entries.
 * Safe to read live because a schedule can only be edited while the crop is "growing",
 * and a listing only exists after the harvest.
 * Takes the raw (lean) listing, because it needs `crop` and `owner`.
 * Returns null when there is nothing to show (manual stock, or the crop no longer exists).
 */
async function buildCareLog(listing) {
    if (!listing.crop) return null

    const [crop, entries] = await Promise.all([
        Crop.findById(listing.crop).select("datePlanted actualHarvestDate isOrganic").lean(),
        Schedule.find({ crop: listing.crop, owner: listing.owner })
            .sort({ date: 1 })
            .limit(MAX_CARE_ENTRIES)
            .lean()
    ])
    if (!crop) return null

    const summary = Object.fromEntries(ACTIVITY_ACTIONS.map((a) => [a, 0]))
    for (const entry of entries) {
        for (const action of entry.actions) summary[action] += 1
    }

    const base = (process.env.PUBLIC_BASE_URL || "").replace(/\/$/, "")
    return {
        isOrganic: Boolean(crop.isOrganic),
        datePlanted: dayKey(crop.datePlanted),
        harvestedOn: crop.actualHarvestDate ? dayKey(crop.actualHarvestDate) : null,
        summary,
        entries: entries.map((e) => ({
            date: dayKey(e.date),
            dayOfGrowing: Math.floor((utcDay(e.date) - utcDay(crop.datePlanted)) / DAY_MS) + 1,
            actions: e.actions,
            note: e.note,
            photoUrl: e.photo ? `${base}${e.photo}` : null
        }))
    }
}

async function loadPresented(id, { withQuantity = false, withCareLog = false } = {}) {
    const listing = await Listing.findById(id).populate(POPULATE_INVENTORY).lean()
    const presented = presentListing(listing, { withQuantity })
    if (withCareLog) presented.careLog = await buildCareLog(listing)
    return presented
}

// Adds the farmer's name, region and profile id (one batched query, not one per listing)
async function attachSellers(listings, { hideOwner }) {
    const owners = [...new Set(listings.map((l) => l.owner))]
    const farmers = await Farmer.find({ ssoUserId: { $in: owners } })
        .select("ssoUserId firstName lastName suffix region")
        .lean()
    const byUser = new Map(farmers.map((f) => [f.ssoUserId, f]))

    return listings.map((listing) => {
        const f = byUser.get(listing.owner)
        const seller = f
            ? { farmerId: f._id, firstName: f.firstName, lastName: f.lastName, suffix: f.suffix, region: f.region }
            : null

        if (!hideOwner) return { ...listing, seller }
        const { owner, ...rest } = listing // buyers never see SS1 user ids
        return { ...rest, seller }
    })
}

async function paginate(filter, { page, limit }) {
    const [rows, total] = await Promise.all([
        Listing.find(filter)
            .populate(POPULATE_INVENTORY)
            .sort({ createdAt: -1 })
            .skip((page - 1) * limit)
            .limit(limit)
            .lean(),
        Listing.countDocuments(filter)
    ])
    return { rows, pagination: { page, limit, total, totalPages: Math.ceil(total / limit) } }
}

// ---------- Farmer (owner only) ----------

export async function createListing(body, requester) {
    const { data, errors, isValid } = validateListingInput(body, { partial: false })
    if (!isValid) throw new AppError("Validation failed", 400, errors)

    // Scoped to the requester: you can only list your own inventory
    const inventory = await Inventory.findOne({ _id: data.inventoryId, owner: requester.id })
    if (!inventory) throw new AppError("Inventory item not found", 404)

    assertInventoryCanBackListing(inventory, data.stock)

    try {
        const listing = await Listing.create({
            inventory: inventory._id,
            crop: inventory.crop ?? null, // links the listing to the care log
            name: inventory.name,         // from inventory, not from the client
            unit: inventory.unit,         // from inventory, not from the client
            price: data.price,
            stock: data.stock,
            description: data.description ?? "",
            showCareLog: data.showCareLog ?? true,
            status: LISTING_STATUS.PENDING,
            owner: requester.id           // always from the token, never from req.body
        })
        return loadPresented(listing._id, { withQuantity: true })
    } catch (err) {
        if (err.code === 11000) {
            throw new AppError("This inventory item already has an active listing", 409)
        }
        throw err
    }
}

export async function getOwnListings(query, requester) {
    const { filter, page, limit, errors, isValid } = parseListingListQuery(query)
    if (!isValid) throw new AppError("Invalid query", 400, errors)

    const { rows, pagination } = await paginate({ ...filter, owner: requester.id }, { page, limit })
    return { listings: rows.map((l) => presentListing(l, { withQuantity: true })), pagination }
}

// The farmer always sees their own care log, so they know exactly what buyers would see
export async function getOwnListing(id, requester) {
    const listing = await findOwnListingOrFail(id, requester)
    return loadPresented(listing._id, { withQuantity: true, withCareLog: true })
}

export async function updateListing(id, body, requester) {
    const listing = await findOwnListingOrFail(id, requester)

    if (listing.status === LISTING_STATUS.REJECTED) {
        throw new AppError("Rejected listings cannot be edited. Delete it and submit a new one.", 409)
    }

    const { data, errors, isValid } = validateListingInput(body, { partial: true })
    if (!isValid) throw new AppError("Validation failed", 400, errors)

    if (Object.keys(data).length === 0) {
        throw new AppError("Nothing to update", 400)
    }

    const inventory = await Inventory.findOne({ _id: listing.inventory, owner: requester.id })
    assertInventoryCanBackListing(inventory, data.stock ?? listing.stock)

    const needsReview = REVIEWED_FIELDS.some(
        (field) => field in data && data[field] !== listing[field]
    )

    listing.set(data)

    // Changing price, stock or description on an approved listing sends it back for another review
    if (needsReview && listing.status === LISTING_STATUS.APPROVED) {
        listing.status = LISTING_STATUS.PENDING
        clearReview(listing)
    }

    await listing.save()
    return loadPresented(listing._id, { withQuantity: true })
}

// After the admin returned it: the farmer fixed it and sends it back for review
export async function resubmitListing(id, requester) {
    const listing = await findOwnListingOrFail(id, requester)

    if (listing.status !== LISTING_STATUS.RETURNED) {
        throw new AppError("Only returned listings can be resubmitted", 409)
    }

    const inventory = await Inventory.findOne({ _id: listing.inventory, owner: requester.id })
    assertInventoryCanBackListing(inventory, listing.stock)

    listing.status = LISTING_STATUS.PENDING
    clearReview(listing)

    await listing.save()
    return loadPresented(listing._id, { withQuantity: true })
}

export async function deleteListing(id, rawReason, requester) {
    await archiveItem("Listing", id, rawReason, requester)
}

// ---------- Admin ----------

export async function getAllListings(query) {
    const { filter, page, limit, errors, isValid } = parseListingListQuery(query)
    if (!isValid) throw new AppError("Invalid query", 400, errors)

    const { rows, pagination } = await paginate(filter, { page, limit })
    const presented = rows.map((l) => presentListing(l, { withQuantity: true }))
    return { listings: await attachSellers(presented, { hideOwner: false }), pagination }
}

// Admins always see the care log, even if the farmer hid it from buyers, so they can check it during review
export async function getListingForAdmin(id) {
    assertValidId(id)
    if (!(await Listing.exists({ _id: id }))) throw new AppError("Listing not found", 404)

    const presented = await loadPresented(id, { withQuantity: true, withCareLog: true })
    const [withSeller] = await attachSellers([presented], { hideOwner: false })
    return withSeller
}

async function reviewListing(id, nextStatus, note, admin) {
    assertValidId(id)

    const listing = await Listing.findById(id)
    if (!listing) throw new AppError("Listing not found", 404)

    if (listing.status !== LISTING_STATUS.PENDING) {
        throw new AppError(`Only pending listings can be reviewed (this one is ${listing.status})`, 409)
    }

    // Never approve something the farmer can no longer deliver
    if (nextStatus === LISTING_STATUS.APPROVED) {
        const inventory = await Inventory.findOne({ _id: listing.inventory, owner: listing.owner })
        assertInventoryCanBackListing(inventory, listing.stock)
    }

    listing.status = nextStatus
    listing.reviewNote = note
    listing.reviewedBy = admin.id // from the token
    listing.reviewedAt = new Date()

    await listing.save()
    return loadPresented(listing._id, { withQuantity: true })
}

export async function approveListing(id, rawNote, admin) {
    const { note, error } = validateReviewNote(rawNote, { required: false })
    if (error) throw new AppError("Validation failed", 400, { note: error })
    return reviewListing(id, LISTING_STATUS.APPROVED, note, admin)
}

export async function rejectListing(id, rawNote, admin) {
    const { note, error } = validateReviewNote(rawNote, { required: true })
    if (error) throw new AppError("Validation failed", 400, { note: error })
    return reviewListing(id, LISTING_STATUS.REJECTED, note, admin)
}

export async function returnListing(id, rawNote, admin) {
    const { note, error } = validateReviewNote(rawNote, { required: true })
    if (error) throw new AppError("Validation failed", 400, { note: error })
    return reviewListing(id, LISTING_STATUS.RETURNED, note, admin)
}

// ---------- Buyer marketplace (approved listings only) ----------

// Approved listings whose inventory still exists and hasn't expired
const isSellable = (listing) => {
    const inv = listing.inventory
    return Boolean(inv && typeof inv === "object" && "quantity" in inv) && !isExpired(inv)
}

export async function getMarketplace(query) {
    const { filter, page, limit, errors, isValid } = parseListingListQuery(query)
    if (!isValid) throw new AppError("Invalid query", 400, errors)

    // The buyer can't ask for pending/rejected listings: status is forced here
    const { rows, pagination } = await paginate({ ...filter, status: LISTING_STATUS.APPROVED }, { page, limit })

    const presented = rows
        .filter(isSellable)
        .map((l) => {
            const { reviewNote, reviewedBy, reviewedAt, showCareLog, ...publicFields } = presentListing(l)
            // The list only says whether a care log exists. The full log loads on the detail page.
            return { ...publicFields, hasCareLog: Boolean(showCareLog && l.crop) }
        })

    return { listings: await attachSellers(presented, { hideOwner: true }), pagination }
}

export async function getMarketplaceListing(id) {
    assertValidId(id)

    // Same 404 for "doesn't exist" and "not approved", so buyers can't probe for pending listings
    const listing = await Listing.findOne({ _id: id, status: LISTING_STATUS.APPROVED })
        .populate(POPULATE_INVENTORY)
        .lean()
    if (!listing || !isSellable(listing)) throw new AppError("Listing not found", 404)

    // Built from the raw listing (it needs `owner`) BEFORE the owner id is stripped for the buyer
    const careLog = listing.showCareLog ? await buildCareLog(listing) : null

    const { reviewNote, reviewedBy, reviewedAt, showCareLog, ...publicFields } = presentListing(listing)
    const [withSeller] = await attachSellers([publicFields], { hideOwner: true })
    return { ...withSeller, hasCareLog: Boolean(careLog), careLog }
}
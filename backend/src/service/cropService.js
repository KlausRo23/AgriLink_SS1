import mongoose from "mongoose"
import Crop from "../model/Crop.js"
import Listing from "../model/Listing.js"
import Archive from "../model/Archive.js"
import History from "../model/History.js"
import Inventory from "../model/Inventory.js"
import AppError from "../utils/AppError.js"
import { validateCropInput, parseCropListQuery } from "../utils/cropValidator.js"
import { validateHarvestInput } from "../utils/inventoryValidator.js"
import {
    processCropPhoto,
    deleteCropPhoto,
    processInventoryPhoto,
    copyCropPhotoToInventory,
    deleteInventoryPhoto
} from "../utils/imageProcessor.js"
import { presentInventory } from "./inventoryService.js"
import { cropPresets, CROP_STATUS } from "../constant/cropPreset.js"
import { SOURCE_TYPES } from "../constant/inventory.js"
import { archiveItem } from "./archiveService.js"
import { createListing } from "./listingService.js"
import { ROLES } from "../constant/roles.js"

const DAY_MS = 86_400_000

const addDays = (date, days) => new Date(new Date(date).getTime() + days * DAY_MS)

function assertValidId(id) {
    if (typeof id !== "string" || !mongoose.isValidObjectId(id)) {
        throw new AppError("Invalid id", 400)
    }
}

// Owner-only. The query itself is scoped to the requester, so another farmer's crop is simply "not found".
async function findOwnCropOrFail(id, requester) {
    assertValidId(id)
    const crop = await Crop.findOne({ _id: id, owner: requester.id })
    if (!crop) throw new AppError("Crop not found", 404)
    return crop
}

// Adds the numbers the crop detail screen shows (age, harvest in, growth progress) and a full image URL
function presentCrop(crop) {
    const { image, __v, ...rest } = crop
    const asDateOnly = (value) => value ? new Date(value).toISOString().slice(0, 10) : null

    const datePlanted = asDateOnly(crop.datePlanted)
    const harvestDate = asDateOnly(crop.harvestDate)
    const planted = new Date(datePlanted).getTime()
    const harvest = new Date(harvestDate).getTime()
    const isGrowing = crop.status === CROP_STATUS.GROWING
    const endMs = isGrowing ? Date.now() : new Date(crop.actualHarvestDate ?? crop.harvestDate).getTime()

    const totalDays = Math.max(1, Math.round((harvest - planted) / DAY_MS))
    const ageDays = Math.max(0, Math.floor((endMs - planted) / DAY_MS))
    const daysToHarvest = isGrowing ? Math.max(0, Math.ceil((harvest - Date.now()) / DAY_MS)) : 0
    const growthProgress = isGrowing ? Math.min(100, Math.round((ageDays / totalDays) * 100)) : 100

    const base = (process.env.PUBLIC_BASE_URL || "").replace(/\/$/, "")
    return {
        ...rest,
        datePlanted,
        harvestDate,
        sellDate: asDateOnly(crop.sellDate),
        actualHarvestDate: asDateOnly(crop.actualHarvestDate),
        actualSellDate: asDateOnly(crop.actualSellDate),
        id: String(crop._id),
        imageUrl: image ? `${base}${image}` : null,
        ageDays,
        daysToHarvest,
        growthProgress,
        maturityDays: cropPresets[crop.name]?.daysToHarvest ?? null
    }
}

// Best effort: a failed history write must never break the real operation
async function recordHistory(action, owner, itemId, previousState, newState = null) {
    try {
        await History.create({ itemType: "Crop", itemId, action, previousState, newState, owner })
    } catch (err) {
        console.error("History write failed:", err.message)
    }
}

// ---------- Farmer (owner only) ----------

export async function createCrop(body, file, requester) {
    assertCanManageCrops(requester)
    const { data, errors, isValid } = validateCropInput(body, { partial: false })
    if (!isValid) throw new AppError("Validation failed", 400, errors)

    // Category and dates come from the preset, never from the client
    const preset = cropPresets[data.name]
    const shelfLifeDays = data.shelfLifeDays ?? preset.shelfLifeDays
    const harvestDate = data.harvestDate ?? addDays(data.datePlanted, preset.daysToHarvest)
    if (new Date(harvestDate) < new Date(data.datePlanted)) {
        throw new AppError("Validation failed", 400, { harvestDate: "harvestDate cannot be before datePlanted" })
    }
    const sellDate = addDays(harvestDate, shelfLifeDays)

    // The image is verified and processed only after the text fields pass
    let imagePath
    if (file) imagePath = await processCropPhoto(file.buffer)

    try {
        const crop = await Crop.create({
            ...data,
            category: preset.category,
            status: CROP_STATUS.GROWING,
            harvestDate,
            shelfLifeDays,
            sellDate,
            owner: requester.id, // always from the token, never from req.body
            ...(imagePath && { image: imagePath })
        })
        await recordHistory("added", requester.id, crop._id, null, crop.toObject())
        return presentCrop(crop.toObject())
    } catch (err) {
        await deleteCropPhoto(imagePath) // don't leave orphan files
        throw err
    }
}

export async function getAllCrops(query, requester) {
    assertCanManageCrops(requester)
    const { filter, page, limit, errors, isValid } = parseCropListQuery(query)
    if (!isValid) throw new AppError("Invalid query", 400, errors)

    const harvestedCrops = await Crop.find({
        owner: requester.id,
        status: CROP_STATUS.HARVESTED
    }).select("_id").lean()

    for (const crop of harvestedCrops) {
        try {
            await archiveItem("Crop", String(crop._id), "Harvested", requester)
        } catch (error) {
            if (error.statusCode !== 404) throw error
            const alreadyArchived = await Archive.exists({
                itemType: "Crop",
                originalId: crop._id,
                owner: requester.id
            })
            if (!alreadyArchived) throw error
        }
    }

    const scoped = { ...filter, owner: requester.id }

    const [crops, total] = await Promise.all([
        Crop.find(scoped).sort({ createdAt: -1 }).skip((page - 1) * limit).limit(limit).lean(),
        Crop.countDocuments(scoped)
    ])

    return {
        crops: crops.map(presentCrop),
        pagination: { page, limit, total, totalPages: Math.ceil(total / limit) }
    }
}

export async function getCropById(id, requester) {
    assertCanManageCrops(requester)
    const crop = await findOwnCropOrFail(id, requester)
    return presentCrop(crop.toObject())
}

export async function updateCrop(id, body, file, requester) {
    assertCanManageCrops(requester)
    const crop = await findOwnCropOrFail(id, requester)

    if (crop.status !== CROP_STATUS.GROWING) {
        throw new AppError("Only growing crops can be edited", 409)
    }

    const { data, errors, isValid } = validateCropInput(body, { partial: true })
    if (!isValid) throw new AppError("Validation failed", 400, errors)

    // The edit form may send the name back unchanged, which is fine. Changing it is not.
    if (data.name && data.name !== crop.name) {
        throw new AppError("Crop type cannot be changed. Archive it and add a new crop.", 400, {
            name: "cannot be changed"
        })
    }
    delete data.name

    const preset = cropPresets[crop.name]
    const effectivePlantingDate = data.datePlanted ?? crop.datePlanted
    const effectiveHarvestDate = data.harvestDate
        ?? (data.datePlanted ? addDays(data.datePlanted, preset.daysToHarvest) : crop.harvestDate)
    if (new Date(effectiveHarvestDate) < new Date(effectivePlantingDate)) {
        throw new AppError("Validation failed", 400, { harvestDate: "harvestDate cannot be before datePlanted" })
    }

    const removeImage = data.removeImage === true
    delete data.removeImage
    if (Object.keys(data).length === 0 && !file && !removeImage) {
        throw new AppError("Nothing to update", 400)
    }

    const previous = crop.toObject()
    // Dates follow the rules: harvest = planted + daysToHarvest, sell-by = harvest + shelf life
    if (data.datePlanted) {
        crop.datePlanted = data.datePlanted
    }
    if (data.harvestDate) crop.harvestDate = data.harvestDate
    if (data.datePlanted && !data.harvestDate) {
        crop.harvestDate = addDays(data.datePlanted, preset.daysToHarvest)
    }
    if (data.shelfLifeDays) crop.shelfLifeDays = data.shelfLifeDays
    if (data.datePlanted || data.harvestDate || data.shelfLifeDays) {
        crop.sellDate = addDays(crop.harvestDate, crop.shelfLifeDays)
    }

    for (const field of ["description", "seedlings", "isOrganic"]) {
        if (field in data) crop[field] = data[field]
    }
    for (const field of ["field", "isSpecialty"]) {
        if (field in data) crop[field] = data[field]
    }

    const oldImage = crop.image
    let newImage
    if (file) {
        newImage = await processCropPhoto(file.buffer)
        crop.image = newImage
    } else if (removeImage) {
        crop.image = null
    }

    try {
        await crop.save()
    } catch (err) {
        await deleteCropPhoto(newImage)
        throw err
    }

    if (newImage || removeImage) await deleteCropPhoto(oldImage)

    const updated = crop.toObject()
    await recordHistory("edited", requester.id, crop._id, previous, updated)
    return presentCrop(updated)
}

/**
 * Record a harvest: crop -> "harvested", and the yield goes into Inventory.
 * A direct listing is created from the new inventory row and is submitted for review.
 */
export async function harvestCrop(id, body, file, requester) {
    assertCanManageCrops(requester)
    const crop = await findOwnCropOrFail(id, requester)

    if (crop.status !== CROP_STATUS.GROWING) {
        throw new AppError("This crop has already been harvested", 409)
    }

    const { data, errors, isValid } = validateHarvestInput(body)
    if (!isValid) throw new AppError("Validation failed", 400, errors)

    // Harvesting before the estimated date needs an explicit confirmation from the farmer
    const now = new Date()
    const daysEarly = Math.ceil((new Date(crop.harvestDate).getTime() - now.getTime()) / DAY_MS)
    if (daysEarly > 0 && !data.confirmEarly) {
        throw new AppError(
            `This crop is estimated to be ready in ${daysEarly} day(s). Confirm to harvest early.`,
            409,
            { requiresConfirmation: true, daysEarly }
        )
    }

    // Sell-by follows the actual harvest date + shelf life (editable at harvest time)
    const shelfLifeDays = data.shelfLifeDays ?? crop.shelfLifeDays
    const expirationDate = addDays(now, shelfLifeDays)

    // The image is verified and processed before anything is changed
    let imagePath
    if (file) imagePath = await processInventoryPhoto(file.buffer)
    else if (crop.image) imagePath = await copyCropPhotoToInventory(crop.image)

    // Atomic flip: only one request can move this crop from "growing" to "harvested"
    const previous = await Crop.findOneAndUpdate(
        { _id: crop._id, owner: requester.id, status: CROP_STATUS.GROWING },
        {
            $set: {
                status: CROP_STATUS.HARVESTED,
                actualHarvestDate: now,
                shelfLifeDays,
                sellDate: expirationDate
            }
        },
        { new: false } // returns the document as it was, for rollback and history
    )

    if (!previous) {
        await deleteInventoryPhoto(imagePath)
        throw new AppError("This crop has already been harvested", 409)
    }

    let inventory
    let listing = null
    let updated
    try {
        inventory = await Inventory.create({
            name: crop.name,
            category: "crop",
            description: crop.description,
            notes: data.notes ?? "",
            quantity: data.quantity,
            unit: data.unit,
            dateReceived: now,
            harvestDate: now,
            expirationDate,
            sourceType: SOURCE_TYPES.HARVEST,
            owner: requester.id, // always from the token, never from req.body
            crop: crop._id,
            ...(imagePath && { image: imagePath })
        })
        if (data.directToListing) {
            listing = await createListing({
                inventoryId: String(inventory._id),
                price: data.listingPrice,
                stock: data.quantity,
                description: (data.notes || crop.description || `Fresh ${crop.name.toLowerCase()} from the farm.`).slice(0, 300)
            }, requester)
        }
        updated = await Crop.findById(crop._id).lean()
        if (!updated) throw new AppError("Harvested crop could not be found", 500)
        await archiveItem("Crop", id, "Harvested", requester)
    } catch (err) {
        try {
            if (inventory) {
                await Listing.deleteMany({ inventory: inventory._id, owner: requester.id })
                await Inventory.deleteOne({ _id: inventory._id, owner: requester.id })
            }
            await Crop.updateOne(
                { _id: crop._id, owner: requester.id },
                {
                    $set: {
                        status: CROP_STATUS.GROWING,
                        actualHarvestDate: null,
                        shelfLifeDays: previous.shelfLifeDays,
                        sellDate: previous.sellDate
                    }
                }
            )
            await deleteInventoryPhoto(imagePath)
        } catch (rollbackError) {
            console.error("Harvest rollback failed:", rollbackError)
            throw new AppError("Could not complete the harvest and its rollback was incomplete. Please contact support.", 500)
        }

        if (err.code === 11000) {
            throw new AppError("This crop has already been added to inventory", 409)
        }
        throw err
    }

    await recordHistory("harvested", requester.id, crop._id, previous.toObject(), {
        ...updated,
        quantity: data.quantity,
        unit: data.unit
    })

    return {
        crop: presentCrop(updated),
        inventory: presentInventory(inventory.toObject()),
        listing
    }
}

export async function archiveCrop(id, rawReason, requester) {
    assertCanManageCrops(requester)
    await archiveItem("Crop", id, rawReason, requester)
}

function assertCanManageCrops(requester) {
    if (![ROLES.USER, ROLES.FARMER].includes(requester.role)) {
        throw new AppError("Forbidden", 403)
    }
}
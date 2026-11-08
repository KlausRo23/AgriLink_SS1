import mongoose from "mongoose"
import Schedule from "../model/Schedule.js"
import Crop from "../model/Crop.js"
import AppError from "../utils/AppError.js"
import { parseDay, parseMonth, validateActivityInput } from "../utils/scheduleValidator.js"
import { processActivityPhoto, deleteActivityPhoto } from "../utils/imageProcessor.js"
import { ACTIVITY_ACTIONS } from "../constant/schedule.js"
import { CROP_STATUS } from "../constant/cropPreset.js"

const DAY_MS = 86_400_000

const dayKey = (date) => new Date(date).toISOString().slice(0, 10) // "YYYY-MM-DD"

const utcDay = (date) => {
    const d = new Date(date)
    return Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate())
}

// Planting day is "Day 1" (Oct 4 -> Nov 2 is Day 30)
const dayOfGrowing = (crop, date) => Math.floor((date.getTime() - utcDay(crop.datePlanted)) / DAY_MS) + 1

function assertValidId(id) {
    if (typeof id !== "string" || !mongoose.isValidObjectId(id)) {
        throw new AppError("Invalid id", 400)
    }
}

// Owner-only. The query itself is scoped to the requester, so another farmer's crop is simply "not found".
async function findOwnCropOrFail(id, requester) {
    assertValidId(id)
    const crop = await Crop.findOne({ _id: id, owner: requester.id })
        .select("name status datePlanted harvestDate actualHarvestDate")
        .lean()
    if (!crop) throw new AppError("Crop not found", 404)
    return crop
}

function parseDayOrFail(value) {
    const date = parseDay(value)
    if (!date) throw new AppError("Invalid date. Use YYYY-MM-DD", 400, { date: "must be a valid date (YYYY-MM-DD)" })
    return date
}

function assertNotBeforePlanted(date, crop) {
    if (dayOfGrowing(crop, date) < 1) {
        throw new AppError("That date is before this crop was planted", 400, { date: "cannot be before the planting date" })
    }
}

function assertNotFuture(date) {
    // +1 day tolerance so a farmer ahead of UTC (e.g. the Philippines) can log "today"
    if (date.getTime() > utcDay(Date.now()) + DAY_MS) {
        throw new AppError("You can't log activities for a future date", 400, { date: "cannot be in the future" })
    }
}

function assertCropIsGrowing(crop) {
    if (crop.status !== CROP_STATUS.GROWING) {
        throw new AppError("Activities can only be logged while the crop is growing", 409)
    }
}

function presentEntry(entry, crop) {
    const base = (process.env.PUBLIC_BASE_URL || "").replace(/\/$/, "")
    return {
        id: entry._id,
        date: dayKey(entry.date),
        dayOfGrowing: dayOfGrowing(crop, new Date(entry.date)),
        actions: entry.actions,
        note: entry.note,
        photoUrl: entry.photo ? `${base}${entry.photo}` : null,
        updatedAt: entry.updatedAt
    }
}

// A day with nothing logged yet. Lets the UI still show "Day 30 of growing".
function presentEmptyDay(date, crop) {
    return {
        id: null,
        date: dayKey(date),
        dayOfGrowing: dayOfGrowing(crop, date),
        actions: [],
        note: "",
        photoUrl: null,
        updatedAt: null
    }
}

// ---------- Farmer (owner only) ----------

// One month of the calendar: the logged days, the planted/harvest markers and a count per action
export async function getCalendar(cropId, rawMonth, requester) {
    const crop = await findOwnCropOrFail(cropId, requester)

    const month = parseMonth(rawMonth)
    if (!month) throw new AppError("Invalid month. Use YYYY-MM", 400, { month: "must look like 2026-11" })

    const entries = await Schedule.find({
        crop: crop._id,
        owner: requester.id,
        date: { $gte: month.start, $lt: month.end }
    }).sort({ date: 1 }).lean()

    const summary = Object.fromEntries(ACTIVITY_ACTIONS.map((a) => [a, 0]))
    for (const entry of entries) {
        for (const action of entry.actions) summary[action] += 1
    }

    // Planting and harvest come from the crop, not from logged entries
    const inMonth = (d) => d >= month.start && d < month.end
    const markers = []

    if (inMonth(new Date(crop.datePlanted))) {
        markers.push({ date: dayKey(crop.datePlanted), type: "planted" })
    }
    const harvestDay = crop.actualHarvestDate ?? crop.harvestDate
    if (inMonth(new Date(harvestDay))) {
        markers.push({ date: dayKey(harvestDay), type: "harvest", estimated: !crop.actualHarvestDate })
    }

    return {
        crop: {
            id: crop._id,
            name: crop.name,
            status: crop.status,
            datePlanted: dayKey(crop.datePlanted),
            harvestDate: dayKey(crop.harvestDate),
            actualHarvestDate: crop.actualHarvestDate ? dayKey(crop.actualHarvestDate) : null
        },
        month: month.label,
        entries: entries.map((e) => presentEntry(e, crop)),
        markers,
        summary
    }
}

// One day: the logged entry, or an empty shell if nothing was logged
export async function getDay(cropId, rawDate, requester) {
    const crop = await findOwnCropOrFail(cropId, requester)
    const date = parseDayOrFail(rawDate)
    assertNotBeforePlanted(date, crop)

    const entry = await Schedule.findOne({ crop: crop._id, owner: requester.id, date }).lean()
    return entry ? presentEntry(entry, crop) : presentEmptyDay(date, crop)
}

// Create or update the entry for a day. Only the fields that were sent change.
export async function saveDay(cropId, rawDate, body, file, requester) {
    const crop = await findOwnCropOrFail(cropId, requester)
    assertCropIsGrowing(crop)

    const date = parseDayOrFail(rawDate)
    assertNotBeforePlanted(date, crop)
    assertNotFuture(date)

    const { data, errors, isValid } = validateActivityInput(body)
    if (!isValid) throw new AppError("Validation failed", 400, errors)

    const existing = await Schedule.findOne({ crop: crop._id, owner: requester.id, date })

    const actions = data.actions ?? existing?.actions ?? []
    const note = data.note ?? existing?.note ?? ""
    const oldPhoto = existing?.photo ?? null

    // Decide the final state before touching any file
    const keepsPhoto = Boolean(file) || (Boolean(oldPhoto) && !data.removePhoto)
    if (actions.length === 0 && !note && !keepsPhoto) {
        throw new AppError(
            "Nothing to record. Pick an action, add a note or add a photo. Use delete to remove the day.",
            400
        )
    }

    // The image is verified and processed only after everything else passes
    let newPhoto
    if (file) newPhoto = await processActivityPhoto(file.buffer)
    const photo = file ? newPhoto : (data.removePhoto ? null : oldPhoto)

    let entry = existing
    try {
        if (entry) {
            entry.actions = actions
            entry.note = note
            entry.photo = photo
            await entry.save()
        } else {
            entry = await Schedule.create({
                crop: crop._id,
                owner: requester.id, // always from the token, never from req.body
                date,
                actions,
                note,
                photo
            })
        }
    } catch (err) {
        await deleteActivityPhoto(newPhoto) // don't leave orphan files
        if (err.code === 11000) throw new AppError("This day was just updated. Please try again.", 409)
        throw err
    }

    if (photo !== oldPhoto) await deleteActivityPhoto(oldPhoto) // remove the replaced or removed photo
    return presentEntry(entry.toObject(), crop)
}

export async function deleteDay(cropId, rawDate, requester) {
    const crop = await findOwnCropOrFail(cropId, requester)
    assertCropIsGrowing(crop)

    const date = parseDayOrFail(rawDate)

    const entry = await Schedule.findOneAndDelete({ crop: crop._id, owner: requester.id, date })
    if (!entry) throw new AppError("Nothing is logged on that day", 404)

    await deleteActivityPhoto(entry.photo)
}
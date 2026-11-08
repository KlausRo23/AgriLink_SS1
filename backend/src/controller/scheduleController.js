import * as scheduleService from "../service/scheduleService.js"

function handleError(res, err) {
    if (err.statusCode) {
        return res.status(err.statusCode).json({
            success: false,
            message: err.message,
            data: err.errors ?? null
        })
    }
    if (err.name === "ValidationError" || err.name === "CastError") {
        return res.status(400).json({ success: false, message: "Validation failed", data: null })
    }
    console.error("Schedule controller error:", err)
    return res.status(500).json({ success: false, message: "Internal server error", data: null })
}

export async function getCalendar(req, res) {
    try {
        const result = await scheduleService.getCalendar(req.params.id, req.query.month, req.user)
        return res.status(200).json({ success: true, message: "Calendar fetched", data: result })
    } catch (err) {
        return handleError(res, err)
    }
}

export async function getDay(req, res) {
    try {
        const result = await scheduleService.getDay(req.params.id, req.params.date, req.user)
        return res.status(200).json({ success: true, message: "Day fetched", data: result })
    } catch (err) {
        return handleError(res, err)
    }
}

export async function saveDay(req, res) {
    try {
        const result = await scheduleService.saveDay(req.params.id, req.params.date, req.body, req.file, req.user)
        return res.status(200).json({ success: true, message: "Activity saved", data: result })
    } catch (err) {
        return handleError(res, err)
    }
}

export async function deleteDay(req, res) {
    try {
        await scheduleService.deleteDay(req.params.id, req.params.date, req.user)
        return res.status(200).json({ success: true, message: "Activity removed", data: null })
    } catch (err) {
        return handleError(res, err)
    }
}
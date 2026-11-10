import * as historyService from "../service/historyService.js"

export async function getHistory(req, res) {
    try {
        const result = await historyService.getHistory(req.query, req.user)
        return res.status(200).json({ success: true, message: "History fetched", data: result })
    } catch (error) {
        if (error.statusCode) {
            return res.status(error.statusCode).json({
                success: false,
                message: error.message,
                data: error.errors ?? null
            })
        }
        console.error("History controller error:", error)
        return res.status(500).json({ success: false, message: "Could not load history", data: null })
    }
}

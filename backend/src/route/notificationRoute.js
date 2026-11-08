import express from "express"
import { verifyAccessToken } from "../middleware/auth"

const router = express.Router()

router.get("/",
    verifyAccessToken,
    getAllNotification
)

router.get("/:id",
    verifyAccessToken,
    getNotification
)

router.delete("/delete-notif/:id",
    verifyAccessToken,
    deleteNotification
)

export default Router
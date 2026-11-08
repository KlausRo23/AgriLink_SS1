import express from "express"
import { verifyAccessToken } from "../middleware/auth"
import isFarmer from "../middleware/isFarmer"

const router = express.Router()

router.get("/",
    verifyAccessToken,
    isFarmer,
    getReminder
)

router.post("/create-reminder",
    verifyAccessToken,
    isFarmer,
    setReminder
)

router.put("/edit-reminder/:id",
    verifyAccessToken,
    isFarmer,
    editReminder
)

router.delete("/delete-reminder/:id",
    verifyAccessToken,
    isFarmer,
    deleteReminder
)

export default Router
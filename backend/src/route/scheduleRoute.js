import express from "express"
import { verifyAccessToken } from "../middleware/auth.js"
import isFarmer from "../middleware/isFarmer.js"
import checkCropOwnership from "../middleware/checkCropOwnership.js"
import uploadCropPhoto from "../middleware/uploadCropPhoto.js"
import {
    getCalendar,
    getDay,
    saveDay,
    deleteDay
} from "../controller/scheduleController.js"

const router = express.Router()

// Owner-only. ":id" is the CROP id, so checkCropOwnership already proves the crop is yours.

// One month of the calendar (?month=2026-11). Leave it out for the current month.
router.get("/crop/:id/calendar",
    verifyAccessToken, 
    isFarmer, 
    checkCropOwnership, 
    getCalendar
)

// One day (the panel that opens when you tap a date)
router.get("/crop/:id/day/:date",
    verifyAccessToken, 
    isFarmer, 
    checkCropOwnership, 
    getDay
)

// Save a day: actions, note, image (all optional, send only what changed)
router.put("/crop/:id/day/:date",
    verifyAccessToken, 
    isFarmer, 
    checkCropOwnership, 
    uploadCropPhoto, 
    saveDay
)

router.delete("/crop/:id/day/:date",
    verifyAccessToken, 
    isFarmer, 
    checkCropOwnership, 
    deleteDay
)

export default router
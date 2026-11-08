import express from "express"
import { verifyAccessToken } from "../middleware/auth"
import isFarmer from "../middleware/isFarmer"
import checkCropOwnership from "../middleware/checkCropOwnership"

const router = express.Router()

router.get("/",
    verifyAccessToken,
    isFarmer,
    checkCropOwnership,
    getAllSchedule
)

router.get("/:id",
    verifyAccessToken,
    isFarmer,
    checkCropOwnership,
    getSchedule
)

router.post("/create-schedule",
    verifyAccessToken,
    checkCropOwnership,
    createActivity
)

router.put("/edit-schedule/:id",
    verifyAccessToken,
    isFarmer,
    checkCropOwnership,
    editSchedule
)

router.delete("/delete-schedule/:id",
    verifyAccessToken,
    isFarmer,
    checkCropOwnership,
    deleteSchedule
)

export default Router
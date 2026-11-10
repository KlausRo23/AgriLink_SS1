import express from "express"
import { verifyAccessToken } from "../middleware/auth.js"
import checkCropOwnership from "../middleware/checkCropOwnership.js"
import uploadCropPhoto from "../middleware/uploadCropPhoto.js"
import {
    getAllCrops,
    getCropDetail,
    createCrop,
    editCrop,
    harvestCrop,
    archiveCrop
} from "../controller/cropController.js"

const router = express.Router()

// Everything here is owner-only: a farmer can only ever see and change their own crops.

router.get("/",
    verifyAccessToken, getAllCrops)

router.get("/:id",
    verifyAccessToken, checkCropOwnership, getCropDetail)

router.post("/add-crop",
    verifyAccessToken, uploadCropPhoto, createCrop)

router.put("/edit-crop/:id",
    verifyAccessToken, checkCropOwnership, uploadCropPhoto, editCrop)

// Record Harvest: fields quantity, unit (required), notes, shelfLifeDays, confirmEarly, image (optional)
router.post("/harvest/:id",
    verifyAccessToken, checkCropOwnership, uploadCropPhoto, harvestCrop)

router.delete("/crop/:id",
    verifyAccessToken, checkCropOwnership, archiveCrop)

export default router
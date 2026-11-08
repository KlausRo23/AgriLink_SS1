import express from "express"
import { verifyAccessToken } from "../middleware/auth.js"
import isFarmer from "../middleware/isFarmer.js"
import checkCropOwnership from "../middleware/checkCropOwnership.js"
import uploadCropPhoto from "../middleware/uploadCropPhoto.js"
import {
    getAllCrops,
    getCropDetail,
    createCrop,
    editCrop,
    archiveCrop
} from "../controller/cropController.js"

const router = express.Router()

// Everything here is owner-only: a farmer can only ever see and change their own crops.

router.get("/",
    verifyAccessToken, isFarmer, getAllCrops)

router.get("/:id",
    verifyAccessToken, isFarmer, checkCropOwnership, getCropDetail)

router.post("/add-crop",
    verifyAccessToken, isFarmer, uploadCropPhoto, createCrop)

router.put("/edit-crop/:id",
    verifyAccessToken, isFarmer, checkCropOwnership, uploadCropPhoto, editCrop)

router.delete("/crop/:id",
    verifyAccessToken, isFarmer, checkCropOwnership, archiveCrop)

export default router
import express from "express"
import { verifyAccessToken } from "../middleware/auth.js"
import isFarmer from "../middleware/isFarmer.js"
import checkInventoryOwnership from "../middleware/checkInventoryOwnership.js"
import uploadCropPhoto from "../middleware/uploadCropPhoto.js"
import {
    getAllInventory,
    getInventoryDetail,
    createInventory,
    editInventory,
    deleteInventory
} from "../controller/inventoryController.js"

const router = express.Router()

// Owner-only: a farmer can only ever see and change their own inventory.
// Harvest-sourced rows are created by POST /api/crops/harvest/:id, not here.

router.get("/",
    verifyAccessToken, isFarmer, getAllInventory)

router.get("/:id",
    verifyAccessToken, isFarmer, checkInventoryOwnership, getInventoryDetail)

router.post("/create-inventory",
    verifyAccessToken, isFarmer, uploadCropPhoto, createInventory)

router.put("/edit-inventory/:id",
    verifyAccessToken, isFarmer, checkInventoryOwnership, uploadCropPhoto, editInventory)

router.delete("/delete-inventory/:id",
    verifyAccessToken, isFarmer, checkInventoryOwnership, deleteInventory)

export default router
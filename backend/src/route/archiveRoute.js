import express from "express"
import { verifyAccessToken } from "../middleware/auth.js"
import isFarmer from "../middleware/isFarmer.js"
import checkArchiveOwnership from "../middleware/checkArchiveOwnership.js"
import {
    getAllArchive,
    getArchiveDetail,
    createArchive,
    restoreArchive,
    deleteArchive
} from "../controller/archiveController.js"

const router = express.Router()

// Owner-only: a farmer can only ever see and change their own archive.
// (Crops, inventory and listings all belong to farmers. Loosen isFarmer when Message joins the archive.)

router.get("/all-archive",
    verifyAccessToken, isFarmer, getAllArchive)

router.get("/archive/:id",
    verifyAccessToken, isFarmer, checkArchiveOwnership, getArchiveDetail)

router.post("/create-archive",
    verifyAccessToken, isFarmer, createArchive)

router.put("/restore-archive/:id",
    verifyAccessToken, isFarmer, checkArchiveOwnership, restoreArchive)

router.delete("/delete-archive/:id",
    verifyAccessToken, isFarmer, checkArchiveOwnership, deleteArchive)

export default router
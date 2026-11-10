import express from "express"
import { verifyAccessToken } from "../middleware/auth.js"
import isFarmer from "../middleware/isFarmer.js"
import { getHistory } from "../controller/historyController.js"

const router = express.Router()

router.get("/", verifyAccessToken, isFarmer, getHistory)

export default router

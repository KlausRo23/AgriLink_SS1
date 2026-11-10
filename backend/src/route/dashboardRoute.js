import express from "express"
import { getDashboard } from "../controller/dashboardController.js"
import { verifyAccessToken } from "../middleware/auth.js"
import isFarmer from "../middleware/isFarmer.js"

const router = express.Router()

router.get("/", verifyAccessToken, isFarmer, getDashboard)

export default router

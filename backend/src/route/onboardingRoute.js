import express from "express"
import { getOnboardingStatus } from "../controller/onboardingController.js"
import { verifyAccessToken } from "../middleware/auth.js"

const router = express.Router()

router.get("/status", verifyAccessToken, getOnboardingStatus)

export default router

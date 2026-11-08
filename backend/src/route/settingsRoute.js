import express from "express"

import { getSettings, updateSettings, updateRegion } from "../controller/settingsController.js"
import { verifyAccessToken } from "../middleware/auth.js"

const router = express.Router()

// Every settings route is per-user, so authenticate the whole router once
router.use(verifyAccessToken)

router.get('/', getSettings)
router.patch('/', updateSettings)
router.patch('/region', updateRegion)

export default router
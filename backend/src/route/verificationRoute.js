import express from "express"
import { getOwnVerificationStatus, submitVerification } from "../controller/verificationController.js"
import { verifyAccessToken } from "../middleware/auth.js"
import uploadVerificationFiles from "../middleware/uploadVerificationFiles.js"

const router = express.Router()

router.get("/status/me", verifyAccessToken, getOwnVerificationStatus)
router.post(
    "/submit-verification",
    verifyAccessToken,
    uploadVerificationFiles,
    submitVerification
)

export default router

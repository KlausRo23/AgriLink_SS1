import express from "express"
import {
    approveVerification,
    getAllVerification,
    getFarmerVerification,
    getOwnVerificationStatus,
    getVerificationFile,
    rejectVerification,
    submitVerification
} from "../controller/verificationController.js"
import { verifyAccessToken } from "../middleware/auth.js"
import uploadVerificationFiles from "../middleware/uploadVerificationFiles.js"
import authorize from "../middleware/verifyRoles.js"
import { ADMIN_ROLES, ROLES } from "../constant/roles.js"

const router = express.Router()

router.put("/reject-verification/:id",
    verifyAccessToken,
    authorize(...ADMIN_ROLES),
    rejectVerification
)

router.put("/approve-verification/:id",
    verifyAccessToken,
    authorize(ROLES.SUPERADMIN),
    approveVerification
)

router.get("/verifications",
    verifyAccessToken,
    authorize(ROLES.SUPERADMIN),
    getAllVerification
)

router.get("/verification/:id",
    verifyAccessToken,
    authorize(ROLES.SUPERADMIN),
    getFarmerVerification
)

router.get("/verification/:id/files/:fileType",
    verifyAccessToken,
    authorize(ROLES.SUPERADMIN),
    getVerificationFile
)

router.get("/status/me",
    verifyAccessToken,
    getOwnVerificationStatus
)

router.post(
    "/submit-verification",
    verifyAccessToken,
    uploadVerificationFiles,
    submitVerification
)

export default router

import express from "express"
import { verifyAccessToken } from "../middleware/auth.js"
import authorize from "../middleware/verifyRoles.js"
import checkOwnership from "../middleware/checkOwnership.js"

const router = express.Router()

//SuperAdmin and Admin Route
router.get("/superadmin/verification/:id", 
    verifyAccessToken,
    authorize("superadmin"),
    getVerification
)

router.get("/superadmin/verification-list",
    verifyAccessToken,
    authorize("superadmin"),
    getAllVerificationList
)

router.patch("/superadmin/reject-verification/:id",
    verifyAccessToken,
    authorize("superadmin"),
    rejectVerification
)

router.patch("/superadmin/approve-verification/:id",
    verifyAccessToken,
    authorize("superadmin"),
    approveVerification
)
/* This will be returned after discussion
router.patch("/admin/return-verification/:id",
    verifyAccessToken,
    authorize("superadmin"),
    returnListing
)
*/

//Farmer and User Route
router.get("/verification/:id", 
    verifyAccessToken,
    checkOwnership,
    getVerification)

router.post("/submit-verification",
    verifyAccessToken,
    createProfile)

router.put("/edit-verification/:id", 
    verifyAccessToken,
    checkOwnership,
    editVerification)

router.delete("/delete/:id", deleteFarmer)

export default Router
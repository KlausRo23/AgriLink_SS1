import express from "express"
import { verifyAccessToken } from "../middleware/auth.js"
import authorize from "../middleware/verifyRoles.js"
import checkOwnership from "../middleware/checkOwnership.js"

const router = express.Router()

//SuperAdmin and Admin Route
router.get("/admin/listing-detail/:id", 
    verifyAccessToken,
    authorize("admin"),
    getListing
)

router.get("/admin/listings",
    verifyAccessToken,
    authorize("admin"),
    getAllListing
)

router.patch("/admin/reject-listing/:id",
    verifyAccessToken,
    authorize("admin"),
    rejectListing
)

router.patch("/admin/approve-listing/:id",
    verifyAccessToken,
    authorize("admin"),
    approveListing
)
/* This will be returned after discussion
router.patch("/admin/return-listing/:id",
    verifyAccessToken,
    authorize("admin"),
    returnListing
)
*/

//Farmer and User Route
router.get("/listing/:id", 
    verifyAccessToken,
    checkOwnership,
    getListing)

router.post("/submit-listing",
    verifyAccessToken,
    createListing)

router.put("/edit-listing/:id", 
    verifyAccessToken,
    checkOwnership,
    editListing)

router.delete("/delete-listing/:id", 
    verifyAccessToken,
    checkOwnership,
    deleteListing)

export default Router
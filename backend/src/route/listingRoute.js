import express from "express"
import { verifyAccessToken } from "../middleware/auth.js"
import authorize from "../middleware/verifyRoles.js"
import isFarmer from "../middleware/isFarmer.js"
//import checkListingOwnership from "../middleware/checkListingOwnership.js"
import { ROLES, ADMIN_ROLES } from "../constant/roles.js"
import {
    createListing,
    getMyListings,
    getMyListing,
    editListing,
    resubmitListing,
    deleteListing,
    getAllListing,
    getListing,
    approveListing,
    rejectListing,
    returnListing,
    getMarketplace,
    getMarketplaceListing
} from "../controller/listingController.js"

const router = express.Router()

//SuperAdmin and Admin Route
router.get("/admin/listings",
    verifyAccessToken, authorize(...ADMIN_ROLES), getAllListing)

router.get("/admin/listing-detail/:id",
    verifyAccessToken, authorize(...ADMIN_ROLES), getListing)

router.patch("/admin/approve-listing/:id",
    verifyAccessToken, authorize(...ADMIN_ROLES), approveListing)

router.patch("/admin/reject-listing/:id",
    verifyAccessToken, authorize(...ADMIN_ROLES), rejectListing)

router.patch("/admin/return-listing/:id",
    verifyAccessToken, authorize(...ADMIN_ROLES), returnListing)

//Buyer marketplace (approved listings only)
router.get("/marketplace",
    verifyAccessToken, authorize(ROLES.BUYER, ROLES.USER, ROLES.FARMER, ...ADMIN_ROLES), getMarketplace)

router.get("/marketplace/:id",
    verifyAccessToken, authorize(ROLES.BUYER, ROLES.USER, ROLES.FARMER, ...ADMIN_ROLES), getMarketplaceListing)

//Farmer Route (owner only)
router.get("/my-listings",
    verifyAccessToken, isFarmer, getMyListings)

router.get("/listing/:id",
    verifyAccessToken, isFarmer, /*checkListingOwnership,*/ getMyListing)

router.post("/submit-listing",
    verifyAccessToken, isFarmer, createListing)

router.put("/edit-listing/:id",
    verifyAccessToken, isFarmer, /*checkListingOwnership,*/ editListing)

router.patch("/resubmit-listing/:id",
    verifyAccessToken, isFarmer, /*checkListingOwnership,*/ resubmitListing)

router.delete("/delete-listing/:id",
    verifyAccessToken, isFarmer, /*checkListingOwnership,*/ deleteListing)

export default router
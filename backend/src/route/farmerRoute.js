import express from "express"
import { verifyAccessToken } from "../middleware/auth.js"
import authorize from "../middleware/verifyRoles.js"
import checkOwnership from "../middleware/checkOwnership.js"
import uploadProfileImage from "../middleware/uploadProfile.js"
import { ROLES, ADMIN_ROLES } from "../constant/roles.js"
import {
    createProfile,
    getOwnProfile,
    getMyProfile,
    editProfile,
    deleteFarmer,
    getFarmerProfile,
    getAllFarmerList,
    updateVerification,
    getPublicProfile
} from "../controller/farmerController.js"

const router = express.Router()

// SuperAdmin and Admin
router.get("/farmer-list",
    verifyAccessToken, 
    authorize(...ADMIN_ROLES), 
    getAllFarmerList)

router.get("/admin/:id",
    verifyAccessToken, 
    authorize(...ADMIN_ROLES), 
    getFarmerProfile)

router.patch("/admin/:id/verification",
    verifyAccessToken, 
    authorize(...ADMIN_ROLES), 
    updateVerification)

// Buyer viewing a farmer (token issued by SS1, sent by the SS3 frontend)
router.get("/public/:id",
    verifyAccessToken, 
    authorize(ROLES.BUYER, ...ADMIN_ROLES), 
    getPublicProfile)

// Farmer / user (owner)
// "/profile/me" must stay ABOVE "/profile/:id", or "me" is treated as an id
router.get("/profile/me",
    verifyAccessToken, 
    getOwnProfile)

router.get("/profile/:id",
    verifyAccessToken, 
    checkOwnership, 
    getMyProfile)

router.post("/profile",
    verifyAccessToken, 
    uploadProfileImage, 
    createProfile)

router.put("/edit-profile/:id",
    verifyAccessToken, 
    checkOwnership, 
    uploadProfileImage, 
    editProfile)

router.delete("/delete/:id",
    verifyAccessToken, 
    checkOwnership, 
    deleteFarmer)

export default router
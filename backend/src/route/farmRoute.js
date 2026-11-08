import express from "express"
import { verifyAccessToken } from "../middleware/auth.js"
import authorize from "../middleware/verifyRoles.js"
import checkFarmOwnership from "../middleware/checkFarmOwnership.js"
import uploadFarmPhoto from "../middleware/uploadFarmPhoto.js"
import { ROLES, ADMIN_ROLES } from "../constant/roles.js"
import {
    createFarmProfile,
    getOwnFarm,
    getMyFarmProfile,
    editFarmProfile,
    deleteFarm,
    getFarmProfile,
    getAllFarmList,
    updateFarmVerification,
    getPublicFarm
} from "../controller/farmController.js"

const router = express.Router()

//SuperAdmin and Admin Route
router.get("/admin/farm-list",
    verifyAccessToken, authorize(...ADMIN_ROLES), getAllFarmList)

router.get("/admin/farm/:id",
    verifyAccessToken, authorize(...ADMIN_ROLES), getFarmProfile)

router.patch("/admin/farm/:id/verification",
    verifyAccessToken, authorize(...ADMIN_ROLES), updateFarmVerification)

// Buyer viewing a farm (token issued by SS1, sent by the SS3 frontend)
router.get("/public/:id",
    verifyAccessToken, authorize(ROLES.BUYER, ...ADMIN_ROLES), getPublicFarm)

//Farmer and User Route
// "/profile/me" must stay ABOVE "/profile/:id", or "me" is treated as an id
router.get("/profile/me",
    verifyAccessToken, getOwnFarm)

router.get("/profile/:id",
    verifyAccessToken, checkFarmOwnership, getMyFarmProfile)

router.post("/farm",
    verifyAccessToken, uploadFarmPhoto, createFarmProfile)

router.put("/edit-farm/:id",
    verifyAccessToken, checkFarmOwnership, uploadFarmPhoto, editFarmProfile)

router.delete("/delete/:id",
    verifyAccessToken, checkFarmOwnership, deleteFarm)

export default router
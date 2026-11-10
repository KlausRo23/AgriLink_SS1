import express from "express"
import { verifyAccessToken } from "../middleware/auth.js"
import authorize from "../middleware/verifyRoles.js"
import { ADMIN_ROLES, ROLES } from "../constant/roles.js"
import {
    createOrderRequest,
    getConversations,
    respondToRequest,
    sendMessage,
    updateArchive,
    updateOrderStatus
} from "../controller/inboxController.js"

const router = express.Router()
const inboxRoles = [ROLES.FARMER, ROLES.BUYER, ROLES.USER, ...ADMIN_ROLES]

router.use(verifyAccessToken, authorize(...inboxRoles))
router.get("/", getConversations)
router.post("/order-requests", createOrderRequest)
router.patch("/:id/request", respondToRequest)
router.patch("/:id/order-status", updateOrderStatus)
router.post("/:id/messages", sendMessage)
router.patch("/:id/archive", updateArchive)

export default router

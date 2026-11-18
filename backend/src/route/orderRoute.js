import express from "express"
import { verifyAccessToken } from "../middleware/auth.js"
import authorize from "../middleware/verifyRoles.js"
import { ADMIN_ROLES, ROLES } from "../constant/roles.js"
import {
  getOrder,
  getAllOrders,
  createOrder,
  updateOrder,
} from "../controller/orderController.js"

const router = express.Router()
const orderRoles = [ROLES.FARMER, ROLES.BUYER, ROLES.USER, ...ADMIN_ROLES]

router.use(verifyAccessToken, authorize(...orderRoles))
router.get("/all-orders", getAllOrders)
router.get("/:id", getOrder)

router.post("/checkout", createOrder)

router.put("/:id/cancel", updateOrder)

export default router
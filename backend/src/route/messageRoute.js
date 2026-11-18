import express from "express"
import { verifyAccessToken } from "../middleware/auth.js"
import authorize from "../middleware/verifyRoles.js"
import { ROLES } from "../constant/roles.js"
import {
    createMessage,
    deleteMessage,
    editMessage,
    getMessages
} from "../controller/messageController.js"

const router = express.Router()
router.use(verifyAccessToken, authorize(ROLES.FARMER, ROLES.BUYER, ROLES.USER))

router.get("/", getMessages)
router.post("/", createMessage)
router.patch("/:id", editMessage)
router.delete("/:id", deleteMessage)

export default router
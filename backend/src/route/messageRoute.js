import express from "express"
import { verifyAccessToken } from "../middleware/auth"

const router = express.Router()

router.get("/",
    verifyAccessToken,
    getMessages
)

router.post("/create-message",
    verifyAccessToken,
    createMessage
)

router.put("/edit-message/:id",
    verifyAccessToken,
    editMessage
)

router.delete("/delete-message",
    verifyAccessToken,
    deleteMessage
)

export default Router
import express from "express"
import { verifyAccessToken } from "../middleware/auth"

const router = express.Router()

router.get("/",
    verifyAccessToken,
    getAllLogs
)

export default Router
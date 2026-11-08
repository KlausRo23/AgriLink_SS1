import express from "express"
import { verifyAccessToken } from "../middleware/auth"
import checkOwnership from "../middleware/checkOwnership"

const router = express.Router()

router.get("/all-archive",
    verifyAccessToken,
    getAllArchive
)

router.get("/archive/:id",
    verifyAccessToken,
    getArchiveDetail
)

router.post("/create-archive",
    verifyAccessToken,
    createArchive
)

router.put("/restore-archive",
    verifyAccessToken,
    restoreArchive
)

router.delete("/delete-archive/:id",
    verifyAccessToken,
    deleteArchive
)

export default Router
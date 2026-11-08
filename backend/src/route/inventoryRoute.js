import express from "express"
import { verifyAccessToken } from "../middleware/auth"
import isFarmer from "../middleware/isFarmer"

const router = express.Router()

router.get("/",
    verifyAccessToken,
    isFarmer,
    getAllInventory
)

router.get("/:id",
    verifyAccessToken,
    isFarmer,
    getInventoryDetail.jsx
)

router.post("/create-inventory",
    verifyAccessToken,
    isFarmer,
    createInventory
)

router.put("/edit-inventory/:id",
    verifyAccessToken,
    isFarmer,
    editInventory
)

router.delete("/delete-inventory/:id",
    verifyAccessToken,
    isFarmer,
    deleteInventory
)

export default Router
import express from "express"
import dotenv from "dotenv"
import helmet from "helmet"
import cors from "cors"
import cookieparser from "cookie-parser"

//import { UPLOADS_ROOT } from "./utils/imageStorage.js"

import conDB from "./config/db.js"
import authRoutes from "./route/authRoute.js"
/*
import settingsRoutes from "./routes/settingsRoute.js"
import inventoryRoute from "./routes/inventoryRoute.js"
import cropRoute from "./routes/cropRoute.js"
import historyRoutes from "./routes/historyRoute.js"
import logsRoute from "./routes/logRoute.js"
*/
import { globalLimit } from "./middleware/rateLimit.js"
//import archiveRoute from "./routes/archiveRoute.js"


dotenv.config()

const app = express()
const PORT = process.env.PORT || 5000

// FIX 1: helmet's default Cross-Origin-Resource-Policy is "same-origin", which
// blocks images served from :5000 from loading on the :5173 frontend.
app.use(helmet({ crossOriginResourcePolicy: { policy: "cross-origin" } }))

app.use(cors({
    origin: "http://localhost:5173",
    credentials: true
}))

app.set("trust proxy", 1);
// FIX 2: serve uploads before the rate limiter so every image request in a
// crop grid doesn't count against the API limit (and trigger 429s).

app.use(express.json())

app.use(cookieparser())

app.use(globalLimit)


app.use("/api/auth", authRoutes)
/*
app.use("/api/inventory", inventoryRoute)
app.use("/api/crops", cropRoute)
app.use("/api/history", historyRoutes)
app.use("/api/logs", logsRoute)
app.use("/api/settings", settingsRoutes)
app.use("/api/archive", archiveRoute)
*/
conDB().then(app.listen(PORT,  "0.0.0.0", () => {
    console.log("Connected to Port: ", PORT)
}))
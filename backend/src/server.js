import express from "express"
import dotenv from "dotenv"
import helmet from "helmet"
import cors from "cors"
import cookieparser from "cookie-parser"
import path from "node:path"

//import { UPLOADS_ROOT } from "./utils/imageStorage.js"

import conDB from "./config/db.js"
// import authRoutes from "./route/authRoute.js"
import listingRoute from "./route/listingRoute.js"
import farmerRoute from "./route/farmerRoute.js"
import farmRoute from "./route/farmRoute.js"
import verificationRoute from "./route/verificationRoute.js"
import onboardingRoute from "./route/onboardingRoute.js"
import cropRoute from "./route/cropRoute.js"
import archiveRoute from "./route/archiveRoute.js"
import inventoryRoute from "./route/inventoryRoute.js"
import scheduleRoute from "./route/scheduleRoute.js"
import settingsRoute from "./route/settingsRoute.js"
import dashboardRoute from "./route/dashboardRoute.js"
import inboxRoute from "./route/inboxRoute.js"
import historyRoute from "./route/historyRoute.js"
import { globalLimit } from "./middleware/rateLimit.js"

dotenv.config()

const app = express()
const PORT = process.env.PORT || 5000
const UPLOADS_ROOT = path.join(process.cwd(), "uploads")

// FIX 1: helmet's default Cross-Origin-Resource-Policy is "same-origin", which
// blocks images served from :5000 from loading on the :5173 frontend.
app.use(helmet({ crossOriginResourcePolicy: { policy: "cross-origin" } }))

const allowedOrigins = new Set(
    (process.env.CLIENT_URL || "http://localhost:5173,http://127.0.0.1:5173")
        .split(",")
        .map((origin) => origin.trim())
        .filter(Boolean)
)

app.use(cors({
  origin: ["http://localhost:5173", "http://localhost:5174"],
  credentials: true,
  methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization"],
}));

app.set("trust proxy", 1);

app.use("/uploads/crops", express.static(path.join(UPLOADS_ROOT, "crops"), {
    maxAge: "7d",
    immutable: true
}))
app.use("/uploads/inventory", express.static(path.join(UPLOADS_ROOT, "inventory"), {
    maxAge: "7d",
    immutable: true
}))
app.use("/uploads/farmers", express.static(path.join(UPLOADS_ROOT, "farmers"), {
    maxAge: "7d",
    immutable: true
}))
app.use("/uploads/farms", express.static(path.join(UPLOADS_ROOT, "farms"), {
    maxAge: "7d",
    immutable: true
}))
app.use("/uploads/activities", express.static(path.join(UPLOADS_ROOT, "activities"), {
    maxAge: "7d",
    immutable: true
}))

app.use(express.json())

app.use(cookieparser())

app.use(globalLimit)


// app.use("/api/auth", authRoutes) // Authentication is handled by the external auth server.
app.use("/api/farmers", farmerRoute)
app.use("/api/farms", farmRoute)
app.use("/api/verification", verificationRoute)
app.use("/api/onboarding", onboardingRoute)
app.use("/api/crops", cropRoute)
app.use("/api/archive", archiveRoute)
app.use("/api/inventory", inventoryRoute)
app.use("/api/schedule", scheduleRoute)
app.use("/api/settings", settingsRoute)
app.use("/api/dashboard", dashboardRoute)
app.use("/api/inbox", inboxRoute)
app.use("/api/history", historyRoute)
app.use("/api/", listingRoute)

conDB()
    .then(() => {
        app.listen(PORT, "0.0.0.0", () => {
            console.log("Connected to Port: ", PORT)
        })
    })
    .catch((error) => {
        console.error("Could not connect to the database", error)
        process.exitCode = 1
    })
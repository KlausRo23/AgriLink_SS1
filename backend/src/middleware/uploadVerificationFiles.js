import multer from "multer"
import AppError from "../utils/AppError.js"

const IMAGE_TYPES = ["image/jpeg", "image/png", "image/webp"]

const upload = multer({
    storage: multer.memoryStorage(),
    limits: {
        fileSize: 5 * 1024 * 1024,
        files: 2,
        fields: 10,
        fieldSize: 10 * 1024
    },
    fileFilter: (req, file, cb) => {
        const validImage = IMAGE_TYPES.includes(file.mimetype)
        const validDocument = validImage || file.mimetype === "application/pdf"
        const validType = file.fieldname === "facePhoto"
            ? validImage
            : file.fieldname === "supportingDocuments" && validDocument
        if (!validType) {
            return cb(new AppError("Use JPEG, PNG or WebP images and a JPEG, PNG, WebP or PDF document", 400))
        }
        return cb(null, true)
    }
}).fields([
    { name: "supportingDocuments", maxCount: 1 },
    { name: "facePhoto", maxCount: 1 }
])

export default function uploadVerificationFiles(req, res, next) {
    upload(req, res, (error) => {
        if (!error) return next()

        if (error instanceof multer.MulterError) {
            const message = error.code === "LIMIT_FILE_SIZE"
                ? "Each verification file must be 5MB or smaller"
                : "Invalid verification file upload"
            return res.status(400).json({ success: false, message, data: null })
        }

        return res.status(error.statusCode || 400).json({
            success: false,
            message: error.statusCode ? error.message : "Invalid verification file upload",
            data: null
        })
    })
}

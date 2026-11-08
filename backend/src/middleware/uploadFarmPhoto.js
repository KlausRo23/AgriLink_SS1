import multer from "multer"
import AppError from "../utils/AppError.js"

const ALLOWED_MIME = ["image/jpeg", "image/png", "image/webp"]

const upload = multer({
    storage: multer.memoryStorage(), // nothing touches disk until the image is verified
    limits: {
        fileSize: 3 * 1024 * 1024, // 3MB
        files: 1,
        fields: 20,
        fieldSize: 10 * 1024 // 10KB per text field
    },
    // Client-controlled, so this only filters obvious junk. The real check is the decode in imageProcessor.
    fileFilter: (req, file, cb) => {
        if (!ALLOWED_MIME.includes(file.mimetype)) {
            return cb(new AppError("Only JPEG, PNG or WebP images are allowed", 400))
        }
        return cb(null, true)
    }
}).single("farmPhoto") // form-data field name the frontend must use

const MULTER_MESSAGES = {
    LIMIT_FILE_SIZE: "Image must be 3MB or smaller",
    LIMIT_FILE_COUNT: "Only one image is allowed",
    LIMIT_UNEXPECTED_FILE: 'Image must be sent in the "farmPhoto" field'
}

export default function uploadFarmPhoto(req, res, next) {
    upload(req, res, (err) => {
        if (!err) return next()

        if (err instanceof multer.MulterError) {
            const message = MULTER_MESSAGES[err.code] ?? "Invalid upload"
            return res.status(400).json({ success: false, message, data: null })
        }

        return res.status(err.statusCode || 400).json({
            success: false,
            message: err.statusCode ? err.message : "Invalid upload",
            data: null
        })
    })
}
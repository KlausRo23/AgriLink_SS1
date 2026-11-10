import crypto from "crypto"
import fs from "fs/promises"
import path from "path"
import sharp from "sharp"
import AppError from "./AppError.js"

const UPLOAD_ROOT = path.join(process.cwd(), "uploads", "verification")
const IMAGE_TYPES = ["image/jpeg", "image/png", "image/webp"]

export async function storeVerificationFile(file, { allowPdf = false } = {}) {
    if (!file?.buffer?.length) throw new AppError("Uploaded file is empty", 400)

    let bytes
    let extension
    if (allowPdf && file.mimetype === "application/pdf") {
        if (file.buffer.subarray(0, 5).toString("ascii") !== "%PDF-") {
            throw new AppError("Supporting document is not a valid PDF", 400)
        }
        bytes = file.buffer
        extension = "pdf"
    } else {
        if (!IMAGE_TYPES.includes(file.mimetype)) {
            throw new AppError("Only JPEG, PNG or WebP images are allowed", 400)
        }

        try {
            bytes = await sharp(file.buffer, { failOn: "error", limitInputPixels: 24_000_000 })
                .rotate()
                .webp({ quality: 82 })
                .toBuffer()
        } catch {
            throw new AppError("Uploaded file is not a valid image", 400)
        }
        extension = "webp"
    }

    await fs.mkdir(UPLOAD_ROOT, { recursive: true })
    const filename = `${crypto.randomBytes(16).toString("hex")}.${extension}`
    await fs.writeFile(path.join(UPLOAD_ROOT, filename), bytes, { flag: "wx" })
    return `/uploads/verification/${filename}`
}

export async function deleteVerificationFile(relativePath) {
    if (!relativePath) return
    const filename = path.basename(relativePath)
    try {
        await fs.unlink(path.join(UPLOAD_ROOT, filename))
    } catch (error) {
        if (error.code !== "ENOENT") throw error
    }
}

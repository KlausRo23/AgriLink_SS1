import sharp from "sharp"
import crypto from "crypto"
import fs from "fs/promises"
import path from "path"
import AppError from "./AppError.js"

const UPLOAD_ROOT = path.join(process.cwd(), "uploads")
const ALLOWED_FORMATS = ["jpeg", "png", "webp"]
const MAX_INPUT_PIXELS = 24_000_000 // blocks decompression bombs

/**
 * Verifies the buffer is a REAL image (sharp decodes the actual bytes, so a renamed
 * .exe/.php/.svg fails), then re-encodes it. Re-encoding strips EXIF (including GPS)
 * and any payload hidden in the file. Returns the relative path to save in the DB.
 */
async function processImage(buffer, { folder, width, height, minSize }) {
    if (!Buffer.isBuffer(buffer) || buffer.length === 0) {
        throw new AppError("Uploaded file is empty", 400)
    }

    let meta
    try {
        meta = await sharp(buffer, { limitInputPixels: MAX_INPUT_PIXELS, failOn: "error" }).metadata()
    } catch {
        throw new AppError("Uploaded file is not a valid image", 400)
    }

    if (!ALLOWED_FORMATS.includes(meta.format)) {
        throw new AppError("Only JPEG, PNG or WebP images are allowed", 400)
    }
    if (!meta.width || !meta.height || meta.width < minSize || meta.height < minSize) {
        throw new AppError(`Image must be at least ${minSize}x${minSize}px`, 400)
    }

    let output
    try {
        output = await sharp(buffer, { limitInputPixels: MAX_INPUT_PIXELS })
            .rotate() // apply EXIF orientation before the metadata is dropped
            .resize(width, height, { fit: "cover" })
            .webp({ quality: 80 })
            .toBuffer()
    } catch {
        throw new AppError("Could not process the image", 400)
    }

    const dir = path.join(UPLOAD_ROOT, folder)
    await fs.mkdir(dir, { recursive: true })
    const filename = `${crypto.randomBytes(16).toString("hex")}.webp` // never trust the user's filename
    await fs.writeFile(path.join(dir, filename), output)

    return `/uploads/${folder}/${filename}`
}

async function deleteImage(relativePath, folder) {
    if (!relativePath) return
    const filename = path.basename(relativePath) // blocks path traversal like ../../x
    try {
        await fs.unlink(path.join(UPLOAD_ROOT, folder, filename))
    } catch {
        // already gone, ignore
    }
}

export const processProfileImage = (buffer) =>
    processImage(buffer, { folder: "farmers", width: 512, height: 512, minSize: 100 })

export const processFarmPhoto = (buffer) =>
    processImage(buffer, { folder: "farms", width: 1200, height: 800, minSize: 300 })

export const deleteProfileImage = (relativePath) => deleteImage(relativePath, "farmers")
export const deleteFarmPhoto = (relativePath) => deleteImage(relativePath, "farms")


export const processCropPhoto = (buffer) =>
    processImage(buffer, { folder: "crops", width: 1200, height: 800, minSize: 300 })

export const deleteCropPhoto = (relativePath) => deleteImage(relativePath, "crops")
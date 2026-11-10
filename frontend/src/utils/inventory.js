import { getAssetUrl } from "../api/api"

const NEAR_EXPIRY_DAYS = 7

export function normalizeInventoryItem(item) {
  const daysToExpire = item.daysToExpire
  const status = item.status || (
    item.isExpired
      ? "spoiled"
      : daysToExpire !== null && daysToExpire <= NEAR_EXPIRY_DAYS
        ? "near-spoiling"
        : "fresh"
  )

  return {
    ...item,
    id: String(item.id || item._id),
    image: item.imageUrl ? getAssetUrl(item.imageUrl) : "",
    emoji: item.icon || (item.category === "supply" ? "📦" : "🥬"),
    visual: item.category === "supply" ? "supply" : "leafy",
    harvestDate: item.harvestDate || item.dateReceived || "",
    status,
  }
}

export function toInventoryFormData(item, imageFile, removeImage = false) {
  const formData = new FormData()
  for (const field of ["name", "category", "quantity", "unit", "description", "notes", "icon"]) {
    if (item[field] !== undefined && item[field] !== null) {
      formData.set(field, String(item[field]))
    }
  }
  if (item.harvestDate) formData.set("dateReceived", item.harvestDate)
  if (item.expirationDate !== undefined) formData.set("expirationDate", item.expirationDate)
  if (removeImage) formData.set("removeImage", "true")
  if (imageFile) formData.set("image", imageFile)
  return formData
}

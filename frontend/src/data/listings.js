import { getAssetUrl } from "../api/api"

function getSellerName(seller) {
  if (typeof seller === "string") return seller
  if (!seller || typeof seller !== "object") return "Your farm"
  return [seller.firstName, seller.lastName, seller.suffix]
    .filter((part) => typeof part === "string" && part.trim())
    .map((part) => part.trim())
    .join(" ") || seller.farmName || "Your farm"
}

function getDateOnly(value) {
  if (!value) return ""
  const parsedDate = new Date(value)
  return Number.isNaN(parsedDate.getTime()) ? "" : parsedDate.toISOString().slice(0, 10)
}

export function normalizeListing(listing) {
  const date = listing.createdAt || listing.listedDate
  return {
    ...listing,
    id: String(listing._id || listing.id),
    name: listing.name || "Untitled listing",
    description: listing.description || "",
    details: listing.description || "",
    seller: getSellerName(listing.seller),
    region: listing.seller?.location || listing.seller?.region || "",
    price: Number(listing.price) || 0,
    stock: Number(listing.stock) || 0,
    listedDate: getDateOnly(date),
    imageUrl: listing.imageUrl ? getAssetUrl(listing.imageUrl) : "",
    emoji: listing.icon || "🥬",
    visual: "leafy",
    harvestDate: getDateOnly(listing.harvestDate),
  }
}

export const INVENTORY_STORAGE_KEY = "agrilink-inventory-preview-v1"

export const INITIAL_INVENTORY = [
  { id: "inventory-1", name: "Lettuce", category: "crop", quantity: 8, unit: "kg", harvestDate: "2026-09-14", status: "fresh", emoji: "🥬", visual: "leafy" },
  { id: "inventory-2", name: "Lettuce", category: "crop", quantity: 8, unit: "kg", harvestDate: "2026-09-14", status: "fresh", emoji: "🥬", visual: "leafy" },
  { id: "inventory-3", name: "Lettuce", category: "crop", quantity: 8, unit: "kg", harvestDate: "2026-09-14", status: "near-spoiling", emoji: "🥬", visual: "leafy" },
  { id: "inventory-4", name: "Lettuce", category: "crop", quantity: 8, unit: "kg", harvestDate: "2026-09-14", status: "spoiled", emoji: "🥬", visual: "leafy" },
  { id: "inventory-5", name: "Tomatoes", category: "crop", quantity: 12, unit: "kg", harvestDate: "2026-09-16", status: "fresh", emoji: "🍅", visual: "tomato" },
  { id: "inventory-6", name: "Onions", category: "crop", quantity: 16, unit: "kg", harvestDate: "2026-09-12", status: "near-spoiling", emoji: "🧅", visual: "onion" },
  { id: "inventory-7", name: "Corn", category: "crop", quantity: 24, unit: "pieces", harvestDate: "2026-09-17", status: "fresh", emoji: "🌽", visual: "corn" },
  { id: "inventory-8", name: "Carrots", category: "crop", quantity: 10, unit: "kg", harvestDate: "2026-09-15", status: "spoiled", emoji: "🥕", visual: "carrot" },
  { id: "inventory-9", name: "Organic fertilizer", category: "supply", quantity: 3, unit: "sack", harvestDate: "2026-09-08", status: "fresh", emoji: "🌱", visual: "supply" },
  { id: "inventory-10", name: "Seedling trays", category: "supply", quantity: 12, unit: "pieces", harvestDate: "2026-09-05", status: "fresh", emoji: "🪴", visual: "supply" },
]

export function loadInventoryPreview() {
  try {
    const savedInventory = window.localStorage.getItem(INVENTORY_STORAGE_KEY)
    if (!savedInventory) return INITIAL_INVENTORY
    const parsedInventory = JSON.parse(savedInventory)
    if (!Array.isArray(parsedInventory)) throw new Error("Saved inventory preview data is invalid.")
    return parsedInventory
  } catch (error) {
    console.error("Could not load saved inventory preview data:", error)
    return INITIAL_INVENTORY
  }
}

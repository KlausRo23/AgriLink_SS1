import { getDateOffsetFromToday } from "../utils/cropLifecycle"

export const SAVED_CROPS_KEY = "agrilink-crops-preview"

export const INITIAL_CROPS = [
  {
    id: "crop-1",
    name: "Cabbage",
    category: "Vegetable",
    status: "growing",
    datePlanted: getDateOffsetFromToday(-65),
    harvestDate: getDateOffsetFromToday(-3),
    sellDate: getDateOffsetFromToday(-1),
    quantity: 120,
    description: "Harvest date has passed. Prioritize this crop for harvest.",
  },
  {
    id: "crop-2",
    name: "Carrots",
    category: "Vegetable",
    status: "growing",
    datePlanted: getDateOffsetFromToday(-67),
    harvestDate: getDateOffsetFromToday(3),
    sellDate: getDateOffsetFromToday(4),
    quantity: 240,
    description: "Expected to be ready for harvest soon.",
  },
  {
    id: "crop-3",
    name: "Tomatoes",
    category: "Fruit",
    status: "growing",
    datePlanted: getDateOffsetFromToday(-25),
    harvestDate: getDateOffsetFromToday(45),
    sellDate: getDateOffsetFromToday(52),
    quantity: 86,
    description: "Growing well. Include in the next available listing after harvest.",
  },
  {
    id: "crop-4",
    name: "Pechay",
    category: "Root crop",
    status: "growing",
    datePlanted: getDateOffsetFromToday(-18),
    harvestDate: getDateOffsetFromToday(12),
    sellDate: getDateOffsetFromToday(17),
    quantity: 150,
    description: "Tender leafy greens currently growing in the field.",
  },
  {
    id: "crop-5",
    name: "Ampalaya",
    category: "Fruit",
    status: "growing",
    datePlanted: getDateOffsetFromToday(-40),
    harvestDate: getDateOffsetFromToday(5),
    sellDate: getDateOffsetFromToday(9),
    quantity: 64,
    description: "Harvest window is approaching.",
  },
  {
    id: "crop-6",
    name: "Broccoli",
    category: "Vegetable",
    status: "growing",
    datePlanted: getDateOffsetFromToday(-32),
    harvestDate: getDateOffsetFromToday(28),
    sellDate: getDateOffsetFromToday(35),
    quantity: 95,
    description: "Young plants are developing steadily.",
  },
]

export function getSavedCrops() {
  try {
    const savedCrops = JSON.parse(window.localStorage.getItem(SAVED_CROPS_KEY) || "[]")
    if (!Array.isArray(savedCrops)) throw new Error("Saved crop preview data is invalid.")
    return savedCrops
  } catch (error) {
    console.error("Could not load saved crop preview data:", error)
    return []
  }
}

export function updateSavedCrops(update) {
  const savedCrops = getSavedCrops()
  window.localStorage.setItem(SAVED_CROPS_KEY, JSON.stringify(update(savedCrops)))
}

export function loadCropPreview() {
  const savedCrops = getSavedCrops()
  const savedById = new Map(savedCrops.map((crop) => [crop.id, crop]))
  const initialIds = new Set(INITIAL_CROPS.map((crop) => crop.id))
  const isActiveCrop = (crop) => !crop.archived && !crop.deleted && crop.status !== "harvested"

  return [
    ...INITIAL_CROPS.map((crop) => savedById.get(crop.id) || crop).filter(isActiveCrop),
    ...savedCrops.filter((crop) => !initialIds.has(crop.id) && isActiveCrop(crop)),
  ]
}

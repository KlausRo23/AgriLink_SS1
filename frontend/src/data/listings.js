export const SAMPLE_LISTINGS = [
  {
    id: "tomato",
    name: "Tomatoes",
    emoji: "🍅",
    description: "Freshly picked, ripe and ready for your table.",
    seller: "Mila Santos",
    region: "Bukidnon, Northern Mindanao",
    price: 85,
    stock: 120,
    unit: "kg",
    listedDate: "2025-05-23",
    status: "pending",
    category: "Fresh produce",
    harvestDate: "2026-11-09",
    details: "Naturally ripened tomatoes, carefully harvested at peak freshness. Great for sauces, salads, and everyday cooking.",
    visual: "tomato",
    careLog: {
      isOrganic: true,
      datePlanted: "2026-10-05",
      harvestedOn: "2026-11-09",
      summary: { watered: 5, fertilized: 2, pesticide: 1, pruned: 2 },
      entries: [
        { date: "2026-11-02", dayOfGrowing: 29, actions: ["watered"], note: "Watered the beds before the afternoon sun." },
        { date: "2026-11-03", dayOfGrowing: 30, actions: ["fertilized"] },
        { date: "2026-11-04", dayOfGrowing: 31, actions: ["watered"] },
        { date: "2026-11-05", dayOfGrowing: 32, actions: ["watered"] },
        { date: "2026-11-07", dayOfGrowing: 34, actions: ["watered", "pesticide"], note: "Applied organic pest control after checking the leaves." },
        { date: "2026-11-08", dayOfGrowing: 35, actions: ["pruned"] },
        { date: "2026-11-09", dayOfGrowing: 36, actions: ["watered", "fertilized", "pruned"] },
      ],
    },
  },
  {
    id: "lettuce",
    name: "Green Lettuce",
    emoji: "🥬",
    description: "Crisp, clean leaves from our highland farm.",
    seller: "Ramon Dela Cruz",
    region: "Malaybalay, Bukidnon",
    price: 65,
    stock: 42,
    unit: "kg",
    listedDate: "2025-05-22",
    status: "pending",
    category: "Leafy greens",
    harvestDate: "2025-05-22",
    details: "Freshly harvested, crisp green lettuce grown with care in the cool highlands of Bukidnon.",
    visual: "leafy",
  },
  {
    id: "eggplant",
    name: "Purple Eggplant",
    emoji: "🍆",
    description: "Firm, glossy eggplants harvested this week.",
    seller: "Liza Manalo",
    region: "Valencia, Bukidnon",
    price: 72,
    stock: 65,
    unit: "kg",
    listedDate: "2025-05-20",
    status: "pending",
    category: "Fresh produce",
    harvestDate: "2025-05-19",
    details: "Firm, glossy purple eggplants freshly harvested and ready for market.",
    visual: "purple",
  },
  {
    id: "carrot",
    name: "Highland Carrots",
    emoji: "🥕",
    description: "Sweet, crunchy carrots grown in rich soil.",
    seller: "Jun Reyes",
    region: "Impasug-ong, Bukidnon",
    price: 95,
    stock: 80,
    unit: "kg",
    listedDate: "2025-05-19",
    status: "pending",
    category: "Root vegetables",
    harvestDate: "2025-05-18",
    details: "Sweet and crunchy highland carrots, washed and sorted for your order.",
    visual: "orange",
  },
  {
    id: "cabbage",
    name: "Fresh Cabbage",
    emoji: "🥬",
    description: "Dense heads of cabbage, grown locally.",
    seller: "Ana Mercado",
    region: "Kitaotao, Bukidnon",
    price: 55,
    stock: 35,
    unit: "kg",
    listedDate: "2025-05-18",
    status: "pending",
    category: "Leafy greens",
    harvestDate: "2025-05-17",
    details: "Locally grown cabbage with dense, fresh leaves. Available in this week's harvest.",
    visual: "green",
  },
]

export const LISTINGS_STORAGE_KEY = "agrilink-listings-preview-v1"

export function loadListings() {
  try {
    const savedListings = window.localStorage.getItem(LISTINGS_STORAGE_KEY)
    if (!savedListings) return SAMPLE_LISTINGS
    const parsedListings = JSON.parse(savedListings)
    if (!Array.isArray(parsedListings)) throw new Error("Saved listing preview data is invalid.")
    return parsedListings
  } catch (error) {
    console.error("Could not load saved listing preview data:", error)
    return SAMPLE_LISTINGS
  }
}

export function saveListings(listings) {
  try {
    window.localStorage.setItem(LISTINGS_STORAGE_KEY, JSON.stringify(listings))
    return true
  } catch (error) {
    console.error("Could not save listing preview data:", error)
    return false
  }
}

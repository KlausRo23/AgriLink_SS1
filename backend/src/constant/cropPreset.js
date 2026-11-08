export const cropPresets = {
    // ---- original crops (unchanged) ----
    Rice: { category: "Vegetable", daysToHarvest: 120, shelfLifeDays: 365 },
    Corn: { category: "Vegetable", daysToHarvest: 90, shelfLifeDays: 14 },
    Tomato: { category: "Fruit", daysToHarvest: 70, shelfLifeDays: 7 },
    Eggplant: { category: "Fruit", daysToHarvest: 80, shelfLifeDays: 10 },
    Okra: { category: "Vegetable", daysToHarvest: 55, shelfLifeDays: 5 },
    Cabbage: { category: "Vegetable", daysToHarvest: 70, shelfLifeDays: 21 },
    Carrot: { category: "Vegetable", daysToHarvest: 75, shelfLifeDays: 30 },
    Onion: { category: "Vegetable", daysToHarvest: 100, shelfLifeDays: 60 },
    Garlic: { category: "Vegetable", daysToHarvest: 150, shelfLifeDays: 120 },
    Banana: { category: "Fruit", daysToHarvest: 280, shelfLifeDays: 7 },
    Mango: { category: "Fruit", daysToHarvest: 100, shelfLifeDays: 14 },
    Papaya: { category: "Fruit", daysToHarvest: 240, shelfLifeDays: 10 },
    Watermelon: { category: "Fruit", daysToHarvest: 85, shelfLifeDays: 14 },
    "Sweet Potato": { category: "Vegetable", daysToHarvest: 110, shelfLifeDays: 90 },
    Cassava: { category: "Vegetable", daysToHarvest: 300, shelfLifeDays: 30 },

    // ---- leafy and fruiting vegetables ----
    Ampalaya: { category: "Vegetable", daysToHarvest: 60, shelfLifeDays: 5 },
    Sitaw: { category: "Vegetable", daysToHarvest: 60, shelfLifeDays: 5 },
    Kangkong: { category: "Vegetable", daysToHarvest: 30, shelfLifeDays: 3 },
    Pechay: { category: "Vegetable", daysToHarvest: 30, shelfLifeDays: 5 },
    Malunggay: { category: "Vegetable", daysToHarvest: 120, shelfLifeDays: 3 },
    Lettuce: { category: "Vegetable", daysToHarvest: 45, shelfLifeDays: 5 },
    Broccoli: { category: "Vegetable", daysToHarvest: 65, shelfLifeDays: 7 },
    Cucumber: { category: "Vegetable", daysToHarvest: 50, shelfLifeDays: 7 },
    "Bell Pepper": { category: "Vegetable", daysToHarvest: 75, shelfLifeDays: 10 },
    "Chili Pepper": { category: "Vegetable", daysToHarvest: 90, shelfLifeDays: 7 },
    Squash: { category: "Vegetable", daysToHarvest: 100, shelfLifeDays: 90 },
    Upo: { category: "Vegetable", daysToHarvest: 70, shelfLifeDays: 7 },
    Patola: { category: "Vegetable", daysToHarvest: 70, shelfLifeDays: 5 },
    Sayote: { category: "Vegetable", daysToHarvest: 100, shelfLifeDays: 14 },

    // ---- root crops and legumes ----
    Potato: { category: "Vegetable", daysToHarvest: 90, shelfLifeDays: 60 },
    Radish: { category: "Vegetable", daysToHarvest: 35, shelfLifeDays: 7 },
    Ginger: { category: "Vegetable", daysToHarvest: 240, shelfLifeDays: 60 },
    Gabi: { category: "Vegetable", daysToHarvest: 180, shelfLifeDays: 30 },
    Ube: { category: "Vegetable", daysToHarvest: 270, shelfLifeDays: 60 },
    Peanut: { category: "Vegetable", daysToHarvest: 100, shelfLifeDays: 120 },
    "Mung Bean": { category: "Vegetable", daysToHarvest: 65, shelfLifeDays: 180 },

    // ---- fruits ----
    Pineapple: { category: "Fruit", daysToHarvest: 540, shelfLifeDays: 10 },
    Calamansi: { category: "Fruit", daysToHarvest: 365, shelfLifeDays: 14 },
    Durian: { category: "Fruit", daysToHarvest: 120, shelfLifeDays: 5 },
    Lanzones: { category: "Fruit", daysToHarvest: 120, shelfLifeDays: 5 },
    Jackfruit: { category: "Fruit", daysToHarvest: 150, shelfLifeDays: 7 },
    Strawberry: { category: "Fruit", daysToHarvest: 90, shelfLifeDays: 3 },
}


export const LOG_TITLE = {
    CROP_SPOILAGE: "Crop Spoilage", // Extremely bad
    CROP_EXPIRING_SOON: "Crop Expiring Soon", // Bad
    CROP_DELETED: "Crop deleted", // Resolve
    CROP_ADDED: "Crop added", // Resolve
    CROP_EDITED: "Crop edited", // Routine
    CROP_HARVESTED: "Crop harvested", // Routine
    CROP_INSPRECTION: "Insprect the crop" // Routine
}

export const LOG_LEVEL = {
    EXTREMELY_BAD: "Extremely Bad",
    BAD: "Bad",
    ROUTINE: "Routine",
    RESOLVE: "Resolve" //Add, edit or delete
}

export const CROP_STATUS = {
    FRESH: "fresh",
    EXPIRED: "expired",
    GROWING: "growing",
    HARVESTED: "harvested"
}

export const CROP_CATEGORY = {
    VEGETABLE: "Vegetable",
    FRUIT: "Fruit"
}
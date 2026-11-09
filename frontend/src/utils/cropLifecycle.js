const DAY_IN_MS = 24 * 60 * 60 * 1000
const READY_WINDOW_DAYS = 7

function getDayDifference(value) {
  if (!value) return null
  const date = new Date(`${value}T00:00:00`)
  if (Number.isNaN(date.getTime())) return null

  const today = new Date()
  today.setHours(0, 0, 0, 0)
  date.setHours(0, 0, 0, 0)
  return Math.round((date - today) / DAY_IN_MS)
}

export function getCropLifecycleStatus(crop) {
  const daysUntilHarvest = getDayDifference(crop.harvestDate)
  if (daysUntilHarvest === null) return "growing"
  if (daysUntilHarvest < 0) return "overdue"
  if (daysUntilHarvest <= READY_WINDOW_DAYS) return "ready-to-harvest"
  return "growing"
}

export function getCropSpoilageStatus(crop) {
  const daysUntilSellBy = getDayDifference(crop.sellDate)
  if (daysUntilSellBy === null || daysUntilSellBy > READY_WINDOW_DAYS) return null
  return daysUntilSellBy < 0 ? "overdue" : "near-overdue"
}

export function formatCropDate(value) {
  if (!value) return "Not set"
  const date = new Date(`${value}T00:00:00`)
  if (Number.isNaN(date.getTime())) return "Not set"
  return new Intl.DateTimeFormat("en-PH", {
    month: "short",
    day: "numeric",
    year: "numeric",
  }).format(date)
}

export function getDateOffsetFromToday(days) {
  const date = new Date()
  date.setDate(date.getDate() + days)
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, "0")
  const day = String(date.getDate()).padStart(2, "0")
  return `${year}-${month}-${day}`
}

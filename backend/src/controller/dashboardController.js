import Crop from "../model/Crop.js"
import Farmer from "../model/Farmer.js"
import Farm from "../model/Farm.js"
import Inventory from "../model/Inventory.js"
import Listing from "../model/Listing.js"
import InboxConversation from "../model/InboxConversation.js"
import { CROP_STATUS } from "../constant/cropPreset.js"
import { LISTING_STATUS } from "../constant/listing.js"

const DAY_MS = 86_400_000
const NEAR_EXPIRY_DAYS = 7

export async function getDashboard(req, res) {
    try {
        const owner = req.user.id
        const startOfToday = new Date()
        startOfToday.setUTCHours(0, 0, 0, 0)
        const nearExpiryDate = new Date(startOfToday.getTime() + NEAR_EXPIRY_DAYS * DAY_MS)
        const farmer = await Farmer.findOne({ ssoUserId: owner }).lean()
        if (!farmer) {
            return res.status(404).json({ success: false, message: "Farmer profile not found", data: null })
        }

        const salesStart = new Date(startOfToday.getFullYear(), startOfToday.getMonth() - 5, 1)
        const [farm, growingCropCount, upcomingHarvests, inventorySummary, stockItems, listingCounts, recentListings, salesSummary] =
            await Promise.all([
                Farm.findOne({ owner: farmer._id }).lean(),
                Crop.countDocuments({ owner, status: CROP_STATUS.GROWING }),
                Crop.find({
                    owner,
                    status: CROP_STATUS.GROWING,
                    harvestDate: { $gte: startOfToday }
                })
                    .select("name datePlanted harvestDate status")
                    .sort({ harvestDate: 1 })
                    .limit(4)
                    .lean(),
                Inventory.aggregate([
                    { $match: { owner } },
                    {
                        $group: {
                            _id: null,
                            total: { $sum: 1 },
                            fresh: {
                                $sum: {
                                    $cond: [
                                        { $or: [
                                            { $eq: [{ $ifNull: ["$expirationDate", null] }, null] },
                                            { $gt: ["$expirationDate", nearExpiryDate] }
                                        ] },
                                        1,
                                        0
                                    ]
                                }
                            },
                            nearSpoiling: {
                                $sum: {
                                    $cond: [
                                        { $and: [
                                            { $ne: [{ $ifNull: ["$expirationDate", null] }, null] },
                                            { $gte: ["$expirationDate", startOfToday] },
                                            { $lte: ["$expirationDate", nearExpiryDate] }
                                        ] },
                                        1,
                                        0
                                    ]
                                }
                            },
                            spoiled: {
                                $sum: {
                                    $cond: [
                                        { $and: [
                                            { $ne: [{ $ifNull: ["$expirationDate", null] }, null] },
                                            { $lt: ["$expirationDate", startOfToday] }
                                        ] },
                                        1,
                                        0
                                    ]
                                }
                            }
                        }
                    }
                ]),
                Inventory.find({ owner })
                    .select("name quantity unit")
                    .sort({ quantity: -1, createdAt: -1 })
                    .limit(5)
                    .lean(),
                Listing.aggregate([
                    { $match: { owner } },
                    { $group: { _id: "$status", count: { $sum: 1 } } }
                ]),
                Listing.find({ owner })
                    .select("name status price stock unit createdAt")
                    .sort({ createdAt: -1 })
                    .limit(5)
                    .lean(),
                InboxConversation.aggregate([
                    {
                        $match: {
                            farmerId: owner,
                            orderStatus: { $in: ["delivered", "completed"] },
                            completedAt: { $ne: null }
                        }
                    },
                    {
                        $facet: {
                            lifetime: [{ $group: { _id: null, total: { $sum: "$subtotal" } } }],
                            monthly: [
                                { $match: { completedAt: { $gte: salesStart } } },
                                {
                                    $group: {
                                        _id: { $dateToString: { format: "%Y-%m", date: "$completedAt" } },
                                        total: { $sum: "$subtotal" }
                                    }
                                }
                            ]
                        }
                    }
                ])
            ])

        const listingsByStatus = Object.fromEntries(
            Object.values(LISTING_STATUS).map((status) => [status, 0])
        )
        for (const entry of listingCounts) listingsByStatus[entry._id] = entry.count

        const baseUrl = (process.env.PUBLIC_BASE_URL || "").replace(/\/$/, "")
        const account = {
            firstName: farmer.firstName,
            middleName: farmer.middleName,
            lastName: farmer.lastName,
            suffix: farmer.suffix || "",
            age: farmer.age,
            region: farmer.region,
            bio: farmer.bio || "",
            mobileNumber: farmer.mobileNumber || "",
            email: farmer.email || "",
            facebook: farmer.facebook || ""
        }
        const farmProfile = farm ? {
            farmName: farm.farmName,
            location: farm.location,
            description: farm.description,
            startedFarming: farm.startedFarming ? new Date(farm.startedFarming).getFullYear() : "",
            specialty: farm.specialty || [],
            deliveryMode: farm.deliveryMode || [],
            deliverableRegions: farm.deliverableRegions || [],
            farmPhotoUrl: farm.farmPhoto ? `${baseUrl}${farm.farmPhoto}` : null
        } : null
        const freshness = inventorySummary[0] || { total: 0, fresh: 0, nearSpoiling: 0, spoiled: 0 }
        const monthlySales = new Map((salesSummary[0]?.monthly || []).map((month) => [month._id, month.total]))
        const sales = {
            total: salesSummary[0]?.lifetime?.[0]?.total || 0,
            months: Array.from({ length: 6 }, (_, index) => {
                const monthDate = new Date(startOfToday.getFullYear(), startOfToday.getMonth() - 5 + index, 1)
                const key = `${monthDate.getFullYear()}-${String(monthDate.getMonth() + 1).padStart(2, "0")}`
                return {
                    key,
                    label: new Intl.DateTimeFormat("en-PH", { month: "short" }).format(monthDate),
                    total: monthlySales.get(key) || 0
                }
            })
        }

        return res.status(200).json({
            success: true,
            message: "Dashboard fetched",
            data: {
                profile: { account, farm: farmProfile },
                summary: {
                    growingCrops: growingCropCount,
                    inventoryCount: freshness.total,
                    freshness: {
                        fresh: freshness.fresh,
                        nearSpoiling: freshness.nearSpoiling,
                        spoiled: freshness.spoiled
                    },
                    listings: listingsByStatus
                },
                sales,
                stocks: stockItems.map((item) => ({
                    id: String(item._id),
                    name: item.name,
                    quantity: item.quantity,
                    unit: item.unit,
                    status: item.quantity > 0 ? "healthy" : "low"
                })),
                upcomingHarvests: upcomingHarvests.map((crop) => ({
                    id: String(crop._id),
                    name: crop.name,
                    datePlanted: crop.datePlanted,
                    harvestDate: crop.harvestDate.toISOString().slice(0, 10),
                    status: crop.status
                })),
                recentListings: recentListings.map((listing) => ({
                    id: String(listing._id),
                    name: listing.name,
                    status: listing.status,
                    price: listing.price,
                    stock: listing.stock,
                    unit: listing.unit,
                    createdAt: listing.createdAt
                }))
            }
        })
    } catch (error) {
        console.error("Dashboard request failed:", error)
        return res.status(500).json({ success: false, message: "Could not load dashboard data", data: null })
    }
}

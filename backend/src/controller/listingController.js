import * as listingService from "../service/listingService.js"

function handleError(res, err) {
    if (err.statusCode) {
        return res.status(err.statusCode).json({
            success: false,
            message: err.message,
            data: err.errors ?? null
        })
    }
    if (err.name === "ValidationError" || err.name === "CastError") {
        return res.status(400).json({ success: false, message: "Validation failed", data: null })
    }
    console.error("Listing controller error:", err)
    return res.status(500).json({ success: false, message: "Internal server error", data: null })
}

// ---------- Farmer ----------

export async function createListing(req, res) {
    try {
        const listing = await listingService.createListing(req.body, req.user)
        return res.status(201).json({ success: true, message: "Listing submitted for review", data: listing })
    } catch (err) {
        return handleError(res, err)
    }
}

export async function getMyListings(req, res) {
    try {
        const result = await listingService.getOwnListings(req.query, req.user)
        return res.status(200).json({ success: true, message: "Listings fetched", data: result })
    } catch (err) {
        return handleError(res, err)
    }
}

// Includes the care log, so the farmer sees exactly what buyers would see
export async function getMyListing(req, res) {
    try {
        const listing = await listingService.getOwnListing(req.params.id, req.user)
        return res.status(200).json({ success: true, message: "Listing fetched", data: listing })
    } catch (err) {
        return handleError(res, err)
    }
}

export async function editListing(req, res) {
    try {
        const listing = await listingService.updateListing(req.params.id, req.body, req.user)
        return res.status(200).json({ success: true, message: "Listing updated", data: listing })
    } catch (err) {
        return handleError(res, err)
    }
}

export async function resubmitListing(req, res) {
    try {
        const listing = await listingService.resubmitListing(req.params.id, req.user)
        return res.status(200).json({ success: true, message: "Listing resubmitted for review", data: listing })
    } catch (err) {
        return handleError(res, err)
    }
}

export async function deleteListing(req, res) {
    try {
        await listingService.deleteListing(req.params.id, req.body?.reason, req.user)
        return res.status(200).json({ success: true, message: "Listing moved to archive", data: null })
    } catch (err) {
        return handleError(res, err)
    }
}

// ---------- Admin ----------

export async function getAllListing(req, res) {
    try {
        const result = await listingService.getAllListings(req.query)
        return res.status(200).json({ success: true, message: "Listings fetched", data: result })
    } catch (err) {
        return handleError(res, err)
    }
}

// Includes the care log, even if the farmer hid it from buyers
export async function getListing(req, res) {
    try {
        const listing = await listingService.getListingForAdmin(req.params.id)
        return res.status(200).json({ success: true, message: "Listing fetched", data: listing })
    } catch (err) {
        return handleError(res, err)
    }
}

export async function approveListing(req, res) {
    try {
        const listing = await listingService.approveListing(req.params.id, req.body?.note, req.user)
        return res.status(200).json({ success: true, message: "Listing approved", data: listing })
    } catch (err) {
        return handleError(res, err)
    }
}

export async function rejectListing(req, res) {
    try {
        const listing = await listingService.rejectListing(req.params.id, req.body?.note, req.user)
        return res.status(200).json({ success: true, message: "Listing rejected", data: listing })
    } catch (err) {
        return handleError(res, err)
    }
}

export async function returnListing(req, res) {
    try {
        const listing = await listingService.returnListing(req.params.id, req.body?.note, req.user)
        return res.status(200).json({ success: true, message: "Listing returned to the farmer", data: listing })
    } catch (err) {
        return handleError(res, err)
    }
}

// ---------- Buyer marketplace ----------

// The list only carries a hasCareLog flag, so the page stays light
export async function getMarketplace(req, res) {
    try {
        const result = await listingService.getMarketplace(req.query)
        return res.status(200).json({ success: true, message: "Marketplace fetched", data: result })
    } catch (err) {
        return handleError(res, err)
    }
}

// Includes the care log when the farmer chose to show it
export async function getMarketplaceListing(req, res) {
    try {
        const listing = await listingService.getMarketplaceListing(req.params.id)
        return res.status(200).json({ success: true, message: "Listing fetched", data: listing })
    } catch (err) {
        return handleError(res, err)
    }
}
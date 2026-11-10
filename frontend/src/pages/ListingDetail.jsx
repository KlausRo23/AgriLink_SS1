import { useEffect, useState } from "react"
import { ArrowLeft, ArrowUpRight, MapPin, Minus, Plus, ShoppingBag, Sprout } from "lucide-react"
import { Link, useNavigate, useParams } from "react-router-dom"
import ListingCareHistory from "../component/listing/ListingCareHistory"
import { createInboxOrderRequest, getMarketplaceListing, getMyListing } from "../api/api"
import { normalizeListing } from "../data/listings"
import "../styles/listings.css"

function ListingDetail() {
  const { id } = useParams()
  const navigate = useNavigate()
  const [listing, setListing] = useState(null)
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState("")
  const [quantity, setQuantity] = useState(1)
  const [notice, setNotice] = useState("")
  const [orderSubmitting, setOrderSubmitting] = useState(false)

  useEffect(() => {
    let active = true
    async function loadListing() {
      setLoading(true)
      setLoadError("")
      try {
        let response
        try {
          response = await getMyListing(id)
        } catch (error) {
          if (![403, 404].includes(error.response?.status)) throw error
          response = await getMarketplaceListing(id)
        }
        const { data } = response
        if (active) setListing(normalizeListing(data.data))
      } catch (error) {
        if (active) setLoadError(error.response?.data?.message || "Could not load this listing.")
      } finally {
        if (active) setLoading(false)
      }
    }
    void loadListing()
    return () => { active = false }
  }, [id])

  if (!listing) {
    return (
      <main className="dashboard-main listing-detail-page">
        <header className="dashboard-topbar">
          <div className="dashboard-breadcrumb">Listings</div>
          <button type="button" className="dashboard-avatar" aria-label="Account">F</button>
        </header>
        <div className="listing-detail-content">
          <Link className="listing-back-link" to="/listings"><ArrowLeft size={16} aria-hidden="true" /> Back to listings</Link>
          <div className="listings-empty">
            <h1>{loading ? "Loading listing..." : "Listing unavailable"}</h1>
            <p role={loadError ? "alert" : undefined}>{loadError || (loading ? "Fetching listing details." : "This listing may have been removed or is not available to your account.")}</p>
          </div>
        </div>
      </main>
    )
  }

  const maxQuantity = Math.max(1, Math.floor(listing.stock))
  const isApproved = listing.status === "approved"
  const canOrder = isApproved && !listing.isOwner
  const price = new Intl.NumberFormat("en-PH", { style: "currency", currency: "PHP", maximumFractionDigits: 0 })

  async function placeOrder() {
    setOrderSubmitting(true)
    setNotice("")
    try {
      const { data } = await createInboxOrderRequest({ listingId: listing.id, quantity })
      navigate("/inbox", { state: { threadId: data.data.id } })
    } catch (error) {
      setNotice(error.response?.data?.message || "Could not submit this order request.")
    } finally {
      setOrderSubmitting(false)
    }
  }

  return (
    <main className="dashboard-main listing-detail-page">
      <header className="dashboard-topbar">
        <div className="dashboard-breadcrumb">Listings <span>/</span> {listing.name}</div>
        <button type="button" className="dashboard-avatar" aria-label="Account">F</button>
      </header>
      <div className="listing-detail-content">
        <Link className="listing-back-link" to="/listings"><ArrowLeft size={16} aria-hidden="true" /> Back to marketplace</Link>
        <div className="listing-detail-breadcrumb">Marketplace <span>/</span> {listing.category} <span>/</span> {listing.name}</div>

        <section className="listing-detail-layout">
          <div className="listing-detail-gallery">
            <div className={`listing-detail-main-image listing-art--${listing.visual}`}>
              {listing.imageUrl
                ? <img src={listing.imageUrl} alt={listing.name} />
                : <span className="listing-detail-emoji" aria-hidden="true">{listing.emoji}</span>}
              <span className="listing-fresh-badge"><Sprout size={14} aria-hidden="true" /> Fresh harvest</span>
            </div>
            <div className="listing-detail-thumbnails" aria-label="Product images">
              {[0, 1, 2].map((image) => (
                <div key={image} className={`listing-detail-thumbnail listing-art--${listing.visual}${image === 0 ? " is-selected" : ""}`}>
                  <span aria-hidden="true">{listing.emoji}</span>
                </div>
              ))}
              <p>Farm-fresh produce, carefully harvested</p>
            </div>
          </div>

          <div className="listing-detail-info">
            <span className="listing-detail-category">{listing.category}</span>
            <h1>{listing.name}</h1>
            <p className="listing-detail-short-description">{listing.description}</p>

            <div className="listing-detail-price">
              <strong>{price.format(listing.price)}</strong>
              <span>per {listing.unit}</span>
            </div>
            <div className="listing-stock-availability">
              <span>Available quantity</span>
              <strong>{listing.stock} {listing.unit}</strong>
            </div>

            <div className="listing-seller">
              <div className="listing-seller-avatar">{listing.seller.split(" ").map((part) => part[0]).join("")}</div>
              <div>
                <span>Grown and sold by</span>
                <strong>{listing.seller}</strong>
              </div>
              <span className="listing-seller-verified">Verified farmer</span>
            </div>

            {canOrder ? (
              <>
                <div className="listing-detail-quantity">
                  <div>
                    <strong>Quantity to order</strong>
                  </div>
                  <div className="listing-quantity-stepper">
                    <button type="button" onClick={() => setQuantity((value) => Math.max(1, value - 1))} aria-label="Decrease quantity" disabled={quantity <= 1}><Minus size={15} /></button>
                    <span>{quantity}</span>
                    <button type="button" onClick={() => setQuantity((value) => Math.min(maxQuantity, value + 1))} aria-label="Increase quantity" disabled={quantity >= maxQuantity}><Plus size={15} /></button>
                  </div>
                </div>

                <div className="listing-detail-subtotal"><span>Subtotal</span><strong>{price.format(quantity * listing.price)}</strong></div>
                <button type="button" className="listing-place-order" onClick={placeOrder} disabled={orderSubmitting}>
                  <ShoppingBag size={17} aria-hidden="true" /> {orderSubmitting ? "Submitting..." : "Place an order"}
                </button>
                <button type="button" className="listing-contact-farmer" onClick={() => setNotice(`Contact details for ${listing.seller} are not available in this preview.`)}>
                  Contact farmer <ArrowUpRight size={15} aria-hidden="true" />
                </button>
                {notice && <p className="listing-detail-notice" role="status">{notice}</p>}
              </>
            ) : (
              <div className="listing-not-approved">
                <strong>{isApproved ? "Your approved listing is live" : "Not available in the marketplace yet"}</strong>
                <span>{isApproved ? "Buyers can now find this product in the marketplace." : `This listing is ${listing.status} and cannot be ordered.`}</span>
                {listing.reviewNote && <span>Review note: {listing.reviewNote}</span>}
              </div>
            )}

            {listing.region && <div className="listing-location"><MapPin size={16} aria-hidden="true" /><span>{listing.region}</span></div>}
          </div>
        </section>

        <section className="listing-about">
          <div>
            <p className="listings-eyebrow">From the farm</p>
            <h2>About this produce</h2>
            <p>{listing.details}</p>
          </div>
          <div className="listing-harvest-card">
            <span>Harvested</span>
            <strong>{listing.harvestDate
              ? new Intl.DateTimeFormat("en-PH", { month: "long", day: "numeric", year: "numeric" }).format(new Date(`${listing.harvestDate}T12:00:00`))
              : "Date not provided"}</strong>
            <span>Grown in {listing.region}</span>
          </div>
        </section>
        <ListingCareHistory careLog={listing.careLog} />
      </div>
    </main>
  )
}

export default ListingDetail

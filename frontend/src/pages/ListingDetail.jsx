import { useState } from "react"
import { ArrowLeft, ArrowUpRight, MapPin, Minus, Plus, ShoppingBag, Sprout } from "lucide-react"
import { Link, useNavigate, useParams } from "react-router-dom"
import ListingCareHistory from "../component/listing/ListingCareHistory"
import { createOrderRequest } from "../data/inbox"
import { loadListings } from "../data/listings"
import "../styles/listings.css"

function ListingDetail() {
  const { id } = useParams()
  const navigate = useNavigate()
  const listing = loadListings().find((item) => item.id === id)
  const [quantity, setQuantity] = useState(1)
  const [notice, setNotice] = useState("")

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
            <h1>Listing unavailable</h1>
            <p>This listing may have been removed or is not available in the marketplace.</p>
          </div>
        </div>
      </main>
    )
  }

  const maxQuantity = Math.max(1, Math.floor(listing.stock))
  const isApproved = listing.status === "approved"
  const price = new Intl.NumberFormat("en-PH", { style: "currency", currency: "PHP", maximumFractionDigits: 0 })

  function placeOrder() {
    const { thread, saved } = createOrderRequest({ listing, quantity })
    if (!saved) {
      setNotice("The order request could not be saved in this browser. Check storage permissions and try again.")
      return
    }
    navigate("/inbox", { state: { threadId: thread.id, saved: true } })
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

            {isApproved ? (
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
                <button type="button" className="listing-place-order" onClick={placeOrder}>
                  <ShoppingBag size={17} aria-hidden="true" /> Place an order
                </button>
                <button type="button" className="listing-contact-farmer" onClick={() => setNotice(`Contact details for ${listing.seller} are not available in this preview.`)}>
                  Contact farmer <ArrowUpRight size={15} aria-hidden="true" />
                </button>
                {notice && <p className="listing-detail-notice" role="status">{notice}</p>}
              </>
            ) : (
              <div className="listing-not-approved">
                <strong>Not available in the marketplace yet</strong>
                <span>This listing is {listing.status} and cannot be ordered.</span>
              </div>
            )}

            <div className="listing-location"><MapPin size={16} aria-hidden="true" /><span>{listing.region}</span></div>
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
            <strong>{new Intl.DateTimeFormat("en-PH", { month: "long", day: "numeric", year: "numeric" }).format(new Date(`${listing.harvestDate}T12:00:00`))}</strong>
            <span>Grown in {listing.region}</span>
          </div>
        </section>
        <ListingCareHistory careLog={listing.careLog} />
      </div>
    </main>
  )
}

export default ListingDetail

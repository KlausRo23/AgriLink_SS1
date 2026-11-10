import { CalendarDays, Package, Pencil, Tag, Undo2, Wallet } from "lucide-react"
import "../../styles/listings.css"

const STATUS_LABELS = {
  pending: "Pending",
  approved: "Approved",
  rejected: "Rejected",
  returned: "Returned",
}

function formatDate(value) {
  const date = new Date(`${value}T12:00:00`)
  return Number.isNaN(date.getTime())
    ? "Not listed"
    : new Intl.DateTimeFormat("en-PH", { month: "short", day: "numeric", year: "numeric" }).format(date)
}

function formatPeso(value) {
  return new Intl.NumberFormat("en-PH", {
    style: "currency",
    currency: "PHP",
    maximumFractionDigits: 0,
  }).format(value)
}

function ListingCard({ listing, onOpen, onUnsubmit, onEdit, onResubmit, saving }) {
  const status = STATUS_LABELS[listing.status] ? listing.status : "pending"

  return (
    <article className={`listing-card listing-card--${status}`}>
      <button type="button" className={`listing-card-image listing-art--${listing.visual || "leafy"}`} onClick={() => onOpen?.(listing)} aria-label={`View ${listing.name} listing`}>
        {listing.imageUrl
          ? <img src={listing.imageUrl} alt={listing.name} />
          : <span className="listing-card-emoji" aria-hidden="true">{listing.emoji || "🥬"}</span>}
      </button>

      <div className="listing-card-body">
        <div className="listing-card-title">
          <button type="button" onClick={() => onOpen?.(listing)}>{listing.name}</button>
          <span className={`listing-status-badge listing-status-badge--${status}`}>
            {status === "pending" && <span className="listing-pending-indicator" aria-hidden="true" />}
            {STATUS_LABELS[status]}
          </span>
        </div>
        <p className="listing-card-description">{listing.description}</p>
        <p className="listing-card-seller">{listing.seller} · Listed for buyers</p>
        {listing.reviewNote && <p className="listing-card-review-note">Review note: {listing.reviewNote}</p>}

        <div className="listing-card-metrics">
          <div>
            <Package size={14} aria-hidden="true" />
            <strong>{listing.stock} {listing.unit}</strong>
            <span>Quantity</span>
          </div>
          <div>
            <Tag size={14} aria-hidden="true" />
            <strong>{formatPeso(listing.price)}</strong>
            <span>Price / {listing.unit}</span>
          </div>
          <div>
            <Wallet size={14} aria-hidden="true" />
            <strong>{formatPeso(listing.price * listing.stock)}</strong>
            <span>Total value</span>
          </div>
          <div>
            <CalendarDays size={14} aria-hidden="true" />
            <strong>{formatDate(listing.listedDate)}</strong>
            <span>Listed date</span>
          </div>
        </div>

        {status === "pending" ? (
          <div className="listing-card-review-actions">
            <button type="button" className="listing-unsubmit-button" onClick={() => onUnsubmit?.(listing)} disabled={saving}>
              <Undo2 size={14} aria-hidden="true" /> Unsubmit
            </button>
            <button type="button" className="listing-card-edit-button" onClick={() => onEdit?.(listing)} disabled={saving}>
              <Pencil size={13} aria-hidden="true" /> Edit
            </button>
            <button type="button" className="listing-card-details-link" onClick={() => onOpen?.(listing)}>View details</button>
          </div>
        ) : status === "returned" ? (
          <div className="listing-card-review-actions">
            <button type="button" className="listing-card-edit-button" onClick={() => onEdit?.(listing)} disabled={saving}>
              <Pencil size={13} aria-hidden="true" /> Edit
            </button>
            <button type="button" className="listing-unsubmit-button" onClick={() => onResubmit?.(listing)} disabled={saving}>
              <Undo2 size={14} aria-hidden="true" /> {saving ? "Submitting..." : "Resubmit"}
            </button>
            <button type="button" className="listing-card-details-link" onClick={() => onOpen?.(listing)}>View details</button>
          </div>
        ) : (
          <div className="listing-card-review-actions">
            {status !== "rejected" && <button type="button" className="listing-card-edit-button" onClick={() => onEdit?.(listing)} disabled={saving}>
              <Pencil size={13} aria-hidden="true" /> Edit
            </button>}
            <button type="button" className="listing-card-details-link" onClick={() => onOpen?.(listing)}>View details</button>
          </div>
        )}
      </div>
    </article>
  )
}

export default ListingCard

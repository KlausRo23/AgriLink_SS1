import { useState } from "react"
import { Archive, CalendarDays, MoreHorizontal, Pencil } from "lucide-react"
import "../../styles/inventory.css"

const STATUS_LABELS = {
  fresh: "Fresh",
  "near-spoiling": "Near Spoiling",
  spoiled: "Spoiled",
}

function formatDate(value) {
  if (!value) return "Not set"
  const date = new Date(`${value}T12:00:00`)
  if (Number.isNaN(date.getTime())) return "Not set"
  return new Intl.DateTimeFormat("en-PH", {
    month: "short",
    day: "numeric",
    year: "numeric",
  }).format(date)
}

function InventoryCard({ item, onView, onEdit, onArchive }) {
  const [isMenuOpen, setIsMenuOpen] = useState(false)
  const status = STATUS_LABELS[item.status] ? item.status : "fresh"
  const categoryLabel = item.category === "supply" ? "Farm supply" : "Harvested crop"

  function runAction(action) {
    setIsMenuOpen(false)
    action?.(item)
  }

  return (
    <article className={`inventory-card inventory-card--${status}`}>
      <button
        type="button"
        className="inventory-card-open"
        onClick={() => onView?.(item)}
        aria-label={`View ${item.name} inventory details`}
      />
      <div className={`inventory-card-visual inventory-visual--${item.visual || "leafy"}`}>
        {item.image ? (
          <img src={item.image} alt="" />
        ) : (
          <div className="inventory-visual-art" aria-hidden="true">
            <span className="inventory-visual-glow" />
            <span className="inventory-visual-emoji">{item.emoji || "🥬"}</span>
            <span className="inventory-visual-caption">{item.name}</span>
          </div>
        )}
        <span className={`inventory-status-badge inventory-status-badge--${status}`}>
          <i aria-hidden="true" /> {STATUS_LABELS[status]}
        </span>
      </div>

      <div className="inventory-card-date">
        <CalendarDays size={13} aria-hidden="true" />
        <span>{item.category === "supply" ? "Received" : "Harvested"}</span>
        <strong>{formatDate(item.harvestDate)}</strong>
      </div>

      <div className="inventory-card-content">
        <div className="inventory-card-info">
          <h2>{item.name}</h2>
          <span>{categoryLabel}</span>
        </div>
        <div className="inventory-card-quantity">
          <span>Available</span>
          <strong>{item.quantity} <small>{item.unit}</small></strong>
        </div>
      </div>

      <span className="inventory-card-hint">Open item details <span aria-hidden="true">→</span></span>

      <div className={`inventory-card-menu${isMenuOpen ? " is-open" : ""}`}>
        <button
          type="button"
          className="inventory-card-menu-trigger"
          aria-label={`More actions for ${item.name}`}
          aria-expanded={isMenuOpen}
          aria-haspopup="menu"
          onClick={() => setIsMenuOpen((open) => !open)}
          onKeyDown={(event) => {
            if (event.key === "Escape") setIsMenuOpen(false)
          }}
        >
          <MoreHorizontal size={18} aria-hidden="true" />
        </button>
        {isMenuOpen && (
          <div className="inventory-card-menu-list" role="menu" aria-label={`${item.name} actions`}>
            <button type="button" role="menuitem" onClick={() => runAction(onEdit)}>
              <Pencil size={14} aria-hidden="true" /> Edit item
            </button>
            <button type="button" role="menuitem" className="is-danger" onClick={() => runAction(onArchive)}>
              <Archive size={14} aria-hidden="true" /> Archive item
            </button>
          </div>
        )}
      </div>
    </article>
  )
}

export default InventoryCard

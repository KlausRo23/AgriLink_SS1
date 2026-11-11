import { useState } from "react"
import { Archive, ArrowRight, CalendarDays, Clock3, MoreHorizontal, Pencil, Sprout } from "lucide-react"
import { formatCropDate } from "../../utils/cropLifecycle"
import { getAssetUrl } from "../../api/api"
import "../../styles/crops.css"

const STATUS_LABELS = {
  growing: "Growing",
  "ready-to-harvest": "Ready to harvest",
  overdue: "Overdue",
  harvested: "Harvested",
}

function CropCard({ crop, lifecycleStatus = "growing", onEdit, onArchive, onView }) {
  const [isMenuOpen, setIsMenuOpen] = useState(false)
  const [failedImageSource, setFailedImageSource] = useState("")
  const statusLabel = STATUS_LABELS[lifecycleStatus]
  const imageSource = crop.imageUrl || crop.image

  function runAction(action) {
    setIsMenuOpen(false)
    action?.(crop)
  }

  return (
    <article className={`crop-card crop-card--${lifecycleStatus}`}>
      <button
        type="button"
        className="crop-card-open"
        onClick={() => onView?.(crop)}
        aria-label={`View ${crop.name} crop details`}
      />
      <div className="crop-card-image">
        {imageSource && failedImageSource !== imageSource ? (
          <img
            src={getAssetUrl(imageSource)}
            alt={`${crop.name} crop`}
            onError={() => setFailedImageSource(imageSource)}
          />
        ) : (
          <div className="crop-card-image-placeholder" aria-label={`${crop.name} image placeholder`}>
            <span className="crop-placeholder-orbit crop-placeholder-orbit-one" />
            <span className="crop-placeholder-orbit crop-placeholder-orbit-two" />
            <Sprout size={48} strokeWidth={1.2} aria-hidden="true" />
            <span className="crop-image-caption">{crop.name}</span>
          </div>
        )}
        <span className={`crop-status-badge crop-status-badge--${lifecycleStatus}`}>{statusLabel}</span>
        <div className={`crop-card-menu${isMenuOpen ? " is-open" : ""}`}>
          <button
            type="button"
            className="crop-card-menu-trigger"
            aria-label={`More actions for ${crop.name}`}
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
            <div className="crop-card-menu-list" role="menu" aria-label={`${crop.name} actions`}>
              {lifecycleStatus !== "harvested" && (
                <button type="button" role="menuitem" onClick={() => runAction(onEdit)}>
                  <Pencil size={14} aria-hidden="true" /> Edit crop
                </button>
              )}
              <button type="button" role="menuitem" className="is-danger" onClick={() => runAction(onArchive)}>
                <Archive size={14} aria-hidden="true" /> Archive crop
              </button>
            </div>
          )}
        </div>
      </div>

      <div className="crop-card-content">
        <div className="crop-card-title-row">
          <h2>{crop.name}</h2>
          {crop.seedlings != null && <span className="crop-quantity">{crop.seedlings} seedlings</span>}
        </div>
        <div className="crop-card-dates">
          <span><CalendarDays size={14} aria-hidden="true" /><strong>Planted:</strong> {formatCropDate(crop.datePlanted)}</span>
          <span><Clock3 size={14} aria-hidden="true" /><strong>Est. harvest:</strong> {formatCropDate(crop.harvestDate)}</span>
        </div>
        {crop.description && <p className="crop-card-description">{crop.description}</p>}
        <div className="crop-card-footer">
          <span className="crop-view-button">
            View crop <ArrowRight size={14} aria-hidden="true" />
          </span>
          <span className="crop-category">{crop.category || "Crop"}</span>
        </div>
      </div>
    </article>
  )
}

export default CropCard

import { ArrowRight, CalendarDays, Clock3, Pencil, Sprout, Trash2 } from "lucide-react"
import { formatCropDate } from "../../utils/cropLifecycle"
import "../../styles/crops.css"

const STATUS_LABELS = {
  growing: "Growing",
  "ready-to-harvest": "Ready to harvest",
  overdue: "Overdue",
}

function CropCard({ crop, lifecycleStatus = "growing", onEdit, onDelete, onView }) {
  const statusLabel = STATUS_LABELS[lifecycleStatus]

  return (
    <article className={`crop-card crop-card--${lifecycleStatus}`} tabIndex={0}>
      <div className="crop-card-image">
        {crop.image ? (
          <img src={crop.image} alt={`${crop.name} crop`} />
        ) : (
          <div className="crop-card-image-placeholder" aria-label={`${crop.name} image placeholder`}>
            <span className="crop-placeholder-orbit crop-placeholder-orbit-one" />
            <span className="crop-placeholder-orbit crop-placeholder-orbit-two" />
            <Sprout size={48} strokeWidth={1.2} aria-hidden="true" />
            <span className="crop-image-caption">{crop.name}</span>
          </div>
        )}
        <span className={`crop-status-badge crop-status-badge--${lifecycleStatus}`}>{statusLabel}</span>
        <div className="crop-card-actions" aria-label={`${crop.name} actions`}>
          <button type="button" className="crop-action-button crop-action-edit" onClick={() => onEdit?.(crop)} aria-label={`Edit ${crop.name}`}>
            <Pencil size={15} aria-hidden="true" />
          </button>
          <button type="button" className="crop-action-button crop-action-delete" onClick={() => onDelete?.(crop)} aria-label={`Delete ${crop.name}`}>
            <Trash2 size={15} aria-hidden="true" />
          </button>
        </div>
      </div>

      <div className="crop-card-content">
        <div className="crop-card-title-row">
          <h2>{crop.name}</h2>
          {crop.quantity != null && <span className="crop-quantity">{crop.quantity} plants</span>}
        </div>
        <div className="crop-card-dates">
          <span><CalendarDays size={14} aria-hidden="true" /><strong>Planted:</strong> {formatCropDate(crop.datePlanted)}</span>
          <span><Clock3 size={14} aria-hidden="true" /><strong>Est. harvest:</strong> {formatCropDate(crop.harvestDate)}</span>
        </div>
        {crop.description && <p className="crop-card-description">{crop.description}</p>}
        <div className="crop-card-footer">
          <button type="button" className="crop-view-button" onClick={() => onView?.(crop)}>
            View crop <ArrowRight size={14} aria-hidden="true" />
          </button>
          <span className="crop-category">{crop.category || "Crop"}</span>
        </div>
      </div>
    </article>
  )
}

export default CropCard

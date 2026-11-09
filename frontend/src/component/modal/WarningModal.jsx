import { AlertTriangle, ArrowLeft, Sprout, X } from "lucide-react"
import "../../styles/harvest-modals.css"

function WarningModal({ open, cropName, daysEarly, onCancel, onConfirm }) {
  if (!open) return null

  return (
    <div
      className="harvest-modal-backdrop harvest-warning-backdrop"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) onCancel?.()
      }}
    >
      <section className="harvest-warning-modal" role="alertdialog" aria-modal="true" aria-labelledby="early-harvest-title" aria-describedby="early-harvest-description">
        <button type="button" className="harvest-modal-close" onClick={onCancel} aria-label="Cancel early harvest">
          <X size={19} aria-hidden="true" />
        </button>
        <span className="harvest-warning-icon"><AlertTriangle size={25} aria-hidden="true" /></span>
        <p className="harvest-warning-eyebrow">Early harvest</p>
        <h2 id="early-harvest-title">This crop may not be ready yet</h2>
        <p id="early-harvest-description">
          {cropName || "This crop"} is estimated to be ready in <strong>{daysEarly} {daysEarly === 1 ? "day" : "days"}</strong>.
          Harvesting now may reduce its yield or quality.
        </p>
        <p className="harvest-warning-question">Do you still want to record this harvest?</p>
        <div className="harvest-warning-actions">
          <button type="button" className="harvest-cancel-button" onClick={onCancel}>
            <ArrowLeft size={15} aria-hidden="true" /> Review details
          </button>
          <button type="button" className="harvest-warning-confirm" onClick={onConfirm}>
            <Sprout size={16} aria-hidden="true" /> Harvest early
          </button>
        </div>
      </section>
    </div>
  )
}

export default WarningModal

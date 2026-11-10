import { AlertTriangle, CalendarDays, Clock3, X } from "lucide-react"
import { formatCropDate } from "../../utils/cropLifecycle"
import "../../styles/crops.css"

const STATUS_LABELS = {
  overdue: "Overdue",
  ready: "Ready to harvest",
  "harvest-soon": "In 3 days",
}

function ProgressLogsModal({ crops, onClose }) {
  return (
    <div
      className="progress-modal-backdrop"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) onClose()
      }}
    >
      <section className="progress-modal" role="dialog" aria-modal="true" aria-labelledby="progress-modal-title">
        <header className="progress-modal-header">
          <div className="progress-modal-icon"><AlertTriangle size={19} aria-hidden="true" /></div>
          <div>
            <p className="progress-modal-eyebrow">Crop alerts</p>
            <h2 id="progress-modal-title">Progress logs</h2>
            <p>Keep track of overdue crops, harvest-ready crops, and crops nearing their harvest date.</p>
          </div>
          <button type="button" className="crop-dialog-close" onClick={onClose} aria-label="Close progress logs">
            <X size={19} />
          </button>
        </header>
        <div className="progress-modal-content">
          {crops.length ? (
            <ul className="progress-list">
              {crops.map((crop) => (
                <li className={`progress-list-item progress-list-item--${crop.progressStatus}`} key={crop.id}>
                  <span className="progress-list-status">{STATUS_LABELS[crop.progressStatus]}</span>
                  <span className="progress-list-details">
                    <strong>{crop.name}</strong>
                    <span>{crop.category || "Crop"}</span>
                  </span>
                  <span className="progress-list-date">
                    <span><CalendarDays size={13} aria-hidden="true" /> Est. harvest</span>
                    <strong>{formatCropDate(crop.harvestDate)}</strong>
                    {crop.progressStatus === "overdue" && <span><Clock3 size={13} aria-hidden="true" /> Past due</span>}
                  </span>
                </li>
              ))}
            </ul>
          ) : (
            <div className="progress-empty-state">
              <AlertTriangle size={26} aria-hidden="true" />
              <strong>No crop alerts</strong>
              <span>No crops are overdue, ready to harvest, or three days from harvest.</span>
            </div>
          )}
        </div>
      </section>
    </div>
  )
}

export default ProgressLogsModal

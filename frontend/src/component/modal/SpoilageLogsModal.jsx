import { useEffect } from "react"
import { AlertTriangle, CalendarDays, Clock3, X } from "lucide-react"
import { formatCropDate } from "../../utils/cropLifecycle"
import "../../styles/crops.css"

function SpoilageLogsModal({ crops, onClose }) {
  useEffect(() => {
    function handleKeyDown(event) {
      if (event.key === "Escape") onClose()
    }

    window.addEventListener("keydown", handleKeyDown)
    return () => window.removeEventListener("keydown", handleKeyDown)
  }, [onClose])

  return (
    <div
      className="spoilage-modal-backdrop"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) onClose()
      }}
    >
      <section className="spoilage-modal" role="dialog" aria-modal="true" aria-labelledby="spoilage-modal-title">
        <header className="spoilage-modal-header">
          <div className="spoilage-modal-icon"><AlertTriangle size={19} aria-hidden="true" /></div>
          <div>
            <p className="spoilage-modal-eyebrow">Crop alerts</p>
            <h2 id="spoilage-modal-title">Crop Progress</h2>
            <p>Overdue and near-overdue crops based on their estimated sell-by date.</p>
          </div>
          <button type="button" className="crop-dialog-close" onClick={onClose} aria-label="Close spoilage logs">
            <X size={19} aria-hidden="true" />
          </button>
        </header>
        <div className="spoilage-modal-content">
          {crops.length ? (
            <ul className="spoilage-list">
              {crops.map((crop) => (
                <li className={`spoilage-list-item spoilage-list-item--${crop.spoilageStatus}`} key={crop.id}>
                  <span className="spoilage-list-status">
                    {crop.spoilageStatus === "overdue" ? "Overdue" : "Near overdue"}
                  </span>
                  <div className="spoilage-list-details">
                    <strong>{crop.name}</strong>
                    <span>{crop.quantity != null ? `${crop.quantity} plants` : crop.category || "Crop"}</span>
                  </div>
                  <span className="spoilage-list-date">
                    {crop.spoilageStatus === "overdue" ? <AlertTriangle size={14} aria-hidden="true" /> : <Clock3 size={14} aria-hidden="true" />}
                    <span><CalendarDays size={13} aria-hidden="true" /> {formatCropDate(crop.sellDate)}</span>
                  </span>
                </li>
              ))}
            </ul>
          ) : (
            <div className="spoilage-empty-state">
              <CalendarDays size={25} aria-hidden="true" />
              <strong>No spoilage alerts</strong>
              <span>No crops are overdue or nearing their sell-by date.</span>
            </div>
          )}
        </div>
      </section>
    </div>
  )
}

export default SpoilageLogsModal
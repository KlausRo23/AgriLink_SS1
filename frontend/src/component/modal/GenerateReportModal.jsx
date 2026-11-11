import { useEffect, useState } from "react"
import { BarChart3, Check, Download, Leaf, X } from "lucide-react"
import "../../styles/dashboard.css"

const currency = new Intl.NumberFormat("en-PH", { style: "currency", currency: "PHP" })
const reportDateFormatter = new Intl.DateTimeFormat("en-PH", { dateStyle: "medium" })

function GenerateReportModal({ open, onClose, reportData }) {
  const [generated, setGenerated] = useState(false)
  const [generationError, setGenerationError] = useState("")

  useEffect(() => {
    if (!open) return undefined

    function handleKeyDown(event) {
      if (event.key === "Escape") onClose?.()
    }

    document.addEventListener("keydown", handleKeyDown)
    return () => document.removeEventListener("keydown", handleKeyDown)
  }, [open, onClose])

  if (!open) return null

  const {
    farmName,
    farmerName,
    reportDate,
    period,
    attention,
    freshness,
    upcomingHarvests,
    listings,
    recentListings,
    salesTotal,
  } = reportData
  const inventoryTotal = freshness.fresh + freshness.nearSpoiling + freshness.spoiled
  const summary = [
    { label: "Inventory items", value: inventoryTotal },
    { label: "Growing crops", value: attention.find((item) => item.label === "Growing crops")?.value ?? 0 },
    { label: "Need attention", value: freshness.nearSpoiling + freshness.spoiled },
    { label: "Listings pending", value: listings.pending ?? 0 },
  ]

  function printReport() {
    setGenerationError("")
    if (typeof window.print !== "function") {
      setGenerationError("Printing is not available in this browser.")
      return
    }
    setGenerated(true)
    window.setTimeout(() => window.print(), 0)
  }

  return (
    <div
      className="report-modal-backdrop"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) onClose?.()
      }}
    >
      <section
        className="report-modal report-dashboard-modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="report-modal-title"
        aria-describedby="report-modal-description"
      >
        <header className="report-modal-header">
          <div className="report-modal-title-wrap">
            <span className="report-modal-title-icon"><BarChart3 size={20} aria-hidden="true" /></span>
            <div>
              <h2 id="report-modal-title">Farm dashboard report</h2>
              <p id="report-modal-description">A concise summary of your farm’s current status.</p>
            </div>
          </div>
          <button type="button" className="dashboard-icon-button report-modal-close" onClick={onClose} aria-label="Close report dialog">
            <X size={20} aria-hidden="true" />
          </button>
        </header>

        <div className="report-modal-content">
          <article className="report-document" aria-label="Farm dashboard summary report">
            <header className="report-document-header">
              <div>
                <span className="report-document-brand"><Leaf size={17} aria-hidden="true" /> AgriLink</span>
                <h3>Farm Summary</h3>
                <p>{period}</p>
              </div>
              <span className="report-document-period">{reportDate}</span>
            </header>

            <dl className="report-document-meta">
              <div><dt>Farm</dt><dd>{farmName || "Farm"}</dd></div>
              <div><dt>Farmer</dt><dd>{farmerName || "Farmer"}</dd></div>
              <div><dt>Report date</dt><dd>{reportDate}</dd></div>
            </dl>

            <section className="report-document-section">
              <h4>At a glance</h4>
              <dl className="report-summary-grid">
                {summary.map((item) => (
                  <div key={item.label}>
                    <dt>{item.label}</dt>
                    <dd>{item.value}</dd>
                  </div>
                ))}
              </dl>
              {salesTotal !== null && salesTotal !== undefined && (
                <p className="report-summary-sales">Lifetime completed-order sales <strong>{currency.format(salesTotal)}</strong></p>
              )}
            </section>

            <div className="report-summary-columns">
              <section className="report-document-section">
                <h4>Inventory condition</h4>
                <dl className="report-summary-list">
                  <div><dt>Fresh</dt><dd>{freshness.fresh}</dd></div>
                  <div><dt>Near spoiling</dt><dd>{freshness.nearSpoiling}</dd></div>
                  <div><dt>Spoiled</dt><dd>{freshness.spoiled}</dd></div>
                </dl>
              </section>
              <section className="report-document-section">
                <h4>Listings</h4>
                <dl className="report-summary-list">
                  {Object.entries(listings).map(([status, count]) => (
                    <div key={status}>
                      <dt>{status[0].toUpperCase() + status.slice(1)}</dt>
                      <dd>{count}</dd>
                    </div>
                  ))}
                </dl>
              </section>
            </div>

            <section className="report-document-section report-summary-section">
              <h4>Upcoming harvests</h4>
              {upcomingHarvests.length ? (
                <ul className="report-summary-items">
                  {upcomingHarvests.slice(0, 4).map((crop) => (
                    <li key={crop.id}>
                      <strong>{crop.name}</strong>
                      <span>{crop.lifecycleStatus === "ready-to-harvest" ? "Ready" : `${crop.daysUntilHarvest} days`}</span>
                    </li>
                  ))}
                </ul>
              ) : <p className="report-document-empty">No upcoming harvest dates are scheduled.</p>}
            </section>

            <section className="report-document-section report-summary-section">
              <h4>Recent listings</h4>
              {recentListings.length ? (
                <ul className="report-summary-items">
                  {recentListings.slice(0, 4).map((listing) => (
                    <li key={listing.id}>
                      <strong>{listing.name} · {listing.stock} {listing.unit}</strong>
                      <span>{listing.status} · {reportDateFormatter.format(new Date(listing.createdAt))}</span>
                    </li>
                  ))}
                </ul>
              ) : <p className="report-document-empty">No recent listings.</p>}
            </section>

            <footer className="report-document-footer">
              <span>AgriLink · Farm summary</span>
              <span>{reportDate}</span>
            </footer>
          </article>
          {generated && <p className="report-generated-message" role="status"><Check size={16} aria-hidden="true" /> Print dialog opened. Choose “Save as PDF” to download the report.</p>}
          {generationError && <p className="dashboard-report-error" role="alert">{generationError}</p>}
        </div>

        <footer className="report-modal-footer">
          <button type="button" className="report-cancel-button" onClick={onClose}>Close</button>
          <button type="button" className="dashboard-report-button" onClick={printReport}>
            <Download size={16} aria-hidden="true" /> Print / Save PDF
          </button>
        </footer>
      </section>
    </div>
  )
}

export default GenerateReportModal

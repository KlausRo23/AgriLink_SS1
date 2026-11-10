import { useEffect, useMemo, useState } from "react"
import { BarChart3, Check, Download, Leaf, X } from "lucide-react"
import "../../styles/dashboard.css"

function GenerateReportModal({ open, onClose, reportData }) {
  const [generated, setGenerated] = useState(false)
  const [generationError, setGenerationError] = useState("")

  const salesPoints = useMemo(() => {
    const data = reportData.sales.data
    const width = 560
    const height = 150
    const points = data.map((value, index) => {
      const x = 12 + (index * (width - 24)) / Math.max(data.length - 1, 1)
      const y = height - 12 - (value / 100) * (height - 24)
      return `${x},${y}`
    })
    return points.join(" ")
  }, [reportData.sales.data])

  useEffect(() => {
    if (!open) return undefined

    function handleKeyDown(event) {
      if (event.key === "Escape") onClose?.()
    }

    document.addEventListener("keydown", handleKeyDown)
    return () => document.removeEventListener("keydown", handleKeyDown)
  }, [open, onClose])

  if (!open) return null

  const { farmName, farmerName, reportDate, period, attention, stocks, sales, freshness, upcomingHarvests, orders } = reportData
  const freshnessTotal = freshness.fresh + freshness.nearSpoiling + freshness.spoiled
  const freshEnd = freshnessTotal ? (freshness.fresh / freshnessTotal) * 100 : 0
  const nearEnd = freshnessTotal ? ((freshness.fresh + freshness.nearSpoiling) / freshnessTotal) * 100 : 0
  const freshnessBackground = freshnessTotal
    ? `conic-gradient(#526b3a 0% ${freshEnd}%, #c99d3b ${freshEnd}% ${nearEnd}%, #c5573c ${nearEnd}% 100%)`
    : "#e6e9e0"

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
              <p id="report-modal-description">A printable snapshot of the information on your dashboard.</p>
            </div>
          </div>
          <button type="button" className="dashboard-icon-button report-modal-close" onClick={onClose} aria-label="Close report dialog">
            <X size={20} aria-hidden="true" />
          </button>
        </header>

        <div className="report-modal-content">
          <article className="report-document" aria-label="Farm dashboard report preview">
            <header className="report-document-header">
              <div>
                <span className="report-document-brand"><Leaf size={17} aria-hidden="true" /> AgriLink</span>
                <h3>Farm Dashboard Report</h3>
                <p>Dashboard summary for {period.toLowerCase()}</p>
              </div>
              <span className="report-document-period">{period}</span>
            </header>

            <dl className="report-document-meta">
              <div><dt>Farm</dt><dd>{farmName || "Farm"}</dd></div>
              <div><dt>Farmer</dt><dd>{farmerName || "Farmer"}</dd></div>
              <div><dt>Report date</dt><dd>{reportDate}</dd></div>
            </dl>

            <section className="report-document-section">
              <div className="report-document-section-heading">
                <h4>Needs attention</h4>
                <span>Current farm status</span>
              </div>
              <div className="report-attention-grid">
                {attention.map((item) => (
                  <div className="report-attention-card" key={item.label}>
                    <span>{item.label}</span>
                    <strong>{item.value}</strong>
                    <small>{item.note}</small>
                  </div>
                ))}
              </div>
            </section>

            <div className="report-document-chart-grid">
              <section className="report-document-section report-chart-card">
                <div className="report-document-section-heading">
                  <h4>Stock levels</h4>
                  <span>Current quantity by item</span>
                </div>
                <div className="report-stock-chart">
                  {stocks.map((item) => (
                    <div className="report-stock-column" key={item.name}>
                      <strong>{item.quantity}</strong>
                      <span className={`report-stock-bar is-${item.status}`} style={{ height: `${Math.min(100, (item.quantity / 100) * 100)}%` }} />
                      <small>{item.name}</small>
                    </div>
                  ))}
                </div>
                <p className="report-chart-legend"><i className="is-stock" /> In stock <i className="is-low" /> Low stock</p>
              </section>

              <section className="report-document-section report-chart-card">
                <div className="report-document-section-heading">
                  <h4>Sales overview</h4>
                  <span>{sales.caption}</span>
                </div>
                <div className="report-sales-total">
                  <strong>{sales.amount}</strong>
                  <span>{sales.change} vs previous period</span>
                </div>
                <svg className="report-sales-chart" viewBox="0 0 560 150" role="img" aria-label={`${sales.caption}: ${sales.amount}`}>
                  {[0, 1, 2, 3].map((line) => {
                    const y = 12 + (line * 126) / 3
                    return <line key={line} x1="12" x2="548" y1={y} y2={y} />
                  })}
                  <polyline points={salesPoints} />
                </svg>
                <div className="report-sales-labels">{sales.labels.filter((_, index) => index % 2 === 0).map((label, index) => <span key={`${label}-${index}`}>{label}</span>)}</div>
              </section>

              <section className="report-document-section report-chart-card">
                <div className="report-document-section-heading">
                  <h4>Freshness</h4>
                  <span>Inventory condition at a glance</span>
                </div>
                <div className="report-freshness-layout">
                  <div className="report-freshness-donut" style={{ background: freshnessBackground }}>
                    <div><strong>{freshnessTotal}</strong><span>items</span></div>
                  </div>
                  <ul className="report-freshness-legend">
                    <li><span><i className="is-fresh" /> Fresh</span><strong>{freshness.fresh}</strong></li>
                    <li><span><i className="is-near" /> Near spoiling</span><strong>{freshness.nearSpoiling}</strong></li>
                    <li><span><i className="is-spoiled" /> Spoiled</span><strong>{freshness.spoiled}</strong></li>
                  </ul>
                </div>
              </section>

              <section className="report-document-section report-chart-card">
                <div className="report-document-section-heading">
                  <h4>Upcoming harvests</h4>
                  <span>Ready dates for active crops</span>
                </div>
                {upcomingHarvests.length ? (
                  <ul className="report-harvest-list">
                    {upcomingHarvests.map((crop) => (
                      <li key={crop.id}>
                        <div><strong>{crop.name}</strong><span>{crop.lifecycleStatus === "ready-to-harvest" ? "Ready" : `${crop.daysUntilHarvest}d left`}</span></div>
                        <span className="report-harvest-track"><i style={{ width: `${crop.harvestProgress}%` }} /></span>
                      </li>
                    ))}
                  </ul>
                ) : <p className="report-document-empty">No upcoming harvest dates are scheduled.</p>}
              </section>
            </div>

            <section className="report-document-section report-orders-section">
              <div className="report-document-section-heading">
                <h4>Recent orders</h4>
                <span>Latest customer order activity</span>
              </div>
              {orders.length ? (
                <table className="report-orders-table">
                  <thead><tr><th>Order</th><th>Buyer</th><th>Items</th><th>Date</th><th>Status</th><th>Total</th></tr></thead>
                  <tbody>
                    {orders.map((order) => (
                      <tr key={order.id}>
                        <td>{order.id}</td><td>{order.buyer}</td><td>{order.items}</td><td>{order.date}</td><td>{order.status}</td><td>{order.amount}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              ) : <p className="report-document-empty">No recent orders.</p>}
            </section>

            <footer className="report-document-footer">
              <span>AgriLink · Farm dashboard report</span>
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

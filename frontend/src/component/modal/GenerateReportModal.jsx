import { useEffect, useState } from "react"
import { BarChart3, Check, Download, PieChart, X } from "lucide-react"
import "../../styles/dashboard.css"

const REPORTS = {
  Sales: {
    icon: BarChart3,
    description: "Sales distribution by crop",
    total: "₱24,860",
    slices: [
      { label: "Cabbage", value: 38, color: "#526b3a" },
      { label: "Carrots", value: 27, color: "#c27b32" },
      { label: "Tomatoes", value: 21, color: "#c5573c" },
      { label: "Other", value: 14, color: "#8fa378" },
    ],
  },
  Inventory: {
    icon: PieChart,
    description: "Inventory distribution by category",
    total: "24 items",
    slices: [
      { label: "Produce", value: 44, color: "#526b3a" },
      { label: "Seeds", value: 24, color: "#c27b32" },
      { label: "Fertilizer", value: 20, color: "#8fa378" },
      { label: "Supplies", value: 12, color: "#557d8b" },
    ],
  },
}

const PERIODS = ["This month", "This quarter", "This year"]

function GenerateReportModal({ open, onClose, onGenerate }) {
  const [reportType, setReportType] = useState("Sales")
  const [period, setPeriod] = useState(PERIODS[0])
  const [generated, setGenerated] = useState(false)
  const [generationError, setGenerationError] = useState("")
  const report = REPORTS[reportType]

  useEffect(() => {
    if (!open) return undefined

    function handleKeyDown(event) {
      if (event.key === "Escape") onClose?.()
    }

    document.addEventListener("keydown", handleKeyDown)
    return () => document.removeEventListener("keydown", handleKeyDown)
  }, [open, onClose])

  if (!open) return null

  const gradient = `conic-gradient(${report.slices
    .map((slice, index, slices) => {
      const start = slices.slice(0, index).reduce((sum, item) => sum + item.value, 0)
      return `${slice.color} ${start}% ${start + slice.value}%`
    })
    .join(", ")})`

  async function handleGenerate() {
    setGenerationError("")
    try {
      if (onGenerate) await onGenerate({ reportType, period })
      setGenerated(true)
    } catch (error) {
      setGenerationError(error?.message || "Could not generate the report. Please try again.")
    }
  }

  return (
    <div
      className="report-modal-backdrop"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) onClose?.()
      }}
    >
      <section
        className="report-modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="report-modal-title"
        aria-describedby="report-modal-description"
      >
        <header className="report-modal-header">
          <div className="report-modal-title-wrap">
            <span className="report-modal-title-icon"><PieChart size={20} aria-hidden="true" /></span>
            <div>
              <h2 id="report-modal-title">Generate report</h2>
              <p id="report-modal-description">Choose a report and review its breakdown.</p>
            </div>
          </div>
          <button type="button" className="dashboard-icon-button report-modal-close" onClick={onClose} aria-label="Close report dialog">
            <X size={20} aria-hidden="true" />
          </button>
        </header>

        <div className="report-modal-content">
          <div className="report-type-tabs" role="tablist" aria-label="Report type">
            {Object.entries(REPORTS).map(([name, value]) => {
              const Icon = value.icon
              const selected = reportType === name
              return (
                <button
                  type="button"
                  key={name}
                  role="tab"
                  aria-selected={selected}
                  className={selected ? "is-selected" : ""}
                  onClick={() => {
                    setReportType(name)
                    setGenerated(false)
                  }}
                >
                  <Icon size={17} aria-hidden="true" />
                  {name}
                </button>
              )
            })}
          </div>

          <div className="report-period-row">
            <label htmlFor="report-period">Report period</label>
            <select id="report-period" value={period} onChange={(event) => {
              setPeriod(event.target.value)
              setGenerated(false)
            }}>
              {PERIODS.map((option) => <option key={option} value={option}>{option}</option>)}
            </select>
          </div>

          <div className="report-preview-card">
            <div className="report-preview-heading">
              <div><h3>{reportType} breakdown</h3><p>{report.description} · {period.toLowerCase()}</p></div>
              <span className="report-preview-total">{report.total}</span>
            </div>
            <div className="report-pie-layout">
              <div className="report-pie-chart" style={{ background: gradient }} role="img" aria-label={`${reportType} pie chart`}>
                <div><strong>{reportType}</strong><span>Overview</span></div>
              </div>
              <ul className="report-pie-legend">
                {report.slices.map((slice) => (
                  <li key={slice.label}>
                    <span className="report-legend-label"><i style={{ backgroundColor: slice.color }} />{slice.label}</span>
                    <strong>{slice.value}%</strong>
                  </li>
                ))}
              </ul>
            </div>
          </div>
          {generated && (
            <p className="report-generated-message" role="status">
              <Check size={16} aria-hidden="true" /> {onGenerate ? "Report generated." : "Sample report preview is ready."}
            </p>
          )}
          {generationError && <p className="dashboard-report-error" role="alert">{generationError}</p>}
        </div>

        <footer className="report-modal-footer">
          <button type="button" className="report-cancel-button" onClick={onClose}>Cancel</button>
          <button type="button" className="dashboard-report-button" onClick={handleGenerate}>
            {generated ? <Check size={16} aria-hidden="true" /> : <Download size={16} aria-hidden="true" />}
            {generated ? "Preview ready" : "Generate report"}
          </button>
        </footer>
      </section>
    </div>
  )
}

export default GenerateReportModal

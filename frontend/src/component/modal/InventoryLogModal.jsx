import { useEffect, useMemo, useState } from "react"
import { AlertTriangle, CalendarDays, ChevronLeft, ChevronRight, Search, X } from "lucide-react"
import "../../styles/inventory.css"

const DAY_IN_MS = 24 * 60 * 60 * 1000

function parseLocalDate(value) {
  const date = new Date(`${value}T12:00:00`)
  return Number.isNaN(date.getTime()) ? null : date
}

function toDateKey(date) {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, "0")
  const day = String(date.getDate()).padStart(2, "0")
  return `${year}-${month}-${day}`
}

function getWeekStart(date) {
  const weekStart = new Date(date)
  const dayFromMonday = (weekStart.getDay() + 6) % 7
  weekStart.setDate(weekStart.getDate() - dayFromMonday)
  weekStart.setHours(12, 0, 0, 0)
  return weekStart
}

function formatMonth(date) {
  return new Intl.DateTimeFormat("en-PH", { month: "long", year: "numeric" }).format(date)
}

function formatLogDate(value) {
  const date = parseLocalDate(value)
  if (!date) return "Date not set"
  return new Intl.DateTimeFormat("en-PH", { month: "short", day: "numeric", year: "numeric" }).format(date)
}

function getDefaultDate(logs) {
  const countsByDate = new Map()
  logs.forEach((log) => countsByDate.set(log.date, (countsByDate.get(log.date) || 0) + 1))
  return [...countsByDate.entries()]
    .sort(([firstDate, firstCount], [secondDate, secondCount]) => secondCount - firstCount || secondDate.localeCompare(firstDate))[0]?.[0]
    || toDateKey(new Date())
}

function InventoryLogModal({ inventory, onClose }) {
  const logs = useMemo(() => inventory
    .filter((item) => item.category === "crop" && (item.status === "near-spoiling" || item.status === "spoiled"))
    .map((item) => ({
      ...item,
      date: item.harvestDate,
      severity: item.status === "spoiled" ? "extreme" : "routine",
    }))
    .filter((item) => parseLocalDate(item.date))
    .sort((first, second) => first.date.localeCompare(second.date)), [inventory])
  const [selectedDate, setSelectedDate] = useState(() => getDefaultDate(logs))
  const selectedDateValue = parseLocalDate(selectedDate) || new Date()
  const weekStart = getWeekStart(selectedDateValue)
  const visibleLogs = logs.filter((log) => log.date === selectedDate)
  const todayKey = toDateKey(new Date())

  useEffect(() => {
    const previousOverflow = document.body.style.overflow
    document.body.style.overflow = "hidden"

    function handleKeyDown(event) {
      if (event.key === "Escape") onClose()
    }

    window.addEventListener("keydown", handleKeyDown)
    return () => {
      document.body.style.overflow = previousOverflow
      window.removeEventListener("keydown", handleKeyDown)
    }
  }, [onClose])

  function moveWeek(amount) {
    const nextDate = new Date(selectedDateValue)
    nextDate.setTime(nextDate.getTime() + amount * 7 * DAY_IN_MS)
    setSelectedDate(toDateKey(nextDate))
  }

  function changeMonth(event) {
    if (!event.target.value) return
    const [year, month] = event.target.value.split("-").map(Number)
    setSelectedDate(toDateKey(new Date(year, month - 1, 1, 12)))
  }

  return (
    <div
      className="inventory-log-backdrop"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) onClose()
      }}
    >
      <section className="inventory-log-modal" role="dialog" aria-modal="true" aria-labelledby="inventory-log-title">
        <header className="inventory-log-header">
          <div>
            <h2 id="inventory-log-title">Spoilage Logs</h2>
            <p>Stay ahead of waste with alerts for crops that are close to spoiling or already spoiled.</p>
          </div>
          <button type="button" className="inventory-log-close" onClick={onClose} aria-label="Close spoilage logs">
            <X size={19} aria-hidden="true" />
          </button>
        </header>

        <div className="inventory-log-content">
          <label className="inventory-log-month">
            <span>{formatMonth(selectedDateValue)} <CalendarDays size={15} aria-hidden="true" /></span>
            <input
              type="month"
              aria-label="Choose log month"
              value={`${selectedDateValue.getFullYear()}-${String(selectedDateValue.getMonth() + 1).padStart(2, "0")}`}
              onChange={changeMonth}
            />
          </label>

          <div className="inventory-log-calendar">
            <button type="button" className="inventory-log-week-button" onClick={() => moveWeek(-1)} aria-label="Previous week">
              <ChevronLeft size={17} aria-hidden="true" />
            </button>
            <div className="inventory-log-days">
              {Array.from({ length: 7 }, (_, index) => {
                const date = new Date(weekStart)
                date.setDate(weekStart.getDate() + index)
                const dateKey = toDateKey(date)
                const isSelected = dateKey === selectedDate
                const hasLogs = logs.some((log) => log.date === dateKey)
                return (
                  <button
                    type="button"
                    className={`inventory-log-day${isSelected ? " is-selected" : ""}${hasLogs ? " has-logs" : ""}`}
                    key={dateKey}
                    onClick={() => setSelectedDate(dateKey)}
                    aria-pressed={isSelected}
                    aria-label={`${new Intl.DateTimeFormat("en-PH", { weekday: "long", month: "long", day: "numeric", year: "numeric" }).format(date)}${hasLogs ? ", has spoilage alerts" : ""}`}
                  >
                    <span>{new Intl.DateTimeFormat("en-PH", { weekday: "short" }).format(date)}</span>
                    <strong>{date.getDate()}</strong>
                    {dateKey === todayKey && <small>Today</small>}
                    {hasLogs && <i aria-hidden="true" />}
                  </button>
                )
              })}
            </div>
            <button type="button" className="inventory-log-week-button" onClick={() => moveWeek(1)} aria-label="Next week">
              <ChevronRight size={17} aria-hidden="true" />
            </button>
          </div>

          <p className="inventory-log-date-heading" aria-live="polite">
            Logs for {new Intl.DateTimeFormat("en-PH", { month: "long", day: "numeric", year: "numeric" }).format(selectedDateValue)}
          </p>
          {visibleLogs.length ? (
            <ul className="inventory-log-list">
              {visibleLogs.map((log) => (
                <li className={`inventory-log-entry inventory-log-entry--${log.severity}`} key={log.id}>
                  <span className="inventory-log-entry-icon" aria-hidden="true">
                    {log.severity === "extreme" ? <AlertTriangle size={25} /> : <Search size={25} />}
                  </span>
                  <div className="inventory-log-entry-copy">
                    <span>{log.severity === "extreme" ? "Extreme Bad" : "Routine"}</span>
                    <strong>{log.severity === "extreme" ? "Spoiled" : "Inspect"} {log.name}</strong>
                    <time dateTime={log.date}>{formatLogDate(log.date)}</time>
                  </div>
                  <span className="inventory-log-entry-quantity">{log.quantity} {log.unit}</span>
                </li>
              ))}
            </ul>
          ) : (
            <div className="inventory-log-empty">
              <CalendarDays size={26} aria-hidden="true" />
              <strong>No spoilage logs for this day</strong>
              <span>Select a marked date to review its crop alerts.</span>
            </div>
          )}
        </div>
      </section>
    </div>
  )
}

export default InventoryLogModal

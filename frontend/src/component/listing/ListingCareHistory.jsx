import { useMemo, useState } from "react"
import { CalendarDays, ChevronLeft, ChevronRight, Droplets, Leaf, Scissors, SprayCan } from "lucide-react"
import "../../styles/listings.css"

const ACTIONS = [
  { value: "watered", label: "Watered", Icon: Droplets, color: "blue" },
  { value: "fertilized", label: "Fertilized", Icon: Leaf, color: "green" },
  { value: "pesticide", label: "Pesticide", Icon: SprayCan, color: "orange" },
  { value: "pruned", label: "Pruned", Icon: Scissors, color: "purple" },
]

const WEEKDAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"]

function parseDate(value) {
  if (!value) return null
  const date = new Date(`${value}T00:00:00`)
  return Number.isNaN(date.getTime()) ? null : date
}

function dateKey(date) {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, "0")
  const day = String(date.getDate()).padStart(2, "0")
  return `${year}-${month}-${day}`
}

function formatLongDate(value) {
  const date = parseDate(value)
  return date
    ? new Intl.DateTimeFormat("en-PH", { month: "long", day: "numeric", year: "numeric" }).format(date)
    : value
}

function ListingCareHistory({ careLog }) {
  const firstEntryDate = careLog?.entries?.[0]?.date
  const defaultDate = parseDate(careLog?.harvestedOn) || parseDate(firstEntryDate) || parseDate(careLog?.datePlanted) || new Date()
  const [calendarMonth, setCalendarMonth] = useState(() => new Date(defaultDate.getFullYear(), defaultDate.getMonth(), 1))
  const [selectedDate, setSelectedDate] = useState("")
  const [hoveredDate, setHoveredDate] = useState("")

  const entriesByDate = useMemo(() => {
    const grouped = new Map()
    for (const entry of careLog?.entries || []) {
      grouped.set(entry.date, [...(grouped.get(entry.date) || []), entry])
    }
    return grouped
  }, [careLog])

  const actionCounts = useMemo(() => {
    const counts = Object.fromEntries(ACTIONS.map(({ value }) => [value, 0]))
    for (const entry of careLog?.entries || []) {
      for (const action of entry.actions || []) {
        if (action in counts) counts[action] += 1
      }
    }
    return careLog?.summary || counts
  }, [careLog])

  const calendarDays = useMemo(() => {
    const year = calendarMonth.getFullYear()
    const month = calendarMonth.getMonth()
    const offset = new Date(year, month, 1).getDay()
    const count = new Date(year, month + 1, 0).getDate()
    const days = [
      ...Array(offset).fill(null),
      ...Array.from({ length: count }, (_, index) => index + 1),
    ]
    while (days.length % 7 !== 0) days.push(null)
    return days
  }, [calendarMonth])

  if (!careLog) {
    return (
      <section className="listing-care-history" aria-labelledby="listing-care-title">
        <div className="listing-care-heading">
          <div>
            <p className="listings-eyebrow">Farm transparency</p>
            <h2 id="listing-care-title">Care history</h2>
            <p>The farmer has not shared a crop schedule for this listing.</p>
          </div>
          <span className="listing-care-private"><CalendarDays size={16} aria-hidden="true" /> Not shared</span>
        </div>
      </section>
    )
  }

  const monthLabel = new Intl.DateTimeFormat("en-PH", { month: "long", year: "numeric" }).format(calendarMonth)
  const activeDate = hoveredDate || selectedDate
  const dayEntries = entriesByDate.get(activeDate) || []

  function changeMonth(amount) {
    setCalendarMonth((month) => new Date(month.getFullYear(), month.getMonth() + amount, 1))
    setHoveredDate("")
  }

  function markersForDay(day) {
    if (!day) return []
    const date = dateKey(new Date(calendarMonth.getFullYear(), calendarMonth.getMonth(), day))
    const actions = (entriesByDate.get(date) || []).flatMap((entry) => entry.actions || [])
    const markers = [...new Set(actions)]
    if (date === careLog.datePlanted) markers.unshift("planted")
    if (date === careLog.harvestedOn) markers.unshift("harvest")
    return markers
  }

  return (
    <section className="listing-care-history" aria-labelledby="listing-care-title">
      <div className="listing-care-heading">
        <div>
          <p className="listings-eyebrow">Farm transparency</p>
          <h2 id="listing-care-title">Care history</h2>
          <p>Calendar of actions from planting to harvest. Select a day to see its details.</p>
        </div>
        {careLog.isOrganic && <span className="listing-care-organic"><Leaf size={14} aria-hidden="true" /> Organic</span>}
      </div>

      <div className="listing-care-layout">
        <div className="listing-care-calendar">
          <header className="listing-care-calendar-heading">
            <div>
              <h3>{monthLabel}</h3>
              <p>{careLog.datePlanted ? `Planted ${formatLongDate(careLog.datePlanted)}` : "Crop care schedule"}</p>
            </div>
            <div className="listing-care-month-navigation">
              <button type="button" onClick={() => changeMonth(-1)} aria-label="Previous month"><ChevronLeft size={18} /></button>
              <button type="button" onClick={() => changeMonth(1)} aria-label="Next month"><ChevronRight size={18} /></button>
            </div>
          </header>

          <div className="listing-care-calendar-grid" role="grid" aria-label={monthLabel} onMouseLeave={() => setHoveredDate("")}>
            {WEEKDAYS.map((day) => <span className="listing-care-weekday" role="columnheader" key={day}>{day}</span>)}
            {calendarDays.map((day, index) => {
              const date = day ? dateKey(new Date(calendarMonth.getFullYear(), calendarMonth.getMonth(), day)) : ""
              const markers = markersForDay(day)
              const active = date && (date === selectedDate || date === hoveredDate)
              return (
                <div className="listing-care-day-cell" role="gridcell" key={`${date || "blank"}-${index}`}>
                  {day && (
                    <button
                      type="button"
                      className={`listing-care-day${active ? " is-active" : ""}${markers.length ? " has-markers" : ""}`}
                      aria-label={`${formatLongDate(date)}${markers.length ? `, ${markers.length} care actions` : ""}`}
                      aria-pressed={date === selectedDate}
                      onMouseEnter={() => setHoveredDate(date)}
                      onFocus={() => setHoveredDate(date)}
                      onClick={() => setSelectedDate(date)}
                    >
                      <span>{day}</span>
                      <span className="listing-care-markers" aria-hidden="true">
                        {markers.slice(0, 4).map((marker, markerIndex) => <i className={`listing-care-marker marker-${marker}`} key={`${marker}-${markerIndex}`} />)}
                      </span>
                    </button>
                  )}
                </div>
              )
            })}
          </div>

          <div className="listing-care-day-details" aria-live="polite">
            {activeDate ? (
              <>
                <strong>{formatLongDate(activeDate)}</strong>
                {dayEntries.length > 0 ? dayEntries.map((entry, index) => (
                  <div className="listing-care-entry" key={`${entry.date}-${index}`}>
                    <div className="listing-care-entry-actions">
                      {(entry.actions || []).map((action) => {
                        const definition = ACTIONS.find((item) => item.value === action)
                        if (!definition) return null
                        const Icon = definition.Icon
                        return <span className={`listing-care-action-tag tag-${definition.color}`} key={action}><Icon size={13} aria-hidden="true" />{definition.label}</span>
                      })}
                      {entry.dayOfGrowing && <span className="listing-care-growing-day">Day {entry.dayOfGrowing}</span>}
                    </div>
                    {entry.note && <p>{entry.note}</p>}
                    {entry.photoUrl && <img className="listing-care-entry-photo" src={entry.photoUrl} alt={`Farm care activity on ${formatLongDate(entry.date)}`} />}
                  </div>
                )) : <p>No care actions recorded for this day.</p>}
              </>
            ) : (
              <p>Hover over or select a day to see care details.</p>
            )}
          </div>

          <div className="listing-care-legend" aria-label="Calendar legend">
            <span><i className="listing-care-marker marker-planted" /> Planted</span>
            <span><i className="listing-care-marker marker-harvest" /> Harvest</span>
            {ACTIONS.map(({ value, label }) => <span key={value}><i className={`listing-care-marker marker-${value}`} />{label}</span>)}
          </div>
        </div>

        <div className="listing-care-summary">
          {ACTIONS.map(({ value, label, Icon, color }) => (
            <article className={`listing-care-stat listing-care-stat--${color}`} key={value}>
              <span className="listing-care-stat-icon"><Icon size={18} aria-hidden="true" /></span>
              <strong>{actionCounts[value] || 0}</strong>
              <span>{label}</span>
            </article>
          ))}
        </div>
      </div>
    </section>
  )
}

export default ListingCareHistory

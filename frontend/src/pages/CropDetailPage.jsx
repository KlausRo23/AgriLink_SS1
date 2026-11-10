import { useEffect, useMemo, useRef, useState } from "react"
import { Archive, ArrowLeft, ChevronLeft, ChevronRight, CalendarDays, Camera, Check, Clock3, Droplets, Leaf, Pencil, Scissors, Sprout, SprayCan, X } from "lucide-react"
import { useLocation, useNavigate, useParams } from "react-router-dom"
import CropManagementModal from "../component/modal/CropManagementModal"
import RecordHarvestModal from "../component/modal/RecordHarvestModal"
import WarningModal from "../component/modal/WarningModal"
import { updateSavedCrops } from "../data/crops"
import { loadListings, saveListings } from "../data/listings"
import { getCropLifecycleStatus } from "../utils/cropLifecycle"
import "../styles/crop-detail.css"

const ACTIONS = [
  { value: "watered", label: "Watered", Icon: Droplets, color: "blue" },
  { value: "fertilized", label: "Fertilized", Icon: Leaf, color: "green" },
  { value: "pesticide", label: "Pesticide", Icon: SprayCan, color: "gold" },
  { value: "pruned", label: "Pruned", Icon: Scissors, color: "purple" },
]

const ACTIVITY_DOTS = [
  { day: 2, action: "watered" },
  { day: 3, action: "fertilized" },
  { day: 5, action: "watered" },
  { day: 7, action: "pesticide" },
]

const DEMO_CROP = {
  id: "tomato",
  name: "Tomato",
  category: "Fruit",
  status: "growing",
  isOrganic: true,
  seedlings: 120,
  datePlanted: "2026-10-05",
  harvestDate: "2026-12-19",
  sellDate: "2027-01-16",
  shelfLifeDays: 28,
  description: "Cherry tomatoes grown in raised beds. Heirloom variety.",
}

function asDate(value, fallback) {
  if (!value) return fallback
  const parsed = new Date(value)
  return Number.isNaN(parsed.getTime()) ? fallback : parsed
}

function dayKey(date) {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, "0")
  const day = String(date.getDate()).padStart(2, "0")
  return `${year}-${month}-${day}`
}

function formatLongDate(date) {
  return new Intl.DateTimeFormat("en-PH", { month: "short", day: "numeric", year: "numeric" }).format(date)
}

function CropDetailPage() {
  const { id } = useParams()
  const location = useLocation()
  const navigate = useNavigate()
  const [crop, setCrop] = useState(() => location.state?.crop || { ...DEMO_CROP, id: id || DEMO_CROP.id })
  const today = new Date()
  const plantedDate = asDate(crop.datePlanted, asDate(crop.harvestDate, DEMO_CROP.datePlanted && new Date(DEMO_CROP.datePlanted)))
  const estimatedHarvest = asDate(crop.harvestDate, new Date(plantedDate.getTime() + 70 * 86400000))
  const defaultCalendarDate = new Date(today.getFullYear(), today.getMonth(), 1)

  const [calendarMonth, setCalendarMonth] = useState(defaultCalendarDate)
  const [isMobile, setIsMobile] = useState(() => window.matchMedia("(max-width: 720px)").matches)
  const [selectedDate, setSelectedDate] = useState(null)
  const [selectedActions, setSelectedActions] = useState([])
  const [note, setNote] = useState("")
  const [photo, setPhoto] = useState(null)
  const [photoPreview, setPhotoPreview] = useState("")
  const [activityByDate, setActivityByDate] = useState({})
  const [message, setMessage] = useState("")
  const [isHarvestModalOpen, setIsHarvestModalOpen] = useState(false)
  const [isEarlyHarvestWarningOpen, setIsEarlyHarvestWarningOpen] = useState(false)
  const [pendingHarvest, setPendingHarvest] = useState(null)
  const [harvestRecord, setHarvestRecord] = useState(null)
  const [harvestError, setHarvestError] = useState("")
  const [cropDialog, setCropDialog] = useState(null)
  const [cropStorageError, setCropStorageError] = useState("")
  const photoInput = useRef(null)

  const ageDays = Math.max(0, Math.floor((today - plantedDate) / 86400000))
  const daysToHarvest = Math.ceil((estimatedHarvest - today) / 86400000)
  const totalGrowthDays = Math.max(1, Math.ceil((estimatedHarvest - plantedDate) / 86400000))
  const growthProgress = Math.min(100, Math.max(0, Math.round((ageDays / totalGrowthDays) * 100)))

  const calendarDays = useMemo(() => {
    const year = calendarMonth.getFullYear()
    const month = calendarMonth.getMonth()
    const firstWeekday = new Date(year, month, 1).getDay()
    const dayCount = new Date(year, month + 1, 0).getDate()
    return [
      ...Array(firstWeekday).fill(null),
      ...Array.from({ length: dayCount }, (_, index) => index + 1),
    ]
  }, [calendarMonth])

  const monthLabel = new Intl.DateTimeFormat("en-PH", { month: "long", year: "numeric" }).format(calendarMonth)
  const activities = selectedDate ? activityByDate[dayKey(selectedDate)] || [] : []
  const isSelectedToday = selectedDate && dayKey(selectedDate) === dayKey(today)
  const savedCropStatus = crop.status || crop.displayStatus || "growing"
  const isHarvested = Boolean(harvestRecord) || savedCropStatus === "harvested"
  const cropStatus = isHarvested ? "harvested" : getCropLifecycleStatus(crop)
  const cropStatusLabel = {
    "ready-to-harvest": "Ready to harvest",
    overdue: "Overdue",
  }[cropStatus] || cropStatus

  useEffect(() => {
    const mediaQuery = window.matchMedia("(max-width: 720px)")
    const updateViewport = (event) => setIsMobile(event.matches)
    mediaQuery.addEventListener("change", updateViewport)
    return () => mediaQuery.removeEventListener("change", updateViewport)
  }, [])

  useEffect(() => {
    if (!selectedDate || !isMobile) return undefined

    const previousOverflow = document.body.style.overflow
    document.body.style.overflow = "hidden"

    function handleKeyDown(event) {
      if (event.key === "Escape") {
        setSelectedDate(null)
        setSelectedActions([])
        setNote("")
        setPhoto(null)
        setPhotoPreview("")
        setMessage("")
      }
    }

    window.addEventListener("keydown", handleKeyDown)
    return () => {
      document.body.style.overflow = previousOverflow
      window.removeEventListener("keydown", handleKeyDown)
    }
  }, [isMobile, selectedDate])

  function changeMonth(amount) {
    setCalendarMonth((month) => new Date(month.getFullYear(), month.getMonth() + amount, 1))
  }

  function saveCrop(updatedCrop) {
    try {
      updateSavedCrops((savedCrops) => savedCrops.some((entry) => entry.id === updatedCrop.id)
        ? savedCrops.map((entry) => entry.id === updatedCrop.id ? updatedCrop : entry)
        : [...savedCrops, updatedCrop])
      setCrop(updatedCrop)
      setCropDialog(null)
      setCropStorageError("")
      return true
    } catch (error) {
      console.error("Could not save crop changes:", error)
      setCropStorageError("Could not save this crop. Check browser storage and try again.")
      return false
    }
  }

  function archiveCrop(selectedCrop) {
    const archivedCrop = { ...selectedCrop, archived: true, archivedAt: new Date().toISOString() }
    try {
      updateSavedCrops((savedCrops) => savedCrops.some((entry) => entry.id === selectedCrop.id)
        ? savedCrops.map((entry) => entry.id === selectedCrop.id ? archivedCrop : entry)
        : [...savedCrops, archivedCrop])
      setCropDialog(null)
      setCropStorageError("")
      navigate("/crops")
      return true
    } catch (error) {
      console.error("Could not archive crop:", error)
      setCropStorageError("Could not archive this crop. Check browser storage and try again.")
      return false
    }
  }

  function selectDay(day) {
    if (!day) return
    const date = new Date(calendarMonth.getFullYear(), calendarMonth.getMonth(), day)
    setSelectedDate(date)
    setSelectedActions(activityByDate[dayKey(date)]?.[0]?.actions || [])
    setNote(activityByDate[dayKey(date)]?.[0]?.note || "")
    setPhoto(null)
    setPhotoPreview("")
    setMessage("")
  }

  function closeActivityEditor() {
    setSelectedDate(null)
    setSelectedActions([])
    setNote("")
    setPhoto(null)
    setPhotoPreview("")
    setMessage("")
  }

  function toggleAction(action) {
    setSelectedActions((current) => current.includes(action)
      ? current.filter((value) => value !== action)
      : [...current, action])
  }

  function handlePhotoChange(event) {
    const file = event.target.files?.[0]
    event.target.value = ""
    if (!file) return
    if (!["image/jpeg", "image/png", "image/webp"].includes(file.type)) {
      setMessage("Choose a JPEG, PNG or WebP photo.")
      return
    }
    if (file.size > 3 * 1024 * 1024) {
      setMessage("Activity photos must be 3MB or smaller.")
      return
    }
    const reader = new FileReader()
    reader.onload = () => {
      if (typeof reader.result !== "string") {
        setMessage("Could not display this photo. Please choose another.")
        return
      }
      setPhoto(file)
      setPhotoPreview(reader.result)
      setMessage("")
    }
    reader.onerror = () => setMessage("Could not read this photo. Please choose another.")
    reader.readAsDataURL(file)
  }

  function saveActivity(event) {
    event.preventDefault()
    if (!selectedActions.length && !note.trim() && !photo) {
      setMessage("Select an activity, add a note, or attach a photo before saving.")
      return
    }
    const entry = {
      actions: selectedActions,
      note: note.trim(),
      photoName: photo?.name || "",
      photoPreview,
    }
    setActivityByDate((previous) => ({
      ...previous,
      [dayKey(selectedDate)]: [...(previous[dayKey(selectedDate)] || []), entry],
    }))
    setSelectedActions([])
    setNote("")
    setPhoto(null)
    setPhotoPreview("")
    setMessage("Activity saved.")
  }

  function recordHarvest(data) {
    const harvestedAt = new Date()
    if (data.autoListing) {
      const listedDate = dayKey(harvestedAt)
      const sellByDate = new Date(harvestedAt)
      sellByDate.setDate(sellByDate.getDate() + data.shelfLifeDays)
      const listing = {
        id: `harvest-${crypto.randomUUID()}`,
        sourceCropId: crop.id,
        name: crop.name,
        description: data.notes || `Freshly harvested ${crop.name.toLowerCase()}, available now.`,
        seller: crop.farmName || "Your farm",
        region: crop.region || "Local farm",
        price: data.listingPrice,
        stock: data.quantity,
        unit: data.unit,
        listedDate,
        harvestDate: listedDate,
        sellByDate: dayKey(sellByDate),
        shelfLifeDays: data.shelfLifeDays,
        status: "pending",
        category: crop.category || "Fresh produce",
        details: data.notes || `Harvested directly from the farm on ${formatLongDate(harvestedAt)}.`,
        imageUrl: data.photoPreview || crop.image || "",
        emoji: crop.emoji || "🌿",
        visual: crop.visual || "leafy",
      }
      const listings = loadListings()
      if (!saveListings([...listings, listing])) {
        setHarvestError("Could not save this listing in the browser. Check storage permissions and try again.")
        return false
      }
    }

    setHarvestRecord({ ...data, harvestedAt })
    setPendingHarvest(null)
    setIsEarlyHarvestWarningOpen(false)
    setIsHarvestModalOpen(false)
    setHarvestError("")
    return true
  }

  function submitHarvest(data) {
    setHarvestError("")
    if (daysToHarvest > 0) {
      setPendingHarvest(data)
      setIsEarlyHarvestWarningOpen(true)
      return true
    }
    return recordHarvest(data)
  }

  return (
    <main className="dashboard-main crop-detail-page">
      <header className="dashboard-topbar">
        <div className="dashboard-breadcrumb">Crops <span>/</span> {crop.name}</div>
        <button type="button" className="dashboard-avatar" aria-label="Account">F</button>
      </header>

      <div className="crop-detail-content">
        <button type="button" className="crop-detail-back" onClick={() => navigate("/crops")}>
          <ArrowLeft size={16} aria-hidden="true" /> Back to crops
        </button>

        <section className="crop-detail-hero">
          <div className="crop-detail-image">
            {crop.image ? (
              <img src={crop.image} alt={`${crop.name} crop`} />
            ) : (
              <div className="crop-detail-image-placeholder">
                <span className="crop-detail-orbit" />
                <Sprout size={62} strokeWidth={1.2} aria-hidden="true" />
                <strong>{crop.name}</strong>
              </div>
            )}
          </div>
          <div className="crop-detail-hero-content">
            <div className="crop-detail-title-row">
              <div>
                <p className="dashboard-eyebrow">{crop.category || "Crop"} details</p>
                <h1>{crop.name}</h1>
              </div>
              <div className="crop-detail-actions">
                <button type="button" className="crop-detail-edit-button" onClick={() => setCropDialog({ mode: "edit", crop })}>
                  <Pencil size={15} aria-hidden="true" /> Edit
                </button>
                <button type="button" className="crop-detail-archive-button" onClick={() => setCropDialog({ mode: "archive", crop })}>
                  <Archive size={15} aria-hidden="true" /> Archive
                </button>
                <button
                  type="button"
                  className="crop-detail-harvest-button"
                  onClick={() => setIsHarvestModalOpen(true)}
                  disabled={isHarvested}
                >
                  <Sprout size={17} aria-hidden="true" /> {isHarvested ? "Harvest recorded" : "Record harvest"}
                </button>
              </div>
            </div>
            {harvestError && <p className="crop-harvest-preview-message is-error" role="alert">{harvestError}</p>}
            {cropStorageError && <p className="crop-harvest-preview-message is-error" role="alert">{cropStorageError}</p>}
            {harvestRecord && <p className="crop-harvest-preview-message" role="status">{harvestRecord.autoListing ? "Harvest recorded and added to Listings for review." : "Harvest recorded in this preview. Inventory is not connected."}</p>}
            <div className="crop-detail-tags">
              {crop.isOrganic && <span className="crop-detail-tag organic"><Check size={12} /> Organic</span>}
              <span className={`crop-detail-tag status-${cropStatus}`}>{cropStatusLabel}</span>
            </div>
          </div>
        </section>

        <section className="crop-metric-grid" aria-label="Crop metrics">
          <article className="crop-metric-card">
            <span>Age</span>
            <strong>{ageDays} <small>days</small></strong>
          </article>
          <article className="crop-metric-card harvest">
            <span>{daysToHarvest >= 0 ? "Harvest in" : "Harvest date"}</span>
            <strong>{harvestRecord ? formatLongDate(harvestRecord.harvestedAt) : daysToHarvest >= 0 ? <>{daysToHarvest} <small>days</small></> : formatLongDate(estimatedHarvest)}</strong>
          </article>
        </section>

        <section className="crop-growth-card" aria-label="Growth progress">
          <div className="crop-growth-heading">
            <span>Growth progress</span>
            <strong>{growthProgress}%</strong>
          </div>
          <div className="crop-growth-track" role="progressbar" aria-valuemin={0} aria-valuemax={100} aria-valuenow={growthProgress}>
            <span style={{ width: `${growthProgress}%` }} />
          </div>
          <div className="crop-growth-dates">
            <span>Planted {formatLongDate(plantedDate)}</span>
            <span>Est. harvest {formatLongDate(estimatedHarvest)}</span>
          </div>
        </section>

        <section className="crop-detail-meta" aria-label="Crop dates">
          <div><CalendarDays size={15} /><span>Planted</span><strong>{formatLongDate(plantedDate)}</strong></div>
          <div><Sprout size={15} /><span>Est. harvest</span><strong>{formatLongDate(estimatedHarvest)}</strong></div>
          <div><Clock3 size={15} /><span>Sell by</span><strong>{formatLongDate(asDate(crop.sellDate, estimatedHarvest))}</strong></div>
          <div><Leaf size={15} /><span>Field / Section</span><strong>{crop.field || "Field | Section"}</strong></div>
        </section>

        <section className="crop-description">
          <h2>Description</h2>
          <p>{crop.description || "No description has been added for this crop yet."}</p>
        </section>

        <section className="crop-activity-card">
          <header className="crop-activity-heading">
            <div>
              <h2>Activity calendar</h2>
              <p>Tap a date to record what you did or add a photo.</p>
            </div>
            <span className="crop-calendar-crop-name">{crop.name}</span>
          </header>

          <div className={`crop-calendar-layout${selectedDate ? " has-selected-date" : ""}`}>
            <div className="crop-calendar-panel">
          <div className="crop-calendar-toolbar">
            <button type="button" onClick={() => changeMonth(-1)} aria-label="Previous month"><ChevronLeft size={20} /></button>
            <h3>{monthLabel}</h3>
            <button type="button" onClick={() => changeMonth(1)} aria-label="Next month"><ChevronRight size={20} /></button>
          </div>

          <div className="crop-calendar-grid" key={monthLabel} role="grid" aria-label={monthLabel}>
            {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((weekday) => (
              <span className="crop-calendar-weekday" role="columnheader" key={weekday}>{weekday}</span>
            ))}
            {calendarDays.map((day, index) => {
              const date = day ? new Date(calendarMonth.getFullYear(), calendarMonth.getMonth(), day) : null
              const key = date ? dayKey(date) : ""
              const isSelected = date && selectedDate && key === dayKey(selectedDate)
              const seededActions = date && calendarMonth.getMonth() === today.getMonth() && calendarMonth.getFullYear() === today.getFullYear()
                ? ACTIVITY_DOTS.filter((item) => item.day === day).map((item) => item.action)
                : []
              const dayActivities = date ? (activityByDate[key] || []).flatMap((activity) => activity.actions) : []
              const markers = [...new Set([...seededActions, ...dayActivities])]
              return (
                <div className="crop-calendar-cell" role="gridcell" key={`${key || "blank"}-${index}`}>
                  {day && (
                    <button
                      type="button"
                      className={`crop-calendar-day${isSelected ? " is-selected" : ""}${key === dayKey(today) ? " is-today" : ""}`}
                      aria-pressed={Boolean(isSelected)}
                      aria-label={`${formatLongDate(date)}${markers.length ? `, ${markers.length} activities` : ""}`}
                      onClick={() => selectDay(day)}
                    >
                      <span>{day}</span>
                      {markers.length > 0 && (
                        <span className="crop-day-markers" aria-hidden="true">
                          {markers.slice(0, 4).map((action) => <i className={`marker-${action}`} key={action} />)}
                        </span>
                      )}
                    </button>
                  )}
                </div>
              )
            })}
          </div>

          <div className="crop-calendar-legend" aria-label="Activity legend">
            <span><i className="marker-planted" /> Planted</span>
            <span><i className="marker-harvest" /> Harvest</span>
            {ACTIONS.map(({ value, label }) => <span key={value}><i className={`marker-${value}`} /> {label}</span>)}
          </div>
            </div>

          {selectedDate && <div
            className={`crop-selected-day-backdrop${isMobile ? " is-modal" : ""}`}
            onMouseDown={(event) => {
              if (isMobile && event.target === event.currentTarget) closeActivityEditor()
            }}
          >
          <section className="crop-selected-day" key={dayKey(selectedDate)} role="dialog" aria-modal={isMobile} aria-label={`Activity for ${formatLongDate(selectedDate)}`}>
            <header>
              <div>
                <strong>{formatLongDate(selectedDate)}</strong>
                <span>{isSelectedToday ? "Today" : `Day ${Math.max(1, Math.floor((selectedDate - plantedDate) / 86400000) + 1)} of growth`}</span>
              </div>
              <button
                type="button"
                className="crop-selected-day-close"
                aria-label="Close activity editor"
                onClick={closeActivityEditor}
              >
                <X size={17} />
              </button>
            </header>
            {activities.length > 0 && (
              <div className="crop-saved-activities">
                {activities.map((activity, index) => (
                  <article key={`${dayKey(selectedDate)}-${index}`}>
                    {activity.actions.map((action) => (
                      <span className="crop-saved-action" key={action}>{ACTIONS.find((item) => item.value === action)?.label || action}</span>
                    ))}
                    {activity.note && <p>{activity.note}</p>}
                    {activity.photoPreview && <img className="crop-saved-photo" src={activity.photoPreview} alt={activity.photoName ? `Activity photo: ${activity.photoName}` : "Saved activity"} />}
                    {activity.photoName && <small><Camera size={12} /> {activity.photoName}</small>}
                  </article>
                ))}
              </div>
            )}
            <form onSubmit={saveActivity}>
              <label className="crop-activity-note">
                <span className="crop-visually-hidden">Activity note</span>
                <input value={note} onChange={(event) => setNote(event.target.value)} maxLength={200} placeholder="Add a note (optional) — e.g. NPK 14-14-14" />
              </label>
              <fieldset className="crop-action-fieldset">
                <legend>What did you do today?</legend>
                <div className="crop-action-options">
                  {ACTIONS.map(({ value, label, Icon, color }) => (
                    <button
                      type="button"
                      className={`crop-activity-option ${color}${selectedActions.includes(value) ? " is-selected" : ""}`}
                      aria-pressed={selectedActions.includes(value)}
                      key={value}
                      onClick={() => toggleAction(value)}
                    >
                      <Icon size={16} aria-hidden="true" /> {label}
                    </button>
                  ))}
                </div>
              </fieldset>
              <div className="crop-activity-upload-row">
                <div className="crop-activity-upload">
                  <input ref={photoInput} type="file" accept="image/jpeg,image/png,image/webp" onChange={handlePhotoChange} />
                  <button type="button" onClick={() => photoInput.current?.click()}>
                    {photoPreview ? <img src={photoPreview} alt="Activity preview" /> : <Camera size={16} />}
                    {photo ? photo.name : "Take or upload a photo"}
                  </button>
                </div>
                <button type="submit" className="crop-save-activity"><Check size={15} /> Save activity</button>
              </div>
              {message && <p className="crop-activity-message" role="status">{message}</p>}
            </form>
          </section>
          </div>}
          </div>
        </section>
      </div>
      <CropManagementModal
        key={`${cropDialog?.mode}-${cropDialog?.crop?.id}`}
        crop={cropDialog?.crop}
        mode={cropDialog?.mode}
        onClose={() => setCropDialog(null)}
        onSave={saveCrop}
        onArchive={archiveCrop}
      />
      {isHarvestModalOpen && (
        <RecordHarvestModal
          open={isHarvestModalOpen}
          crop={crop}
          onClose={() => setIsHarvestModalOpen(false)}
          onSubmit={submitHarvest}
          errorMessage={harvestError}
        />
      )}
      <WarningModal
        open={isEarlyHarvestWarningOpen}
        cropName={crop.name}
        daysEarly={daysToHarvest}
        onCancel={() => {
          setIsEarlyHarvestWarningOpen(false)
          setPendingHarvest(null)
        }}
        onConfirm={() => pendingHarvest && recordHarvest(pendingHarvest)}
      />
    </main>
  )
}

export default CropDetailPage

import { useState } from "react"
import { AlertTriangle, Leaf, Plus, Sprout } from "lucide-react"
import { useNavigate } from "react-router-dom"
import CropCard from "../component/card/CropCard"
import CropManagementModal from "../component/modal/CropManagementModal"
import ProgressLogsModal from "../component/modal/ProgressLogsModal"
import { loadCropPreview, updateSavedCrops } from "../data/crops"
import { getCropLifecycleStatus, getDaysUntilDate } from "../utils/cropLifecycle"
import "../styles/crops.css"

const FILTERS = [
  { value: "all", label: "All crops" },
  { value: "growing", label: "Growing" },
  { value: "ready-to-harvest", label: "Ready to harvest" },
  { value: "overdue", label: "Overdue" },
]
const LIFECYCLE_ORDER = { overdue: 0, "ready-to-harvest": 1, growing: 2 }

function CropPage() {
  const navigate = useNavigate()
  const [crops, setCrops] = useState(loadCropPreview)
  const [filter, setFilter] = useState("all")
  const [dialog, setDialog] = useState(null)
  const [isProgressModalOpen, setIsProgressModalOpen] = useState(false)
  const [storageError, setStorageError] = useState("")
  const sortedCrops = [...crops].sort((first, second) => {
    const statusDifference = LIFECYCLE_ORDER[getCropLifecycleStatus(first)] - LIFECYCLE_ORDER[getCropLifecycleStatus(second)]
    if (statusDifference !== 0) return statusDifference
    return (first.harvestDate || "").localeCompare(second.harvestDate || "")
  })
  const visibleCrops = filter === "all"
    ? sortedCrops
    : sortedCrops.filter((crop) => getCropLifecycleStatus(crop) === filter)
  const progressCrops = crops
    .map((crop) => {
      const daysUntilHarvest = getDaysUntilDate(crop.harvestDate)
      const lifecycleStatus = getCropLifecycleStatus(crop)
      const progressStatus = daysUntilHarvest !== null && daysUntilHarvest < 0
        ? "overdue"
        : daysUntilHarvest === 3
          ? "harvest-soon"
          : lifecycleStatus === "ready-to-harvest"
            ? "ready"
            : null
      return progressStatus ? { ...crop, progressStatus } : null
    })
    .filter(Boolean)
    .sort((first, second) => (first.harvestDate || "").localeCompare(second.harvestDate || ""))

  function updateCrop(updatedCrop) {
    try {
      updateSavedCrops((savedCrops) => savedCrops.some((crop) => crop.id === updatedCrop.id)
        ? savedCrops.map((crop) => crop.id === updatedCrop.id ? updatedCrop : crop)
        : [...savedCrops, updatedCrop])
      setCrops((previous) => previous.map((crop) => crop.id === updatedCrop.id ? updatedCrop : crop))
      setStorageError("")
      setDialog(null)
      return true
    } catch (error) {
      console.error("Could not save crop changes:", error)
      setStorageError("Could not save this crop. Check browser storage and try again.")
      return false
    }
  }

  function archiveCrop(crop) {
    const archivedCrop = { ...crop, archived: true, archivedAt: new Date().toISOString() }
    try {
      updateSavedCrops((savedCrops) => savedCrops.some((entry) => entry.id === crop.id)
        ? savedCrops.map((entry) => entry.id === crop.id ? archivedCrop : entry)
        : [...savedCrops, archivedCrop])
      setCrops((previous) => previous.filter((entry) => entry.id !== crop.id))
      setStorageError("")
      setDialog(null)
      return true
    } catch (error) {
      console.error("Could not archive crop:", error)
      setStorageError("Could not archive this crop. Check browser storage and try again.")
      return false
    }
  }

  return (
    <main className="dashboard-main crop-page">
      <header className="dashboard-topbar">
        <div className="dashboard-breadcrumb">Crops</div>
        <button type="button" className="dashboard-icon-button crop-topbar-user" aria-label="Account">F</button>
      </header>

      <div className="dashboard-content">
        <section className="crop-page-heading">
          <div>
            <p className="dashboard-eyebrow">Farm management</p>
            <h1 className="dashboard-page-title">Crops overview</h1>
            <p>Track growing crops and keep upcoming harvests on schedule.</p>
          </div>
          <div className="crop-heading-actions">
            <button
              type="button"
              className="crop-primary-button"
              onClick={() => navigate("/crops/add")}
            >
              <Plus size={16} aria-hidden="true" /> Plant a crop
            </button>
            <button type="button" className="crop-secondary-button" onClick={() => setIsProgressModalOpen(true)}>
              <AlertTriangle size={15} aria-hidden="true" /> Crop Progress
            </button>
          </div>
        </section>

        <nav className="crop-lifecycle-filters" aria-label="Filter crops by lifecycle">
          {FILTERS.map((item) => {
            const count = item.value === "all"
              ? crops.length
              : crops.filter((crop) => getCropLifecycleStatus(crop) === item.value).length
            return (
              <button
                type="button"
                key={item.value}
                className={`crop-lifecycle-filter${filter === item.value ? " is-active" : ""}`}
                onClick={() => setFilter(item.value)}
                aria-pressed={filter === item.value}
              >
                {item.label}<span>{count}</span>
              </button>
            )
          })}
        </nav>

        {storageError && <p className="crop-dialog-error" role="alert">{storageError}</p>}
        {visibleCrops.length ? (
          <section className="crop-grid" aria-label="Crops sorted by harvest priority">
            {visibleCrops.map((crop) => (
              <CropCard
                key={crop.id}
                crop={crop}
                lifecycleStatus={getCropLifecycleStatus(crop)}
                onEdit={(selectedCrop) => setDialog({ mode: "edit", crop: selectedCrop })}
                onArchive={(selectedCrop) => setDialog({ mode: "archive", crop: selectedCrop })}
                onView={(selectedCrop) => navigate(`/crops/${selectedCrop.id}`, { state: { crop: selectedCrop } })}
              />
            ))}
          </section>
        ) : (
          <div className="crop-empty-state">
            <Sprout size={28} aria-hidden="true" />
            <h2>No crops to show</h2>
            <p>There are no crops in this view yet.</p>
          </div>
        )}

        <p className="dashboard-demo-note"><Leaf size={14} aria-hidden="true" /> Crop page preview with sample data</p>
      </div>

      <CropManagementModal
        key={`${dialog?.mode}-${dialog?.crop?.id}`}
        crop={dialog?.crop}
        mode={dialog?.mode}
        onClose={() => setDialog(null)}
        onSave={updateCrop}
        onArchive={archiveCrop}
      />
      {isProgressModalOpen && (
        <ProgressLogsModal crops={progressCrops} onClose={() => setIsProgressModalOpen(false)} />
      )}
    </main>
  )
}

export default CropPage

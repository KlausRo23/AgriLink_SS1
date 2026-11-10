import { useEffect, useState } from "react"
import { AlertTriangle, Leaf, Plus, Sprout } from "lucide-react"
import { useNavigate } from "react-router-dom"
import CropCard from "../component/card/CropCard"
import CropManagementModal from "../component/modal/CropManagementModal"
import ProgressLogsModal from "../component/modal/ProgressLogsModal"
import { archiveCrop as archiveCropRequest, getCrops, updateCrop as updateCropRequest } from "../api/api"
import { getCropLifecycleStatus, getDaysUntilDate } from "../utils/cropLifecycle"
import "../styles/crops.css"

const FILTERS = [
  { value: "all", label: "All crops" },
  { value: "growing", label: "Growing" },
  { value: "ready-to-harvest", label: "Ready to harvest" },
  { value: "overdue", label: "Overdue" },
  { value: "harvested", label: "Harvested" },
]
const LIFECYCLE_ORDER = { overdue: 0, "ready-to-harvest": 1, growing: 2, harvested: 3 }

function CropPage() {
  const navigate = useNavigate()
  const [crops, setCrops] = useState([])
  const [filter, setFilter] = useState("all")
  const [dialog, setDialog] = useState(null)
  const [isProgressModalOpen, setIsProgressModalOpen] = useState(false)
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState("")

  useEffect(() => {
    let active = true
    getCrops()
      .then(({ data }) => {
        if (active) setCrops(data.data.crops)
      })
      .catch((error) => {
        if (active) setLoadError(error.response?.data?.message || "Could not load your crops.")
      })
      .finally(() => {
        if (active) setLoading(false)
      })
    return () => { active = false }
  }, [])
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
      if (crop.status === "harvested") return null
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

  async function updateCrop(updatedCrop, { imageFile, removeImage }) {
    const formData = new FormData()
    for (const field of ["datePlanted", "harvestDate", "shelfLifeDays", "description", "field", "seedlings", "isOrganic", "isSpecialty"]) {
      if (updatedCrop[field] !== undefined && updatedCrop[field] !== null) {
        formData.set(field, String(updatedCrop[field]))
      }
    }
    if (updatedCrop.seedlings === null) formData.set("seedlings", "")
    if (removeImage) formData.set("removeImage", "true")
    if (imageFile) formData.set("image", imageFile)

    try {
      const { data } = await updateCropRequest(updatedCrop.id, formData)
      setCrops((previous) => previous.map((crop) => crop.id === updatedCrop.id ? data.data : crop))
      setDialog(null)
      return data.data
    } catch (error) {
      throw new Error(error.response?.data?.message || "Could not save crop changes.", { cause: error })
    }
  }

  async function archiveCrop(crop) {
    try {
      await archiveCropRequest(crop.id)
      setCrops((previous) => previous.filter((entry) => entry.id !== crop.id))
      setDialog(null)
      return true
    } catch (error) {
      throw new Error(error.response?.data?.message || "Could not archive this crop.", { cause: error })
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

        {loadError && <p className="crop-dialog-error" role="alert">{loadError}</p>}
        {loading ? (
          <div className="crop-empty-state" role="status"><p>Loading crops...</p></div>
        ) : visibleCrops.length ? (
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

        {!loading && crops.length > 0 && <p className="dashboard-demo-note"><Leaf size={14} aria-hidden="true" /> Your crops are saved to your AgriLink account.</p>}
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

import { useState } from "react"
import { AlertTriangle, Leaf, Plus, Sprout, Trash2, X } from "lucide-react"
import { useNavigate } from "react-router-dom"
import CropCard from "../component/card/CropCard"
import SpoilageLogsModal from "../component/modal/SpoilageLogsModal"
import { getCropLifecycleStatus, getCropSpoilageStatus, getDateOffsetFromToday } from "../utils/cropLifecycle"
import "../styles/crops.css"

const INITIAL_CROPS = [
  {
    id: "crop-1",
    name: "Cabbage",
    category: "Vegetable",
    status: "growing",
    datePlanted: getDateOffsetFromToday(-65),
    harvestDate: getDateOffsetFromToday(-3),
    sellDate: getDateOffsetFromToday(-1),
    quantity: 120,
    description: "Harvest date has passed. Prioritize this crop for harvest.",
  },
  {
    id: "crop-2",
    name: "Carrots",
    category: "Vegetable",
    status: "growing",
    datePlanted: getDateOffsetFromToday(-67),
    harvestDate: getDateOffsetFromToday(3),
    sellDate: getDateOffsetFromToday(4),
    quantity: 240,
    description: "Expected to be ready for harvest soon.",
  },
  {
    id: "crop-3",
    name: "Tomatoes",
    category: "Fruit",
    status: "growing",
    datePlanted: getDateOffsetFromToday(-25),
    harvestDate: getDateOffsetFromToday(45),
    sellDate: getDateOffsetFromToday(52),
    quantity: 86,
    description: "Growing well. Include in the next available listing after harvest.",
  },
  {
    id: "crop-4",
    name: "Pechay",
    category: "Root crop",
    status: "growing",
    datePlanted: getDateOffsetFromToday(-18),
    harvestDate: getDateOffsetFromToday(12),
    sellDate: getDateOffsetFromToday(17),
    quantity: 150,
    description: "Tender leafy greens currently growing in the field.",
  },
  {
    id: "crop-5",
    name: "Ampalaya",
    category: "Fruit",
    status: "growing",
    datePlanted: getDateOffsetFromToday(-40),
    harvestDate: getDateOffsetFromToday(5),
    sellDate: getDateOffsetFromToday(9),
    quantity: 64,
    description: "Harvest window is approaching.",
  },
  {
    id: "crop-6",
    name: "Broccoli",
    category: "Vegetable",
    status: "growing",
    datePlanted: getDateOffsetFromToday(-32),
    harvestDate: getDateOffsetFromToday(28),
    sellDate: getDateOffsetFromToday(35),
    quantity: 95,
    description: "Young plants are developing steadily.",
  },
]

const SAVED_CROPS_KEY = "agrilink-crops-preview"
const FILTERS = [
  { value: "all", label: "All crops" },
  { value: "growing", label: "Growing" },
  { value: "ready-to-harvest", label: "Ready to harvest" },
  { value: "overdue", label: "Overdue" },
]
const LIFECYCLE_ORDER = { overdue: 0, "ready-to-harvest": 1, growing: 2 }

function getSavedCrops() {
  try {
    const savedCrops = JSON.parse(window.localStorage.getItem(SAVED_CROPS_KEY) || "[]")
    if (!Array.isArray(savedCrops)) throw new Error("Saved crop preview data is invalid.")
    return savedCrops
  } catch (error) {
    console.error("Could not load saved crop preview data:", error)
    return []
  }
}

function updateSavedCrops(update) {
  try {
    const savedCrops = getSavedCrops()
    window.localStorage.setItem(SAVED_CROPS_KEY, JSON.stringify(update(savedCrops)))
  } catch (error) {
    console.error("Could not update saved crop preview data:", error)
  }
}

function CropDialog({ crop, mode, onClose, onSave, onDelete }) {
  const [name, setName] = useState(crop?.name || "")
  const [description, setDescription] = useState(crop?.description || "")
  const [harvestDate, setHarvestDate] = useState(crop?.harvestDate || "")

  if (!mode || !crop) return null

  return (
    <div
      className="crop-dialog-backdrop"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) onClose()
      }}
    >
      <section className="crop-dialog" role="dialog" aria-modal="true" aria-labelledby="crop-dialog-title">
        <header className="crop-dialog-header">
          <div>
            <h2 id="crop-dialog-title">{mode === "create" ? "Add crop" : mode === "edit" ? "Edit crop" : "Delete crop?"}</h2>
            <p>{mode === "edit" ? "Update your crop details." : "This crop will be removed from this preview."}</p>
          </div>
          <button type="button" className="crop-dialog-close" onClick={onClose} aria-label="Close dialog">
            <X size={19} />
          </button>
        </header>

        {mode === "edit" ? (
          <form
            className="crop-dialog-form"
            onSubmit={(event) => {
              event.preventDefault()
              onSave({ ...crop, name: name.trim(), description, harvestDate })
            }}
          >
            <label>
              Crop name
              <input value={name} onChange={(event) => setName(event.target.value)} maxLength={60} required />
            </label>
            <label>
              Estimated harvest date
              <input type="date" value={harvestDate} onChange={(event) => setHarvestDate(event.target.value)} />
            </label>
            <label>
              Description
              <textarea value={description} onChange={(event) => setDescription(event.target.value)} maxLength={300} rows={3} />
            </label>
            <footer>
              <button type="button" className="crop-dialog-cancel" onClick={onClose}>Cancel</button>
              <button type="submit" className="crop-dialog-save">{mode === "create" ? "Add crop" : "Save changes"}</button>
            </footer>
          </form>
        ) : (
          <div className="crop-delete-confirm">
            <div className="crop-delete-warning"><Trash2 size={20} /></div>
            <p>Delete <strong>{crop.name}</strong> from your crop list? This action can’t be undone.</p>
            <footer>
              <button type="button" className="crop-dialog-cancel" onClick={onClose}>Keep crop</button>
              <button type="button" className="crop-dialog-delete" onClick={() => onDelete(crop.id)}>Delete crop</button>
            </footer>
          </div>
        )}
      </section>
    </div>
  )
}

function CropPage() {
  const navigate = useNavigate()
  const [crops, setCrops] = useState(() => [...INITIAL_CROPS, ...getSavedCrops()])
  const [filter, setFilter] = useState("all")
  const [dialog, setDialog] = useState(null)
  const [isSpoilageModalOpen, setIsSpoilageModalOpen] = useState(false)
  const sortedCrops = [...crops].sort((first, second) => {
    const statusDifference = LIFECYCLE_ORDER[getCropLifecycleStatus(first)] - LIFECYCLE_ORDER[getCropLifecycleStatus(second)]
    if (statusDifference !== 0) return statusDifference
    return (first.harvestDate || "").localeCompare(second.harvestDate || "")
  })
  const visibleCrops = filter === "all"
    ? sortedCrops
    : sortedCrops.filter((crop) => getCropLifecycleStatus(crop) === filter)
  const spoilageCrops = crops
    .map((crop) => ({ ...crop, spoilageStatus: getCropSpoilageStatus(crop) }))
    .filter((crop) => crop.spoilageStatus)
    .sort((first, second) => (first.sellDate || "").localeCompare(second.sellDate || ""))

  function updateCrop(updatedCrop) {
    setCrops((previous) => previous.some((crop) => crop.id === updatedCrop.id)
      ? previous.map((crop) => crop.id === updatedCrop.id ? updatedCrop : crop)
      : [...previous, updatedCrop])
    updateSavedCrops((savedCrops) => savedCrops.map((crop) => crop.id === updatedCrop.id ? updatedCrop : crop))
    setDialog(null)
  }

  function deleteCrop(id) {
    setCrops((previous) => previous.filter((crop) => crop.id !== id))
    updateSavedCrops((savedCrops) => savedCrops.filter((crop) => crop.id !== id))
    setDialog(null)
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
            <h1>Crops overview</h1>
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
            <button type="button" className="crop-secondary-button" onClick={() => setIsSpoilageModalOpen(true)}>
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

        {visibleCrops.length ? (
          <section className="crop-grid" aria-label="Crops sorted by harvest priority">
            {visibleCrops.map((crop) => (
              <CropCard
                key={crop.id}
                crop={crop}
                lifecycleStatus={getCropLifecycleStatus(crop)}
                onEdit={(selectedCrop) => setDialog({ mode: "edit", crop: selectedCrop })}
                onDelete={(selectedCrop) => setDialog({ mode: "delete", crop: selectedCrop })}
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

      <CropDialog
        key={`${dialog?.mode}-${dialog?.crop?.id}`}
        crop={dialog?.crop}
        mode={dialog?.mode}
        onClose={() => setDialog(null)}
        onSave={updateCrop}
        onDelete={deleteCrop}
      />
      {isSpoilageModalOpen && (
        <SpoilageLogsModal crops={spoilageCrops} onClose={() => setIsSpoilageModalOpen(false)} />
      )}
    </main>
  )
}

export default CropPage

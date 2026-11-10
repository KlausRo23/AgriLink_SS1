import { useMemo, useRef, useState } from "react"
import { ArrowLeft, CalendarDays, Check, ChevronDown, ImagePlus, Leaf, MapPin, Search, Sprout, X } from "lucide-react"
import { useNavigate } from "react-router-dom"
import { createCrop } from "../api/api"
import "../styles/add-crop.css"

const CROPS = [
  { name: "Ampalaya", group: "Vegetable", emoji: "🥒", color: "green", days: 60, shelfLife: 5 },
  { name: "Banana", group: "Fruit", emoji: "🍌", color: "yellow", days: 280, shelfLife: 7 },
  { name: "Bell Pepper", group: "Vegetable", emoji: "🫑", color: "green", days: 75, shelfLife: 10 },
  { name: "Broccoli", group: "Vegetable", emoji: "🥦", color: "green", days: 65, shelfLife: 7 },
  { name: "Cabbage", group: "Vegetable", emoji: "🥬", color: "green", days: 70, shelfLife: 21 },
  { name: "Calamansi", group: "Fruit", emoji: "🍋", color: "yellow", days: 365, shelfLife: 14 },
  { name: "Carrot", group: "Root crop", emoji: "🥕", color: "orange", days: 75, shelfLife: 30 },
  { name: "Cassava", group: "Root crop", emoji: "🥔", color: "earth", days: 300, shelfLife: 30 },
  { name: "Chili Pepper", group: "Vegetable", emoji: "🌶️", color: "red", days: 90, shelfLife: 7 },
  { name: "Corn", group: "Grain", emoji: "🌽", color: "yellow", days: 90, shelfLife: 14 },
  { name: "Cucumber", group: "Vegetable", emoji: "🥒", color: "green", days: 50, shelfLife: 7 },
  { name: "Durian", group: "Fruit", emoji: "🥭", color: "earth", days: 120, shelfLife: 5 },
  { name: "Eggplant", group: "Vegetable", emoji: "🍆", color: "purple", days: 80, shelfLife: 10 },
  { name: "Garlic", group: "Vegetable", emoji: "🧄", color: "earth", days: 150, shelfLife: 120 },
  { name: "Ginger", group: "Root crop", emoji: "🫚", color: "earth", days: 240, shelfLife: 60 },
  { name: "Gabi", group: "Root crop", emoji: "🍠", color: "earth", days: 180, shelfLife: 30 },
  { name: "Jackfruit", group: "Fruit", emoji: "🍈", color: "green", days: 150, shelfLife: 7 },
  { name: "Kangkong", group: "Vegetable", emoji: "🥬", color: "green", days: 30, shelfLife: 3 },
  { name: "Lanzones", group: "Fruit", emoji: "🍇", color: "yellow", days: 120, shelfLife: 5 },
  { name: "Lettuce", group: "Vegetable", emoji: "🥬", color: "green", days: 45, shelfLife: 5 },
  { name: "Malunggay", group: "Vegetable", emoji: "🌿", color: "green", days: 120, shelfLife: 3 },
  { name: "Mango", group: "Fruit", emoji: "🥭", color: "yellow", days: 100, shelfLife: 14 },
  { name: "Mung Bean", group: "Legume", emoji: "🫘", color: "green", days: 65, shelfLife: 180 },
  { name: "Okra", group: "Vegetable", emoji: "🌿", color: "green", days: 55, shelfLife: 5 },
  { name: "Onion", group: "Vegetable", emoji: "🧅", color: "purple", days: 100, shelfLife: 60 },
  { name: "Papaya", group: "Fruit", emoji: "🍈", color: "orange", days: 240, shelfLife: 10 },
  { name: "Peanut", group: "Legume", emoji: "🥜", color: "earth", days: 100, shelfLife: 120 },
  { name: "Pechay", group: "Vegetable", emoji: "🥬", color: "green", days: 30, shelfLife: 5 },
  { name: "Pineapple", group: "Fruit", emoji: "🍍", color: "yellow", days: 540, shelfLife: 10 },
  { name: "Potato", group: "Root crop", emoji: "🥔", color: "earth", days: 90, shelfLife: 60 },
  { name: "Radish", group: "Root crop", emoji: "🥕", color: "red", days: 35, shelfLife: 7 },
  { name: "Rice", group: "Grain", emoji: "🌾", color: "yellow", days: 120, shelfLife: 365 },
  { name: "Sayote", group: "Vegetable", emoji: "🥑", color: "green", days: 100, shelfLife: 14 },
  { name: "Sitaw", group: "Vegetable", emoji: "🫛", color: "green", days: 60, shelfLife: 5 },
  { name: "Squash", group: "Vegetable", emoji: "🎃", color: "orange", days: 100, shelfLife: 90 },
  { name: "Strawberry", group: "Fruit", emoji: "🍓", color: "red", days: 90, shelfLife: 3 },
  { name: "Sweet Potato", group: "Root crop", emoji: "🍠", color: "orange", days: 110, shelfLife: 90 },
  { name: "Tomato", group: "Fruit", emoji: "🍅", color: "red", days: 70, shelfLife: 7 },
  { name: "Upo", group: "Vegetable", emoji: "🥒", color: "green", days: 70, shelfLife: 7 },
  { name: "Patola", group: "Vegetable", emoji: "🥒", color: "green", days: 70, shelfLife: 5 },
  { name: "Ube", group: "Root crop", emoji: "🍠", color: "purple", days: 270, shelfLife: 60 },
  { name: "Watermelon", group: "Fruit", emoji: "🍉", color: "red", days: 85, shelfLife: 14 },
]

const REGIONS = [
  { name: "Cordillera Administrative Region", code: "CAR", featured: ["Strawberry", "Potato", "Lettuce", "Broccoli"] },
  { name: "Ilocos Region", code: "Region I", featured: ["Rice", "Corn", "Mung Bean", "Mango"] },
  { name: "Cagayan Valley", code: "Region II", featured: ["Rice", "Corn", "Peanut", "Mung Bean"] },
  { name: "Central Luzon", code: "Region III", featured: ["Rice", "Corn", "Mango", "Cabbage"] },
  { name: "CALABARZON", code: "Region IV-A", featured: ["Banana", "Pineapple", "Mango"] },
  { name: "MIMAROPA", code: "Region IV-B", featured: ["Banana", "Calamansi", "Mango", "Cassava"] },
  { name: "Bicol Region", code: "Region V", featured: ["Rice", "Banana", "Corn", "Cassava"] },
  { name: "Western Visayas", code: "Region VI", featured: ["Rice", "Mango", "Corn", "Eggplant"] },
  { name: "Central Visayas", code: "Region VII", featured: ["Mango", "Corn", "Rice", "Eggplant", "Okra", "Banana"] },
  { name: "Eastern Visayas", code: "Region VIII", featured: ["Rice", "Banana", "Cassava", "Corn"] },
  { name: "Zamboanga Peninsula", code: "Region IX", featured: ["Corn", "Cassava", "Mango", "Banana"] },
  { name: "Northern Mindanao", code: "Region X", featured: ["Pineapple", "Corn", "Banana", "Cabbage"] },
  { name: "Davao Region", code: "Region XI", featured: ["Durian", "Banana", "Mango", "Corn"] },
  { name: "SOCCSKSARGEN", code: "Region XII", featured: ["Corn", "Rice", "Banana", "Mango"] },
  { name: "Caraga", code: "Region XIII", featured: ["Rice", "Corn", "Banana", "Cassava"] },
  { name: "Bangsamoro", code: "BARMM", featured: ["Rice", "Corn", "Cassava", "Mango"] },
]

const CATEGORIES = ["All", "Vegetable", "Fruit", "Root crop", "Grain", "Legume"]
const RECENT_CROPS = ["Okra", "Tomato", "Mango"]
function localDateString(date) {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, "0")
  const day = String(date.getDate()).padStart(2, "0")
  return `${year}-${month}-${day}`
}

function addDays(dateString, days) {
  const date = new Date(`${dateString}T12:00:00`)
  date.setDate(date.getDate() + days)
  return localDateString(date)
}

function CropTile({ crop, selected, onSelect, compact = false }) {
  return (
    <button
      type="button"
      className={`add-crop-tile${selected ? " is-selected" : ""}${compact ? " is-compact" : ""}`}
      onClick={() => onSelect(crop.name)}
      aria-pressed={selected}
    >
      <span className={`add-crop-tile-art tone-${crop.color}`} aria-hidden="true">{crop.emoji}</span>
      <span className="add-crop-tile-name">{crop.name}</span>
      <span className="add-crop-tile-category">{crop.group}</span>
      {selected && <span className="add-crop-tile-check"><Check size={12} aria-hidden="true" /></span>}
    </button>
  )
}

function AddCropPage() {
  const navigate = useNavigate()
  const imageInput = useRef(null)
  const today = localDateString(new Date())
  const [regionCode, setRegionCode] = useState("Region VII")
  const [selectedName, setSelectedName] = useState("")
  const [specialtyCrop, setSpecialtyCrop] = useState(false)
  const [isOrganic, setIsOrganic] = useState(false)
  const [seedlings, setSeedlings] = useState("")
  const [search, setSearch] = useState("")
  const [category, setCategory] = useState("All")
  const [field, setField] = useState("")
  const [plantedDate, setPlantedDate] = useState(today)
  const [estimatedHarvest, setEstimatedHarvest] = useState("")
  const [shelfLifeDays, setShelfLifeDays] = useState("")
  const [description, setDescription] = useState("")
  const [image, setImage] = useState("")
  const [imageFile, setImageFile] = useState(null)
  const [imageName, setImageName] = useState("")
  const [error, setError] = useState("")
  const [submitting, setSubmitting] = useState(false)

  const region = REGIONS.find((item) => item.code === regionCode) || REGIONS[8]
  const selectedCrop = CROPS.find((item) => item.name === selectedName)
  const harvestEstimate = estimatedHarvest || (selectedCrop && plantedDate ? addDays(plantedDate, selectedCrop.days) : "")
  const regionCrops = region.featured.map((name) => CROPS.find((crop) => crop.name === name)).filter(Boolean)
  const recentCrops = RECENT_CROPS.map((name) => CROPS.find((crop) => crop.name === name)).filter(Boolean)
  const filteredCrops = useMemo(() => {
    const query = search.trim().toLocaleLowerCase()
    return CROPS.filter((crop) =>
      (category === "All" || crop.group === category) &&
      (!query || crop.name.toLocaleLowerCase().includes(query)),
    )
  }, [category, search])

  function chooseCrop(name) {
    const nextCrop = CROPS.find((crop) => crop.name === name)
    if (!nextCrop) return
    setSelectedName(name)
    setEstimatedHarvest(plantedDate ? addDays(plantedDate, nextCrop.days) : "")
    setShelfLifeDays(String(nextCrop.shelfLife))
    setError("")
  }

  function handlePlantedDateChange(value) {
    setPlantedDate(value)
    if (selectedCrop && value) setEstimatedHarvest(addDays(value, selectedCrop.days))
    else setEstimatedHarvest("")
  }

  function handleImageChange(event) {
    const file = event.target.files?.[0]
    event.target.value = ""
    if (!file) return
    if (!["image/jpeg", "image/png", "image/webp"].includes(file.type)) {
      setError("Choose a JPEG, PNG or WebP crop photo.")
      return
    }
    const reader = new FileReader()
    reader.onload = () => {
      if (typeof reader.result !== "string") {
        setError("Could not display this photo. Please choose another.")
        return
      }
      setImage(reader.result)
      setImageFile(file)
      setImageName(file.name)
      setError("")
    }
    reader.onerror = () => setError("Could not read this photo. Please choose another.")
    reader.readAsDataURL(file)
  }

  async function handleSubmit(event) {
    event.preventDefault()
    if (!selectedCrop) {
      setError("Choose a crop before adding it.")
      return
    }
    const parsedShelfLife = Number(shelfLifeDays)
    if (!Number.isInteger(parsedShelfLife) || parsedShelfLife < 1 || parsedShelfLife > 3650) {
      setError("Shelf life must be from 1 to 3650 days.")
      return
    }

    const formData = new FormData()
    formData.set("name", selectedCrop.name)
    formData.set("datePlanted", plantedDate)
    formData.set("shelfLifeDays", String(parsedShelfLife))
    formData.set("description", description.trim())
    formData.set("field", field.trim())
    formData.set("isSpecialty", String(specialtyCrop))
    formData.set("isOrganic", String(isOrganic))
    if (seedlings) formData.set("seedlings", seedlings)
    if (estimatedHarvest) formData.set("harvestDate", estimatedHarvest)
    if (imageFile) formData.set("image", imageFile)

    setSubmitting(true)
    try {
      await createCrop(formData)
      navigate("/crops", { replace: true })
    } catch (saveError) {
      setError(saveError.response?.data?.message || "Could not save the crop. Please try again.")
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <main className="dashboard-main add-crop-page">
      <header className="dashboard-topbar">
        <div className="dashboard-breadcrumb">Crops <span>/</span> New crop</div>
        <button type="button" className="dashboard-icon-button crop-topbar-user" aria-label="Account">F</button>
      </header>

      <div className="add-crop-content">
        <button type="button" className="add-crop-back" onClick={() => navigate("/crops")}>
          <ArrowLeft size={15} aria-hidden="true" /> Back to crops
        </button>
        <header className="add-crop-page-heading">
          <p className="dashboard-eyebrow">Farm management</p>
          <h1 className="dashboard-page-title">Plant a new crop</h1>
          <p>Choose a crop and add its planting details to your farm.</p>
        </header>

        <form className="add-crop-form" onSubmit={handleSubmit}>
          <section className="add-crop-section">
            <div className="add-crop-section-heading">
              <span className="add-crop-section-icon"><Sprout size={17} aria-hidden="true" /></span>
              <div>
                <h2>Crop type</h2>
                <p>Select a crop from your region or browse all crops.</p>
              </div>
            </div>

            <label className="add-crop-region-select">
              <MapPin size={16} aria-hidden="true" />
              <span className="add-crop-region-label">
                <strong>Famous crops in your region</strong>
                <small>Recommendations based on your selected region</small>
              </span>
              <select value={regionCode} onChange={(event) => setRegionCode(event.target.value)} aria-label="Select region">
                {REGIONS.map((item) => <option value={item.code} key={item.code}>{item.name} ({item.code})</option>)}
              </select>
              <ChevronDown className="add-crop-region-chevron" size={15} aria-hidden="true" />
            </label>

            <div className="add-crop-featured-grid">
              {regionCrops.map((crop) => (
                <CropTile key={crop.name} crop={crop} selected={selectedName === crop.name} onSelect={chooseCrop} compact />
              ))}
            </div>

            <div className="add-crop-shelf">
              <div className="add-crop-shelf-heading">
                <h3>Recently used</h3>
                <span>Pick up where you left off</span>
              </div>
              <div className="add-crop-featured-grid">
                {recentCrops.map((crop) => (
                  <CropTile key={crop.name} crop={crop} selected={selectedName === crop.name} onSelect={chooseCrop} compact />
                ))}
              </div>
            </div>
          </section>

          <section className="add-crop-section add-crop-library-section">
            <div className="add-crop-library-heading">
              <div>
                <h2>All crops</h2>
                <p>Browse the crop library and choose what you’re planting.</p>
              </div>
              <span>{filteredCrops.length} crops</span>
            </div>

            <label className="add-crop-search">
              <Search size={16} aria-hidden="true" />
              <input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search crops..." />
              {search && <button type="button" onClick={() => setSearch("")} aria-label="Clear search"><X size={14} /></button>}
            </label>

            <div className="add-crop-category-list" aria-label="Filter by crop category">
              {CATEGORIES.map((item) => (
                <button
                  type="button"
                  className={category === item ? "is-active" : ""}
                  key={item}
                  onClick={() => setCategory(item)}
                  aria-pressed={category === item}
                >
                  {item === "All" ? "All crops" : item}
                </button>
              ))}
            </div>

            <div className="add-crop-library-grid">
              {filteredCrops.map((crop) => (
                <CropTile key={crop.name} crop={crop} selected={selectedName === crop.name} onSelect={chooseCrop} />
              ))}
              {!filteredCrops.length && <p className="add-crop-no-results">No crops match your search.</p>}
            </div>
          </section>

          {selectedCrop && (
            <section className="add-crop-selection-summary" aria-live="polite">
              <span><Check size={16} aria-hidden="true" /></span>
              <p><strong>{selectedCrop.name}</strong> selected <i /> Estimated harvest in {selectedCrop.days} days</p>
              <button type="button" onClick={() => { setSelectedName(""); setEstimatedHarvest("") }} aria-label="Remove selected crop">
                <X size={15} />
              </button>
            </section>
          )}

          <section className="add-crop-section add-crop-details-section">
            <div className="add-crop-section-heading">
              <span className="add-crop-section-icon"><Leaf size={17} aria-hidden="true" /></span>
              <div>
                <h2>Planting details</h2>
                <p>Add optional field, harvest and crop information.</p>
              </div>
            </div>

            <label className="add-crop-specialty">
              <input type="checkbox" checked={specialtyCrop} onChange={(event) => setSpecialtyCrop(event.target.checked)} />
              <span className="add-crop-checkmark"><Check size={13} aria-hidden="true" /></span>
              <span><strong>Specialty crop</strong><small>Mark this as a specialty crop on your farm.</small></span>
            </label>

            <label className="add-crop-field">
              Field / section <span>(optional)</span>
              <input value={field} onChange={(event) => setField(event.target.value)} maxLength={80} placeholder="e.g. North field, Section A" />
            </label>
            <label className="add-crop-field">
              Number of seedlings <span>(optional)</span>
              <input type="number" min="1" max="1000000" step="1" value={seedlings} onChange={(event) => setSeedlings(event.target.value)} placeholder="e.g. 120" />
            </label>
            <label className="add-crop-specialty">
              <input type="checkbox" checked={isOrganic} onChange={(event) => setIsOrganic(event.target.checked)} />
              <span className="add-crop-checkmark"><Check size={13} aria-hidden="true" /></span>
              <span><strong>Organically grown</strong><small>Mark this crop as organic.</small></span>
            </label>

            <div className="add-crop-date-grid">
              <label className="add-crop-field">
                <span className="add-crop-date-label">Planted date</span>
                <input type="date" value={plantedDate} onChange={(event) => handlePlantedDateChange(event.target.value)} required />
              </label>
              <label className="add-crop-field">
                <span className="add-crop-date-label">Estimated harvest date <span>(optional)</span></span>
                <input type="date" value={estimatedHarvest} min={plantedDate || undefined} onChange={(event) => setEstimatedHarvest(event.target.value)} />
              </label>
              <label className="add-crop-field">
                <span className="add-crop-date-label">Shelf life (days)</span>
                <input type="number" min="1" max="3650" step="1" value={shelfLifeDays} onChange={(event) => setShelfLifeDays(event.target.value)} required />
              </label>
              <label className="add-crop-field">
                <span className="add-crop-date-label">Estimated sell-by date</span>
                <input
                  type="date"
                  value={harvestEstimate && selectedCrop && Number(shelfLifeDays) > 0 ? addDays(harvestEstimate, Number(shelfLifeDays)) : ""}
                  readOnly
                  aria-readonly="true"
                />
              </label>
            </div>
            <p className="add-crop-date-hint"><CalendarDays size={13} aria-hidden="true" /> Harvest and sell-by estimates update when the crop or planting date changes.</p>

            <label className="add-crop-field">
              Description <span>(optional)</span>
              <textarea value={description} onChange={(event) => setDescription(event.target.value)} maxLength={300} rows={4} placeholder="Describe the variety, location, or any notes..." />
            </label>

            <div className="add-crop-field add-crop-image-field">
              <label className="add-crop-image-heading" htmlFor="add-crop-image-input">Crop image <span>(optional)</span></label>
              <input id="add-crop-image-input" ref={imageInput} type="file" accept="image/jpeg,image/png,image/webp" onChange={handleImageChange} />
              <button type="button" className="add-crop-image-picker" onClick={() => imageInput.current?.click()} aria-label={imageName ? `Change crop photo ${imageName}` : "Choose crop image"}>
                {image ? <img src={image} alt="Selected crop preview" /> : <ImagePlus size={21} aria-hidden="true" />}
                <span><strong>{imageName || "Upload a crop photo"}</strong><small>JPG, PNG or WebP · up to 20MB</small></span>
              </button>
            </div>
          </section>

          {error && <p className="add-crop-error" role="alert">{error}</p>}

          <div className="add-crop-submit-row">
            <button type="button" className="add-crop-cancel" onClick={() => navigate("/crops")}>Cancel</button>
            <button type="submit" className="add-crop-submit" disabled={!selectedCrop || submitting}>
              <Check size={16} aria-hidden="true" /> {submitting ? "Saving..." : "Add crop"}
            </button>
          </div>
        </form>
      </div>
    </main>
  )
}

export default AddCropPage

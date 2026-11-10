import { useRef, useState } from "react"
import { Archive, ImagePlus, X } from "lucide-react"
import { getAssetUrl } from "../../api/api"
import "../../styles/crops.css"

function getShelfLifeDays(crop) {
  if (Number.isInteger(crop?.shelfLifeDays) && crop.shelfLifeDays > 0) return crop.shelfLifeDays
  if (!crop?.harvestDate || !crop?.sellDate) return 7
  const harvestDate = new Date(`${crop.harvestDate}T12:00:00`)
  const sellDate = new Date(`${crop.sellDate}T12:00:00`)
  return Math.max(1, Math.round((sellDate - harvestDate) / 86400000))
}

function getSellDate(harvestDate, shelfLifeDays) {
  if (!harvestDate || !Number.isInteger(shelfLifeDays) || shelfLifeDays < 1) return ""
  const date = new Date(`${harvestDate}T12:00:00`)
  if (Number.isNaN(date.getTime())) return ""
  date.setDate(date.getDate() + shelfLifeDays)
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`
}

function CropManagementModal({ crop, mode, onClose, onSave, onArchive }) {
  const imageInput = useRef(null)
  const [description, setDescription] = useState(crop?.description || "")
  const [harvestDate, setHarvestDate] = useState(crop?.harvestDate || "")
  const [shelfLifeDays, setShelfLifeDays] = useState(String(getShelfLifeDays(crop)))
  const [image, setImage] = useState(crop?.imageUrl || crop?.image || "")
  const [imageFile, setImageFile] = useState(null)
  const [removeImage, setRemoveImage] = useState(false)
  const [field, setField] = useState(crop?.field || "")
  const [seedlings, setSeedlings] = useState(crop?.seedlings == null ? "" : String(crop.seedlings))
  const [isOrganic, setIsOrganic] = useState(Boolean(crop?.isOrganic))
  const [isSpecialty, setIsSpecialty] = useState(Boolean(crop?.isSpecialty))
  const [imageName, setImageName] = useState(crop?.imageName || ((crop?.imageUrl || crop?.image) ? "Current crop photo" : ""))
  const [error, setError] = useState("")
  const [saving, setSaving] = useState(false)

  if (!mode || !crop) return null

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
      setRemoveImage(false)
      setImageName(file.name)
      setError("")
    }
    reader.onerror = () => setError("Could not read this photo. Please choose another.")
    reader.readAsDataURL(file)
  }

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
            <h2 id="crop-dialog-title">{mode === "edit" ? "Edit crop" : `Archive ${crop.name}?`}</h2>
            <p>{mode === "edit" ? "Update your crop details." : "This crop will be moved out of active crops. You can restore it from History."}</p>
          </div>
          <button type="button" className="crop-dialog-close" onClick={onClose} aria-label="Close dialog">
            <X size={19} />
          </button>
        </header>

        {mode === "edit" ? (
          <form
            className="crop-dialog-form"
            onSubmit={async (event) => {
              event.preventDefault()
              const parsedShelfLife = Number(shelfLifeDays)
              if (!Number.isInteger(parsedShelfLife) || parsedShelfLife < 1 || parsedShelfLife > 3650) {
                setError("Shelf life must be from 1 to 3650 days.")
                return
              }
              if (!harvestDate) {
                setError("Estimated harvest date is required.")
                return
              }
              setSaving(true)
              setError("")
              try {
                await onSave({
                  ...crop,
                  description: description.trim(),
                  harvestDate,
                  sellDate: getSellDate(harvestDate, parsedShelfLife),
                  shelfLifeDays: parsedShelfLife,
                  field: field.trim(),
                  seedlings: seedlings ? Number(seedlings) : null,
                  isOrganic,
                  isSpecialty,
                }, { imageFile, removeImage })
              } catch (saveError) {
                setError(saveError.message || "Could not save crop changes.")
              } finally {
                setSaving(false)
              }
            }}
          >
            <label>
              Crop name
              <input value={crop.name} readOnly aria-readonly="true" />
            </label>
            <label>
              Estimated harvest date
              <input type="date" value={harvestDate} min={crop.datePlanted || undefined} onChange={(event) => setHarvestDate(event.target.value)} required />
            </label>
            <label>
              Planted date
              <input type="date" value={crop.datePlanted || ""} readOnly aria-readonly="true" />
            </label>
            <label>
              Shelf life (days)
              <input type="number" min="1" max="3650" step="1" value={shelfLifeDays} onChange={(event) => setShelfLifeDays(event.target.value)} required />
            </label>
            <label>
              Description
              <textarea value={description} onChange={(event) => setDescription(event.target.value)} maxLength={300} rows={3} />
            </label>
            <label>
              Field / section
              <input value={field} onChange={(event) => setField(event.target.value)} maxLength={80} />
            </label>
            <label>
              Number of seedlings
              <input type="number" min="1" max="1000000" step="1" value={seedlings} onChange={(event) => setSeedlings(event.target.value)} />
            </label>
            <label className="crop-dialog-check">
              <input type="checkbox" checked={isOrganic} onChange={(event) => setIsOrganic(event.target.checked)} />
              Organically grown
            </label>
            <label className="crop-dialog-check">
              <input type="checkbox" checked={isSpecialty} onChange={(event) => setIsSpecialty(event.target.checked)} />
              Specialty crop
            </label>
            <div className="crop-dialog-image-field">
              <span>Crop photo <small>(optional)</small></span>
              <input ref={imageInput} type="file" accept="image/jpeg,image/png,image/webp" onChange={handleImageChange} />
              <button type="button" className="crop-dialog-image-picker" onClick={() => imageInput.current?.click()}>
                {image ? <img src={getAssetUrl(image)} alt="Crop preview" /> : <ImagePlus size={20} aria-hidden="true" />}
                <span>{imageName || "Upload a crop photo"}<small>JPG, PNG or WebP · up to 20MB</small></span>
              </button>
              {image && <button type="button" className="crop-dialog-image-remove" onClick={() => { setImage(""); setImageFile(null); setImageName(""); setRemoveImage(true) }}>Remove photo</button>}
            </div>
            {error && <p className="crop-dialog-error" role="alert">{error}</p>}
            <footer>
              <button type="button" className="crop-dialog-cancel" onClick={onClose} disabled={saving}>Cancel</button>
              <button type="submit" className="crop-dialog-save" disabled={saving}>{saving ? "Saving..." : "Save changes"}</button>
            </footer>
          </form>
        ) : (
          <div className="crop-archive-confirm">
            <div className="crop-archive-warning"><Archive size={20} /></div>
            <p>Archive <strong>{crop.name}</strong> from your active crop list?</p>
            {error && <p className="crop-dialog-error" role="alert">{error}</p>}
            <footer>
              <button type="button" className="crop-dialog-cancel" onClick={onClose}>Keep crop</button>
              <button
                type="button"
                className="crop-dialog-archive"
                disabled={saving}
                onClick={async () => {
                  setSaving(true)
                  setError("")
                  try {
                    await onArchive(crop)
                  } catch (archiveError) {
                    setError(archiveError.message || "Could not archive this crop.")
                  } finally {
                    setSaving(false)
                  }
                }}
              >
                {saving ? "Archiving..." : "Archive crop"}
              </button>
            </footer>
          </div>
        )}
      </section>
    </div>
  )
}

export default CropManagementModal

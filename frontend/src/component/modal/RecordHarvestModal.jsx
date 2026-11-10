import { useEffect, useState } from "react"
import { Camera, Check, Sprout, X } from "lucide-react"
import "../../styles/harvest-modals.css"

const UNITS = ["kg", "pieces", "heads", "sack", "liters", "bottles"]
const LISTING_UNITS = ["kg", "heads", "sack"]

function RecordHarvestModal({ open, crop, onClose, onSubmit, errorMessage = "" }) {
  const [quantity, setQuantity] = useState("")
  const [unit, setUnit] = useState("kg")
  const [notes, setNotes] = useState("")
  const [shelfLifeDays, setShelfLifeDays] = useState(crop?.shelfLifeDays || 7)
  const [directToListing, setDirectToListing] = useState(false)
  const [listingPrice, setListingPrice] = useState("")
  const [photo, setPhoto] = useState(null)
  const [photoPreview, setPhotoPreview] = useState("")
  const [error, setError] = useState("")
  const [submitting, setSubmitting] = useState(false)

  useEffect(() => {
    if (!open) return undefined

    function handleKeyDown(event) {
      if (event.key === "Escape") onClose?.()
    }

    document.addEventListener("keydown", handleKeyDown)
    return () => document.removeEventListener("keydown", handleKeyDown)
  }, [open, onClose])

  if (!open) return null

  function handlePhotoChange(event) {
    const file = event.target.files?.[0]
    event.target.value = ""
    if (!file) return
    if (!["image/jpeg", "image/png", "image/webp"].includes(file.type)) {
      setError("Choose a JPEG, PNG or WebP photo.")
      return
    }
    if (file.size > 3 * 1024 * 1024) {
      setError("Harvest photos must be 3MB or smaller.")
      return
    }
    const reader = new FileReader()
    reader.onload = () => {
      if (typeof reader.result !== "string") {
        setError("Could not display this photo. Please choose another.")
        return
      }
      setPhoto(file)
      setPhotoPreview(reader.result)
      setError("")
    }
    reader.onerror = () => setError("Could not read this photo. Please choose another.")
    reader.readAsDataURL(file)
  }

  async function handleSubmit(event) {
    event.preventDefault()
    const parsedQuantity = Number(quantity)
    const parsedShelfLife = Number(shelfLifeDays)
    if (!Number.isFinite(parsedQuantity) || parsedQuantity <= 0) {
      setError("Enter a quantity greater than zero.")
      return
    }
    if (!Number.isInteger(parsedShelfLife) || parsedShelfLife < 1 || parsedShelfLife > 3650) {
      setError("Shelf life must be from 1 to 3650 days.")
      return
    }
    if (directToListing && !LISTING_UNITS.includes(unit)) {
      setError("Direct listing is available for kilograms, sacks, or heads.")
      return
    }
    const parsedListingPrice = Number(listingPrice)
    if (directToListing && (!Number.isFinite(parsedListingPrice) || parsedListingPrice < 0.01 || parsedListingPrice > 99999 || Math.round(parsedListingPrice * 100) / 100 !== parsedListingPrice)) {
      setError("Enter a listing price from PHP 0.01 to PHP 99,999 (up to 2 decimal places).")
      return
    }
    setSubmitting(true)
    setError("")
    try {
      await onSubmit?.({
        quantity: parsedQuantity,
        unit,
        notes: notes.trim(),
        shelfLifeDays: parsedShelfLife,
        directToListing,
        listingPrice: directToListing ? parsedListingPrice : null,
        photo,
      })
    } catch (submitError) {
      setError(submitError?.message || "Could not record this harvest. Please try again.")
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div
      className="harvest-modal-backdrop"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) onClose?.()
      }}
    >
      <section className="harvest-modal" role="dialog" aria-modal="true" aria-labelledby="record-harvest-title">
        <header className="harvest-modal-header">
          <span className="harvest-modal-icon"><Sprout size={21} aria-hidden="true" /></span>
          <div>
            <h2 id="record-harvest-title">Record harvest</h2>
            <p>Add the harvested yield for {crop?.name || "this crop"}.</p>
          </div>
          <button type="button" className="harvest-modal-close" onClick={onClose} aria-label="Close dialog">
            <X size={19} aria-hidden="true" />
          </button>
        </header>

        <form className="harvest-modal-form" onSubmit={handleSubmit}>
          <div className="harvest-form-row">
            <label>
              Harvest quantity
              <input
                type="number"
                min="0.01"
                step="0.01"
                value={quantity}
                onChange={(event) => setQuantity(event.target.value)}
                placeholder="e.g. 25"
                required
              />
            </label>
            <label>
              Unit
              <select value={unit} onChange={(event) => setUnit(event.target.value)}>
                {UNITS.map((option) => <option value={option} key={option}>{option}</option>)}
              </select>
            </label>
          </div>

          <label>
            Shelf life (days)
            <input
              type="number"
              min="1"
              max="3650"
              step="1"
              value={shelfLifeDays}
              onChange={(event) => setShelfLifeDays(event.target.value)}
              required
            />
          </label>

          <label className="harvest-auto-listing-option">
            <input type="checkbox" checked={directToListing} onChange={(event) => setDirectToListing(event.target.checked)} />
            <span>
              <strong>Send this harvest to Listings</strong>
              <small>The yield will be added to Inventory and a listing will be submitted for review.</small>
            </span>
          </label>

          {directToListing && (
            <label>
              Listing price per {unit} (PHP)
              <input
                type="number"
                min="0.01"
                max="99999"
                step="0.01"
                value={listingPrice}
                onChange={(event) => setListingPrice(event.target.value)}
                placeholder="e.g. 85"
                required
              />
            </label>
          )}

          <label>
            Notes <span className="harvest-optional">(optional)</span>
            <textarea
              value={notes}
              onChange={(event) => setNotes(event.target.value)}
              maxLength={500}
              rows={3}
              placeholder="Add harvest details"
            />
          </label>

          <label className="harvest-photo-label">
            Harvest photo <span className="harvest-optional">(optional)</span>
            <input type="file" accept="image/jpeg,image/png,image/webp" onChange={handlePhotoChange} />
            <span className="harvest-photo-picker">
              {photoPreview ? <img src={photoPreview} alt="Harvest preview" /> : <Camera size={19} aria-hidden="true" />}
              {photo?.name || "Choose a photo"}
            </span>
          </label>

          {(errorMessage || error) && <p className="harvest-modal-error" role="alert">{errorMessage || error}</p>}

          <footer className="harvest-modal-footer">
            <button type="button" className="harvest-cancel-button" onClick={onClose} disabled={submitting}>Cancel</button>
            <button type="submit" className="harvest-submit-button" disabled={submitting}><Check size={16} aria-hidden="true" /> {submitting ? "Recording..." : "Continue"}</button>
          </footer>
        </form>
      </section>
    </div>
  )
}

export default RecordHarvestModal

import { useEffect, useState } from "react"
import { PackageCheck, X } from "lucide-react"
import "../../styles/inventory.css"

function AddInventoryListingModal({ item, onClose, onSubmit }) {
  const [quantity, setQuantity] = useState(String(item.quantity))
  const [price, setPrice] = useState("")
  const [description, setDescription] = useState(item.description || `Fresh ${item.name.toLowerCase()} from the farm.`)
  const [error, setError] = useState("")
  const [submitting, setSubmitting] = useState(false)

  useEffect(() => {
    function handleKeyDown(event) {
      if (event.key === "Escape") onClose()
    }

    window.addEventListener("keydown", handleKeyDown)
    return () => window.removeEventListener("keydown", handleKeyDown)
  }, [onClose])

  function submit(event) {
    event.preventDefault()
    const listedQuantity = Number(quantity)
    const pricePerUnit = Number(price)

    if (!Number.isFinite(listedQuantity) || listedQuantity <= 0 || listedQuantity > Number(item.quantity)) {
      setError(`Enter a quantity greater than zero and no more than ${item.quantity} ${item.unit}.`)
      return
    }
    if (!Number.isFinite(pricePerUnit) || pricePerUnit <= 0) {
      setError("Enter a price greater than zero.")
      return
    }
    if (!description.trim()) {
      setError("Enter a product description.")
      return
    }

    setSubmitting(true)
    setError("")
    Promise.resolve(onSubmit({
      quantity: listedQuantity,
      price: pricePerUnit,
      description: description.trim(),
    }))
      .catch((submitError) => {
        setError(submitError.message || "Could not submit this listing. Please try again.")
      })
      .finally(() => setSubmitting(false))
  }

  return (
    <div
      className="inventory-modal-backdrop"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) onClose()
      }}
    >
      <section className="inventory-dialog inventory-listing-dialog" role="dialog" aria-modal="true" aria-labelledby="inventory-listing-title">
        <header className="inventory-dialog-header">
          <div>
            <h2 id="inventory-listing-title">Add {item.name} to listing</h2>
            <p>Choose how much of this crop to offer. Your inventory quantity will stay unchanged.</p>
          </div>
          <button type="button" className="inventory-dialog-close" onClick={onClose} disabled={submitting} aria-label="Close dialog">
            <X size={19} aria-hidden="true" />
          </button>
        </header>
        <form className="inventory-dialog-form" onSubmit={submit}>
          <div className="inventory-listing-available">
            <PackageCheck size={17} aria-hidden="true" />
            Available in inventory: <strong>{item.quantity} {item.unit}</strong>
          </div>
          <label>
            Quantity to list ({item.unit})
            <input
              type="number"
              min="0.01"
              max={item.quantity}
              step="0.01"
              value={quantity}
              onChange={(event) => setQuantity(event.target.value)}
              required
            />
          </label>
          <label>
            Price per {item.unit} (PHP)
            <input
              type="number"
              min="0.01"
              step="0.01"
              value={price}
              onChange={(event) => setPrice(event.target.value)}
              required
            />
          </label>
          <label>
            Product description
            <textarea
              value={description}
              onChange={(event) => setDescription(event.target.value)}
              maxLength={300}
              rows={4}
              required
            />
          </label>
          {error && <p className="inventory-dialog-error" role="alert">{error}</p>}
          <footer>
            <button type="button" className="inventory-button-secondary" onClick={onClose} disabled={submitting}>Cancel</button>
            <button type="submit" className="inventory-button-primary" disabled={submitting}>{submitting ? "Submitting..." : "Create listing"}</button>
          </footer>
        </form>
      </section>
    </div>
  )
}

export default AddInventoryListingModal

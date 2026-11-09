import { useEffect, useRef, useState } from "react"
import { Archive, Boxes, Clock3, Filter, ImagePlus, Leaf, Plus, Search, X } from "lucide-react"
import { useLocation, useNavigate } from "react-router-dom"
import InventoryCard from "../component/card/InventoryCard"
import InventoryLogModal from "../component/modal/InventoryLogModal"
import { INVENTORY_STORAGE_KEY, loadInventoryPreview } from "../data/inventory"
import "../styles/inventory.css"

const UNITS = ["kg", "pieces", "heads", "sack", "liters", "bottles"]

function InventoryDialog({ item, onClose, onSave }) {
  const imageInput = useRef(null)
  const [name, setName] = useState(item?.name || "")
  const [quantity, setQuantity] = useState(item?.quantity ?? "")
  const [unit, setUnit] = useState(item?.unit || "kg")
  const [category, setCategory] = useState(item?.category || "crop")
  const [harvestDate, setHarvestDate] = useState(item?.harvestDate || new Date().toISOString().slice(0, 10))
  const [status, setStatus] = useState(item?.status || "fresh")
  const [image, setImage] = useState(item?.image || "")
  const [imageName, setImageName] = useState(item?.image ? "Current photo" : "")
  const [error, setError] = useState("")

  function handleImageChange(event) {
    const file = event.target.files?.[0]
    event.target.value = ""
    if (!file) return
    if (!["image/jpeg", "image/png", "image/webp"].includes(file.type)) {
      setError("Choose a JPEG, PNG or WebP inventory photo.")
      return
    }
    if (file.size > 3 * 1024 * 1024) {
      setError("Inventory photos must be 3MB or smaller.")
      return
    }

    const reader = new FileReader()
    reader.onload = () => {
      if (typeof reader.result !== "string") {
        setError("Could not display this photo. Please choose another.")
        return
      }
      setImage(reader.result)
      setImageName(file.name)
      setError("")
    }
    reader.onerror = () => setError("Could not read this photo. Please choose another.")
    reader.readAsDataURL(file)
  }

  function submit(event) {
    event.preventDefault()
    const parsedQuantity = Number(quantity)
    if (!name.trim()) {
      setError("Enter an item name.")
      return
    }
    if (!Number.isFinite(parsedQuantity) || parsedQuantity <= 0) {
      setError("Enter a quantity greater than zero.")
      return
    }
    onSave({
      ...item,
      id: item?.id || `inventory-${crypto.randomUUID()}`,
      name: name.trim(),
      quantity: parsedQuantity,
      unit,
      category,
      harvestDate,
      status,
      image,
      imageName,
      emoji: item?.emoji || (category === "supply" ? "📦" : "🥬"),
      visual: item?.visual || (category === "supply" ? "supply" : "leafy"),
    })
  }

  return (
    <div className="inventory-modal-backdrop" onMouseDown={(event) => {
      if (event.target === event.currentTarget) onClose()
    }}>
      <section className="inventory-dialog" role="dialog" aria-modal="true" aria-labelledby="inventory-dialog-title">
        <header className="inventory-dialog-header">
          <div>
            <h2 id="inventory-dialog-title">{item ? "Edit inventory item" : "Add inventory item"}</h2>
            <p>Keep your crop and supply quantities up to date.</p>
          </div>
          <button type="button" className="inventory-dialog-close" onClick={onClose} aria-label="Close dialog"><X size={19} /></button>
        </header>
        <form className="inventory-dialog-form" onSubmit={submit}>
          <label>
            Item name
            <input value={name} onChange={(event) => setName(event.target.value)} maxLength={80} required placeholder="e.g. Lettuce" />
          </label>
          <div className="inventory-dialog-row">
            <label>
              Inventory type
              <select value={category} onChange={(event) => setCategory(event.target.value)}>
                <option value="crop">Crop</option>
                <option value="supply">Supply</option>
              </select>
            </label>
            <label>
              Status
              <select value={status} onChange={(event) => setStatus(event.target.value)}>
                <option value="fresh">Fresh</option>
                <option value="near-spoiling">Near Spoiling</option>
                <option value="spoiled">Spoiled</option>
              </select>
            </label>
          </div>
          <div className="inventory-dialog-row">
            <label>
              Quantity
              <input type="number" min="0.01" step="0.01" value={quantity} onChange={(event) => setQuantity(event.target.value)} required />
            </label>
            <label>
              Unit
              <select value={unit} onChange={(event) => setUnit(event.target.value)}>
                {UNITS.map((value) => <option value={value} key={value}>{value}</option>)}
              </select>
            </label>
          </div>
          <label>
            Harvest / received date
            <input type="date" value={harvestDate} onChange={(event) => setHarvestDate(event.target.value)} required />
          </label>
          <div className="inventory-dialog-image-field">
            <label htmlFor="inventory-image-input">Item photo <span>(optional)</span></label>
            <input
              id="inventory-image-input"
              ref={imageInput}
              className="inventory-dialog-image-input"
              type="file"
              accept="image/jpeg,image/png,image/webp"
              onChange={handleImageChange}
            />
            <div className="inventory-dialog-image-actions">
              <button
                type="button"
                className="inventory-dialog-image-picker"
                onClick={() => imageInput.current?.click()}
                aria-label={image ? `Change inventory photo ${imageName}` : "Choose inventory photo"}
              >
                {image
                  ? <img src={image} alt="Inventory item preview" />
                  : <ImagePlus size={21} aria-hidden="true" />}
                <span>
                  <strong>{imageName || "Upload an item photo"}</strong>
                  <small>JPG, PNG or WebP · up to 3MB</small>
                </span>
              </button>
              {image && (
                <button
                  type="button"
                  className="inventory-dialog-image-remove"
                  onClick={() => {
                    setImage("")
                    setImageName("")
                  }}
                >
                  <X size={14} aria-hidden="true" /> Remove
                </button>
              )}
            </div>
          </div>
          {error && <p className="inventory-dialog-error" role="alert">{error}</p>}
          <footer>
            <button type="button" className="inventory-button-secondary" onClick={onClose}>Cancel</button>
            <button type="submit" className="inventory-button-primary">{item ? "Save changes" : "Add item"}</button>
          </footer>
        </form>
      </section>
    </div>
  )
}

function ArchiveDialog({ item, onClose, onConfirm }) {
  if (!item) return null
  return (
    <div className="inventory-modal-backdrop" onMouseDown={(event) => {
      if (event.target === event.currentTarget) onClose()
    }}>
      <section className="inventory-dialog inventory-archive-dialog" role="dialog" aria-modal="true" aria-labelledby="inventory-archive-title">
        <span className="inventory-archive-icon"><Archive size={21} /></span>
        <h2 id="inventory-archive-title">Archive {item.name}?</h2>
        <p>This item will be removed from your active inventory.</p>
        <footer>
          <button type="button" className="inventory-button-secondary" onClick={onClose}>Keep item</button>
          <button type="button" className="inventory-button-danger" onClick={() => onConfirm(item.id)}>Archive item</button>
        </footer>
      </section>
    </div>
  )
}

function InventoryPage() {
  const navigate = useNavigate()
  const location = useLocation()
  const [inventory, setInventory] = useState(loadInventoryPreview)
  const [category, setCategory] = useState("crop")
  const [statusFilter, setStatusFilter] = useState("all")
  const [query, setQuery] = useState("")
  const [dialog, setDialog] = useState(() => {
    const editItemId = location.state?.editItemId
    const editItem = editItemId ? loadInventoryPreview().find((item) => item.id === editItemId) : null
    return editItem ? { mode: "edit", item: editItem } : null
  })
  const [notice, setNotice] = useState("")
  const [isInventoryLogOpen, setIsInventoryLogOpen] = useState(false)

  function persistInventory(nextInventory) {
    try {
      window.localStorage.setItem(INVENTORY_STORAGE_KEY, JSON.stringify(nextInventory))
      return true
    } catch (error) {
      console.error("Could not save inventory preview data:", error)
      return false
    }
  }

  useEffect(() => {
    if (location.state?.editItemId) navigate("/inventory", { replace: true, state: null })
  }, [location.state, navigate])

  const categoryItems = inventory.filter((item) => item.category === category)
  const visibleItems = categoryItems.filter((item) =>
    (statusFilter === "all" || item.status === statusFilter) &&
    item.name.toLocaleLowerCase().includes(query.trim().toLocaleLowerCase()),
  )
  const attentionCount = categoryItems.filter((item) => item.status === "near-spoiling").length
  const filterOptions = [
    { value: "all", label: category === "crop" ? "All crops" : "All supplies", count: categoryItems.length },
    { value: "fresh", label: "Fresh" },
    { value: "near-spoiling", label: "Near spoiling" },
    { value: "spoiled", label: "Spoiled" },
  ]

  function resetFilters() {
    setStatusFilter("all")
    setQuery("")
  }

  function saveItem(item) {
    const itemAlreadyExists = inventory.some((entry) => entry.id === item.id)
    const updatedInventory = itemAlreadyExists
      ? inventory.map((entry) => entry.id === item.id ? item : entry)
      : [item, ...inventory]
    setInventory(updatedInventory)
    const persisted = persistInventory(updatedInventory)
    setDialog(null)
    setNotice(persisted
      ? `${item.name} ${itemAlreadyExists ? "updated" : "added"} in this preview.`
      : "Inventory changed in this session, but could not be saved in this browser.")
  }

  function archiveItem(id) {
    const updatedInventory = inventory.filter((item) => item.id !== id)
    setInventory(updatedInventory)
    const persisted = persistInventory(updatedInventory)
    setDialog(null)
    setNotice(persisted
      ? "Item archived from this preview."
      : "Item archived for this session, but the change could not be saved in this browser.")
  }

  return (
    <main className="dashboard-main inventory-page">
      <header className="dashboard-topbar">
        <div className="dashboard-breadcrumb">Inventory</div>
        <button type="button" className="dashboard-icon-button" aria-label="Account">F</button>
      </header>

      <div className="inventory-content">
        <section className="inventory-heading">
          <div>
            <p className="dashboard-eyebrow">Farm management</p>
            <h1>Crop Inventory</h1>
            <p>Track harvested crops and farm supplies, all in one place.</p>
          </div>
          <div className="inventory-heading-actions">
            <button
              type="button"
              className="inventory-spoilage-button"
              onClick={() => setIsInventoryLogOpen(true)}
            >
              <Clock3 size={15} aria-hidden="true" /> Spoilage log
            </button>
            <button type="button" className="inventory-add-button" onClick={() => setDialog({ mode: "add" })}>
              <Plus size={16} aria-hidden="true" /> Add item
            </button>
          </div>
        </section>

        <section className="inventory-panel">
          <div className="inventory-panel-heading">
            <div>
              <h2>{category === "crop" ? "Crop Inventory" : "Supply Inventory"}</h2>
              <p>Track quantities and freshness of your {category === "crop" ? "harvested crops" : "farm supplies"}.</p>
            </div>
          </div>

          <section className="inventory-filter-toolbar" aria-label="Filter inventory">
            <div className="inventory-filter-options" role="group" aria-label="Inventory status">
              {filterOptions.map(({ value, label, count }) => (
                <button
                  type="button"
                  key={value}
                  className={`inventory-filter-option${statusFilter === value ? " is-active" : ""}`}
                  aria-pressed={statusFilter === value}
                  onClick={() => setStatusFilter(value)}
                >
                  {label}
                  {count !== undefined && <span>{count}</span>}
                </button>
              ))}
            </div>
            <label className="inventory-search">
              <Search size={17} aria-hidden="true" />
              <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder={`Search ${category === "crop" ? "crops" : "supplies"}`} />
              {query && <button type="button" onClick={() => setQuery("")} aria-label="Clear search"><X size={14} /></button>}
            </label>
            <button type="button" className="inventory-filter-reset" onClick={resetFilters}>
              <Filter size={16} aria-hidden="true" /> Reset
            </button>
          </section>

          <div className="inventory-filter-summary" aria-live="polite">
            <span><Leaf size={16} aria-hidden="true" /> {visibleItems.length} {category === "crop" ? (visibleItems.length === 1 ? "crop" : "crops") : (visibleItems.length === 1 ? "supply" : "supplies")} with filter</span>
            <span>{attentionCount} need attention</span>
          </div>

          <div className="inventory-tabs" role="tablist" aria-label="Inventory type">
            <button type="button" role="tab" aria-selected={category === "crop"} className={category === "crop" ? "is-active" : ""} onClick={() => setCategory("crop")}>
              <Leaf size={15} aria-hidden="true" /> Crops
            </button>
            <button type="button" role="tab" aria-selected={category === "supply"} className={category === "supply" ? "is-active" : ""} onClick={() => setCategory("supply")}>
              <Boxes size={15} aria-hidden="true" /> Supply
            </button>
          </div>

          {visibleItems.length ? (
            <div className="inventory-grid">
              {visibleItems.map((item) => (
                <InventoryCard
                  key={item.id}
                  item={item}
                  onView={(selectedItem) => navigate(`/inventory/${selectedItem.id}`, { state: { item: selectedItem } })}
                  onEdit={(selectedItem) => setDialog({ mode: "edit", item: selectedItem })}
                  onArchive={(selectedItem) => setDialog({ mode: "archive", item: selectedItem })}
                />
              ))}
            </div>
          ) : (
            <div className="inventory-empty">
              <Boxes size={28} aria-hidden="true" />
              <h3>{statusFilter !== "all" || query ? "No matching inventory items" : "No inventory items"}</h3>
              <p>{statusFilter !== "all" || query ? "Try changing the status filter or search." : "Add an item to start tracking your inventory."}</p>
              {statusFilter !== "all" || query
                ? <button type="button" className="inventory-filter-reset" onClick={resetFilters}>Reset filters</button>
                : <button type="button" className="inventory-add-button" onClick={() => setDialog({ mode: "add" })}><Plus size={15} /> Add item</button>}
            </div>
          )}
        </section>

        {notice && <p className="inventory-notice" role="status">{notice}</p>}
        <p className="inventory-preview-note"><Leaf size={14} aria-hidden="true" /> Sample inventory preview</p>
      </div>

      {(dialog?.mode === "add" || dialog?.mode === "edit") && (
        <InventoryDialog
          key={`${dialog.mode}-${dialog.item?.id || "new"}`}
          item={dialog.item}
          onClose={() => setDialog(null)}
          onSave={saveItem}
        />
      )}
      {dialog?.mode === "archive" && (
        <ArchiveDialog item={dialog.item} onClose={() => setDialog(null)} onConfirm={archiveItem} />
      )}
      {isInventoryLogOpen && (
        <InventoryLogModal inventory={inventory} onClose={() => setIsInventoryLogOpen(false)} />
      )}
    </main>
  )
}

export default InventoryPage

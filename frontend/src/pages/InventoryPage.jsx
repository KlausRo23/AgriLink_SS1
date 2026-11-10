import { useCallback, useEffect, useRef, useState } from "react"
import { Archive, Boxes, Clock3, Filter, ImagePlus, Leaf, Plus, Search, X } from "lucide-react"
import { useLocation, useNavigate } from "react-router-dom"
import InventoryCard from "../component/card/InventoryCard"
import InventoryLogModal from "../component/modal/InventoryLogModal"
import { CROP_SPECIALTIES } from "../data/cropSpecialties"
import {
  archiveInventoryItem,
  createInventoryItem,
  getInventory,
  updateInventoryItem,
} from "../api/api"
import { normalizeInventoryItem, toInventoryFormData } from "../utils/inventory"
import "../styles/inventory.css"

const UNITS = ["kg", "pieces", "heads", "sack", "liters", "bottles"]

function InventoryDialog({ item, onClose, onSave, saving }) {
  const imageInput = useRef(null)
  const [name, setName] = useState(() => {
    if (!item || item.category === "supply") return item?.name || ""
    const itemName = item.name.trim().toLocaleLowerCase()
    return CROP_SPECIALTIES.find((crop) => {
      const cropName = crop.toLocaleLowerCase()
      const pluralName = `${cropName}${cropName.endsWith("o") ? "es" : "s"}`
      return itemName === cropName || itemName === pluralName || itemName.endsWith(` ${cropName}`)
    }) || item.name
  })
  const [quantity, setQuantity] = useState(item?.quantity ?? "")
  const [unit, setUnit] = useState(item?.unit || "kg")
  const [category, setCategory] = useState(item?.category || "crop")
  const [harvestDate, setHarvestDate] = useState(item?.harvestDate || new Date().toISOString().slice(0, 10))
  const [expirationDate, setExpirationDate] = useState(item?.expirationDate ? new Date(item.expirationDate).toISOString().slice(0, 10) : "")
  const [image, setImage] = useState(item?.image || "")
  const [imageName, setImageName] = useState(item?.image ? "Current photo" : "")
  const [imageFile, setImageFile] = useState(null)
  const [removeImage, setRemoveImage] = useState(false)
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
      setImageFile(file)
      setRemoveImage(false)
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
    void submitItem({
      ...item,
      id: item?.id || `inventory-${crypto.randomUUID()}`,
      name: name.trim(),
      quantity: parsedQuantity,
      unit,
      category,
      harvestDate,
      expirationDate,
      status: item?.status || "fresh",
      image,
      icon: item?.icon || (category === "supply" ? "📦" : "🥬"),
      emoji: item?.emoji || (category === "supply" ? "📦" : "🥬"),
      imageFile,
      removeImage,
    })
  }

  async function submitItem(itemData) {
    setError("")
    try {
      await onSave(itemData)
    } catch (saveError) {
      setError(saveError.message || "Could not save this inventory item.")
    }
  }

  return (
    <div className="inventory-modal-backdrop" onMouseDown={(event) => {
      if (event.target === event.currentTarget && !saving) onClose()
    }}>
      <section className="inventory-dialog" role="dialog" aria-modal="true" aria-labelledby="inventory-dialog-title">
        <header className="inventory-dialog-header">
          <div>
            <h2 id="inventory-dialog-title">{item ? "Edit inventory item" : "Add inventory item"}</h2>
            <p>Keep your crop and supply quantities up to date.</p>
          </div>
          <button type="button" className="inventory-dialog-close" onClick={onClose} disabled={saving} aria-label="Close dialog"><X size={19} /></button>
        </header>
        <form className="inventory-dialog-form" onSubmit={submit}>
          <label>
            {category === "crop" ? "Crop" : "Item name"}
            {category === "crop" ? (
              <select value={name} onChange={(event) => setName(event.target.value)} required disabled={item?.sourceType === "HARVEST"}>
                <option value="" disabled>Select a crop</option>
                {name && !CROP_SPECIALTIES.includes(name) && <option value={name}>{name} (current item)</option>}
                {CROP_SPECIALTIES.map((crop) => <option value={crop} key={crop}>{crop}</option>)}
              </select>
            ) : (
              <input value={name} onChange={(event) => setName(event.target.value)} maxLength={80} required placeholder="e.g. Organic fertilizer" disabled={item?.sourceType === "HARVEST"} />
            )}
          </label>
          <div className="inventory-dialog-row">
            <label>
              Inventory type
              <select value={category} onChange={(event) => setCategory(event.target.value)} disabled={item?.sourceType === "HARVEST"}>
                <option value="crop">Crop</option>
                <option value="supply">Supply</option>
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
          <label>
            Expiration date <span>(optional)</span>
            <input type="date" value={expirationDate} onChange={(event) => setExpirationDate(event.target.value)} />
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
                    setImageFile(null)
                    setRemoveImage(Boolean(item?.image))
                  }}
                >
                  <X size={14} aria-hidden="true" /> Remove
                </button>
              )}
            </div>
          </div>
          {error && <p className="inventory-dialog-error" role="alert">{error}</p>}
          <footer>
            <button type="button" className="inventory-button-secondary" onClick={onClose} disabled={saving}>Cancel</button>
            <button type="submit" className="inventory-button-primary" disabled={saving}>{saving ? "Saving..." : item ? "Save changes" : "Add item"}</button>
          </footer>
        </form>
      </section>
    </div>
  )
}

function ArchiveDialog({ item, onClose, onConfirm, saving }) {
  if (!item) return null
  return (
    <div className="inventory-modal-backdrop" onMouseDown={(event) => {
      if (event.target === event.currentTarget && !saving) onClose()
    }}>
      <section className="inventory-dialog inventory-archive-dialog" role="dialog" aria-modal="true" aria-labelledby="inventory-archive-title">
        <span className="inventory-archive-icon"><Archive size={21} /></span>
        <h2 id="inventory-archive-title">Archive {item.name}?</h2>
        <p>This item will be removed from your active inventory.</p>
        <footer>
          <button type="button" className="inventory-button-secondary" onClick={onClose} disabled={saving}>Keep item</button>
          <button type="button" className="inventory-button-danger" onClick={() => onConfirm(item.id)} disabled={saving}>{saving ? "Archiving..." : "Archive item"}</button>
        </footer>
      </section>
    </div>
  )
}

function InventoryPage() {
  const navigate = useNavigate()
  const location = useLocation()
  const [inventory, setInventory] = useState([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [loadError, setLoadError] = useState("")
  const [actionError, setActionError] = useState("")
  const [category, setCategory] = useState("crop")
  const [statusFilter, setStatusFilter] = useState("all")
  const [query, setQuery] = useState("")
  const [dialog, setDialog] = useState(null)
  const [notice, setNotice] = useState(() => {
    const listingNotice = location.state?.listingNotice
    return listingNotice ? `${listingNotice.name} listing submitted for review.` : ""
  })
  const [isInventoryLogOpen, setIsInventoryLogOpen] = useState(false)

  const loadInventory = useCallback(async () => {
    setLoading(true)
    setLoadError("")
    try {
      const { data } = await getInventory({ page: 1, limit: 50 })
      const firstPage = data.data
      let items = firstPage.items
      if (firstPage.pagination.totalPages > 1) {
        const remainingPages = await Promise.all(
          Array.from({ length: firstPage.pagination.totalPages - 1 }, (_, index) =>
            getInventory({ page: index + 2, limit: 50 })),
        )
        items = items.concat(...remainingPages.map((response) => response.data.data.items))
      }
      setInventory(items.map(normalizeInventoryItem))
    } catch (error) {
      setLoadError(error.response?.data?.message || "Could not load your inventory.")
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    let active = true
    queueMicrotask(() => {
      if (active) void loadInventory()
    })
    return () => {
      active = false
    }
  }, [loadInventory])

  useEffect(() => {
    const editItemId = location.state?.editItemId
    if (!editItemId || loading) return
    const editItem = inventory.find((item) => item.id === editItemId)
    if (editItem) {
      queueMicrotask(() => setDialog({ mode: "edit", item: editItem }))
    }
    navigate("/inventory", { replace: true, state: null })
  }, [inventory, loading, location.state, navigate])

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

  async function saveItem(item) {
    const itemAlreadyExists = inventory.some((entry) => entry.id === item.id)
    setSaving(true)
    setActionError("")
    try {
      const formData = toInventoryFormData(item, item.imageFile, item.removeImage)
      const response = itemAlreadyExists
        ? await updateInventoryItem(item.id, formData)
        : await createInventoryItem(formData)
      const savedItem = normalizeInventoryItem(response.data.data)
      setInventory((current) => itemAlreadyExists
        ? current.map((entry) => entry.id === savedItem.id ? savedItem : entry)
        : [savedItem, ...current])
      setDialog(null)
      setNotice(`${savedItem.name} ${itemAlreadyExists ? "updated" : "added"} in your inventory.`)
    } catch (error) {
      const message = error.response?.data?.message || `Could not ${itemAlreadyExists ? "update" : "add"} this item.`
      setActionError(message)
      throw new Error(message, { cause: error })
    } finally {
      setSaving(false)
    }
  }

  async function archiveItem(id) {
    setSaving(true)
    setActionError("")
    try {
      await archiveInventoryItem(id)
      setInventory((current) => current.filter((item) => item.id !== id))
      setDialog(null)
      setNotice("Item archived from your inventory.")
    } catch (error) {
      setActionError(error.response?.data?.message || "Could not archive this inventory item.")
    } finally {
      setSaving(false)
    }
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
            <h1 className="dashboard-page-title">Crop Inventory</h1>
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
            <button type="button" className="inventory-add-button" onClick={() => { setActionError(""); setDialog({ mode: "add" }) }}>
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
          {loadError && (
            <div className="inventory-empty" role="alert">
              <p>{loadError}</p>
              <button type="button" className="inventory-filter-reset" onClick={loadInventory}>Try again</button>
            </div>
          )}
          {actionError && <p className="inventory-dialog-error" role="alert">{actionError}</p>}

          <div className="inventory-tabs" role="tablist" aria-label="Inventory type">
            <button type="button" role="tab" aria-selected={category === "crop"} className={category === "crop" ? "is-active" : ""} onClick={() => setCategory("crop")}>
              <Leaf size={15} aria-hidden="true" /> Crops
            </button>
            <button type="button" role="tab" aria-selected={category === "supply"} className={category === "supply" ? "is-active" : ""} onClick={() => setCategory("supply")}>
              <Boxes size={15} aria-hidden="true" /> Supply
            </button>
          </div>

          {loading ? (
            <div className="inventory-empty" role="status">Loading inventory...</div>
          ) : visibleItems.length ? (
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

        {notice && (
          <div className="inventory-notice" role="status">
            <span>{notice}</span>
          </div>
        )}
        <p className="inventory-preview-note"><Leaf size={14} aria-hidden="true" /> Inventory synced with your AgriLink account.</p>
      </div>

      {(dialog?.mode === "add" || dialog?.mode === "edit") && (
        <InventoryDialog
          key={`${dialog.mode}-${dialog.item?.id || "new"}`}
          item={dialog.item}
          onClose={() => { if (!saving) { setActionError(""); setDialog(null) } }}
          onSave={saveItem}
          saving={saving}
        />
      )}
      {dialog?.mode === "archive" && (
        <ArchiveDialog item={dialog.item} onClose={() => { if (!saving) setDialog(null) }} onConfirm={archiveItem} saving={saving} />
      )}
      {isInventoryLogOpen && (
        <InventoryLogModal inventory={inventory} onClose={() => setIsInventoryLogOpen(false)} />
      )}
    </main>
  )
}

export default InventoryPage

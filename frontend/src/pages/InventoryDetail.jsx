import { useEffect, useState } from "react"
import { ArrowLeft, BellRing, Boxes, CalendarDays, Clock3, Leaf, PackageCheck, Pencil, ShieldCheck, Store } from "lucide-react"
import { useNavigate, useParams } from "react-router-dom"
import toast from "react-hot-toast"
import AddInventoryListingModal from "../component/modal/AddInventoryListingModal"
import ReminderModal from "../component/modal/ReminderModal"
import { createListing, getInventoryItem } from "../api/api"
import { normalizeInventoryItem } from "../utils/inventory"
import "../styles/inventory.css"

const STATUS_LABELS = {
  fresh: "Fresh",
  "near-spoiling": "Near Spoiling",
  spoiled: "Spoiled",
}

const REMINDERS_STORAGE_KEY = "agrilink-inventory-reminders-v1"

function formatDate(value) {
  if (!value) return "Not set"
  const date = new Date(`${value}T12:00:00`)
  if (Number.isNaN(date.getTime())) return "Not set"
  return new Intl.DateTimeFormat("en-PH", { month: "long", day: "numeric", year: "numeric" }).format(date)
}

function getReminder(itemId) {
  try {
    const reminders = JSON.parse(window.localStorage.getItem(REMINDERS_STORAGE_KEY) || "{}")
    return reminders[itemId] || null
  } catch (error) {
    console.error("Could not load inventory reminders:", error)
    return null
  }
}

function InventoryDetail() {
  const { id } = useParams()
  const navigate = useNavigate()
  const [item, setItem] = useState(null)
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState("")
  const [isReminderOpen, setIsReminderOpen] = useState(false)
  const [isListingOpen, setIsListingOpen] = useState(false)
  const [reminder, setReminder] = useState(null)

  useEffect(() => {
    let active = true
    getInventoryItem(id)
      .then(({ data }) => {
        if (!active) return
        const inventoryItem = normalizeInventoryItem(data.data)
        setItem(inventoryItem)
        setReminder(getReminder(inventoryItem.id))
      })
      .catch((error) => {
        if (active) setLoadError(error.response?.data?.message || "Could not load this inventory item.")
      })
      .finally(() => {
        if (active) setLoading(false)
      })
    return () => {
      active = false
    }
  }, [id])

  if (loading || loadError || !item) {
    return (
      <main className="dashboard-main inventory-page">
        <header className="dashboard-topbar">
          <button type="button" className="inventory-detail-back" onClick={() => navigate("/inventory")}>
            <ArrowLeft size={16} aria-hidden="true" /> Back to inventory
          </button>
        </header>
        <section className="inventory-detail-not-found">
          {loading ? <h1 role="status">Loading inventory item...</h1> : (
            <>
              <Boxes size={30} aria-hidden="true" />
              <h1>{loadError ? "Could not load item" : "Inventory item not found"}</h1>
              <p>{loadError || "This item may have been archived or removed from your inventory."}</p>
            </>
          )}
          <button type="button" className="inventory-add-button" onClick={() => navigate("/inventory")}>Return to inventory</button>
        </section>
      </main>
    )
  }

  const isSupply = item.category === "supply"
  const status = STATUS_LABELS[item.status] ? item.status : "fresh"
  const categoryLabel = isSupply ? "Farm supply" : "Harvested crop"

  async function addToListing({ quantity, price, description }) {
    try {
      await createListing({
        inventoryId: item.id,
        stock: quantity,
        price,
        description,
      })
      toast.success(`${item.name} submitted as a listing.`)
    } catch (error) {
      throw new Error(error.response?.data?.message || "Could not submit this listing.", { cause: error })
    }
    setIsListingOpen(false)
    navigate("/inventory", { state: { listingNotice: { name: item.name } } })
  }

  return (
    <main className="dashboard-main inventory-page">
      <header className="dashboard-topbar inventory-detail-topbar">
        <button type="button" className="inventory-detail-back" onClick={() => navigate("/inventory")}>
          <ArrowLeft size={16} aria-hidden="true" /> Inventory
        </button>
        <button type="button" className="dashboard-avatar inventory-detail-account" aria-label="Account">F</button>
      </header>

      <div className="inventory-content inventory-detail-content">
        <div className="inventory-detail-breadcrumb">Inventory <span>/</span> {item.name}</div>

        <section className="inventory-detail-overview">
          <div className="inventory-detail-product">
            <div className={`inventory-detail-art inventory-visual--${item.visual || "leafy"}`}>
              {item.image ? <img src={item.image} alt={item.name} /> : <span aria-hidden="true">{item.emoji || "🥬"}</span>}
            </div>
            <div className="inventory-detail-product-info">
              <span className="inventory-detail-category">{isSupply ? <Boxes size={13} aria-hidden="true" /> : <Leaf size={13} aria-hidden="true" />} {categoryLabel}</span>
              <h1>{item.name}</h1>
              {!isSupply && (
                <>
                  <span className={`inventory-detail-status inventory-detail-status--${status}`}>
                    <i aria-hidden="true" /> {STATUS_LABELS[status]}
                  </span>
                  <p>{status === "spoiled" ? "Inspect this item before use or sale." : status === "near-spoiling" ? "Prioritize this item for use or sale." : "This item is currently in good condition."}</p>
                </>
              )}
              <button type="button" className="inventory-detail-edit-link" onClick={() => navigate("/inventory", { state: { editItemId: item.id } })}>
                <Pencil size={14} aria-hidden="true" /> Edit item details
              </button>
            </div>
          </div>

          <aside className="inventory-detail-stock-card" aria-label="Current stock">
            <div className="inventory-detail-stock-label"><Boxes size={16} aria-hidden="true" /> Available stock</div>
            <p>Current quantity</p>
            <strong>{item.quantity}<small>{item.unit}</small></strong>
            <div className="inventory-detail-stock-divider" />
            {item.category === "crop" && status !== "spoiled" && ["kg", "sack", "heads"].includes(item.unit) && (
              <button type="button" className="inventory-detail-listing-link" onClick={() => setIsListingOpen(true)}>
                <Store size={15} aria-hidden="true" /> Add to listing
              </button>
            )}
          </aside>
        </section>

        <section className={`inventory-detail-facts${isSupply ? " inventory-detail-facts--supply" : ""}`} aria-label="Item information">
          <div><CalendarDays size={16} aria-hidden="true" /><span>{isSupply ? "Received date" : "Harvested date"}</span><strong>{formatDate(item.harvestDate)}</strong></div>
          <div><PackageCheck size={16} aria-hidden="true" /><span>Condition</span><strong>{STATUS_LABELS[status]}</strong></div>
          {item.expirationDate && <div><CalendarDays size={16} aria-hidden="true" /><span>Expiration date</span><strong>{formatDate(item.expirationDate)}</strong></div>}
          <div>{isSupply ? <Boxes size={16} aria-hidden="true" /> : <Leaf size={16} aria-hidden="true" />}<span>Inventory type</span><strong>{categoryLabel}</strong></div>
        </section>

        <div className="inventory-detail-lower-grid">
          <section className="inventory-detail-panel">
            <div className="inventory-detail-panel-heading">
              <span><CalendarDays size={17} aria-hidden="true" /></span>
              <div><h2>Item timeline</h2><p>Important dates for this inventory item</p></div>
            </div>
            <div className="inventory-detail-timeline">
              <div><span className="inventory-detail-timeline-dot" /><span><strong>{item.category === "supply" ? "Received" : "Harvested"}</strong><time>{formatDate(item.harvestDate)}</time></span></div>
              <div><span className="inventory-detail-timeline-dot is-current" /><span><strong>Current stock</strong><time>{item.quantity} {item.unit} available</time></span></div>
            </div>
          </section>

          <section className="inventory-detail-panel inventory-detail-reminder-panel">
            <div className="inventory-detail-panel-heading">
              <span><BellRing size={17} aria-hidden="true" /></span>
              <div><h2>Stock reminder</h2><p>Choose a day and minimum stock level</p></div>
            </div>
            {reminder ? (
              <div className="inventory-detail-saved-reminder">
                <ShieldCheck size={18} aria-hidden="true" />
                <p>Reminder on <strong>{formatDate(reminder.reminderDate)}</strong> or when stock reaches <strong>{reminder.stockLevel} {reminder.unit}</strong>.</p>
              </div>
            ) : (
              <p className="inventory-detail-no-reminder"><Clock3 size={15} aria-hidden="true" /> No reminder is set for this item.</p>
            )}
            <button type="button" className="inventory-detail-reminder-link" onClick={() => setIsReminderOpen(true)}>
              <BellRing size={15} aria-hidden="true" /> {reminder ? "Change reminder" : "Set a reminder"}
            </button>
          </section>
        </div>
      </div>

      {isReminderOpen && (
        <ReminderModal
          item={item}
          onClose={() => setIsReminderOpen(false)}
          onSaved={setReminder}
        />
      )}
      {isListingOpen && (
        <AddInventoryListingModal
          item={item}
          onClose={() => setIsListingOpen(false)}
          onSubmit={addToListing}
        />
      )}
    </main>
  )
}

export default InventoryDetail

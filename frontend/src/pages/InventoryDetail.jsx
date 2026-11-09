import { useState } from "react"
import { ArrowLeft, BellRing, Boxes, CalendarDays, Clock3, Leaf, PackageCheck, Pencil, ShieldCheck } from "lucide-react"
import { useLocation, useNavigate, useParams } from "react-router-dom"
import ReminderModal from "../component/modal/ReminderModal"
import { loadInventoryPreview } from "../data/inventory"
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
  const location = useLocation()
  const navigate = useNavigate()
  const item = location.state?.item || loadInventoryPreview().find((inventoryItem) => inventoryItem.id === id)
  const [isReminderOpen, setIsReminderOpen] = useState(false)
  const [reminder, setReminder] = useState(() => item ? getReminder(item.id) : null)

  if (!item) {
    return (
      <main className="dashboard-main inventory-page">
        <header className="dashboard-topbar">
          <button type="button" className="inventory-detail-back" onClick={() => navigate("/inventory")}>
            <ArrowLeft size={16} aria-hidden="true" /> Back to inventory
          </button>
        </header>
        <section className="inventory-detail-not-found">
          <Boxes size={30} aria-hidden="true" />
          <h1>Inventory item not found</h1>
          <p>This item may have been archived or removed from the inventory preview.</p>
          <button type="button" className="inventory-add-button" onClick={() => navigate("/inventory")}>Return to inventory</button>
        </section>
      </main>
    )
  }

  const status = STATUS_LABELS[item.status] ? item.status : "fresh"
  const categoryLabel = item.category === "supply" ? "Farm supply" : "Harvested crop"

  return (
    <main className="dashboard-main inventory-page">
      <header className="dashboard-topbar">
        <button type="button" className="inventory-detail-back" onClick={() => navigate("/inventory")}>
          <ArrowLeft size={16} aria-hidden="true" /> Inventory
        </button>
        <button type="button" className="dashboard-icon-button" aria-label="Account">F</button>
      </header>

      <div className="inventory-content inventory-detail-content">
        <div className="inventory-detail-breadcrumb">Inventory <span>/</span> {item.name}</div>

        <section className="inventory-detail-overview">
          <div className="inventory-detail-product">
            <div className={`inventory-detail-art inventory-visual--${item.visual || "leafy"}`}>
              {item.image ? <img src={item.image} alt={item.name} /> : <span aria-hidden="true">{item.emoji || "🥬"}</span>}
            </div>
            <div className="inventory-detail-product-info">
              <span className="inventory-detail-category">{item.category === "supply" ? <Boxes size={13} aria-hidden="true" /> : <Leaf size={13} aria-hidden="true" />} {categoryLabel}</span>
              <h1>{item.name}</h1>
              <span className={`inventory-detail-status inventory-detail-status--${status}`}>
                <i aria-hidden="true" /> {STATUS_LABELS[status]}
              </span>
              <p>{status === "spoiled" ? "Inspect this item before use or sale." : status === "near-spoiling" ? "Prioritize this item for use or sale." : "This item is currently in good condition."}</p>
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
            {reminder ? (
              <span className="inventory-detail-threshold"><BellRing size={14} aria-hidden="true" /> Alert at {reminder.stockLevel} {reminder.unit}</span>
            ) : (
              <span className="inventory-detail-threshold is-unset"><BellRing size={14} aria-hidden="true" /> No stock threshold set</span>
            )}
          </aside>
        </section>

        <section className="inventory-detail-facts" aria-label="Item information">
          <div><CalendarDays size={16} aria-hidden="true" /><span>{item.category === "supply" ? "Received date" : "Harvested date"}</span><strong>{formatDate(item.harvestDate)}</strong></div>
          <div><PackageCheck size={16} aria-hidden="true" /><span>Condition</span><strong>{STATUS_LABELS[status]}</strong></div>
          <div>{item.category === "supply" ? <Boxes size={16} aria-hidden="true" /> : <Leaf size={16} aria-hidden="true" />}<span>Inventory type</span><strong>{categoryLabel}</strong></div>
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
    </main>
  )
}

export default InventoryDetail

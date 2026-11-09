import { useEffect, useState } from "react"
import { BellRing, CalendarDays, X } from "lucide-react"
import "../../styles/inventory.css"

const REMINDERS_STORAGE_KEY = "agrilink-inventory-reminders-v1"

function localDateString(date) {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, "0")
  const day = String(date.getDate()).padStart(2, "0")
  return `${year}-${month}-${day}`
}

function getSavedReminder(itemId) {
  try {
    const savedReminders = JSON.parse(window.localStorage.getItem(REMINDERS_STORAGE_KEY) || "{}")
    return savedReminders[itemId] || null
  } catch (error) {
    console.error("Could not load inventory reminders:", error)
    return null
  }
}

function ReminderModal({ item, onClose, onSaved }) {
  const [existingReminder] = useState(() => getSavedReminder(item.id))
  const [reminderDate, setReminderDate] = useState(() => {
    if (existingReminder?.reminderDate) return existingReminder.reminderDate
    const tomorrow = new Date()
    tomorrow.setDate(tomorrow.getDate() + 1)
    return localDateString(tomorrow)
  })
  const [stockLevel, setStockLevel] = useState(existingReminder?.stockLevel ?? Math.max(1, Math.ceil(Number(item.quantity) / 2)))
  const [error, setError] = useState("")

  useEffect(() => {
    const previousOverflow = document.body.style.overflow
    document.body.style.overflow = "hidden"

    function handleKeyDown(event) {
      if (event.key === "Escape") onClose()
    }

    window.addEventListener("keydown", handleKeyDown)
    return () => {
      document.body.style.overflow = previousOverflow
      window.removeEventListener("keydown", handleKeyDown)
    }
  }, [onClose])

  function submit(event) {
    event.preventDefault()
    const parsedStockLevel = Number(stockLevel)
    if (!reminderDate) {
      setError("Choose a day for this reminder.")
      return
    }
    if (!Number.isFinite(parsedStockLevel) || parsedStockLevel <= 0) {
      setError("Enter a stock level greater than zero.")
      return
    }

    const reminder = {
      itemId: item.id,
      itemName: item.name,
      reminderDate,
      stockLevel: parsedStockLevel,
      unit: item.unit,
      updatedAt: new Date().toISOString(),
    }

    try {
      const savedReminders = JSON.parse(window.localStorage.getItem(REMINDERS_STORAGE_KEY) || "{}")
      window.localStorage.setItem(REMINDERS_STORAGE_KEY, JSON.stringify({
        ...savedReminders,
        [item.id]: reminder,
      }))
      onSaved?.(reminder)
      onClose()
    } catch (storageError) {
      console.error("Could not save inventory reminder:", storageError)
      setError("Could not save the reminder in this browser. Please try again.")
    }
  }

  return (
    <div
      className="inventory-modal-backdrop"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) onClose()
      }}
    >
      <section className="inventory-dialog inventory-reminder-dialog" role="dialog" aria-modal="true" aria-labelledby="inventory-reminder-title">
        <header className="inventory-dialog-header">
          <div className="inventory-reminder-heading-icon"><BellRing size={18} aria-hidden="true" /></div>
          <div>
            <h2 id="inventory-reminder-title">Set a stock reminder</h2>
            <p>Get a reminder for {item.name} by day or when its stock reaches a level.</p>
          </div>
          <button type="button" className="inventory-dialog-close" onClick={onClose} aria-label="Close reminder">
            <X size={19} aria-hidden="true" />
          </button>
        </header>
        <form className="inventory-dialog-form" onSubmit={submit}>
          <label>
            Reminder day
            <span className="inventory-reminder-field-icon">
              <CalendarDays size={15} aria-hidden="true" />
              <input type="date" min={localDateString(new Date())} value={reminderDate} onChange={(event) => setReminderDate(event.target.value)} required />
            </span>
          </label>
          <label>
            Remind me when stock is at or below
            <span className="inventory-reminder-stock-field">
              <input
                type="number"
                min="0.01"
                step="0.01"
                value={stockLevel}
                onChange={(event) => setStockLevel(event.target.value)}
                required
              />
              <strong>{item.unit}</strong>
            </span>
          </label>
          <p className="inventory-reminder-current-stock">Current stock: <strong>{item.quantity} {item.unit}</strong></p>
          <p className="inventory-reminder-preview-note">Saved in this browser preview; notifications are not sent yet.</p>
          {error && <p className="inventory-dialog-error" role="alert">{error}</p>}
          <footer>
            <button type="button" className="inventory-button-secondary" onClick={onClose}>Cancel</button>
            <button type="submit" className="inventory-button-primary">{existingReminder ? "Update reminder" : "Save reminder"}</button>
          </footer>
        </form>
      </section>
    </div>
  )
}

export default ReminderModal

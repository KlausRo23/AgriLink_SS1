import { useEffect, useState } from "react"
import { Archive, Box, Check, Leaf, RotateCcw, Trash2, X } from "lucide-react"
import "../../styles/history.css"

const INITIAL_ARCHIVE = [
  { id: "archive-1", name: "Pesticide", itemType: "Supply", archivedAt: "2026-09-23T16:20:00", reason: "Archived from inventory" },
  { id: "archive-2", name: "Lettuce", itemType: "Crop", archivedAt: "2026-09-22T09:05:00", reason: "Archived crop" },
  { id: "archive-3", name: "Seedling trays", itemType: "Supply", archivedAt: "2026-09-21T13:45:00", reason: "Archived from inventory" },
  { id: "archive-4", name: "Eggplant", itemType: "Crop", archivedAt: "2026-09-20T11:30:00", reason: "Archived crop" },
  { id: "archive-5", name: "Corn", itemType: "Crop", archivedAt: "2026-09-18T08:10:00", reason: "Archived crop" },
  { id: "archive-6", name: "Tomato", itemType: "Crop", archivedAt: "2026-09-17T12:00:00", reason: "Archived crop" },
]

const ARCHIVE_TABS = [
  { id: "all", label: "All" },
  { id: "Crop", label: "Crops" },
  { id: "Supply", label: "Supplies" },
]

function formatArchivedAt(value) {
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return "Date unavailable"
  return new Intl.DateTimeFormat("en-PH", {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  }).format(date)
}

function ArchiveModal({ isOpen, onClose, onRestore }) {
  const [items, setItems] = useState(INITIAL_ARCHIVE)
  const [activeTab, setActiveTab] = useState("all")
  const [confirmingDelete, setConfirmingDelete] = useState(null)
  const [message, setMessage] = useState("")

  useEffect(() => {
    if (!isOpen) return undefined

    function handleKeyDown(event) {
      if (event.key === "Escape") {
        if (confirmingDelete) setConfirmingDelete(null)
        else onClose()
      }
    }

    window.addEventListener("keydown", handleKeyDown)
    return () => window.removeEventListener("keydown", handleKeyDown)
  }, [confirmingDelete, isOpen, onClose])

  if (!isOpen) return null

  const filteredItems = items.filter((item) => activeTab === "all" || item.itemType === activeTab)
  const counts = {
    all: items.length,
    Crop: items.filter((item) => item.itemType === "Crop").length,
    Supply: items.filter((item) => item.itemType === "Supply").length,
  }

  function restoreItem(item) {
    setItems((current) => current.filter((entry) => entry.id !== item.id))
    onRestore?.(item)
    setMessage(`${item.name} restored to your active items.`)
  }

  function deleteItem() {
    if (!confirmingDelete) return
    setItems((current) => current.filter((entry) => entry.id !== confirmingDelete.id))
    setMessage(`${confirmingDelete.name} was permanently deleted.`)
    setConfirmingDelete(null)
  }

  return (
    <div
      className="archive-modal-backdrop"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget && !confirmingDelete) onClose()
      }}
    >
      <section className="archive-modal" role="dialog" aria-modal="true" aria-labelledby="archive-modal-title">
        <header className="archive-modal-heading">
          <div>
            <h2 id="archive-modal-title">Archive</h2>
            <p>Removed items are kept here. Restore them anytime, or delete them for good.</p>
          </div>
          <button type="button" className="archive-modal-close" onClick={onClose} aria-label="Close archive">
            <X size={20} aria-hidden="true" />
          </button>
        </header>

        <div className="archive-modal-tabs" role="tablist" aria-label="Filter archived items">
          {ARCHIVE_TABS.map((tab) => (
            <button
              type="button"
              role="tab"
              aria-selected={activeTab === tab.id}
              className={`archive-modal-tab${activeTab === tab.id ? " is-active" : ""}`}
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
            >
              {tab.label}<span>{counts[tab.id]}</span>
            </button>
          ))}
        </div>

        <div className="archive-modal-list">
          {filteredItems.length ? filteredItems.map((item) => {
            const isCrop = item.itemType === "Crop"
            const ItemIcon = isCrop ? Leaf : Box
            return (
              <article className="archive-modal-item" key={item.id}>
                <span className={`archive-modal-item-icon${isCrop ? " is-crop" : ""}`}>
                  <ItemIcon size={18} aria-hidden="true" />
                </span>
                <div className="archive-modal-item-info">
                  <strong>{item.name}</strong>
                  <span>{item.itemType} · Archived {formatArchivedAt(item.archivedAt)}</span>
                </div>
                <div className="archive-modal-item-actions">
                  <button type="button" className="archive-restore-button" onClick={() => restoreItem(item)}>
                    <RotateCcw size={13} aria-hidden="true" /> Restore
                  </button>
                  <button type="button" className="archive-delete-button" onClick={() => setConfirmingDelete(item)}>
                    <Trash2 size={13} aria-hidden="true" /> Delete
                  </button>
                </div>
              </article>
            )
          }) : (
            <div className="archive-modal-empty">
              <Archive size={23} aria-hidden="true" />
              <strong>No archived {activeTab === "all" ? "items" : `${activeTab.toLowerCase()}s`}</strong>
              <span>Items you archive will appear here.</span>
            </div>
          )}
        </div>

        {message && <p className="archive-modal-message" role="status"><Check size={14} aria-hidden="true" />{message}</p>}
        <p className="archive-modal-preview-note">Archive actions are preview-only and are not saved to the server.</p>
      </section>

      {confirmingDelete && (
        <div className="archive-confirm-backdrop">
          <section className="archive-confirm-dialog" role="alertdialog" aria-modal="true" aria-labelledby="archive-confirm-title">
            <span className="archive-confirm-icon"><Trash2 size={19} aria-hidden="true" /></span>
            <h3 id="archive-confirm-title">Delete {confirmingDelete.name} permanently?</h3>
            <p>This item will be removed from the archive and cannot be restored.</p>
            <div>
              <button type="button" className="archive-confirm-cancel" onClick={() => setConfirmingDelete(null)}>Cancel</button>
              <button type="button" className="archive-confirm-delete" onClick={deleteItem}>Delete permanently</button>
            </div>
          </section>
        </div>
      )}
    </div>
  )
}

export default ArchiveModal

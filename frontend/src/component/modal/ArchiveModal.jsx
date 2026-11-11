import { useEffect, useState } from "react"
import { Archive, Box, Check, Leaf, RotateCcw, Trash2, X } from "lucide-react"
import { deleteArchivedItem, getArchivedItems, restoreArchivedItem } from "../../api/api"
import toast from "react-hot-toast"
import "../../styles/history.css"

const ARCHIVE_TABS = [
  { id: "all", label: "All" },
  { id: "Crop", label: "Crops" },
  { id: "Inventory", label: "Inventory" },
  { id: "Listing", label: "Listings" },
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

function archiveItemLabel(item) {
  if (item.itemType === "Inventory") {
    return item.info?.category === "supply" ? "Supply" : "Crop inventory"
  }
  return item.itemType
}

function ArchiveModal({ isOpen, onClose, onChanged }) {
  const [items, setItems] = useState([])
  const [pagination, setPagination] = useState(null)
  const [activeTab, setActiveTab] = useState("all")
  const [confirmingDelete, setConfirmingDelete] = useState(null)
  const [message, setMessage] = useState("")
  const [error, setError] = useState("")
  const [isLoading, setIsLoading] = useState(false)
  const [pendingId, setPendingId] = useState("")
  const [reloadKey, setReloadKey] = useState(0)

  useEffect(() => {
    if (!isOpen) return undefined

    let active = true
    Promise.resolve()
      .then(() => {
        if (!active) return null
        setItems([])
        setPagination(null)
        setError("")
        setMessage("")
        setIsLoading(true)
        return getArchivedItems({ page: 1, limit: 50 })
      })
      .then((response) => {
        if (!response) return
        const { data } = response
        const result = data?.data
        if (!Array.isArray(result?.items)) throw new Error("The archive response was invalid.")
        if (active) {
          setItems(result.items)
          setPagination(result.pagination)
        }
      })
      .catch((requestError) => {
        console.error("Could not load archive:", requestError)
        if (active) setError(requestError.response?.data?.message || requestError.message || "Could not load the archive.")
      })
      .finally(() => {
        if (active) setIsLoading(false)
      })

    return () => { active = false }
  }, [isOpen, reloadKey])

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
    Inventory: items.filter((item) => item.itemType === "Inventory").length,
    Listing: items.filter((item) => item.itemType === "Listing").length,
  }

  async function loadMore() {
    if (!pagination || pagination.page >= pagination.totalPages || isLoading) return
    setIsLoading(true)
    setError("")
    try {
      const { data } = await getArchivedItems({ page: pagination.page + 1, limit: pagination.limit })
      const result = data?.data
      if (!Array.isArray(result?.items)) throw new Error("The archive response was invalid.")
      setItems((current) => [...current, ...result.items])
      setPagination(result.pagination)
    } catch (requestError) {
      console.error("Could not load more archived items:", requestError)
      setError(requestError.response?.data?.message || requestError.message || "Could not load more archived items.")
    } finally {
      setIsLoading(false)
    }
  }

  async function restoreItem(item) {
    setPendingId(item.id)
    setError("")
    try {
      await restoreArchivedItem(item.id)
      setItems((current) => current.filter((entry) => entry.id !== item.id))
      setMessage("")
      toast.success(`${item.name} restored to your active items.`)
      await onChanged?.()
    } catch (requestError) {
      console.error("Could not restore archived item:", requestError)
      setError(requestError.response?.data?.message || requestError.message || "Could not restore this item.")
    } finally {
      setPendingId("")
    }
  }

  async function deleteItem() {
    if (!confirmingDelete) return
    const item = confirmingDelete
    setPendingId(item.id)
    setError("")
    try {
      await deleteArchivedItem(item.id)
      setItems((current) => current.filter((entry) => entry.id !== item.id))
      setMessage("")
      toast.success(`${item.name} permanently deleted.`)
      setConfirmingDelete(null)
      await onChanged?.()
    } catch (requestError) {
      console.error("Could not permanently delete archived item:", requestError)
      setError(requestError.response?.data?.message || requestError.message || "Could not delete this item.")
    } finally {
      setPendingId("")
    }
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
            <p>Removed items are kept here. Restore eligible items, or delete them for good.</p>
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

        {error && <p className="archive-modal-message" role="alert">{error}</p>}
        <div className="archive-modal-list" aria-busy={isLoading}>
          {filteredItems.length ? filteredItems.map((item) => {
            const isCrop = item.itemType === "Crop" || (item.itemType === "Inventory" && item.info?.category === "crop")
            const canRestore = item.itemType !== "Crop" || item.info?.status !== "harvested"
            const ItemIcon = isCrop ? Leaf : Box
            return (
              <article className="archive-modal-item" key={item.id}>
                <span className={`archive-modal-item-icon${isCrop ? " is-crop" : ""}`}>
                  <ItemIcon size={18} aria-hidden="true" />
                </span>
                <div className="archive-modal-item-info">
                  <strong>{item.name}</strong>
                  <span>{archiveItemLabel(item)} · Archived {formatArchivedAt(item.archivedAt)}</span>
                </div>
                <div className="archive-modal-item-actions">
                  {canRestore && (
                    <button type="button" className="archive-restore-button" disabled={pendingId === item.id} onClick={() => restoreItem(item)}>
                      <RotateCcw size={13} aria-hidden="true" /> Restore
                    </button>
                  )}
                  <button type="button" className="archive-delete-button" disabled={pendingId === item.id} onClick={() => setConfirmingDelete(item)}>
                    <Trash2 size={13} aria-hidden="true" /> Delete
                  </button>
                </div>
              </article>
            )
          }) : (
            <div className="archive-modal-empty">
              <Archive size={23} aria-hidden="true" />
              <strong>{error ? "Archive unavailable" : isLoading ? "Loading archive…" : `No archived ${activeTab === "all" ? "items" : `${activeTab.toLowerCase()} items`}`}</strong>
              {error && <button type="button" className="history-load-more" onClick={() => setReloadKey((key) => key + 1)}>Try again</button>}
              {!isLoading && !error && <span>Items you archive will appear here.</span>}
            </div>
          )}
        </div>
        {pagination && pagination.page < pagination.totalPages && (
          <button type="button" className="history-load-more" disabled={isLoading} onClick={loadMore}>
            {isLoading ? "Loading…" : "Load more"}
          </button>
        )}

        {message && <p className="archive-modal-message" role="status"><Check size={14} aria-hidden="true" />{message}</p>}
      </section>

      {confirmingDelete && (
        <div className="archive-confirm-backdrop">
          <section className="archive-confirm-dialog" role="alertdialog" aria-modal="true" aria-labelledby="archive-confirm-title">
            <span className="archive-confirm-icon"><Trash2 size={19} aria-hidden="true" /></span>
            <h3 id="archive-confirm-title">Delete {confirmingDelete.name} permanently?</h3>
            <p>This item will be removed from the archive and cannot be restored.</p>
            <div>
              <button type="button" className="archive-confirm-cancel" disabled={pendingId === confirmingDelete.id} onClick={() => setConfirmingDelete(null)}>Cancel</button>
              <button type="button" className="archive-confirm-delete" disabled={pendingId === confirmingDelete.id} onClick={deleteItem}>
                {pendingId === confirmingDelete.id ? "Deleting…" : "Delete permanently"}
              </button>
            </div>
          </section>
        </div>
      )}
    </div>
  )
}

export default ArchiveModal

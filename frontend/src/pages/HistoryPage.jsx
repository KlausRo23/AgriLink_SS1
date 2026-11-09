import { useMemo, useState } from "react"
import { Archive, Box, Grid2X2, Leaf, Pencil, Plus, RotateCcw, Search, Sprout, Trash2 } from "lucide-react"
import HistoryCard from "../component/card/HistoryCard"
import ArchiveModal from "../component/modal/ArchiveModal"
import "../styles/history.css"

const ACTION_FILTERS = [
  { value: "all", label: "All actions", Icon: Grid2X2 },
  { value: "added", label: "Added", Icon: Plus },
  { value: "edited", label: "Edited", Icon: Pencil },
  { value: "archived", label: "Archived", Icon: Archive },
  { value: "restored", label: "Restored", Icon: RotateCcw },
  { value: "deleted", label: "Deleted", Icon: Trash2 },
  { value: "harvested", label: "Harvested", Icon: Sprout },
]

const INITIAL_HISTORY = [
  { id: "history-1", action: "harvested", name: "Tomato", itemType: "Crop", detail: "120 kg harvested", createdAt: "2026-10-26T09:12:00" },
  { id: "history-2", action: "restored", name: "Rice", itemType: "Crop", detail: "Returned from archive", createdAt: "2026-09-24T17:07:00" },
  { id: "history-3", action: "added", name: "Soil Amendments", itemType: "Supply", detail: "3 sacks added", createdAt: "2026-09-24T17:06:00" },
  { id: "history-4", action: "added", name: "Tomato", itemType: "Crop", detail: "120 seedlings", createdAt: "2026-09-24T17:05:00" },
  { id: "history-5", action: "added", name: "Seeds", itemType: "Supply", detail: "10 packs added", createdAt: "2026-09-24T16:44:00" },
  { id: "history-6", action: "edited", name: "Herbicide", itemType: "Supply", detail: "Quantity updated", createdAt: "2026-09-24T16:44:00" },
  { id: "history-7", action: "added", name: "Rice", itemType: "Crop", detail: "80 seedlings", createdAt: "2026-09-24T16:42:00" },
  { id: "history-8", action: "added", name: "Fertilizer", itemType: "Supply", detail: "5 sacks added", createdAt: "2026-09-24T16:41:00" },
  { id: "history-9", action: "added", name: "Grain sacks", itemType: "Supply", detail: "25 pieces added", createdAt: "2026-09-24T16:40:00" },
  { id: "history-10", action: "archived", name: "Rice", itemType: "Crop", detail: "Archived by you", createdAt: "2026-09-24T16:38:00" },
  { id: "history-11", action: "deleted", name: "Old fertilizer", itemType: "Supply", detail: "Permanently removed", createdAt: "2026-09-22T11:24:00" },
]

function HistoryPage() {
  const [history, setHistory] = useState(INITIAL_HISTORY)
  const [actionFilter, setActionFilter] = useState("all")
  const [itemType, setItemType] = useState("all")
  const [sortOrder, setSortOrder] = useState("newest")
  const [search, setSearch] = useState("")
  const [isArchiveOpen, setIsArchiveOpen] = useState(false)

  const filteredHistory = useMemo(() => {
    const query = search.trim().toLowerCase()
    return history
      .filter((entry) => actionFilter === "all" || entry.action === actionFilter)
      .filter((entry) => itemType === "all" || entry.itemType.toLowerCase() === itemType)
      .filter((entry) => !query || `${entry.name} ${entry.itemType} ${entry.detail}`.toLowerCase().includes(query))
      .sort((a, b) => sortOrder === "newest"
        ? new Date(b.createdAt) - new Date(a.createdAt)
        : new Date(a.createdAt) - new Date(b.createdAt))
  }, [actionFilter, history, itemType, search, sortOrder])

  function recordRestoredItem(item) {
    setHistory((current) => [{
      id: `history-${Date.now()}`,
      action: "restored",
      name: item.name,
      itemType: item.itemType,
      detail: "Returned from archive",
      createdAt: new Date().toISOString(),
    }, ...current])
  }

  return (
    <main className="dashboard-main history-page">
      <header className="dashboard-topbar">
        <div className="dashboard-breadcrumb">History</div>
        <button type="button" className="dashboard-avatar" aria-label="Account">F</button>
      </header>

      <div className="history-content">
        <header className="history-heading">
          <div>
            <p className="dashboard-eyebrow">Farm activity</p>
            <h1>History</h1>
            <p>A record of your farm changes, harvests, and archived items. History entries cannot be changed.</p>
          </div>
          <button type="button" className="history-archive-button" onClick={() => setIsArchiveOpen(true)}>
            <Archive size={15} aria-hidden="true" /> ARCHIVE
          </button>
        </header>

        <section className="history-toolbar" aria-label="History filters">
          <div className="history-action-filters" aria-label="Filter by action">
            {ACTION_FILTERS.map(({ value, label, Icon }) => (
              <button
                type="button"
                key={value}
                className={`history-filter-button${actionFilter === value ? " is-active" : ""}`}
                aria-label={label}
                aria-pressed={actionFilter === value}
                title={label}
                onClick={() => setActionFilter(value)}
              >
                <Icon size={16} aria-hidden="true" />
                <span>{label}</span>
              </button>
            ))}
          </div>
          <div className="history-filter-controls">
            <label className="history-search">
              <Search size={15} aria-hidden="true" />
              <input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search history" aria-label="Search history" />
            </label>
            <label className="history-select-wrap">
              <span>Item type</span>
              <select value={itemType} onChange={(event) => setItemType(event.target.value)} aria-label="Filter by item type">
                <option value="all">All types</option>
                <option value="crop">Crops</option>
                <option value="supply">Supplies</option>
              </select>
            </label>
            <label className="history-select-wrap">
              <span>Sort by</span>
              <select value={sortOrder} onChange={(event) => setSortOrder(event.target.value)} aria-label="Sort history">
                <option value="newest">Newest first</option>
                <option value="oldest">Oldest first</option>
              </select>
            </label>
            <span className="history-entry-count">{filteredHistory.length} {filteredHistory.length === 1 ? "entry" : "entries"}</span>
          </div>
        </section>

        <section className="history-list" aria-label="History entries">
          {filteredHistory.length > 0 ? filteredHistory.map((entry) => <HistoryCard key={entry.id} entry={entry} />) : (
            <div className="history-empty">
              <span><Box size={20} aria-hidden="true" /></span>
              <h2>No history found</h2>
              <p>Try adjusting the action, item type, or search filters.</p>
              <button type="button" onClick={() => { setActionFilter("all"); setItemType("all"); setSearch("") }}>Clear filters</button>
            </div>
          )}
        </section>
        <p className="history-preview-note"><Leaf size={13} aria-hidden="true" /> Preview activity only. Live history is not connected yet.</p>
      </div>
      <ArchiveModal
        isOpen={isArchiveOpen}
        onClose={() => setIsArchiveOpen(false)}
        onRestore={recordRestoredItem}
      />
    </main>
  )
}

export default HistoryPage

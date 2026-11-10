import { useCallback, useEffect, useMemo, useState } from "react"
import { Archive, Box, Grid2X2, Pencil, Plus, RotateCcw, Search, Sprout, Trash2 } from "lucide-react"
import { getHistory } from "../api/api"
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

async function fetchHistoryPage(page) {
  const { data } = await getHistory({ page, limit: 50 })
  const result = data?.data
  if (!Array.isArray(result?.entries)) throw new Error("The history response was invalid.")
  return result
}

function HistoryPage() {
  const [history, setHistory] = useState([])
  const [pagination, setPagination] = useState(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState("")
  const [actionFilter, setActionFilter] = useState("all")
  const [itemType, setItemType] = useState("all")
  const [sortOrder, setSortOrder] = useState("newest")
  const [search, setSearch] = useState("")
  const [isArchiveOpen, setIsArchiveOpen] = useState(false)

  const loadHistory = useCallback(async (page = 1, append = false) => {
    setIsLoading(true)
    setError("")
    try {
      const result = await fetchHistoryPage(page)
      setHistory((current) => append ? [...current, ...result.entries] : result.entries)
      setPagination(result.pagination)
    } catch (requestError) {
      console.error("Could not load history:", requestError)
      setError(requestError.response?.data?.message || requestError.message || "Could not load history.")
    } finally {
      setIsLoading(false)
    }
  }, [])

  useEffect(() => {
    let active = true
    fetchHistoryPage(1)
      .then((result) => {
        if (!active) return
        setHistory(result.entries)
        setPagination(result.pagination)
        setError("")
      })
      .catch((requestError) => {
        console.error("Could not load history:", requestError)
        if (active) setError(requestError.response?.data?.message || requestError.message || "Could not load history.")
      })
      .finally(() => {
        if (active) setIsLoading(false)
      })
    return () => { active = false }
  }, [])

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
            <h1 className="dashboard-page-title">History</h1>
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
                <option value="listing">Listings</option>
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

        {error && <p className="history-preview-note" role="alert">{error}</p>}
        <section className="history-list" aria-label="History entries" aria-busy={isLoading}>
          {isLoading && history.length === 0 ? (
            <p className="history-preview-note" role="status">Loading farm history…</p>
          ) : error && history.length === 0 ? (
            <div className="history-empty">
              <span><Box size={20} aria-hidden="true" /></span>
              <h2>History unavailable</h2>
              <p>{error}</p>
              <button type="button" onClick={() => loadHistory()}>Try again</button>
            </div>
          ) : filteredHistory.length > 0 ? filteredHistory.map((entry) => <HistoryCard key={entry.id} entry={entry} />) : (
            <div className="history-empty">
              <span><Box size={20} aria-hidden="true" /></span>
              <h2>{history.length ? "No history found" : "No farm activity yet"}</h2>
              <p>{history.length ? "Try adjusting the action, item type, or search filters." : "Changes to your crops and inventory will appear here."}</p>
              {history.length > 0 && <button type="button" onClick={() => { setActionFilter("all"); setItemType("all"); setSearch("") }}>Clear filters</button>}
            </div>
          )}
        </section>
        {pagination && pagination.page < pagination.totalPages && (
          <button
            type="button"
            className="history-load-more"
            disabled={isLoading}
            onClick={() => loadHistory(pagination.page + 1, true)}
          >
            {isLoading ? "Loading…" : "Load more"}
          </button>
        )}
      </div>
      <ArchiveModal
        isOpen={isArchiveOpen}
        onClose={() => setIsArchiveOpen(false)}
        onChanged={() => loadHistory()}
      />
    </main>
  )
}

export default HistoryPage

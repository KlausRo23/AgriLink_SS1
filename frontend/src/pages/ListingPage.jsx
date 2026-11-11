import { useCallback, useEffect, useMemo, useState } from "react"
import { ArrowDownWideNarrow, Search, Undo2, X } from "lucide-react"
import { useNavigate } from "react-router-dom"
import toast from "react-hot-toast"
import ListingCard from "../component/card/ListingCard"
import { archiveListing, getMyListings, resubmitListing, updateListing } from "../api/api"
import { normalizeListing } from "../data/listings"
import "../styles/listings.css"

const TABS = [
  { id: "all", label: "All listings" },
  { id: "pending", label: "Pending review" },
  { id: "returned", label: "Needs updates" },
]

function ListingEditModal({ listing, onClose, onSave, saving }) {
  const [description, setDescription] = useState(listing.description || "")
  const [stock, setStock] = useState(String(listing.stock ?? ""))
  const [price, setPrice] = useState(String(listing.price ?? ""))
  const [error, setError] = useState("")

  async function submit(event) {
    event.preventDefault()
    const parsedStock = Number(stock)
    const parsedPrice = Number(price)
    if (!description.trim()) {
      setError("Enter a product description.")
      return
    }
    if (!Number.isFinite(parsedStock) || parsedStock <= 0) {
      setError("Enter a quantity greater than zero.")
      return
    }
    if (!Number.isFinite(parsedPrice) || parsedPrice <= 0) {
      setError("Enter a price greater than zero.")
      return
    }

    try {
      await onSave({
        description: description.trim(),
        stock: parsedStock,
        price: parsedPrice,
      })
    } catch (saveError) {
      setError(saveError.message || "Could not update this listing.")
    }
  }

  return (
    <div className="listing-modal-backdrop" onMouseDown={(event) => {
      if (event.target === event.currentTarget && !saving) onClose()
    }}>
      <section className="listing-edit-modal" role="dialog" aria-modal="true" aria-labelledby="listing-edit-title">
        <header className="listing-edit-header">
          <div>
            <p className="listings-eyebrow">Manage product</p>
            <h2 id="listing-edit-title">Edit listing</h2>
            <p>Update your product details and offer information.</p>
          </div>
          <button type="button" className="listing-modal-close" onClick={onClose} disabled={saving} aria-label="Close edit listing"><X size={19} /></button>
        </header>
        <form className="listing-edit-form" onSubmit={submit}>
          <label>
            Product name
            <input value={listing.name} readOnly />
            <small>Product names and photos are managed in inventory.</small>
          </label>
          <label>
            Description
            <textarea value={description} onChange={(event) => setDescription(event.target.value)} maxLength={300} rows={4} required />
          </label>
          <div className="listing-edit-row">
            <label>
              Available quantity ({listing.unit})
              <input type="number" min="0.01" step="0.01" value={stock} onChange={(event) => setStock(event.target.value)} required />
            </label>
            <label>
              Price per {listing.unit} (PHP)
              <input type="number" min="0.01" step="0.01" value={price} onChange={(event) => setPrice(event.target.value)} required />
            </label>
          </div>
          {error && <p className="listing-edit-error" role="alert">{error}</p>}
          <footer>
            <button type="button" className="listing-modal-cancel" onClick={onClose} disabled={saving}>Cancel</button>
            <button type="submit" className="listing-edit-save" disabled={saving}>{saving ? "Saving..." : "Save changes"}</button>
          </footer>
        </form>
      </section>
    </div>
  )
}

function ListingPage() {
  const navigate = useNavigate()
  const [listings, setListings] = useState([])
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState("")
  const [activeTab, setActiveTab] = useState("all")
  const [sortBy, setSortBy] = useState("newest")
  const [search, setSearch] = useState("")
  const [unsubmitting, setUnsubmitting] = useState(null)
  const [editing, setEditing] = useState(null)
  const [notice, setNotice] = useState("")
  const [saving, setSaving] = useState(false)

  const loadFarmerListings = useCallback(async () => {
    setLoading(true)
    setLoadError("")
    try {
      const { data } = await getMyListings({ limit: 50 })
      if (!Array.isArray(data?.data?.listings)) {
        throw new Error("The listings response has an invalid format.")
      }
      setListings(data.data.listings.map(normalizeListing))
    } catch (error) {
      setLoadError(error.response?.data?.message || error.message || "Could not load your listings.")
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    let active = true
    queueMicrotask(() => {
      if (active) void loadFarmerListings()
    })
    return () => { active = false }
  }, [loadFarmerListings])

  const counts = useMemo(() => ({
    all: listings.length,
    pending: listings.filter((listing) => listing.status === "pending").length,
    returned: listings.filter((listing) => listing.status === "returned").length,
  }), [listings])

  const visibleListings = useMemo(() => {
    const query = search.trim().toLowerCase()
    const filtered = listings.filter((listing) => {
      const matchesTab = activeTab === "all" || listing.status === activeTab
      const matchesQuery = !query || `${listing.name} ${listing.seller} ${listing.region}`.toLowerCase().includes(query)
      return matchesTab && matchesQuery
    })
    return filtered.sort((a, b) => sortBy === "price-low"
      ? a.price - b.price
      : sortBy === "price-high"
        ? b.price - a.price
        : new Date(b.listedDate) - new Date(a.listedDate))
  }, [activeTab, listings, search, sortBy])

  async function unsubmitListing() {
    if (!unsubmitting) return
    setSaving(true)
    try {
      await archiveListing(unsubmitting.id)
      setListings((current) => current.filter((item) => item.id !== unsubmitting.id))
      setNotice("")
      toast.success(`${unsubmitting.name} moved to History.`)
    } catch (error) {
      setNotice(error.response?.data?.message || "Could not remove this listing.")
    } finally {
      setSaving(false)
      setUnsubmitting(null)
    }
  }

  async function saveListing(changes) {
    if (!editing) return
    setSaving(true)
    try {
      const { data } = await updateListing(editing.id, changes)
      const updatedListing = normalizeListing(data.data)
      setListings((current) => current.map((item) => item.id === updatedListing.id ? updatedListing : item))
      setEditing(null)
      setNotice("")
      toast.success(`${updatedListing.name} listing updated.`)
    } catch (error) {
      const message = error.response?.data?.message || "Could not update this listing."
      setNotice(message)
      throw new Error(message, { cause: error })
    } finally {
      setSaving(false)
    }
  }

  async function submitReturnedListing(listing) {
    setSaving(true)
    try {
      const { data } = await resubmitListing(listing.id)
      const updatedListing = normalizeListing(data.data)
      setListings((current) => current.map((item) => item.id === updatedListing.id ? updatedListing : item))
      setNotice("")
      toast.success(`${updatedListing.name} resubmitted for review.`)
    } catch (error) {
      setNotice(error.response?.data?.message || "Could not resubmit this listing.")
    } finally {
      setSaving(false)
    }
  }

  return (
    <main className="dashboard-main listings-page">
      <header className="dashboard-topbar">
        <div className="dashboard-breadcrumb">Listings</div>
        <button type="button" className="dashboard-avatar" aria-label="Account">F</button>
      </header>
      <div className="listings-content">
      <header className="listings-heading">
        <div>
          <p className="listings-eyebrow">Farm management</p>
          <h1 className="dashboard-page-title">Listings</h1>
          <p>Track the produce you’ve submitted for sale. Pending listings are waiting for review.</p>
        </div>
        <div className="listings-total">
          <span>{counts.pending}</span>
          <small>awaiting review</small>
        </div>
      </header>

      <section className="listings-toolbar" aria-label="Listing filters">
        <div className="listing-tabs" role="tablist" aria-label="Filter listings">
          {TABS.map((tab) => (
            <button
              type="button"
              role="tab"
              aria-selected={activeTab === tab.id}
              className={`listing-tab${activeTab === tab.id ? " is-active" : ""}`}
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
            >
              {tab.label}<span>{counts[tab.id]}</span>
            </button>
          ))}
        </div>
        <label className="listing-search">
          <Search size={16} aria-hidden="true" />
          <input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search listings" />
          {search && <button type="button" onClick={() => setSearch("")} aria-label="Clear search"><X size={14} /></button>}
        </label>
        <label className="listing-sort">
          <ArrowDownWideNarrow size={16} aria-hidden="true" />
          <span>Sort by</span>
          <select value={sortBy} onChange={(event) => setSortBy(event.target.value)} aria-label="Sort listings">
            <option value="newest">Newest first</option>
            <option value="price-low">Price: low to high</option>
            <option value="price-high">Price: high to low</option>
          </select>
        </label>
      </section>

      {loadError && <p className="listing-edit-error" role="alert">{loadError} <button type="button" onClick={loadFarmerListings}>Try again</button></p>}
      {loading ? (
        <p className="dashboard-empty-message" role="status">Loading your listings...</p>
      ) : visibleListings.length > 0 ? (
        <section className="listing-grid" aria-label="Listings">
          {visibleListings.map((listing) => (
            <ListingCard
              key={listing.id}
              listing={listing}
              onOpen={(item) => navigate(`/listings/${item.id}`)}
              onUnsubmit={(item) => setUnsubmitting(item)}
              onEdit={(item) => setEditing(item)}
              onResubmit={submitReturnedListing}
              saving={saving}
            />
          ))}
        </section>
      ) : (
        <div className="listings-empty">
          <span className="listings-empty-icon"><Search size={22} aria-hidden="true" /></span>
          <h2>{loadError ? "Listings could not be loaded" : "No listings found"}</h2>
          <p>{loadError ? "Check your connection and try again." : "Try changing your search or selecting another status."}</p>
          {(search || activeTab !== "all") && <button type="button" onClick={() => { setSearch(""); setActiveTab("all") }}>Clear filters</button>}
        </div>
      )}

      {unsubmitting && (
        <div className="listing-modal-backdrop" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) setUnsubmitting(null) }}>
          <section className="listing-review-modal" role="dialog" aria-modal="true" aria-labelledby="unsubmit-listing-title">
            <button type="button" className="listing-modal-close" onClick={() => setUnsubmitting(null)} disabled={saving} aria-label="Close dialog"><X size={19} /></button>
            <p className="listings-eyebrow">Pending listing</p>
            <h2 id="unsubmit-listing-title">Unsubmit {unsubmitting.name}?</h2>
            <p>This will remove the listing from your active submissions. You can submit it again later.</p>
            <div className="listing-review-footer">
              <button type="button" className="listing-modal-cancel" onClick={() => setUnsubmitting(null)} disabled={saving}>Keep listing</button>
              <button type="button" className="listing-unsubmit-button" onClick={unsubmitListing} disabled={saving}><Undo2 size={14} aria-hidden="true" /> {saving ? "Removing..." : "Unsubmit listing"}</button>
            </div>
          </section>
        </div>
      )}
      {editing && (
        <ListingEditModal
          key={editing.id}
          listing={editing}
          onClose={() => { if (!saving) setEditing(null) }}
          onSave={saveListing}
          saving={saving}
        />
      )}
      {notice && <p className="listing-edit-notice" role="status">{notice}</p>}
      </div>
    </main>
  )
}

export default ListingPage

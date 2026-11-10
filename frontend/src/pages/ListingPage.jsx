import { useMemo, useRef, useState } from "react"
import { ArrowDownWideNarrow, ImagePlus, Search, Undo2, X } from "lucide-react"
import { useNavigate } from "react-router-dom"
import ListingCard from "../component/card/ListingCard"
import { loadListings, saveListings } from "../data/listings"
import "../styles/listings.css"

const TABS = [
  { id: "all", label: "All listings" },
  { id: "pending", label: "Pending review" },
]

function ListingEditModal({ listing, onClose, onSave }) {
  const imageInput = useRef(null)
  const [name, setName] = useState(listing.name || "")
  const [description, setDescription] = useState(listing.description || "")
  const [stock, setStock] = useState(String(listing.stock ?? ""))
  const [price, setPrice] = useState(String(listing.price ?? ""))
  const [imageUrl, setImageUrl] = useState(listing.imageUrl || "")
  const [imageName, setImageName] = useState(listing.imageUrl ? "Current product photo" : "")
  const [error, setError] = useState("")

  function handleImageChange(event) {
    const file = event.target.files?.[0]
    event.target.value = ""
    if (!file) return
    if (!["image/jpeg", "image/png", "image/webp"].includes(file.type)) {
      setError("Choose a JPEG, PNG or WebP product photo.")
      return
    }
    if (file.size > 3 * 1024 * 1024) {
      setError("Product photos must be 3MB or smaller.")
      return
    }

    const reader = new FileReader()
    reader.onload = () => {
      if (typeof reader.result !== "string") {
        setError("Could not display this photo. Please choose another.")
        return
      }
      setImageUrl(reader.result)
      setImageName(file.name)
      setError("")
    }
    reader.onerror = () => setError("Could not read this photo. Please choose another.")
    reader.readAsDataURL(file)
  }

  function submit(event) {
    event.preventDefault()
    const parsedStock = Number(stock)
    const parsedPrice = Number(price)
    if (!name.trim()) {
      setError("Enter a product name.")
      return
    }
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

    onSave({
      ...listing,
      name: name.trim(),
      description: description.trim(),
      details: description.trim(),
      stock: parsedStock,
      price: parsedPrice,
      imageUrl,
      imageName,
    })
  }

  return (
    <div className="listing-modal-backdrop" onMouseDown={(event) => {
      if (event.target === event.currentTarget) onClose()
    }}>
      <section className="listing-edit-modal" role="dialog" aria-modal="true" aria-labelledby="listing-edit-title">
        <header className="listing-edit-header">
          <div>
            <p className="listings-eyebrow">Manage product</p>
            <h2 id="listing-edit-title">Edit listing</h2>
            <p>Update your product details and offer information.</p>
          </div>
          <button type="button" className="listing-modal-close" onClick={onClose} aria-label="Close edit listing"><X size={19} /></button>
        </header>
        <form className="listing-edit-form" onSubmit={submit}>
          <label>
            Product name
            <input value={name} onChange={(event) => setName(event.target.value)} maxLength={80} required />
          </label>
          <div className="listing-edit-image-field">
            <span>Product picture <small>(optional)</small></span>
            <input
              ref={imageInput}
              className="listing-edit-image-input"
              type="file"
              accept="image/jpeg,image/png,image/webp"
              onChange={handleImageChange}
              aria-label="Choose product picture"
            />
            <div className="listing-edit-image-actions">
              <button
                type="button"
                className="listing-edit-image-picker"
                onClick={() => imageInput.current?.click()}
                aria-label={imageUrl ? `Change product picture ${imageName}` : "Choose product picture"}
              >
                {imageUrl ? <img src={imageUrl} alt="Product preview" /> : <ImagePlus size={21} aria-hidden="true" />}
                <span><strong>{imageName || "Upload a product picture"}</strong><small>JPG, PNG or WebP · up to 3MB</small></span>
              </button>
              {imageUrl && (
                <button type="button" className="listing-edit-image-remove" onClick={() => { setImageUrl(""); setImageName("") }}>
                  <X size={14} aria-hidden="true" /> Remove
                </button>
              )}
            </div>
          </div>
          <label>
            Description
            <textarea value={description} onChange={(event) => setDescription(event.target.value)} maxLength={500} rows={4} required />
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
            <button type="button" className="listing-modal-cancel" onClick={onClose}>Cancel</button>
            <button type="submit" className="listing-edit-save">Save changes</button>
          </footer>
        </form>
      </section>
    </div>
  )
}

function ListingPage() {
  const navigate = useNavigate()
  const [listings, setListings] = useState(loadListings)
  const [activeTab, setActiveTab] = useState("all")
  const [sortBy, setSortBy] = useState("newest")
  const [search, setSearch] = useState("")
  const [unsubmitting, setUnsubmitting] = useState(null)
  const [editing, setEditing] = useState(null)
  const [notice, setNotice] = useState("")

  const counts = useMemo(() => ({
    all: listings.length,
    pending: listings.filter((listing) => listing.status === "pending").length,
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

  function unsubmitListing() {
    if (!unsubmitting) return
    const updatedListings = listings.filter((item) => item.id !== unsubmitting.id)
    setListings(updatedListings)
    if (!saveListings(updatedListings)) {
      setNotice("Listing removed from this session, but could not be saved in this browser.")
    }
    setUnsubmitting(null)
  }

  function saveListing(updatedListing) {
    const updatedListings = listings.map((item) => item.id === updatedListing.id ? updatedListing : item)
    setListings(updatedListings)
    const saved = saveListings(updatedListings)
    setEditing(null)
    setNotice(saved
      ? `${updatedListing.name} listing updated.`
      : "Listing updated in this session, but could not be saved in this browser.")
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

      {visibleListings.length > 0 ? (
        <section className="listing-grid" aria-label="Listings">
          {visibleListings.map((listing) => (
            <ListingCard
              key={listing.id}
              listing={listing}
              onOpen={(item) => navigate(`/listings/${item.id}`)}
              onUnsubmit={(item) => setUnsubmitting(item)}
              onEdit={(item) => setEditing(item)}
            />
          ))}
        </section>
      ) : (
        <div className="listings-empty">
          <span className="listings-empty-icon"><Search size={22} aria-hidden="true" /></span>
          <h2>No listings found</h2>
          <p>Try changing your search or selecting another status.</p>
          {(search || activeTab !== "all") && <button type="button" onClick={() => { setSearch(""); setActiveTab("all") }}>Clear filters</button>}
        </div>
      )}

      {unsubmitting && (
        <div className="listing-modal-backdrop" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) setUnsubmitting(null) }}>
          <section className="listing-review-modal" role="dialog" aria-modal="true" aria-labelledby="unsubmit-listing-title">
            <button type="button" className="listing-modal-close" onClick={() => setUnsubmitting(null)} aria-label="Close dialog"><X size={19} /></button>
            <p className="listings-eyebrow">Pending listing</p>
            <h2 id="unsubmit-listing-title">Unsubmit {unsubmitting.name}?</h2>
            <p>This will remove the listing from your active submissions. You can submit it again later.</p>
            <div className="listing-review-footer">
              <button type="button" className="listing-modal-cancel" onClick={() => setUnsubmitting(null)}>Keep listing</button>
              <button type="button" className="listing-unsubmit-button" onClick={unsubmitListing}><Undo2 size={14} aria-hidden="true" /> Unsubmit listing</button>
            </div>
          </section>
        </div>
      )}
      {editing && (
        <ListingEditModal
          key={editing.id}
          listing={editing}
          onClose={() => setEditing(null)}
          onSave={saveListing}
        />
      )}
      {notice && <p className="listing-edit-notice" role="status">{notice}</p>}
      </div>
    </main>
  )
}

export default ListingPage

import { useCallback, useEffect, useState } from "react"
import {
  AlertTriangle,
  ArrowRight,
  BarChart3,
  Clock3,
  CircleUserRound,
  Inbox,
  Leaf,
  Sprout,
  X,
} from "lucide-react"
import { Link } from "react-router-dom"
import GenerateReportModal from "../component/modal/GenerateReportModal"
import { getDashboard } from "../api/api"
import { formatDeliveryModes } from "../data/deliveryModes"
import { getCropLifecycleStatus } from "../utils/cropLifecycle"
import "../styles/dashboard.css"

const salesCurrency = new Intl.NumberFormat("en-PH", { style: "currency", currency: "PHP" })
const compactSalesCurrency = new Intl.NumberFormat("en-PH", {
  style: "currency",
  currency: "PHP",
  notation: "compact",
  maximumFractionDigits: 1,
})

const REGION_LABELS = {
  ncr: "NCR (Metro Manila)",
  car: "CAR (Cordillera)",
  ilocos: "Ilocos Region",
  "cagayan-valley": "Cagayan Valley",
  "central-luzon": "Central Luzon",
  calabarzon: "CALABARZON",
  mimaropa: "MIMAROPA",
  bicol: "Bicol Region",
  "western-visayas": "Western Visayas",
  "central-visayas": "Central Visayas",
  "eastern-visayas": "Eastern Visayas",
  zamboanga: "Zamboanga Peninsula",
  "northern-mindanao": "Northern Mindanao",
  davao: "Davao Region",
  soccsksargen: "SOCCSKSARGEN",
  caraga: "Caraga",
  barmm: "BARMM",
}

function getDisplayName(account) {
  return [account.firstName, account.middleName, account.lastName, account.suffix]
    .filter((part) => typeof part === "string" && part.trim())
    .map((part) => part.trim())
    .join(" ")
}

function getDaysUntilHarvest(value) {
  if (!value) return null
  const harvestDate = new Date(`${value}T00:00:00`)
  if (Number.isNaN(harvestDate.getTime())) return null
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  harvestDate.setHours(0, 0, 0, 0)
  return Math.round((harvestDate - today) / 86400000)
}

function getHarvestProgress(crop) {
  const lifecycleStatus = getCropLifecycleStatus(crop)
  if (lifecycleStatus === "ready-to-harvest" || lifecycleStatus === "overdue") return 100

  const plantedDate = new Date(`${crop.datePlanted}T00:00:00`)
  const harvestDate = new Date(`${crop.harvestDate}T00:00:00`)
  const totalGrowthDays = harvestDate - plantedDate
  if (!crop.datePlanted || Number.isNaN(plantedDate.getTime()) || totalGrowthDays <= 0) return 0

  const today = new Date()
  today.setHours(0, 0, 0, 0)
  return Math.min(100, Math.max(0, Math.round(((today - plantedDate) / totalGrowthDays) * 100)))
}

function ProfileField({ label, value, className = "" }) {
  return (
    <div className={`dashboard-profile-field ${className}`}>
      <dt>{label}</dt>
      <dd>{typeof value === "string" || typeof value === "number" ? value || "Not provided" : "Not provided"}</dd>
    </div>
  )
}

function DashboardModal({ title, description, onClose, children, className = "" }) {
  useEffect(() => {
    function handleKeyDown(event) {
      if (event.key === "Escape") onClose()
    }
    document.addEventListener("keydown", handleKeyDown)
    return () => document.removeEventListener("keydown", handleKeyDown)
  }, [onClose])

  return (
    <div
      className="dashboard-modal-backdrop"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) onClose()
      }}
    >
      <section
        className={`dashboard-modal ${className}`}
        role="dialog"
        aria-modal="true"
        aria-labelledby="dashboard-modal-title"
        aria-describedby="dashboard-modal-description"
      >
        <header className="dashboard-modal-header">
          <div>
            <h2 id="dashboard-modal-title">{title}</h2>
            <p id="dashboard-modal-description">{description}</p>
          </div>
          <button type="button" className="dashboard-icon-button dashboard-modal-close" onClick={onClose} aria-label="Close dialog">
            <X size={19} aria-hidden="true" />
          </button>
        </header>
        {children}
      </section>
    </div>
  )
}

function StockChart({ items }) {
  const max = Math.max(...items.map((item) => item.quantity), 1)
  return (
    <div className="stock-chart" role="img" aria-label="Current stock levels by item">
      <div className="stock-y-axis" aria-hidden="true">
        <span>100</span><span>75</span><span>50</span><span>25</span><span>0</span>
      </div>
      <div className="stock-chart-body">
        <div className="stock-grid-lines" aria-hidden="true">
          <span /><span /><span /><span /><span />
        </div>
        <div className="stock-bars">
          {items.map((item) => (
            <div className="stock-bar-column" key={item.id}>
              <span className="stock-bar-value">{item.quantity}</span>
              <div className={`stock-bar ${item.status}`} style={{ height: `${Math.max(4, (item.quantity / max) * 100)}%` }} />
              <span className="stock-bar-label">{item.name} ({item.unit})</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

function SalesLineChart({ months }) {
  const width = 600
  const height = 190
  const left = 64
  const right = 590
  const top = 12
  const bottom = 150
  const max = Math.max(...months.map((month) => month.total), 1)
  const points = months.map((month, index) => ({
    ...month,
    x: left + (index * (right - left)) / (months.length - 1),
    y: bottom - (month.total / max) * (bottom - top),
  }))
  const line = points.map(({ x, y }) => `${x},${y}`).join(" ")

  return (
    <div className="sales-chart-wrap">
      <svg className="sales-chart" viewBox={`0 0 ${width} ${height}`} role="img" aria-label={`Monthly completed order sales: ${months.map(({ label, total }) => `${label} ${salesCurrency.format(total)}`).join(", ")}`}>
        {[0, 1, 2, 3].map((step) => {
          const value = (max / 3) * step
          const y = bottom - (value / max) * (bottom - top)
          return (
            <g key={step}>
              <line className="sales-grid-line" x1={left} x2={right} y1={y} y2={y} />
              <text className="sales-y-axis-label" x={left - 8} y={y + 4} textAnchor="end">{compactSalesCurrency.format(value)}</text>
            </g>
          )
        })}
        <polyline className="sales-line" points={line} />
        {points.map(({ key, x, y }) => <circle className="sales-point" key={key} cx={x} cy={y} r={4} />)}
      </svg>
      <div className="sales-x-axis" aria-hidden="true">
        {months.map(({ key, label }) => <span key={key}>{label}</span>)}
      </div>
    </div>
  )
}

function Dashboard() {
  const [reportOpen, setReportOpen] = useState(false)
  const [activeModal, setActiveModal] = useState(null)
  const [profileTab, setProfileTab] = useState("account")
  const [dashboard, setDashboard] = useState(null)
  const [salesData, setSalesData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState("")

  const loadDashboard = useCallback(async () => {
    setLoading(true)
    setLoadError("")
    try {
      const { data } = await getDashboard()
      setDashboard(data.data)
      setSalesData(data.data.sales || null)
    } catch (error) {
      setLoadError(error.response?.data?.message || "Could not load your dashboard.")
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    let active = true
    queueMicrotask(() => {
      if (active) void loadDashboard()
    })
    return () => {
      active = false
    }
  }, [loadDashboard])

  const profile = dashboard?.profile || { account: {}, farm: null }
  const account = profile.account
  const farm = profile.farm
  const displayName = getDisplayName(account)
  const summary = dashboard?.summary
  const freshness = summary?.freshness || { fresh: 0, nearSpoiling: 0, spoiled: 0 }
  const inventoryCount = summary?.inventoryCount || 0
  const stocks = dashboard?.stocks || []
  const recentListings = dashboard?.recentListings || []
  const listings = summary?.listings || { pending: 0, approved: 0, rejected: 0, returned: 0 }
  const freshEnd = inventoryCount ? (freshness.fresh / inventoryCount) * 100 : 0
  const nearEnd = inventoryCount ? ((freshness.fresh + freshness.nearSpoiling) / inventoryCount) * 100 : 0
  const attentionCounts = {
    spoiled: freshness.spoiled,
    nearSpoiling: freshness.nearSpoiling,
    growing: summary?.growingCrops || 0,
    requests: listings.pending,
  }
  const upcomingHarvests = (dashboard?.upcomingHarvests || [])
    .map((crop) => {
      const daysUntilHarvest = getDaysUntilHarvest(crop.harvestDate)
      return {
        ...crop,
        daysUntilHarvest,
        harvestProgress: daysUntilHarvest === null ? 0 : getHarvestProgress(crop),
        lifecycleStatus: getCropLifecycleStatus(crop),
      }
    })
    .filter((crop) => crop.daysUntilHarvest !== null && crop.daysUntilHarvest >= 0)
    .sort((first, second) => first.daysUntilHarvest - second.daysUntilHarvest)
    .slice(0, 4)
  const currentDate = new Intl.DateTimeFormat("en-PH", {
    weekday: "long",
    month: "long",
    day: "numeric",
  }).format(new Date())
  const reportDate = new Intl.DateTimeFormat("en-PH", {
    month: "long",
    day: "numeric",
    year: "numeric",
  }).format(new Date())
  const reportData = {
    farmName: farm?.farmName,
    farmerName: displayName,
    reportDate,
    period: "Current snapshot",
    attention: [
      { label: "Spoiled items", value: attentionCounts.spoiled, note: "In inventory" },
      { label: "Near spoiling", value: attentionCounts.nearSpoiling, note: "Check freshness" },
      { label: "Growing crops", value: attentionCounts.growing, note: "Active crops" },
      { label: "Listings pending review", value: attentionCounts.requests, note: "Awaiting review" },
    ],
    stocks,
    freshness,
    upcomingHarvests,
    listings,
    recentListings,
  }

  return (
    <>
      <main className="dashboard-main">
        <header className="dashboard-topbar">
          <div className="dashboard-breadcrumb">Dashboard</div>
          <button
            type="button"
            className="dashboard-avatar"
            aria-label="Open farmer profile"
            aria-haspopup="dialog"
            aria-expanded={activeModal === "profile"}
            onClick={() => {
              setProfileTab("account")
              setActiveModal("profile")
            }}
          >
            {displayName ? displayName.charAt(0).toUpperCase() : <CircleUserRound size={20} aria-hidden="true" />}
          </button>
        </header>

        <div className="dashboard-content">
          {loading && <p className="dashboard-empty-message" role="status">Loading your farm dashboard...</p>}
          {loadError && (
            <div className="dashboard-empty-message" role="alert">
              <p>{loadError}</p>
              <button type="button" className="text-action" onClick={loadDashboard}>Try again</button>
            </div>
          )}
          {!loading && dashboard && (
            <>
          <section className="dashboard-welcome">
            <div>
              <p className="dashboard-eyebrow">{currentDate}</p>
              <h1 className="dashboard-page-title">Welcome, {displayName || "Farmer"}!</h1>
              <p>{farm?.farmName ? `Here’s what’s happening at ${farm.farmName} today.` : "Here’s what’s happening with your farm today."}</p>
            </div>
            <button type="button" className="dashboard-report-button" onClick={() => setReportOpen(true)}>
              <BarChart3 size={17} aria-hidden="true" />
              Generate report
            </button>
          </section>

          <section className="dashboard-attention-section" aria-labelledby="dashboard-attention-title">
            <div className="dashboard-section-heading">
              <h2 id="dashboard-attention-title">Needs attention</h2>
              <p>Quick status from your farm</p>
            </div>
            <div className="dashboard-summary-grid" aria-label="Farm attention summary">
              <article className="summary-card">
                <span className="summary-icon red"><AlertTriangle size={18} aria-hidden="true" /></span>
                <span>Spoiled items</span><strong>{attentionCounts.spoiled}</strong><small>In inventory</small>
              </article>
              <article className="summary-card">
                <span className="summary-icon gold"><Clock3 size={18} aria-hidden="true" /></span>
                <span>Near spoiling</span><strong>{attentionCounts.nearSpoiling}</strong><small>Check freshness</small>
              </article>
              <article className="summary-card">
                <span className="summary-icon green"><Sprout size={18} aria-hidden="true" /></span>
                <span>Growing crops</span><strong>{attentionCounts.growing}</strong><small>Active crops</small>
              </article>
              <article className="summary-card">
                <span className="summary-icon blue"><Inbox size={18} aria-hidden="true" /></span>
                <span>Listings pending</span><strong>{attentionCounts.requests}</strong><small>Awaiting review</small>
              </article>
            </div>
          </section>

          <section className="dashboard-chart-grid" aria-label="Farm performance charts">
            <article className="dashboard-card chart-card">
              <div className="dashboard-card-heading">
                <div>
                  <h2>Stock levels</h2>
                  <p>Current quantity by item</p>
                </div>
                <span className="chart-legend"><i className="legend-dot healthy" /> In stock <i className="legend-dot low" /> Low stock</span>
              </div>
              {stocks.length ? <StockChart items={stocks} /> : <p className="dashboard-empty-message">No inventory items have been added.</p>}
            </article>

            <article className="dashboard-card chart-card">
              <div className="dashboard-card-heading sales-heading">
                <div>
                  <h2>Overall sales</h2>
                  <p>Completed order revenue by month</p>
                </div>
                <Link className="text-action" to="/inbox">View inbox <ArrowRight size={14} aria-hidden="true" /></Link>
              </div>
              <div className="sales-total-row">
                <strong>{salesData ? salesCurrency.format(salesData.total) : "Unavailable"}</strong>
                <small>{salesData ? "Lifetime sales from delivered orders" : "Could not read completed orders from this browser."}</small>
              </div>
              {salesData && <SalesLineChart months={salesData.months} />}
            </article>
          </section>

          <section className="dashboard-card dashboard-listing-overview">
            <div className="dashboard-card-heading">
              <div><h2>Listing overview</h2><p>Your product submissions by status</p></div>
            </div>
            <div className="dashboard-summary-grid" aria-label="Listing counts">
              <article className="summary-card"><span>Pending</span><strong>{listings.pending}</strong><small>Awaiting review</small></article>
              <article className="summary-card"><span>Approved</span><strong>{listings.approved}</strong><small>Active listings</small></article>
              <article className="summary-card"><span>Returned</span><strong>{listings.returned}</strong><small>Needs updates</small></article>
              <article className="summary-card"><span>Rejected</span><strong>{listings.rejected}</strong><small>Not approved</small></article>
            </div>
          </section>

          <section className="dashboard-lower-grid dashboard-insights-grid" aria-label="Freshness and upcoming harvests">
            <article className="dashboard-card freshness-card">
              <div className="dashboard-card-heading">
                <div><h2>Freshness</h2><p>Inventory condition at a glance</p></div>
                <Link className="text-action" to="/inventory">View inventory <ArrowRight size={14} aria-hidden="true" /></Link>
              </div>
              <div className="freshness-layout">
                <div
                  className={`freshness-donut${inventoryCount ? "" : " is-empty"}`}
                  style={inventoryCount ? {
                    background: `conic-gradient(#526b3a 0% ${freshEnd}%, #c99d3b ${freshEnd}% ${nearEnd}%, #c5573c ${nearEnd}% 100%)`,
                  } : undefined}
                  role="img"
                  aria-label={`Inventory freshness: ${freshness.fresh} fresh, ${freshness.nearSpoiling} near spoiling, ${freshness.spoiled} spoiled`}
                >
                  <div><strong>{inventoryCount}</strong><span>items</span></div>
                </div>
                <ul className="freshness-legend">
                  <li><span><i className="freshness-dot fresh" /> Fresh</span><strong>{freshness.fresh}</strong></li>
                  <li><span><i className="freshness-dot near" /> Near spoiling</span><strong>{freshness.nearSpoiling}</strong></li>
                  <li><span><i className="freshness-dot spoiled" /> Spoiled</span><strong>{freshness.spoiled}</strong></li>
                </ul>
              </div>
            </article>

            <article className="dashboard-card upcoming-harvest-card">
              <div className="dashboard-card-heading">
                <div><h2>Upcoming harvests</h2><p>Ready dates for your active crops</p></div>
                <Link className="text-action" to="/crops">View crops <ArrowRight size={14} aria-hidden="true" /></Link>
              </div>
              {upcomingHarvests.length ? (
                <ul className="upcoming-harvest-list">
                  {upcomingHarvests.map((crop) => (
                    <li className={`upcoming-harvest-item is-${crop.lifecycleStatus}`} key={crop.id}>
                      <div className="upcoming-harvest-heading">
                        <strong>{crop.name}</strong>
                        <span>
                          {crop.lifecycleStatus === "ready-to-harvest"
                            ? "Ready"
                            : `${crop.daysUntilHarvest}d left`}
                        </span>
                      </div>
                      <div
                        className="upcoming-harvest-track"
                        role="progressbar"
                        aria-label={`${crop.name} harvest progress`}
                        aria-valuemin={0}
                        aria-valuemax={100}
                        aria-valuenow={crop.harvestProgress}
                      >
                        <span style={{ width: `${crop.harvestProgress}%` }} />
                      </div>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="dashboard-empty-message">No upcoming harvest dates are scheduled.</p>
              )}
            </article>
          </section>

          <section className="dashboard-card orders-card">
            <div className="dashboard-card-heading">
              <div><h2>Recent listings</h2><p>Track the latest product submissions</p></div>
              <Link to="/listings" className="text-action">View listings <ArrowRight size={14} /></Link>
            </div>
            {recentListings.length ? <div className="orders-table-wrap">
              <table className="orders-table">
                <thead>
                  <tr><th>Product</th><th>Quantity</th><th>Price</th><th>Date submitted</th><th>Status</th></tr>
                </thead>
                <tbody>
                  {recentListings.map((listing) => (
                    <tr key={listing.id}>
                      <td className="order-id">{listing.name}</td>
                      <td>{listing.stock} {listing.unit}</td>
                      <td>{new Intl.NumberFormat("en-PH", { style: "currency", currency: "PHP" }).format(listing.price)}</td>
                      <td className="order-date">{new Intl.DateTimeFormat("en-PH", { dateStyle: "medium" }).format(new Date(listing.createdAt))}</td>
                      <td><span className={`order-status ${listing.status === "approved" ? "complete" : "pending"}`}>{listing.status}</span></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div> : <p className="dashboard-empty-message">You have not submitted any listings yet.</p>}
          </section>

          <p className="dashboard-demo-note"><Leaf size={14} aria-hidden="true" /> Dashboard information is synced with your AgriLink account.</p>
            </>
          )}
      </div>
      </main>
      {reportOpen && <GenerateReportModal open onClose={() => setReportOpen(false)} reportData={reportData} />}
      {activeModal === "profile" && (
        <DashboardModal
          title="Farmer profile"
          description="Your farmer and farm profile from AgriLink."
          onClose={() => setActiveModal(null)}
          className="profile-modal"
        >
          <div className="dashboard-profile-summary">
            <span className="dashboard-profile-avatar"><CircleUserRound size={38} aria-hidden="true" /></span>
            <div>
              <h3>{displayName || "Farmer"}</h3>
              <p>{account.email || "No email provided"}</p>
            </div>
          </div>
          <div className="dashboard-profile-tabs" role="tablist" aria-label="Profile details">
            <button type="button" role="tab" id="dashboard-profile-tab-account" aria-controls="dashboard-profile-panel" aria-selected={profileTab === "account"} className={profileTab === "account" ? "is-selected" : ""} onClick={() => setProfileTab("account")}>
              Account Profile
            </button>
            <button type="button" role="tab" id="dashboard-profile-tab-farm" aria-controls="dashboard-profile-panel" aria-selected={profileTab === "farm"} className={profileTab === "farm" ? "is-selected" : ""} onClick={() => setProfileTab("farm")}>
              Farm Profile
            </button>
          </div>
          <div className="dashboard-modal-content dashboard-profile-content" id="dashboard-profile-panel" role="tabpanel" aria-labelledby={`dashboard-profile-tab-${profileTab}`}>
            {profileTab === "account" ? (
              <dl className="dashboard-profile-fields">
                <ProfileField label="Age" value={account.age ? `${account.age} years old` : ""} />
                <ProfileField label="Region where you farm" value={REGION_LABELS[account.region] || account.region} />
                <ProfileField label="Mobile number" value={account.mobileNumber} />
                <ProfileField label="Email" value={account.email} />
                <ProfileField label="Facebook profile or page" value={account.facebook} className="is-wide" />
                <ProfileField label="About me" value={account.bio} className="is-wide" />
              </dl>
            ) : (
              <dl className="dashboard-profile-fields">
                <ProfileField label="Farm name" value={farm?.farmName} />
                <ProfileField label="Farm location" value={farm?.location} />
                <ProfileField label="About this farm" value={farm?.description} className="is-wide" />
                <ProfileField label="Farming since" value={farm?.startedFarming} />
                <ProfileField label="Crops and specialties" value={Array.isArray(farm?.specialty) ? farm.specialty.join(", ") : ""} className="is-wide" />
                <ProfileField label="Delivery methods" value={formatDeliveryModes(farm?.deliveryMode)} />
                <ProfileField label="Delivery regions" value={Array.isArray(farm?.deliverableRegions) ? farm.deliverableRegions.map((region) => REGION_LABELS[region] || region).join(", ") : ""} />
              </dl>
            )}
          </div>
          <footer className="dashboard-modal-footer">
            <Link to="/settings" className="dashboard-profile-settings-link" onClick={() => setActiveModal(null)}>Edit details in Settings</Link>
            <button type="button" className="dashboard-profile-done" onClick={() => setActiveModal(null)}>Done</button>
          </footer>
        </DashboardModal>
      )}
    </>
  )
}

export default Dashboard

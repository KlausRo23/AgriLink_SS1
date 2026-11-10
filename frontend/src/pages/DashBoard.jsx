import { useEffect, useMemo, useState } from "react"
import {
  AlertTriangle,
  ArrowRight,
  ArrowUpRight,
  BarChart3,
  Bell,
  CheckCircle2,
  CircleAlert,
  Clock3,
  CircleUserRound,
  Inbox,
  Leaf,
  Sprout,
  X,
} from "lucide-react"
import { Link } from "react-router-dom"
import GenerateReportModal from "../component/modal/GenerateReportModal"
import { formatDeliveryModes } from "../data/deliveryModes"
import { loadCropPreview } from "../data/crops"
import { loadInboxThreads } from "../data/inbox"
import { loadInventoryPreview } from "../data/inventory"
import { getCropLifecycleStatus } from "../utils/cropLifecycle"
import "../styles/dashboard.css"

const SETTINGS_KEY = "agrilink-settings-preview"
const DEFAULT_PROFILE = {
  account: {
    firstName: "Juan",
    middleName: "Miguel",
    lastName: "Dela Cruz",
    suffix: "Jr",
    age: "35",
    region: "ncr",
    bio: "",
    mobileNumber: "09171234567",
    email: "juandelacruz@gmail.com",
    facebook: "",
  },
  farm: {
    farmName: "Ungang Sakaghan",
    location: "Quezon City, Metro Manila",
    startedFarming: "2016",
    description: "We grow fresh vegetables for our local community.",
    specialty: ["Cabbage", "Lettuce", "Corn"],
    deliveryMode: ["3rd party service"],
    deliverableRegions: ["ncr"],
    naturallyGrown: true,
  },
}
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

const STOCK_ITEMS = [
  { name: "Cabbage", quantity: 82, unit: "heads", status: "healthy" },
  { name: "Carrots", quantity: 34, unit: "kg", status: "low" },
  { name: "Fertilizer", quantity: 58, unit: "bags", status: "healthy" },
  { name: "Pesticide", quantity: 27, unit: "bottles", status: "low" },
  { name: "Tomatoes", quantity: 68, unit: "kg", status: "healthy" },
]

const SALES_DATA = {
  Monthly: {
    amount: "₱24,860",
    change: "+12.8%",
    data: [25, 38, 31, 56, 44, 66, 52, 74, 62, 86, 74, 94],
    labels: ["1", "3", "5", "7", "9", "11", "13", "15", "17", "19", "21", "23"],
    caption: "Daily sales this month",
  },
  Quarterly: {
    amount: "₱68,420",
    change: "+8.4%",
    data: [28, 42, 34, 52, 46, 60, 55, 74, 64, 82, 77, 95],
    labels: ["W1", "W2", "W3", "W4", "W5", "W6", "W7", "W8", "W9", "W10", "W11", "W12"],
    caption: "Weekly sales this quarter",
  },
  Annual: {
    amount: "₱248,600",
    change: "+18.2%",
    data: [30, 36, 44, 39, 54, 60, 52, 68, 64, 78, 88, 96],
    labels: ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"],
    caption: "Monthly sales this year",
  },
}

const NOTIFICATIONS = [
  { title: "Tomatoes are running low", detail: "Only 8 kg left in your inventory", time: "10 min ago", type: "warning" },
  { title: "New order received", detail: "Maria Santos ordered 12 kg of carrots", time: "1 hour ago", type: "success" },
  { title: "Listing needs attention", detail: "Your cabbage listing expires tomorrow", time: "3 hours ago", type: "info" },
]

const ORDERS = [
  { id: "#AG-1048", buyer: "Maria Santos", items: "Carrots · 12 kg", date: "Friday, November 13, 2026", amount: "₱960", status: "Processing" },
  { id: "#AG-1047", buyer: "Juan Dela Cruz", items: "Cabbage · 20 heads", date: "Sunday, November 15, 2026", amount: "₱1,500", status: "Ready for pickup" },
  { id: "#AG-1046", buyer: "Ana Reyes", items: "Tomatoes · 8 kg", date: "Monday, November 16, 2026", amount: "₱640", status: "Completed" },
]

function loadFarmerProfile() {
  try {
    const saved = window.localStorage.getItem(SETTINGS_KEY)
    if (!saved) return DEFAULT_PROFILE

    const parsed = JSON.parse(saved)
    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
      throw new Error("Stored settings must be an object.")
    }

    const account = parsed.account && typeof parsed.account === "object" && !Array.isArray(parsed.account)
      ? parsed.account
      : {}
    const farm = parsed.farm && typeof parsed.farm === "object" && !Array.isArray(parsed.farm)
      ? parsed.farm
      : {}
    return {
      account: { ...DEFAULT_PROFILE.account, ...account },
      farm: { ...DEFAULT_PROFILE.farm, ...farm },
    }
  } catch (error) {
    console.error("Could not load farmer profile preview:", error)
    return DEFAULT_PROFILE
  }
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

function StockChart() {
  const max = 100

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
          {STOCK_ITEMS.map((item) => (
            <div className="stock-bar-column" key={item.name}>
              <span className="stock-bar-value">{item.quantity}</span>
              <div className={`stock-bar ${item.status}`} style={{ height: `${(item.quantity / max) * 100}%` }} />
              <span className="stock-bar-label">{item.name}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

function SalesChart({ data, labels, caption }) {
  const chart = useMemo(() => {
    const width = 560
    const height = 190
    const padX = 12
    const padY = 16
    const points = data.map((value, index) => {
      const x = padX + (index * (width - padX * 2)) / (data.length - 1)
      const y = height - padY - (value / 100) * (height - padY * 2)
      return { x, y }
    })
    const line = points.map(({ x, y }) => `${x},${y}`).join(" ")
    const area = `${padX},${height - padY} ${line} ${width - padX},${height - padY}`
    return { points, line, area, width, height }
  }, [data])

  return (
    <div className="sales-chart-wrap">
      <svg className="sales-chart" viewBox={`0 0 ${chart.width} ${chart.height}`} role="img" aria-label={caption} preserveAspectRatio="none">
        <defs>
          <linearGradient id="sales-area-fill" x1="0" x2="0" y1="0" y2="1">
            <stop offset="0%" stopColor="#64814b" stopOpacity=".22" />
            <stop offset="100%" stopColor="#64814b" stopOpacity="0" />
          </linearGradient>
        </defs>
        {[0, 1, 2, 3].map((line) => {
          const y = 16 + (line * (chart.height - 32)) / 3
          return <line key={line} x1="12" x2={chart.width - 12} y1={y} y2={y} className="sales-grid-line" />
        })}
        <polygon points={chart.area} fill="url(#sales-area-fill)" />
        <polyline points={chart.line} className="sales-line" />
        {chart.points.map(({ x, y }, index) => (
          <circle key={index} cx={x} cy={y} r={index === chart.points.length - 1 ? 5 : 3} className="sales-point">
            <title>{labels[index]}: {data[index]}</title>
          </circle>
        ))}
      </svg>
      <div className="sales-x-axis" aria-hidden="true">
        {labels.filter((_, index) => index % 2 === 0).map((label, index) => <span key={`${label}-${index}`}>{label}</span>)}
      </div>
      <p className="chart-caption">{caption}</p>
    </div>
  )
}

function Dashboard() {
  const [salesPeriod, setSalesPeriod] = useState("Monthly")
  const [reportOpen, setReportOpen] = useState(false)
  const [activeModal, setActiveModal] = useState(null)
  const [profileTab, setProfileTab] = useState("account")
  const [readNotifications, setReadNotifications] = useState([])
  const [profile] = useState(() => loadFarmerProfile())
  const [inventory] = useState(loadInventoryPreview)
  const [crops] = useState(loadCropPreview)
  const [threads] = useState(loadInboxThreads)
  const displayName = getDisplayName(profile.account)
  const unreadCount = NOTIFICATIONS.length - readNotifications.length
  const sales = SALES_DATA[salesPeriod]
  const freshness = {
    fresh: inventory.filter((item) => item.status === "fresh").length,
    nearSpoiling: inventory.filter((item) => item.status === "near-spoiling").length,
    spoiled: inventory.filter((item) => item.status === "spoiled").length,
  }
  const inventoryCount = freshness.fresh + freshness.nearSpoiling + freshness.spoiled
  const freshEnd = inventoryCount ? (freshness.fresh / inventoryCount) * 100 : 0
  const nearEnd = inventoryCount ? ((freshness.fresh + freshness.nearSpoiling) / inventoryCount) * 100 : 0
  const attentionCounts = {
    spoiled: freshness.spoiled,
    nearSpoiling: freshness.nearSpoiling,
    growing: crops.filter((crop) => getCropLifecycleStatus(crop) === "growing").length,
    requests: threads.filter((thread) => thread.status === "pending" && !thread.archived).length,
  }
  const upcomingHarvests = crops
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
    farmName: profile.farm.farmName,
    farmerName: displayName,
    reportDate,
    period: salesPeriod === "Monthly" ? "This month" : salesPeriod === "Quarterly" ? "This quarter" : "This year",
    attention: [
      { label: "Spoiled items", value: attentionCounts.spoiled, note: "In inventory" },
      { label: "Near spoiling", value: attentionCounts.nearSpoiling, note: "Check freshness" },
      { label: "Growing crops", value: attentionCounts.growing, note: "Active crops" },
      { label: "Inbox requests", value: attentionCounts.requests, note: "Awaiting response" },
    ],
    stocks: STOCK_ITEMS,
    sales,
    freshness,
    upcomingHarvests,
    orders: ORDERS,
  }

  return (
    <>
      <main className="dashboard-main">
        <header className="dashboard-topbar">
          <div className="dashboard-breadcrumb">Dashboard</div>
          <button
            type="button"
            className="dashboard-icon-button notification-button"
            aria-label={`Notifications${unreadCount ? `, ${unreadCount} unread` : ""}`}
            aria-haspopup="dialog"
            aria-expanded={activeModal === "notifications"}
            onClick={() => setActiveModal("notifications")}
          >
            <Bell size={19} aria-hidden="true" />
            {unreadCount > 0 && <span />}
          </button>
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
          <section className="dashboard-welcome">
            <div>
              <p className="dashboard-eyebrow">{currentDate}</p>
              <h1 className="dashboard-page-title">Good morning, Farmer!</h1>
              <p>Here’s what’s happening with your farm today.</p>
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
                <span>Inbox requests</span><strong>{attentionCounts.requests}</strong><small>Awaiting response</small>
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
              <StockChart />
            </article>

            <article className="dashboard-card chart-card">
              <div className="dashboard-card-heading sales-heading">
                <div>
                  <h2>Sales overview</h2>
                  <p>{SALES_DATA[salesPeriod].caption}</p>
                </div>
                <div className="period-tabs" role="group" aria-label="Sales chart period">
                  {Object.keys(SALES_DATA).map((period) => (
                    <button
                      type="button"
                      key={period}
                      aria-pressed={salesPeriod === period}
                      className={salesPeriod === period ? "is-selected" : ""}
                      onClick={() => setSalesPeriod(period)}
                    >
                      {period}
                    </button>
                  ))}
                </div>
              </div>
              <div className="sales-total-row">
                <strong>{sales.amount}</strong>
                <span><ArrowUpRight size={15} aria-hidden="true" /> {sales.change}</span>
                <small>vs previous {salesPeriod.toLowerCase().replace(/ly$/, "")}</small>
              </div>
              <SalesChart data={sales.data} labels={sales.labels} caption={sales.caption} />
            </article>
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
              <div><h2>Order Activity</h2><p>Track the latest customer orders</p></div>
              <button type="button" className="text-action">View inbox <ArrowRight size={14} /></button>
            </div>
            <div className="orders-table-wrap">
              <table className="orders-table">
                <thead>
                  <tr><th>Order</th><th>Buyer</th><th>Items</th><th>Date</th><th>Order Status</th><th className="align-right">Total</th></tr>
                </thead>
                <tbody>
                  {ORDERS.map((order) => (
                    <tr key={order.id}>
                      <td className="order-id">{order.id}</td>
                      <td>{order.buyer}</td>
                      <td>{order.items}</td>
                      <td className="order-date">{order.date}</td>
                      <td><span className={`order-status ${order.status === "Completed" ? "complete" : "pending"}`}>{order.status}</span></td>
                      <td className="order-total">{order.amount}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>

          <p className="dashboard-demo-note"><Leaf size={14} aria-hidden="true" /> Dashboard preview with sample data</p>
      </div>
      </main>
      {reportOpen && <GenerateReportModal open onClose={() => setReportOpen(false)} reportData={reportData} />}
      {activeModal === "notifications" && (
        <DashboardModal
          title="Notifications"
          description="The latest updates from your farm."
          onClose={() => setActiveModal(null)}
          className="notification-modal"
        >
          <div className="dashboard-modal-content">
            <div className="dashboard-modal-section-heading">
              <span>{unreadCount ? `${unreadCount} unread` : "You’re all caught up"}</span>
              {unreadCount > 0 && (
                <button type="button" className="text-action" onClick={() => setReadNotifications(NOTIFICATIONS.map((item) => item.title))}>
                  Mark all as read
                </button>
              )}
            </div>
            <div className="notification-modal-list">
              {NOTIFICATIONS.map((notification) => {
                const Icon = notification.type === "warning" ? AlertTriangle : notification.type === "success" ? CheckCircle2 : CircleAlert
                const isRead = readNotifications.includes(notification.title)
                return (
                  <button
                    type="button"
                    className={`notification-modal-item ${notification.type}${isRead ? " is-read" : ""}`}
                    key={notification.title}
                    onClick={() => setReadNotifications((current) => current.includes(notification.title) ? current : [...current, notification.title])}
                  >
                    <span className="notification-icon"><Icon size={18} aria-hidden="true" /></span>
                    <span className="notification-modal-copy">
                      <strong>{notification.title}</strong>
                      <span>{notification.detail}</span>
                      <time>{notification.time}</time>
                    </span>
                    {!isRead && <span className="notification-unread-dot" aria-label="Unread" />}
                  </button>
                )
              })}
            </div>
          </div>
        </DashboardModal>
      )}
      {activeModal === "profile" && (
        <DashboardModal
          title="Farmer profile"
          description="Your account and farm details from Settings."
          onClose={() => setActiveModal(null)}
          className="profile-modal"
        >
          <div className="dashboard-profile-summary">
            <span className="dashboard-profile-avatar"><CircleUserRound size={38} aria-hidden="true" /></span>
            <div>
              <h3>{displayName || "Farmer"}</h3>
              <p>{typeof profile.account.email === "string" ? profile.account.email || "No email provided" : "No email provided"}</p>
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
                <ProfileField label="Age" value={typeof profile.account.age === "string" || typeof profile.account.age === "number" ? profile.account.age ? `${profile.account.age} years old` : "" : ""} />
                <ProfileField label="Region where you farm" value={typeof profile.account.region === "string" ? REGION_LABELS[profile.account.region] || profile.account.region : ""} />
                <ProfileField label="Mobile number" value={profile.account.mobileNumber} />
                <ProfileField label="Email" value={profile.account.email} />
                <ProfileField label="Facebook profile or page" value={profile.account.facebook} className="is-wide" />
                <ProfileField label="About me" value={profile.account.bio} className="is-wide" />
              </dl>
            ) : (
              <dl className="dashboard-profile-fields">
                <ProfileField label="Farm name" value={profile.farm.farmName} />
                <ProfileField label="Farm location" value={profile.farm.location} />
                <ProfileField label="About this farm" value={profile.farm.description} className="is-wide" />
                <ProfileField label="Farming since" value={profile.farm.startedFarming} />
                <ProfileField label="Crops and specialties" value={Array.isArray(profile.farm.specialty) ? profile.farm.specialty.filter((crop) => typeof crop === "string").join(", ") : ""} className="is-wide" />
                <ProfileField label="Delivery methods" value={formatDeliveryModes(profile.farm.deliveryMode)} />
                <ProfileField label="Delivery regions" value={Array.isArray(profile.farm.deliverableRegions) ? profile.farm.deliverableRegions.filter((region) => typeof region === "string").map((region) => REGION_LABELS[region] || region).join(", ") : ""} />
                <ProfileField label="Farming practice" value={profile.farm.naturallyGrown === true ? "Naturally grown" : "Not marked as naturally grown"} />
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

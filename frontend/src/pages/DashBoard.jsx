import { useMemo, useState } from "react"
import {
  AlertTriangle,
  ArrowDownRight,
  ArrowRight,
  ArrowUpRight,
  BarChart3,
  Bell,
  CheckCircle2,
  CircleAlert,
  Clock3,
  Leaf,
  Package,
  ShoppingBasket,
  Sprout,
} from "lucide-react"
import GenerateReportModal from "../component/modal/GenerateReportModal"
import "../styles/dashboard.css"

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

const PENDING_ITEMS = [
  { title: "Review new order", detail: "Order #AG-1048 · Maria Santos", type: "order" },
  { title: "Restock tomato seeds", detail: "Inventory is below the reorder point", type: "stock" },
  { title: "Update cabbage listing", detail: "Listing expires tomorrow", type: "listing" },
]

const ORDERS = [
  { id: "#AG-1048", buyer: "Maria Santos", items: "Carrots · 12 kg", date: "Today, 9:42 AM", amount: "₱960", status: "Processing" },
  { id: "#AG-1047", buyer: "Juan Dela Cruz", items: "Cabbage · 20 heads", date: "Today, 8:16 AM", amount: "₱1,500", status: "Ready for pickup" },
  { id: "#AG-1046", buyer: "Ana Reyes", items: "Tomatoes · 8 kg", date: "Yesterday", amount: "₱640", status: "Completed" },
]

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
  const sales = SALES_DATA[salesPeriod]
  const currentDate = new Intl.DateTimeFormat("en-PH", {
    weekday: "long",
    month: "long",
    day: "numeric",
  }).format(new Date())

  return (
    <>
      <main className="dashboard-main">
        <header className="dashboard-topbar">
          <div className="dashboard-breadcrumb">Dashboard</div>
          <button type="button" className="dashboard-icon-button notification-button" aria-label="Notifications">
            <Bell size={19} aria-hidden="true" />
            <span />
          </button>
          <button type="button" className="dashboard-avatar" aria-label="Open account menu">F</button>
        </header>

        <div className="dashboard-content">
          <section className="dashboard-welcome">
            <div>
              <p className="dashboard-eyebrow">{currentDate}</p>
              <h1>Good morning, Farmer!</h1>
              <p>Here’s what’s happening with your farm today.</p>
            </div>
            <button type="button" className="dashboard-report-button" onClick={() => setReportOpen(true)}>
              <BarChart3 size={17} aria-hidden="true" />
              Generate report
            </button>
          </section>

          <section className="dashboard-summary-grid" aria-label="Farm summary">
            <article className="summary-card"><span className="summary-icon green"><Sprout size={18} /></span><span>Growing crops</span><strong>8</strong><small>Across 3 fields</small></article>
            <article className="summary-card"><span className="summary-icon gold"><Package size={18} /></span><span>Inventory items</span><strong>24</strong><small>2 need restocking</small></article>
            <article className="summary-card"><span className="summary-icon blue"><ShoppingBasket size={18} /></span><span>Open orders</span><strong>3</strong><small>1 ready for pickup</small></article>
            <article className="summary-card"><span className="summary-icon red"><ArrowDownRight size={18} /></span><span>Low stock alerts</span><strong>2</strong><small>Check inventory</small></article>
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

          <section className="dashboard-lower-grid">
            <article className="dashboard-card">
              <div className="dashboard-card-heading">
                <div><h2>Recent notifications</h2><p>Latest farm updates</p></div>
                <button type="button" className="text-action">View all <ArrowRight size={14} /></button>
              </div>
              <div className="notification-list">
                {NOTIFICATIONS.map((notification) => {
                  const Icon = notification.type === "warning" ? AlertTriangle : notification.type === "success" ? CheckCircle2 : CircleAlert
                  return (
                    <div className={`notification-item ${notification.type}`} key={notification.title}>
                      <span className="notification-icon"><Icon size={17} aria-hidden="true" /></span>
                      <div><strong>{notification.title}</strong><p>{notification.detail}</p></div>
                      <time>{notification.time}</time>
                    </div>
                  )
                })}
              </div>
            </article>

            <article className="dashboard-card">
              <div className="dashboard-card-heading">
                <div><h2>Pending tasks</h2><p>Items that need your attention</p></div>
                <span className="pending-count">{PENDING_ITEMS.length}</span>
              </div>
              <div className="pending-list">
                {PENDING_ITEMS.map((item) => (
                  <div className="pending-item" key={item.title}>
                    <span className={`pending-icon ${item.type}`}>
                      {item.type === "order" ? <ShoppingBasket size={17} /> : item.type === "stock" ? <Package size={17} /> : <Clock3 size={17} />}
                    </span>
                    <div><strong>{item.title}</strong><p>{item.detail}</p></div>
                    <ArrowRight className="pending-arrow" size={16} aria-hidden="true" />
                  </div>
                ))}
              </div>
            </article>
          </section>

          <section className="dashboard-card orders-card">
            <div className="dashboard-card-heading">
              <div><h2>Recent orders</h2><p>Track the latest customer orders</p></div>
              <button type="button" className="text-action">View orders <ArrowRight size={14} /></button>
            </div>
            <div className="orders-table-wrap">
              <table className="orders-table">
                <thead>
                  <tr><th>Order</th><th>Buyer</th><th>Items</th><th>Date</th><th>Status</th><th className="align-right">Total</th></tr>
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
      {reportOpen && <GenerateReportModal open onClose={() => setReportOpen(false)} />}
    </>
  )
}

export default Dashboard

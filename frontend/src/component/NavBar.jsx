import { useEffect, useState } from "react"
import { Boxes, Clock3, Ellipsis, Inbox, LayoutDashboard, Leaf, Settings, ShoppingBag } from "lucide-react"
import { NavLink, useLocation } from "react-router-dom"
import agrilinkLogo from "../images/agrilink-logo.png"
import "../styles/dashboard.css"

const PRIMARY_NAV_ITEMS = [
  { label: "Dashboard", to: "/dashboard", icon: LayoutDashboard },
  { label: "Crops", to: "/crops", icon: Leaf },
  { label: "Inventory", to: "/inventory", icon: Boxes },
  { label: "Inbox", to: "/inbox", icon: Inbox },
  { label: "Listing", to: "/listings", icon: ShoppingBag },
  { label: "History", to: "/history", icon: Clock3 },
]
const SETTINGS_NAV_ITEM = { label: "Settings", to: "/settings", icon: Settings }
const MOBILE_ITEMS = [
  { label: "Home", to: "/dashboard", icon: LayoutDashboard },
  { label: "Crops", to: "/crops", icon: Leaf },
  { label: "Inventory", to: "/inventory", icon: Boxes },
]
const MORE_ITEMS = [...PRIMARY_NAV_ITEMS.slice(3), SETTINGS_NAV_ITEM]

function NavBar() {
  const [moreOpen, setMoreOpen] = useState(false)
  const location = useLocation()
  const moreActive = MORE_ITEMS.some(({ to }) => location.pathname.startsWith(to))

  useEffect(() => {
    if (!moreOpen) return undefined
    function closeOnEscape(event) {
      if (event.key === "Escape") setMoreOpen(false)
    }
    window.addEventListener("keydown", closeOnEscape)
    return () => window.removeEventListener("keydown", closeOnEscape)
  }, [moreOpen])

  return (
    <aside className="app-sidebar">
      <NavLink className="app-brand" to="/dashboard" aria-label="AgriLink dashboard">
        <span className="app-brand-mark"><img src={agrilinkLogo} alt="" /></span>
        <span>AgriLink</span>
      </NavLink>

      <nav className="app-nav" aria-label="Main navigation">
        {PRIMARY_NAV_ITEMS.map(({ label, to, icon: Icon }) => (
          <NavLink
            key={to}
            className={({ isActive }) => `app-nav-link${isActive ? " is-active" : ""}`}
            to={to}
            end={to === "/dashboard"}
          >
            <Icon size={18} strokeWidth={2} aria-hidden="true" />
            <span>{label}</span>
          </NavLink>
        ))}
        <NavLink
          className={({ isActive }) => `app-nav-link app-nav-settings-link${isActive ? " is-active" : ""}`}
          to={SETTINGS_NAV_ITEM.to}
        >
          <Settings size={18} strokeWidth={2} aria-hidden="true" />
          <span>{SETTINGS_NAV_ITEM.label}</span>
        </NavLink>
      </nav>

      <nav className="app-mobile-nav" aria-label="Mobile navigation">
        {MOBILE_ITEMS.map(({ label, to, icon: Icon }) => (
          <NavLink
            key={to}
            className={({ isActive }) => `app-mobile-nav-link${isActive ? " is-active" : ""}`}
            to={to}
            end={to === "/dashboard"}
          >
            <Icon size={21} strokeWidth={2} aria-hidden="true" />
            <span>{label}</span>
          </NavLink>
        ))}
        <div className="app-mobile-more">
          <button
            type="button"
            className={`app-mobile-nav-link app-mobile-more-button${moreActive ? " is-active" : ""}`}
            aria-expanded={moreOpen}
            aria-haspopup="menu"
            onClick={() => setMoreOpen((open) => !open)}
          >
            <Ellipsis size={22} strokeWidth={2} aria-hidden="true" />
            <span>More</span>
          </button>
          {moreOpen && (
            <div className="app-mobile-more-menu" role="menu" aria-label="More navigation">
              {MORE_ITEMS.map(({ label, to, icon: Icon }) => (
                <NavLink
                  key={to}
                  role="menuitem"
                  className={({ isActive }) => `app-mobile-more-link${isActive ? " is-active" : ""}`}
                  to={to}
                  onClick={() => setMoreOpen(false)}
                >
                  <Icon size={18} aria-hidden="true" />
                  <span>{label}</span>
                </NavLink>
              ))}
            </div>
          )}
        </div>
      </nav>
    </aside>
  )
}

export default NavBar

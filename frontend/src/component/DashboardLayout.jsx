import { useLayoutEffect } from "react"
import { Outlet, useLocation } from "react-router-dom"
import NavBar from "./NavBar"
import "../styles/dashboard.css"

function DashboardLayout() {
  const { pathname } = useLocation()

  useLayoutEffect(() => {
    window.scrollTo(0, 0)
  }, [pathname])

  return (
    <div className="dashboard-layout">
      <NavBar />
      <Outlet />
    </div>
  )
}

export default DashboardLayout

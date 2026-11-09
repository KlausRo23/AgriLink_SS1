import { Outlet } from "react-router-dom"
import NavBar from "./NavBar"
import "../styles/dashboard.css"

function DashboardLayout() {
  return (
    <div className="dashboard-layout">
      <NavBar />
      <Outlet />
    </div>
  )
}

export default DashboardLayout

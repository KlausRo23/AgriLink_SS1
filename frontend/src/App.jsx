import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom"
import DashboardLayout from "./component/DashboardLayout"
import CropPage from "./pages/CropPage"
import CropDetailPage from "./pages/CropDetailPage"
import AddCropPage from "./pages/AddCropPage"
import DashBoard from "./pages/DashBoard"
import FarmFormPage from "./pages/FarmFormPage"
import FarmerFormPage from "./pages/FarmerFormPage"
import HistoryPage from "./pages/HistoryPage"
import InboxPage from "./pages/InboxPage"
import InventoryPage from "./pages/InventoryPage"
import InventoryDetail from "./pages/InventoryDetail"
import ListingPage from "./pages/ListingPage"
import ListingDetail from "./pages/ListingDetail"
import SettingPage from "./pages/SettingPage"
import VerificationFormPage from "./pages/VerificationFormPage"
import AuthPage from "./pages/AuthPage"
import OnboardingRoute from "./component/OnboardingRoute"
import { FormProvider } from "./context/FormContext"
import { AuthProvider } from "./context/AuthProvider"
import { SettingsProvider } from "./context/SettingsProvider"
import { Toaster } from "react-hot-toast"
import "./styles/dark-mode.css"

function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <SettingsProvider>
          <FormProvider>
            <Toaster
              position="top-center"
              toastOptions={{
                duration: 4000,
                style: {
                  background: "#173d2b",
                  color: "#fff",
                  border: "1px solid #477451",
                  borderRadius: "12px",
                  fontSize: "16px",
                  padding: "14px 18px",
                },
                success: { iconTheme: { primary: "#a7d46f", secondary: "#173d2b" } },
                error: { iconTheme: { primary: "#ff8a80", secondary: "#173d2b" } },
              }}
            />
            <Routes>
              <Route path="/" element={<AuthPage />} />
              <Route element={<OnboardingRoute step="complete" />}>
                <Route element={<DashboardLayout />}>
                  <Route path="/dashboard" element={<DashBoard />} />
                  <Route path="/crops" element={<CropPage />} />
                  <Route path="/crops/add" element={<AddCropPage />} />
                  <Route path="/crops/:id" element={<CropDetailPage />} />
                  <Route path="/inventory" element={<InventoryPage />} />
                  <Route path="/inventory/:id" element={<InventoryDetail />} />
                  <Route path="/inbox" element={<InboxPage />} />
                  <Route path="/listings" element={<ListingPage />} />
                  <Route path="/listings/:id" element={<ListingDetail />} />
                  <Route path="/history" element={<HistoryPage />} />
                  <Route path="/settings" element={<SettingPage />} />
                </Route>
              </Route>
              <Route element={<OnboardingRoute step="farmer" />}>
                <Route path="/farmer" element={<FarmerFormPage />} />
              </Route>
              <Route element={<OnboardingRoute step="farm" />}>
                <Route path="/farm" element={<FarmFormPage />} />
              </Route>
              <Route element={<OnboardingRoute step="verification" />}>
                <Route path="/verification" element={<VerificationFormPage />} />
              </Route>
              <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>
          </FormProvider>
        </SettingsProvider>
      </AuthProvider>
    </BrowserRouter>
  )
}

export default App

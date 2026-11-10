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

function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <FormProvider>
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
      </AuthProvider>
    </BrowserRouter>
  )
}

export default App

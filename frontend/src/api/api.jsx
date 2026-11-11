import axios from "axios"

const ACCESS_TOKEN_KEY = "agrilink.accessToken"
const AUTH_CHANGE_EVENT = "agrilink:auth-change"
const API_BASE_URL = (import.meta.env.VITE_API_URL || "http://localhost:5000/api").replace(/\/+$/, "")
// "/ss1/api" is proxied to SS1's ngrok URL by vite.config.js
const AUTH_API_BASE_URL = (import.meta.env.VITE_AUTH_API_URL || "/ss1/api").replace(/\/+$/, "")
const PRIVACY_POLICY_VERSION = import.meta.env.VITE_PRIVACY_POLICY_VERSION || "2026-11-09"
const API_URL = new URL(API_BASE_URL)
const API_ORIGIN = API_URL.origin

if (import.meta.env.DEV) {
  console.info("[axios] API:", API_BASE_URL, "| AUTH API:", AUTH_API_BASE_URL)
}

const api = axios.create({
  baseURL: API_BASE_URL,
  withCredentials: true,
})

const authApi = axios.create({
  baseURL: AUTH_API_BASE_URL,
  headers: {
    "ngrok-skip-browser-warning": "true",
  },
})

export function getAssetUrl(path) {
  if (!path) return ""
  const assetUrl = new URL(path, API_BASE_URL)
  if (assetUrl.pathname.startsWith("/uploads/") && assetUrl.hostname === API_URL.hostname) {
    return new URL(`${assetUrl.pathname}${assetUrl.search}${assetUrl.hash}`, API_ORIGIN).toString()
  }
  return assetUrl.toString()
}

function attachToken(config) {
  const accessToken = window.sessionStorage.getItem(ACCESS_TOKEN_KEY)
  if (accessToken) config.headers.Authorization = `Bearer ${accessToken}`
  return config
}

api.interceptors.request.use(attachToken)
authApi.interceptors.request.use(attachToken)

// No refresh endpoint on SS1: an expired or invalid token just means "log in again"
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401 && getAccessToken()) clearAccessToken()
    return Promise.reject(error)
  },
)

export function setAccessToken(accessToken) {
  window.sessionStorage.setItem(ACCESS_TOKEN_KEY, accessToken)
  window.dispatchEvent(new Event(AUTH_CHANGE_EVENT))
}

export function getAccessToken() {
  return window.sessionStorage.getItem(ACCESS_TOKEN_KEY)
}

export function clearAccessToken() {
  window.sessionStorage.removeItem(ACCESS_TOKEN_KEY)
  window.dispatchEvent(new Event(AUTH_CHANGE_EVENT))
}

export function subscribeToAuthChanges(listener) {
  window.addEventListener(AUTH_CHANGE_EVENT, listener)
  return () => window.removeEventListener(AUTH_CHANGE_EVENT, listener)
}

export function registerAccount({
  email,
  password,
  passwordConfirmation = password,
  privacyPolicyVersion = PRIVACY_POLICY_VERSION,
}) {
  return authApi.post("/auth/register", {
    email: email.trim(),
    password,
    passwordConfirmation,
    privacyPolicyVersion,
  })
}

export function verifyEmail({ email, code, role }) {
  // role must be "FARMER" or "BUYER" (uppercase) for SS1
  return authApi.post("/auth/verify-email", { email: email.trim(), code, role })
}

export function resendVerificationCode(email) {
  return authApi.post("/auth/resend-verification-code", {
    email: email.trim(),
    privacyPolicyVersion: PRIVACY_POLICY_VERSION,
  })
}

export function loginAccount({ email, password }) {
  // SS1 responds with { message, token, nextStep, user }
  return authApi.post("/auth/login", { email: email.trim(), password })
}

export function getCurrentUser() {
  return authApi.get("/auth/me")
}

export function changeAccountPassword(data) {
  return api.post("/settings/password", data)
}

export function getUserSettings() {
  return api.get("/settings")
}

export function updateUserSettings(data) {
  return api.patch("/settings", data)
}

export function updateUserRegion(region) {
  return api.patch("/settings/region", { region })
}

export function getOnboardingStatus() {
  return api.get("/onboarding/status")
}

export function getDashboard() {
  return api.get("/dashboard")
}

export function createFarmerProfile(formData) {
  return api.post("/farmers/profile", formData)
}

export function getMyFarmerProfile() {
  return api.get("/farmers/profile/me")
}

export function updateFarmerProfile(id, formData) {
  return api.put(`/farmers/edit-profile/${id}`, formData)
}

export function createFarmProfile(formData) {
  return api.post("/farms/farm", formData)
}

export function getMyFarmProfile() {
  return api.get("/farms/profile/me")
}

export function updateFarmProfile(id, formData) {
  return api.put(`/farms/edit-farm/${id}`, formData)
}

export function submitFarmerVerification(formData) {
  return api.post("/verification/submit-verification", formData)
}

export function getInventory(params = {}) {
  return api.get("/inventory", { params })
}

export function getInventoryItem(id) {
  return api.get(`/inventory/${id}`)
}

export function createInventoryItem(formData) {
  return api.post("/inventory/create-inventory", formData)
}

export function updateInventoryItem(id, formData) {
  return api.put(`/inventory/edit-inventory/${id}`, formData)
}

export function archiveInventoryItem(id, reason = "Archived by farmer") {
  return api.delete(`/inventory/delete-inventory/${id}`, { data: { reason } })
}

export function createListing(formData) {
  return api.post("/submit-listing", formData)
}

export function getMyListings(params = {}) {
  return api.get("/my-listings", { params })
}

export function getMyListing(id) {
  return api.get(`/listing/${id}`)
}

export function updateListing(id, data) {
  return api.put(`/edit-listing/${id}`, data)
}

export function resubmitListing(id) {
  return api.patch(`/resubmit-listing/${id}`)
}

export function archiveListing(id, reason = "Archived by farmer") {
  return api.delete(`/delete-listing/${id}`, { data: { reason } })
}

export function getMarketplaceListings(params = {}) {
  return api.get("/marketplace", { params })
}

export function getMarketplaceListing(id) {
  return api.get(`/marketplace/${id}`)
}

export function getInboxConversations() {
  return api.get("/inbox")
}

export function createInboxOrderRequest(request) {
  return api.post("/inbox/order-requests", request)
}

export function respondToInboxRequest(id, action) {
  return api.patch(`/inbox/${id}/request`, { action })
}

export function updateInboxOrderStatus(id, orderStatus) {
  return api.patch(`/inbox/${id}/order-status`, { orderStatus })
}

export function sendInboxMessage(id, text) {
  return api.post(`/inbox/${id}/messages`, { text })
}

export function setInboxArchived(id, archived) {
  return api.patch(`/inbox/${id}/archive`, { archived })
}

export function getHistory(params = {}) {
  return api.get("/history", { params })
}

export function getArchivedItems(params = {}) {
  return api.get("/archive/all-archive", { params })
}

export function restoreArchivedItem(id) {
  return api.put(`/archive/restore-archive/${id}`)
}

export function deleteArchivedItem(id) {
  return api.delete(`/archive/delete-archive/${id}`)
}

export function getCrops() {
  return api.get("/crops", { params: { limit: 50 } })
}

export function getCrop(id) {
  return api.get(`/crops/${id}`)
}

export function createCrop(formData) {
  return api.post("/crops/add-crop", formData)
}

export function updateCrop(id, formData) {
  return api.put(`/crops/edit-crop/${id}`, formData)
}

export function archiveCrop(id, reason = "Archived by farmer") {
  return api.delete(`/crops/crop/${id}`, { data: { reason } })
}

export function harvestCrop(id, formData) {
  return api.post(`/crops/harvest/${id}`, formData)
}

export function getCropCalendar(id, month) {
  return api.get(`/schedule/crop/${id}/calendar`, { params: { month } })
}

export function saveCropActivity(id, date, formData) {
  return api.put(`/schedule/crop/${id}/day/${date}`, formData)
}

export default api
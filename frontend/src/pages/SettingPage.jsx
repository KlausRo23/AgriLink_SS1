import { useCallback, useEffect, useRef, useState } from "react"
import { useNavigate } from "react-router-dom"
import { CROP_SPECIALTIES } from "../data/cropSpecialties"
import { DELIVERY_MODES, normalizeDeliveryModes } from "../data/deliveryModes"
import {
  changeAccountPassword,
  getAssetUrl,
  getMyFarmProfile,
  getMyFarmerProfile,
  getUserSettings,
  updateFarmProfile,
  updateFarmerProfile,
  updateUserRegion,
  updateUserSettings,
  setAccessToken,
} from "../api/api"
import {
  Check, CircleUserRound, CloudUpload, Edit3, ImagePlus, Leaf, LockKeyhole,
  LogOut, Moon, ShieldCheck, Sun,
} from "lucide-react"
import LogoutModal from "../component/modal/LogoutModal"
import { useAuth } from "../context/useAuth"
import { useFormContext } from "../context/useFormContext"
import "../styles/settings.css"

const TABS = [
  { id: "general", label: "General" },
  { id: "account", label: "Account Profile" },
  { id: "farm", label: "Farm Profile" },
]
const REGIONS = [
  { id: "ncr", label: "NCR (Metro Manila)" },
  { id: "car", label: "CAR (Cordillera)" },
  { id: "ilocos", label: "Ilocos Region" },
  { id: "cagayan-valley", label: "Cagayan Valley" },
  { id: "central-luzon", label: "Central Luzon" },
  { id: "calabarzon", label: "CALABARZON" },
  { id: "mimaropa", label: "MIMAROPA" },
  { id: "bicol", label: "Bicol Region" },
  { id: "western-visayas", label: "Western Visayas" },
  { id: "central-visayas", label: "Central Visayas" },
  { id: "eastern-visayas", label: "Eastern Visayas" },
  { id: "zamboanga", label: "Zamboanga Peninsula" },
  { id: "northern-mindanao", label: "Northern Mindanao" },
  { id: "davao", label: "Davao Region" },
  { id: "soccsksargen", label: "SOCCSKSARGEN" },
  { id: "caraga", label: "Caraga" },
  { id: "barmm", label: "BARMM" },
]
const SUFFIXES = ["Jr", "Sr", "I", "II", "III"]
const EMPTY_SETTINGS = {
  theme: "light",
  fontSize: "default",
  account: {
    firstName: "",
    middleName: "",
    lastName: "",
    suffix: "",
    age: "",
    region: "",
    bio: "",
    mobileNumber: "",
    email: "",
    facebook: "",
  },
  farm: {
    farmName: "",
    location: "",
    startedFarming: "",
    description: "",
    specialty: [],
    deliveryMode: [],
    deliverableRegions: [],
    naturallyGrown: true,
  },
}

function mapSettingsResponse(preferences, farmer, farm, userEmail) {
  return {
    theme: preferences?.theme || EMPTY_SETTINGS.theme,
    fontSize: preferences?.fontSize || EMPTY_SETTINGS.fontSize,
    account: {
      firstName: farmer.firstName || "",
      middleName: farmer.middleName || "",
      lastName: farmer.lastName || "",
      suffix: farmer.suffix || "",
      age: farmer.age == null ? "" : String(farmer.age),
      region: farmer.region || "",
      bio: farmer.bio || "",
      mobileNumber: farmer.mobileNumber || "",
      email: farmer.email || userEmail || "",
      facebook: farmer.facebook || "",
    },
    farm: {
      farmName: farm.farmName || "",
      location: farm.location || "",
      startedFarming: farm.startedFarming ? String(new Date(farm.startedFarming).getUTCFullYear()) : "",
      description: farm.description || "",
      specialty: Array.isArray(farm.specialty) ? farm.specialty : [],
      deliveryMode: normalizeDeliveryModes(farm.deliveryMode),
      deliverableRegions: Array.isArray(farm.deliverableRegions) ? farm.deliverableRegions : [],
      naturallyGrown: farm.naturallyGrown ?? true,
    },
  }
}

async function fetchSettingsData(userEmail) {
  const [preferencesResponse, farmerResponse, farmResponse] = await Promise.all([
    getUserSettings(),
    getMyFarmerProfile(),
    getMyFarmProfile(),
  ])
  const farmer = farmerResponse.data?.data
  const farm = farmResponse.data?.data
  if (!farmer?._id || !farm?._id) throw new Error("Your farmer or farm profile could not be loaded.")

  return {
    settings: mapSettingsResponse(preferencesResponse.data?.settings, farmer, farm, userEmail),
    farmer,
    farm,
  }
}

function getDisplayName(account) {
  return [account.firstName, account.middleName, account.lastName, account.suffix]
    .filter(Boolean)
    .join(" ")
}

function SettingField({ label, hint, children }) {
  return (
    <label className="settings-field">
      <span>{label}</span>
      {children}
      {hint && <small>{hint}</small>}
    </label>
  )
}

function SettingsCard({ title, description, children, className = "" }) {
  return (
    <section className={`settings-card ${className}`}>
      <header className="settings-card-heading">
        <div>
          <h2>{title}</h2>
          {description && <p>{description}</p>}
        </div>
      </header>
      {children}
    </section>
  )
}

function SettingPage() {
  const navigate = useNavigate()
  const { logout, user } = useAuth()
  const { status: onboardingStatus } = useFormContext()
  const [settings, setSettings] = useState(EMPTY_SETTINGS)
  const [farmerId, setFarmerId] = useState("")
  const [farmId, setFarmId] = useState("")
  const [isLoading, setIsLoading] = useState(true)
  const [loadError, setLoadError] = useState("")
  const [saving, setSaving] = useState(false)
  const [activeTab, setActiveTab] = useState("general")
  const [notice, setNotice] = useState("")
  const [editingAccount, setEditingAccount] = useState(false)
  const [passwords, setPasswords] = useState({ current: "", next: "", confirm: "" })
  const [passwordError, setPasswordError] = useState("")
  const [passwordNotice, setPasswordNotice] = useState("")
  const [passwordSaving, setPasswordSaving] = useState(false)
  const [logoutOpen, setLogoutOpen] = useState(false)
  const [loggingOut, setLoggingOut] = useState(false)
  const [logoutError, setLogoutError] = useState("")
  const [farmPhoto, setFarmPhoto] = useState("")
  const [farmPhotoFile, setFarmPhotoFile] = useState(null)
  const [profilePhoto, setProfilePhoto] = useState("")
  const [profilePhotoFile, setProfilePhotoFile] = useState(null)
  const profilePhotoInput = useRef(null)
  const profilePhotoUrl = useRef("")
  const farmPhotoInput = useRef(null)
  const farmPhotoUrl = useRef("")

  const loadSettings = useCallback(async () => {
    setIsLoading(true)
    setLoadError("")
    try {
      const { settings: loadedSettings, farmer, farm } = await fetchSettingsData(user?.email)
      setSettings(loadedSettings)
      setFarmerId(String(farmer._id))
      setFarmId(String(farm._id))
      setProfilePhoto(farmer.profile ? getAssetUrl(farmer.profile) : "")
      setFarmPhoto(farm.farmPhoto ? getAssetUrl(farm.farmPhoto) : "")
      setProfilePhotoFile(null)
      setFarmPhotoFile(null)
    } catch (error) {
      console.error("Could not load settings:", error)
      setLoadError(error.response?.data?.message || error.message || "Could not load your settings.")
    } finally {
      setIsLoading(false)
    }
  }, [user])

  useEffect(() => {
    if (isLoading) return
    document.documentElement.dataset.appearance = settings.theme
    document.documentElement.dataset.fontSize = settings.fontSize
  }, [isLoading, settings.fontSize, settings.theme])

  useEffect(() => () => {
    if (profilePhotoUrl.current) URL.revokeObjectURL(profilePhotoUrl.current)
    if (farmPhotoUrl.current) URL.revokeObjectURL(farmPhotoUrl.current)
  }, [])

  useEffect(() => {
    let active = true
    queueMicrotask(() => {
      if (active) void loadSettings()
    })
    return () => { active = false }
  }, [loadSettings])

  function updateSettings(section, key, value) {
    setSettings((current) => ({
      ...current,
      [section]: { ...current[section], [key]: value },
    }))
    setNotice("")
  }

  async function saveSettings(event) {
    event?.preventDefault()
    setSaving(true)
    setNotice("")
    try {
      if (activeTab === "general") {
        const { data } = await updateUserSettings({
          theme: settings.theme,
          fontSize: settings.fontSize,
        })
        setSettings((current) => ({ ...current, ...data.settings }))
        setNotice("Preferences saved to your account.")
      } else if (activeTab === "account") {
        if (!settings.account.region) throw new Error("Choose the region where you farm.")
        const formData = new FormData()
        for (const [key, value] of Object.entries(settings.account)) {
          formData.append(key, value)
        }
        if (profilePhotoFile) formData.append("profile", profilePhotoFile)
        const { data } = await updateFarmerProfile(farmerId, formData)
        await updateUserRegion(settings.account.region)
        if (profilePhotoUrl.current) URL.revokeObjectURL(profilePhotoUrl.current)
        profilePhotoUrl.current = ""
        setProfilePhotoFile(null)
        setProfilePhoto(data.data.profile ? getAssetUrl(data.data.profile) : "")
        setEditingAccount(false)
        setNotice("Account profile saved.")
      } else {
        if (!settings.farm.deliveryMode.length || !settings.farm.deliverableRegions.length) {
          throw new Error("Choose at least one delivery method and one delivery region.")
        }
        const formData = new FormData()
        for (const [key, value] of Object.entries(settings.farm)) {
          formData.append(key, Array.isArray(value) ? JSON.stringify(value) : String(value))
        }
        if (farmPhotoFile) formData.append("farmPhoto", farmPhotoFile)
        const { data } = await updateFarmProfile(farmId, formData)
        if (farmPhotoUrl.current) URL.revokeObjectURL(farmPhotoUrl.current)
        farmPhotoUrl.current = ""
        setFarmPhotoFile(null)
        setFarmPhoto(data.data.farmPhoto ? getAssetUrl(data.data.farmPhoto) : "")
        setNotice("Farm profile saved.")
      }
    } catch (error) {
      console.error("Could not save settings:", error)
      setNotice(error.response?.data?.message || error.message || "Settings could not be saved.")
      if (activeTab === "account") {
        if (profilePhotoUrl.current) URL.revokeObjectURL(profilePhotoUrl.current)
        profilePhotoUrl.current = ""
        setProfilePhotoFile(null)
        await loadSettings()
      }
    } finally {
      setSaving(false)
    }
  }

  function cancelSettings() {
    if (profilePhotoUrl.current) URL.revokeObjectURL(profilePhotoUrl.current)
    profilePhotoUrl.current = ""
    if (farmPhotoUrl.current) URL.revokeObjectURL(farmPhotoUrl.current)
    farmPhotoUrl.current = ""
    setProfilePhotoFile(null)
    setFarmPhotoFile(null)
    setEditingAccount(false)
    setNotice("")
    void loadSettings()
  }

  function toggleFarmSelection(key, value) {
    const selected = settings.farm[key].includes(value)
      ? settings.farm[key].filter((item) => item !== value)
      : [...settings.farm[key], value]
    updateSettings("farm", key, selected)
  }

  function updateFarmPhoto(event) {
    const [file] = event.target.files || []
    event.target.value = ""
    if (!file) return
    if (!["image/jpeg", "image/png", "image/webp"].includes(file.type) || file.size > 3 * 1024 * 1024) {
      setNotice("Choose a JPEG, PNG or WebP farm photo up to 3MB.")
      return
    }
    if (farmPhotoUrl.current) URL.revokeObjectURL(farmPhotoUrl.current)
    farmPhotoUrl.current = URL.createObjectURL(file)
    setFarmPhoto(farmPhotoUrl.current)
    setFarmPhotoFile(file)
    setNotice("")
  }

  function updateProfilePhoto(event) {
    const [file] = event.target.files || []
    event.target.value = ""
    if (!file) return
    if (!["image/jpeg", "image/png", "image/webp"].includes(file.type) || file.size > 2 * 1024 * 1024) {
      setNotice("Choose a JPEG, PNG or WebP profile photo up to 2MB.")
      return
    }
    if (profilePhotoUrl.current) URL.revokeObjectURL(profilePhotoUrl.current)
    profilePhotoUrl.current = URL.createObjectURL(file)
    setProfilePhoto(profilePhotoUrl.current)
    setProfilePhotoFile(file)
    setNotice("")
  }

  async function changePassword(event) {
    event.preventDefault()
    const { current, next, confirm } = passwords
    if (!current) {
      setPasswordError("Enter your current password.")
      return
    }
    if (next.length < 8 || !/[A-Z]/.test(next) || !/[a-z]/.test(next) || !/\d/.test(next) || !/[^A-Za-z0-9]/.test(next)) {
      setPasswordError("Use at least 8 characters with uppercase, lowercase, a number, and a symbol.")
      return
    }
    if (next !== confirm) {
      setPasswordError("The new passwords do not match.")
      return
    }
    setPasswordError("")
    setPasswordNotice("")
    setPasswordSaving(true)
    try {
      const { data } = await changeAccountPassword({ currentPassword: current, newPassword: next })
      if (!data?.accessToken) throw new Error("The password update response was incomplete.")
      setAccessToken(data.accessToken)
      setPasswords({ current: "", next: "", confirm: "" })
      setPasswordNotice("Password changed successfully.")
    } catch (error) {
      console.error("Could not change password:", error)
      setPasswordError(error.response?.data?.message || error.message || "Could not change your password.")
    } finally {
      setPasswordSaving(false)
    }
  }

  async function handleLogout() {
    setLoggingOut(true)
    setLogoutError("")
    try {
      await logout()
      setLogoutOpen(false)
      navigate("/", { replace: true })
    } catch (error) {
      setLogoutError(error.response?.data?.message || "Could not log out. Please try again.")
    } finally {
      setLoggingOut(false)
    }
  }

  return (
    <main className="dashboard-main settings-page">
      <header className="dashboard-topbar">
        <div className="dashboard-breadcrumb">Settings</div>
        <button type="button" className="dashboard-avatar" aria-label="Account">{user?.name?.charAt(0)?.toUpperCase() || "F"}</button>
      </header>

      <div className="settings-content">
        <header className="settings-page-heading">
          <h1 className="dashboard-page-title">Settings</h1>
          <p>Manage your preferences, account and farm details.</p>
        </header>

        {loadError && (
          <div className="settings-form-error" role="alert">
            {loadError}
            <button type="button" className="settings-outline-button" onClick={() => void loadSettings()}>Try again</button>
          </div>
        )}
        <nav className="settings-tabs" aria-label="Settings sections" role="tablist">
          {TABS.map((tab) => (
            <button
              type="button"
              role="tab"
              id={`settings-tab-${tab.id}`}
              aria-controls={`settings-panel-${tab.id}`}
              aria-selected={activeTab === tab.id}
              className={`settings-tab${activeTab === tab.id ? " is-active" : ""}`}
              key={tab.id}
              onClick={() => { setActiveTab(tab.id); setNotice("") }}
            >
              {tab.label}
            </button>
          ))}
        </nav>

        <div>
          <div
            id={`settings-panel-${activeTab}`}
            className="settings-panel"
            role="tabpanel"
            aria-labelledby={`settings-tab-${activeTab}`}
            aria-busy={isLoading}
          >
            {isLoading ? <p className="settings-upload-note" role="status">Loading your saved settings…</p> : loadError ? null : (
              <>
            {activeTab === "general" && (
              <SettingsCard
                title="Farmer Console Customization"
                description="Personalize how AgriLink looks and feels on this device."
              >
                <div className="settings-control-section">
                  <h3>Appearance Theme</h3>
                  <p>Select your preferred color profile. The visual theme applies instantly across the dashboard.</p>
                  <div className="settings-theme-options">
                    <button
                      type="button"
                      className={`settings-theme-choice light${settings.theme === "light" ? " is-selected" : ""}`}
                      aria-pressed={settings.theme === "light"}
                      onClick={() => { setSettings((current) => ({ ...current, theme: "light" })); setNotice("") }}
                    >
                      <span className="settings-theme-choice-title"><Sun size={16} /> AgriLink Light <i /></span>
                      <span>Warm cream surfaces, rich gold accents and clean foliage green highlights.</span>
                    </button>
                    <button
                      type="button"
                      className={`settings-theme-choice dark${settings.theme === "dark" ? " is-selected" : ""}`}
                      aria-pressed={settings.theme === "dark"}
                      onClick={() => { setSettings((current) => ({ ...current, theme: "dark" })); setNotice("") }}
                    >
                      <span className="settings-theme-choice-title"><Moon size={16} /> Dark Theme <i /></span>
                      <span>High-contrast slate black backgrounds engineered for night monitoring.</span>
                    </button>
                  </div>
                </div>

                <div className="settings-control-section settings-font-section">
                  <h3>Font Size Adjustment</h3>
                  <p>Adjust overall screen density and typography scaling for improved text readability.</p>
                  <div className="settings-font-options" role="group" aria-label="Font size">
                    {[
                      { value: "small", label: "Small" },
                      { value: "default", label: "Default" },
                      { value: "large", label: "Large" },
                    ].map((size) => (
                      <button
                        type="button"
                        key={size.value}
                        className={settings.fontSize === size.value ? "is-selected" : ""}
                        aria-pressed={settings.fontSize === size.value}
                        onClick={() => { setSettings((current) => ({ ...current, fontSize: size.value })); setNotice("") }}
                      >
                        {size.label}
                      </button>
                    ))}
                  </div>
                  <div className="settings-accessibility-preview">
                    <span>Accessibility Preview</span>
                    <p>AgriLink Accessibility Preview: Keeping local farmers connected with clean schedules, real-time harvests, and easy-to-read tools.</p>
                  </div>
                </div>
                <div className="settings-logout-row">
                  <div><strong>Logout</strong><span>Sign out of AgriLink on this device. You will need to sign in again.</span></div>
                  <button type="button" className="settings-logout-button" onClick={() => { setLogoutError(""); setLogoutOpen(true) }}>
                    <LogOut size={14} /> Logout
                  </button>
                </div>
              </SettingsCard>
            )}

            {activeTab === "account" && (
              <>
                <section className="settings-profile-summary">
                  <div className="settings-profile-avatar">
                    {profilePhoto
                      ? <img src={profilePhoto} alt="Farmer profile preview" />
                      : <CircleUserRound size={43} aria-hidden="true" />}
                    <span><Check size={11} /></span>
                  </div>
                  <div className="settings-profile-identity">
                    <h2>{getDisplayName(settings.account)}</h2>
                    <p>{settings.account.email} <i /> Farmer profile</p>
                  </div>
                  <div className="settings-profile-actions">
                    <input ref={profilePhotoInput} type="file" accept="image/jpeg,image/png,image/webp" hidden onChange={updateProfilePhoto} />
                    <button type="button" className="settings-outline-button" onClick={() => profilePhotoInput.current?.click()}>
                      <ImagePlus size={14} /> Change photo
                    </button>
                    <button type="button" className="settings-outline-button" onClick={() => setEditingAccount((value) => !value)}>
                      <Edit3 size={14} /> {editingAccount ? "Done editing" : "Edit Profile"}
                    </button>
                  </div>
                </section>

                <SettingsCard title="About you" description="Keep your farmer profile details up to date.">
                  <div className="settings-form-grid">
                    <SettingField label="First name">
                      <input autoComplete="given-name" maxLength={30} value={settings.account.firstName} onChange={(event) => updateSettings("account", "firstName", event.target.value)} readOnly={!editingAccount} />
                    </SettingField>
                    <SettingField label="Middle name">
                      <input autoComplete="additional-name" maxLength={30} value={settings.account.middleName} onChange={(event) => updateSettings("account", "middleName", event.target.value)} readOnly={!editingAccount} />
                    </SettingField>
                    <SettingField label="Last name">
                      <input autoComplete="family-name" maxLength={30} value={settings.account.lastName} onChange={(event) => updateSettings("account", "lastName", event.target.value)} readOnly={!editingAccount} />
                    </SettingField>
                    <SettingField label="Suffix" hint="Optional">
                      <select value={settings.account.suffix} onChange={(event) => updateSettings("account", "suffix", event.target.value)} disabled={!editingAccount}>
                        <option value="">None</option>
                        {SUFFIXES.map((suffix) => <option key={suffix} value={suffix}>{suffix}</option>)}
                      </select>
                    </SettingField>
                    <SettingField label="Age" hint="You must be 18 or older.">
                      <input type="number" min={18} max={99} inputMode="numeric" value={settings.account.age} onChange={(event) => updateSettings("account", "age", event.target.value)} readOnly={!editingAccount} />
                    </SettingField>
                    <SettingField label="Region where you farm">
                      <select value={settings.account.region} onChange={(event) => updateSettings("account", "region", event.target.value)} disabled={!editingAccount}>
                        <option value="">Choose a region</option>
                        {REGIONS.map((region) => <option key={region.id} value={region.id}>{region.label}</option>)}
                      </select>
                    </SettingField>
                    <div className="settings-span-2">
                      <SettingField label="About me" hint="Optional · Up to 200 characters">
                        <textarea rows={4} maxLength={200} value={settings.account.bio} onChange={(event) => updateSettings("account", "bio", event.target.value)} readOnly={!editingAccount} placeholder="Share a short introduction with buyers." />
                      </SettingField>
                    </div>
                  </div>
                </SettingsCard>

                <SettingsCard title="Contacts" description="Your phone, email and Facebook details are not shown to buyers.">
                  <div className="settings-form-grid">
                    <SettingField label="Mobile number" hint="Use 09XXXXXXXXX or +639XXXXXXXXX.">
                      <input type="tel" autoComplete="tel" placeholder="09XXXXXXXXX" value={settings.account.mobileNumber} onChange={(event) => updateSettings("account", "mobileNumber", event.target.value)} readOnly={!editingAccount} />
                    </SettingField>
                    <SettingField label="Email" hint="Optional">
                      <input type="email" autoComplete="email" value={settings.account.email} onChange={(event) => updateSettings("account", "email", event.target.value)} readOnly={!editingAccount} />
                    </SettingField>
                    <div className="settings-span-2">
                      <SettingField label="Facebook profile or page" hint="Optional · Enter a full https link">
                        <input type="url" autoComplete="url" placeholder="https://facebook.com/your-profile" value={settings.account.facebook} onChange={(event) => updateSettings("account", "facebook", event.target.value)} readOnly={!editingAccount} />
                      </SettingField>
                    </div>
                  </div>
                </SettingsCard>

                <SettingsCard title="Account Security" description="Keep your AgriLink account secure.">
                  <div className="settings-password-area">
                    <form className="settings-password-form" onSubmit={changePassword}>
                      <SettingField label="Current Password">
                        <input type="password" autoComplete="current-password" placeholder="Enter your current password" value={passwords.current} onChange={(event) => setPasswords((current) => ({ ...current, current: event.target.value }))} />
                      </SettingField>
                      <div className="settings-form-grid">
                        <SettingField label="New Password" hint="8+ characters, with uppercase, lowercase, number and symbol">
                          <input type="password" autoComplete="new-password" placeholder="New password" value={passwords.next} onChange={(event) => setPasswords((current) => ({ ...current, next: event.target.value }))} />
                        </SettingField>
                        <SettingField label="Confirm Password" hint="Re-enter the new password">
                          <input type="password" autoComplete="new-password" placeholder="Confirm password" value={passwords.confirm} onChange={(event) => setPasswords((current) => ({ ...current, confirm: event.target.value }))} />
                        </SettingField>
                      </div>
                      {passwordError && <p className="settings-form-error" role="alert">{passwordError}</p>}
                      {passwordNotice && <p className="settings-form-notice" role="status">{passwordNotice}</p>}
                      <button type="submit" className="settings-primary-button" disabled={passwordSaving}>
                        <LockKeyhole size={14} /> {passwordSaving ? "Changing…" : "Change Password"}
                      </button>
                    </form>
                  </div>
                </SettingsCard>
              </>
            )}

            {activeTab === "farm" && (
              <>
                <SettingsCard title="About your farm" description="Give your farm a name and tell buyers where it is." className="settings-farm-meta">
                  <div className={`settings-farm-cover${farmPhoto ? " has-image" : ""}`} style={farmPhoto ? { backgroundImage: `url("${farmPhoto}")` } : undefined}>
                    {!farmPhoto && <span className="settings-cover-leaves" aria-hidden="true"><Leaf size={72} /><Leaf size={48} /></span>}
                    <input ref={farmPhotoInput} type="file" accept="image/jpeg,image/png,image/webp" onChange={updateFarmPhoto} hidden />
                    <button type="button" className="settings-cover-button" onClick={() => farmPhotoInput.current?.click()}><ImagePlus size={13} /> {farmPhoto ? "Change photo" : "Choose photo"}</button>
                  </div>
                  <p className="settings-upload-note">Farm photo (optional) · JPEG, PNG or WebP, up to 3MB. Save changes to upload.</p>
                  <div className="settings-form-grid settings-farm-fields">
                    <SettingField label="Farm name">
                      <input maxLength={30} value={settings.farm.farmName} onChange={(event) => updateSettings("farm", "farmName", event.target.value)} />
                    </SettingField>
                    <SettingField label="Farm location" hint="Include a municipality or town.">
                      <input maxLength={200} value={settings.farm.location} onChange={(event) => updateSettings("farm", "location", event.target.value)} />
                    </SettingField>
                  </div>
                </SettingsCard>

                <SettingsCard title="Your story" description="Share a little about what makes your farm special.">
                  <div className="settings-span-2">
                    <SettingField label="About this farm" hint="Up to 200 characters">
                      <textarea rows={4} maxLength={200} value={settings.farm.description} onChange={(event) => updateSettings("farm", "description", event.target.value)} />
                    </SettingField>
                    <p className="settings-character-count">{settings.farm.description.length} / 200</p>
                  </div>
                  <div className="settings-form-grid">
                    <SettingField label="Year you started farming" hint="Optional · Enter the year only.">
                      <input type="number" inputMode="numeric" min={1900} max={new Date().getFullYear()} placeholder="e.g. 2015" value={settings.farm.startedFarming} onChange={(event) => updateSettings("farm", "startedFarming", event.target.value)} />
                    </SettingField>
                  </div>
                  <fieldset className="settings-choice-fieldset">
                    <legend>Crops and specialties <span>(optional · select all that apply)</span></legend>
                    <div className="settings-crop-options">
                      {CROP_SPECIALTIES.map((crop) => (
                        <label className={settings.farm.specialty.includes(crop) ? "is-selected" : ""} key={crop}>
                          <input type="checkbox" checked={settings.farm.specialty.includes(crop)} onChange={() => toggleFarmSelection("specialty", crop)} />
                          {settings.farm.specialty.includes(crop) && <Check size={12} />}
                          {crop}
                        </label>
                      ))}
                    </div>
                  </fieldset>
                </SettingsCard>

                <SettingsCard title="Delivery" description="Choose how you deliver and which regions you can serve.">
                  <fieldset className="settings-choice-fieldset">
                    <legend>Delivery methods <span>(select all that apply)</span></legend>
                    <div className="settings-region-options">
                      {DELIVERY_MODES.map((mode) => (
                        <label className={settings.farm.deliveryMode.includes(mode.value) ? "is-selected" : ""} key={mode.value}>
                          <input type="checkbox" checked={settings.farm.deliveryMode.includes(mode.value)} onChange={() => toggleFarmSelection("deliveryMode", mode.value)} />
                          {mode.label}
                        </label>
                      ))}
                    </div>
                  </fieldset>
                  <fieldset className="settings-choice-fieldset">
                    <legend>Delivery regions <span>(select all regions you can deliver to)</span></legend>
                    <div className="settings-region-options">
                      {REGIONS.map((region) => (
                        <label className={settings.farm.deliverableRegions.includes(region.id) ? "is-selected" : ""} key={region.id}>
                          <input type="checkbox" checked={settings.farm.deliverableRegions.includes(region.id)} onChange={() => toggleFarmSelection("deliverableRegions", region.id)} />
                          {region.label}
                        </label>
                      ))}
                    </div>
                  </fieldset>
                </SettingsCard>

                <SettingsCard title="Trust, Credentials & RSBSA Verification" description="Verified farms earn buyer trust and unlock full access.">
                  <div className="settings-verification-status">
                    <div>
                      <strong>Farming practices</strong>
                      <span>Show buyers how your produce is grown.</span>
                    </div>
                    <button type="button" className={`settings-organic-pill${settings.farm.naturallyGrown ? " is-active" : ""}`} onClick={() => updateSettings("farm", "naturallyGrown", !settings.farm.naturallyGrown)}>
                      <Check size={13} /> Naturally Grown
                    </button>
                  </div>
                  <div className="settings-rsbsa-card">
                    <div className="settings-rsbsa-heading">
                      <div><strong>RSBSA Registration</strong><span>Registry System for Basic Sectors in Agriculture · Reviewed within 2–3 business days</span></div>
                      <span className="settings-pending-badge"><ShieldCheck size={13} /> {
                        onboardingStatus?.verificationStatus === "approved" ? "Verified"
                          : onboardingStatus?.verificationStatus === "rejected" ? "Needs resubmission"
                            : onboardingStatus?.verificationStatus === "pending" ? "Pending review"
                              : "Not submitted"
                      }</span>
                    </div>
                    <div className="settings-document-row">
                      <span className="settings-document-icon"><CloudUpload size={15} /></span>
                      <div>
                        <strong>RSBSA verification</strong>
                        <small>
                          {onboardingStatus?.verificationStatus === "approved" ? "Your farmer verification has been approved."
                            : onboardingStatus?.verificationStatus === "rejected" ? "Your submission was rejected. Contact support for next steps."
                              : onboardingStatus?.verificationStatus === "pending" ? "Your documents are being reviewed."
                                : "No verification submission is on file."}
                        </small>
                      </div>
                    </div>
                  </div>
                </SettingsCard>
              </>
            )}
              </>
            )}
          </div>

          <footer className="settings-actions">
            <span className={`settings-save-notice${notice ? " is-visible" : ""}`} role="status">{notice}</span>
            <button type="button" className="settings-cancel-button" disabled={isLoading || saving} onClick={cancelSettings}>Cancel</button>
            <button type="button" className="settings-save-button" disabled={isLoading || saving || Boolean(loadError)} onClick={saveSettings}>
              {saving ? "Saving…" : "Save Changes"}
            </button>
          </footer>
        </div>
      </div>
      {logoutOpen && (
        <LogoutModal
          onCancel={() => setLogoutOpen(false)}
          onConfirm={handleLogout}
          loading={loggingOut}
          error={logoutError}
        />
      )}
    </main>
  )
}

export default SettingPage

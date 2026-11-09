import { useEffect, useRef, useState } from "react"
import {
  Check, CircleUserRound, CloudUpload, Edit3, ImagePlus, Leaf, LockKeyhole,
  LogOut, Moon, ShieldCheck, Sun,
} from "lucide-react"
import "../styles/settings.css"

const SETTINGS_KEY = "agrilink-settings-preview"
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
const SPECIALTIES = [
  "Rice", "Corn", "Tomato", "Eggplant", "Okra", "Cabbage", "Carrot", "Onion", "Garlic", "Banana",
  "Mango", "Papaya", "Watermelon", "Sweet Potato", "Cassava", "Ampalaya", "Sitaw", "Kangkong",
  "Pechay", "Malunggay", "Lettuce", "Broccoli", "Cucumber", "Bell Pepper", "Chili Pepper", "Squash",
  "Upo", "Patola", "Sayote", "Potato", "Radish", "Ginger", "Gabi", "Ube", "Peanut", "Mung Bean",
  "Pineapple", "Calamansi", "Durian", "Lanzones", "Jackfruit", "Strawberry",
]

const DEFAULT_SETTINGS = {
  theme: "light",
  fontSize: "default",
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
    deliveryMode: "3rd party service",
    deliverableRegions: ["ncr"],
    naturallyGrown: true,
  },
}

function loadSettings() {
  try {
    const saved = window.localStorage.getItem(SETTINGS_KEY)
    if (!saved) return DEFAULT_SETTINGS
    const parsed = JSON.parse(saved)
    if (!parsed || typeof parsed !== "object") {
      throw new Error("Stored settings must be an object.")
    }
    const account = { ...DEFAULT_SETTINGS.account, ...parsed.account }
    if (parsed.account?.fullName && !parsed.account.firstName) {
      const [lastName = "", firstAndMiddle = "", suffix = ""] = parsed.account.fullName.split(",").map((part) => part.trim())
      const [firstName = "", ...middleParts] = firstAndMiddle.split(/\s+/)
      Object.assign(account, {
        firstName,
        middleName: middleParts.join(" "),
        lastName,
        suffix,
      })
    }
    if (!REGIONS.some((region) => region.id === account.region)) account.region = DEFAULT_SETTINGS.account.region
    const farm = { ...DEFAULT_SETTINGS.farm, ...parsed.farm }
    if (parsed.farm?.name && !parsed.farm.farmName) farm.farmName = parsed.farm.name
    if (parsed.farm?.startedYear && !parsed.farm.startedFarming) farm.startedFarming = parsed.farm.startedYear
    if (parsed.farm?.crops && !parsed.farm.specialty) farm.specialty = parsed.farm.crops
    if (parsed.farm?.deliveryMethods && !parsed.farm.deliveryMode) {
      farm.deliveryMode = parsed.farm.deliveryMethods.includes("Third-party courier") ? "3rd party service" : "deliver"
    }
    return {
      ...DEFAULT_SETTINGS,
      ...parsed,
      account,
      farm,
    }
  } catch (error) {
    console.error("Could not load settings preview:", error)
    return DEFAULT_SETTINGS
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
  const [settings, setSettings] = useState(loadSettings)
  const [activeTab, setActiveTab] = useState("general")
  const [notice, setNotice] = useState("")
  const [editingAccount, setEditingAccount] = useState(false)
  const [passwords, setPasswords] = useState({ current: "", next: "", confirm: "" })
  const [passwordError, setPasswordError] = useState("")
  const [passwordNotice, setPasswordNotice] = useState("")
  const [farmPhoto, setFarmPhoto] = useState("")
  const [profilePhoto, setProfilePhoto] = useState("")
  const [documentName, setDocumentName] = useState("rsbsa-stub.pdf")
  const profilePhotoInput = useRef(null)
  const profilePhotoUrl = useRef("")
  const farmPhotoInput = useRef(null)
  const farmPhotoUrl = useRef("")
  const documentInput = useRef(null)

  useEffect(() => {
    document.documentElement.dataset.appearance = settings.theme
    document.documentElement.dataset.fontSize = settings.fontSize
  }, [settings.fontSize, settings.theme])

  useEffect(() => () => {
    if (profilePhotoUrl.current) URL.revokeObjectURL(profilePhotoUrl.current)
    if (farmPhotoUrl.current) URL.revokeObjectURL(farmPhotoUrl.current)
  }, [])

  function updateSettings(section, key, value) {
    setSettings((current) => ({
      ...current,
      [section]: { ...current[section], [key]: value },
    }))
    setNotice("")
  }

  function saveSettings(event) {
    event?.preventDefault()
    try {
      window.localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings))
      setNotice("Settings saved as a local preview. Photo/document uploads and account actions are not connected.")
    } catch (error) {
      console.error("Could not save settings preview:", error)
      setNotice("Settings could not be saved. Check your browser storage and try again.")
    }
  }

  function cancelSettings() {
    setSettings(loadSettings())
    if (profilePhotoUrl.current) URL.revokeObjectURL(profilePhotoUrl.current)
    profilePhotoUrl.current = ""
    setProfilePhoto("")
    if (farmPhotoUrl.current) URL.revokeObjectURL(farmPhotoUrl.current)
    farmPhotoUrl.current = ""
    setFarmPhoto("")
    setDocumentName("rsbsa-stub.pdf")
    setNotice("")
  }

  function toggleFarmSelection(key, value) {
    const selected = settings.farm[key].includes(value)
      ? settings.farm[key].filter((item) => item !== value)
      : [...settings.farm[key], value]
    updateSettings("farm", key, selected)
  }

  function updateFarmPhoto(event) {
    const [file] = event.target.files || []
    if (!file) return
    if (!["image/jpeg", "image/png", "image/webp"].includes(file.type) || file.size > 3 * 1024 * 1024) {
      setNotice("Choose a JPEG, PNG or WebP farm photo up to 3MB.")
      return
    }
    if (farmPhotoUrl.current) URL.revokeObjectURL(farmPhotoUrl.current)
    farmPhotoUrl.current = URL.createObjectURL(file)
    setFarmPhoto(farmPhotoUrl.current)
    setNotice("")
  }

  function updateProfilePhoto(event) {
    const [file] = event.target.files || []
    if (!file) return
    if (!["image/jpeg", "image/png", "image/webp"].includes(file.type) || file.size > 2 * 1024 * 1024) {
      setNotice("Choose a JPEG, PNG or WebP profile photo up to 2MB.")
      return
    }
    if (profilePhotoUrl.current) URL.revokeObjectURL(profilePhotoUrl.current)
    profilePhotoUrl.current = URL.createObjectURL(file)
    setProfilePhoto(profilePhotoUrl.current)
    setNotice("")
  }

  function updateDocument(event) {
    const [file] = event.target.files || []
    if (file) setDocumentName(file.name)
  }

  function changePassword(event) {
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
    setPasswords({ current: "", next: "", confirm: "" })
    setPasswordError("")
    setPasswordNotice("Password changes are not connected in this preview.")
  }

  return (
    <main className="dashboard-main settings-page">
      <header className="dashboard-topbar">
        <div className="dashboard-breadcrumb">Settings</div>
        <button type="button" className="dashboard-avatar" aria-label="Account">F</button>
      </header>

      <div className="settings-content">
        <header className="settings-page-heading">
          <h1>Settings</h1>
          <p>Manage your preferences, account and farm details.</p>
        </header>

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
          >
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
                      <button type="submit" className="settings-primary-button"><LockKeyhole size={14} /> Change Password</button>
                    </form>
                  </div>
                  <div className="settings-logout-row">
                    <div><strong>Logout</strong><span>Sign out of AgriLink on this device. You will need to sign in again.</span></div>
                    <button type="button" className="settings-logout-button" onClick={() => setNotice("Logout is not connected in this preview.")}><LogOut size={14} /> Logout</button>
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
                  <p className="settings-upload-note">Farm photo (optional) · JPEG, PNG or WebP, up to 3MB. Preview only.</p>
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
                      {SPECIALTIES.map((crop) => (
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
                  <SettingField label="Delivery method">
                    <select value={settings.farm.deliveryMode} onChange={(event) => updateSettings("farm", "deliveryMode", event.target.value)}>
                      <option value="">Choose a delivery method</option>
                      <option value="deliver">I deliver</option>
                      <option value="3rd party service">Third-party delivery service</option>
                    </select>
                  </SettingField>
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
                      <span className="settings-pending-badge"><ShieldCheck size={13} /> Pending review</span>
                    </div>
                    <div className="settings-document-row">
                      <span className="settings-document-icon"><CloudUpload size={15} /></span>
                      <div><strong>{documentName}</strong><small>Supporting document · Preview only</small></div>
                      <input ref={documentInput} type="file" accept=".pdf,.jpg,.jpeg,.png" hidden onChange={updateDocument} />
                      <button type="button" onClick={() => setNotice("Document viewing is not connected in this preview.")}>View</button>
                      <button type="button" onClick={() => documentInput.current?.click()}>Upload new</button>
                    </div>
                  </div>
                </SettingsCard>
              </>
            )}
          </div>

          <footer className="settings-actions">
            <span className={`settings-save-notice${notice ? " is-visible" : ""}`} role="status">{notice}</span>
            <button type="button" className="settings-cancel-button" onClick={cancelSettings}>Cancel</button>
            <button type="button" className="settings-save-button" onClick={saveSettings}>Save Changes</button>
          </footer>
        </div>
      </div>
    </main>
  )
}

export default SettingPage

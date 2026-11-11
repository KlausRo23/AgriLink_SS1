import { useEffect, useMemo, useRef, useState } from "react"
import { useNavigate } from "react-router-dom"
import toast from "react-hot-toast"
import { useFormContext } from "../context/useFormContext"
import "../styles/Farmerformpage.css"

/* ------------------------------------------------------------------ */
/* Constants (mirror the backend rules in farmerValidator.js)          */
/* ------------------------------------------------------------------ */

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

const NAME_REGEX = /^[\p{L}][\p{L}\s.'-]*$/u
const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
const PH_MOBILE_REGEX = /^(09\d{9}|\+639\d{9})$/
const FACEBOOK_HOSTS = ["facebook.com", "www.facebook.com", "m.facebook.com", "fb.com", "www.fb.com"]

const BIO_MAX = 200
const PHOTO_MAX_BYTES = 2 * 1024 * 1024
const PHOTO_MIN_SIZE = 100
const PHOTO_TYPES = ["image/jpeg", "image/png", "image/webp"]

const REQUIRED_FIELDS = ["firstName", "middleName", "lastName", "age", "region"]

const MOBILE_STEPS = [
  { title: "About you", fields: ["firstName", "middleName", "lastName", "suffix", "age", "region"] },
  { title: "Your story", fields: ["bio"] },
  { title: "Contacts", fields: ["mobileNumber", "email", "facebook"] },
]

const EMPTY_VALUES = {
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
}

/* ------------------------------------------------------------------ */
/* Validation                                                          */
/* ------------------------------------------------------------------ */

function validateField(name, rawValue) {
  const value = typeof rawValue === "string" ? rawValue.trim() : rawValue

  switch (name) {
    case "firstName":
    case "middleName":
    case "lastName": {
      const label = { firstName: "First name", middleName: "Middle name", lastName: "Last name" }[name]
      if (!value) return `${label} is required.`
      if (value.length < 2 || value.length > 30) return `${label} must be 2 to 30 characters.`
      if (!NAME_REGEX.test(value)) return `${label} can only use letters, spaces, . ' and -`
      return ""
    }
    case "age": {
      if (value === "") return "Age is required."
      const n = Number(value)
      if (!Number.isInteger(n) || n < 18 || n > 99) return "Age must be a whole number from 18 to 99."
      return ""
    }
    case "region":
      return value ? "" : "Choose the region where you farm."
    case "bio":
      if (value.length > BIO_MAX) return `Keep it to ${BIO_MAX} characters or less.`
      return ""
    case "mobileNumber": {
      if (!value) return ""
      const stripped = value.replace(/[\s-]/g, "")
      return PH_MOBILE_REGEX.test(stripped) ? "" : "Use 09XXXXXXXXX or +639XXXXXXXXX."
    }
    case "email":
      if (!value) return ""
      if (value.length > 100 || !EMAIL_REGEX.test(value)) return "Enter a valid email address."
      return ""
    case "facebook": {
      if (!value) return ""
      try {
        const url = new URL(value)
        if (url.protocol !== "https:" || !FACEBOOK_HOSTS.includes(url.hostname) || value.length > 200) throw new Error()
        return ""
      } catch {
        return "Use a full https link to your Facebook page or profile."
      }
    }
    default:
      return ""
  }
}

function validateAll(values) {
  const errors = {}
  for (const name of Object.keys(EMPTY_VALUES)) {
    const message = validateField(name, values[name])
    if (message) errors[name] = message
  }
  return errors
}

// Checks type, size and real dimensions in the browser. The server re-checks everything again.
async function checkPhoto(file) {
  if (!PHOTO_TYPES.includes(file.type)) return "Use a JPEG, PNG or WebP image."
  if (file.size > PHOTO_MAX_BYTES) return "The photo must be 2MB or smaller."

  const url = URL.createObjectURL(file)
  try {
    const { width, height } = await new Promise((resolve, reject) => {
      const img = new Image()
      img.onload = () => resolve({ width: img.naturalWidth, height: img.naturalHeight })
      img.onerror = reject
      img.src = url
    })
    if (width < PHOTO_MIN_SIZE || height < PHOTO_MIN_SIZE) {
      return `The photo must be at least ${PHOTO_MIN_SIZE} x ${PHOTO_MIN_SIZE} pixels.`
    }
    return ""
  } catch {
    return "That file could not be read as an image."
  } finally {
    URL.revokeObjectURL(url)
  }
}

/* ------------------------------------------------------------------ */
/* Small presentational pieces                                         */
/* ------------------------------------------------------------------ */

function Field({ id, label, optional, hint, error, children }) {
  return (
    <div className="ff-field">
      <label className="ff-label" htmlFor={id}>
        {label}
        {optional && <span className="ff-optional"> (optional)</span>}
      </label>
      {children}
      {hint && !error && (
        <p className="ff-hint" id={`${id}-hint`}>
          {hint}
        </p>
      )}
      {error && (
        <p className="ff-error" id={`${id}-error`} role="alert">
          {error}
        </p>
      )}
    </div>
  )
}

function Section({ title, description, step, activeStep, children }) {
  return (
    <section
      id={`ff-step-${step}`}
      className="ff-card ff-step"
      data-step={step}
      data-mobile-active={activeStep === step}
    >
      <header className="ff-card-head">
        <h2 className="ff-card-title">{title}</h2>
        {description && <p className="ff-card-desc">{description}</p>}
      </header>
      <div className="ff-grid">{children}</div>
    </section>
  )
}

/* ------------------------------------------------------------------ */
/* Page                                                                */
/* ------------------------------------------------------------------ */

/**
 * The farmer details are validated in the browser, then passed to the farm setup route.
 */
function FarmerFormPage() {
  const navigate = useNavigate()
  const { submitFarmer } = useFormContext()
  const [values, setValues] = useState(EMPTY_VALUES)
  const [errors, setErrors] = useState({})
  const [touched, setTouched] = useState({})
  const [submitError, setSubmitError] = useState("")
  const [submitting, setSubmitting] = useState(false)
  const [photo, setPhoto] = useState(null)
  const [photoError, setPhotoError] = useState("")
  const [previewUrl, setPreviewUrl] = useState("")
  const [activeStep, setActiveStep] = useState(0)

  const formRef = useRef(null)
  const fileInputRef = useRef(null)
  const previewUrlRef = useRef("")

  // Release the current preview URL when the page closes.
  useEffect(() => {
    return () => {
      if (previewUrlRef.current) URL.revokeObjectURL(previewUrlRef.current)
    }
  }, [])

  // How many required fields are done (drives the progress bar)
  const completed = useMemo(
    () => REQUIRED_FIELDS.filter((name) => !validateField(name, values[name])).length,
    [values]
  )
  const progress = Math.round((completed / REQUIRED_FIELDS.length) * 100)

  const showError = (name) => (touched[name] ? errors[name] : "")

  function handleChange(event) {
    const { name, value } = event.target
    setValues((prev) => ({ ...prev, [name]: value }))
    if (touched[name]) {
      setErrors((prev) => ({ ...prev, [name]: validateField(name, value) }))
    }
  }

  function handleBlur(event) {
    const { name, value } = event.target
    setTouched((prev) => ({ ...prev, [name]: true }))
    setErrors((prev) => ({ ...prev, [name]: validateField(name, value) }))
  }

  async function handlePhotoChange(event) {
    const file = event.target.files?.[0]
    event.target.value = "" // lets the same file be picked again after removing it
    if (!file) return

    const problem = await checkPhoto(file)
    if (problem) {
      setPhotoError(problem)
      return
    }
    if (previewUrlRef.current) URL.revokeObjectURL(previewUrlRef.current)
    const url = URL.createObjectURL(file)
    previewUrlRef.current = url
    setPreviewUrl(url)
    setPhotoError("")
    setPhoto(file)
  }

  function removePhoto() {
    if (previewUrlRef.current) URL.revokeObjectURL(previewUrlRef.current)
    previewUrlRef.current = ""
    setPreviewUrl("")
    setPhoto(null)
    setPhotoError("")
  }

  function focusFirstError(step = activeStep) {
    requestAnimationFrame(() => {
      document.getElementById(`ff-step-${step}`)?.querySelector('[aria-invalid="true"]')?.focus()
    })
  }

  function getStepForField(name) {
    const step = MOBILE_STEPS.findIndex(({ fields }) => fields.includes(name))
    return step === -1 ? 0 : step
  }

  function handleNextStep() {
    const fields = MOBILE_STEPS[activeStep].fields
    const stepErrors = Object.fromEntries(
      fields
        .map((name) => [name, validateField(name, values[name])])
        .filter(([, message]) => message)
    )
    setErrors((prev) => ({ ...prev, ...Object.fromEntries(fields.map((name) => [name, stepErrors[name] || ""])) }))
    setTouched((prev) => ({ ...prev, ...Object.fromEntries(fields.map((name) => [name, true])) }))

    if (Object.keys(stepErrors).length > 0) {
      focusFirstError()
      return
    }

    const nextStep = activeStep + 1
    setActiveStep(nextStep)
    requestAnimationFrame(() => {
      document.getElementById(`ff-step-${nextStep}`)?.scrollIntoView({ behavior: "smooth", block: "start" })
    })
  }

  function handlePreviousStep() {
    const previousStep = activeStep - 1
    setActiveStep(previousStep)
    requestAnimationFrame(() => {
      document.getElementById(`ff-step-${previousStep}`)?.scrollIntoView({ behavior: "smooth", block: "start" })
    })
  }

  async function handleSubmit(event) {
    event.preventDefault()
    setSubmitError("")

    const nextErrors = validateAll(values)
    setErrors(nextErrors)
    setTouched(Object.fromEntries(Object.keys(EMPTY_VALUES).map((name) => [name, true])))

    if (Object.keys(nextErrors).length > 0 || photoError) {
      const firstInvalidField = Object.keys(nextErrors)[0]
      const errorStep = firstInvalidField ? getStepForField(firstInvalidField) : photoError ? 0 : activeStep
      setActiveStep(errorStep)
      focusFirstError(errorStep)
      return
    }

    const formData = new FormData()
    for (const [name, value] of Object.entries(values)) {
      if (value.trim()) formData.append(name, value.trim())
    }
    if (photo) formData.append("profile", photo)

    setSubmitting(true)
    try {
      await submitFarmer(formData)
      toast.success("Farmer profile saved.")
      navigate("/farm", { replace: true })
    } catch (error) {
      const serverFields = error.response?.data?.data
      if (serverFields && typeof serverFields === "object") {
        setErrors((previous) => ({ ...previous, ...serverFields }))
        setTouched((previous) => ({
          ...previous,
          ...Object.fromEntries(Object.keys(serverFields).map((name) => [name, true])),
        }))
      }
      setSubmitError(error.response?.data?.message || "Could not save your farmer profile. Please try again.")
    } finally {
      setSubmitting(false)
    }
  }

  /* ---------- Form ---------- */

  const describedBy = (id, name, hasHint) =>
    [showError(name) ? `${id}-error` : null, hasHint && !showError(name) ? `${id}-hint` : null]
      .filter(Boolean)
      .join(" ") || undefined

  return (
    <main className="ff-page">
      <div className="ff-shell">
        <header className="ff-hero">
          <h1 className="ff-title">Tell us about you as a farmer</h1>
          <p className="ff-subtitle">
            Buyers see your name, photo, region and bio. Your phone, email and Facebook link aren't shown to buyers.
          </p>

          <div className="ff-progress" role="group" aria-label="Form progress">
            <div className="ff-progress-row">
              <span>
                {completed} of {REQUIRED_FIELDS.length} required fields done
              </span>
              <span>{progress}%</span>
            </div>
            <div
              className="ff-progress-track"
              role="progressbar"
              aria-valuemin={0}
              aria-valuemax={100}
              aria-valuenow={progress}
            >
              <div className="ff-progress-fill" style={{ width: `${progress}%` }} />
            </div>
          </div>
        </header>

        <ol className="ff-mobile-stepper" aria-label="Profile form steps">
          {MOBILE_STEPS.map((step, index) => (
            <li
              key={step.title}
              className="ff-mobile-step"
              aria-current={activeStep === index ? "step" : undefined}
              data-complete={activeStep > index}
            >
              <span className="ff-mobile-step-number">{activeStep > index ? "✓" : index + 1}</span>
              <span>{step.title}</span>
            </li>
          ))}
        </ol>

        <form
          id="ff-form"
          ref={formRef}
          className="ff-form"
          data-current-step={activeStep}
          onSubmit={handleSubmit}
          noValidate
        >
          {/* ---------- Photo + name ---------- */}
          <Section title="About you" description="Use the name buyers will know you by." step={0} activeStep={activeStep}>
            <div className="ff-span-2 ff-photo-row">
              <div className="ff-photo-frame" data-filled={Boolean(previewUrl)}>
                {previewUrl ? (
                  <img className="ff-photo-img" src={previewUrl} alt="Your profile preview" />
                ) : (
                  <span className="ff-photo-empty" aria-hidden="true">
                    📷
                  </span>
                )}
              </div>

              <div className="ff-photo-actions">
                <p className="ff-label ff-photo-label">Profile photo (optional)</p>
                <p className="ff-hint">A clear face photo builds trust. JPEG, PNG or WebP, up to 2MB.</p>
                <div className="ff-photo-buttons">
                  <button type="button" className="ff-btn ff-btn-soft" onClick={() => fileInputRef.current?.click()}>
                    {photo ? "Change photo" : "Take or upload a photo"}
                  </button>
                  {photo && (
                    <button type="button" className="ff-btn ff-btn-link" onClick={removePhoto}>
                      Remove
                    </button>
                  )}
                </div>
                <input
                  ref={fileInputRef}
                  className="ff-file"
                  type="file"
                  accept="image/jpeg,image/png,image/webp"
                  onChange={handlePhotoChange}
                  tabIndex={-1}
                  aria-hidden="true"
                />
                {photoError && (
                  <p className="ff-error" role="alert">
                    {photoError}
                  </p>
                )}
              </div>
            </div>

            <Field id="firstName" label="First name" error={showError("firstName")}>
              <input
                id="firstName"
                name="firstName"
                className="ff-input"
                type="text"
                autoComplete="given-name"
                maxLength={30}
                value={values.firstName}
                onChange={handleChange}
                onBlur={handleBlur}
                aria-invalid={Boolean(showError("firstName"))}
                aria-describedby={describedBy("firstName", "firstName")}
              />
            </Field>

            <Field id="middleName" label="Middle name" error={showError("middleName")}>
              <input
                id="middleName"
                name="middleName"
                className="ff-input"
                type="text"
                autoComplete="additional-name"
                maxLength={30}
                value={values.middleName}
                onChange={handleChange}
                onBlur={handleBlur}
                aria-invalid={Boolean(showError("middleName"))}
                aria-describedby={describedBy("middleName", "middleName")}
              />
            </Field>

            <Field id="lastName" label="Last name" error={showError("lastName")}>
              <input
                id="lastName"
                name="lastName"
                className="ff-input"
                type="text"
                autoComplete="family-name"
                maxLength={30}
                value={values.lastName}
                onChange={handleChange}
                onBlur={handleBlur}
                aria-invalid={Boolean(showError("lastName"))}
                aria-describedby={describedBy("lastName", "lastName")}
              />
            </Field>

            <Field id="suffix" label="Suffix" optional error={showError("suffix")}>
              <select
                id="suffix"
                name="suffix"
                className="ff-input ff-select"
                value={values.suffix}
                onChange={handleChange}
                onBlur={handleBlur}
              >
                <option value="">None</option>
                {SUFFIXES.map((s) => (
                  <option key={s} value={s}>
                    {s}
                  </option>
                ))}
              </select>
            </Field>

            <Field id="age" label="Age" error={showError("age")} hint="You must be 18 or older.">
              <input
                id="age"
                name="age"
                className="ff-input"
                type="number"
                inputMode="numeric"
                min={18}
                max={99}
                value={values.age}
                onChange={handleChange}
                onBlur={handleBlur}
                aria-invalid={Boolean(showError("age"))}
                aria-describedby={describedBy("age", "age", true)}
              />
            </Field>

            <Field id="region" label="Region where you farm" error={showError("region")}>
              <select
                id="region"
                name="region"
                className="ff-input ff-select"
                value={values.region}
                onChange={handleChange}
                onBlur={handleBlur}
                aria-invalid={Boolean(showError("region"))}
                aria-describedby={describedBy("region", "region")}
              >
                <option value="">Choose a region</option>
                {REGIONS.map((r) => (
                  <option key={r.id} value={r.id}>
                    {r.label}
                  </option>
                ))}
              </select>
            </Field>
          </Section>

          {/* ---------- Bio ---------- */}
          <Section title="Your story" description="A short intro buyers read on your profile." step={1} activeStep={activeStep}>
            <div className="ff-span-2">
              <Field id="bio" label="About me" optional error={showError("bio")}>
                <textarea
                  id="bio"
                  name="bio"
                  className="ff-input ff-textarea"
                  rows={4}
                  maxLength={BIO_MAX}
                  placeholder="e.g. Third-generation vegetable grower in Bulacan. I farm without synthetic pesticides."
                  value={values.bio}
                  onChange={handleChange}
                  onBlur={handleBlur}
                  aria-invalid={Boolean(showError("bio"))}
                  aria-describedby={describedBy("bio", "bio")}
                />
              </Field>
              <p className="ff-counter" data-near={values.bio.length > BIO_MAX - 20}>
                {values.bio.length} / {BIO_MAX}
              </p>
            </div>
          </Section>

          {/* ---------- Contact ---------- */}
          <Section
            title="How we can reach you"
            description="All optional. Only our team uses these, and they aren't shown to buyers."
            step={2}
            activeStep={activeStep}
          >
            <Field
              id="mobileNumber"
              label="Mobile number"
              optional
              error={showError("mobileNumber")}
              hint="Like 09171234567 or +639171234567."
            >
              <input
                id="mobileNumber"
                name="mobileNumber"
                className="ff-input"
                type="tel"
                inputMode="tel"
                autoComplete="tel"
                maxLength={16}
                value={values.mobileNumber}
                onChange={handleChange}
                onBlur={handleBlur}
                aria-invalid={Boolean(showError("mobileNumber"))}
                aria-describedby={describedBy("mobileNumber", "mobileNumber", true)}
              />
            </Field>

            <Field id="email" label="Email" optional error={showError("email")}>
              <input
                id="email"
                name="email"
                className="ff-input"
                type="email"
                autoComplete="email"
                maxLength={100}
                value={values.email}
                onChange={handleChange}
                onBlur={handleBlur}
                aria-invalid={Boolean(showError("email"))}
                aria-describedby={describedBy("email", "email")}
              />
            </Field>

            <div className="ff-span-2">
              <Field
                id="facebook"
                label="Facebook page or profile"
                optional
                error={showError("facebook")}
                hint="Paste the full link, starting with https://"
              >
                <input
                  id="facebook"
                  name="facebook"
                  className="ff-input"
                  type="url"
                  inputMode="url"
                  maxLength={200}
                  placeholder="https://facebook.com/your.farm"
                  value={values.facebook}
                  onChange={handleChange}
                  onBlur={handleBlur}
                  aria-invalid={Boolean(showError("facebook"))}
                  aria-describedby={describedBy("facebook", "facebook", true)}
                />
              </Field>
            </div>
          </Section>

          <div className="ff-mobile-controls">
            {activeStep > 0 && (
              <button type="button" className="ff-btn ff-btn-ghost" onClick={handlePreviousStep}>
                Back
              </button>
            )}
            {activeStep < MOBILE_STEPS.length - 1 && (
              <button type="button" className="ff-btn ff-btn-primary" onClick={handleNextStep}>
                Next
              </button>
            )}
          </div>

          {submitError && <p className="ff-banner" role="alert">{submitError}</p>}
          <div className="ff-actions">
            <p className="ff-fineprint">You can submit your profile after adding your farm details.</p>
            <button type="submit" className="ff-btn ff-btn-primary" disabled={submitting}>
              {submitting ? "Saving..." : "Proceed to farm"}
            </button>
          </div>
        </form>
      </div>
    </main>
  )
}

export default FarmerFormPage
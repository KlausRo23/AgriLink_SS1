import { useEffect, useMemo, useRef, useState } from "react"
import { useNavigate } from "react-router-dom"
import toast from "react-hot-toast"
import { CROP_SPECIALTIES } from "../data/cropSpecialties"
import { DELIVERY_MODES } from "../data/deliveryModes"
import { useFormContext } from "../context/useFormContext"
import "../styles/Farmerformpage.css"

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

const REQUIRED_FIELDS = ["farmName", "location", "deliveryMode", "deliverableRegions", "description"]
const STEPS = [
  { title: "About your farm", fields: ["farmName", "location"] },
  { title: "Your story", fields: ["description", "startedFarming", "specialty"] },
  { title: "Delivery", fields: ["deliveryMode", "deliverableRegions"] },
]
const EMPTY_VALUES = {
  farmName: "",
  location: "",
  deliveryMode: [],
  deliverableRegions: [],
  startedFarming: "",
  specialty: [],
  description: "",
}
const FARM_NAME_REGEX = /^[\p{L}\p{N}][\p{L}\p{N}\s.,'&-]*$/u

function validateField(name, value) {
  switch (name) {
    case "farmName":
      if (value.trim().length < 2 || value.trim().length > 30 || !FARM_NAME_REGEX.test(value.trim())) {
        return "Use 2 to 30 letters, numbers, spaces, or . , ' & -."
      }
      return ""
    case "location":
      return value.trim().length < 5 || value.trim().length > 200
        ? "Location must be 5 to 200 characters."
        : ""
    case "deliveryMode":
      return value.length > 0 ? "" : "Choose at least one delivery method."
    case "deliverableRegions":
      return value.length > 0 ? "" : "Choose at least one delivery region."
    case "startedFarming": {
      if (!value) return ""
      const year = Number(value)
      return !/^\d{4}$/.test(value) || year < 1900 || year > new Date().getFullYear()
        ? `Enter a year from 1900 to ${new Date().getFullYear()}.`
        : ""
    }
    case "description":
      if (!value.trim()) return "Tell buyers a little about your farm."
      return value.trim().length > 200 ? "Keep it to 200 characters or less." : ""
    default:
      return ""
  }
}

function Field({ id, label, optional, hint, error, children }) {
  return (
    <div className="ff-field">
      <label id={`${id}-label`} className="ff-label" htmlFor={id}>
        {label}
        {optional && <span className="ff-optional"> (optional)</span>}
      </label>
      {children}
      {hint && !error && <p className="ff-hint" id={`${id}-hint`}>{hint}</p>}
      {error && <p className="ff-error" id={`${id}-error`} role="alert">{error}</p>}
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
        <p className="ff-card-desc">{description}</p>
      </header>
      <div className="ff-grid">{children}</div>
    </section>
  )
}

function FarmFormPage() {
  const navigate = useNavigate()
  const { submitFarm } = useFormContext()
  const [values, setValues] = useState(EMPTY_VALUES)
  const [errors, setErrors] = useState({})
  const [touched, setTouched] = useState({})
  const [photo, setPhoto] = useState(null)
  const [photoError, setPhotoError] = useState("")
  const [photoPreview, setPhotoPreview] = useState("")
  const [activeStep, setActiveStep] = useState(0)
  const [submitError, setSubmitError] = useState("")
  const [submitting, setSubmitting] = useState(false)
  const formRef = useRef(null)
  const fileInputRef = useRef(null)

  useEffect(() => {
    return () => {
      if (photoPreview) URL.revokeObjectURL(photoPreview)
    }
  }, [photoPreview])

  const completed = useMemo(
    () => REQUIRED_FIELDS.filter((name) => !validateField(name, values[name])).length,
    [values]
  )
  const progress = Math.round((completed / REQUIRED_FIELDS.length) * 100)
  const showError = (name) => (touched[name] ? errors[name] : "")

  function handleChange(event) {
    const { name, value } = event.target
    setValues((prev) => ({ ...prev, [name]: value }))
    if (touched[name]) setErrors((prev) => ({ ...prev, [name]: validateField(name, value) }))
  }

  function handleBlur(event) {
    const { name, value } = event.target
    setTouched((prev) => ({ ...prev, [name]: true }))
    setErrors((prev) => ({ ...prev, [name]: validateField(name, value) }))
  }

  function handleRegionsChange(event) {
    const { checked, value } = event.target
    const regions = checked
      ? [...values.deliverableRegions, value]
      : values.deliverableRegions.filter((region) => region !== value)
    setValues((prev) => ({ ...prev, deliverableRegions: regions }))
    if (touched.deliverableRegions) {
      setErrors((prev) => ({ ...prev, deliverableRegions: validateField("deliverableRegions", regions) }))
    }
  }

  function handleDeliveryModeChange(event) {
    const { checked, value } = event.target
    const deliveryModes = checked
      ? [...values.deliveryMode, value]
      : values.deliveryMode.filter((mode) => mode !== value)
    setValues((prev) => ({ ...prev, deliveryMode: deliveryModes }))
    if (touched.deliveryMode) {
      setErrors((prev) => ({ ...prev, deliveryMode: validateField("deliveryMode", deliveryModes) }))
    }
  }

  function handleSpecialtyChange(event) {
    const { checked, value } = event.target
    setValues((prev) => ({
      ...prev,
      specialty: checked
        ? [...prev.specialty, value]
        : prev.specialty.filter((crop) => crop !== value),
    }))
  }

  function handlePhotoChange(event) {
    const file = event.target.files?.[0]
    event.target.value = ""
    if (!file) return
    if (!["image/jpeg", "image/png", "image/webp"].includes(file.type)) {
      setPhotoError("Use a JPEG, PNG or WebP image.")
      return
    }
    if (file.size > 3 * 1024 * 1024) {
      setPhotoError("The photo must be 3MB or smaller.")
      return
    }
    if (photoPreview) URL.revokeObjectURL(photoPreview)
    setPhotoPreview(URL.createObjectURL(file))
    setPhotoError("")
    setPhoto(file)
  }

  function removePhoto() {
    if (photoPreview) URL.revokeObjectURL(photoPreview)
    setPhotoPreview("")
    setPhoto(null)
    setPhotoError("")
  }

  function focusFirstError(step = activeStep) {
    requestAnimationFrame(() => {
      document.getElementById(`ff-step-${step}`)?.querySelector('[aria-invalid="true"]')?.focus()
    })
  }

  function stepForField(name) {
    const step = STEPS.findIndex(({ fields }) => fields.includes(name))
    return step < 0 ? 0 : step
  }

  function goToStep(step) {
    setActiveStep(step)
    requestAnimationFrame(() => {
      document.getElementById(`ff-step-${step}`)?.scrollIntoView({ behavior: "smooth", block: "start" })
    })
  }

  function handleNext() {
    const fields = STEPS[activeStep].fields
    const stepErrors = Object.fromEntries(
      fields
        .map((name) => [name, validateField(name, values[name])])
        .filter(([, message]) => message)
    )
    setErrors((prev) => ({
      ...prev,
      ...Object.fromEntries(fields.map((name) => [name, stepErrors[name] || ""])),
    }))
    setTouched((prev) => ({ ...prev, ...Object.fromEntries(fields.map((name) => [name, true])) }))
    if (Object.keys(stepErrors).length) {
      focusFirstError()
      return
    }
    goToStep(activeStep + 1)
  }

  function buildFormData() {
    const formData = new FormData()
    for (const [name, value] of Object.entries(values)) {
      if (name === "deliveryMode") {
        value.forEach((mode) => formData.append(name, mode))
      } else if (name === "deliverableRegions") {
        value.forEach((region) => formData.append(name, region))
      } else if (name === "specialty") {
        value.forEach((crop) => formData.append(name, crop))
      } else if (value.trim()) {
        formData.append(name, value.trim())
      }
    }
    if (photo) formData.append("farmPhoto", photo)
    return formData
  }

  async function handleSubmit(event) {
    event.preventDefault()
    setSubmitError("")
    const nextErrors = Object.fromEntries(
      Object.entries(values)
        .map(([name, value]) => [name, validateField(name, value)])
        .filter(([, message]) => message)
    )
    setErrors(nextErrors)
    setTouched(Object.fromEntries(Object.keys(values).map((name) => [name, true])))

    if (Object.keys(nextErrors).length || photoError) {
      const errorStep = Object.keys(nextErrors).length ? stepForField(Object.keys(nextErrors)[0]) : photoError ? 0 : activeStep
      setActiveStep(errorStep)
      focusFirstError(errorStep)
      return
    }

    setSubmitting(true)
    try {
      await submitFarm(buildFormData())
      toast.success("Farm profile saved.")
      navigate("/verification", { replace: true })
    } catch (error) {
      const serverFields = error?.response?.data?.data
      if (serverFields && typeof serverFields === "object") {
        setErrors((prev) => ({ ...prev, ...serverFields }))
        setTouched((prev) => ({ ...prev, ...Object.fromEntries(Object.keys(serverFields).map((name) => [name, true])) }))
        const errorStep = stepForField(Object.keys(serverFields)[0])
        setActiveStep(errorStep)
        focusFirstError(errorStep)
      }
      setSubmitError(error?.response?.data?.message || error?.message || "Something went wrong. Please try again.")
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <main className="ff-page">
      <div className="ff-shell">
        <header className="ff-hero">
          <h1 className="ff-title">Set up your farm</h1>
          <p className="ff-subtitle">Tell buyers about your farm, what you grow, and where you can deliver.</p>
          <div className="ff-progress" role="group" aria-label="Form progress">
            <div className="ff-progress-row">
              <span>{completed} of {REQUIRED_FIELDS.length} required fields done</span>
              <span>{progress}%</span>
            </div>
            <div className="ff-progress-track" role="progressbar" aria-valuemin={0} aria-valuemax={100} aria-valuenow={progress}>
              <div className="ff-progress-fill" style={{ width: `${progress}%` }} />
            </div>
          </div>
        </header>

        <ol className="ff-mobile-stepper" aria-label="Farm form steps">
          {STEPS.map((step, index) => (
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
          <Section title="About your farm" description="Give your farm a name and tell buyers where it is." step={0} activeStep={activeStep}>
            <div className="ff-span-2">
              <Field id="farmPhoto" label="Farm photo" optional hint="JPEG, PNG or WebP, up to 3MB." error={photoError}>
                <input
                  ref={fileInputRef}
                  id="farmPhoto"
                  className="ff-file"
                  type="file"
                  accept="image/jpeg,image/png,image/webp"
                  onChange={handlePhotoChange}
                  tabIndex={-1}
                  aria-hidden="true"
                />
                <div className="ff-farm-photo" data-filled={Boolean(photoPreview)}>
                  {photoPreview ? (
                    <img className="ff-farm-photo-preview" src={photoPreview} alt="Selected farm preview" />
                  ) : (
                    <div className="ff-farm-photo-empty" aria-hidden="true">
                      <svg viewBox="0 0 48 48" fill="none">
                        <path d="M8 14.5A3.5 3.5 0 0 1 11.5 11h7l3-3h5l3 3h7a3.5 3.5 0 0 1 3.5 3.5v22a3.5 3.5 0 0 1-3.5 3.5h-25A3.5 3.5 0 0 1 8 36.5v-22Z" />
                        <circle cx="24" cy="24" r="8" />
                        <path d="M24 19v10m-5-5h10" />
                      </svg>
                      <span>Add a photo of your farm</span>
                    </div>
                  )}
                  <div className="ff-farm-photo-actions">
                    <button
                      type="button"
                      className="ff-btn ff-btn-soft"
                      onClick={() => fileInputRef.current?.click()}
                      aria-invalid={Boolean(photoError)}
                      aria-describedby={photoError ? "farmPhoto-error" : "farmPhoto-hint"}
                    >
                      {photo ? "Change photo" : "Choose photo"}
                    </button>
                    {photo && (
                      <button type="button" className="ff-btn ff-btn-link" onClick={removePhoto}>
                        Remove
                      </button>
                    )}
                  </div>
                </div>
              </Field>
            </div>
            <Field id="farmName" label="Farm name" error={showError("farmName")}>
              <input
                id="farmName"
                name="farmName"
                className="ff-input"
                type="text"
                maxLength={30}
                value={values.farmName}
                onChange={handleChange}
                onBlur={handleBlur}
                aria-invalid={Boolean(showError("farmName"))}
              />
            </Field>
            <Field id="location" label="Farm location" hint="Include a municipality or town." error={showError("location")}>
              <input
                id="location"
                name="location"
                className="ff-input"
                type="text"
                maxLength={200}
                value={values.location}
                onChange={handleChange}
                onBlur={handleBlur}
                aria-invalid={Boolean(showError("location"))}
              />
            </Field>
          </Section>

          <Section title="Your story" description="Share a little about what makes your farm special." step={1} activeStep={activeStep}>
            <div className="ff-span-2">
              <Field id="description" label="About this farm" error={showError("description")}>
                <textarea
                  id="description"
                  name="description"
                  className="ff-input ff-textarea"
                  rows={4}
                  maxLength={200}
                  value={values.description}
                  onChange={handleChange}
                  onBlur={handleBlur}
                  aria-invalid={Boolean(showError("description"))}
                />
              </Field>
              <p className="ff-counter" data-near={values.description.length > 180}>
                {values.description.length} / 200
              </p>
            </div>
            <div className="ff-span-2">
              <Field id="startedFarming" label="Year you started farming" optional hint="Enter the year only." error={showError("startedFarming")}>
                <input
                  id="startedFarming"
                  name="startedFarming"
                  className="ff-input ff-year-input"
                  type="number"
                  inputMode="numeric"
                  min={1900}
                  max={new Date().getFullYear()}
                  placeholder="e.g. 2015"
                  value={values.startedFarming}
                  onChange={handleChange}
                  onBlur={handleBlur}
                  aria-invalid={Boolean(showError("startedFarming"))}
                />
              </Field>
            </div>
            <div className="ff-span-2">
              <Field id="specialty" label="Crops and specialties" optional hint="Select all that apply.">
                <div id="specialty" className="ff-specialty-options" role="group" aria-labelledby="specialty-label">
                  {CROP_SPECIALTIES.map((crop) => {
                    const selected = values.specialty.includes(crop)
                    return (
                      <label className="ff-specialty-option" data-selected={selected} key={crop}>
                        <input
                          className="ff-specialty-checkbox"
                          type="checkbox"
                          name="specialty"
                          value={crop}
                          checked={selected}
                          onChange={handleSpecialtyChange}
                        />
                        <span>{crop}</span>
                        {selected && <span className="ff-specialty-check" aria-hidden="true">✓</span>}
                      </label>
                    )
                  })}
                </div>
              </Field>
            </div>
          </Section>

          <Section title="Delivery" description="Choose how you deliver and which regions you can serve." step={2} activeStep={activeStep}>
            <Field id="deliveryMode" label="Delivery methods" hint="Select all ways you can deliver." error={showError("deliveryMode")}>
              <div
                id="deliveryMode"
                className="ff-region-list"
                role="group"
                aria-labelledby="deliveryMode-label"
                aria-invalid={Boolean(showError("deliveryMode"))}
              >
                {DELIVERY_MODES.map((mode) => (
                  <label className="ff-region-option" key={mode.value}>
                    <input
                      type="checkbox"
                      name="deliveryMode"
                      value={mode.value}
                      checked={values.deliveryMode.includes(mode.value)}
                      onChange={handleDeliveryModeChange}
                      aria-invalid={Boolean(showError("deliveryMode"))}
                      aria-describedby={showError("deliveryMode") ? "deliveryMode-error" : "deliveryMode-hint"}
                    />
                    <span>{mode.label}</span>
                  </label>
                ))}
              </div>
            </Field>
            <div className="ff-span-2">
              <Field id="deliverableRegions" label="Delivery regions" hint="Select all regions you can deliver to." error={showError("deliverableRegions")}>
                <div
                  id="deliverableRegions"
                  className="ff-region-list"
                  role="group"
                  aria-labelledby="deliverableRegions-label"
                >
                  {REGIONS.map((region) => (
                    <label className="ff-region-option" key={region.id}>
                      <input
                        type="checkbox"
                        name="deliverableRegions"
                        value={region.id}
                        checked={values.deliverableRegions.includes(region.id)}
                        onChange={handleRegionsChange}
                        aria-invalid={Boolean(showError("deliverableRegions"))}
                        aria-describedby={showError("deliverableRegions") ? "deliverableRegions-error" : "deliverableRegions-hint"}
                      />
                      <span>{region.label}</span>
                    </label>
                  ))}
                </div>
              </Field>
            </div>
          </Section>

          <div className="ff-mobile-controls">
            {activeStep > 0 && (
              <button type="button" className="ff-btn ff-btn-ghost" onClick={() => goToStep(activeStep - 1)}>
                Back
              </button>
            )}
            {activeStep < STEPS.length - 1 && (
              <button type="button" className="ff-btn ff-btn-primary" onClick={handleNext}>
                Next
              </button>
            )}
          </div>

          {submitError && <p className="ff-banner" role="alert">{submitError}</p>}
          <div className="ff-actions">
            <p className="ff-fineprint">Your farm remains hidden from buyers until it is verified.</p>
            <button type="submit" className="ff-btn ff-btn-primary" disabled={submitting}>
              {submitting ? "Sending..." : "Send for verification"}
            </button>
          </div>
        </form>
      </div>
    </main>
  )
}

export default FarmFormPage

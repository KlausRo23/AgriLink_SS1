import { useEffect, useRef, useState } from "react"
import { useNavigate } from "react-router-dom"
import toast from "react-hot-toast"
import { useFormContext } from "../context/useFormContext"
import "../styles/Farmerformpage.css"

const SUFFIXES = ["Jr", "Sr", "I", "II", "III"]
const NAME_REGEX = /^[\p{L}][\p{L}\s.'-]*$/u
const PHOTO_TYPES = ["image/jpeg", "image/png", "image/webp"]
const DOCUMENT_TYPES = [...PHOTO_TYPES, "application/pdf"]
const MAX_FILE_SIZE = 5 * 1024 * 1024
const EMPTY_VALUES = {
  firstName: "",
  middleName: "",
  lastName: "",
  suffix: "",
  age: "",
  rsbsaRegistration: "",
}
const REQUIRED_FIELDS = [...Object.keys(EMPTY_VALUES), "facePhoto", "supportingDocuments"]

function validateField(name, rawValue) {
  const value = typeof rawValue === "string" ? rawValue.trim() : rawValue

  switch (name) {
    case "firstName":
    case "middleName":
    case "lastName": {
      const label = { firstName: "First name", middleName: "Middle name", lastName: "Last name" }[name]
      if (value.length < 2 || value.length > 30 || !NAME_REGEX.test(value)) {
        return `${label} must be 2 to 30 characters and contain only letters, spaces, . ' or -.`
      }
      return ""
    }
    case "age": {
      const age = Number(value)
      return !value || !Number.isInteger(age) || age < 18 || age > 99
        ? "Age must be a whole number from 18 to 99."
        : ""
    }
    case "rsbsaRegistration":
      return !value ? "Enter your RSBSA registration number." : value.length > 50 ? "Keep the number to 50 characters or less." : ""
    default:
      return ""
  }
}

function Field({ id, label, error, children }) {
  return (
    <div className="ff-field">
      <label className="ff-label" htmlFor={id}>{label}</label>
      {children}
      {error && <p className="ff-error" id={`${id}-error`} role="alert">{error}</p>}
    </div>
  )
}

function validateFile(file, allowedTypes, label) {
  if (!file) return `${label} is required.`
  if (!allowedTypes.includes(file.type)) return `Use a JPEG, PNG, WebP${allowedTypes.includes("application/pdf") ? " or PDF" : ""} file.`
  if (file.size > MAX_FILE_SIZE) return "File must be 5MB or smaller."
  return ""
}

function VerificationFormPage() {
  const navigate = useNavigate()
  const { submitVerification } = useFormContext()
  const [values, setValues] = useState(EMPTY_VALUES)
  const [errors, setErrors] = useState({})
  const [touched, setTouched] = useState({})
  const [supportingDocument, setSupportingDocument] = useState(null)
  const [facePhoto, setFacePhoto] = useState(null)
  const [facePhotoPreview, setFacePhotoPreview] = useState("")
  const [submitError, setSubmitError] = useState("")
  const [submitting, setSubmitting] = useState(false)
  const facePhotoInput = useRef(null)
  const supportingDocumentInput = useRef(null)

  const facePhotoPreviewRef = useRef("")
  const showError = (name) => touched[name] ? errors[name] : ""

  useEffect(() => () => {
    if (facePhotoPreviewRef.current) URL.revokeObjectURL(facePhotoPreviewRef.current)
  }, [])

  function handleChange(event) {
    const { name, value } = event.target
    setValues((previous) => ({ ...previous, [name]: value }))
    if (touched[name]) setErrors((previous) => ({ ...previous, [name]: validateField(name, value) }))
  }

  function handleBlur(event) {
    const { name, value } = event.target
    setTouched((previous) => ({ ...previous, [name]: true }))
    setErrors((previous) => ({ ...previous, [name]: validateField(name, value) }))
  }

  function handleFacePhotoChange(event) {
    const file = event.target.files?.[0]
    event.target.value = ""
    if (!file) return
    const error = validateFile(file, PHOTO_TYPES, "Face photo")
    setErrors((previous) => ({ ...previous, facePhoto: error }))
    setTouched((previous) => ({ ...previous, facePhoto: true }))
    if (error) return
    if (facePhotoPreview) URL.revokeObjectURL(facePhotoPreview)
    const preview = URL.createObjectURL(file)
    facePhotoPreviewRef.current = preview
    setFacePhoto(file)
    setFacePhotoPreview(preview)
  }

  function handleDocumentChange(event) {
    const file = event.target.files?.[0]
    event.target.value = ""
    if (!file) return
    const error = validateFile(file, DOCUMENT_TYPES, "Supporting document")
    setErrors((previous) => ({ ...previous, supportingDocuments: error }))
    setTouched((previous) => ({ ...previous, supportingDocuments: true }))
    if (error) return
    setSupportingDocument(file)
  }

  function removeFacePhoto() {
    if (facePhotoPreview) URL.revokeObjectURL(facePhotoPreview)
    facePhotoPreviewRef.current = ""
    setFacePhoto(null)
    setFacePhotoPreview("")
    setErrors((previous) => ({ ...previous, facePhoto: "Face photo is required." }))
    setTouched((previous) => ({ ...previous, facePhoto: true }))
  }

  async function handleSubmit(event) {
    event.preventDefault()
    setSubmitError("")

    const nextErrors = Object.fromEntries(
      Object.entries(values)
        .map(([name, value]) => [name, validateField(name, value)])
        .filter(([, error]) => error)
    )
    const facePhotoError = validateFile(facePhoto, PHOTO_TYPES, "Face photo")
    const documentError = validateFile(supportingDocument, DOCUMENT_TYPES, "Supporting document")
    if (facePhotoError) nextErrors.facePhoto = facePhotoError
    if (documentError) nextErrors.supportingDocuments = documentError
    setErrors(nextErrors)
    setTouched(Object.fromEntries(REQUIRED_FIELDS.map((name) => [name, true])))

    if (Object.keys(nextErrors).length) {
      requestAnimationFrame(() => {
        document.querySelector('[aria-invalid="true"]')?.focus()
      })
      return
    }

    const formData = new FormData()
    for (const [name, value] of Object.entries(values)) {
      if (name !== "age" && value.trim()) formData.append(name, value.trim())
    }
    formData.set("Age", String(Number(values.age)))
    formData.append("supportingDocuments", supportingDocument)
    formData.append("facePhoto", facePhoto)

    setSubmitting(true)
    try {
      await submitVerification(formData)
      toast.success("Farm verification submitted.")
      navigate("/dashboard", { replace: true })
    } catch (error) {
      const serverFields = error?.response?.data?.data
      if (serverFields && typeof serverFields === "object") {
        const normalizedFields = Object.fromEntries(
          Object.entries(serverFields).map(([name, message]) => [name === "Age" ? "age" : name, message])
        )
        setErrors((previous) => ({ ...previous, ...normalizedFields }))
        setTouched((previous) => ({
          ...previous,
          ...Object.fromEntries(Object.keys(normalizedFields).map((name) => [name, true])),
        }))
      }
      setSubmitError(error?.response?.data?.message || error?.message || "Could not submit verification. Please try again.")
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <main className="ff-page">
      <div className="ff-shell">
        <header className="ff-hero">
          <h1 className="ff-title">Verify your farmer profile</h1>
          <p className="ff-subtitle">
            Provide your identity details and documents so our team can verify your farmer profile.
          </p>
        </header>

        <form className="ff-form" onSubmit={handleSubmit} noValidate>
          <section className="ff-card">
            <header className="ff-card-head">
              <h2 className="ff-card-title">Personal details</h2>
              <p className="ff-card-desc">Enter your details as they appear on your registration documents.</p>
            </header>
            <div className="ff-grid">
              {[
                ["firstName", "First name", "given-name"],
                ["middleName", "Middle name", "additional-name"],
                ["lastName", "Last name", "family-name"],
              ].map(([name, label, autoComplete]) => (
                <Field key={name} id={name} label={label} error={showError(name)}>
                  <input
                    id={name}
                    name={name}
                    className="ff-input"
                    type="text"
                    autoComplete={autoComplete}
                    maxLength={30}
                    value={values[name]}
                    onChange={handleChange}
                    onBlur={handleBlur}
                    aria-invalid={Boolean(showError(name))}
                    aria-describedby={showError(name) ? `${name}-error` : undefined}
                  />
                </Field>
              ))}
              <Field id="suffix" label="Suffix (optional)">
                <select id="suffix" name="suffix" className="ff-input ff-select" value={values.suffix} onChange={handleChange}>
                  <option value="">None</option>
                  {SUFFIXES.map((suffix) => <option key={suffix} value={suffix}>{suffix}</option>)}
                </select>
              </Field>
              <Field id="age" label="Age" error={showError("age")}>
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
                  aria-describedby={showError("age") ? "age-error" : undefined}
                />
              </Field>
              <Field id="rsbsaRegistration" label="RSBSA registration number" error={showError("rsbsaRegistration")}>
                <input
                  id="rsbsaRegistration"
                  name="rsbsaRegistration"
                  className="ff-input"
                  type="text"
                  autoComplete="off"
                  maxLength={50}
                  value={values.rsbsaRegistration}
                  onChange={handleChange}
                  onBlur={handleBlur}
                  aria-invalid={Boolean(showError("rsbsaRegistration"))}
                  aria-describedby={showError("rsbsaRegistration") ? "rsbsaRegistration-error" : undefined}
                />
              </Field>
            </div>
          </section>

          <section className="ff-card">
            <header className="ff-card-head">
              <h2 className="ff-card-title">Verification documents</h2>
              <p className="ff-card-desc">Upload clear, readable files. JPEG, PNG, WebP or PDF, up to 5MB.</p>
            </header>
            <div className="ff-grid">
              <div className="ff-span-2">
                <Field id="supportingDocuments" label="Supporting document" error={showError("supportingDocuments")}>
                  <input
                    ref={supportingDocumentInput}
                    id="supportingDocuments"
                    className="ff-file"
                    type="file"
                    accept="image/jpeg,image/png,image/webp,application/pdf"
                    onChange={handleDocumentChange}
                    tabIndex={-1}
                    aria-hidden="true"
                  />
                  <div className="vf-upload-card" data-invalid={Boolean(showError("supportingDocuments"))}>
                    <div className="vf-upload-icon" aria-hidden="true">▤</div>
                    <div className="vf-upload-copy">
                      <strong>{supportingDocument?.name || "Upload your RSBSA certificate or supporting document"}</strong>
                      <span>{supportingDocument ? `${(supportingDocument.size / 1024 / 1024).toFixed(2)} MB` : "Choose a photo or PDF file"}</span>
                    </div>
                    <button
                      type="button"
                      className="ff-btn ff-btn-soft"
                      onClick={() => supportingDocumentInput.current?.click()}
                      aria-invalid={Boolean(showError("supportingDocuments"))}
                      aria-describedby={showError("supportingDocuments") ? "supportingDocuments-error" : undefined}
                    >
                      Browse
                    </button>
                  </div>
                </Field>
              </div>
              <div className="ff-span-2">
                <Field id="facePhoto" label="Face photo" error={showError("facePhoto")}>
                  <input
                    ref={facePhotoInput}
                    id="facePhoto"
                    className="ff-file"
                    type="file"
                    accept="image/jpeg,image/png,image/webp"
                    onChange={handleFacePhotoChange}
                    tabIndex={-1}
                    aria-hidden="true"
                  />
                  <div className="vf-face-upload" data-filled={Boolean(facePhotoPreview)} data-invalid={Boolean(showError("facePhoto"))}>
                    {facePhotoPreview ? (
                      <img src={facePhotoPreview} alt="Face photo preview" />
                    ) : (
                      <div className="vf-face-placeholder" aria-hidden="true">
                        <span>+</span>
                        <span>Add a clear face photo</span>
                      </div>
                    )}
                    <div className="ff-photo-actions">
                      <button
                        type="button"
                        className="ff-btn ff-btn-soft"
                        onClick={() => facePhotoInput.current?.click()}
                        aria-invalid={Boolean(showError("facePhoto"))}
                        aria-describedby={showError("facePhoto") ? "facePhoto-error" : undefined}
                      >
                        {facePhoto ? "Change photo" : "Choose photo"}
                      </button>
                      {facePhoto && (
                        <button type="button" className="ff-btn ff-btn-link" onClick={removeFacePhoto}>
                          Remove
                        </button>
                      )}
                    </div>
                  </div>
                </Field>
              </div>
            </div>
          </section>

          {submitError && <p className="ff-banner" role="alert">{submitError}</p>}
          <div className="ff-actions">
            <p className="ff-fineprint">Your documents are used only to review your farmer profile.</p>
            <button type="submit" className="ff-btn ff-btn-primary" disabled={submitting}>
              {submitting ? "Submitting..." : "Submit for verification"}
            </button>
          </div>
        </form>
      </div>
    </main>
  )
}

export default VerificationFormPage

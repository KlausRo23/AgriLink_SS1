import { useEffect } from "react"
import { LogOut } from "lucide-react"

function LogoutModal({ onCancel, onConfirm, loading, error }) {
  useEffect(() => {
    function handleKeyDown(event) {
      if (event.key === "Escape" && !loading) onCancel()
    }
    document.addEventListener("keydown", handleKeyDown)
    return () => document.removeEventListener("keydown", handleKeyDown)
  }, [loading, onCancel])

  return (
    <div
      className="settings-logout-backdrop"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget && !loading) onCancel()
      }}
      role="presentation"
    >
      <section
        className="settings-logout-modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="logout-modal-title"
        aria-describedby="logout-modal-description"
      >
        <span className="settings-logout-modal-icon"><LogOut size={20} aria-hidden="true" /></span>
        <h2 id="logout-modal-title">Log out of AgriLink?</h2>
        <p id="logout-modal-description">You’ll need to sign in again to access your farmer account.</p>
        {error && <p className="settings-form-error" role="alert">{error}</p>}
        <div className="settings-logout-modal-actions">
          <button type="button" className="settings-cancel-button" onClick={onCancel} disabled={loading} autoFocus>
            Cancel
          </button>
          <button type="button" className="settings-logout-button" onClick={onConfirm} disabled={loading}>
            {loading ? "Logging out..." : "Log out"}
          </button>
        </div>
      </section>
    </div>
  )
}

export default LogoutModal
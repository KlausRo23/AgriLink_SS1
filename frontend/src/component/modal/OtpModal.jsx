import { useEffect, useState } from "react";

/**
 * OTP verification modal.
 *
 * Props:
 *  - email:      address the code was sent to
 *  - onClose:    called after the closing animation (user dismissed)
 *  - onVerified: called once the email is verified
 *  - onResend:   optional async fn to request a new code
 *  - onVerify:   optional async fn ({ code }) => boolean. Wire your API here.
 */
export default function OtpModal({ email, onClose, onVerified, onResend, onVerify }) {
  const [code, setCode] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [closing, setClosing] = useState(false);
  const [cooldown, setCooldown] = useState(30);
  const [accountType, setAccountType] = useState("farmer");

  // Resend countdown
  useEffect(() => {
    if (cooldown <= 0) return;
    const t = setTimeout(() => setCooldown((c) => c - 1), 1000);
    return () => clearTimeout(t);
  }, [cooldown]);

  // Close on Escape + lock body scroll
  useEffect(() => {
    const onKey = (e) => e.key === "Escape" && close();
    document.addEventListener("keydown", onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = prev;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function close(after) {
    setClosing(true);
    setTimeout(() => (after ? after() : onClose?.()), 200);
  }

  const handleVerify = async (e) => {
    e.preventDefault();
    if (!/^\d{6}$/.test(code)) {
      setError("Enter the 6-digit code we sent you.");
      return;
    }
    setError("");
    setLoading(true);
    try {
      const ok = onVerify ? await onVerify({ code, role: accountType }) : false;
      if (!ok) throw new Error("invalid");
      close(() => onVerified?.());
    } catch (verificationError) {
      setError(
        verificationError.response?.data?.message ||
        "That code didn't work. Please try again."
      );
      setLoading(false);
    }
  };

  const handleResend = async () => {
    if (cooldown > 0) return;
    setError("");
    try {
      await onResend?.();
      setCooldown(30);
    } catch (resendError) {
      setError(resendError.response?.data?.message || "Could not resend the code. Please try again.");
    }
  };

  return (
    <div
      className={`modal-backdrop ${closing ? "closing" : ""}`}
      onMouseDown={(e) => e.target === e.currentTarget && close()}
      role="dialog"
      aria-modal="true"
      aria-labelledby="otp-title"
    >
      <form className="modal-card" onSubmit={handleVerify} noValidate>
        <p className="eyebrow">Step 2 of 2 · Account activation</p>
        <h2 id="otp-title" className="font-display mt-1 text-[26px] font-bold">
          Verify your email
        </h2>
        <p className="mt-2 text-xs leading-relaxed" style={{ color: "var(--muted)" }}>
          We sent a 6-digit code to <b className="text-[var(--green-dark)]">{email}</b>. Enter it
          below to activate your account.
        </p>

        <div className={`input-wrap mt-5 ${error ? "has-error" : ""}`}>
          <label className="field-label" htmlFor="otp-code">Verification code</label>
          <input
            id="otp-code"
            className="input otp-input"
            inputMode="numeric"
            autoComplete="one-time-code"
            maxLength={6}
            placeholder="Enter code"
            value={code}
            autoFocus
            onChange={(e) => {
              setCode(e.target.value.replace(/\D/g, "").slice(0, 6));
              setError("");
            }}
          />
          {error && <p className="field-error">{error}</p>}
        </div>
        <p className="hint mt-2">Check your inbox and spam folder.</p>

        <p className="mt-4 text-xs" style={{ color: "var(--muted)" }}>
          Are you trying to verify your account as a:
        </p>
        <div className="mt-2 grid grid-cols-2 gap-2" role="group" aria-label="Account type">
          {["farmer", "buyer"].map((type) => (
            <button
              key={type}
              type="button"
              className={`role-btn ${accountType === type ? "selected" : ""}`}
              aria-pressed={accountType === type}
              disabled={loading}
              onClick={() => setAccountType(type)}
            >
              {type[0].toUpperCase() + type.slice(1)}
            </button>
          ))}
        </div>

        <button type="submit" className="btn-primary mt-5" disabled={loading}>
          {loading ? <span className="spinner" /> : "Verify & continue"}
        </button>

        <div className="mt-4 flex items-center justify-center gap-3 text-xs">
          <button
            type="button"
            className="link disabled:opacity-50 disabled:no-underline"
            onClick={handleResend}
            disabled={cooldown > 0}
          >
            {cooldown > 0 ? `Resend code in ${cooldown}s` : "Resend code"}
          </button>
          <span aria-hidden>·</span>
          <button type="button" className="link" onClick={() => close()}>
            Use a different email
          </button>
        </div>
      </form>
    </div>
  );
}
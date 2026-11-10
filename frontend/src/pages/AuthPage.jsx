import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import OtpModal from "../component/modal/OtpModal";
import {
  registerAccount,
  resendVerificationCode,
  verifyEmail,
} from "../api/api";
import { useAuth } from "../context/useAuth";
import "../styles/auth.css";

// 👉 Update this filename to match the image in your images folder.
import heroImg from "../images/LandingPage.jpg";

const PASSWORD_RULE = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[^A-Za-z0-9]).{8,}$/;
const EMAIL_RULE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function Logo() {
  return (
    <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <circle cx="12" cy="12" r="10" />
      <path d="M12 18v-7M12 11c0-3 2-5 5-5 0 3-2 5-5 5zM12 13c0-2-1.5-3.5-4-3.5 0 2.2 1.5 3.5 4 3.5z" />
    </svg>
  );
}

function PasswordField({ id, label, placeholder, value, onChange, error }) {
  const [show, setShow] = useState(false);
  return (
    <div>
      <label className="field-label" htmlFor={id}>{label}</label>
      <div className={`input-wrap ${error ? "has-error" : ""}`}>
        <input
          id={id}
          className="input pr-16"
          type={show ? "text" : "password"}
          placeholder={placeholder}
          value={value}
          onChange={onChange}
          autoComplete={id.includes("confirm") ? "new-password" : "current-password"}
        />
        <button type="button" className="show-btn" onClick={() => setShow((s) => !s)}>
          {show ? "Hide" : "Show"}
        </button>
      </div>
      {error && <p className="field-error">{error}</p>}
    </div>
  );
}

function TextField({ id, label, error, ...props }) {
  return (
    <div>
      <label className="field-label" htmlFor={id}>{label}</label>
      <div className={`input-wrap ${error ? "has-error" : ""}`}>
        <input id={id} className="input" {...props} />
      </div>
      {error && <p className="field-error">{error}</p>}
    </div>
  );
}

export default function AuthPage() {
  const navigate = useNavigate();
  const { login: authenticate, isAuthenticated, loading: authLoading, error: authError } = useAuth();
  const [mode, setMode] = useState("signup"); // "signup" | "login"
  const [showOtp, setShowOtp] = useState(false);
  const [loading, setLoading] = useState(false);
  const [notice, setNotice] = useState("");
  const [noticeType, setNoticeType] = useState("success");
  const [errors, setErrors] = useState({});

  const [signup, setSignup] = useState({ username: "", email: "", password: "", confirm: "" });
  const [login, setLogin] = useState({ identifier: "", password: "" });

  useEffect(() => {
    if (!authLoading && isAuthenticated) navigate("/farmer", { replace: true });
  }, [authLoading, isAuthenticated, navigate]);

  const switchMode = (m) => {
    setMode(m);
    setErrors({});
    setNotice("");
  };

  /* ---------- Sign up -> open OTP modal ---------- */
  const handleSignup = async (e) => {
    e.preventDefault();
    const errs = {};
    if (signup.username.trim().length < 3) errs.username = "Username must be at least 3 characters.";
    if (!EMAIL_RULE.test(signup.email)) errs.email = "Enter a valid email address.";
    if (!PASSWORD_RULE.test(signup.password))
      errs.password = "Use 8+ characters with upper & lower case, a number and a symbol.";
    if (signup.confirm !== signup.password) errs.confirm = "Passwords don't match.";
    setErrors(errs);
    if (Object.keys(errs).length) return;

    setLoading(true);
    try {
      const { data } = await registerAccount(signup);
      if (data.emailSent === false) {
        setNotice(data.message);
        setNoticeType("error");
      } else {
        setNotice("");
      }
      setShowOtp(true);
    } catch (error) {
      setNotice(error.response?.data?.message || "Could not create your account. Please try again.");
      setNoticeType("error");
    } finally {
      setLoading(false);
    }
  };

  /* ---------- OTP verified -> go to log in ---------- */
  const handleVerified = () => {
    setShowOtp(false);
    setLogin({ identifier: signup.email, password: "" });
    setNotice("Email verified. Please log in to continue.");
    setNoticeType("success");
    setErrors({});
    setMode("login");
  };

  /* ---------- Log in ---------- */
  const handleLogin = async (e) => {
    e.preventDefault();
    const errs = {};
    if (!EMAIL_RULE.test(login.identifier.trim())) errs.identifier = "Enter a valid email address.";
    if (!login.password) errs.loginPassword = "Enter your password.";
    setErrors(errs);
    if (Object.keys(errs).length) return;

    setLoading(true);
    try {
      await authenticate({ email: login.identifier, password: login.password });
      navigate("/farmer", { replace: true });
    } catch (error) {
      if (error.response?.data?.code === "EMAIL_NOT_VERIFIED") {
        setSignup((previous) => ({ ...previous, email: login.identifier.trim() }));
        setNotice("Verify your email address to continue.");
        setNoticeType("error");
        setShowOtp(true);
      } else {
        setNotice(error.response?.data?.message || error.message || "Could not log in. Please try again.");
        setNoticeType("error");
      }
    } finally {
      setLoading(false);
    }
  };

  const isSignup = mode === "signup";

  return (
    <main className="auth-page min-h-screen p-3 sm:p-5">
      <div className="mx-auto grid min-h-[calc(100vh-1.5rem)] max-w-[1280px] gap-5 lg:grid-cols-[1fr_1.1fr] sm:min-h-[calc(100vh-2.5rem)]">
        {/* ---------- Left hero ---------- */}
        <aside className="relative hidden overflow-hidden rounded-3xl lg:block">
          <img src={heroImg} alt="Rows of fresh cabbage" className="hero-img absolute inset-0 h-full w-full object-cover" />
          <div className="hero-overlay absolute inset-0" />

          <div className="absolute left-8 top-8 flex items-center gap-2 text-white">
            <Logo />
            <span className="font-display text-xl font-semibold">AgriLink</span>
          </div>

          <div className="hero-content absolute inset-x-8 bottom-8 text-white">
            <p className="mb-4 flex items-center gap-2 text-[10px] font-medium uppercase tracking-[0.18em] text-white/80">
              <span className="h-px w-6" style={{ background: "var(--gold)" }} />
              The AgriLink Supersystem
            </p>
            <h1 className="font-display text-5xl font-bold leading-[1.05]">
              One account.<br />Every part of<br />AgriLink.
            </h1>
            <p className="mt-5 max-w-sm text-xs leading-relaxed text-white/80">
              Your farm, crops and inventory, connected in one place. Grow with AgriLink,
              wherever your day takes you.
            </p>
            <div className="mt-6 border-t border-white/20 pt-4">
              <p className="mb-3 text-[11px] text-white/80">One account across all services</p>
              <div className="flex flex-wrap gap-2">
                {["Subsystem 1", "Subsystem 2", "Subsystem 3"].map((s) => (
                  <span key={s} className="chip">✓ {s}</span>
                ))}
              </div>
            </div>
          </div>
        </aside>

        {/* ---------- Right form ---------- */}
        <section className="flex flex-col">
          <header className="flex items-center justify-between px-2 pt-1 text-[11px]" style={{ color: "var(--muted)" }}>
            <a href="/" className="link font-medium">← Back to home</a>
            <span>AgriLink account</span>
          </header>

          <div className="flex flex-1 items-center justify-center py-8">
            <div className="auth-card w-full max-w-[440px] p-7">
              <p className="eyebrow">One account, all of AgriLink.</p>
              <h2 className="font-display mt-1 text-[28px] font-bold">
                {isSignup ? "Grow with AgriLink" : "Welcome back"}
              </h2>
              <p className="mt-1 text-xs leading-relaxed" style={{ color: "var(--muted)" }}>
                {isSignup
                  ? "Create one account for all three subsystems. Your connected farming journey starts here."
                  : "Log in to pick up your farm, crops and inventory right where you left off."}
              </p>
              {authError && <div className="notice notice-error mt-4" role="alert">{authError}</div>}

              {/* Tabs */}
              <div className="tabs mt-5" data-mode={mode} role="tablist">
                <span className="tab-indicator" />
                <button role="tab" aria-selected={!isSignup} className={`tab ${!isSignup ? "active" : ""}`} onClick={() => switchMode("login")}>
                  Log In
                </button>
                <button role="tab" aria-selected={isSignup} className={`tab ${isSignup ? "active" : ""}`} onClick={() => switchMode("signup")}>
                  Sign Up
                </button>
              </div>

              {/* key forces remount so the entrance animation replays on tab change */}
              {isSignup ? (
                <form key="signup" className="panel-enter mt-5 space-y-3" onSubmit={handleSignup} noValidate>
                  {notice && <div className={`notice ${noticeType === "error" ? "notice-error" : ""}`} role="alert">{notice}</div>}
                  <TextField
                    id="username" label="Username" placeholder="Create a username" autoComplete="username"
                    value={signup.username} error={errors.username}
                    onChange={(e) => setSignup({ ...signup, username: e.target.value })}
                  />
                  <TextField
                    id="email" label="Email" type="email" placeholder="Enter your email address" autoComplete="email"
                    value={signup.email} error={errors.email}
                    onChange={(e) => setSignup({ ...signup, email: e.target.value })}
                  />
                  <PasswordField
                    id="password" label="Password" placeholder="Create a password"
                    value={signup.password} error={errors.password}
                    onChange={(e) => setSignup({ ...signup, password: e.target.value })}
                  />
                  <p className="hint -mt-1 ml-3">
                    Use at least 8 characters, with an uppercase and lowercase letter, a number and a special character.
                  </p>
                  <PasswordField
                    id="confirm" label="Confirm password" placeholder="Re-enter your password"
                    value={signup.confirm} error={errors.confirm}
                    onChange={(e) => setSignup({ ...signup, confirm: e.target.value })}
                  />
                  <p className="hint text-center">
                    By creating an account, you agree to AgriLink's <b>Terms and Conditions</b> and <b>Privacy Policy</b>.
                  </p>
                  <button className="btn-primary" disabled={loading || authLoading}>
                    {loading ? <span className="spinner" /> : "Create an account"}
                  </button>
                  <p className="text-center text-[11px]" style={{ color: "var(--muted)" }}>
                    Already have an AgriLink account?{" "}
                    <button type="button" className="link" onClick={() => switchMode("login")}>Log in</button>
                  </p>
                </form>
              ) : (
                <form key="login" className="panel-enter mt-5 space-y-3" onSubmit={handleLogin} noValidate>
                  {notice && <div className={`notice ${noticeType === "error" ? "notice-error" : ""}`} role="alert">{notice}</div>}
                  <TextField
                    id="identifier" label="Email address" type="email" placeholder="Enter your email address" autoComplete="email"
                    value={login.identifier} error={errors.identifier}
                    onChange={(e) => setLogin({ ...login, identifier: e.target.value })}
                  />
                  <PasswordField
                    id="login-password" label="Password" placeholder="Enter your password"
                    value={login.password} error={errors.loginPassword}
                    onChange={(e) => setLogin({ ...login, password: e.target.value })}
                  />
                  <div className="text-right text-[11px]">
                    <button type="button" className="link">Forgot password?</button>
                  </div>
                  <button className="btn-primary" disabled={loading || authLoading}>
                    {loading ? <span className="spinner" /> : "Log in"}
                  </button>
                  <p className="text-center text-[11px]" style={{ color: "var(--muted)" }}>
                    New to AgriLink?{" "}
                    <button type="button" className="link" onClick={() => switchMode("signup")}>Create an account</button>
                  </p>
                </form>
              )}
            </div>
          </div>

          <footer className="px-2 pb-1 text-[11px]" style={{ color: "var(--muted)" }}>
            Need a hand? <button className="link">Get help</button>
          </footer>
        </section>
      </div>

      {showOtp && (
        <OtpModal
          email={signup.email}
          onClose={() => setShowOtp(false)}
          onVerified={handleVerified}
          onVerify={({ code }) => verifyEmail({ email: signup.email, code })}
          onResend={() => resendVerificationCode(signup.email)}
        />
      )}
    </main>
  );
}
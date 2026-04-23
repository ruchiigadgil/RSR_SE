"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

// ══════════════════════════════════════════════════════════════════════════
// AUTH PAGE  –  Place at: app/auth/page.tsx
// ══════════════════════════════════════════════════════════════════════════

type Mode = "login" | "signup";

export default function AuthPage() {
  const router = useRouter();
  const [mode, setMode] = useState<Mode>("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [showPass, setShowPass] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async () => {
    setError("");
    if (!email || !password || (mode === "signup" && !name)) {
      setError("Please fill in all fields.");
      return;
    }
    setLoading(true);

    // ── Replace this block with your real auth logic (NextAuth, Supabase, etc.) ──
    await new Promise((r) => setTimeout(r, 1200)); // simulate network
    localStorage.setItem("auth_token", "demo-token"); // remove when using real auth
    const onboardingDone = localStorage.getItem("onboarding_complete");
    router.push(onboardingDone ? "/" : "/onboarding");
    // ─────────────────────────────────────────────────────────────────────────────

    setLoading(false);
  };

  return (
    <>
      <style>{STYLES}</style>
      <div className="auth-shell">

        {/* ── Left panel – branding ── */}
        <div className="auth-brand">
          <div className="brand-inner">
            <div className="brand-logo">
              <span className="logo-mark">◈</span>
              <span className="logo-text">CreatorOS</span>
            </div>
            <h2 className="brand-headline">
              Discover the right creators.<br />
              <span className="brand-gradient">Every time.</span>
            </h2>
            <p className="brand-sub">
              AI-powered influencer discovery, audience analytics, and
              collaboration management — all in one place.
            </p>
            <div className="brand-stats">
              {[
                { val: "9K+", key: "Verified Creators" },
                { val: "98%", key: "Match Accuracy" },
                { val: "4.2×", key: "Avg. ROI" },
              ].map((s) => (
                <div key={s.key} className="stat-pill">
                  <span className="stat-val">{s.val}</span>
                  <span className="stat-key">{s.key}</span>
                </div>
              ))}
            </div>
          </div>
          <div className="orb orb-1" />
          <div className="orb orb-2" />
          <div className="orb orb-3" />
        </div>

        {/* ── Right panel – form ── */}
        <div className="auth-form-panel">
          <div className="form-card">

            {/* Tab switcher */}
            <div className="tab-row">
              <button
                className={`tab-btn ${mode === "login" ? "active" : ""}`}
                onClick={() => { setMode("login"); setError(""); }}
              >
                Log In
              </button>
              <button
                className={`tab-btn ${mode === "signup" ? "active" : ""}`}
                onClick={() => { setMode("signup"); setError(""); }}
              >
                Sign Up
              </button>
              <div className="tab-indicator" style={{ left: mode === "login" ? "4px" : "50%" }} />
            </div>

            <div className="form-body">
              <h1 className="form-title">
                {mode === "login" ? "Welcome back" : "Create account"}
              </h1>
              <p className="form-sub">
                {mode === "login"
                  ? "Sign in to your CreatorOS workspace."
                  : "Start discovering creators in minutes."}
              </p>

              {/* Name – signup only */}
              {mode === "signup" && (
                <div className="field">
                  <label className="field-label">Full Name</label>
                  <input
                    className="field-input"
                    placeholder="Rahul Gupta"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                  />
                </div>
              )}

              {/* Email */}
              <div className="field">
                <label className="field-label">Email</label>
                <input
                  className="field-input"
                  type="email"
                  placeholder="you@company.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                />
              </div>

              {/* Password */}
              <div className="field">
                <label className="field-label">Password</label>
                <div className="pass-wrap">
                  <input
                    className="field-input pass-input"
                    type={showPass ? "text" : "password"}
                    placeholder={mode === "signup" ? "Min. 8 characters" : "••••••••"}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && handleSubmit()}
                  />
                  <button
                    className="pass-toggle"
                    onClick={() => setShowPass(!showPass)}
                    tabIndex={-1}
                  >
                    {showPass ? "Hide" : "Show"}
                  </button>
                </div>
              </div>

              {/* Forgot password – login only */}
              {mode === "login" && (
                <div className="forgot-row">
                  <button className="forgot-btn">Forgot password?</button>
                </div>
              )}

              {/* Error */}
              {error && <p className="error-msg">Error: {error}</p>}

              {/* Submit */}
              <button
                className={`submit-btn ${loading ? "loading" : ""}`}
                onClick={handleSubmit}
                disabled={loading}
              >
                {loading ? (
                  <span className="spinner" />
                ) : mode === "login" ? (
                  "Sign In →"
                ) : (
                  "Create Account →"
                )}
              </button>

              {/* Divider */}
              <div className="divider">
                <span className="divider-line" />
                <span className="divider-text">or continue with</span>
                <span className="divider-line" />
              </div>

              {/* OAuth */}
              <div className="oauth-row">
                <OAuthButton icon="G" label="Google" />
                <OAuthButton icon="⊞" label="Microsoft" />
              </div>

              {/* Mode toggle */}
              <p className="switch-hint">
                {mode === "login" ? "Don't have an account? " : "Already have an account? "}
                <button
                  className="switch-btn"
                  onClick={() => { setMode(mode === "login" ? "signup" : "login"); setError(""); }}
                >
                  {mode === "login" ? "Sign up free" : "Log in"}
                </button>
              </p>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}

function OAuthButton({ icon, label }: { icon: string; label: string }) {
  return (
    <button className="oauth-btn">
      <span className="oauth-icon">{icon}</span>
      <span>{label}</span>
    </button>
  );
}

const STYLES = `
  @import url('https://fonts.googleapis.com/css2?family=Syne:wght@400;600;700;800&family=DM+Sans:wght@300;400;500&display=swap');

  *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }

  :root {
    --bg:       #0c0c0f;
    --surface:  #13131a;
    --surface2: #1c1c27;
    --border:   #2a2a3d;
    --text:     #e8e8f0;
    --muted:    #6b6b8a;
    --accent:   #7c5af0;
    --accent2:  #c084fc;
    --radius:   14px;
  }

  body { background: var(--bg); color: var(--text); font-family: 'DM Sans', sans-serif; }

  .auth-shell {
    display: grid;
    grid-template-columns: 1fr 1fr;
    min-height: 100vh;
  }

  .auth-brand {
    background: var(--surface);
    border-right: 1px solid var(--border);
    position: relative;
    overflow: hidden;
    display: flex;
    align-items: center;
    justify-content: center;
    padding: 48px 56px;
  }
  .brand-inner {
    position: relative;
    z-index: 2;
    display: flex;
    flex-direction: column;
    gap: 28px;
  }
  .brand-logo { display: flex; align-items: center; gap: 10px; }
  .logo-mark { font-size: 28px; color: var(--accent2); line-height: 1; }
  .logo-text {
    font-family: 'Syne', sans-serif;
    font-size: 22px; font-weight: 800;
    letter-spacing: -0.02em; color: var(--text);
  }
  .brand-headline {
    font-family: 'Syne', sans-serif;
    font-size: 38px; font-weight: 800;
    line-height: 1.15; letter-spacing: -0.03em;
    color: var(--text); max-width: 380px;
  }
  .brand-gradient {
    background: linear-gradient(90deg, var(--accent), var(--accent2));
    -webkit-background-clip: text;
    -webkit-text-fill-color: transparent;
    background-clip: text;
  }
  .brand-sub { font-size: 15px; color: var(--muted); line-height: 1.65; max-width: 360px; }
  .brand-stats { display: flex; gap: 12px; flex-wrap: wrap; }
  .stat-pill {
    background: var(--surface2); border: 1px solid var(--border);
    border-radius: 10px; padding: 12px 16px;
    display: flex; flex-direction: column; gap: 2px; min-width: 90px;
  }
  .stat-val { font-family: 'Syne', sans-serif; font-size: 22px; font-weight: 800; color: var(--accent2); }
  .stat-key { font-size: 11px; color: var(--muted); letter-spacing: 0.04em; }

  .orb {
    position: absolute; border-radius: 50%;
    filter: blur(72px); pointer-events: none; z-index: 1;
  }
  .orb-1 { width: 320px; height: 320px; background: #7c5af030; top: -80px; right: -80px; }
  .orb-2 { width: 200px; height: 200px; background: #c084fc1a; bottom: 60px; left: -40px; }
  .orb-3 { width: 120px; height: 120px; background: #7c5af028; bottom: 180px; right: 60px; }

  .auth-form-panel {
    display: flex; align-items: center; justify-content: center;
    padding: 48px 40px; background: var(--bg);
  }
  .form-card { width: 100%; max-width: 420px; display: flex; flex-direction: column; gap: 0; }

  .tab-row {
    display: grid; grid-template-columns: 1fr 1fr;
    background: var(--surface); border: 1px solid var(--border);
    border-radius: 12px; padding: 4px;
    position: relative; margin-bottom: 32px; overflow: hidden;
  }
  .tab-indicator {
    position: absolute; top: 4px; bottom: 4px;
    width: calc(50% - 4px); background: var(--accent);
    border-radius: 8px; transition: left 0.22s cubic-bezier(.4,0,.2,1); z-index: 0;
  }
  .tab-btn {
    position: relative; z-index: 1; background: none; border: none;
    padding: 10px 0; font-family: 'Syne', sans-serif;
    font-size: 14px; font-weight: 700; cursor: pointer;
    color: var(--muted); transition: color 0.2s;
    border-radius: 8px; letter-spacing: 0.02em;
  }
  .tab-btn.active { color: #fff; }

  .form-body { display: flex; flex-direction: column; gap: 18px; }
  .form-title {
    font-family: 'Syne', sans-serif; font-size: 26px;
    font-weight: 800; letter-spacing: -0.02em; color: var(--text);
  }
  .form-sub { font-size: 14px; color: var(--muted); margin-top: -8px; }

  .field { display: flex; flex-direction: column; gap: 7px; }
  .field-label {
    font-size: 11px; font-weight: 600;
    text-transform: uppercase; letter-spacing: 0.1em; color: var(--muted);
  }
  .field-input {
    width: 100%; background: var(--surface); border: 1px solid var(--border);
    border-radius: 10px; padding: 12px 14px; color: var(--text);
    font-family: 'DM Sans', sans-serif; font-size: 14px; outline: none;
    transition: border-color 0.2s, box-shadow 0.2s;
  }
  .field-input:focus { border-color: var(--accent); box-shadow: 0 0 0 3px #7c5af022; }
  .field-input::placeholder { color: #3d3d55; }

  .pass-wrap { position: relative; }
  .pass-input { padding-right: 60px; }
  .pass-toggle {
    position: absolute; right: 12px; top: 50%; transform: translateY(-50%);
    background: none; border: none; color: var(--muted);
    font-size: 12px; font-family: 'DM Sans', sans-serif;
    cursor: pointer; transition: color 0.15s;
  }
  .pass-toggle:hover { color: var(--accent2); }

  .forgot-row { display: flex; justify-content: flex-end; margin-top: -6px; }
  .forgot-btn {
    background: none; border: none; font-size: 12px; color: var(--muted);
    cursor: pointer; font-family: 'DM Sans', sans-serif; transition: color 0.15s;
  }
  .forgot-btn:hover { color: var(--accent2); }

  .error-msg {
    font-size: 13px; color: #f87171;
    background: #ef444411; border: 1px solid #ef444433;
    border-radius: 8px; padding: 10px 14px;
  }

  .submit-btn {
    width: 100%; background: linear-gradient(135deg, var(--accent), #a855f7);
    border: none; border-radius: 10px; padding: 14px; color: #fff;
    font-family: 'Syne', sans-serif; font-size: 15px; font-weight: 700;
    letter-spacing: 0.02em; cursor: pointer;
    transition: opacity 0.2s, transform 0.15s;
    display: flex; align-items: center; justify-content: center;
    min-height: 50px; margin-top: 4px;
  }
  .submit-btn:hover:not(:disabled) { opacity: 0.88; transform: translateY(-1px); }
  .submit-btn:disabled { opacity: 0.6; cursor: not-allowed; }

  .spinner {
    width: 18px; height: 18px;
    border: 2px solid #ffffff44; border-top-color: #fff;
    border-radius: 50%; animation: spin 0.7s linear infinite; display: inline-block;
  }
  @keyframes spin { to { transform: rotate(360deg); } }

  .divider { display: flex; align-items: center; gap: 12px; margin: 4px 0; }
  .divider-line { flex: 1; height: 1px; background: var(--border); }
  .divider-text {
    font-size: 11px; color: var(--muted);
    white-space: nowrap; letter-spacing: 0.05em; text-transform: uppercase;
  }

  .oauth-row { display: grid; grid-template-columns: 1fr 1fr; gap: 10px; }
  .oauth-btn {
    display: flex; align-items: center; justify-content: center; gap: 8px;
    background: var(--surface); border: 1px solid var(--border);
    border-radius: 10px; padding: 11px 14px; color: var(--text);
    font-family: 'DM Sans', sans-serif; font-size: 13px; font-weight: 500;
    cursor: pointer; transition: border-color 0.15s, background 0.15s;
  }
  .oauth-btn:hover { border-color: var(--accent); background: var(--surface2); }
  .oauth-icon { font-size: 15px; }

  .switch-hint { text-align: center; font-size: 13px; color: var(--muted); }
  .switch-btn {
    background: none; border: none; color: var(--accent2);
    font-size: 13px; font-family: 'DM Sans', sans-serif;
    cursor: pointer; font-weight: 600; transition: color 0.15s;
  }
  .switch-btn:hover { color: #fff; }

  @media (max-width: 768px) {
    .auth-shell { grid-template-columns: 1fr; }
    .auth-brand { display: none; }
    .auth-form-panel { padding: 32px 20px; }
  }
`;
"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";

// ─── Types ────────────────────────────────────────────────────────────────────

interface FormState {
  brandName: string;
  industry: string;
  product: string;
  website: string;
  campaignType: string;
  budget: string;
  duration: string;
  minAge: number;
  maxAge: number;
  targetGender: string;
  targetLocation: string;
  nicheKeywords: string[];
  preferredPlatforms: string[];
  contentTone: string;
  minFollowers: number;
  productPrice: number;
}

type LoadingPhase = "idle" | "scraping" | "recommending" | "done" | "error";

const INITIAL_FORM: FormState = {
  brandName: "",
  industry: "",
  product: "",
  website: "",
  campaignType: "brand-awareness",
  budget: "5k-20k",
  duration: "1-month",
  minAge: 18,
  maxAge: 35,
  targetGender: "all",
  targetLocation: "",
  nicheKeywords: [],
  preferredPlatforms: ["YouTube"],
  contentTone: "authentic",
  minFollowers: 10000,
  productPrice: 999,
};

const DEMO_FORM: FormState = {
  brandName: "Glow Republic",
  industry: "Beauty & Skincare",
  product: "Organic face serums and SPF moisturisers for urban women.",
  website: "https://glowrepublic.in",
  campaignType: "product-launch",
  budget: "5k-20k",
  duration: "1-month",
  minAge: 18,
  maxAge: 34,
  targetGender: "female",
  targetLocation: "India",
  nicheKeywords: ["skincare", "beauty", "glow", "organic"],
  preferredPlatforms: ["Instagram", "YouTube"],
  contentTone: "authentic",
  minFollowers: 10000,
  productPrice: 1499,
};

const INDUSTRIES = [
  "Fashion & Apparel", "Beauty & Skincare", "Technology & Gadgets",
  "Food & Beverage", "Fitness & Wellness", "Travel & Lifestyle",
  "Finance & Fintech", "Education & EdTech", "Gaming & Entertainment",
  "Home & Decor", "Automotive", "Healthcare", "E-commerce", "Other",
];

const LOADING_MESSAGES = [
  "Scanning YouTube for creators in your niche...",
  "Analyzing channel statistics and engagement...",
  "Searching Instagram profiles...",
  "Cross-referencing audience demographics...",
  "Running compatibility scoring algorithm...",
  "Calculating engagement benchmarks...",
  "Building personalized match explanations...",
  "Finalizing your top creator recommendations...",
];

// ─── Component ────────────────────────────────────────────────────────────────

export default function OnboardingPage() {
  const router = useRouter();
  const [step, setStep] = useState(0);
  const [form, setForm] = useState<FormState>(INITIAL_FORM);
  const [keywordInput, setKeywordInput] = useState("");
  const [loadingPhase, setLoadingPhase] = useState<LoadingPhase>("idle");
  const [loadingMessage, setLoadingMessage] = useState(LOADING_MESSAGES[0]);
  const [loadingProgress, setLoadingProgress] = useState(0);
  const [errorMsg, setErrorMsg] = useState("");
  const [animDir, setAnimDir] = useState<"forward" | "backward">("forward");
  const [autofilling, setAutofilling] = useState(false);
  const msgIndex = useRef(0);
  const msgInterval = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const token = localStorage.getItem("auth_token");
    if (!token) router.push("/auth");
  }, [router]);

  useEffect(() => {
    return () => {
      if (msgInterval.current) clearInterval(msgInterval.current);
    };
  }, []);

  function set<K extends keyof FormState>(key: K, val: FormState[K]) {
    setForm(prev => ({ ...prev, [key]: val }));
  }

  function goNext() {
    setAnimDir("forward");
    setStep(s => Math.min(s + 1, 3));
  }

  function goBack() {
    setAnimDir("backward");
    setStep(s => Math.max(s - 1, 0));
  }

  function addKeyword() {
    const kw = keywordInput.trim();
    if (!kw || form.nicheKeywords.includes(kw)) { setKeywordInput(""); return; }
    set("nicheKeywords", [...form.nicheKeywords, kw]);
    setKeywordInput("");
  }

  function removeKeyword(kw: string) {
    set("nicheKeywords", form.nicheKeywords.filter(k => k !== kw));
  }

  function togglePlatform(p: string) {
    const cur = form.preferredPlatforms;
    set("preferredPlatforms", cur.includes(p) ? cur.filter(x => x !== p) : [...cur, p]);
  }

  function startLoadingMessages() {
    msgIndex.current = 0;
    setLoadingMessage(LOADING_MESSAGES[0]);
    setLoadingProgress(5);
    msgInterval.current = setInterval(() => {
      msgIndex.current = (msgIndex.current + 1) % LOADING_MESSAGES.length;
      setLoadingMessage(LOADING_MESSAGES[msgIndex.current]);
      setLoadingProgress(prev => Math.min(prev + 11, 90));
    }, 2800);
  }

  function stopLoadingMessages() {
    if (msgInterval.current) { clearInterval(msgInterval.current); msgInterval.current = null; }
    setLoadingProgress(100);
  }

  async function handleFindCreators() {
    if (form.nicheKeywords.length === 0) {
      setErrorMsg("Add at least one niche keyword before searching.");
      return;
    }
    setErrorMsg("");
    setLoadingPhase("scraping");
    startLoadingMessages();

    try {
      // Step 1: Scrape creators
      const scrapeRes = await fetch("/api/scrape", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          keywords: form.nicheKeywords,
          platforms: form.preferredPlatforms,
          maxResults: 8,
        }),
      });

      if (!scrapeRes.ok) throw new Error("Scraping failed");
      const scrapeData = await scrapeRes.json();
      const creators = scrapeData.creators ?? [];
      const source = typeof scrapeData.source === "string" ? scrapeData.source : "unknown";
      const scrapeWarning = typeof scrapeData.warning === "string" ? scrapeData.warning : "";

      localStorage.setItem(
        "creator_scrape_source",
        JSON.stringify({
          source,
          warning: scrapeWarning,
          creatorCount: creators.length,
          at: new Date().toISOString(),
        })
      );

      if (source === "live-empty" || creators.length === 0) {
        throw new Error(
          scrapeWarning || "No live creators found for this query. Try broader keywords or fewer filters."
        );
      }

      // Step 2: Get recommendations
      setLoadingPhase("recommending");
      const recommendRes = await fetch("/api/recommend", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          businessProfile: {
            brandName: form.brandName,
            industry: form.industry,
            product: form.product,
            website: form.website,
            campaignType: form.campaignType,
            budget: form.budget,
            duration: form.duration,
            minAge: form.minAge,
            maxAge: form.maxAge,
            targetGender: form.targetGender,
            targetLocation: form.targetLocation,
            nicheKeywords: form.nicheKeywords,
            preferredPlatforms: form.preferredPlatforms,
            contentTone: form.contentTone,
            minFollowers: form.minFollowers,
          },
          creators,
        }),
      });

      if (!recommendRes.ok) throw new Error("Recommendation failed");
      const recData = await recommendRes.json();

      stopLoadingMessages();

      localStorage.setItem("creator_recommendations", JSON.stringify(recData.recommendations ?? []));
      localStorage.setItem("business_profile", JSON.stringify(form));
      localStorage.setItem("product_price", String(form.productPrice || 999));
      localStorage.setItem("onboarding_complete", "true");

      setLoadingPhase("done");
      setTimeout(() => router.push("/recommendations"), 800);
    } catch (err) {
      stopLoadingMessages();
      setLoadingPhase("error");
      setErrorMsg(err instanceof Error ? err.message : "Something went wrong. Please try again.");
    }
  }

  const canGoNext = [
    form.brandName && form.industry && form.product,
    form.campaignType && form.budget,
    form.targetLocation,
    form.nicheKeywords.length > 0 && form.preferredPlatforms.length > 0,
  ][step];

  async function handleAutofill() {
    if (!form.website) return;
    setAutofilling(true);
    // Simulate AI scraping the website
    await new Promise(r => setTimeout(r, 1800));
    // In a real integration, call /api/autofill with the URL
    const url = form.website.toLowerCase();
    const guessedIndustry =
      url.includes("beauty") || url.includes("glow") || url.includes("skin") ? "Beauty & Skincare" :
      url.includes("fit") || url.includes("health") ? "Fitness & Wellness" :
      url.includes("food") || url.includes("cook") ? "Food & Beverage" :
      url.includes("tech") || url.includes("app") ? "Technology & Gadgets" :
      "E-commerce";
    setForm(prev => ({
      ...prev,
      industry: guessedIndustry,
      brandName: prev.brandName || form.website.replace(/https?:\/\/(www\.)?/, "").split(".")[0].replace(/-/g, " ").replace(/\b\w/g, c => c.toUpperCase()),
      product: prev.product || `Premium ${guessedIndustry.split(" ")[0]} products for quality-conscious customers.`,
    }));
    setAutofilling(false);
  }

  function handleDemoFill() {
    setForm(DEMO_FORM);
    setStep(3);
  }

  return (
    <>
      <style>{STYLES}</style>

      {loadingPhase !== "idle" && loadingPhase !== "error" && (
        <LoadingOverlay
          phase={loadingPhase}
          message={loadingMessage}
          progress={loadingProgress}
        />
      )}

      <div className="ob-shell">
        {/* ── Brand panel ── */}
        <aside className="ob-brand">
          <div className="ob-brand-inner">
            <div className="ob-logo">
              <span className="ob-logo-mark">◈</span>
              <span className="ob-logo-text">CreatorOS</span>
            </div>
            <h2 className="ob-headline">
              Find your perfect<br />
              <span className="ob-grad">creator match.</span>
            </h2>
            <p className="ob-sub">
              Tell us about your brand and goals. Our AI will scan thousands of
              creators and surface the best collaboration opportunities for you.
            </p>

            <div className="ob-features">
              {[
                { icon: "RT", title: "Real-time scraping", desc: "Live data from YouTube & Instagram" },
                { icon: "SC", title: "5-factor scoring", desc: "Niche, reach, engagement & more" },
                { icon: "AI", title: "AI explanations", desc: "Understand exactly why each creator fits" },
              ].map(f => (
                <div key={f.title} className="ob-feature-card">
                  <span className="ob-feat-icon">{f.icon}</span>
                  <div>
                    <p className="ob-feat-title">{f.title}</p>
                    <p className="ob-feat-desc">{f.desc}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
          <div className="orb orb-a" /><div className="orb orb-b" /><div className="orb orb-c" />
        </aside>

        {/* ── Form panel ── */}
        <main className="ob-form-panel">
          {/* Demo shortcut */}
          {step === 0 && (
            <div className="demo-bar">
              <span className="demo-bar-label">First time? Try with a demo brand</span>
              <button className="demo-bar-btn" onClick={handleDemoFill}>⚡ Load Demo Data</button>
            </div>
          )}

          {/* Progress */}
          <div className="progress-header">
            <div className="progress-track">
              <div className="progress-fill" style={{ width: `${((step + 1) / 4) * 100}%` }} />
            </div>
            <div className="step-dots">
              {["Brand Info", "Campaign", "Audience", "Creators"].map((label, i) => (
                <div key={label} className={`step-dot ${i <= step ? "active" : ""} ${i === step ? "current" : ""}`}>
                  <div className="dot-circle">
                    {i < step ? <span className="dot-check">✓</span> : <span className="dot-num">{i + 1}</span>}
                  </div>
                  <span className="dot-label">{label}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Step content */}
          <div className={`step-wrapper anim-${animDir}`} key={step}>
            {step === 0 && <Step0 form={form} set={set} onAutofill={handleAutofill} autofilling={autofilling} />}
            {step === 1 && <Step1 form={form} set={set} />}
            {step === 2 && <Step2 form={form} set={set} />}
            {step === 3 && (
              <Step3
                form={form}
                set={set}
                keywordInput={keywordInput}
                setKeywordInput={setKeywordInput}
                addKeyword={addKeyword}
                removeKeyword={removeKeyword}
                togglePlatform={togglePlatform}
                onSubmit={handleFindCreators}
                errorMsg={errorMsg}
              />
            )}
          </div>

          {/* Navigation */}
          <div className="ob-nav">
            {step > 0 && (
              <button className="ob-btn-back" onClick={goBack}>
                ← Back
              </button>
            )}
            {step < 3 ? (
              <button
                className={`ob-btn-next ${!canGoNext ? "disabled" : ""}`}
                onClick={canGoNext ? goNext : undefined}
                disabled={!canGoNext}
              >
                Continue →
              </button>
            ) : (
              <button
                className="ob-btn-find"
                onClick={handleFindCreators}
                disabled={!canGoNext || loadingPhase !== "idle"}
              >
                <span className="find-icon">Go</span>
                Find My Creators
              </button>
            )}
          </div>

          {errorMsg && loadingPhase === "error" && (
            <p className="ob-error">{errorMsg}</p>
          )}
        </main>
      </div>
    </>
  );
}

// ─── Step Components ──────────────────────────────────────────────────────────

function Step0({ form, set, onAutofill, autofilling }: {
  form: FormState;
  set: <K extends keyof FormState>(k: K, v: FormState[K]) => void;
  onAutofill: () => void;
  autofilling: boolean;
}) {
  return (
    <div className="step-card">
      <h1 className="step-title">Brand Info</h1>
      <p className="step-sub">Tell us about your business</p>
      <div className="fields">
        <Field label="Brand Name *">
          <input className="ob-input" placeholder="e.g. Glow Beauty" value={form.brandName}
            onChange={e => set("brandName", e.target.value)} />
        </Field>
        <Field label="Industry *">
          <select className="ob-input ob-select" value={form.industry} onChange={e => set("industry", e.target.value)}>
            <option value="">Select industry...</option>
            {INDUSTRIES.map(i => <option key={i} value={i}>{i}</option>)}
          </select>
        </Field>
        <Field label="Product / Service *">
          <textarea className="ob-input ob-textarea" placeholder="Describe what you sell or offer..."
            value={form.product} onChange={e => set("product", e.target.value)} rows={3} />
        </Field>
        <Field label="Website (optional)">
          <div className="website-row">
            <input className="ob-input website-input" placeholder="https://yourbrand.com" value={form.website}
              onChange={e => set("website", e.target.value)} />
            <button
              className={`autofill-btn ${autofilling ? "loading" : ""}`}
              onClick={onAutofill}
              disabled={!form.website || autofilling}
              title="AI auto-fills brand details from your website"
            >
              {autofilling ? <span className="af-spinner" /> : "✦ Autofill"}
            </button>
          </div>
          {autofilling && <p className="autofill-hint">🔍 Scanning your website with AI...</p>}
        </Field>
      </div>
    </div>
  );
}

function Step1({ form, set }: { form: FormState; set: <K extends keyof FormState>(k: K, v: FormState[K]) => void }) {
  return (
    <div className="step-card">
      <h1 className="step-title">Campaign Goals</h1>
      <p className="step-sub">What do you want to achieve?</p>
      <div className="fields">
        <Field label="Campaign Type *">
          <div className="radio-grid">
            {[
              { val: "brand-awareness", icon: "📣", label: "Brand Awareness" },
              { val: "product-launch", icon: "🚀", label: "Product Launch" },
              { val: "conversions", icon: "💰", label: "Drive Conversions" },
              { val: "content-creation", icon: "🎬", label: "Content Creation" },
            ].map(o => (
              <label key={o.val} className={`radio-card ${form.campaignType === o.val ? "selected" : ""}`}>
                <input type="radio" name="campaignType" value={o.val} hidden
                  checked={form.campaignType === o.val} onChange={() => set("campaignType", o.val)} />
                <span className="rc-icon">{o.icon}</span>
                <span className="rc-label">{o.label}</span>
              </label>
            ))}
          </div>
        </Field>
        <Field label="Budget Range *">
          <div className="radio-row">
            {[
              { val: "under-5k", label: "< $5K" },
              { val: "5k-20k", label: "$5K–$20K" },
              { val: "20k-100k", label: "$20K–$100K" },
              { val: "100k+", label: "$100K+" },
            ].map(o => (
              <label key={o.val} className={`pill-radio ${form.budget === o.val ? "selected" : ""}`}>
                <input type="radio" name="budget" value={o.val} hidden
                  checked={form.budget === o.val} onChange={() => set("budget", o.val)} />
                {o.label}
              </label>
            ))}
          </div>
        </Field>
        <Field label="Average Product Price (₹) *">
          <div className="price-row">
            <span className="price-symbol">₹</span>
            <input
              className="ob-input price-input"
              type="number"
              min={1}
              placeholder="e.g. 999"
              value={form.productPrice || ""}
              onChange={e => set("productPrice", Number(e.target.value))}
            />
          </div>
          <p className="field-hint">Used to calculate projected revenue from each influencer</p>
        </Field>
        <Field label="Campaign Duration">
          <select className="ob-input ob-select" value={form.duration} onChange={e => set("duration", e.target.value)}>
            <option value="1-week">1 Week</option>
            <option value="1-month">1 Month</option>
            <option value="3-months">3 Months</option>
            <option value="6-months+">6 Months+</option>
          </select>
        </Field>
      </div>
    </div>
  );
}

function Step2({ form, set }: { form: FormState; set: <K extends keyof FormState>(k: K, v: FormState[K]) => void }) {
  return (
    <div className="step-card">
      <h1 className="step-title">Target Audience</h1>
      <p className="step-sub">Who are you trying to reach?</p>
      <div className="fields">
        <Field label={`Age Range: ${form.minAge} – ${form.maxAge}`}>
          <div className="age-sliders">
            <div className="age-row">
              <span className="age-lab">Min</span>
              <input type="range" min={13} max={form.maxAge - 1} value={form.minAge}
                onChange={e => set("minAge", Number(e.target.value))} className="ob-range" />
              <span className="age-val">{form.minAge}</span>
            </div>
            <div className="age-row">
              <span className="age-lab">Max</span>
              <input type="range" min={form.minAge + 1} max={65} value={form.maxAge}
                onChange={e => set("maxAge", Number(e.target.value))} className="ob-range" />
              <span className="age-val">{form.maxAge}</span>
            </div>
          </div>
        </Field>
        <Field label="Gender">
          <div className="radio-row">
            {["all", "male", "female", "non-binary"].map(g => (
              <label key={g} className={`pill-radio ${form.targetGender === g ? "selected" : ""}`}>
                <input type="radio" name="gender" value={g} hidden
                  checked={form.targetGender === g} onChange={() => set("targetGender", g)} />
                {g.charAt(0).toUpperCase() + g.slice(1)}
              </label>
            ))}
          </div>
        </Field>
        <Field label="Target Location *">
          <input className="ob-input" placeholder="e.g. India, United States, Global"
            value={form.targetLocation} onChange={e => set("targetLocation", e.target.value)} />
        </Field>
      </div>
    </div>
  );
}

function Step3({
  form, set, keywordInput, setKeywordInput, addKeyword, removeKeyword, togglePlatform, onSubmit, errorMsg
}: {
  form: FormState;
  set: <K extends keyof FormState>(k: K, v: FormState[K]) => void;
  keywordInput: string;
  setKeywordInput: (v: string) => void;
  addKeyword: () => void;
  removeKeyword: (k: string) => void;
  togglePlatform: (p: string) => void;
  onSubmit: () => void;
  errorMsg: string;
}) {
  return (
    <div className="step-card">
      <h1 className="step-title">Creator Preferences</h1>
      <p className="step-sub">Define the type of creator you want</p>
      <div className="fields">
        <Field label="Niche Keywords * (press Enter or comma to add)">
          <div className="tag-input-wrap">
            <div className="tags-row">
              {form.nicheKeywords.map(kw => (
                <span key={kw} className="kw-tag">
                  {kw}
                  <button className="kw-remove" onClick={() => removeKeyword(kw)}>×</button>
                </span>
              ))}
            </div>
            <input
              className="ob-input tag-input"
              placeholder="fitness, skincare, travel..."
              value={keywordInput}
              onChange={e => setKeywordInput(e.target.value)}
              onKeyDown={e => {
                if (e.key === "Enter" || e.key === ",") { e.preventDefault(); addKeyword(); }
              }}
            />
            <button className="tag-add-btn" onClick={addKeyword}>Add</button>
          </div>
        </Field>

        <Field label="Preferred Platforms *">
          <div className="platform-grid">
            {[
              { name: "YouTube", icon: "▶", color: "#FF0000" },
              { name: "Instagram", icon: "◉", color: "#E1306C" },
            ].map(p => (
              <label key={p.name}
                className={`platform-card ${form.preferredPlatforms.includes(p.name) ? "selected" : ""}`}
                style={form.preferredPlatforms.includes(p.name) ? { borderColor: p.color } : undefined}>
                <input type="checkbox" hidden checked={form.preferredPlatforms.includes(p.name)}
                  onChange={() => togglePlatform(p.name)} />
                <span className="plat-icon" style={{ color: p.color }}>{p.icon}</span>
                <span className="plat-name">{p.name}</span>
                {form.preferredPlatforms.includes(p.name) && <span className="plat-check">✓</span>}
              </label>
            ))}
          </div>
        </Field>

        <Field label="Content Tone">
          <div className="radio-grid">
            {[
              { val: "educational", icon: "ED", label: "Educational" },
              { val: "entertaining", icon: "EN", label: "Entertaining" },
              { val: "inspirational", icon: "IN", label: "Inspirational" },
              { val: "authentic", icon: "AU", label: "Raw & Authentic" },
            ].map(o => (
              <label key={o.val} className={`radio-card ${form.contentTone === o.val ? "selected" : ""}`}>
                <input type="radio" name="tone" value={o.val} hidden
                  checked={form.contentTone === o.val} onChange={() => set("contentTone", o.val)} />
                <span className="rc-icon">{o.icon}</span>
                <span className="rc-label">{o.label}</span>
              </label>
            ))}
          </div>
        </Field>

        <Field label="Minimum Followers">
          <div className="radio-row">
            {[
              { val: 1000, label: "1K+" },
              { val: 10000, label: "10K+" },
              { val: 100000, label: "100K+" },
              { val: 1000000, label: "1M+" },
            ].map(o => (
              <label key={o.val} className={`pill-radio ${form.minFollowers === o.val ? "selected" : ""}`}>
                <input type="radio" name="minFollowers" value={o.val} hidden
                  checked={form.minFollowers === o.val} onChange={() => set("minFollowers", o.val)} />
                {o.label}
              </label>
            ))}
          </div>
        </Field>

        {errorMsg && <p className="ob-error">{errorMsg}</p>}
      </div>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="ob-field">
      <label className="ob-field-label">{label}</label>
      {children}
    </div>
  );
}

function LoadingOverlay({ phase, message, progress }: { phase: LoadingPhase; message: string; progress: number }) {
  return (
    <div className="loading-overlay">
      <div className="loading-content">
        <div className="loading-logo">
          <span className="ll-mark">◈</span>
          <span className="ll-text">CreatorOS</span>
        </div>
        <div className="loading-orb-container">
          <div className="loading-orb" />
          <div className="loading-orb-ring" />
          <div className="loading-orb-ring ring-2" />
        </div>
        <div className="loading-status">
          <p className="loading-msg">{message}</p>
          <div className="loading-bar-track">
            <div className="loading-bar-fill" style={{ width: `${progress}%` }} />
          </div>
          <p className="loading-pct">{progress < 100 ? `${progress}%` : phase === "done" ? "Complete ✓" : `${progress}%`}</p>
        </div>
        <div className="loading-dots">
          <span /><span /><span />
        </div>
      </div>
    </div>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const STYLES = `
  @import url('https://fonts.googleapis.com/css2?family=Syne:wght@400;600;700;800&family=DM+Sans:wght@300;400;500&display=swap');
  *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }

  :root {
    --bg: #0c0c0f; --surface: #13131a; --surface2: #1c1c27; --surface3: #22223a;
    --border: #2a2a3d; --border2: #3a3a55;
    --text: #e8e8f0; --muted: #6b6b8a; --muted2: #4a4a6a;
    --accent: #7c5af0; --accent2: #c084fc; --accent3: #a78bfa;
    --green: #34d399; --red: #f87171;
    --radius: 14px;
  }
  body { background: var(--bg); color: var(--text); font-family: 'DM Sans', sans-serif; }

  /* ── Shell ── */
  .ob-shell { display: grid; grid-template-columns: 420px 1fr; min-height: 100vh; }

  /* ── Brand panel ── */
  .ob-brand {
    background: var(--surface); border-right: 1px solid var(--border);
    position: relative; overflow: hidden;
    display: flex; align-items: center; justify-content: center;
    padding: 48px 44px;
  }
  .ob-brand-inner { position: relative; z-index: 2; display: flex; flex-direction: column; gap: 32px; }
  .ob-logo { display: flex; align-items: center; gap: 10px; }
  .ob-logo-mark { font-size: 26px; color: var(--accent2); }
  .ob-logo-text { font-family: 'Syne', sans-serif; font-size: 20px; font-weight: 800; letter-spacing: -0.02em; }
  .ob-headline {
    font-family: 'Syne', sans-serif; font-size: 34px; font-weight: 800;
    line-height: 1.2; letter-spacing: -0.03em; color: var(--text);
  }
  .ob-grad {
    background: linear-gradient(90deg, var(--accent), var(--accent2));
    -webkit-background-clip: text; -webkit-text-fill-color: transparent; background-clip: text;
  }
  .ob-sub { font-size: 14px; color: var(--muted); line-height: 1.7; max-width: 340px; }
  .ob-features { display: flex; flex-direction: column; gap: 14px; }
  .ob-feature-card {
    display: flex; align-items: flex-start; gap: 14px;
    background: var(--surface2); border: 1px solid var(--border);
    border-radius: 12px; padding: 14px 16px;
    transition: border-color 0.2s, transform 0.2s;
  }
  .ob-feature-card:hover { border-color: var(--accent); transform: translateX(4px); }
  .ob-feat-icon { font-size: 20px; flex-shrink: 0; margin-top: 1px; }
  .ob-feat-title { font-family: 'Syne', sans-serif; font-size: 13px; font-weight: 700; color: var(--text); }
  .ob-feat-desc { font-size: 12px; color: var(--muted); margin-top: 2px; }

  .orb { position: absolute; border-radius: 50%; filter: blur(80px); pointer-events: none; z-index: 1; }
  .orb-a { width: 300px; height: 300px; background: #7c5af025; top: -60px; right: -80px; }
  .orb-b { width: 180px; height: 180px; background: #c084fc18; bottom: 80px; left: -30px; }
  .orb-c { width: 100px; height: 100px; background: #7c5af020; bottom: 200px; right: 40px; }

  /* ── Form panel ── */
  .ob-form-panel {
    display: flex; flex-direction: column; padding: 48px 56px;
    background: var(--bg); max-width: 700px; width: 100%;
    margin: 0 auto;
  }

  /* ── Progress ── */
  /* ── Demo bar ── */
  .demo-bar {
    display: flex; align-items: center; justify-content: space-between;
    background: linear-gradient(135deg, #7c5af015, #c084fc10);
    border: 1px solid #7c5af030;
    border-radius: 10px; padding: 10px 16px; margin-bottom: 20px;
  }
  .demo-bar-label { font-size: 13px; color: var(--muted); }
  .demo-bar-btn {
    background: linear-gradient(135deg, var(--accent), var(--accent2));
    border: none; border-radius: 8px; padding: 7px 16px;
    color: #fff; font-family: 'Syne', sans-serif; font-size: 12px; font-weight: 700;
    cursor: pointer; letter-spacing: 0.03em; transition: opacity 0.2s, transform 0.15s;
  }
  .demo-bar-btn:hover { opacity: 0.85; transform: translateY(-1px); }

  /* ── Website autofill row ── */
  .website-row { display: flex; gap: 10px; align-items: center; }
  .website-input { flex: 1; }
  .autofill-btn {
    white-space: nowrap; background: #7c5af020; border: 1px solid #7c5af050;
    border-radius: 10px; padding: 11px 16px; color: var(--accent2);
    font-family: 'DM Sans', sans-serif; font-size: 13px; font-weight: 600;
    cursor: pointer; transition: all 0.2s; display: flex; align-items: center; gap: 6px;
  }
  .autofill-btn:hover:not(:disabled) { background: #7c5af035; border-color: var(--accent); }
  .autofill-btn:disabled { opacity: 0.45; cursor: not-allowed; }
  .autofill-btn.loading { opacity: 0.7; cursor: wait; }
  .af-spinner {
    width: 14px; height: 14px; border: 2px solid #c084fc44; border-top-color: var(--accent2);
    border-radius: 50%; animation: spin 0.7s linear infinite; display: inline-block;
  }
  @keyframes spin { to { transform: rotate(360deg); } }
  .autofill-hint { font-size: 12px; color: var(--accent2); margin-top: 6px; animation: msgFade 0.4s ease; }

  /* ── Price field ── */
  .price-row { display: flex; align-items: center; gap: 10px; }
  .price-symbol { font-size: 18px; color: var(--muted); font-weight: 700; flex-shrink: 0; }
  .price-input { flex: 1; }
  .field-hint { font-size: 11px; color: var(--muted); margin-top: 5px; }

  .progress-header { margin-bottom: 40px; }
  .progress-track {
    height: 4px; background: var(--surface2); border-radius: 99px;
    overflow: hidden; margin-bottom: 20px;
  }
  .progress-fill {
    height: 100%;
    background: linear-gradient(90deg, var(--accent), var(--accent2));
    border-radius: 99px; transition: width 0.5s cubic-bezier(.4,0,.2,1);
  }
  .step-dots { display: flex; gap: 0; justify-content: space-between; }
  .step-dot { display: flex; flex-direction: column; align-items: center; gap: 8px; flex: 1; }
  .dot-circle {
    width: 32px; height: 32px; border-radius: 50%;
    background: var(--surface2); border: 2px solid var(--border);
    display: flex; align-items: center; justify-content: center;
    transition: all 0.3s;
  }
  .step-dot.active .dot-circle { background: var(--accent); border-color: var(--accent); }
  .step-dot.current .dot-circle {
    box-shadow: 0 0 0 4px #7c5af030;
    animation: pulse-ring 2s ease-in-out infinite;
  }
  @keyframes pulse-ring {
    0%, 100% { box-shadow: 0 0 0 4px #7c5af030; }
    50% { box-shadow: 0 0 0 8px #7c5af018; }
  }
  .dot-check, .dot-num { font-size: 12px; font-weight: 700; color: #fff; }
  .dot-label { font-size: 11px; color: var(--muted); font-weight: 500; letter-spacing: 0.04em; }
  .step-dot.active .dot-label { color: var(--accent2); }

  /* ── Step wrapper animation ── */
  .step-wrapper { flex: 1; overflow: hidden; }
  .step-wrapper.anim-forward {
    animation: slideInRight 0.32s cubic-bezier(.4,0,.2,1) both;
  }
  .step-wrapper.anim-backward {
    animation: slideInLeft 0.32s cubic-bezier(.4,0,.2,1) both;
  }
  @keyframes slideInRight {
    from { opacity: 0; transform: translateX(32px); }
    to { opacity: 1; transform: translateX(0); }
  }
  @keyframes slideInLeft {
    from { opacity: 0; transform: translateX(-32px); }
    to { opacity: 1; transform: translateX(0); }
  }

  /* ── Step card ── */
  .step-card { padding: 0; }
  .step-title {
    font-family: 'Syne', sans-serif; font-size: 28px; font-weight: 800;
    letter-spacing: -0.02em; color: var(--text); margin-bottom: 6px;
  }
  .step-sub { font-size: 14px; color: var(--muted); margin-bottom: 32px; }
  .fields { display: flex; flex-direction: column; gap: 24px; }

  /* ── Field ── */
  .ob-field { display: flex; flex-direction: column; gap: 8px; }
  .ob-field-label {
    font-size: 11px; font-weight: 700; text-transform: uppercase;
    letter-spacing: 0.1em; color: var(--muted);
  }
  .ob-input {
    width: 100%; background: var(--surface); border: 1px solid var(--border);
    border-radius: 10px; padding: 12px 14px; color: var(--text);
    font-family: 'DM Sans', sans-serif; font-size: 14px; outline: none;
    transition: border-color 0.2s, box-shadow 0.2s; resize: none;
    appearance: none;
  }
  .ob-input:focus { border-color: var(--accent); box-shadow: 0 0 0 3px #7c5af020; }
  .ob-input::placeholder { color: var(--muted2); }
  .ob-select { cursor: pointer; }
  .ob-textarea { line-height: 1.6; }

  /* ── Radio grid ── */
  .radio-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 10px; }
  .radio-card {
    display: flex; flex-direction: column; align-items: center; gap: 8px;
    background: var(--surface); border: 2px solid var(--border);
    border-radius: 12px; padding: 16px 12px; cursor: pointer;
    transition: all 0.2s; text-align: center;
  }
  .radio-card:hover { border-color: var(--accent); background: var(--surface2); }
  .radio-card.selected { border-color: var(--accent); background: #7c5af015; }
  .rc-icon { font-size: 22px; }
  .rc-label { font-size: 13px; font-weight: 600; color: var(--text); }

  /* ── Pill radios ── */
  .radio-row { display: flex; gap: 8px; flex-wrap: wrap; }
  .pill-radio {
    padding: 8px 16px; border-radius: 99px; font-size: 13px; font-weight: 500;
    background: var(--surface); border: 1px solid var(--border);
    cursor: pointer; transition: all 0.2s; color: var(--muted);
  }
  .pill-radio:hover { border-color: var(--accent); color: var(--text); }
  .pill-radio.selected { background: var(--accent); border-color: var(--accent); color: #fff; font-weight: 700; }

  /* ── Age sliders ── */
  .age-sliders { display: flex; flex-direction: column; gap: 14px; }
  .age-row { display: flex; align-items: center; gap: 14px; }
  .age-lab { font-size: 12px; color: var(--muted); width: 28px; flex-shrink: 0; }
  .age-val { font-size: 13px; font-weight: 700; color: var(--accent2); width: 28px; text-align: right; flex-shrink: 0; }
  .ob-range {
    flex: 1; accent-color: var(--accent); height: 4px; cursor: pointer;
    background: var(--surface2); border-radius: 99px;
  }

  /* ── Tag input ── */
  .tag-input-wrap { display: flex; flex-direction: column; gap: 10px; }
  .tags-row { display: flex; gap: 6px; flex-wrap: wrap; min-height: 28px; }
  .kw-tag {
    display: flex; align-items: center; gap: 5px;
    background: #7c5af020; border: 1px solid var(--accent);
    border-radius: 99px; padding: 4px 12px; font-size: 13px; color: var(--accent2);
    animation: tagPop 0.2s ease-out;
  }
  @keyframes tagPop {
    from { opacity: 0; transform: scale(0.8); }
    to { opacity: 1; transform: scale(1); }
  }
  .kw-remove {
    background: none; border: none; cursor: pointer; color: var(--accent);
    font-size: 14px; padding: 0; line-height: 1; transition: color 0.15s;
  }
  .kw-remove:hover { color: var(--red); }
  .tag-input { border-bottom-right-radius: 0; }
  .tag-add-btn {
    align-self: flex-start; background: var(--accent); border: none;
    border-radius: 8px; padding: 8px 16px; color: #fff;
    font-family: 'DM Sans', sans-serif; font-size: 13px; font-weight: 600;
    cursor: pointer; transition: opacity 0.2s, transform 0.15s;
  }
  .tag-add-btn:hover { opacity: 0.85; transform: translateY(-1px); }

  /* ── Platform grid ── */
  .platform-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 10px; }
  .platform-card {
    display: flex; align-items: center; gap: 12px;
    background: var(--surface); border: 2px solid var(--border);
    border-radius: 12px; padding: 14px 16px; cursor: pointer;
    transition: all 0.2s; position: relative;
  }
  .platform-card:hover { background: var(--surface2); }
  .platform-card.selected { background: #7c5af010; }
  .plat-icon { font-size: 20px; }
  .plat-name { font-size: 14px; font-weight: 600; }
  .plat-check {
    position: absolute; top: 8px; right: 10px;
    font-size: 12px; color: var(--green); font-weight: 700;
  }

  /* ── Navigation ── */
  .ob-nav { display: flex; gap: 12px; margin-top: 40px; justify-content: flex-end; }
  .ob-btn-back {
    background: none; border: 1px solid var(--border); border-radius: 10px;
    padding: 12px 24px; color: var(--muted); font-family: 'DM Sans', sans-serif;
    font-size: 14px; font-weight: 500; cursor: pointer; transition: all 0.2s;
  }
  .ob-btn-back:hover { border-color: var(--border2); color: var(--text); }
  .ob-btn-next {
    background: linear-gradient(135deg, var(--accent), #a855f7);
    border: none; border-radius: 10px; padding: 12px 28px;
    color: #fff; font-family: 'Syne', sans-serif; font-size: 14px;
    font-weight: 700; cursor: pointer; letter-spacing: 0.02em;
    transition: opacity 0.2s, transform 0.15s;
  }
  .ob-btn-next:hover:not(.disabled) { opacity: 0.88; transform: translateY(-1px); }
  .ob-btn-next.disabled { opacity: 0.4; cursor: not-allowed; }
  .ob-btn-find {
    display: flex; align-items: center; gap: 10px;
    background: linear-gradient(135deg, #7c5af0, #c084fc, #a855f7);
    background-size: 200% 200%; animation: gradShift 3s ease infinite;
    border: none; border-radius: 10px; padding: 14px 32px;
    color: #fff; font-family: 'Syne', sans-serif; font-size: 15px;
    font-weight: 800; cursor: pointer; letter-spacing: 0.02em;
    transition: transform 0.15s, box-shadow 0.2s;
    box-shadow: 0 4px 24px #7c5af040;
  }
  .ob-btn-find:hover:not(:disabled) { transform: translateY(-2px); box-shadow: 0 8px 32px #7c5af060; }
  .ob-btn-find:disabled { opacity: 0.5; cursor: not-allowed; animation: none; }
  @keyframes gradShift {
    0%, 100% { background-position: 0% 50%; }
    50% { background-position: 100% 50%; }
  }
  .find-icon { font-size: 18px; }

  .ob-error {
    background: #ef444415; border: 1px solid #ef444440; border-radius: 10px;
    padding: 12px 16px; font-size: 13px; color: var(--red); margin-top: 12px;
  }

  /* ── Loading overlay ── */
  .loading-overlay {
    position: fixed; inset: 0; z-index: 1000;
    background: #0c0c0fee; backdrop-filter: blur(12px);
    display: flex; align-items: center; justify-content: center;
    animation: fadeIn 0.3s ease;
  }
  @keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }
  .loading-content {
    display: flex; flex-direction: column; align-items: center; gap: 32px;
    text-align: center; max-width: 400px;
  }
  .loading-logo { display: flex; align-items: center; gap: 10px; }
  .ll-mark { font-size: 28px; color: var(--accent2); animation: pulseFade 2s ease-in-out infinite; }
  .ll-text { font-family: 'Syne', sans-serif; font-size: 22px; font-weight: 800; }
  @keyframes pulseFade {
    0%, 100% { opacity: 1; } 50% { opacity: 0.4; }
  }

  .loading-orb-container { position: relative; width: 100px; height: 100px; display: flex; align-items: center; justify-content: center; }
  .loading-orb {
    width: 60px; height: 60px; border-radius: 50%;
    background: radial-gradient(circle at 30% 30%, var(--accent2), var(--accent));
    animation: orbPulse 2s ease-in-out infinite;
    box-shadow: 0 0 40px #7c5af060;
  }
  @keyframes orbPulse {
    0%, 100% { transform: scale(1); box-shadow: 0 0 40px #7c5af060; }
    50% { transform: scale(1.15); box-shadow: 0 0 60px #7c5af090; }
  }
  .loading-orb-ring {
    position: absolute; inset: 0; border-radius: 50%;
    border: 2px solid #7c5af040;
    animation: ringExpand 2s ease-out infinite;
  }
  .ring-2 { animation-delay: 1s; }
  @keyframes ringExpand {
    0% { transform: scale(0.8); opacity: 1; }
    100% { transform: scale(1.6); opacity: 0; }
  }

  .loading-status { display: flex; flex-direction: column; gap: 12px; align-items: center; width: 100%; }
  .loading-msg {
    font-size: 14px; color: var(--text); min-height: 20px;
    transition: all 0.4s; animation: msgFade 0.4s ease;
  }
  @keyframes msgFade { from { opacity: 0; transform: translateY(4px); } to { opacity: 1; transform: none; } }
  .loading-bar-track {
    width: 280px; height: 6px; background: var(--surface2); border-radius: 99px; overflow: hidden;
  }
  .loading-bar-fill {
    height: 100%; border-radius: 99px;
    background: linear-gradient(90deg, var(--accent), var(--accent2));
    transition: width 0.8s cubic-bezier(.4,0,.2,1);
  }
  .loading-pct { font-size: 12px; color: var(--muted); font-family: 'Syne', sans-serif; font-weight: 700; }

  .loading-dots { display: flex; gap: 8px; }
  .loading-dots span {
    width: 8px; height: 8px; border-radius: 50%; background: var(--accent);
    animation: dotBounce 1.2s ease-in-out infinite;
  }
  .loading-dots span:nth-child(2) { animation-delay: 0.2s; }
  .loading-dots span:nth-child(3) { animation-delay: 0.4s; }
  @keyframes dotBounce {
    0%, 100% { transform: translateY(0); opacity: 0.4; }
    50% { transform: translateY(-8px); opacity: 1; }
  }

  @media (max-width: 900px) {
    .ob-shell { grid-template-columns: 1fr; }
    .ob-brand { display: none; }
    .ob-form-panel { padding: 32px 24px; }
  }
`;

"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";

// ─── Types ─────────────────────────────────────────────────────────────────────

interface MatchBreakdown {
  nicheMatch: number;
  reachScore: number;
  engagementScore: number;
  platformMatch: number;
  budgetFit: number;
}

interface RecommendedCreator {
  id: string;
  name: string;
  handle: string;
  platform: "YouTube" | "Instagram";
  profileUrl: string;
  avatarUrl: string;
  subscribers: number;
  viewCount: number;
  engagementRate: number;
  totalLikes: number;
  niche: string;
  description: string;
  country: string;
  matchScore: number;
  matchBreakdown: MatchBreakdown;
  explanation: string;
  whyGoodFit: string[];
}

interface BusinessProfile {
  brandName: string;
  industry: string;
  nicheKeywords: string[];
  preferredPlatforms: string[];
  campaignType: string;
  productPrice?: number;
  budget?: string;
}

interface ScrapeSourceMeta {
  source: string;
  warning?: string;
  creatorCount?: number;
  at?: string;
}

const CREATOR_CART_KEY = "creator_cart_items";

interface CreatorCartItem extends RecommendedCreator {
  addedAt: string;
}

// ─── ROI Helpers ───────────────────────────────────────────────────────────────

const BUDGET_TO_AMOUNT: Record<string, number> = {
  "under-5k": 3000,
  "5k-20k": 12000,
  "20k-100k": 60000,
  "100k+": 150000,
};

function estimateMetrics(creator: RecommendedCreator, productPrice: number) {
  const reach = creator.viewCount > 0 ? creator.viewCount : creator.subscribers;
  // engagement rate is already a percentage, e.g. 5 for 5%
  const engRate = creator.engagementRate > 0 ? creator.engagementRate / 100 : 0.03;
  
  // Assume 5% of engaged users click the link
  const clicks = reach * engRate * 0.05;
  // Assume 2% of clicks convert to a sale
  const sales = clicks * 0.02;
  const revenue = Math.round(sales * productPrice);
  
  // Estimate cost: e.g. ₹0.05 per view for YouTube/Insta
  const cost = Math.round(reach * 0.05);
  const profit = revenue - cost;
  
  const roi = cost > 0 ? Math.round((profit / cost) * 100) : 0;
  
  return { revenue, cost, profit, roi };
}

function fmtCurrency(n: number): string {
  if (n >= 1_00_00_000) return `₹${(n / 1_00_00_000).toFixed(1)}Cr`;
  if (n >= 1_00_000) return `₹${(n / 1_00_000).toFixed(1)}L`;
  if (n >= 1000) return `₹${(n / 1000).toFixed(0)}K`;
  return `₹${n}`;
}

// ─── Helpers ───────────────────────────────────────────────────────────────────

function formatNum(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${Math.round(n / 1_000)}K`;
  return String(n);
}

function getScoreColor(score: number): string {
  if (score >= 80) return "#34d399";
  if (score >= 60) return "#a78bfa";
  if (score >= 40) return "#fbbf24";
  return "#f87171";
}

function getScoreLabel(score: number): string {
  if (score >= 80) return "Excellent";
  if (score >= 60) return "Strong";
  if (score >= 40) return "Moderate";
  return "Low";
}

function getInitials(name: string): string {
  return name.split(" ").slice(0, 2).map(w => w[0]).join("").toUpperCase();
}

const PLATFORM_COLORS: Record<string, string> = {
  YouTube: "#FF0000",
  Instagram: "#E1306C",
};

function getSafeProfileUrl(creator: RecommendedCreator): string {
  const raw = (creator.profileUrl ?? "").trim();
  if (raw) {
    if (/^https?:\/\//i.test(raw)) return raw;
    return `https://${raw.replace(/^\/+/, "")}`;
  }

  const slug = creator.handle.replace(/^@/, "").trim();
  if (!slug) return "#";

  return creator.platform === "YouTube"
    ? `https://www.youtube.com/@${slug}`
    : `https://www.instagram.com/${slug}`;
}

// ─── Mini Bar Chart ────────────────────────────────────────────────────────────

function MiniBarChart({ breakdown }: { breakdown: MatchBreakdown }) {
  const bars = [
    { label: "Niche", value: breakdown.nicheMatch, max: 30, color: "#a78bfa" },
    { label: "Reach", value: breakdown.reachScore, max: 20, color: "#38bdf8" },
    { label: "Engage", value: breakdown.engagementScore, max: 25, color: "#34d399" },
    { label: "Platform", value: breakdown.platformMatch, max: 10, color: "#fb923c" },
    { label: "Budget", value: breakdown.budgetFit, max: 15, color: "#f472b6" },
  ];
  const maxH = 48;
  return (
    <div className="mini-bar-chart">
      {bars.map(b => {
        const pct = b.max > 0 ? (b.value / b.max) : 0;
        const h = Math.max(4, Math.round(pct * maxH));
        return (
          <div key={b.label} className="mini-bar-col">
            <div className="mini-bar-track">
              <div className="mini-bar-fill" style={{ height: h, background: b.color }} />
            </div>
            <span className="mini-bar-label">{b.label}</span>
          </div>
        );
      })}
    </div>
  );
}

// ─── Profit Badge ───────────────────────────────────────────────────────────────

function ProfitBadge({ metrics }: { metrics: ReturnType<typeof estimateMetrics> }) {
  const { revenue, cost, profit, roi } = metrics;
  const isPositive = profit >= 0;
  const color = isPositive ? "#34d399" : "#f87171";
  const bg = isPositive ? "#34d39912" : "#f8717112";
  const border = isPositive ? "#34d39940" : "#f8717140";
  return (
    <div className="profit-badge" style={{ background: bg, border: `1px solid ${border}` }}>
      <div className="pb-main">
        <span className="pb-money" style={{ color }}>{profit >= 0 ? "+" : "-"}{fmtCurrency(Math.abs(profit))}</span>
        <span className="pb-sub">Est. Profit</span>
      </div>
      <div className="pb-details">
        <div className="pb-row">
          <span className="pb-label">Revenue:</span>
          <span className="pb-val">{fmtCurrency(revenue)}</span>
        </div>
        <div className="pb-row">
          <span className="pb-label">Est. Cost:</span>
          <span className="pb-val">{fmtCurrency(cost)}</span>
        </div>
      </div>
      <div className="pb-roi" style={{ color, background: isPositive ? "#34d39920" : "#f8717120", border: `1px solid ${border}` }}>
        {isPositive ? "+" : ""}{roi}% ROI
      </div>
    </div>
  );
}

// ─── Score Ring (SVG) ──────────────────────────────────────────────────────────

function ScoreRing({ score, size = 88 }: { score: number; size?: number }) {
  const r = (size - 12) / 2;
  const circ = 2 * Math.PI * r;
  const color = getScoreColor(score);

  return (
    <div className="score-ring-wrap" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="score-svg">
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="#1c1c27" strokeWidth={10} />
        <circle
          cx={size / 2} cy={size / 2} r={r} fill="none"
          stroke={color} strokeWidth={10}
          strokeLinecap="round"
          strokeDasharray={circ}
          strokeDashoffset={circ * (1 - score / 100)}
          style={{ transform: "rotate(-90deg)", transformOrigin: "center", transition: "stroke-dashoffset 1s cubic-bezier(.4,0,.2,1)" }}
        />
      </svg>
      <div className="score-ring-inner">
        <span className="score-num" style={{ color }}>{score}</span>
        <span className="score-pct">%</span>
      </div>
    </div>
  );
}

// ─── Breakdown Bar ─────────────────────────────────────────────────────────────

function BreakdownBar({ label, value, max }: { label: string; value: number; max: number }) {
  const pct = Math.round((value / max) * 100);
  return (
    <div className="bd-row">
      <span className="bd-label">{label}</span>
      <div className="bd-track">
        <div className="bd-fill" style={{ width: `${pct}%` }} />
      </div>
      <span className="bd-val">{value}/{max}</span>
    </div>
  );
}

// ─── Creator Card ──────────────────────────────────────────────────────────────

function CreatorCard({ creator, rank, isInCart, onAddToCart, productPrice, budget }: {
  creator: RecommendedCreator;
  rank: number;
  isInCart: boolean;
  onAddToCart: (creator: RecommendedCreator) => void;
  productPrice: number;
  budget: string;
}) {
  const [expanded, setExpanded] = useState(false);
  const [imgFailed, setImgFailed] = useState(false);
  const initials = getInitials(creator.name);
  const platColor = PLATFORM_COLORS[creator.platform] ?? "#7c5af0";
  const scoreColor = getScoreColor(creator.matchScore);
  const profileUrl = getSafeProfileUrl(creator);
  const hasProfileUrl = profileUrl !== "#";
  const metrics = estimateMetrics(creator, productPrice);

  return (
    <div className={`creator-card ${expanded ? "expanded" : ""}`} style={{ animationDelay: `${rank * 80}ms` }}>
      {/* Rank badge */}
      <div className="rank-badge" style={rank === 0 ? { background: "#fbbf24", color: "#000" } : undefined}>
        #{rank + 1}
      </div>

      {/* Header */}
      <div className="card-header">
        {/* Avatar — clicking opens profile */}
        <a href={profileUrl} target="_blank" rel="noopener noreferrer" className="card-avatar-link"
          onClick={(e) => { if (!hasProfileUrl) e.preventDefault(); }}
          style={{ background: `linear-gradient(135deg, ${platColor}30, ${platColor}10)`, border: `2px solid ${platColor}50` }}>
          {creator.avatarUrl && !imgFailed
            ? <img
                src={creator.avatarUrl}
                alt={creator.name}
                className="avatar-img"
                referrerPolicy="no-referrer"
                onError={() => setImgFailed(true)}
              />
            : <span className="avatar-initials">{initials}</span>}
          <span className="avatar-hover-overlay">↗</span>
        </a>

        <div className="card-identity">
          <a href={profileUrl} target="_blank" rel="noopener noreferrer" className="card-name-link"
            onClick={(e) => { if (!hasProfileUrl) e.preventDefault(); }}>
            <h3 className="card-name">{creator.name}</h3>
          </a>
          <p className="card-handle">{creator.handle}</p>
          <div className="card-badges">
            <span className="platform-badge" style={{ background: `${platColor}20`, color: platColor, border: `1px solid ${platColor}40` }}>
              {creator.platform === "YouTube" ? "▶" : "◉"} {creator.platform}
            </span>
            <a href={profileUrl} target="_blank" rel="noopener noreferrer" className="profile-link-badge"
              onClick={(e) => { if (!hasProfileUrl) e.preventDefault(); }}>
              View Profile ↗
            </a>
            <button
              className={`cart-link-badge ${isInCart ? "in-cart" : ""}`}
              onClick={() => onAddToCart(creator)}
              disabled={isInCart}
            >
              {isInCart ? "In Cart" : "Add to Cart"}
            </button>
          </div>
        </div>

        <div className="score-section">
          <ScoreRing score={creator.matchScore} />
          <span className="score-label" style={{ color: scoreColor }}>{getScoreLabel(creator.matchScore)}</span>
        </div>
      </div>

      {/* Stats row */}
      <div className="stats-row">
        <div className="stat-cell">
          <span className="stat-val">{formatNum(creator.subscribers)}</span>
          <span className="stat-key">Followers</span>
        </div>
        <div className="stat-divider" />
        <div className="stat-cell">
          <span className="stat-val">{creator.engagementRate > 0 ? `${creator.engagementRate}%` : "—"}</span>
          <span className="stat-key">Engagement</span>
        </div>
        <div className="stat-divider" />
        <div className="stat-cell">
          <span className="stat-val">{creator.totalLikes > 0 ? formatNum(creator.totalLikes) : creator.viewCount > 0 ? formatNum(creator.viewCount) : "—"}</span>
          <span className="stat-key">{creator.platform === "YouTube" ? "Views" : "Likes"}</span>
        </div>
        {creator.country && (
          <>
            <div className="stat-divider" />
            <div className="stat-cell">
              <span className="stat-val">{creator.country}</span>
              <span className="stat-key">Country</span>
            </div>
          </>
        )}
      </div>

      {/* Profit Badge */}
      <ProfitBadge metrics={metrics} />

      {/* Explanation snippet */}
      <p className="card-explanation">{creator.explanation}</p>

      {/* Expandable section */}
      <button className="expand-btn" onClick={() => setExpanded(e => !e)}>
        <span>{expanded ? "Hide details" : "Why they're a fit"}</span>
        <span className={`expand-chevron ${expanded ? "open" : ""}`}>▾</span>
      </button>

      {expanded && (
        <div className="expanded-content">
          {/* Why good fit bullets */}
          {creator.whyGoodFit.length > 0 && (
            <div className="why-section">
              <h4 className="why-title">Key Reasons</h4>
              <ul className="why-list">
                {creator.whyGoodFit.map((r, i) => (
                  <li key={i} className="why-item">
                    <span className="why-dot">◆</span>
                    {r}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Score breakdown chart */}
          <div className="breakdown-section">
            <h4 className="why-title">Score Breakdown</h4>
            <MiniBarChart breakdown={creator.matchBreakdown} />
            <div className="breakdown-bars">
              <BreakdownBar label="Niche Match" value={creator.matchBreakdown.nicheMatch} max={30} />
              <BreakdownBar label="Reach" value={creator.matchBreakdown.reachScore} max={20} />
              <BreakdownBar label="Engagement" value={creator.matchBreakdown.engagementScore} max={25} />
              <BreakdownBar label="Platform Fit" value={creator.matchBreakdown.platformMatch} max={10} />
              <BreakdownBar label="Budget Fit" value={creator.matchBreakdown.budgetFit} max={15} />
            </div>
          </div>

          {/* Niche tags */}
          {creator.niche && (
            <div className="niche-tags">
              {creator.niche.split(",").map(t => t.trim()).filter(Boolean).map(tag => (
                <span key={tag} className="niche-tag">{tag}</span>
              ))}
            </div>
          )}

          {/* Actions */}
          <div className="card-actions">
            <a href={profileUrl} target="_blank" rel="noopener noreferrer" className="action-btn primary"
              onClick={(e) => { if (!hasProfileUrl) e.preventDefault(); }}>
              View Profile →
            </a>
            <button className="action-btn secondary" onClick={() => {
              navigator.clipboard.writeText(profileUrl).catch(() => {});
            }}>
              Copy Link
            </button>
            <button
              className={`action-btn tertiary ${isInCart ? "in-cart" : ""}`}
              onClick={() => onAddToCart(creator)}
              disabled={isInCart}
            >
              {isInCart ? "In Cart" : "Add to Cart"}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Main Page ─────────────────────────────────────────────────────────────────

export default function RecommendationsPage() {
  const router = useRouter();
  const [recommendations, setRecommendations] = useState<RecommendedCreator[]>([]);
  const [profile, setProfile] = useState<BusinessProfile | null>(null);
  const [scrapeMeta, setScrapeMeta] = useState<ScrapeSourceMeta | null>(null);
  const [cartKeys, setCartKeys] = useState<Record<string, true>>({});
  const [filterPlatform, setFilterPlatform] = useState<string>("all");
  const [filterMinScore, setFilterMinScore] = useState(0);
  const [sortBy, setSortBy] = useState<"matchScore" | "subscribers" | "engagementRate" | "projectedRevenue">("matchScore");
  const [mounted, setMounted] = useState(false);
  const [productPrice, setProductPrice] = useState(999);

  useEffect(() => {
    const token = localStorage.getItem("auth_token");
    if (!token) { router.push("/auth"); return; }

    const raw = localStorage.getItem("creator_recommendations");
    const rawProfile = localStorage.getItem("business_profile");
    const rawScrapeMeta = localStorage.getItem("creator_scrape_source");

    if (!raw) { router.push("/onboarding"); return; }

    try {
      setRecommendations(JSON.parse(raw));
      if (rawProfile) setProfile(JSON.parse(rawProfile));
      if (rawScrapeMeta) setScrapeMeta(JSON.parse(rawScrapeMeta));

      const priceRaw = localStorage.getItem("product_price");
      if (priceRaw) setProductPrice(Number(priceRaw) || 999);

      const rawCart = localStorage.getItem(CREATOR_CART_KEY);
      if (rawCart) {
        const parsed = JSON.parse(rawCart) as CreatorCartItem[];
        const keyMap: Record<string, true> = {};
        for (const item of parsed) {
          keyMap[`${item.platform}:${item.id}`] = true;
        }
        setCartKeys(keyMap);
      }
    } catch {
      router.push("/onboarding");
    }

    setMounted(true);
  }, [router]);

  const filtered = recommendations
    .filter(c => filterPlatform === "all" || c.platform === filterPlatform)
    .filter(c => c.matchScore >= filterMinScore)
    .sort((a, b) => {
      if (sortBy === "matchScore") return b.matchScore - a.matchScore;
      if (sortBy === "subscribers") return b.subscribers - a.subscribers;
      if (sortBy === "engagementRate") return b.engagementRate - a.engagementRate;
      if (sortBy === "projectedRevenue") {
        return estimateMetrics(b, productPrice).profit - estimateMetrics(a, productPrice).profit;
      }
      return b.matchScore - a.matchScore;
    });

  const avgScore = filtered.length > 0
    ? Math.round(filtered.reduce((s, c) => s + c.matchScore, 0) / filtered.length)
    : 0;
  const topScore = filtered[0]?.matchScore ?? 0;

  const source = scrapeMeta?.source ?? "unknown";
  const isLive = source === "live";
  const sourceLabel = isLive
    ? "Live Data: YouTube + Instagram APIs"
    : source === "demo"
      ? "Demo Data: Fallback Sample Profiles"
      : source === "live-empty"
        ? "No Live Data Found"
        : "Source Unknown";
  const sourceNote = scrapeMeta?.warning
    ?? (isLive ? "Results were fetched from live providers." : "These results may not be real live profiles.");

  function handleAddToCart(creator: RecommendedCreator) {
    const key = `${creator.platform}:${creator.id}`;
    if (cartKeys[key]) return;

    const existingRaw = localStorage.getItem(CREATOR_CART_KEY);
    const existing = existingRaw ? (JSON.parse(existingRaw) as CreatorCartItem[]) : [];
    if (existing.some(item => item.id === creator.id && item.platform === creator.platform)) {
      setCartKeys(prev => ({ ...prev, [key]: true }));
      return;
    }

    const next: CreatorCartItem[] = [...existing, { ...creator, addedAt: new Date().toISOString() }];
    localStorage.setItem(CREATOR_CART_KEY, JSON.stringify(next));
    setCartKeys(prev => ({ ...prev, [key]: true }));
  }

  if (!mounted) return null;

  return (
    <>
      <style>{STYLES}</style>
      <div className="rec-shell">
        {/* ── Top nav ── */}
        <nav className="rec-nav">
          <div className="nav-logo">
            <span className="nav-logo-mark">◈</span>
            <span className="nav-logo-text">CreatorOS</span>
          </div>
          <div className="nav-links">
            <button className="nav-link" onClick={() => router.push("/")}>Discovery</button>
            <button className="nav-link active">Recommendations</button>
            <button className="nav-link" onClick={() => {
              localStorage.removeItem("creator_recommendations");
              router.push("/onboarding");
            }}>New Search</button>
          </div>
        </nav>

        {/* ── Hero section ── */}
        <header className="rec-hero">
          <div className="hero-bg-orbs">
            <div className="hero-orb orb-1" /><div className="hero-orb orb-2" />
          </div>
          <div className="hero-content">
            <div className="hero-tag">AI-Powered Results</div>
            <div className={`source-tag ${isLive ? "live" : "not-live"}`}>
              {sourceLabel}
            </div>
            <h1 className="hero-title">
              {profile?.brandName
                ? <>Top matches for <span className="hero-brand">{profile.brandName}</span></>
                : "Your Creator Recommendations"}
            </h1>
            {profile && (
              <p className="hero-sub">
                Based on your {profile.industry} brand in the {profile.nicheKeywords.slice(0, 3).join(", ")} space
              </p>
            )}
            <p className={`source-sub ${isLive ? "live" : "not-live"}`}>{sourceNote}</p>
          <div className="hero-stats">
              <div className="hero-stat">
                <span className="hs-val">{recommendations.length}</span>
                <span className="hs-key">Creators Found</span>
              </div>
              <div className="hero-stat">
                <span className="hs-val">{topScore}%</span>
                <span className="hs-key">Top Match Score</span>
              </div>
              <div className="hero-stat">
                <span className="hs-val">{avgScore}%</span>
                <span className="hs-key">Avg Match Score</span>
              </div>
              <div className="hero-stat">
                <span className="hs-val">
                  {[...new Set(recommendations.map(c => c.platform))].length}
                </span>
                <span className="hs-key">Platforms</span>
              </div>
              <div className="hero-stat" style={{ borderRight: "none" }}>
                <span className="hs-val" style={{ color: "#34d399" }}>
                  {fmtCurrency(filtered.reduce((s, c) => Math.max(0, s + estimateMetrics(c, productPrice).profit), 0))}
                </span>
                <span className="hs-key">Total Est. Profit</span>
              </div>
            </div>
          </div>
        </header>

        {/* ── Filter bar ── */}
        <div className="filter-bar">
          <div className="filter-group">
            <span className="filter-label">Platform</span>
            <div className="filter-pills">
              {["all", "YouTube", "Instagram"].map(p => (
                <button key={p} className={`filter-pill ${filterPlatform === p ? "active" : ""}`}
                  onClick={() => setFilterPlatform(p)}>
                  {p === "all" ? "All" : p}
                </button>
              ))}
            </div>
          </div>
          <div className="filter-group">
            <span className="filter-label">Min Score: {filterMinScore}%</span>
            <input type="range" min={0} max={80} step={10} value={filterMinScore}
              onChange={e => setFilterMinScore(Number(e.target.value))} className="filter-range" />
          </div>
          <div className="filter-group">
            <span className="filter-label">Sort By</span>
            <select className="filter-select" value={sortBy}
              onChange={e => setSortBy(e.target.value as typeof sortBy)}>
              <option value="matchScore">Match Score</option>
              <option value="subscribers">Followers</option>
              <option value="engagementRate">Engagement Rate</option>
              <option value="projectedRevenue">💰 Est. Profit</option>
            </select>
          </div>
          <span className="filter-count">{filtered.length} results</span>
        </div>

        {/* ── Creator grid ── */}
        <main className="rec-grid">
          {filtered.length === 0 ? (
            <div className="empty-state">
              <div className="empty-icon">Search</div>
              <h3 className="empty-title">No creators match your filters</h3>
              <p className="empty-sub">Try lowering the minimum score or changing the platform filter.</p>
              <button className="empty-btn" onClick={() => { setFilterPlatform("all"); setFilterMinScore(0); }}>
                Reset Filters
              </button>
            </div>
          ) : (
            filtered.map((creator, i) => (
              <CreatorCard
                key={`${creator.platform}:${creator.id}`}
                creator={creator}
                rank={i}
                isInCart={Boolean(cartKeys[`${creator.platform}:${creator.id}`])}
                onAddToCart={handleAddToCart}
                productPrice={productPrice}
                budget={profile?.budget ?? "5k-20k"}
              />
            ))
          )}
        </main>

        {/* ── Footer CTA ── */}
        <footer className="rec-footer">
          <p className="footer-text">Want different results? Refine your search criteria.</p>
          <div className="footer-actions">
            <button className="footer-btn secondary" onClick={() => router.push("/onboarding")}>
              Refine Search
            </button>
            <button className="footer-btn primary" onClick={() => router.push("/")}>
              Browse All Creators
            </button>
          </div>
        </footer>
      </div>
    </>
  );
}

// ─── Styles ────────────────────────────────────────────────────────────────────

const STYLES = `
  @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&display=swap');
  *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
  :root {
    --bg: #0c0c0f; --surface: #13131a; --surface2: #1c1c27; --surface3: #22223a;
    --border: #2a2a3d; --border2: #3a3a55;
    --text: #e8e8f0; --muted: #6b6b8a;
    --accent: #7c5af0; --accent2: #c084fc;
    --green: #34d399; --yellow: #fbbf24; --red: #f87171;
    --radius: 14px;
  }
  body { background: var(--bg); color: var(--text); font-family: 'Inter', sans-serif; }

  /* ── Nav ── */
  .rec-nav {
    display: flex; align-items: center; justify-content: space-between;
    padding: 18px 40px; background: var(--surface);
    border-bottom: 1px solid var(--border);
    position: sticky; top: 0; z-index: 100; backdrop-filter: blur(8px);
  }
  .nav-logo { display: flex; align-items: center; gap: 10px; }
  .nav-logo-mark { font-size: 22px; color: var(--accent2); }
  .nav-logo-text { font-family: 'Inter', sans-serif; font-size: 18px; font-weight: 800; }
  .nav-links { display: flex; gap: 4px; }
  .nav-link {
    background: none; border: none; padding: 8px 16px; border-radius: 8px;
    font-size: 14px; color: var(--muted); cursor: pointer; font-family: 'Inter', sans-serif;
    transition: all 0.2s;
  }
  .nav-link:hover { color: var(--text); background: var(--surface2); }
  .nav-link.active { color: var(--accent2); background: #7c5af015; font-weight: 600; }

  /* ── Hero ── */
  .rec-hero {
    position: relative; overflow: hidden;
    padding: 64px 40px 48px; text-align: center;
    background: linear-gradient(180deg, #13131a 0%, var(--bg) 100%);
    border-bottom: 1px solid var(--border);
  }
  .hero-bg-orbs { position: absolute; inset: 0; pointer-events: none; }
  .hero-orb { position: absolute; border-radius: 50%; filter: blur(80px); }
  .hero-orb.orb-1 { width: 400px; height: 400px; background: #7c5af015; top: -100px; left: -100px; }
  .hero-orb.orb-2 { width: 300px; height: 300px; background: #c084fc10; bottom: -60px; right: -60px; }
  .hero-content { position: relative; z-index: 1; max-width: 800px; margin: 0 auto; }
  .hero-tag {
    display: inline-block; background: #7c5af020; border: 1px solid #7c5af040;
    border-radius: 99px; padding: 6px 16px; font-size: 12px; font-weight: 600;
    color: var(--accent2); letter-spacing: 0.08em; text-transform: uppercase;
    margin-bottom: 20px; animation: fadeUp 0.5s ease both;
  }
  .source-tag {
    display: inline-block;
    border-radius: 99px;
    padding: 6px 14px;
    font-size: 12px;
    font-weight: 700;
    letter-spacing: 0.04em;
    margin-bottom: 16px;
    animation: fadeUp 0.5s 0.05s ease both;
  }
  .source-tag.live {
    color: #34d399;
    border: 1px solid #34d39955;
    background: #34d39918;
  }
  .source-tag.not-live {
    color: #fbbf24;
    border: 1px solid #fbbf2455;
    background: #fbbf2418;
  }
  .hero-title {
    font-family: 'Inter', sans-serif; font-size: 44px; font-weight: 800;
    letter-spacing: -0.03em; line-height: 1.1; color: var(--text);
    margin-bottom: 14px; animation: fadeUp 0.5s 0.1s ease both;
  }
  .hero-brand {
    background: linear-gradient(90deg, var(--accent), var(--accent2));
    -webkit-background-clip: text; -webkit-text-fill-color: transparent; background-clip: text;
  }
  .hero-sub { font-size: 16px; color: var(--muted); margin-bottom: 32px; animation: fadeUp 0.5s 0.2s ease both; }
  .source-sub {
    font-size: 13px;
    margin-bottom: 20px;
    animation: fadeUp 0.5s 0.25s ease both;
  }
  .source-sub.live { color: #8ee3c2; }
  .source-sub.not-live { color: #f6cf75; }
  @keyframes fadeUp {
    from { opacity: 0; transform: translateY(16px); }
    to { opacity: 1; transform: none; }
  }
  .hero-stats {
    display: flex; justify-content: center; gap: 0;
    background: var(--surface); border: 1px solid var(--border);
    border-radius: 16px; overflow: hidden; display: inline-flex;
    animation: fadeUp 0.5s 0.3s ease both;
  }
  .hero-stat {
    display: flex; flex-direction: column; align-items: center; gap: 4px;
    padding: 20px 32px; border-right: 1px solid var(--border);
  }
  .hero-stat:last-child { border-right: none; }
  .hs-val { font-family: 'Inter', sans-serif; font-size: 28px; font-weight: 800; color: var(--accent2); }
  .hs-key { font-size: 11px; color: var(--muted); text-transform: uppercase; letter-spacing: 0.06em; }

  /* ── Filter bar ── */
  .filter-bar {
    display: flex; align-items: center; gap: 24px; flex-wrap: wrap;
    padding: 20px 40px; background: var(--surface);
    border-bottom: 1px solid var(--border); position: sticky; top: 57px; z-index: 90;
  }
  .filter-group { display: flex; align-items: center; gap: 10px; }
  .filter-label { font-size: 12px; color: var(--muted); font-weight: 600; text-transform: uppercase; letter-spacing: 0.06em; white-space: nowrap; }
  .filter-pills { display: flex; gap: 4px; }
  .filter-pill {
    padding: 6px 14px; border-radius: 99px; font-size: 13px;
    background: var(--surface2); border: 1px solid var(--border);
    color: var(--muted); cursor: pointer; transition: all 0.2s;
  }
  .filter-pill:hover { border-color: var(--accent); color: var(--text); }
  .filter-pill.active { background: var(--accent); border-color: var(--accent); color: #fff; font-weight: 600; }
  .filter-range { accent-color: var(--accent); width: 100px; cursor: pointer; }
  .filter-select {
    background: var(--surface2); border: 1px solid var(--border);
    border-radius: 8px; padding: 6px 10px; color: var(--text);
    font-size: 13px; font-family: 'Inter', sans-serif; outline: none; cursor: pointer;
  }
  .filter-count { margin-left: auto; font-size: 13px; color: var(--muted); white-space: nowrap; }

  /* ── Grid ── */
  .rec-grid {
    display: grid; grid-template-columns: repeat(auto-fill, minmax(400px, 1fr));
    gap: 20px; padding: 32px 40px; max-width: 1400px; margin: 0 auto; width: 100%;
  }

  /* ── Creator card ── */
  .creator-card {
    background: var(--surface); border: 1px solid var(--border);
    border-radius: 18px; padding: 24px;
    transition: transform 0.25s, border-color 0.25s, box-shadow 0.25s;
    position: relative; overflow: hidden;
    animation: cardIn 0.5s ease both;
  }
  @keyframes cardIn {
    from { opacity: 0; transform: translateY(20px); }
    to { opacity: 1; transform: none; }
  }
  .creator-card::before {
    content: ''; position: absolute; inset: 0; border-radius: 18px;
    background: linear-gradient(135deg, #7c5af005, transparent);
    opacity: 0; transition: opacity 0.3s;
    pointer-events: none;
  }
  .creator-card:hover {
    transform: translateY(-4px);
    border-color: var(--border2);
    box-shadow: 0 12px 40px #0009, 0 0 0 1px #7c5af020;
  }
  .creator-card:hover::before { opacity: 1; }
  .creator-card.expanded { border-color: var(--accent); }

  /* Rank badge */
  .rank-badge {
    position: absolute; top: 16px; left: 16px;
    background: var(--surface3); border: 1px solid var(--border2);
    border-radius: 99px; padding: 2px 10px; font-size: 11px; font-weight: 800;
    color: var(--muted); font-family: 'Inter', sans-serif;
  }

  /* Card header */
  .card-header {
    display: flex; align-items: flex-start; gap: 14px;
    padding-top: 8px; /* space for rank badge */
    position: relative; z-index: 1;
  }
  .card-avatar-link {
    width: 60px; height: 60px; border-radius: 50%;
    display: flex; align-items: center; justify-content: center;
    flex-shrink: 0; overflow: hidden; position: relative;
    text-decoration: none; cursor: pointer;
    transition: transform 0.2s, box-shadow 0.2s;
  }
  .card-avatar-link:hover { transform: scale(1.08); box-shadow: 0 4px 16px #0006; }
  .avatar-hover-overlay {
    position: absolute; inset: 0; border-radius: 50%;
    background: #0009; display: flex; align-items: center; justify-content: center;
    font-size: 18px; color: #fff; opacity: 0;
    transition: opacity 0.2s;
  }
  .card-avatar-link:hover .avatar-hover-overlay { opacity: 1; }
  .avatar-img { width: 100%; height: 100%; object-fit: cover; border-radius: 50%; }
  .avatar-initials {
    font-family: 'Inter', sans-serif; font-size: 18px; font-weight: 800; color: var(--text);
  }
  .card-identity { flex: 1; display: flex; flex-direction: column; gap: 5px; }
  .card-name-link { text-decoration: none; }
  .card-name {
    font-family: 'Inter', sans-serif; font-size: 17px; font-weight: 700; color: var(--text);
    transition: color 0.15s;
  }
  .card-name-link:hover .card-name { color: var(--accent2); }
  .card-handle { font-size: 13px; color: var(--muted); }
  .card-badges { display: flex; align-items: center; gap: 6px; flex-wrap: wrap; }
  .platform-badge {
    display: inline-flex; align-items: center; gap: 5px;
    border-radius: 99px; padding: 3px 10px; font-size: 11px; font-weight: 700;
    letter-spacing: 0.04em; width: fit-content;
  }
  .profile-link-badge {
    display: inline-flex; align-items: center;
    background: #7c5af015; border: 1px solid #7c5af040;
    border-radius: 99px; padding: 3px 10px; font-size: 11px; font-weight: 600;
    color: var(--accent2); text-decoration: none; letter-spacing: 0.03em;
    transition: background 0.2s, border-color 0.2s;
    position: relative; z-index: 2;
  }
  .profile-link-badge:hover { background: #7c5af030; border-color: var(--accent); }
  .cart-link-badge {
    display: inline-flex;
    align-items: center;
    background: #34d39918;
    border: 1px solid #34d39950;
    border-radius: 99px;
    padding: 3px 10px;
    font-size: 11px;
    font-weight: 600;
    color: #7ce8c1;
    letter-spacing: 0.03em;
    cursor: pointer;
    transition: background 0.2s, border-color 0.2s, opacity 0.2s;
  }
  .cart-link-badge:hover { background: #34d3992c; border-color: #34d39985; }
  .cart-link-badge.in-cart { opacity: 0.72; cursor: not-allowed; }
  .score-section { display: flex; flex-direction: column; align-items: center; gap: 4px; flex-shrink: 0; }
  .score-ring-wrap { position: relative; }
  .score-svg { display: block; }
  .score-ring-inner {
    position: absolute; inset: 0; display: flex; align-items: center;
    justify-content: center; gap: 1px;
  }
  .score-num { font-family: 'Inter', sans-serif; font-size: 18px; font-weight: 800; }
  .score-pct { font-size: 10px; color: var(--muted); margin-top: 2px; }
  .score-label { font-size: 11px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.06em; }

  /* Stats */
  .stats-row {
    display: flex; align-items: center; margin: 18px 0 14px;
    background: var(--surface2); border-radius: 10px; padding: 12px 0;
  }
  .stat-cell { flex: 1; display: flex; flex-direction: column; align-items: center; gap: 2px; }
  .stat-val { font-family: 'Inter', sans-serif; font-size: 15px; font-weight: 800; color: var(--text); }
  .stat-key { font-size: 10px; color: var(--muted); text-transform: uppercase; letter-spacing: 0.06em; }
  .stat-divider { width: 1px; height: 30px; background: var(--border); flex-shrink: 0; }

  /* Explanation */
  .card-explanation {
    font-size: 13px; color: var(--muted); line-height: 1.65;
    margin-bottom: 16px; display: -webkit-box;
    -webkit-line-clamp: 3; -webkit-box-orient: vertical; overflow: hidden;
  }
  .creator-card.expanded .card-explanation { -webkit-line-clamp: unset; overflow: visible; }

  /* Expand button */
  .expand-btn {
    display: flex; align-items: center; justify-content: space-between;
    width: 100%; background: none; border: 1px solid var(--border);
    border-radius: 8px; padding: 10px 14px; cursor: pointer;
    font-size: 13px; color: var(--muted); font-family: 'Inter', sans-serif;
    transition: all 0.2s;
  }
  .expand-btn:hover { border-color: var(--accent); color: var(--accent2); background: #7c5af010; }
  .expand-chevron { font-size: 16px; transition: transform 0.25s; display: inline-block; }
  .expand-chevron.open { transform: rotate(180deg); }

  /* Expanded content */
  .expanded-content {
    margin-top: 16px; display: flex; flex-direction: column; gap: 16px;
    animation: expandIn 0.3s ease;
  }
  @keyframes expandIn {
    from { opacity: 0; transform: translateY(-8px); }
    to { opacity: 1; transform: none; }
  }

  /* Why section */
  .why-section, .breakdown-section { display: flex; flex-direction: column; gap: 10px; }
  .why-title {
    font-family: 'Inter', sans-serif; font-size: 12px; font-weight: 700;
    text-transform: uppercase; letter-spacing: 0.1em; color: var(--muted);
  }
  .why-list { display: flex; flex-direction: column; gap: 8px; list-style: none; }
  .why-item { display: flex; align-items: flex-start; gap: 8px; font-size: 13px; color: var(--text); line-height: 1.5; }
  .why-dot { color: var(--accent2); font-size: 8px; margin-top: 5px; flex-shrink: 0; }

  /* Breakdown bars */
  .breakdown-bars { display: flex; flex-direction: column; gap: 8px; }
  .bd-row { display: flex; align-items: center; gap: 10px; }
  .bd-label { font-size: 12px; color: var(--muted); width: 90px; flex-shrink: 0; }
  .bd-track { flex: 1; height: 6px; background: var(--surface2); border-radius: 99px; overflow: hidden; }
  .bd-fill {
    height: 100%; border-radius: 99px;
    background: linear-gradient(90deg, var(--accent), var(--accent2));
    transition: width 0.6s cubic-bezier(.4,0,.2,1);
  }
  .bd-val { font-size: 11px; color: var(--muted); width: 36px; text-align: right; flex-shrink: 0; }

  /* Niche tags */
  .niche-tags { display: flex; gap: 6px; flex-wrap: wrap; }
  .niche-tag {
    background: #7c5af015; border: 1px solid #7c5af030;
    border-radius: 99px; padding: 3px 10px; font-size: 11px; color: var(--accent2);
  }

  /* Card actions */
  .card-actions { display: flex; gap: 8px; }
  .action-btn {
    padding: 9px 18px; border-radius: 8px; font-size: 13px; font-weight: 600;
    cursor: pointer; font-family: 'Inter', sans-serif; transition: all 0.2s;
    text-decoration: none; display: inline-flex; align-items: center;
  }
  .action-btn.primary {
    background: linear-gradient(135deg, var(--accent), #a855f7);
    border: none; color: #fff;
  }
  .action-btn.primary:hover { opacity: 0.85; transform: translateY(-1px); }
  .action-btn.secondary {
    background: none; border: 1px solid var(--border); color: var(--muted);
  }
  .action-btn.secondary:hover { border-color: var(--border2); color: var(--text); }
  .action-btn.tertiary {
    background: #34d39918;
    border: 1px solid #34d39950;
    color: #7ce8c1;
  }
  .action-btn.tertiary:hover { border-color: #34d39985; color: #a8f5da; }
  .action-btn.tertiary.in-cart {
    opacity: 0.7;
    cursor: not-allowed;
  }

  /* ── Empty state ── */
  .empty-state {
    grid-column: 1 / -1; display: flex; flex-direction: column; align-items: center;
    gap: 16px; padding: 80px 40px; text-align: center;
  }
  .empty-icon { font-size: 48px; }
  .empty-title { font-family: 'Inter', sans-serif; font-size: 22px; font-weight: 700; }
  .empty-sub { font-size: 14px; color: var(--muted); max-width: 360px; }
  .empty-btn {
    background: var(--accent); border: none; border-radius: 10px;
    padding: 10px 24px; color: #fff; font-size: 14px; font-weight: 600;
    cursor: pointer; transition: opacity 0.2s; font-family: 'Inter', sans-serif;
  }
  .empty-btn:hover { opacity: 0.85; }

  /* ── Footer ── */
  .rec-footer {
    display: flex; align-items: center; justify-content: space-between; flex-wrap: wrap; gap: 16px;
    padding: 32px 40px; border-top: 1px solid var(--border);
    background: var(--surface);
  }
  .footer-text { font-size: 14px; color: var(--muted); }
  .footer-actions { display: flex; gap: 10px; }
  .footer-btn {
    padding: 10px 20px; border-radius: 10px; font-size: 14px; font-weight: 600;
    cursor: pointer; font-family: 'Inter', sans-serif; transition: all 0.2s;
  }
  .footer-btn.primary {
    background: linear-gradient(135deg, var(--accent), #a855f7);
    border: none; color: #fff;
  }
  .footer-btn.primary:hover { opacity: 0.85; transform: translateY(-1px); }
  .footer-btn.secondary {
    background: none; border: 1px solid var(--border); color: var(--muted);
  }
  .footer-btn.secondary:hover { border-color: var(--border2); color: var(--text); }

  /* ── Profit Badge ── */
  .profit-badge {
    display: flex; align-items: center; justify-content: space-between;
    border-radius: 10px; padding: 12px 14px;
    margin-bottom: 8px;
  }
  .pb-main { display: flex; flex-direction: column; gap: 2px; }
  .pb-money {
    font-size: 20px; font-weight: 800;
  }
  .pb-sub { font-size: 10px; color: var(--muted); text-transform: uppercase; letter-spacing: 0.06em; font-weight: 700; }
  .pb-details {
    display: flex; flex-direction: column; gap: 2px;
    margin-left: auto; margin-right: 16px;
  }
  .pb-row { display: flex; gap: 6px; font-size: 11px; }
  .pb-label { color: var(--muted); }
  .pb-val { color: var(--text); font-weight: 600; }
  .pb-roi {
    border-radius: 8px; padding: 6px 12px;
    font-size: 13px; font-weight: 800;
    letter-spacing: 0.04em;
  }

  /* ── Mini Bar Chart ── */
  .mini-bar-chart {
    display: flex; align-items: flex-end; gap: 6px;
    height: 64px; padding: 8px;
    background: var(--surface2); border-radius: 10px; margin-bottom: 8px;
  }
  .mini-bar-col { display: flex; flex-direction: column; align-items: center; gap: 4px; flex: 1; }
  .mini-bar-track {
    display: flex; align-items: flex-end; justify-content: center;
    height: 48px; width: 100%;
  }
  .mini-bar-fill {
    width: 70%; border-radius: 3px 3px 0 0;
    transition: height 0.6s cubic-bezier(.4,0,.2,1);
    min-height: 4px;
  }
  .mini-bar-label { font-size: 9px; color: var(--muted); text-transform: uppercase; letter-spacing: 0.04em; }

  @media (max-width: 768px) {
    .rec-hero { padding: 40px 20px 32px; }
    .hero-title { font-size: 28px; }
    .hero-stats { flex-wrap: wrap; }
    .hero-stat { padding: 14px 20px; }
    .filter-bar { padding: 16px 20px; flex-direction: column; align-items: flex-start; }
    .rec-grid { grid-template-columns: 1fr; padding: 20px; }
    .rec-nav { padding: 14px 20px; }
    .rec-footer { flex-direction: column; padding: 24px 20px; }
  }
`;

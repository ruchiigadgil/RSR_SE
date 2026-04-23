"use client";

import { useState, useMemo, useEffect } from "react";
import { useRouter } from "next/navigation";

// ── Types ──────────────────────────────────────────────────────────────────
type Platform = "Instagram" | "YouTube" | "Twitter" | "LinkedIn" | "Facebook";
type Gender = "All" | "Male" | "Female" | "Non-binary";

interface Creator {
  id: number;
  name: string;
  handle: string;
  avatar: string;
  platforms: Platform[];
  niche: string;
  followers: number;
  engagementRate: number;
  audienceLocation: string;
  audienceAge: string;
  audienceGender: Gender;
  sentimentScore: number;
  pastCollaborations: string[];
  verified: boolean;
}

// ── Mock Data ──────────────────────────────────────────────────────────────
const MOCK_CREATORS: Creator[] = [
  {
    id: 1,
    name: "Rohana Mahimkar",
    handle: "@drivewithroro",
    avatar: "PS",
    platforms: ["Instagram", "YouTube"],
    niche: "Driving",
    followers: 820000,
    engagementRate: 6.4,
    audienceLocation: "India",
    audienceAge: "18-24",
    audienceGender: "Female",
    sentimentScore: 91,
    pastCollaborations: ["Nykaa", "Mamaearth"],
    verified: true,
  },
  {
    id: 2,
    name: "Ruchi Gadgil",
    handle: "@musicallygulu",
    avatar: "RV",
    platforms: ["Instagram", "YouTube"],
    niche: "Music, Dance",
    followers: 430000,
    engagementRate: 8.1,
    audienceLocation: "India",
    audienceAge: "18-34",
    audienceGender: "Female",
    sentimentScore: 87,
    pastCollaborations: ["MuscleBlaze"],
    verified: true,
  },
  {
    id: 3,
    name: "Sania Valiyani",
    handle: "@sanialifestyle",
    avatar: "SK",
    platforms: ["Instagram", "Facebook"],
    niche: "Lifestyle & Nails",
    followers: 1200000,
    engagementRate: 3.9,
    audienceLocation: "India",
    audienceAge: "25-34",
    audienceGender: "Female",
    sentimentScore: 78,
    pastCollaborations: ["H&M", "Myntra", "Zara"],
    verified: true,
  },
  {
    id: 4,
    name: "Ridhi Agrawal",
    handle: "@trek_pe_aa_jaao",
    avatar: "AM",
    platforms: ["YouTube", "Twitter", "LinkedIn"],
    niche: "Fitness and Yoga",
    followers: 560000,
    engagementRate: 5.2,
    audienceLocation: "India",
    audienceAge: "18-34",
    audienceGender: "Male",
    sentimentScore: 84,
    pastCollaborations: ["boAt", "realme"],
    verified: false,
  },
  {
    id: 5,
    name: "Yash Thakkar",
    handle: "@yashcooks",
    avatar: "KN",
    platforms: ["Instagram", "YouTube"],
    niche: "Food & Cooking",
    followers: 290000,
    engagementRate: 9.3,
    audienceLocation: "India",
    audienceAge: "25-44",
    audienceGender: "Male",
    sentimentScore: 95,
    pastCollaborations: ["Lijjat", "MTR"],
    verified: true,
  },
  {
    id: 6,
    name: "Rajas Rege",
    handle: "@kaidi_number_420",
    avatar: "DA",
    platforms: ["Instagram", "Facebook", "Twitter"],
    niche: "chori chori chupke chupke",
    followers: 1,
    engagementRate: 0.7,
    audienceLocation: "Pakistan",
    audienceAge: "80 - 90",
    audienceGender: "Female",
    sentimentScore: 82,
    pastCollaborations: ["Central Jail", "OYO"],
    verified: false,
  },
  {
    id: 7,
    name: "Rishi Panchal",
    handle: "@bhaadmeijaao",
    avatar: "IR",
    platforms: ["Instagram", "Twitter"],
    niche: "I am the almighty",
    followers: 145000,
    engagementRate: 11.2,
    audienceLocation: "India",
    audienceAge: "18-24",
    audienceGender: "Female",
    sentimentScore: 97,
    pastCollaborations: [],
    verified: false,
  },
  {
    id: 8,
    name: "Sachhidananda Mahapatro",
    handle: "@soo_jaao_bhai",
    avatar: "MD",
    platforms: ["YouTube", "Twitter"],
    niche: "Cooding",
    followers: 2100000,
    engagementRate: 2.8,
    audienceLocation: "India",
    audienceAge: "13-24",
    audienceGender: "Male",
    sentimentScore: 73,
    pastCollaborations: ["Corsair", "AMD"],
    verified: true,
  },
  {
    id: 9,
    name: "John Smith",
    handle: "@cant_think",
    avatar: "RJ",
    platforms: ["Instagram"],
    niche: "I don't know",
    followers: 320000,
    engagementRate: 7.6,
    audienceLocation: "India",
    audienceAge: "25-44",
    audienceGender: "Female",
    sentimentScore: 93,
    pastCollaborations: ["Himalaya"],
    verified: true,
  },
];

const PLATFORMS: Platform[] = ["Instagram", "YouTube", "Twitter", "LinkedIn", "Facebook"];
const NICHES = ["All", "Beauty & Skincare", "Fitness & Health", "Lifestyle & Fashion", "Technology & Gadgets", "Food & Cooking", "Travel & Adventure", "Books & Education", "Gaming & Esports", "Wellness & Yoga"];
const AGE_GROUPS = ["All", "13-24", "18-24", "18-34", "25-34", "25-44"];
const LOCATIONS = ["All", "India", "USA", "UK", "UAE"];

// ── Helpers ────────────────────────────────────────────────────────────────
const fmtFollowers = (n: number) =>
  n >= 1_000_000 ? `${(n / 1_000_000).toFixed(1)}M` : `${(n / 1000).toFixed(0)}K`;

const platformColors: Record<Platform, string> = {
  Instagram: "#E1306C",
  YouTube: "#FF0000",
  Twitter: "#1DA1F2",
  LinkedIn: "#0A66C2",
  Facebook: "#1877F2",
};

const platformIcons: Record<Platform, string> = {
  Instagram: "IG",
  YouTube: "YT",
  Twitter: "TW",
  LinkedIn: "LI",
  Facebook: "FB",
};

const sentimentColor = (s: number) =>
  s >= 85 ? "#22c55e" : s >= 70 ? "#f59e0b" : "#ef4444";

const AVATAR_PALETTE = [
  "#c084fc", "#818cf8", "#34d399", "#fb923c",
  "#f472b6", "#38bdf8", "#a3e635", "#fbbf24",
];
const avatarColor = (id: number) => AVATAR_PALETTE[id % AVATAR_PALETTE.length];

function getCreatorProfileUrl(c: Creator): string {
  const slug = c.handle.replace(/^@/, "").trim();
  const primary = c.platforms[0];

  if (!slug) return "#";

  if (primary === "Instagram") return `https://www.instagram.com/${slug}`;
  if (primary === "YouTube") return `https://www.youtube.com/@${slug}`;
  if (primary === "Twitter") return `https://x.com/${slug}`;
  if (primary === "LinkedIn") return `https://www.linkedin.com/in/${slug}`;
  return `https://www.facebook.com/${slug}`;
}

// ══════════════════════════════════════════════════════════════════════════
// MAIN PAGE
// ══════════════════════════════════════════════════════════════════════════
export default function CreatorDiscoveryPage() {
  const router = useRouter();

  // ── Auth guard ─────────────────────────────────────────────────────────
  const [authChecked, setAuthChecked] = useState(false);
  useEffect(() => {
    const isLoggedIn = localStorage.getItem("auth_token");
    if (!isLoggedIn) { router.push("/auth"); } else { setAuthChecked(true); }
  }, [router]);
  // ───────────────────────────────────────────────────────────────────────

  // filters
  const [search, setSearch] = useState("");
  const [selectedPlatforms, setSelectedPlatforms] = useState<Platform[]>([]);
  const [selectedNiche, setSelectedNiche] = useState("All");
  const [minEngagement, setMinEngagement] = useState(0);
  const [maxFollowers, setMaxFollowers] = useState(5_000_000);
  const [minFollowers, setMinFollowers] = useState(0);
  const [selectedAge, setSelectedAge] = useState("All");
  const [selectedLocation, setSelectedLocation] = useState("All");

  // UI state
  const [selectedCreator, setSelectedCreator] = useState<Creator | null>(null);
  const [page, setPage] = useState(1);
  const PER_PAGE = 6;

  const togglePlatform = (p: Platform) =>
    setSelectedPlatforms((prev) =>
      prev.includes(p) ? prev.filter((x) => x !== p) : [...prev, p]
    );

  const filtered = useMemo(() => {
    return MOCK_CREATORS.filter((c) => {
      if (search && !c.name.toLowerCase().includes(search.toLowerCase()) &&
          !c.handle.toLowerCase().includes(search.toLowerCase()) &&
          !c.niche.toLowerCase().includes(search.toLowerCase())) return false;
      if (selectedPlatforms.length && !selectedPlatforms.some((p) => c.platforms.includes(p))) return false;
      if (selectedNiche !== "All" && c.niche !== selectedNiche) return false;
      if (c.engagementRate < minEngagement) return false;
      if (c.followers < minFollowers || c.followers > maxFollowers) return false;
      if (selectedAge !== "All" && c.audienceAge !== selectedAge) return false;
      if (selectedLocation !== "All" && c.audienceLocation !== selectedLocation) return false;
      return true;
    });
  }, [search, selectedPlatforms, selectedNiche, minEngagement, minFollowers, maxFollowers, selectedAge, selectedLocation]);

  const totalPages = Math.ceil(filtered.length / PER_PAGE);
  const paginated = filtered.slice((page - 1) * PER_PAGE, page * PER_PAGE);

  const resetFilters = () => {
    setSearch(""); setSelectedPlatforms([]); setSelectedNiche("All");
    setMinEngagement(0); setMinFollowers(0); setMaxFollowers(5_000_000);
    setSelectedAge("All"); setSelectedLocation("All"); setPage(1);
  };

  if (!authChecked) return <div style={{ background: "#0c0c0f", minHeight: "100vh" }} />;

  return (
    <>
      <style>{STYLES}</style>
      <div className="page-shell">

        {/* ── Sidebar Filters ── */}
        <aside className="sidebar">
          <div className="sidebar-header">
            <span className="sidebar-title">Filters</span>
            <button className="reset-btn" onClick={resetFilters}>Reset all</button>
          </div>

          <div className="filter-block">
            <label className="filter-label">Search</label>
            <input
              className="filter-input"
              placeholder="Name, handle, niche…"
              value={search}
              onChange={(e) => { setSearch(e.target.value); setPage(1); }}
            />
          </div>

          <div className="filter-block">
            <label className="filter-label">Platform</label>
            <div className="platform-grid">
              {PLATFORMS.map((p) => (
                <button
                  key={p}
                  className={`platform-chip ${selectedPlatforms.includes(p) ? "active" : ""}`}
                  style={selectedPlatforms.includes(p) ? { borderColor: platformColors[p], background: platformColors[p] + "22", color: platformColors[p] } : {}}
                  onClick={() => { togglePlatform(p); setPage(1); }}
                >
                  {platformIcons[p]}
                </button>
              ))}
            </div>
          </div>

          <div className="filter-block">
            <label className="filter-label">Niche</label>
            <select className="filter-select" value={selectedNiche}
              onChange={(e) => { setSelectedNiche(e.target.value); setPage(1); }}>
              {NICHES.map((n) => <option key={n}>{n}</option>)}
            </select>
          </div>

          <div className="filter-block">
            <label className="filter-label">Min. Engagement Rate</label>
            <div className="range-row">
              <input type="range" min={0} max={15} step={0.5} value={minEngagement}
                onChange={(e) => { setMinEngagement(Number(e.target.value)); setPage(1); }}
                className="range-slider" />
              <span className="range-val">{minEngagement}%</span>
            </div>
          </div>

          <div className="filter-block">
            <label className="filter-label">Follower Range</label>
            <div className="follower-inputs">
              <input className="filter-input small" placeholder="Min" type="number"
                value={minFollowers || ""} onChange={(e) => { setMinFollowers(Number(e.target.value)); setPage(1); }} />
              <span className="sep">–</span>
              <input className="filter-input small" placeholder="Max" type="number"
                value={maxFollowers === 5_000_000 ? "" : maxFollowers}
                onChange={(e) => { setMaxFollowers(e.target.value ? Number(e.target.value) : 5_000_000); setPage(1); }} />
            </div>
          </div>

          <div className="filter-block">
            <label className="filter-label">Audience Age</label>
            <select className="filter-select" value={selectedAge}
              onChange={(e) => { setSelectedAge(e.target.value); setPage(1); }}>
              {AGE_GROUPS.map((a) => <option key={a}>{a}</option>)}
            </select>
          </div>

          <div className="filter-block">
            <label className="filter-label">Audience Location</label>
            <select className="filter-select" value={selectedLocation}
              onChange={(e) => { setSelectedLocation(e.target.value); setPage(1); }}>
              {LOCATIONS.map((l) => <option key={l}>{l}</option>)}
            </select>
          </div>
        </aside>

        {/* ── Main Content ── */}
        <main className="main-area">
          <header className="main-header">
            <div>
              <h1 className="page-title">Creator Discovery</h1>
              <p className="page-sub">{filtered.length} creators found</p>
            </div>
            <button
              className="ai-rec-btn"
              onClick={() => {
                const hasRec = localStorage.getItem("creator_recommendations");
                router.push(hasRec ? "/recommendations" : "/onboarding");
              }}
            >
              ✦ AI Recommendations
            </button>
          </header>

          {filtered.length === 0 ? (
            <div className="empty-state">
              <span className="empty-icon">◎</span>
              <p>No creators found matching your filters.</p>
              <button className="reset-btn-lg" onClick={resetFilters}>Clear filters</button>
            </div>
          ) : (
            <>
              <div className="card-grid">
                {paginated.map((c) => (
                  <CreatorCard key={c.id} creator={c} onSelect={setSelectedCreator} />
                ))}
              </div>
              {totalPages > 1 && (
                <div className="pagination">
                  <button className="page-btn" disabled={page === 1} onClick={() => setPage(page - 1)}>← Prev</button>
                  <span className="page-info">Page {page} of {totalPages}</span>
                  <button className="page-btn" disabled={page === totalPages} onClick={() => setPage(page + 1)}>Next →</button>
                </div>
              )}
            </>
          )}
        </main>

        {selectedCreator && (
          <CreatorDrawer creator={selectedCreator} onClose={() => setSelectedCreator(null)} />
        )}
      </div>
    </>
  );
}

// ══════════════════════════════════════════════════════════════════════════
// CREATOR CARD
// ══════════════════════════════════════════════════════════════════════════
function CreatorCard({ creator: c, onSelect }: { creator: Creator; onSelect: (c: Creator) => void }) {
  return (
    <div className="creator-card" onClick={() => onSelect(c)}>
      <div className="card-top">
        <div className="avatar" style={{ background: avatarColor(c.id) }}>{c.avatar}</div>
        <div className="card-id">
          <div className="creator-name">
            {c.name}
            {c.verified && <span className="verified-badge" title="Verified">✓</span>}
          </div>
          <div className="creator-handle">{c.handle}</div>
          <div className="niche-tag">{c.niche}</div>
        </div>
      </div>
      <div className="platform-row">
        {c.platforms.map((p) => (
          <span key={p} className="platform-dot" style={{ background: platformColors[p] + "22", color: platformColors[p], border: `1px solid ${platformColors[p]}44` }}>
            {platformIcons[p]}
          </span>
        ))}
      </div>
      <div className="metrics-row">
        <div className="metric">
          <span className="metric-val">{fmtFollowers(c.followers)}</span>
          <span className="metric-key">Followers</span>
        </div>
        <div className="metric">
          <span className="metric-val" style={{ color: c.engagementRate >= 5 ? "#22c55e" : c.engagementRate >= 3 ? "#f59e0b" : "#ef4444" }}>
            {c.engagementRate}%
          </span>
          <span className="metric-key">Engagement</span>
        </div>
        <div className="metric">
          <span className="metric-val" style={{ color: sentimentColor(c.sentimentScore) }}>{c.sentimentScore}</span>
          <span className="metric-key">Sentiment</span>
        </div>
      </div>
      <div className="audience-row">
        <span className="aud-tag">📍 {c.audienceLocation}</span>
        <span className="aud-tag">🎂 {c.audienceAge}</span>
        <span className="aud-tag">👤 {c.audienceGender}</span>
      </div>
      <a
        className="view-profile-btn"
        href={getCreatorProfileUrl(c)}
        target="_blank"
        rel="noopener noreferrer"
        onClick={(e) => e.stopPropagation()}
      >
        View Profile →
      </a>
    </div>
  );
}

// ══════════════════════════════════════════════════════════════════════════
// CREATOR PROFILE DRAWER
// ══════════════════════════════════════════════════════════════════════════
function CreatorDrawer({ creator: c, onClose }: { creator: Creator; onClose: () => void }) {
  return (
    <div className="drawer-overlay" onClick={onClose}>
      <aside className="drawer" onClick={(e) => e.stopPropagation()}>
        <button className="drawer-close" onClick={onClose}>✕</button>
        <div className="drawer-hero">
          <div className="drawer-avatar" style={{ background: avatarColor(c.id) }}>{c.avatar}</div>
          <div>
            <h2 className="drawer-name">
              {c.name}
              {c.verified && <span className="verified-badge large">✓ Verified</span>}
            </h2>
            <p className="drawer-handle">{c.handle}</p>
            <span className="drawer-niche">{c.niche}</span>
          </div>
        </div>
        <div className="drawer-platforms">
          {c.platforms.map((p) => (
            <span key={p} className="platform-full" style={{ background: platformColors[p] + "18", color: platformColors[p], border: `1px solid ${platformColors[p]}55` }}>
              {platformIcons[p]} · {p}
            </span>
          ))}
        </div>
        <div className="drawer-section-title">Performance Metrics</div>
        <div className="drawer-metrics">
          {[
            { label: "Followers", value: fmtFollowers(c.followers), color: "#a78bfa" },
            { label: "Engagement Rate", value: `${c.engagementRate}%`, color: c.engagementRate >= 5 ? "#22c55e" : "#f59e0b" },
            { label: "Sentiment Score", value: `${c.sentimentScore}/100`, color: sentimentColor(c.sentimentScore) },
          ].map((m) => (
            <div key={m.label} className="drawer-metric-box">
              <span className="dmb-val" style={{ color: m.color }}>{m.value}</span>
              <span className="dmb-key">{m.label}</span>
            </div>
          ))}
        </div>
        <div className="drawer-section-title">Audience Demographics</div>
        <div className="demo-grid">
          <div className="demo-item"><span className="demo-icon">📍</span><div><p className="demo-key">Location</p><p className="demo-val">{c.audienceLocation}</p></div></div>
          <div className="demo-item"><span className="demo-icon">🎂</span><div><p className="demo-key">Age Group</p><p className="demo-val">{c.audienceAge}</p></div></div>
          <div className="demo-item"><span className="demo-icon">👤</span><div><p className="demo-key">Gender</p><p className="demo-val">{c.audienceGender}</p></div></div>
        </div>
        <div className="drawer-section-title">Past Collaborations</div>
        {c.pastCollaborations.length > 0 ? (
          <div className="collab-list">
            {c.pastCollaborations.map((brand) => (
              <span key={brand} className="collab-tag">{brand}</span>
            ))}
          </div>
        ) : (
          <p className="no-collab">No past collaborations on record.</p>
        )}
        <button className="contact-btn">💬 Start Collaboration</button>
      </aside>
    </div>
  );
}

// ══════════════════════════════════════════════════════════════════════════
// STYLES
// ══════════════════════════════════════════════════════════════════════════
const STYLES = `
  @import url('https://fonts.googleapis.com/css2?family=Syne:wght@400;600;700;800&family=DM+Sans:wght@300;400;500&display=swap');

  *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }

  :root {
    --bg: #0c0c0f;
    --surface: #13131a;
    --surface2: #1c1c27;
    --border: #2a2a3d;
    --text: #e8e8f0;
    --muted: #6b6b8a;
    --accent: #7c5af0;
    --accent2: #c084fc;
    --radius: 14px;
  }

  body { background: var(--bg); color: var(--text); font-family: 'DM Sans', sans-serif; }

  .page-shell {
    display: grid;
    grid-template-columns: 280px 1fr;
    min-height: 100vh;
    position: relative;
  }

  .sidebar {
    background: var(--surface);
    border-right: 1px solid var(--border);
    padding: 28px 20px;
    position: sticky;
    top: 0;
    height: 100vh;
    overflow-y: auto;
  }
  .sidebar::-webkit-scrollbar { width: 4px; }
  .sidebar::-webkit-scrollbar-thumb { background: var(--border); border-radius: 4px; }

  .sidebar-header {
    display: flex; align-items: center;
    justify-content: space-between; margin-bottom: 24px;
  }
  .sidebar-title {
    font-family: 'Syne', sans-serif; font-size: 18px;
    font-weight: 700; letter-spacing: 0.04em; color: var(--text);
  }
  .reset-btn {
    font-size: 12px; color: var(--muted); background: none; border: none;
    cursor: pointer; text-decoration: underline;
    font-family: 'DM Sans', sans-serif; transition: color 0.2s;
  }
  .reset-btn:hover { color: var(--accent2); }

  .filter-block { margin-bottom: 22px; }
  .filter-label {
    display: block; font-size: 11px; font-weight: 600;
    text-transform: uppercase; letter-spacing: 0.1em;
    color: var(--muted); margin-bottom: 8px;
  }
  .filter-input {
    width: 100%; background: var(--surface2); border: 1px solid var(--border);
    border-radius: 8px; padding: 9px 12px; color: var(--text);
    font-family: 'DM Sans', sans-serif; font-size: 14px; outline: none;
    transition: border-color 0.2s;
  }
  .filter-input:focus { border-color: var(--accent); }
  .filter-input.small { width: calc(50% - 10px); }

  .filter-select {
    width: 100%; background: var(--surface2); border: 1px solid var(--border);
    border-radius: 8px; padding: 9px 12px; color: var(--text);
    font-family: 'DM Sans', sans-serif; font-size: 14px; outline: none; cursor: pointer;
  }
  .filter-select:focus { border-color: var(--accent); }

  .platform-grid { display: flex; gap: 8px; flex-wrap: wrap; }
  .platform-chip {
    padding: 5px 10px; border-radius: 6px; border: 1px solid var(--border);
    background: var(--surface2); color: var(--muted); font-size: 11px;
    font-weight: 700; cursor: pointer; transition: all 0.15s; letter-spacing: 0.05em;
  }
  .platform-chip:hover { border-color: var(--accent); color: var(--accent2); }

  .range-row { display: flex; align-items: center; gap: 12px; }
  .range-slider { flex: 1; accent-color: var(--accent); height: 4px; cursor: pointer; }
  .range-val { font-size: 13px; color: var(--accent2); font-weight: 600; min-width: 36px; }

  .follower-inputs { display: flex; align-items: center; gap: 8px; }
  .sep { color: var(--muted); }

  .main-area { padding: 32px 36px; }
  .main-header {
    display: flex; align-items: flex-start;
    justify-content: space-between; margin-bottom: 28px;
  }
  .page-title {
    font-family: 'Syne', sans-serif; font-size: 28px;
    font-weight: 800; letter-spacing: -0.02em; color: var(--text);
  }
  .page-sub { font-size: 14px; color: var(--muted); margin-top: 4px; }
  .ai-rec-btn {
    display: flex; align-items: center; gap: 8px;
    background: linear-gradient(135deg, #7c5af0, #c084fc);
    border: none; border-radius: 10px; padding: 10px 20px;
    color: #fff; font-family: 'Syne', sans-serif; font-size: 13px; font-weight: 700;
    cursor: pointer; letter-spacing: 0.02em; white-space: nowrap;
    transition: opacity 0.2s, transform 0.15s, box-shadow 0.2s;
    box-shadow: 0 2px 16px #7c5af040;
  }
  .ai-rec-btn:hover { opacity: 0.88; transform: translateY(-1px); box-shadow: 0 4px 24px #7c5af060; }

  .card-grid {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(290px, 1fr));
    gap: 20px;
  }

  .creator-card {
    background: var(--surface); border: 1px solid var(--border);
    border-radius: var(--radius); padding: 22px; cursor: pointer;
    transition: transform 0.18s, border-color 0.18s, box-shadow 0.18s;
    display: flex; flex-direction: column; gap: 14px;
  }
  .creator-card:hover {
    transform: translateY(-3px); border-color: var(--accent);
    box-shadow: 0 8px 32px #7c5af022;
  }

  .card-top { display: flex; gap: 14px; align-items: flex-start; }
  .avatar {
    width: 48px; height: 48px; border-radius: 12px;
    display: flex; align-items: center; justify-content: center;
    font-family: 'Syne', sans-serif; font-weight: 800; font-size: 14px;
    color: #fff; flex-shrink: 0;
  }
  .card-id { flex: 1; min-width: 0; }
  .creator-name {
    font-family: 'Syne', sans-serif; font-size: 15px; font-weight: 700;
    display: flex; align-items: center; gap: 6px;
    white-space: nowrap; overflow: hidden; text-overflow: ellipsis;
  }
  .verified-badge {
    display: inline-flex; align-items: center; justify-content: center;
    background: #7c5af033; color: var(--accent2); border-radius: 50%;
    width: 17px; height: 17px; font-size: 9px; font-weight: 700; flex-shrink: 0;
  }
  .verified-badge.large { width: auto; border-radius: 20px; padding: 2px 8px; font-size: 11px; }
  .creator-handle { font-size: 12px; color: var(--muted); margin-top: 2px; }
  .niche-tag {
    display: inline-block; margin-top: 5px; font-size: 11px;
    background: var(--surface2); border: 1px solid var(--border);
    border-radius: 4px; padding: 2px 7px; color: var(--muted);
  }

  .platform-row { display: flex; gap: 6px; flex-wrap: wrap; }
  .platform-dot { font-size: 10px; font-weight: 700; padding: 3px 7px; border-radius: 5px; letter-spacing: 0.04em; }

  .metrics-row { display: grid; grid-template-columns: repeat(3, 1fr); gap: 8px; }
  .metric {
    background: var(--surface2); border-radius: 8px; padding: 10px 8px;
    text-align: center; display: flex; flex-direction: column; gap: 3px;
  }
  .metric-val { font-family: 'Syne', sans-serif; font-size: 15px; font-weight: 700; }
  .metric-key { font-size: 10px; color: var(--muted); }

  .audience-row { display: flex; gap: 6px; flex-wrap: wrap; }
  .aud-tag {
    font-size: 11px; color: var(--muted); background: var(--surface2);
    padding: 3px 8px; border-radius: 20px; border: 1px solid var(--border);
  }

  .view-profile-btn {
    width: 100%; background: var(--accent); border: none; border-radius: 8px;
    padding: 10px; color: #fff; font-family: 'DM Sans', sans-serif;
    font-size: 13px; font-weight: 600; cursor: pointer;
    transition: background 0.2s; margin-top: 2px;
  }
  .view-profile-btn:hover { background: #6344d4; }

  .pagination {
    display: flex; align-items: center; justify-content: center;
    gap: 16px; margin-top: 32px; padding-top: 20px; border-top: 1px solid var(--border);
  }
  .page-btn {
    background: var(--surface); border: 1px solid var(--border); border-radius: 8px;
    padding: 8px 18px; color: var(--text); font-family: 'DM Sans', sans-serif;
    font-size: 13px; cursor: pointer; transition: all 0.15s;
  }
  .page-btn:disabled { opacity: 0.35; cursor: not-allowed; }
  .page-btn:not(:disabled):hover { border-color: var(--accent); color: var(--accent2); }
  .page-info { font-size: 13px; color: var(--muted); }

  .empty-state {
    text-align: center; padding: 80px 20px; color: var(--muted);
    font-size: 15px; display: flex; flex-direction: column; align-items: center; gap: 12px;
  }
  .empty-icon { font-size: 40px; }
  .reset-btn-lg {
    background: var(--accent); border: none; border-radius: 8px;
    padding: 10px 22px; color: #fff; font-family: 'DM Sans', sans-serif;
    font-size: 14px; cursor: pointer;
  }

  .drawer-overlay {
    position: fixed; inset: 0; background: #00000088;
    backdrop-filter: blur(3px); z-index: 100; display: flex; justify-content: flex-end;
  }
  .drawer {
    width: 420px; max-width: 95vw; height: 100vh; background: var(--surface);
    border-left: 1px solid var(--border); padding: 32px 28px; overflow-y: auto;
    display: flex; flex-direction: column; gap: 20px;
    position: relative; animation: slideIn 0.25s ease;
  }
  @keyframes slideIn { from { transform: translateX(100%); } to { transform: translateX(0); } }
  .drawer::-webkit-scrollbar { width: 4px; }
  .drawer::-webkit-scrollbar-thumb { background: var(--border); border-radius: 4px; }

  .drawer-close {
    position: absolute; top: 20px; right: 20px; background: var(--surface2);
    border: 1px solid var(--border); border-radius: 8px; width: 32px; height: 32px;
    display: flex; align-items: center; justify-content: center;
    cursor: pointer; color: var(--muted); font-size: 13px; transition: all 0.15s;
  }
  .drawer-close:hover { color: var(--text); border-color: var(--accent); }

  .drawer-hero { display: flex; gap: 16px; align-items: flex-start; }
  .drawer-avatar {
    width: 64px; height: 64px; border-radius: 16px;
    display: flex; align-items: center; justify-content: center;
    font-family: 'Syne', sans-serif; font-weight: 800; font-size: 18px;
    color: #fff; flex-shrink: 0;
  }
  .drawer-name {
    font-family: 'Syne', sans-serif; font-size: 20px; font-weight: 800;
    display: flex; align-items: center; gap: 8px; flex-wrap: wrap;
  }
  .drawer-handle { font-size: 13px; color: var(--muted); margin-top: 3px; }
  .drawer-niche {
    display: inline-block; margin-top: 7px; font-size: 12px;
    background: var(--surface2); border: 1px solid var(--border);
    border-radius: 4px; padding: 3px 9px; color: var(--muted);
  }

  .drawer-platforms { display: flex; gap: 8px; flex-wrap: wrap; }
  .platform-full { font-size: 12px; font-weight: 600; padding: 5px 12px; border-radius: 6px; letter-spacing: 0.03em; }

  .drawer-section-title {
    font-family: 'Syne', sans-serif; font-size: 12px; font-weight: 700;
    text-transform: uppercase; letter-spacing: 0.1em; color: var(--muted);
    padding-bottom: 8px; border-bottom: 1px solid var(--border);
  }

  .drawer-metrics { display: grid; grid-template-columns: repeat(3, 1fr); gap: 10px; }
  .drawer-metric-box {
    background: var(--surface2); border-radius: 10px; padding: 14px 10px;
    text-align: center; display: flex; flex-direction: column; gap: 4px;
    border: 1px solid var(--border);
  }
  .dmb-val { font-family: 'Syne', sans-serif; font-size: 16px; font-weight: 800; }
  .dmb-key { font-size: 10px; color: var(--muted); }

  .demo-grid { display: flex; flex-direction: column; gap: 10px; }
  .demo-item {
    display: flex; align-items: center; gap: 12px; background: var(--surface2);
    border-radius: 8px; padding: 10px 14px; border: 1px solid var(--border);
  }
  .demo-icon { font-size: 18px; }
  .demo-key { font-size: 11px; color: var(--muted); margin-bottom: 1px; }
  .demo-val { font-size: 14px; font-weight: 600; }

  .collab-list { display: flex; gap: 8px; flex-wrap: wrap; }
  .collab-tag {
    background: #7c5af018; color: var(--accent2); border: 1px solid #7c5af044;
    border-radius: 6px; padding: 4px 12px; font-size: 13px; font-weight: 500;
  }
  .no-collab { font-size: 13px; color: var(--muted); }

  .contact-btn {
    width: 100%; background: linear-gradient(135deg, var(--accent), #a855f7);
    border: none; border-radius: 10px; padding: 14px; color: #fff;
    font-family: 'Syne', sans-serif; font-size: 15px; font-weight: 700;
    cursor: pointer; margin-top: 4px; transition: opacity 0.2s; letter-spacing: 0.02em;
  }
  .contact-btn:hover { opacity: 0.88; }

  @media (max-width: 768px) {
    .page-shell { grid-template-columns: 1fr; }
    .sidebar { position: static; height: auto; }
    .main-area { padding: 20px 16px; }
    .card-grid { grid-template-columns: 1fr; }
  }
`;

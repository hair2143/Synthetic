import { useState, useRef, useEffect, useCallback } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend, LineChart, Line, PieChart, Pie, Cell } from "recharts";

const API = "http://127.0.0.1:8000/api/v1";

const pct = (v) => Math.round((v || 0) * 100);
const sentColor = (s) => s === "positive" ? "#10b981" : s === "negative" ? "#f43f5e" : "#f59e0b";
const impactColor = (i) => i === "HIGH" ? "#6366f1" : i === "MEDIUM" ? "#f59e0b" : "#64748b";

// Debounce hook for faster perceived performance
function useDebounce(value, delay) {
  const [debouncedValue, setDebouncedValue] = useState(value);
  useEffect(() => {
    const handler = setTimeout(() => setDebouncedValue(value), delay);
    return () => clearTimeout(handler);
  }, [value, delay]);
  return debouncedValue;
}

// Check if API is online
async function checkApiHealth() {
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 5000);
    const r = await fetch(`${API}/health`, { signal: controller.signal });
    clearTimeout(timeoutId);
    return r.ok;
  } catch {
    return false;
  }
}

function Pill({ children, color = "#6366f1" }) {
  return (
    <span style={{ background: color + "20", color, border: `1px solid ${color}50`, borderRadius: 999, padding: "2px 10px", fontSize: 11, fontWeight: 600 }}>
      {children}
    </span>
  );
}

function ScoreBar({ score, color }) {
  const p = pct(score);
  const c = color || (p >= 65 ? "#10b981" : p >= 45 ? "#f59e0b" : "#f43f5e");
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
      <div style={{ flex: 1, height: 6, background: "#1e293b", borderRadius: 99 }}>
        <div style={{ width: `${p}%`, height: "100%", background: c, borderRadius: 99, transition: "width 0.6s ease" }} />
      </div>
      <span style={{ fontSize: 11, color: "#64748b", minWidth: 28 }}>{p}%</span>
    </div>
  );
}

function Card({ children, style = {}, accent }) {
  return (
    <div style={{ background: "#0f172a", border: `1px solid ${accent || "#1e293b"}`, borderRadius: 16, padding: "20px 24px", ...style }}>
      {children}
    </div>
  );
}

function SectionTitle({ children, color = "#818cf8" }) {
  return <div style={{ fontSize: 11, fontWeight: 700, color, letterSpacing: "0.12em", textTransform: "uppercase", marginBottom: 16 }}>{children}</div>;
}

function EvidenceItem({ item }) {
  return (
    <div style={{ background: item.verified ? "#064e3b20" : "#78350f20", border: `1px solid ${item.verified ? "#10b98140" : "#f59e0b40"}`, borderRadius: 10, padding: "12px 14px", marginBottom: 8 }}>
      <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 6 }}>
        <span style={{ fontSize: 11, fontWeight: 700, color: item.verified ? "#10b981" : "#f59e0b" }}>{item.badge}</span>
        <span style={{ fontSize: 11, color: "#475569" }}>Trust {pct(item.trust_score)}%</span>
      </div>
      <p style={{ fontSize: 13, color: "#cbd5e1", fontStyle: "italic", lineHeight: 1.5, margin: "0 0 6px" }}>"{item.quote}"</p>
      <div style={{ display: "flex", gap: 12, fontSize: 11, color: "#475569" }}>
        <span>#{item.review_id}</span>
        <span>★ {item.rating}</span>
        <span>{item.purchase_date}</span>
      </div>
    </div>
  );
}

function StatBox({ label, value, sub, color = "#6366f1" }) {
  return (
    <Card style={{ padding: "18px 20px" }}>
      <div style={{ fontSize: 11, color: "#475569", textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 6 }}>{label}</div>
      <div style={{ fontSize: 28, fontWeight: 800, color, lineHeight: 1, marginBottom: 4 }}>{value}</div>
      {sub && <div style={{ fontSize: 11, color: "#475569" }}>{sub}</div>}
    </Card>
  );
}

export default function InsightsPage() {
  const { id: urlProductId } = useParams();
  const navigate = useNavigate();
  const [pid, setPid] = useState(urlProductId || "");
  const [cmpId, setCmpId] = useState("");
  const [data, setData] = useState(null);
  const [cmpData, setCmpData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState("");
  const [tab, setTab] = useState("overview");
  const [apiOnline, setApiOnline] = useState(null); // null = checking, true = online, false = offline
  const [responseTime, setResponseTime] = useState(null);
  const [analyticsData, setAnalyticsData] = useState(null);
  const [topProducts, setTopProducts] = useState(null);
  const [analyticsLoading, setAnalyticsLoading] = useState(false);

  const QUICK_IDS = ["B003ES5ZUU", "B0019EHU8G", "B002WE6D44", "B0002L5R78"];

  // Fetch analytics data when switching to analytics tab
  async function fetchAnalytics(productId) {
    if (!productId || analyticsLoading) return;
    setAnalyticsLoading(true);
    try {
      const [analyticsRes, topProductsRes] = await Promise.all([
        fetch(`${API}/analytics/${productId}`),
        fetch(`${API}/analytics/top-products`)
      ]);
      if (analyticsRes.ok) {
        const analyticsJson = await analyticsRes.json();
        setAnalyticsData(analyticsJson);
      }
      if (topProductsRes.ok) {
        const topProductsJson = await topProductsRes.json();
        setTopProducts(topProductsJson);
      }
    } catch (e) {
      console.error("Analytics fetch error:", e);
    } finally {
      setAnalyticsLoading(false);
    }
  }

  // Check API health on mount and every 30 seconds
  useEffect(() => {
    const checkHealth = async () => {
      const online = await checkApiHealth();
      setApiOnline(online);
    };
    checkHealth();
    const interval = setInterval(checkHealth, 30000);
    return () => clearInterval(interval);
  }, []);

  // Auto-analyze if product ID is in URL
  useEffect(() => {
    if (urlProductId && apiOnline && !data && !loading) {
      setPid(urlProductId);
      analyze(urlProductId);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [urlProductId, apiOnline]);

  async function analyze(id) {
    if (!apiOnline) {
      setErr("API is offline. Please start the backend server.");
      return;
    }
    const target = (id || pid).trim();
    if (target.length < 3) { setErr("Product ID must be at least 3 characters"); return; }
    setLoading(true); setErr(""); setData(null); setCmpData(null); setResponseTime(null); setAnalyticsData(null);
    const startTime = performance.now();
    try {
      const r = await fetch(`${API}/insights/${target}`);
      const j = await r.json();
      const elapsed = Math.round(performance.now() - startTime);
      setResponseTime(elapsed);
      if (!r.ok) throw new Error(j.detail || `Error ${r.status}`);
      setData(j); setTab("overview");
    } catch (e) {
      if (e.name === 'TypeError' || e.message.includes('Failed to fetch')) {
        setApiOnline(false);
        setErr("API is offline. Please start the backend server.");
      } else {
        setErr(e.message);
      }
    }
    finally { setLoading(false); }
  }

  async function compare() {
    if (!apiOnline) {
      setErr("API is offline. Please start the backend server.");
      return;
    }
    if (!cmpId.trim() || !pid.trim()) return;
    try {
      const r = await fetch(`${API}/compare?product_a=${pid.trim()}&product_b=${cmpId.trim()}`);
      const j = await r.json();
      if (!r.ok) throw new Error(j.detail);
      setCmpData(j); setTab("compare");
    } catch (e) {
      if (e.name === 'TypeError' || e.message.includes('Failed to fetch')) {
        setApiOnline(false);
        setErr("API is offline. Please start the backend server.");
      } else {
        setErr(e.message);
      }
    }
  }

  const TABS = ["overview", "aspects", "pros & cons", "drift", "conflicts", "audit", "analytics", ...(cmpData ? ["compare"] : [])];

  // Fetch analytics when tab changes to analytics
  // Fetch analytics when tab changes to analytics
  useEffect(() => {
    if (tab === "analytics" && pid && !analyticsData) {
      fetchAnalytics(pid.trim());
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tab, pid]);

  return (
    <div style={{ minHeight: "100vh", background: "#020818", color: "#e2e8f0", fontFamily: "'Segoe UI', system-ui, sans-serif" }}>

      {/* Background grid */}
      <div style={{ position: "fixed", inset: 0, zIndex: 0, pointerEvents: "none", backgroundImage: "linear-gradient(rgba(99,102,241,0.04) 1px, transparent 1px), linear-gradient(90deg, rgba(99,102,241,0.04) 1px, transparent 1px)", backgroundSize: "40px 40px" }} />
      <div style={{ position: "fixed", top: -200, left: -200, width: 600, height: 600, borderRadius: "50%", background: "radial-gradient(circle, rgba(99,102,241,0.08) 0%, transparent 70%)", pointerEvents: "none", zIndex: 0 }} />
      <div style={{ position: "fixed", bottom: -200, right: -200, width: 500, height: 500, borderRadius: "50%", background: "radial-gradient(circle, rgba(16,185,129,0.06) 0%, transparent 70%)", pointerEvents: "none", zIndex: 0 }} />

      <div style={{ position: "relative", zIndex: 1 }}>

        {/* Header */}
        <div style={{ borderBottom: "1px solid #1e293b", background: "#020818ee", backdropFilter: "blur(12px)", position: "sticky", top: 0, zIndex: 50 }}>
          <div style={{ maxWidth: 1100, margin: "0 auto", padding: "14px 24px", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
              <div onClick={() => navigate('/marketplace')} style={{ width: 34, height: 34, borderRadius: 10, background: "linear-gradient(135deg, #6366f1, #818cf8)", display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 800, fontSize: 16, cursor: "pointer" }}>T</div>
              <div>
                <div style={{ fontWeight: 700, fontSize: 14 }}>Review Insights</div>
                <div style={{ fontSize: 11, color: "#475569" }}>Synthetix Market · QA-Grade Intelligence</div>
              </div>
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
              <button onClick={() => navigate('/marketplace')} style={{ padding: "8px 16px", background: "transparent", border: "1px solid #1e293b", borderRadius: 10, fontSize: 12, color: "#64748b", cursor: "pointer", fontFamily: "inherit" }}>
                ← Back to Market
              </button>
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <div style={{ width: 7, height: 7, borderRadius: "50%", background: apiOnline === null ? "#f59e0b" : apiOnline ? "#10b981" : "#f43f5e", boxShadow: `0 0 6px ${apiOnline === null ? "#f59e0b" : apiOnline ? "#10b981" : "#f43f5e"}` }} />
                <span style={{ fontSize: 12, color: apiOnline === null ? "#f59e0b" : apiOnline ? "#10b981" : "#f43f5e", fontWeight: 600 }}>
                  {apiOnline === null ? "Checking..." : apiOnline ? "API Live" : "API Offline"}
                </span>
              </div>
            </div>
          </div>
        </div>

        <div style={{ maxWidth: 1100, margin: "0 auto", padding: "32px 24px" }}>

          {/* Search */}
          <Card style={{ padding: "28px 32px", marginBottom: 28 }}>
            <h1 style={{ fontSize: 22, fontWeight: 800, margin: "0 0 6px" }}>Product Review Intelligence</h1>
            <p style={{ fontSize: 13, color: "#475569", margin: "0 0 20px" }}>Every insight validated, tested & certified · Zero fabrication · That's Synthetix thinking.</p>

            {apiOnline === false && (
              <div style={{ marginBottom: 16, padding: "12px 16px", background: "#f43f5e15", border: "1px solid #f43f5e40", borderRadius: 10, display: "flex", alignItems: "center", gap: 10 }}>
                <div style={{ width: 8, height: 8, borderRadius: "50%", background: "#f43f5e" }} />
                <span style={{ fontSize: 13, color: "#f43f5e", fontWeight: 600 }}>API is offline. Please start the backend server (python main.py)</span>
              </div>
            )}

            <div style={{ display: "flex", gap: 10, marginBottom: 10 }}>
              <input value={pid} onChange={e => setPid(e.target.value)} onKeyDown={e => e.key === "Enter" && apiOnline && analyze()}
                placeholder="Enter Product ID  (e.g. B003ES5ZUU)"
                disabled={!apiOnline}
                style={{ flex: 1, background: "#020818", border: "1px solid #1e293b", borderRadius: 12, padding: "12px 16px", fontSize: 14, color: apiOnline ? "#e2e8f0" : "#475569", outline: "none", fontFamily: "inherit", opacity: apiOnline ? 1 : 0.6 }} />
              <button onClick={() => analyze()} disabled={loading || !apiOnline}
                style={{ background: (loading || !apiOnline) ? "#1e293b" : "linear-gradient(135deg, #6366f1, #818cf8)", border: "none", borderRadius: 12, padding: "12px 28px", color: "#fff", fontWeight: 700, fontSize: 14, cursor: (loading || !apiOnline) ? "not-allowed" : "pointer", fontFamily: "inherit", opacity: apiOnline ? 1 : 0.6 }}>
                {loading ? "Analyzing..." : "Analyze →"}
              </button>
            </div>

            {data?.status === "success" && (
              <div style={{ display: "flex", gap: 10, marginBottom: 12 }}>
                <input value={cmpId} onChange={e => setCmpId(e.target.value)} placeholder="Compare with another Product ID..."
                  style={{ flex: 1, background: "#020818", border: "1px solid #1e293b", borderRadius: 12, padding: "10px 16px", fontSize: 13, color: "#e2e8f0", outline: "none", fontFamily: "inherit" }} />
                <button onClick={compare} style={{ background: "#1e1b4b", border: "1px solid #4338ca", borderRadius: 12, padding: "10px 20px", color: "#818cf8", fontWeight: 600, fontSize: 13, cursor: "pointer", fontFamily: "inherit" }}>
                  Compare
                </button>
              </div>
            )}

            <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
              <span style={{ fontSize: 11, color: "#334155" }}>Quick:</span>
              {QUICK_IDS.map(id => (
                <button key={id} onClick={() => { setPid(id); analyze(id); }}
                  style={{ background: "#020818", border: "1px solid #1e293b", borderRadius: 8, padding: "4px 10px", fontSize: 11, color: "#64748b", cursor: "pointer", fontFamily: "inherit" }}>
                  {id}
                </button>
              ))}
            </div>

            {err && <div style={{ marginTop: 12, padding: "10px 14px", background: "#f43f5e15", border: "1px solid #f43f5e40", borderRadius: 10, fontSize: 13, color: "#f43f5e" }}>⚠ {err}</div>}
          </Card>

          {/* Loading */}
          {loading && (
            <Card style={{ textAlign: "center", padding: "60px 24px" }}>
              <div style={{ width: 40, height: 40, border: "3px solid #1e293b", borderTop: "3px solid #6366f1", borderRadius: "50%", animation: "spin 0.8s linear infinite", margin: "0 auto 16px" }} />
              <p style={{ color: "#64748b", margin: "0 0 4px", fontWeight: 600 }}>Analyzing reviews...</p>
              <p style={{ fontSize: 12, color: "#334155", margin: 0 }}>Loading CSV · Filtering · Extracting aspects · Scoring sentiment</p>
              <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
            </Card>
          )}

          {/* Insufficient Data */}
          {data?.status === "insufficient_data" && (
            <Card accent="#f59e0b50">
              <div style={{ fontSize: 18, fontWeight: 700, color: "#f59e0b", marginBottom: 8 }}>⚠ Insufficient Data</div>
              <p style={{ color: "#94a3b8", fontSize: 14, margin: "0 0 12px" }}>{data.message}</p>
              {data.partial_insights && (
                <div style={{ background: "#020818", borderRadius: 10, padding: "12px 14px" }}>
                  <div style={{ fontSize: 11, color: "#475569", marginBottom: 4 }}>Early signal:</div>
                  <p style={{ fontSize: 13, color: "#cbd5e1", margin: "0 0 4px", fontStyle: "italic" }}>"{data.partial_insights.early_signal}"</p>
                </div>
              )}
            </Card>
          )}

          {/* Results */}
          {data?.status === "success" && (
            <>
              {/* QA Badge */}
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", background: "#064e3b20", border: "1px solid #10b98140", borderRadius: 12, padding: "10px 18px", marginBottom: 20 }}>
                <span style={{ fontSize: 13, color: "#10b981", fontWeight: 600 }}>{data.synthetix_qa_badge}</span>
                <div style={{ display: "flex", gap: 12, fontSize: 11, color: "#475569" }}>
                  <span style={{ color: data.cache_status?.includes("hit") ? "#10b981" : "#f59e0b" }}>
                    {data.cache_status?.includes("memory") ? "⚡ Memory" : data.cache_status?.includes("db") ? "💾 DB Cache" : "🔄 Fresh"} 
                    {responseTime && ` (${responseTime}ms)`}
                  </span>
                  <span>·</span>
                  <span>{data.product_meta?.category}</span>
                  <span>·</span>
                  <span>{new Date(data.generated_at).toLocaleTimeString()}</span>
                </div>
              </div>

              {/* Stats */}
              <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 12, marginBottom: 20 }}>
                <StatBox label="Total Reviews" value={(data.data_sources?.total || 0).toLocaleString()} sub={data.data_sources?.csv_recent} color="#6366f1" />
                <StatBox label="Confidence" value={`${pct(data.confidence?.score)}%`} sub={data.confidence?.level} color={data.confidence?.score >= 0.8 ? "#10b981" : "#f59e0b"} />
                <StatBox label="Verified Purchases" value={(data.review_quality_audit?.verified_purchases || 0).toLocaleString()} sub={`of ${(data.review_quality_audit?.total_reviews || 0).toLocaleString()} total`} color="#10b981" />
                <StatBox label="Fake Detected" value={data.review_quality_audit?.suspected_fake || 0} sub="Excluded from analysis" color="#f43f5e" />
              </div>

              {/* Tabs */}
              <div style={{ display: "flex", gap: 4, background: "#0f172a", border: "1px solid #1e293b", borderRadius: 14, padding: 4, marginBottom: 20, overflowX: "auto" }}>
                {TABS.map(t => (
                  <button key={t} onClick={() => setTab(t)}
                    style={{ flex: 1, padding: "9px 14px", borderRadius: 10, border: "none", fontSize: 12, fontWeight: 600, cursor: "pointer", fontFamily: "inherit", textTransform: "capitalize", whiteSpace: "nowrap", background: tab === t ? "linear-gradient(135deg, #6366f1, #818cf8)" : "transparent", color: tab === t ? "#fff" : "#64748b", transition: "all 0.2s" }}>
                    {t}
                  </button>
                ))}
              </div>

              {/* OVERVIEW */}
              {tab === "overview" && (
                <div style={{ display: "grid", gap: 16 }}>
                  <Card>
                    <SectionTitle>Summary</SectionTitle>
                    <p style={{ fontSize: 14, color: "#94a3b8", lineHeight: 1.7, margin: 0 }}>{data.summary}</p>
                  </Card>
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
                    <Card>
                      <SectionTitle>Data Sources</SectionTitle>
                      {[["CSV Recent", data.data_sources?.csv_recent, "#10b981"], ["CSV Older", data.data_sources?.csv_older, "#6366f1"], ["PostgreSQL", data.data_sources?.historical_db, "#818cf8"], ["Recent Weight", data.data_sources?.recent_weight, "#f59e0b"]].map(([k, v, c]) => (
                        <div key={k} style={{ display: "flex", justifyContent: "space-between", padding: "8px 0", borderBottom: "1px solid #0f1e32" }}>
                          <span style={{ fontSize: 13, color: "#475569" }}>{k}</span>
                          <span style={{ fontSize: 13, color: c, fontWeight: 600 }}>{v}</span>
                        </div>
                      ))}
                    </Card>
                    <Card>
                      <SectionTitle>Confidence Breakdown</SectionTitle>
                      {data.confidence?.reasons && Object.entries(data.confidence.reasons).map(([k, v]) => (
                        <div key={k} style={{ display: "flex", justifyContent: "space-between", padding: "8px 0", borderBottom: "1px solid #0f1e32" }}>
                          <span style={{ fontSize: 13, color: "#475569", textTransform: "capitalize" }}>{k.replace(/_/g, " ")}</span>
                          <span style={{ fontSize: 13, color: "#94a3b8", textAlign: "right", maxWidth: 200 }}>{v}</span>
                        </div>
                      ))}
                    </Card>
                  </div>
                </div>
              )}

              {/* ASPECTS */}
              {tab === "aspects" && (
                <Card>
                  <SectionTitle>Top Aspects — Sentiment Breakdown</SectionTitle>
                  {(!data.top_aspects || data.top_aspects.length === 0)
                    ? <p style={{ color: "#475569", fontSize: 13 }}>No aspects detected</p>
                    : data.top_aspects.map((a, i) => (
                      <div key={i} style={{ display: "flex", alignItems: "center", gap: 12, padding: "12px 0", borderBottom: "1px solid #0f1e32" }}>
                        <div style={{ width: 140, fontSize: 13, color: "#cbd5e1", fontWeight: 500, textTransform: "capitalize" }}>{a.aspect}</div>
                        <Pill color={sentColor(a.sentiment)}>{a.sentiment}</Pill>
                        <div style={{ flex: 1 }}><ScoreBar score={a.score} /></div>
                        <div style={{ fontSize: 12, color: "#475569", width: 80, textAlign: "right" }}>{a.review_count} reviews</div>
                        <Pill color={impactColor(a.impact)}>{a.impact}</Pill>
                      </div>
                    ))
                  }
                </Card>
              )}

              {/* PROS & CONS */}
              {tab === "pros & cons" && (
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
                  <Card accent="#10b98130">
                    <SectionTitle color="#10b981">✅ Pros ({data.pros?.length || 0})</SectionTitle>
                    {(!data.pros || data.pros.length === 0)
                      ? <p style={{ fontSize: 13, color: "#475569" }}>No positive aspects with sufficient evidence</p>
                      : data.pros.map((p, i) => (
                        <div key={i} style={{ marginBottom: 20 }}>
                          <div style={{ fontSize: 14, fontWeight: 700, color: "#e2e8f0", marginBottom: 4 }}>{p.point}</div>
                          <div style={{ fontSize: 11, color: "#475569", marginBottom: 8 }}>Score: {pct(p.sentiment_score)}% · {p.evidence_count} evidence items</div>
                          {p.evidence?.map((e, j) => <EvidenceItem key={j} item={e} />)}
                        </div>
                      ))
                    }
                  </Card>
                  <Card accent="#f43f5e30">
                    <SectionTitle color="#f43f5e">❌ Cons ({data.cons?.length || 0})</SectionTitle>
                    {(!data.cons || data.cons.length === 0)
                      ? <p style={{ fontSize: 13, color: "#475569" }}>No negative aspects with sufficient evidence</p>
                      : data.cons.map((c, i) => (
                        <div key={i} style={{ marginBottom: 20 }}>
                          <div style={{ fontSize: 14, fontWeight: 700, color: "#e2e8f0", marginBottom: 4 }}>{c.point}</div>
                          <div style={{ fontSize: 11, color: "#475569", marginBottom: 8 }}>Score: {pct(c.sentiment_score)}% · {c.evidence_count} evidence items</div>
                          {c.evidence?.map((e, j) => <EvidenceItem key={j} item={e} />)}
                        </div>
                      ))
                    }
                  </Card>
                </div>
              )}

              {/* DRIFT */}
              {tab === "drift" && (
                <Card>
                  <SectionTitle>Sentiment Drift Over Time</SectionTitle>
                  <p style={{ fontSize: 12, color: "#334155", marginBottom: 20 }}>Recent CSV data vs historical PostgreSQL — detecting quality changes over time</p>
                  {(!data.trend || Object.keys(data.trend).length === 0)
                    ? <p style={{ color: "#475569", fontSize: 13, textAlign: "center", padding: "40px 0" }}>No drift data available — all reviews are from the same time period</p>
                    : (
                      <>
                        <ResponsiveContainer width="100%" height={240}>
                          <BarChart data={Object.entries(data.trend).map(([k, v]) => ({ aspect: k.split(" ").slice(0, 2).join(" "), Recent: pct(v.recent_score), Historical: pct(v.historical_score) }))} margin={{ top: 5, right: 10, bottom: 5, left: -10 }}>
                            <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                            <XAxis dataKey="aspect" tick={{ fill: "#64748b", fontSize: 10 }} />
                            <YAxis tick={{ fill: "#64748b", fontSize: 10 }} domain={[0, 100]} />
                            <Tooltip contentStyle={{ background: "#0f172a", border: "1px solid #1e293b", borderRadius: 8, fontSize: 12 }} />
                            <Legend wrapperStyle={{ fontSize: 11 }} />
                            <Bar dataKey="Historical" fill="#6366f1" />
                            <Bar dataKey="Recent" fill="#10b981" />
                          </BarChart>
                        </ResponsiveContainer>
                        <div style={{ marginTop: 16, display: "grid", gap: 8 }}>
                          {Object.entries(data.trend).map(([aspect, v]) => (
                            <div key={aspect} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "12px 16px", borderRadius: 10, background: v.direction === "declining" ? "#f43f5e10" : v.direction === "improving" ? "#10b98110" : "#1e293b", border: `1px solid ${v.direction === "declining" ? "#f43f5e30" : v.direction === "improving" ? "#10b98130" : "#1e293b"}` }}>
                              <div>
                                <span style={{ fontSize: 13, fontWeight: 600, textTransform: "capitalize" }}>{aspect}</span>
                                <p style={{ fontSize: 11, color: "#475569", margin: "2px 0 0" }}>{v.alert}</p>
                              </div>
                              <div style={{ textAlign: "right" }}>
                                <Pill color={v.direction === "declining" ? "#f43f5e" : v.direction === "improving" ? "#10b981" : "#64748b"}>{v.direction}</Pill>
                                <div style={{ fontSize: 11, color: "#475569", marginTop: 4 }}>{pct(v.historical_score)}% → {pct(v.recent_score)}%</div>
                              </div>
                            </div>
                          ))}
                        </div>
                      </>
                    )
                  }
                </Card>
              )}

              {/* CONFLICTS */}
              {tab === "conflicts" && (
                <div style={{ display: "grid", gap: 16 }}>
                  {(!data.conflicts || data.conflicts.length === 0)
                    ? <Card style={{ textAlign: "center", padding: "60px 24px" }}>
                        <p style={{ fontSize: 16, color: "#475569" }}>✅ No strong conflicts detected</p>
                        <p style={{ fontSize: 13, color: "#334155" }}>Buyers mostly agree on this product</p>
                      </Card>
                    : data.conflicts.map((c, i) => (
                      <Card key={i} accent="#f9731630">
                        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
                          <span style={{ fontSize: 15, fontWeight: 700, textTransform: "capitalize" }}>{c.aspect}</span>
                          <Pill color="#f97316">Conflict {pct(c.conflict_score)}%</Pill>
                        </div>
                        <p style={{ fontSize: 12, color: "#475569", marginBottom: 14 }}>{c.insight}</p>
                        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                          <div style={{ background: "#10b98110", border: "1px solid #10b98130", borderRadius: 10, padding: "12px 14px" }}>
                            <div style={{ fontSize: 11, color: "#10b981", fontWeight: 700, marginBottom: 6 }}>👍 {c.positive_count} say</div>
                            <p style={{ fontSize: 13, color: "#cbd5e1", fontStyle: "italic", margin: 0 }}>"{c.pro_evidence}"</p>
                          </div>
                          <div style={{ background: "#f43f5e10", border: "1px solid #f43f5e30", borderRadius: 10, padding: "12px 14px" }}>
                            <div style={{ fontSize: 11, color: "#f43f5e", fontWeight: 700, marginBottom: 6 }}>👎 {c.negative_count} say</div>
                            <p style={{ fontSize: 13, color: "#cbd5e1", fontStyle: "italic", margin: 0 }}>"{c.con_evidence}"</p>
                          </div>
                        </div>
                      </Card>
                    ))
                  }
                </div>
              )}

              {/* AUDIT */}
              {tab === "audit" && (
                <Card>
                  <SectionTitle>Review Quality Audit</SectionTitle>
                  <p style={{ fontSize: 12, color: "#334155", marginBottom: 20 }}>Every review tested before analysis — only clean, verified data contributes to insights</p>
                  {[
                    ["Total Reviews Found", data.review_quality_audit?.total_reviews, "#6366f1"],
                    ["Verified Purchases", data.review_quality_audit?.verified_purchases, "#10b981"],
                    ["Non-English Filtered", data.review_quality_audit?.non_english_filtered, "#f59e0b"],
                    ["Suspected Fake", data.review_quality_audit?.suspected_fake, "#f43f5e"],
                    ["Low Quality Filtered", data.review_quality_audit?.low_quality, "#f97316"],
                    ["Used in Analysis", data.review_quality_audit?.used_in_analysis, "#10b981"],
                  ].map(([label, value, color]) => (
                    <div key={label} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "12px 0", borderBottom: "1px solid #0f1e32" }}>
                      <span style={{ fontSize: 13, color: "#64748b" }}>{label}</span>
                      <span style={{ fontSize: 20, fontWeight: 800, color }}>{(value || 0).toLocaleString()}</span>
                    </div>
                  ))}
                  <div style={{ marginTop: 16, padding: "12px 16px", background: "#064e3b20", border: "1px solid #10b98140", borderRadius: 10, textAlign: "center" }}>
                    <span style={{ fontSize: 13, color: "#10b981", fontWeight: 700 }}>{data.review_quality_audit?.audit_confidence}</span>
                  </div>
                </Card>
              )}

              {/* ANALYTICS */}
              {tab === "analytics" && (
                <div>
                  {analyticsLoading ? (
                    <Card style={{ textAlign: "center", padding: "60px 24px" }}>
                      <div style={{ width: 40, height: 40, border: "3px solid #1e293b", borderTop: "3px solid #6366f1", borderRadius: "50%", animation: "spin 0.8s linear infinite", margin: "0 auto 16px" }} />
                      <p style={{ color: "#64748b", margin: 0 }}>Loading analytics...</p>
                    </Card>
                  ) : analyticsData ? (
                    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
                      
                      {/* 1. RATING DISTRIBUTION */}
                      <Card>
                        <SectionTitle color="#f59e0b">Rating Distribution</SectionTitle>
                        <BarChart width={340} height={200} layout="vertical" data={[
                          { rating: "5★", count: analyticsData.rating_distribution?.["5"] || 0 },
                          { rating: "4★", count: analyticsData.rating_distribution?.["4"] || 0 },
                          { rating: "3★", count: analyticsData.rating_distribution?.["3"] || 0 },
                          { rating: "2★", count: analyticsData.rating_distribution?.["2"] || 0 },
                          { rating: "1★", count: analyticsData.rating_distribution?.["1"] || 0 },
                        ]}>
                          <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                          <XAxis type="number" stroke="#64748b" fontSize={11} />
                          <YAxis dataKey="rating" type="category" stroke="#64748b" fontSize={11} width={35} />
                          <Tooltip contentStyle={{ background: "#0f172a", border: "1px solid #1e293b", borderRadius: 8 }} />
                          <Bar dataKey="count">
                            <Cell fill="#10b981" />
                            <Cell fill="#22c55e" />
                            <Cell fill="#f59e0b" />
                            <Cell fill="#f97316" />
                            <Cell fill="#f43f5e" />
                          </Bar>
                        </BarChart>
                        <p style={{ fontSize: 12, color: "#475569", marginTop: 8 }}>
                          {analyticsData.rating_distribution?.["5"] || 0} five-star reviews ({Math.round(((analyticsData.rating_distribution?.["5"] || 0) / analyticsData.total_reviews) * 100)}%)
                        </p>
                      </Card>

                      {/* 2. REVIEWS OVER TIME */}
                      <Card>
                        <SectionTitle color="#6366f1">Reviews Over Time</SectionTitle>
                        <LineChart width={340} height={200} data={analyticsData.reviews_by_year || []}>
                          <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                          <XAxis dataKey="year" stroke="#64748b" fontSize={11} />
                          <YAxis stroke="#64748b" fontSize={11} />
                          <Tooltip contentStyle={{ background: "#0f172a", border: "1px solid #1e293b", borderRadius: 8 }} />
                          <Line type="monotone" dataKey="count" stroke="#6366f1" strokeWidth={2} dot={{ fill: "#6366f1", strokeWidth: 2 }} />
                        </LineChart>
                        <p style={{ fontSize: 12, color: "#475569", marginTop: 8 }}>
                          {analyticsData.reviews_by_year?.length || 0} years of review data
                        </p>
                      </Card>

                      {/* 3. VERIFIED VS UNVERIFIED */}
                      <Card>
                        <SectionTitle color="#10b981">Verified vs Unverified</SectionTitle>
                        <PieChart width={340} height={200}>
                          <Pie
                            data={[
                              { name: "Verified", value: data.review_quality_audit?.verified_purchases || 0 },
                              { name: "Unverified", value: (data.review_quality_audit?.total_reviews || 0) - (data.review_quality_audit?.verified_purchases || 0) }
                            ]}
                            cx={170}
                            cy={100}
                            innerRadius={50}
                            outerRadius={80}
                            paddingAngle={2}
                            dataKey="value"
                            label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                            labelLine={false}
                          >
                            <Cell fill="#10b981" />
                            <Cell fill="#f43f5e" />
                          </Pie>
                          <Tooltip contentStyle={{ background: "#0f172a", border: "1px solid #1e293b", borderRadius: 8 }} />
                        </PieChart>
                        <p style={{ fontSize: 12, color: "#475569", marginTop: 8 }}>
                          {data.review_quality_audit?.verified_purchases || 0} verified purchases
                        </p>
                      </Card>

                      {/* 4. AVERAGE RATING OVER TIME */}
                      <Card>
                        <SectionTitle color="#f59e0b">Average Rating Over Time</SectionTitle>
                        <LineChart width={340} height={200} data={analyticsData.avg_rating_by_year || []}>
                          <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                          <XAxis dataKey="year" stroke="#64748b" fontSize={11} />
                          <YAxis domain={[1, 5]} stroke="#64748b" fontSize={11} />
                          <Tooltip contentStyle={{ background: "#0f172a", border: "1px solid #1e293b", borderRadius: 8 }} />
                          <Line type="monotone" dataKey="avg" stroke="#f59e0b" strokeWidth={2} dot={{ fill: "#f59e0b", strokeWidth: 2 }} />
                        </LineChart>
                        <p style={{ fontSize: 12, color: "#475569", marginTop: 8 }}>
                          Rating trend over {analyticsData.avg_rating_by_year?.length || 0} years
                        </p>
                      </Card>

                      {/* 5. TOP REVIEWERS */}
                      <Card>
                        <SectionTitle color="#818cf8">Top Reviewers</SectionTitle>
                        <BarChart width={340} height={200} layout="vertical" data={(analyticsData.top_reviewers || []).slice(0, 8)}>
                          <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                          <XAxis type="number" stroke="#64748b" fontSize={11} />
                          <YAxis dataKey="reviewer_id" type="category" stroke="#64748b" fontSize={10} width={80} />
                          <Tooltip contentStyle={{ background: "#0f172a", border: "1px solid #1e293b", borderRadius: 8 }} />
                          <Bar dataKey="count" fill="#818cf8" />
                        </BarChart>
                        <p style={{ fontSize: 12, color: "#475569", marginTop: 8 }}>
                          Most active reviewers for this product
                        </p>
                      </Card>

                      {/* 6. MOST DISCUSSED TOPICS */}
                      <Card>
                        <SectionTitle color="#6366f1">Most Discussed Topics</SectionTitle>
                        <BarChart width={340} height={200} data={(data.top_aspects || []).slice(0, 6).map(a => ({ aspect: a.aspect, count: a.review_count }))}>
                          <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                          <XAxis dataKey="aspect" stroke="#64748b" fontSize={10} angle={-20} textAnchor="end" height={50} />
                          <YAxis stroke="#64748b" fontSize={11} />
                          <Tooltip contentStyle={{ background: "#0f172a", border: "1px solid #1e293b", borderRadius: 8 }} />
                          <Bar dataKey="count" fill="#6366f1" />
                        </BarChart>
                        <p style={{ fontSize: 12, color: "#475569", marginTop: 8 }}>
                          Top {Math.min(6, data.top_aspects?.length || 0)} aspects mentioned in reviews
                        </p>
                      </Card>

                      {/* 7. SENTIMENT BY ASPECT */}
                      <Card>
                        <SectionTitle color="#10b981">Sentiment by Aspect</SectionTitle>
                        <BarChart width={340} height={200} data={(data.top_aspects || []).slice(0, 6).map(a => ({ 
                          aspect: a.aspect, 
                          positive: a.positive_count || 0, 
                          negative: a.negative_count || 0 
                        }))}>
                          <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                          <XAxis dataKey="aspect" stroke="#64748b" fontSize={10} angle={-20} textAnchor="end" height={50} />
                          <YAxis stroke="#64748b" fontSize={11} />
                          <Tooltip contentStyle={{ background: "#0f172a", border: "1px solid #1e293b", borderRadius: 8 }} />
                          <Bar dataKey="positive" stackId="a" fill="#10b981" />
                          <Bar dataKey="negative" stackId="a" fill="#f43f5e" />
                          <Legend wrapperStyle={{ fontSize: 11 }} />
                        </BarChart>
                        <p style={{ fontSize: 12, color: "#475569", marginTop: 8 }}>
                          Positive vs negative mentions per aspect
                        </p>
                      </Card>

                      {/* 8. REVIEW LENGTH DISTRIBUTION */}
                      <Card>
                        <SectionTitle color="#a855f7">Review Length Distribution</SectionTitle>
                        <BarChart width={340} height={200} data={[
                          { bucket: "0-50", count: analyticsData.review_length_distribution?.["0-50"] || 0 },
                          { bucket: "50-100", count: analyticsData.review_length_distribution?.["50-100"] || 0 },
                          { bucket: "100-200", count: analyticsData.review_length_distribution?.["100-200"] || 0 },
                          { bucket: "200+", count: analyticsData.review_length_distribution?.["200+"] || 0 },
                        ]}>
                          <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                          <XAxis dataKey="bucket" stroke="#64748b" fontSize={11} />
                          <YAxis stroke="#64748b" fontSize={11} />
                          <Tooltip contentStyle={{ background: "#0f172a", border: "1px solid #1e293b", borderRadius: 8 }} />
                          <Bar dataKey="count" fill="#a855f7" />
                        </BarChart>
                        <p style={{ fontSize: 12, color: "#475569", marginTop: 8 }}>
                          Character count distribution of reviews
                        </p>
                      </Card>

                      {/* 9. TRUST SCORE DISTRIBUTION */}
                      <Card>
                        <SectionTitle color="#14b8a6">Trust Score Distribution</SectionTitle>
                        <BarChart width={340} height={200} data={[
                          { bucket: "Low (0-0.3)", count: analyticsData.trust_distribution?.["0.0-0.3"] || 0 },
                          { bucket: "Med (0.3-0.6)", count: analyticsData.trust_distribution?.["0.3-0.6"] || 0 },
                          { bucket: "High (0.6-1.0)", count: analyticsData.trust_distribution?.["0.6-1.0"] || 0 },
                        ]}>
                          <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                          <XAxis dataKey="bucket" stroke="#64748b" fontSize={11} />
                          <YAxis stroke="#64748b" fontSize={11} />
                          <Tooltip contentStyle={{ background: "#0f172a", border: "1px solid #1e293b", borderRadius: 8 }} />
                          <Bar dataKey="count" fill="#14b8a6" />
                        </BarChart>
                        <p style={{ fontSize: 12, color: "#475569", marginTop: 8 }}>
                          Review trustworthiness distribution
                        </p>
                      </Card>

                      {/* 10. TOP PRODUCTS BY REVIEW COUNT */}
                      <Card>
                        <SectionTitle color="#818cf8">Top Products by Reviews</SectionTitle>
                        {topProducts ? (
                          <>
                            <BarChart width={340} height={200} layout="vertical" data={(topProducts.top_products || []).slice(0, 8)}>
                              <defs>
                                <linearGradient id="productGradient" x1="0" y1="0" x2="1" y2="0">
                                  <stop offset="0%" stopColor="#6366f1" />
                                  <stop offset="100%" stopColor="#a78bfa" />
                                </linearGradient>
                              </defs>
                              <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                              <XAxis type="number" stroke="#64748b" fontSize={11} />
                              <YAxis dataKey="product_id" type="category" stroke="#64748b" fontSize={9} width={80} />
                              <Tooltip contentStyle={{ background: "#0f172a", border: "1px solid #1e293b", borderRadius: 8 }} />
                              <Bar dataKey="count" fill="url(#productGradient)" />
                            </BarChart>
                            <p style={{ fontSize: 12, color: "#475569", marginTop: 8 }}>
                              {topProducts.total_products?.toLocaleString() || 0} products · {topProducts.total_reviews?.toLocaleString() || 0} total reviews
                            </p>
                          </>
                        ) : (
                          <p style={{ fontSize: 13, color: "#475569", textAlign: "center", padding: 40 }}>Loading top products...</p>
                        )}
                      </Card>
                    </div>
                  ) : (
                    <Card style={{ textAlign: "center", padding: "60px 24px" }}>
                      <p style={{ fontSize: 14, color: "#64748b" }}>No analytics data available. Try analyzing a product first.</p>
                    </Card>
                  )}
                </div>
              )}

              {/* COMPARE */}
              {tab === "compare" && cmpData && (
                <div style={{ display: "grid", gap: 16 }}>
                  
                  {/* Overall Winner Banner */}
                  <div style={{ 
                    background: cmpData.overall_winner === "tie" ? "#1e293b" : cmpData.overall_winner === cmpData.product_a ? "#4338ca20" : "#0f766e20",
                    border: `1px solid ${cmpData.overall_winner === "tie" ? "#334155" : cmpData.overall_winner === cmpData.product_a ? "#4338ca" : "#0f766e"}`,
                    borderRadius: 12, padding: "16px 20px", textAlign: "center"
                  }}>
                    <div style={{ fontSize: 11, color: "#64748b", marginBottom: 4 }}>OVERALL WINNER</div>
                    <div style={{ fontSize: 22, fontWeight: 800, color: cmpData.overall_winner === "tie" ? "#f59e0b" : "#10b981" }}>
                      {cmpData.overall_winner === "tie" ? "🤝 It's a Tie!" : `🏆 ${cmpData.overall_winner}`}
                    </div>
                    <div style={{ fontSize: 12, color: "#64748b", marginTop: 4 }}>
                      {cmpData.score_breakdown?.[cmpData.product_a] || 0} vs {cmpData.score_breakdown?.[cmpData.product_b] || 0} aspects won
                      {cmpData.score_breakdown?.ties > 0 && ` · ${cmpData.score_breakdown.ties} ties`}
                    </div>
                  </div>

                  {/* Product Summary Cards */}
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
                    {[cmpData.product_a, cmpData.product_b].map(p => (
                      <Card key={p} accent={cmpData.overall_winner === p ? "#10b98140" : undefined}>
                        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "start", marginBottom: 12 }}>
                          <div>
                            <div style={{ fontSize: 11, color: "#475569", marginBottom: 4 }}>Product</div>
                            <div style={{ fontSize: 18, fontWeight: 800, color: cmpData.overall_winner === p ? "#10b981" : "#818cf8" }}>{p}</div>
                          </div>
                          {cmpData.overall_winner === p && <Pill color="#10b981">Winner</Pill>}
                        </div>
                        <div style={{ fontSize: 11, color: "#475569", marginBottom: 4 }}>{cmpData.summary[p]?.category}</div>
                        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, marginBottom: 12 }}>
                          <div style={{ background: "#020818", padding: "8px 12px", borderRadius: 8 }}>
                            <div style={{ fontSize: 10, color: "#475569" }}>Confidence</div>
                            <div style={{ fontSize: 16, fontWeight: 700, color: pct(cmpData.summary[p]?.confidence) >= 70 ? "#10b981" : "#f59e0b" }}>
                              {pct(cmpData.summary[p]?.confidence)}%
                            </div>
                          </div>
                          <div style={{ background: "#020818", padding: "8px 12px", borderRadius: 8 }}>
                            <div style={{ fontSize: 10, color: "#475569" }}>Reviews</div>
                            <div style={{ fontSize: 16, fontWeight: 700, color: "#6366f1" }}>
                              {(cmpData.summary[p]?.reviews || 0).toLocaleString()}
                            </div>
                          </div>
                        </div>
                        <div style={{ fontSize: 12, color: "#94a3b8", lineHeight: 1.5 }}>
                          {cmpData.summary[p]?.summary_text?.slice(0, 200)}...
                        </div>
                      </Card>
                    ))}
                  </div>

                  {/* Aspect by Aspect Comparison */}
                  <Card>
                    <SectionTitle>Aspect by Aspect Comparison</SectionTitle>
                    {Object.entries(cmpData.comparison || {}).map(([aspect, v]) => (
                      <div key={aspect} style={{ padding: "12px 0", borderBottom: "1px solid #0f1e32" }}>
                        <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 8 }}>
                          <span style={{ fontSize: 13, fontWeight: 600, textTransform: "capitalize" }}>{aspect}</span>
                          <Pill color={v.winner === "tie" ? "#f59e0b" : v.winner === cmpData.product_a ? "#6366f1" : "#10b981"}>
                            {v.winner === "tie" ? "Tie" : `${v.winner} wins`}
                          </Pill>
                        </div>
                        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                          <div>
                            <div style={{ display: "flex", justifyContent: "space-between", fontSize: 11, color: "#475569", marginBottom: 4 }}>
                              <span>{cmpData.product_a}</span>
                              <span>{v[`${cmpData.product_a}_reviews`] || 0} reviews</span>
                            </div>
                            <ScoreBar score={v[cmpData.product_a]} color={v.winner === cmpData.product_a ? "#10b981" : undefined} />
                          </div>
                          <div>
                            <div style={{ display: "flex", justifyContent: "space-between", fontSize: 11, color: "#475569", marginBottom: 4 }}>
                              <span>{cmpData.product_b}</span>
                              <span>{v[`${cmpData.product_b}_reviews`] || 0} reviews</span>
                            </div>
                            <ScoreBar score={v[cmpData.product_b]} color={v.winner === cmpData.product_b ? "#10b981" : undefined} />
                          </div>
                        </div>
                      </div>
                    ))}
                  </Card>

                  {/* Pros & Cons Comparison */}
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
                    {[cmpData.product_a, cmpData.product_b].map(p => (
                      <Card key={p}>
                        <SectionTitle color={cmpData.overall_winner === p ? "#10b981" : "#818cf8"}>{p} — Pros & Cons</SectionTitle>
                        <div style={{ marginBottom: 16 }}>
                          <div style={{ fontSize: 11, color: "#10b981", fontWeight: 700, marginBottom: 8 }}>✅ PROS</div>
                          {(cmpData.pros_cons?.[p]?.pros || []).length === 0 
                            ? <div style={{ fontSize: 12, color: "#475569" }}>No significant pros found</div>
                            : (cmpData.pros_cons?.[p]?.pros || []).map((pro, i) => (
                              <div key={i} style={{ fontSize: 12, color: "#cbd5e1", padding: "6px 0", borderBottom: "1px solid #0f1e32" }}>
                                • {pro}
                              </div>
                            ))
                          }
                        </div>
                        <div>
                          <div style={{ fontSize: 11, color: "#f43f5e", fontWeight: 700, marginBottom: 8 }}>❌ CONS</div>
                          {(cmpData.pros_cons?.[p]?.cons || []).length === 0 
                            ? <div style={{ fontSize: 12, color: "#475569" }}>No significant cons found</div>
                            : (cmpData.pros_cons?.[p]?.cons || []).map((con, i) => (
                              <div key={i} style={{ fontSize: 12, color: "#cbd5e1", padding: "6px 0", borderBottom: "1px solid #0f1e32" }}>
                                • {con}
                              </div>
                            ))
                          }
                        </div>
                      </Card>
                    ))}
                  </div>

                  {/* Data Quality Comparison */}
                  <Card>
                    <SectionTitle>Data Quality Comparison</SectionTitle>
                    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
                      {[cmpData.product_a, cmpData.product_b].map(p => (
                        <div key={p} style={{ background: "#020818", borderRadius: 10, padding: "16px" }}>
                          <div style={{ fontSize: 13, fontWeight: 700, color: "#818cf8", marginBottom: 12 }}>{p}</div>
                          {[
                            ["Total Reviews", cmpData.audit_comparison?.[p]?.total_reviews, "#6366f1"],
                            ["Verified Purchases", cmpData.audit_comparison?.[p]?.verified_purchases, "#10b981"],
                            ["Suspected Fake", cmpData.audit_comparison?.[p]?.suspected_fake, "#f43f5e"],
                            ["Used in Analysis", cmpData.audit_comparison?.[p]?.used_in_analysis, "#10b981"],
                          ].map(([label, value, color]) => (
                            <div key={label} style={{ display: "flex", justifyContent: "space-between", padding: "6px 0", borderBottom: "1px solid #1e293b" }}>
                              <span style={{ fontSize: 12, color: "#64748b" }}>{label}</span>
                              <span style={{ fontSize: 12, fontWeight: 600, color }}>{(value || 0).toLocaleString()}</span>
                            </div>
                          ))}
                        </div>
                      ))}
                    </div>
                  </Card>

                  {/* Conflicts Comparison */}
                  {(cmpData.conflicts?.[cmpData.product_a]?.length > 0 || cmpData.conflicts?.[cmpData.product_b]?.length > 0) && (
                    <Card accent="#f9731630">
                      <SectionTitle color="#f97316">Conflicts Detected</SectionTitle>
                      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
                        {[cmpData.product_a, cmpData.product_b].map(p => (
                          <div key={p}>
                            <div style={{ fontSize: 12, fontWeight: 700, color: "#818cf8", marginBottom: 8 }}>{p}</div>
                            {(cmpData.conflicts?.[p] || []).length === 0 
                              ? <div style={{ fontSize: 12, color: "#10b981" }}>✅ No conflicts</div>
                              : (cmpData.conflicts?.[p] || []).map((c, i) => (
                                <div key={i} style={{ background: "#f9731610", border: "1px solid #f9731630", borderRadius: 8, padding: "10px", marginBottom: 8 }}>
                                  <div style={{ fontSize: 12, fontWeight: 600, textTransform: "capitalize" }}>{c.aspect}</div>
                                  <div style={{ fontSize: 11, color: "#f97316" }}>Conflict score: {pct(c.conflict_score)}%</div>
                                </div>
                              ))
                            }
                          </div>
                        ))}
                      </div>
                    </Card>
                  )}

                  {/* Sentiment Drift Comparison */}
                  {(Object.keys(cmpData.drift?.[cmpData.product_a] || {}).length > 0 || Object.keys(cmpData.drift?.[cmpData.product_b] || {}).length > 0) && (
                    <Card>
                      <SectionTitle>Sentiment Trends</SectionTitle>
                      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
                        {[cmpData.product_a, cmpData.product_b].map(p => (
                          <div key={p}>
                            <div style={{ fontSize: 12, fontWeight: 700, color: "#818cf8", marginBottom: 8 }}>{p}</div>
                            {Object.keys(cmpData.drift?.[p] || {}).length === 0 
                              ? <div style={{ fontSize: 12, color: "#475569" }}>No drift data</div>
                              : Object.entries(cmpData.drift?.[p] || {}).slice(0, 3).map(([aspect, v]) => (
                                <div key={aspect} style={{ 
                                  background: v.direction === "declining" ? "#f43f5e10" : v.direction === "improving" ? "#10b98110" : "#1e293b",
                                  borderRadius: 8, padding: "8px 10px", marginBottom: 6,
                                  border: `1px solid ${v.direction === "declining" ? "#f43f5e30" : v.direction === "improving" ? "#10b98130" : "#1e293b"}`
                                }}>
                                  <div style={{ fontSize: 11, fontWeight: 600, textTransform: "capitalize" }}>{aspect}</div>
                                  <div style={{ fontSize: 10, color: v.direction === "declining" ? "#f43f5e" : v.direction === "improving" ? "#10b981" : "#64748b" }}>
                                    {v.direction} · {pct(v.historical_score)}% → {pct(v.recent_score)}%
                                  </div>
                                </div>
                              ))
                            }
                          </div>
                        ))}
                      </div>
                    </Card>
                  )}

                </div>
              )}
            </>
          )}

          {/* Empty state */}
          {!data && !loading && (
            <div style={{ textAlign: "center", padding: "80px 24px" }}>
              <div style={{ fontSize: 56, marginBottom: 16 }}>🔍</div>
              <p style={{ fontSize: 18, fontWeight: 700, color: "#334155", marginBottom: 8 }}>Enter a product ID to analyze</p>
              <p style={{ fontSize: 13, color: "#1e293b" }}>Powered by spaCy · VADER · PostgreSQL · 685MB Amazon Dataset</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
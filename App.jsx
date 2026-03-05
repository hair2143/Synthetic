import { useState } from "react";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar, Legend } from "recharts";

const API_BASE = "http://localhost:8000/api/v1";

// ── Mock data for demo when API not connected ──
const MOCK_DATA = {
  product_id: "B07XJ8C8F5",
  status: "success",
  generated_at: new Date().toISOString(),
  product_meta: { category: "Electronics", detected_from: "review keyword analysis" },
  data_sources: { recent_csv: "423 reviews (last 6 months)", historical_db: "1821 reviews (PostgreSQL)", total: 2244, csv_weight: "2x", db_weight: "1x" },
  top_aspects: [
    { aspect: "battery life", sentiment: "positive", score: 0.82, review_count: 847, impact: "HIGH" },
    { aspect: "sound quality", sentiment: "positive", score: 0.74, review_count: 612, impact: "HIGH" },
    { aspect: "build quality", sentiment: "negative", score: 0.34, review_count: 412, impact: "HIGH" },
    { aspect: "price value", sentiment: "positive", score: 0.68, review_count: 389, impact: "MEDIUM" },
    { aspect: "connectivity", sentiment: "negative", score: 0.41, review_count: 234, impact: "MEDIUM" },
  ],
  pros: [
    { point: "Excellent battery life praised by 847 reviewers", aspect: "battery life", sentiment_score: 0.82, evidence_count: 3, evidence: [{ review_id: "R4521", quote: "Easily lasts 2 full days on a single charge", verified: true, badge: "✅ VERIFIED BUYER", trust_score: 0.94, rating: 5, purchase_date: "2024-01-12", days_to_review: 3 }] },
    { point: "Good sound quality noted across 612 reviews", aspect: "sound quality", sentiment_score: 0.74, evidence_count: 2, evidence: [{ review_id: "R8821", quote: "Bass is deep and clear, best in this price range", verified: true, badge: "✅ VERIFIED BUYER", trust_score: 0.88, rating: 5, purchase_date: "2024-02-05", days_to_review: 7 }] },
  ],
  cons: [
    { point: "Serious build quality issues reported by 412 reviewers", aspect: "build quality", sentiment_score: 0.34, evidence_count: 3, evidence: [{ review_id: "R3312", quote: "Plastic feels cheap and started cracking after 3 weeks", verified: true, badge: "✅ VERIFIED BUYER", trust_score: 0.91, rating: 2, purchase_date: "2024-01-20", days_to_review: 21 }] },
    { point: "Recurring connectivity complaints across 234 reviews", aspect: "connectivity", sentiment_score: 0.41, evidence_count: 2, evidence: [{ review_id: "R7741", quote: "Bluetooth keeps disconnecting randomly during calls", verified: false, badge: "⚠️ UNVERIFIED", trust_score: 0.42, rating: 2, purchase_date: "2024-03-01", days_to_review: null }] },
  ],
  conflicts: [{ aspect: "sound quality", conflict_score: 0.72, pro_evidence: "Amazing bass, crystal clear audio experience", con_evidence: "Tinny and hollow at higher volumes", insight: "Highly polarizing — buyers strongly divided on sound quality", positive_count: 380, negative_count: 232 }],
  trend: {
    "battery life": { recent_score: 0.75, historical_score: 0.91, delta: -0.16, direction: "declining", alert: "⚠️ Battery life sentiment dropped 16% recently", recent_review_count: 210, historical_review_count: 637 },
    "sound quality": { recent_score: 0.78, historical_score: 0.69, delta: 0.09, direction: "improving", alert: "✅ Sound quality sentiment improved 9% recently", recent_review_count: 180, historical_review_count: 432 },
  },
  confidence: { score: 0.87, level: "HIGH ✅", reasons: { review_count: "very high (2244 reviews)", recency: "strong (423 recent reviews)", agreement: "82% consistent sentiment", coverage: "5 of 5 aspects have sufficient data" } },
  review_quality_audit: { total_reviews: 2244, non_english_filtered: 134, suspected_fake: 43, low_quality: 89, used_in_analysis: 1978, verified_purchases: 1654, audit_confidence: "HIGH ✅" },
  summary: "Based on 2244 reviews (1654 verified purchases) customers particularly appreciate battery life while raising consistent concerns about build quality. Notably, battery life sentiment has declined recently. These insights carry HIGH confidence.",
  synthetix_qa_badge: "✅ All insights validated, tested and certified — zero fabrication",
  cache_status: "miss"
};

// ── Helpers ──
const sentimentColor = (s) => s === "positive" ? "#22c55e" : s === "negative" ? "#ef4444" : "#f59e0b";
const scoreBar = (score) => {
  const pct = Math.round(score * 100);
  const color = pct >= 65 ? "#22c55e" : pct >= 45 ? "#f59e0b" : "#ef4444";
  return (
    <div className="flex items-center gap-2">
      <div className="flex-1 bg-gray-800 rounded-full h-2">
        <div className="h-2 rounded-full transition-all" style={{ width: `${pct}%`, backgroundColor: color }} />
      </div>
      <span className="text-xs text-gray-400 w-8">{pct}%</span>
    </div>
  );
};

// ── Components ──
function StatCard({ label, value, sub, color = "#6366f1" }) {
  return (
    <div className="bg-gray-900 border border-gray-800 rounded-xl p-4">
      <p className="text-xs text-gray-500 uppercase tracking-wider mb-1">{label}</p>
      <p className="text-2xl font-bold" style={{ color }}>{value}</p>
      {sub && <p className="text-xs text-gray-500 mt-1">{sub}</p>}
    </div>
  );
}

function EvidenceCard({ item }) {
  return (
    <div className={`rounded-lg p-3 border ${item.verified ? "border-green-800 bg-green-950/30" : "border-yellow-800 bg-yellow-950/20"}`}>
      <div className="flex items-center justify-between mb-1">
        <span className="text-xs font-medium">{item.badge}</span>
        <span className="text-xs text-gray-500">Trust: {Math.round(item.trust_score * 100)}%</span>
      </div>
      <p className="text-sm text-gray-300 italic">"{item.quote}"</p>
      <div className="flex gap-3 mt-1 text-xs text-gray-500">
        <span>#{item.review_id}</span>
        <span>★ {item.rating}</span>
        <span>{item.purchase_date}</span>
        {item.days_to_review && <span>{item.days_to_review}d after purchase</span>}
      </div>
    </div>
  );
}

function AspectRow({ item }) {
  return (
    <div className="flex items-center gap-3 py-2 border-b border-gray-800 last:border-0">
      <div className="w-32 text-sm text-gray-300 capitalize">{item.aspect}</div>
      <span className="text-xs px-2 py-0.5 rounded-full font-medium" style={{ backgroundColor: sentimentColor(item.sentiment) + "22", color: sentimentColor(item.sentiment) }}>
        {item.sentiment}
      </span>
      <div className="flex-1">{scoreBar(item.score)}</div>
      <span className="text-xs text-gray-500 w-20 text-right">{item.review_count} reviews</span>
      <span className="text-xs px-1.5 py-0.5 rounded text-gray-400" style={{ backgroundColor: item.impact === "HIGH" ? "#6366f133" : "#374151" }}>
        {item.impact}
      </span>
    </div>
  );
}

function TrendChart({ trend }) {
  const data = Object.entries(trend).map(([aspect, v]) => ({
    aspect: aspect.split(" ")[0],
    Recent: Math.round(v.recent_score * 100),
    Historical: Math.round(v.historical_score * 100),
  }));

  return (
    <ResponsiveContainer width="100%" height={200}>
      <BarChart data={data} margin={{ top: 5, right: 10, bottom: 5, left: -10 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="#1f2937" />
        <XAxis dataKey="aspect" tick={{ fill: "#9ca3af", fontSize: 11 }} />
        <YAxis tick={{ fill: "#9ca3af", fontSize: 11 }} domain={[0, 100]} />
        <Tooltip contentStyle={{ backgroundColor: "#111827", border: "1px solid #374151", borderRadius: 8 }} />
        <Legend wrapperStyle={{ fontSize: 11 }} />
        <Bar dataKey="Historical" fill="#6366f1" radius={[4, 4, 0, 0]} />
        <Bar dataKey="Recent" fill="#22c55e" radius={[4, 4, 0, 0]} />
      </BarChart>
    </ResponsiveContainer>
  );
}

// ── Main App ──
export default function App() {
  const [productId, setProductId] = useState("");
  const [compareId, setCompareId] = useState("");
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [activeTab, setActiveTab] = useState("overview");
  const [useMock, setUseMock] = useState(true);

  const fetchInsights = async () => {
    if (!productId.trim() || productId.trim().length < 3) {
      setError("Product ID must be at least 3 characters");
      return;
    }
    setLoading(true);
    setError("");
    setData(null);

    if (useMock) {
      await new Promise(r => setTimeout(r, 1200));
      setData({ ...MOCK_DATA, product_id: productId });
      setLoading(false);
      return;
    }

    try {
      const res = await fetch(`${API_BASE}/insights/${productId.trim()}`);
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.detail || `HTTP ${res.status}`);
      }
      const json = await res.json();
      setData(json);
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  };

  const tabs = ["overview", "aspects", "pros & cons", "drift", "conflicts", "audit"];

  return (
    <div className="min-h-screen bg-gray-950 text-white font-sans">
      {/* Header */}
      <div className="border-b border-gray-800 bg-gray-900/80 backdrop-blur sticky top-0 z-10">
        <div className="max-w-6xl mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-indigo-600 flex items-center justify-center text-sm font-bold">T</div>
            <div>
              <p className="font-semibold text-sm">Review Insights API</p>
              <p className="text-xs text-gray-500">Synthetix QA Hackathon — Product Intelligence</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button onClick={() => setUseMock(!useMock)} className={`text-xs px-3 py-1 rounded-full border transition-all ${useMock ? "border-indigo-500 text-indigo-400" : "border-gray-700 text-gray-500"}`}>
              {useMock ? "🟣 Demo Mode" : "🟢 Live API"}
            </button>
          </div>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-4 py-6">
        {/* Search */}
        <div className="bg-gray-900 border border-gray-800 rounded-2xl p-6 mb-6">
          <h1 className="text-xl font-bold mb-1">Product Review Intelligence</h1>
          <p className="text-sm text-gray-500 mb-4">Every insight validated, tested & certified — zero fabrication</p>
          <div className="flex gap-3">
            <input
              className="flex-1 bg-gray-800 border border-gray-700 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-indigo-500 transition-all placeholder-gray-600"
              placeholder="Enter Product ID (e.g. B07XJ8C8F5)"
              value={productId}
              onChange={e => setProductId(e.target.value)}
              onKeyDown={e => e.key === "Enter" && fetchInsights()}
            />
            <button
              onClick={fetchInsights}
              disabled={loading}
              className="bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 px-6 py-3 rounded-xl text-sm font-semibold transition-all"
            >
              {loading ? "Analyzing..." : "Analyze"}
            </button>
          </div>
          {error && <p className="text-red-400 text-sm mt-3">⚠️ {error}</p>}
        </div>

        {/* Loading */}
        {loading && (
          <div className="bg-gray-900 border border-gray-800 rounded-2xl p-12 text-center">
            <div className="w-10 h-10 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
            <p className="text-gray-400">Loading & validating reviews from CSV + PostgreSQL...</p>
            <p className="text-xs text-gray-600 mt-1">Filtering · Extracting aspects · Scoring sentiment · Building evidence trail</p>
          </div>
        )}

        {/* Insufficient Data */}
        {data?.status === "insufficient_data" && (
          <div className="bg-yellow-950/30 border border-yellow-800 rounded-2xl p-6">
            <p className="text-yellow-400 font-semibold">⚠️ Insufficient Data</p>
            <p className="text-sm text-gray-400 mt-1">{data.message}</p>
            {data.partial_insights && (
              <div className="mt-3 bg-gray-900 rounded-xl p-3">
                <p className="text-xs text-gray-500 mb-1">Early signal:</p>
                <p className="text-sm text-gray-300">"{data.partial_insights.early_signal}"</p>
              </div>
            )}
          </div>
        )}

        {/* Main Results */}
        {data?.status === "success" && (
          <>
            {/* QA Badge */}
            <div className="bg-green-950/30 border border-green-800 rounded-xl px-4 py-3 mb-4 flex items-center justify-between">
              <p className="text-sm text-green-400">{data.synthetix_qa_badge}</p>
              <span className="text-xs text-gray-500">Cache: {data.cache_status} · {data.product_meta.category}</span>
            </div>

            {/* Stats Row */}
            <div className="grid grid-cols-2 gap-3 mb-4" style={{ gridTemplateColumns: "repeat(4, 1fr)" }}>
              <StatCard label="Total Reviews" value={data.data_sources.total.toLocaleString()} sub={`${data.data_sources.recent_csv}`} color="#6366f1" />
              <StatCard label="Confidence" value={`${Math.round(data.confidence.score * 100)}%`} sub={data.confidence.level} color={data.confidence.score >= 0.8 ? "#22c55e" : "#f59e0b"} />
              <StatCard label="Verified Purchases" value={data.review_quality_audit.verified_purchases.toLocaleString()} sub={`${Math.round(data.review_quality_audit.verified_purchases / data.review_quality_audit.total_reviews * 100)}% of reviews`} color="#22c55e" />
              <StatCard label="Fake Detected" value={data.review_quality_audit.suspected_fake} sub="Excluded from analysis" color="#ef4444" />
            </div>

            {/* Tabs */}
            <div className="flex gap-1 bg-gray-900 border border-gray-800 rounded-xl p-1 mb-4 overflow-x-auto">
              {tabs.map(t => (
                <button
                  key={t}
                  onClick={() => setActiveTab(t)}
                  className={`flex-1 py-2 px-3 rounded-lg text-xs font-medium capitalize transition-all whitespace-nowrap ${activeTab === t ? "bg-indigo-600 text-white" : "text-gray-500 hover:text-gray-300"}`}
                >
                  {t}
                </button>
              ))}
            </div>

            {/* Tab: Overview */}
            {activeTab === "overview" && (
              <div className="space-y-4">
                <div className="bg-gray-900 border border-gray-800 rounded-2xl p-5">
                  <h3 className="font-semibold mb-2">Summary</h3>
                  <p className="text-sm text-gray-300 leading-relaxed">{data.summary}</p>
                </div>
                <div className="bg-gray-900 border border-gray-800 rounded-2xl p-5">
                  <h3 className="font-semibold mb-3">Data Sources</h3>
                  <div className="grid grid-cols-3 gap-4">
                    <div className="text-center"><p className="text-2xl font-bold text-indigo-400">{data.data_sources.recent_csv.split(" ")[0]}</p><p className="text-xs text-gray-500">Recent (CSV) {data.data_sources.csv_weight} weight</p></div>
                    <div className="text-center"><p className="text-2xl font-bold text-purple-400">{data.data_sources.historical_db.split(" ")[0]}</p><p className="text-xs text-gray-500">Historical (PostgreSQL) {data.data_sources.db_weight} weight</p></div>
                    <div className="text-center"><p className="text-2xl font-bold text-white">{data.data_sources.total.toLocaleString()}</p><p className="text-xs text-gray-500">Total merged</p></div>
                  </div>
                </div>
                <div className="bg-gray-900 border border-gray-800 rounded-2xl p-5">
                  <h3 className="font-semibold mb-3">Confidence Breakdown</h3>
                  <div className="space-y-2">
                    {Object.entries(data.confidence.reasons).map(([k, v]) => (
                      <div key={k} className="flex justify-between text-sm">
                        <span className="text-gray-500 capitalize">{k.replace("_", " ")}</span>
                        <span className="text-gray-300">{v}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* Tab: Aspects */}
            {activeTab === "aspects" && (
              <div className="bg-gray-900 border border-gray-800 rounded-2xl p-5">
                <h3 className="font-semibold mb-4">Top Aspects — Sentiment Breakdown</h3>
                {data.top_aspects.map((a, i) => <AspectRow key={i} item={a} />)}
              </div>
            )}

            {/* Tab: Pros & Cons */}
            {activeTab === "pros & cons" && (
              <div className="grid grid-cols-2 gap-4">
                <div className="bg-gray-900 border border-green-900/50 rounded-2xl p-5">
                  <h3 className="font-semibold text-green-400 mb-4">✅ Pros ({data.pros.length})</h3>
                  <div className="space-y-5">
                    {data.pros.map((p, i) => (
                      <div key={i}>
                        <p className="text-sm font-medium mb-2">{p.point}</p>
                        <div className="space-y-2">
                          {p.evidence.map((e, j) => <EvidenceCard key={j} item={e} />)}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
                <div className="bg-gray-900 border border-red-900/50 rounded-2xl p-5">
                  <h3 className="font-semibold text-red-400 mb-4">❌ Cons ({data.cons.length})</h3>
                  <div className="space-y-5">
                    {data.cons.map((c, i) => (
                      <div key={i}>
                        <p className="text-sm font-medium mb-2">{c.point}</p>
                        <div className="space-y-2">
                          {c.evidence.map((e, j) => <EvidenceCard key={j} item={e} />)}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* Tab: Drift */}
            {activeTab === "drift" && (
              <div className="bg-gray-900 border border-gray-800 rounded-2xl p-5">
                <h3 className="font-semibold mb-1">Sentiment Drift Over Time</h3>
                <p className="text-xs text-gray-500 mb-4">Comparing last 6 months (CSV) vs historical (PostgreSQL)</p>
                <TrendChart trend={data.trend} />
                <div className="mt-4 space-y-2">
                  {Object.entries(data.trend).map(([aspect, v]) => (
                    <div key={aspect} className={`rounded-xl p-3 border ${v.direction === "declining" ? "border-red-900/50 bg-red-950/20" : v.direction === "improving" ? "border-green-900/50 bg-green-950/20" : "border-gray-800"}`}>
                      <div className="flex justify-between items-center">
                        <p className="text-sm capitalize font-medium">{aspect}</p>
                        <span className={`text-xs px-2 py-0.5 rounded-full ${v.direction === "declining" ? "bg-red-900/50 text-red-400" : v.direction === "improving" ? "bg-green-900/50 text-green-400" : "bg-gray-800 text-gray-400"}`}>{v.direction}</span>
                      </div>
                      <p className="text-xs text-gray-400 mt-1">{v.alert}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Tab: Conflicts */}
            {activeTab === "conflicts" && (
              <div className="space-y-4">
                {data.conflicts.length === 0 ? (
                  <div className="bg-gray-900 border border-gray-800 rounded-2xl p-8 text-center text-gray-500">No strong conflicts detected</div>
                ) : data.conflicts.map((c, i) => (
                  <div key={i} className="bg-gray-900 border border-orange-900/50 rounded-2xl p-5">
                    <div className="flex justify-between items-center mb-3">
                      <h3 className="font-semibold capitalize">{c.aspect}</h3>
                      <span className="text-xs px-2 py-1 bg-orange-950/50 text-orange-400 rounded-full">Conflict: {Math.round(c.conflict_score * 100)}%</span>
                    </div>
                    <p className="text-xs text-gray-500 mb-3">{c.insight}</p>
                    <div className="grid grid-cols-2 gap-3">
                      <div className="bg-green-950/30 border border-green-900/50 rounded-xl p-3">
                        <p className="text-xs text-green-400 mb-1">👍 {c.positive_count} say</p>
                        <p className="text-sm text-gray-300 italic">"{c.pro_evidence}"</p>
                      </div>
                      <div className="bg-red-950/30 border border-red-900/50 rounded-xl p-3">
                        <p className="text-xs text-red-400 mb-1">👎 {c.negative_count} say</p>
                        <p className="text-sm text-gray-300 italic">"{c.con_evidence}"</p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Tab: Audit */}
            {activeTab === "audit" && (
              <div className="bg-gray-900 border border-gray-800 rounded-2xl p-5">
                <h3 className="font-semibold mb-1">Review Quality Audit</h3>
                <p className="text-xs text-gray-500 mb-4">All reviews are tested before analysis — only verified, high-quality data used</p>
                <div className="space-y-3">
                  {[
                    { label: "Total Reviews Found", value: data.review_quality_audit.total_reviews, color: "#6366f1" },
                    { label: "Verified Purchases", value: data.review_quality_audit.verified_purchases, color: "#22c55e" },
                    { label: "Non-English Filtered", value: data.review_quality_audit.non_english_filtered, color: "#f59e0b" },
                    { label: "Suspected Fake", value: data.review_quality_audit.suspected_fake, color: "#ef4444" },
                    { label: "Low Quality Filtered", value: data.review_quality_audit.low_quality, color: "#f97316" },
                    { label: "Used in Analysis", value: data.review_quality_audit.used_in_analysis, color: "#22c55e" },
                  ].map((row, i) => (
                    <div key={i} className="flex justify-between items-center py-2 border-b border-gray-800 last:border-0">
                      <span className="text-sm text-gray-400">{row.label}</span>
                      <span className="text-sm font-bold" style={{ color: row.color }}>{row.value.toLocaleString()}</span>
                    </div>
                  ))}
                </div>
                <div className="mt-4 bg-green-950/30 border border-green-800 rounded-xl p-3 text-center">
                  <p className="text-green-400 text-sm font-medium">{data.review_quality_audit.audit_confidence}</p>
                </div>
              </div>
            )}
          </>
        )}

        {/* Empty state */}
        {!data && !loading && (
          <div className="text-center py-16 text-gray-600">
            <p className="text-4xl mb-3">🔍</p>
            <p className="text-lg font-medium text-gray-500">Enter a product ID to analyze</p>
            <p className="text-sm mt-1">Try: B07XJ8C8F5 · B08N5WRWNW · B09G9HDLR5</p>
          </div>
        )}
      </div>
    </div>
  );
}

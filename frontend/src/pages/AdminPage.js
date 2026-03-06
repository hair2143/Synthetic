import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend, LineChart, Line, PieChart, Pie, Cell } from "recharts";
import { useApp } from '../context/AppContext';

const API = "http://127.0.0.1:8000/api/v1";

const pct = (v) => Math.round((v || 0) * 100);

function Card({ children, style = {}, accent, onClick }) {
  return (
    <div onClick={onClick} style={{ 
      background: "#0f172a", 
      border: `1px solid ${accent || "#1e293b"}`, 
      borderRadius: 16, 
      padding: "20px 24px", 
      cursor: onClick ? 'pointer' : 'default',
      transition: 'all 0.2s ease',
      ...style 
    }}>
      {children}
    </div>
  );
}

function SectionTitle({ children, color = "#818cf8" }) {
  return <div style={{ fontSize: 11, fontWeight: 700, color, letterSpacing: "0.12em", textTransform: "uppercase", marginBottom: 16 }}>{children}</div>;
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

// Dynamic insight generators
function getRatingInsight(ratingDist, total) {
  if (!ratingDist || !total) return "No rating data available.";
  const fiveStar = ratingDist["5"] || 0;
  const fourStar = ratingDist["4"] || 0;
  const oneStar = ratingDist["1"] || 0;
  const positivePercent = Math.round(((fiveStar + fourStar) / total) * 100);
  const negativePercent = Math.round((oneStar / total) * 100);
  if (positivePercent >= 70) return `${positivePercent}% of reviews are 4-5 stars, indicating strong customer satisfaction.`;
  if (negativePercent >= 30) return `${negativePercent}% of reviews are 1-star, suggesting significant product issues.`;
  return `Mixed ratings: ${positivePercent}% positive (4-5 stars), ${negativePercent}% negative (1 star).`;
}

function getReviewTrendInsight(reviewsByYear) {
  if (!reviewsByYear || reviewsByYear.length < 2) return "Insufficient historical data for trend analysis.";
  const recent = reviewsByYear[reviewsByYear.length - 1]?.count || 0;
  const older = reviewsByYear[0]?.count || 0;
  const trend = recent > older ? "increasing" : recent < older ? "decreasing" : "stable";
  const peakYear = reviewsByYear.reduce((max, r) => r.count > max.count ? r : max, reviewsByYear[0]);
  return `Review volume is ${trend}. Peak activity was in ${peakYear?.year} with ${peakYear?.count?.toLocaleString()} reviews.`;
}

function getVerifiedInsight(verified, total) {
  if (!total) return "No verification data available.";
  const verifiedPct = Math.round((verified / total) * 100);
  if (verifiedPct >= 70) return `${verifiedPct}% of reviews are from verified buyers, ensuring high data reliability.`;
  if (verifiedPct >= 50) return `${verifiedPct}% verified purchases. Moderate reliability of review insights.`;
  return `Only ${verifiedPct}% verified purchases. Consider this when evaluating insights.`;
}

function getAvgRatingInsight(avgByYear) {
  if (!avgByYear || avgByYear.length < 2) return "Insufficient data for rating trend analysis.";
  const recent = avgByYear[avgByYear.length - 1]?.avg || 0;
  const older = avgByYear[0]?.avg || 0;
  const diff = (recent - older).toFixed(1);
  if (recent > older) return `Rating improved by ${diff} points over time. Quality perception is increasing.`;
  if (recent < older) return `Rating dropped by ${Math.abs(diff)} points. May indicate quality decline.`;
  return `Rating has remained stable around ${recent.toFixed(1)} stars over time.`;
}

function getReviewerInsight(topReviewers) {
  if (!topReviewers || topReviewers.length === 0) return "No reviewer data available.";
  const topCount = topReviewers[0]?.count || 0;
  if (topCount > 10) return `Top reviewer submitted ${topCount} reviews. Check for potential spam patterns.`;
  return `Review distribution appears normal. Top contributor has ${topCount} reviews.`;
}

function getAspectInsight(aspects) {
  if (!aspects || aspects.length === 0) return "No aspect data extracted.";
  const top = aspects[0]?.aspect || "unknown";
  return `"${top}" is the most discussed feature. Focus customer support and marketing here.`;
}

function getSentimentInsight(aspects) {
  if (!aspects || aspects.length === 0) return "No sentiment data available.";
  const mostPositive = aspects.reduce((best, a) => (a.positive_count || 0) > (best.positive_count || 0) ? a : best, aspects[0]);
  const mostNegative = aspects.reduce((worst, a) => (a.negative_count || 0) > (worst.negative_count || 0) ? a : worst, aspects[0]);
  return `Customers love "${mostPositive?.aspect}" but complain about "${mostNegative?.aspect}".`;
}

function getLengthInsight(lengthDist) {
  if (!lengthDist) return "No length data available.";
  const detailed = (lengthDist["100-200"] || 0) + (lengthDist["200+"] || 0);
  const short = lengthDist["0-50"] || 0;
  const total = Object.values(lengthDist).reduce((a, b) => a + b, 0);
  const detailedPct = Math.round((detailed / total) * 100);
  if (detailedPct >= 60) return `${detailedPct}% of reviews are detailed (100+ chars). High-quality feedback.`;
  return `${Math.round((short / total) * 100)}% are short reviews (<50 chars). May lack depth.`;
}

function getTrustInsight(trustDist) {
  if (!trustDist) return "No trust data available.";
  const high = trustDist["0.6-1.0"] || 0;
  const total = Object.values(trustDist).reduce((a, b) => a + b, 0);
  const highPct = Math.round((high / total) * 100);
  if (highPct >= 60) return `${highPct}% of reviews have high trust scores. Data is reliable.`;
  return `Only ${highPct}% high-trust reviews. Consider filtering low-quality feedback.`;
}

export default function AdminPage() {
  const navigate = useNavigate();
  const { currentUser, logout } = useApp();
  const [topProducts, setTopProducts] = useState(null);
  const [selectedProduct, setSelectedProduct] = useState(null);
  const [productData, setProductData] = useState(null);
  const [analyticsData, setAnalyticsData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [platformStats, setPlatformStats] = useState(null);
  const [tab, setTab] = useState("dashboard");
  const [searchQuery, setSearchQuery] = useState("");
  const [searchError, setSearchError] = useState("");

  // Redirect non-admin users
  useEffect(() => {
    if (!currentUser || currentUser.role !== 'admin') {
      navigate('/');
    }
  }, [currentUser, navigate]);

  // Fetch top products on mount
  useEffect(() => {
    fetchTopProducts();
  }, []);

  async function fetchTopProducts() {
    try {
      const res = await fetch(`${API}/analytics/top-products`);
      if (res.ok) {
        const data = await res.json();
        setTopProducts(data);
        setPlatformStats({
          totalProducts: data.total_products,
          totalReviews: data.total_reviews
        });
      }
    } catch (e) {
      console.error("Failed to fetch top products:", e);
    }
  }

  async function selectProduct(productId) {
    if (!productId || productId.trim().length < 3) {
      setSearchError("Product ID must be at least 3 characters");
      return;
    }
    setSelectedProduct(productId);
    setLoading(true);
    setProductData(null);
    setAnalyticsData(null);
    setSearchError("");

    try {
      const [insightsRes, analyticsRes] = await Promise.all([
        fetch(`${API}/insights/${productId}`),
        fetch(`${API}/analytics/${productId}`)
      ]);

      if (insightsRes.ok) {
        const insights = await insightsRes.json();
        setProductData(insights);
      } else {
        const err = await insightsRes.json();
        setSearchError(err.detail || "Product not found in database");
      }

      if (analyticsRes.ok) {
        const analytics = await analyticsRes.json();
        setAnalyticsData(analytics);
      }
    } catch (e) {
      console.error("Failed to fetch product data:", e);
      setSearchError("Failed to connect to API");
    } finally {
      setLoading(false);
    }
  }

  function handleSearch(e) {
    e.preventDefault();
    if (searchQuery.trim()) {
      selectProduct(searchQuery.trim());
    }
  }

  const tabs = [
    { id: "dashboard", label: "Dashboard" },
    { id: "search", label: "Search Product" },
    { id: "products", label: "All Products" },
    { id: "analytics", label: "Analytics" }
  ];

  return (
    <div style={{ minHeight: "100vh", background: "#020818", color: "#e2e8f0" }}>
      {/* Header */}
      <div style={{ background: "#0f172a", borderBottom: "1px solid #1e293b", padding: "16px 32px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
          <div style={{ fontSize: 24, fontWeight: 800, background: "linear-gradient(135deg, #6366f1, #a855f7)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>
            Synthetix Admin
          </div>
          <span style={{ fontSize: 11, color: "#10b981", background: "#10b98120", padding: "4px 10px", borderRadius: 99, fontWeight: 600 }}>
            ADMIN PANEL
          </span>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
          <span style={{ fontSize: 13, color: "#64748b" }}>{currentUser?.name || 'Admin'}</span>
          <button
            onClick={() => { logout(); navigate('/'); }}
            style={{ background: "#1e293b", border: "1px solid #334155", borderRadius: 8, padding: "8px 16px", color: "#94a3b8", cursor: "pointer", fontSize: 13 }}
          >
            Logout
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div style={{ background: "#0f172a", borderBottom: "1px solid #1e293b", padding: "0 32px", display: "flex", gap: 0 }}>
        {tabs.map(t => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            style={{
              background: tab === t.id ? "#1e293b" : "transparent",
              border: "none",
              borderBottom: tab === t.id ? "2px solid #6366f1" : "2px solid transparent",
              padding: "14px 24px",
              color: tab === t.id ? "#e2e8f0" : "#64748b",
              fontSize: 13,
              fontWeight: 600,
              cursor: "pointer",
              transition: "all 0.2s"
            }}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* Content */}
      <div style={{ padding: "32px", maxWidth: 1400, margin: "0 auto" }}>
        
        {/* DASHBOARD TAB */}
        {tab === "dashboard" && (
          <div>
            {/* Platform Stats */}
            <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 16, marginBottom: 32 }}>
              <StatBox label="Total Products" value={platformStats?.totalProducts?.toLocaleString() || "—"} color="#6366f1" sub="In database" />
              <StatBox label="Total Reviews" value={platformStats?.totalReviews?.toLocaleString() || "—"} color="#10b981" sub="Analyzed" />
              <StatBox label="API Status" value="Online" color="#10b981" sub="All systems operational" />
              <StatBox label="Cache" value="Active" color="#f59e0b" sub="Memory + DB caching" />
            </div>

            {/* Top Products Chart */}
            <Card style={{ marginBottom: 24 }}>
              <SectionTitle color="#818cf8">Product Popularity Ranking - Top 10 by Review Count</SectionTitle>
              {topProducts ? (
                <ResponsiveContainer width="100%" height={400}>
                  <BarChart data={topProducts.top_products || []} layout="vertical" margin={{ left: 20, right: 20 }}>
                    <defs>
                      <linearGradient id="adminBarGradient" x1="0" y1="0" x2="1" y2="0">
                        <stop offset="0%" stopColor="#6366f1" />
                        <stop offset="100%" stopColor="#a855f7" />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                    <XAxis type="number" stroke="#64748b" fontSize={11} />
                    <YAxis dataKey="product_id" type="category" stroke="#64748b" fontSize={11} width={120} />
                    <Tooltip 
                      contentStyle={{ background: "#0f172a", border: "1px solid #1e293b", borderRadius: 8 }}
                      formatter={(value) => [`${value.toLocaleString()} reviews`, 'Reviews']}
                    />
                    <Bar 
                      dataKey="count" 
                      fill="url(#adminBarGradient)" 
                      radius={[0, 4, 4, 0]}
                      onClick={(data) => selectProduct(data.product_id)}
                      style={{ cursor: 'pointer' }}
                    />
                  </BarChart>
                </ResponsiveContainer>
              ) : (
                <div style={{ textAlign: "center", padding: 60, color: "#64748b" }}>Loading...</div>
              )}
              <p style={{ fontSize: 12, color: "#10b981", marginTop: 12, padding: "10px 14px", background: "#10b98110", borderRadius: 8, border: "1px solid #10b98130" }}>
                These {topProducts?.top_products?.length || 0} products dominate the review dataset with {topProducts?.top_products?.[0]?.count?.toLocaleString() || 0} reviews for the top product. Click any bar to view detailed insights.
              </p>
            </Card>

            {/* Selected Product Insights */}
            {selectedProduct && (
              <div style={{ marginTop: 24 }}>
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 16 }}>
                  <h2 style={{ fontSize: 18, fontWeight: 700, color: "#e2e8f0", margin: 0 }}>
                    Insights: {selectedProduct}
                  </h2>
                  <button
                    onClick={() => { setSelectedProduct(null); setProductData(null); setAnalyticsData(null); }}
                    style={{ background: "#1e293b", border: "1px solid #334155", borderRadius: 8, padding: "8px 16px", color: "#94a3b8", cursor: "pointer", fontSize: 12 }}
                  >
                    Close
                  </button>
                </div>

                {loading ? (
                  <Card style={{ textAlign: "center", padding: 60 }}>
                    <div style={{ width: 40, height: 40, border: "3px solid #1e293b", borderTop: "3px solid #6366f1", borderRadius: "50%", animation: "spin 0.8s linear infinite", margin: "0 auto 16px" }} />
                    <p style={{ color: "#64748b" }}>Loading product insights...</p>
                  </Card>
                ) : productData ? (
                  <div>
                    {/* Quick Stats */}
                    <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 16, marginBottom: 24 }}>
                      <StatBox 
                        label="Total Reviews" 
                        value={productData.review_quality_audit?.total_reviews?.toLocaleString() || "—"} 
                        color="#6366f1" 
                      />
                      <StatBox 
                        label="Verified" 
                        value={`${pct(productData.review_quality_audit?.verified_purchases / productData.review_quality_audit?.total_reviews)}%`} 
                        color="#10b981" 
                      />
                      <StatBox 
                        label="Confidence" 
                        value={productData.confidence?.level || "—"} 
                        color={productData.confidence?.score > 0.7 ? "#10b981" : "#f59e0b"} 
                      />
                      <StatBox 
                        label="Aspects" 
                        value={productData.top_aspects?.length || 0} 
                        color="#818cf8" 
                      />
                    </div>

                    {/* Charts Grid */}
                    {analyticsData && (
                      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
                        {/* Rating Distribution */}
                        <Card>
                          <SectionTitle color="#f59e0b">1. Rating Distribution</SectionTitle>
                          <BarChart width={400} height={200} layout="vertical" data={[
                            { rating: "5 Stars", count: analyticsData.rating_distribution?.["5"] || 0 },
                            { rating: "4 Stars", count: analyticsData.rating_distribution?.["4"] || 0 },
                            { rating: "3 Stars", count: analyticsData.rating_distribution?.["3"] || 0 },
                            { rating: "2 Stars", count: analyticsData.rating_distribution?.["2"] || 0 },
                            { rating: "1 Star", count: analyticsData.rating_distribution?.["1"] || 0 },
                          ]}>
                            <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                            <XAxis type="number" stroke="#64748b" fontSize={11} />
                            <YAxis dataKey="rating" type="category" stroke="#64748b" fontSize={11} width={60} />
                            <Tooltip contentStyle={{ background: "#0f172a", border: "1px solid #1e293b", borderRadius: 8 }} />
                            <Bar dataKey="count">
                              <Cell fill="#10b981" />
                              <Cell fill="#22c55e" />
                              <Cell fill="#f59e0b" />
                              <Cell fill="#f97316" />
                              <Cell fill="#f43f5e" />
                            </Bar>
                          </BarChart>
                          <p style={{ fontSize: 12, color: "#10b981", marginTop: 8, padding: "8px 12px", background: "#10b98110", borderRadius: 6 }}>
                            {getRatingInsight(analyticsData.rating_distribution, analyticsData.total_reviews)}
                          </p>
                        </Card>

                        {/* Reviews Over Time */}
                        <Card>
                          <SectionTitle color="#6366f1">2. Reviews Over Time</SectionTitle>
                          <LineChart width={400} height={200} data={analyticsData.reviews_by_year || []}>
                            <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                            <XAxis dataKey="year" stroke="#64748b" fontSize={11} />
                            <YAxis stroke="#64748b" fontSize={11} />
                            <Tooltip contentStyle={{ background: "#0f172a", border: "1px solid #1e293b", borderRadius: 8 }} />
                            <Line type="monotone" dataKey="count" stroke="#6366f1" strokeWidth={2} dot={{ fill: "#6366f1" }} />
                          </LineChart>
                          <p style={{ fontSize: 12, color: "#6366f1", marginTop: 8, padding: "8px 12px", background: "#6366f110", borderRadius: 6 }}>
                            {getReviewTrendInsight(analyticsData.reviews_by_year)}
                          </p>
                        </Card>

                        {/* Verified vs Unverified */}
                        <Card>
                          <SectionTitle color="#10b981">3. Verified vs Non-Verified Purchases</SectionTitle>
                          <PieChart width={400} height={200}>
                            <Pie
                              data={[
                                { name: "Verified", value: productData.review_quality_audit?.verified_purchases || 0 },
                                { name: "Unverified", value: (productData.review_quality_audit?.total_reviews || 0) - (productData.review_quality_audit?.verified_purchases || 0) }
                              ]}
                              cx={200}
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
                          <p style={{ fontSize: 12, color: "#10b981", marginTop: 8, padding: "8px 12px", background: "#10b98110", borderRadius: 6 }}>
                            {getVerifiedInsight(productData.review_quality_audit?.verified_purchases, productData.review_quality_audit?.total_reviews)}
                          </p>
                        </Card>

                        {/* Sentiment by Aspect */}
                        <Card>
                          <SectionTitle color="#818cf8">4. Sentiment by Aspect</SectionTitle>
                          <BarChart width={400} height={200} data={(productData.top_aspects || []).slice(0, 5).map(a => ({ 
                            aspect: a.aspect, 
                            positive: a.positive_count || 0, 
                            negative: a.negative_count || 0 
                          }))}>
                            <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                            <XAxis dataKey="aspect" stroke="#64748b" fontSize={10} />
                            <YAxis stroke="#64748b" fontSize={11} />
                            <Tooltip contentStyle={{ background: "#0f172a", border: "1px solid #1e293b", borderRadius: 8 }} />
                            <Bar dataKey="positive" stackId="a" fill="#10b981" name="Positive" />
                            <Bar dataKey="negative" stackId="a" fill="#f43f5e" name="Negative" />
                            <Legend wrapperStyle={{ fontSize: 11 }} />
                          </BarChart>
                          <p style={{ fontSize: 12, color: "#818cf8", marginTop: 8, padding: "8px 12px", background: "#818cf810", borderRadius: 6 }}>
                            {getSentimentInsight(productData.top_aspects)}
                          </p>
                        </Card>

                        {/* 5. Average Rating Over Time */}
                        <Card>
                          <SectionTitle color="#f59e0b">5. Average Rating Over Time</SectionTitle>
                          <LineChart width={400} height={200} data={analyticsData.avg_rating_by_year || []}>
                            <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                            <XAxis dataKey="year" stroke="#64748b" fontSize={11} />
                            <YAxis domain={[1, 5]} stroke="#64748b" fontSize={11} />
                            <Tooltip contentStyle={{ background: "#0f172a", border: "1px solid #1e293b", borderRadius: 8 }} />
                            <Line type="monotone" dataKey="avg" stroke="#f59e0b" strokeWidth={2} dot={{ fill: "#f59e0b" }} />
                          </LineChart>
                          <p style={{ fontSize: 12, color: "#f59e0b", marginTop: 8, padding: "8px 12px", background: "#f59e0b10", borderRadius: 6 }}>
                            {getAvgRatingInsight(analyticsData.avg_rating_by_year)}
                          </p>
                        </Card>

                        {/* 6. Top Reviewers */}
                        <Card>
                          <SectionTitle color="#818cf8">6. Top Reviewers</SectionTitle>
                          <BarChart width={400} height={200} layout="vertical" data={(analyticsData.top_reviewers || []).slice(0, 6)}>
                            <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                            <XAxis type="number" stroke="#64748b" fontSize={11} />
                            <YAxis dataKey="reviewer_id" type="category" stroke="#64748b" fontSize={9} width={70} />
                            <Tooltip contentStyle={{ background: "#0f172a", border: "1px solid #1e293b", borderRadius: 8 }} />
                            <Bar dataKey="count" fill="#818cf8" />
                          </BarChart>
                          <p style={{ fontSize: 12, color: "#818cf8", marginTop: 8, padding: "8px 12px", background: "#818cf810", borderRadius: 6 }}>
                            {getReviewerInsight(analyticsData.top_reviewers)}
                          </p>
                        </Card>

                        {/* 7. Most Discussed Topics */}
                        <Card>
                          <SectionTitle color="#6366f1">7. Most Discussed Topics</SectionTitle>
                          <BarChart width={400} height={200} data={(productData.top_aspects || []).slice(0, 5).map(a => ({ aspect: a.aspect, count: a.review_count }))}>
                            <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                            <XAxis dataKey="aspect" stroke="#64748b" fontSize={10} />
                            <YAxis stroke="#64748b" fontSize={11} />
                            <Tooltip contentStyle={{ background: "#0f172a", border: "1px solid #1e293b", borderRadius: 8 }} />
                            <Bar dataKey="count" fill="#6366f1" />
                          </BarChart>
                          <p style={{ fontSize: 12, color: "#6366f1", marginTop: 8, padding: "8px 12px", background: "#6366f110", borderRadius: 6 }}>
                            {getAspectInsight(productData.top_aspects)}
                          </p>
                        </Card>

                        {/* 8. Review Length Distribution */}
                        <Card>
                          <SectionTitle color="#a855f7">8. Review Length Distribution</SectionTitle>
                          <BarChart width={400} height={200} data={[
                            { bucket: "0-50 chars", count: analyticsData.review_length_distribution?.["0-50"] || 0 },
                            { bucket: "50-100 chars", count: analyticsData.review_length_distribution?.["50-100"] || 0 },
                            { bucket: "100-200 chars", count: analyticsData.review_length_distribution?.["100-200"] || 0 },
                            { bucket: "200+ chars", count: analyticsData.review_length_distribution?.["200+"] || 0 },
                          ]}>
                            <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                            <XAxis dataKey="bucket" stroke="#64748b" fontSize={10} />
                            <YAxis stroke="#64748b" fontSize={11} />
                            <Tooltip contentStyle={{ background: "#0f172a", border: "1px solid #1e293b", borderRadius: 8 }} />
                            <Bar dataKey="count" fill="#a855f7" />
                          </BarChart>
                          <p style={{ fontSize: 12, color: "#a855f7", marginTop: 8, padding: "8px 12px", background: "#a855f710", borderRadius: 6 }}>
                            {getLengthInsight(analyticsData.review_length_distribution)}
                          </p>
                        </Card>

                        {/* 9. Trust Score Distribution */}
                        <Card>
                          <SectionTitle color="#14b8a6">9. Trust Score Distribution</SectionTitle>
                          <BarChart width={400} height={200} data={[
                            { bucket: "Low (0-0.3)", count: analyticsData.trust_distribution?.["0.0-0.3"] || 0 },
                            { bucket: "Medium (0.3-0.6)", count: analyticsData.trust_distribution?.["0.3-0.6"] || 0 },
                            { bucket: "High (0.6-1.0)", count: analyticsData.trust_distribution?.["0.6-1.0"] || 0 },
                          ]}>
                            <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                            <XAxis dataKey="bucket" stroke="#64748b" fontSize={10} />
                            <YAxis stroke="#64748b" fontSize={11} />
                            <Tooltip contentStyle={{ background: "#0f172a", border: "1px solid #1e293b", borderRadius: 8 }} />
                            <Bar dataKey="count" fill="#14b8a6" />
                          </BarChart>
                          <p style={{ fontSize: 12, color: "#14b8a6", marginTop: 8, padding: "8px 12px", background: "#14b8a610", borderRadius: 6 }}>
                            {getTrustInsight(analyticsData.trust_distribution)}
                          </p>
                        </Card>

                        {/* 10. Product Popularity Ranking */}
                        <Card>
                          <SectionTitle color="#818cf8">10. Product Popularity Ranking</SectionTitle>
                          <BarChart width={400} height={200} layout="vertical" data={(topProducts?.top_products || []).slice(0, 5)}>
                            <defs>
                              <linearGradient id="popularityGradient" x1="0" y1="0" x2="1" y2="0">
                                <stop offset="0%" stopColor="#6366f1" />
                                <stop offset="100%" stopColor="#a78bfa" />
                              </linearGradient>
                            </defs>
                            <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                            <XAxis type="number" stroke="#64748b" fontSize={11} />
                            <YAxis dataKey="product_id" type="category" stroke="#64748b" fontSize={9} width={70} />
                            <Tooltip contentStyle={{ background: "#0f172a", border: "1px solid #1e293b", borderRadius: 8 }} />
                            <Bar dataKey="count" fill="url(#popularityGradient)" />
                          </BarChart>
                          <p style={{ fontSize: 12, color: "#818cf8", marginTop: 8, padding: "8px 12px", background: "#818cf810", borderRadius: 6 }}>
                            These {topProducts?.top_products?.length || 0} products dominate the dataset with {topProducts?.total_reviews?.toLocaleString() || 0} total reviews.
                          </p>
                        </Card>
                      </div>
                    )}

                    {/* Summary */}
                    <Card style={{ marginTop: 16 }}>
                      <SectionTitle color="#6366f1">AI Summary</SectionTitle>
                      <p style={{ fontSize: 14, color: "#cbd5e1", lineHeight: 1.7, margin: 0 }}>
                        {productData.summary}
                      </p>
                    </Card>
                  </div>
                ) : (
                  <Card style={{ textAlign: "center", padding: 60 }}>
                    <p style={{ color: "#64748b" }}>No data available for this product</p>
                  </Card>
                )}
              </div>
            )}
          </div>
        )}

        {/* SEARCH TAB */}
        {tab === "search" && (
          <div>
            <h2 style={{ fontSize: 18, fontWeight: 700, marginBottom: 24 }}>Search Product by ID</h2>
            
            <Card style={{ marginBottom: 24 }}>
              <form onSubmit={handleSearch} style={{ display: "flex", gap: 12 }}>
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Enter Product ID (e.g., B003ES5ZUU)"
                  style={{
                    flex: 1,
                    background: "#1e293b",
                    border: "1px solid #334155",
                    borderRadius: 8,
                    padding: "14px 18px",
                    color: "#e2e8f0",
                    fontSize: 14,
                    outline: "none"
                  }}
                />
                <button
                  type="submit"
                  disabled={loading}
                  style={{
                    background: "#6366f1",
                    border: "none",
                    borderRadius: 8,
                    padding: "14px 28px",
                    color: "#fff",
                    fontSize: 14,
                    fontWeight: 600,
                    cursor: loading ? "not-allowed" : "pointer",
                    opacity: loading ? 0.7 : 1
                  }}
                >
                  {loading ? "Searching..." : "Get Insights"}
                </button>
              </form>
              {searchError && (
                <p style={{ color: "#f43f5e", fontSize: 13, marginTop: 12 }}>{searchError}</p>
              )}
              <p style={{ fontSize: 12, color: "#64748b", marginTop: 12 }}>
                Enter any product ID from the CSV file to fetch real-time insights and analytics.
              </p>
            </Card>

            {/* Quick Access */}
            <Card style={{ marginBottom: 24 }}>
              <SectionTitle color="#818cf8">Quick Access - Top Products</SectionTitle>
              <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
                {(topProducts?.top_products || []).slice(0, 10).map(p => (
                  <button
                    key={p.product_id}
                    onClick={() => { setSearchQuery(p.product_id); selectProduct(p.product_id); }}
                    style={{
                      background: selectedProduct === p.product_id ? "#6366f1" : "#1e293b",
                      border: "1px solid #334155",
                      borderRadius: 6,
                      padding: "8px 14px",
                      color: selectedProduct === p.product_id ? "#fff" : "#94a3b8",
                      fontSize: 12,
                      cursor: "pointer"
                    }}
                  >
                    {p.product_id} ({p.count?.toLocaleString()})
                  </button>
                ))}
              </div>
            </Card>

            {/* Search Results */}
            {selectedProduct && productData && (
              <div>
                <h3 style={{ fontSize: 16, fontWeight: 700, marginBottom: 16, color: "#e2e8f0" }}>
                  Results for: <span style={{ color: "#6366f1" }}>{selectedProduct}</span>
                </h3>
                
                {/* Quick Stats */}
                <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 16, marginBottom: 24 }}>
                  <StatBox label="Total Reviews" value={productData.review_quality_audit?.total_reviews?.toLocaleString() || "—"} color="#6366f1" />
                  <StatBox label="Verified" value={`${pct(productData.review_quality_audit?.verified_purchases / productData.review_quality_audit?.total_reviews)}%`} color="#10b981" />
                  <StatBox label="Confidence" value={productData.confidence?.level || "—"} color={productData.confidence?.score > 0.7 ? "#10b981" : "#f59e0b"} />
                  <StatBox label="Aspects" value={productData.top_aspects?.length || 0} color="#818cf8" />
                </div>

                {/* Summary */}
                <Card style={{ marginBottom: 16 }}>
                  <SectionTitle color="#6366f1">AI Summary</SectionTitle>
                  <p style={{ fontSize: 14, color: "#cbd5e1", lineHeight: 1.7, margin: 0 }}>
                    {productData.summary}
                  </p>
                </Card>

                {/* Charts Grid */}
                {analyticsData && (
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
                    <Card>
                      <SectionTitle color="#f59e0b">Rating Distribution</SectionTitle>
                      <BarChart width={400} height={180} layout="vertical" data={[
                        { rating: "5 Stars", count: analyticsData.rating_distribution?.["5"] || 0 },
                        { rating: "4 Stars", count: analyticsData.rating_distribution?.["4"] || 0 },
                        { rating: "3 Stars", count: analyticsData.rating_distribution?.["3"] || 0 },
                        { rating: "2 Stars", count: analyticsData.rating_distribution?.["2"] || 0 },
                        { rating: "1 Star", count: analyticsData.rating_distribution?.["1"] || 0 },
                      ]}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                        <XAxis type="number" stroke="#64748b" fontSize={11} />
                        <YAxis dataKey="rating" type="category" stroke="#64748b" fontSize={11} width={60} />
                        <Tooltip contentStyle={{ background: "#0f172a", border: "1px solid #1e293b", borderRadius: 8 }} />
                        <Bar dataKey="count">
                          <Cell fill="#10b981" /><Cell fill="#22c55e" /><Cell fill="#f59e0b" /><Cell fill="#f97316" /><Cell fill="#f43f5e" />
                        </Bar>
                      </BarChart>
                      <p style={{ fontSize: 11, color: "#10b981", marginTop: 6, padding: "6px 10px", background: "#10b98110", borderRadius: 6 }}>
                        {getRatingInsight(analyticsData.rating_distribution, analyticsData.total_reviews)}
                      </p>
                    </Card>

                    <Card>
                      <SectionTitle color="#818cf8">Sentiment by Aspect</SectionTitle>
                      <BarChart width={400} height={180} data={(productData.top_aspects || []).slice(0, 5).map(a => ({ 
                        aspect: a.aspect, positive: a.positive_count || 0, negative: a.negative_count || 0 
                      }))}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                        <XAxis dataKey="aspect" stroke="#64748b" fontSize={10} />
                        <YAxis stroke="#64748b" fontSize={11} />
                        <Tooltip contentStyle={{ background: "#0f172a", border: "1px solid #1e293b", borderRadius: 8 }} />
                        <Bar dataKey="positive" stackId="a" fill="#10b981" name="Positive" />
                        <Bar dataKey="negative" stackId="a" fill="#f43f5e" name="Negative" />
                        <Legend wrapperStyle={{ fontSize: 10 }} />
                      </BarChart>
                      <p style={{ fontSize: 11, color: "#818cf8", marginTop: 6, padding: "6px 10px", background: "#818cf810", borderRadius: 6 }}>
                        {getSentimentInsight(productData.top_aspects)}
                      </p>
                    </Card>
                  </div>
                )}
              </div>
            )}

            {loading && (
              <Card style={{ textAlign: "center", padding: 60 }}>
                <div style={{ width: 40, height: 40, border: "3px solid #1e293b", borderTop: "3px solid #6366f1", borderRadius: "50%", animation: "spin 0.8s linear infinite", margin: "0 auto 16px" }} />
                <p style={{ color: "#64748b" }}>Fetching insights from CSV...</p>
              </Card>
            )}
          </div>
        )}

        {/* PRODUCTS TAB */}
        {tab === "products" && (
          <div>
            <h2 style={{ fontSize: 18, fontWeight: 700, marginBottom: 24 }}>All Products ({topProducts?.top_products?.length || 0})</h2>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 16 }}>
              {(topProducts?.top_products || []).map((product, idx) => (
                <Card 
                  key={product.product_id} 
                  onClick={() => selectProduct(product.product_id)}
                  style={{ cursor: 'pointer' }}
                  accent={selectedProduct === product.product_id ? "#6366f1" : "#1e293b"}
                >
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 12 }}>
                    <span style={{ fontSize: 11, color: "#64748b" }}>#{idx + 1}</span>
                    <span style={{ fontSize: 11, color: "#10b981", background: "#10b98120", padding: "2px 8px", borderRadius: 99 }}>
                      {product.count?.toLocaleString()} reviews
                    </span>
                  </div>
                  <div style={{ fontSize: 15, fontWeight: 700, color: "#e2e8f0", marginBottom: 8, wordBreak: "break-all" }}>
                    {product.product_id}
                  </div>
                  <button
                    onClick={(e) => { e.stopPropagation(); selectProduct(product.product_id); setTab("dashboard"); }}
                    style={{ background: "#1e293b", border: "1px solid #334155", borderRadius: 6, padding: "6px 12px", color: "#818cf8", cursor: "pointer", fontSize: 11, fontWeight: 600, width: "100%" }}
                  >
                    View Insights
                  </button>
                </Card>
              ))}
            </div>
          </div>
        )}

        {/* ANALYTICS TAB */}
        {tab === "analytics" && (
          <div>
            <h2 style={{ fontSize: 18, fontWeight: 700, marginBottom: 24 }}>Platform Analytics</h2>
            
            {!selectedProduct ? (
              <Card style={{ textAlign: "center", padding: 60 }}>
                <p style={{ fontSize: 14, color: "#64748b", marginBottom: 16 }}>
                  Select a product from the Dashboard or Products tab to view detailed analytics
                </p>
                <button
                  onClick={() => setTab("products")}
                  style={{ background: "#6366f1", border: "none", borderRadius: 8, padding: "12px 24px", color: "#fff", cursor: "pointer", fontSize: 13, fontWeight: 600 }}
                >
                  Browse Products
                </button>
              </Card>
            ) : analyticsData ? (
              <div>
                <div style={{ display: "flex", alignItems: "center", gap: 16, marginBottom: 24 }}>
                  <span style={{ fontSize: 14, color: "#64748b" }}>Viewing analytics for:</span>
                  <span style={{ fontSize: 14, fontWeight: 700, color: "#6366f1" }}>{selectedProduct}</span>
                </div>
                
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
                  {/* All 10 Charts */}
                  
                  {/* 1. Rating Distribution */}
                  <Card>
                    <SectionTitle color="#f59e0b">Rating Distribution</SectionTitle>
                    <BarChart width={400} height={200} layout="vertical" data={[
                      { rating: "5★", count: analyticsData.rating_distribution?.["5"] || 0 },
                      { rating: "4★", count: analyticsData.rating_distribution?.["4"] || 0 },
                      { rating: "3★", count: analyticsData.rating_distribution?.["3"] || 0 },
                      { rating: "2★", count: analyticsData.rating_distribution?.["2"] || 0 },
                      { rating: "1★", count: analyticsData.rating_distribution?.["1"] || 0 },
                    ]}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                      <XAxis type="number" stroke="#64748b" fontSize={11} />
                      <YAxis dataKey="rating" type="category" stroke="#64748b" fontSize={11} width={40} />
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
                      {analyticsData.rating_distribution?.["5"] || 0} five-star reviews
                    </p>
                  </Card>

                  {/* 2. Reviews Over Time */}
                  <Card>
                    <SectionTitle color="#6366f1">Reviews Over Time</SectionTitle>
                    <LineChart width={400} height={200} data={analyticsData.reviews_by_year || []}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                      <XAxis dataKey="year" stroke="#64748b" fontSize={11} />
                      <YAxis stroke="#64748b" fontSize={11} />
                      <Tooltip contentStyle={{ background: "#0f172a", border: "1px solid #1e293b", borderRadius: 8 }} />
                      <Line type="monotone" dataKey="count" stroke="#6366f1" strokeWidth={2} dot={{ fill: "#6366f1" }} />
                    </LineChart>
                    <p style={{ fontSize: 12, color: "#475569", marginTop: 8 }}>
                      {analyticsData.reviews_by_year?.length || 0} years of data
                    </p>
                  </Card>

                  {/* 3. Verified vs Unverified */}
                  <Card>
                    <SectionTitle color="#10b981">Verified vs Unverified</SectionTitle>
                    <PieChart width={400} height={200}>
                      <Pie
                        data={[
                          { name: "Verified", value: productData?.review_quality_audit?.verified_purchases || 0 },
                          { name: "Unverified", value: (productData?.review_quality_audit?.total_reviews || 0) - (productData?.review_quality_audit?.verified_purchases || 0) }
                        ]}
                        cx={200}
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
                      {productData?.review_quality_audit?.verified_purchases || 0} verified purchases
                    </p>
                  </Card>

                  {/* 4. Average Rating Over Time */}
                  <Card>
                    <SectionTitle color="#f59e0b">Average Rating Over Time</SectionTitle>
                    <LineChart width={400} height={200} data={analyticsData.avg_rating_by_year || []}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                      <XAxis dataKey="year" stroke="#64748b" fontSize={11} />
                      <YAxis domain={[1, 5]} stroke="#64748b" fontSize={11} />
                      <Tooltip contentStyle={{ background: "#0f172a", border: "1px solid #1e293b", borderRadius: 8 }} />
                      <Line type="monotone" dataKey="avg" stroke="#f59e0b" strokeWidth={2} dot={{ fill: "#f59e0b" }} />
                    </LineChart>
                    <p style={{ fontSize: 12, color: "#475569", marginTop: 8 }}>
                      Rating trend over time
                    </p>
                  </Card>

                  {/* 5. Top Reviewers */}
                  <Card>
                    <SectionTitle color="#818cf8">Top Reviewers</SectionTitle>
                    <BarChart width={400} height={200} layout="vertical" data={(analyticsData.top_reviewers || []).slice(0, 8)}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                      <XAxis type="number" stroke="#64748b" fontSize={11} />
                      <YAxis dataKey="reviewer_id" type="category" stroke="#64748b" fontSize={10} width={80} />
                      <Tooltip contentStyle={{ background: "#0f172a", border: "1px solid #1e293b", borderRadius: 8 }} />
                      <Bar dataKey="count" fill="#818cf8" />
                    </BarChart>
                    <p style={{ fontSize: 12, color: "#475569", marginTop: 8 }}>
                      Most active reviewers
                    </p>
                  </Card>

                  {/* 6. Most Discussed Topics */}
                  <Card>
                    <SectionTitle color="#6366f1">Most Discussed Topics</SectionTitle>
                    <BarChart width={400} height={200} data={(productData?.top_aspects || []).slice(0, 6).map(a => ({ aspect: a.aspect, count: a.review_count }))}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                      <XAxis dataKey="aspect" stroke="#64748b" fontSize={10} />
                      <YAxis stroke="#64748b" fontSize={11} />
                      <Tooltip contentStyle={{ background: "#0f172a", border: "1px solid #1e293b", borderRadius: 8 }} />
                      <Bar dataKey="count" fill="#6366f1" />
                    </BarChart>
                    <p style={{ fontSize: 12, color: "#475569", marginTop: 8 }}>
                      Top aspects mentioned
                    </p>
                  </Card>

                  {/* 7. Sentiment by Aspect */}
                  <Card>
                    <SectionTitle color="#10b981">Sentiment by Aspect</SectionTitle>
                    <BarChart width={400} height={200} data={(productData?.top_aspects || []).slice(0, 6).map(a => ({ 
                      aspect: a.aspect, 
                      positive: a.positive_count || 0, 
                      negative: a.negative_count || 0 
                    }))}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                      <XAxis dataKey="aspect" stroke="#64748b" fontSize={10} />
                      <YAxis stroke="#64748b" fontSize={11} />
                      <Tooltip contentStyle={{ background: "#0f172a", border: "1px solid #1e293b", borderRadius: 8 }} />
                      <Bar dataKey="positive" stackId="a" fill="#10b981" />
                      <Bar dataKey="negative" stackId="a" fill="#f43f5e" />
                      <Legend wrapperStyle={{ fontSize: 11 }} />
                    </BarChart>
                    <p style={{ fontSize: 12, color: "#475569", marginTop: 8 }}>
                      Positive vs negative mentions
                    </p>
                  </Card>

                  {/* 8. Review Length Distribution */}
                  <Card>
                    <SectionTitle color="#a855f7">Review Length Distribution</SectionTitle>
                    <BarChart width={400} height={200} data={[
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
                      Character count distribution
                    </p>
                  </Card>

                  {/* 9. Trust Score Distribution */}
                  <Card>
                    <SectionTitle color="#14b8a6">Trust Score Distribution</SectionTitle>
                    <BarChart width={400} height={200} data={[
                      { bucket: "Low", count: analyticsData.trust_distribution?.["0.0-0.3"] || 0 },
                      { bucket: "Medium", count: analyticsData.trust_distribution?.["0.3-0.6"] || 0 },
                      { bucket: "High", count: analyticsData.trust_distribution?.["0.6-1.0"] || 0 },
                    ]}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                      <XAxis dataKey="bucket" stroke="#64748b" fontSize={11} />
                      <YAxis stroke="#64748b" fontSize={11} />
                      <Tooltip contentStyle={{ background: "#0f172a", border: "1px solid #1e293b", borderRadius: 8 }} />
                      <Bar dataKey="count" fill="#14b8a6" />
                    </BarChart>
                    <p style={{ fontSize: 12, color: "#475569", marginTop: 8 }}>
                      Review trustworthiness
                    </p>
                  </Card>

                  {/* 10. Top Products */}
                  <Card>
                    <SectionTitle color="#818cf8">Top Products by Reviews</SectionTitle>
                    <BarChart width={400} height={200} layout="vertical" data={(topProducts?.top_products || []).slice(0, 8)}>
                      <defs>
                        <linearGradient id="analyticsGradient" x1="0" y1="0" x2="1" y2="0">
                          <stop offset="0%" stopColor="#6366f1" />
                          <stop offset="100%" stopColor="#a78bfa" />
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                      <XAxis type="number" stroke="#64748b" fontSize={11} />
                      <YAxis dataKey="product_id" type="category" stroke="#64748b" fontSize={9} width={80} />
                      <Tooltip contentStyle={{ background: "#0f172a", border: "1px solid #1e293b", borderRadius: 8 }} />
                      <Bar dataKey="count" fill="url(#analyticsGradient)" />
                    </BarChart>
                    <p style={{ fontSize: 12, color: "#475569", marginTop: 8 }}>
                      {topProducts?.total_products?.toLocaleString() || 0} products total
                    </p>
                  </Card>
                </div>
              </div>
            ) : (
              <Card style={{ textAlign: "center", padding: 60 }}>
                <div style={{ width: 40, height: 40, border: "3px solid #1e293b", borderTop: "3px solid #6366f1", borderRadius: "50%", animation: "spin 0.8s linear infinite", margin: "0 auto 16px" }} />
                <p style={{ color: "#64748b" }}>Loading analytics...</p>
              </Card>
            )}
          </div>
        )}
      </div>

      {/* Spinner Animation */}
      <style>{`
        @keyframes spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
}

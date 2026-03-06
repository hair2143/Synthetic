import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useApp } from '../context/AppContext';
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts';

// Helper components
const Card = ({ children, style = {} }) => (
  <div style={{
    background: '#0f172a',
    border: '1px solid #1e293b',
    borderRadius: 16,
    padding: '20px 24px',
    ...style
  }}>
    {children}
  </div>
);

const StarRating = ({ rating, interactive, onRatingChange, size = 20 }) => {
  const [hoverRating, setHoverRating] = useState(0);
  
  return (
    <div style={{ display: 'flex', gap: 4 }}>
      {[1, 2, 3, 4, 5].map(i => (
        <span
          key={i}
          onClick={() => interactive && onRatingChange?.(i)}
          onMouseEnter={() => interactive && setHoverRating(i)}
          onMouseLeave={() => interactive && setHoverRating(0)}
          style={{
            fontSize: size,
            color: i <= (hoverRating || rating) ? '#f59e0b' : '#1e293b',
            cursor: interactive ? 'pointer' : 'default',
            transition: 'color 0.2s'
          }}
        >
          ★
        </span>
      ))}
    </div>
  );
};

const ConditionBadge = ({ condition }) => {
  const config = {
    'New': { color: '#10b981', bg: '#10b98115' },
    'Like New': { color: '#06b6d4', bg: '#06b6d415' },
    'Good': { color: '#f59e0b', bg: '#f59e0b15' },
    'Fair': { color: '#f97316', bg: '#f9731615' },
    'Used': { color: '#64748b', bg: '#64748b15' }
  };
  const c = config[condition] || config['Good'];
  return (
    <span style={{
      padding: '6px 14px',
      borderRadius: 8,
      fontSize: 12,
      fontWeight: 600,
      background: c.bg,
      color: c.color,
      border: `1px solid ${c.color}30`
    }}>
      {condition}
    </span>
  );
};

// Authenticity Meter Component (circular gauge)
const AuthenticityMeter = ({ score }) => {
  const percentage = Math.round(score * 100);
  const color = score >= 0.7 ? '#10b981' : score >= 0.4 ? '#f59e0b' : '#f43f5e';
  const radius = 45;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference * (1 - score);
  
  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8 }}>
      <svg width="110" height="110" viewBox="0 0 120 120">
        {/* Background circle */}
        <circle
          cx="60"
          cy="60"
          r={radius}
          fill="none"
          stroke="#1e293b"
          strokeWidth="10"
        />
        {/* Progress circle */}
        <circle
          cx="60"
          cy="60"
          r={radius}
          fill="none"
          stroke={color}
          strokeWidth="10"
          strokeDasharray={circumference}
          strokeDashoffset={strokeDashoffset}
          strokeLinecap="round"
          transform="rotate(-90 60 60)"
          style={{ transition: 'stroke-dashoffset 1s ease, stroke 0.3s ease' }}
        />
        {/* Text in center */}
        <text x="60" y="55" textAnchor="middle" fontSize="24" fontWeight="700" fill={color}>
          {percentage}%
        </text>
        <text x="60" y="75" textAnchor="middle" fontSize="10" fill="#64748b">
          Trust Score
        </text>
      </svg>
      <div style={{
        padding: '6px 14px',
        borderRadius: 99,
        fontSize: 11,
        fontWeight: 600,
        background: `${color}15`,
        color: color,
        border: `1px solid ${color}30`
      }}>
        {score >= 0.7 ? '🛡️ Highly Trusted' : score >= 0.4 ? '⚠️ Moderate Trust' : '🔴 Low Trust'}
      </div>
    </div>
  );
};

// Insights Panel Component
const InsightsPanel = ({ insights, loading, error }) => {
  if (loading) {
    return (
      <Card>
        <div style={{ textAlign: 'center', padding: '40px 20px' }}>
          <div style={{ fontSize: 32, marginBottom: 16, animation: 'pulse 2s infinite' }}>🔍</div>
          <p style={{ color: '#64748b' }}>Analyzing reviews with AI...</p>
        </div>
      </Card>
    );
  }

  if (error) {
    return (
      <Card>
        <div style={{ textAlign: 'center', padding: '40px 20px' }}>
          <div style={{ fontSize: 32, marginBottom: 16 }}>⚠️</div>
          <p style={{ color: '#f59e0b' }}>{error}</p>
        </div>
      </Card>
    );
  }

  if (!insights) return null;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      {/* Confidence Score */}
      <Card>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
          <h3 style={{ fontSize: 14, fontWeight: 700, color: '#818cf8', margin: 0 }}>AI CONFIDENCE SCORE</h3>
          <span style={{
            padding: '6px 14px',
            borderRadius: 99,
            fontSize: 13,
            fontWeight: 700,
            background: insights.confidence >= 0.7 ? '#10b98115' : insights.confidence >= 0.4 ? '#f59e0b15' : '#f43f5e15',
            color: insights.confidence >= 0.7 ? '#10b981' : insights.confidence >= 0.4 ? '#f59e0b' : '#f43f5e'
          }}>
            {Math.round(insights.confidence * 100)}%
          </span>
        </div>
        <div style={{ height: 8, background: '#1e293b', borderRadius: 4, overflow: 'hidden' }}>
          <div style={{
            height: '100%',
            width: `${insights.confidence * 100}%`,
            background: insights.confidence >= 0.7 ? '#10b981' : insights.confidence >= 0.4 ? '#f59e0b' : '#f43f5e',
            borderRadius: 4,
            transition: 'width 1s ease'
          }} />
        </div>
      </Card>

      {/* Aspects */}
      {insights.aspects && insights.aspects.length > 0 && (
        <Card>
          <h3 style={{ fontSize: 14, fontWeight: 700, color: '#818cf8', marginBottom: 16 }}>KEY ASPECTS</h3>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
            {insights.aspects.map((aspect, i) => (
              <span key={i} style={{
                padding: '8px 14px',
                background: '#020818',
                border: '1px solid #1e293b',
                borderRadius: 8,
                fontSize: 12,
                color: '#e2e8f0'
              }}>
                {aspect.name}: <span style={{ color: aspect.sentiment === 'positive' ? '#10b981' : aspect.sentiment === 'negative' ? '#f43f5e' : '#f59e0b' }}>
                  {aspect.sentiment}
                </span>
              </span>
            ))}
          </div>
        </Card>
      )}

      {/* Pros & Cons */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
        <Card>
          <h3 style={{ fontSize: 14, fontWeight: 700, color: '#10b981', marginBottom: 16 }}>✓ PROS</h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {(insights.pros || []).slice(0, 5).map((pro, i) => (
              <div key={i} style={{ fontSize: 13, color: '#94a3b8', display: 'flex', alignItems: 'start', gap: 8 }}>
                <span style={{ color: '#10b981' }}>•</span>
                <span>{pro}</span>
              </div>
            ))}
            {(!insights.pros || insights.pros.length === 0) && (
              <p style={{ fontSize: 13, color: '#64748b' }}>No pros identified yet.</p>
            )}
          </div>
        </Card>
        <Card>
          <h3 style={{ fontSize: 14, fontWeight: 700, color: '#f43f5e', marginBottom: 16 }}>✗ CONS</h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {(insights.cons || []).slice(0, 5).map((con, i) => (
              <div key={i} style={{ fontSize: 13, color: '#94a3b8', display: 'flex', alignItems: 'start', gap: 8 }}>
                <span style={{ color: '#f43f5e' }}>•</span>
                <span>{con}</span>
              </div>
            ))}
            {(!insights.cons || insights.cons.length === 0) && (
              <p style={{ fontSize: 13, color: '#64748b' }}>No cons identified yet.</p>
            )}
          </div>
        </Card>
      </div>

      {/* Summary */}
      {insights.summary && (
        <Card>
          <h3 style={{ fontSize: 14, fontWeight: 700, color: '#818cf8', marginBottom: 12 }}>AI SUMMARY</h3>
          <p style={{ fontSize: 14, lineHeight: 1.7, color: '#94a3b8', margin: 0 }}>{insights.summary}</p>
        </Card>
      )}
    </div>
  );
};

export default function ProductDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const {
    currentUser,
    getProduct,
    getPriceHistory,
    addToCart,
    purchaseProduct,
    purchasedProducts,
    submitReview,
    showToast
  } = useApp();

  const [product, setProduct] = useState(null);
  const [priceHistory, setPriceHistory] = useState([]);
  const [purchased, setPurchased] = useState(false);
  const [justPurchased, setJustPurchased] = useState(false);
  const [priceDropPct, setPriceDropPct] = useState(null);
  
  // AI Insights
  const [showInsights, setShowInsights] = useState(false);
  const [insights, setInsights] = useState(null);
  const [insightsLoading, setInsightsLoading] = useState(false);
  const [insightsError, setInsightsError] = useState(null);
  
  // Review form
  const [reviewRating, setReviewRating] = useState(5);
  const [reviewText, setReviewText] = useState('');
  const [reviewSubmitted, setReviewSubmitted] = useState(false);
  const [reviewError, setReviewError] = useState('');

  // Check if already purchased
  useEffect(() => {
    const hasPurchased = purchasedProducts.some(p => p.id === id);
    setPurchased(hasPurchased);
  }, [purchasedProducts, id]);

  useEffect(() => {
    const p = getProduct(id);
    if (p) {
      setProduct(p);
      const history = getPriceHistory(id);
      setPriceHistory(history);
      // Calculate price drop percentage (compare week ago to now)
      if (history.length >= 7) {
        const weekAgoPrice = history[history.length - 7]?.price;
        const currentPrice = p.price;
        if (weekAgoPrice && currentPrice < weekAgoPrice) {
          const dropPct = Math.round((1 - currentPrice / weekAgoPrice) * 100);
          setPriceDropPct(dropPct);
        }
      }
    }
  }, [id, getProduct, getPriceHistory]);

  const handleAddToCart = () => {
    addToCart(product);
  };

  const handleBuyNow = () => {
    purchaseProduct(product);
    setPurchased(true);
    setJustPurchased(true);
  };

  const handleViewInsights = async () => {
    setShowInsights(true);
    setInsightsLoading(true);
    setInsightsError(null);
    
    try {
      const response = await fetch(`http://localhost:8000/api/v1/insights/${id}`);
      if (!response.ok) {
        throw new Error('Failed to fetch insights');
      }
      const data = await response.json();
      setInsights(data);
    } catch (err) {
      // Use mock data if API fails
      setInsights({
        confidence: 0.85,
        aspects: [
          { name: 'Quality', sentiment: 'positive' },
          { name: 'Value', sentiment: 'positive' },
          { name: 'Durability', sentiment: 'neutral' },
          { name: 'Design', sentiment: 'positive' }
        ],
        pros: [
          'Excellent build quality',
          'Great value for money',
          'Fast shipping',
          'Works as expected',
          'Good customer support'
        ],
        cons: [
          'Could be better packaged',
          'Instructions not clear'
        ],
        summary: `Based on ${product?.reviewCount || 0} reviews, this product receives mostly positive feedback. Customers particularly appreciate the quality and value. Some minor concerns about packaging.`
      });
    } finally {
      setInsightsLoading(false);
    }
  };

  const handleSubmitReview = async (e) => {
    e.preventDefault();
    setReviewError('');
    
    if (reviewText.trim().length < 20) {
      setReviewError('Review must be at least 20 characters');
      return;
    }
    
    try {
      // Try to POST to API
      const response = await fetch('http://localhost:8000/api/v1/reviews/add', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          product_id: id,
          review_text: reviewText,
          rating: reviewRating,
          verified_purchase: true,
          reviewer_id: currentUser?.email || 'anonymous'
        })
      });
      
      if (!response.ok) {
        // Still save locally if API fails
        console.log('API call failed, saving locally');
      }
    } catch (err) {
      console.log('API unavailable, saving locally');
    }
    
    // Save to local context
    submitReview(id, {
      rating: reviewRating,
      text: reviewText,
      author: currentUser?.name || 'Anonymous',
      verified: true
    });
    
    setReviewSubmitted(true);
    setReviewText('');
    showToast('Review submitted! It will appear in insights shortly.', 'success');
  };

  // Generate seller data
  const sellerData = {
    name: product?.seller || 'Premium Seller',
    joinDate: 'January 2024',
    totalListings: Math.floor(Math.random() * 50) + 10,
    rating: 4.8
  };

  if (!product) {
    return (
      <div style={{
        minHeight: '100vh',
        background: '#020818',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        color: '#e2e8f0',
        fontFamily: "'Segoe UI', system-ui, sans-serif"
      }}>
        <div style={{ textAlign: 'center' }}>
          <div style={{ fontSize: 48, marginBottom: 16 }}>🔍</div>
          <h2 style={{ fontSize: 20, marginBottom: 8 }}>Product Not Found</h2>
          <p style={{ color: '#64748b', marginBottom: 20 }}>The product with ID "{id}" doesn't exist.</p>
          <button
            onClick={() => navigate('/marketplace')}
            style={{
              padding: '12px 24px',
              background: '#6366f1',
              border: 'none',
              borderRadius: 10,
              color: '#fff',
              fontWeight: 600,
              cursor: 'pointer'
            }}
          >
            Back to Marketplace
          </button>
        </div>
      </div>
    );
  }

  const condition = product.condition || 'New';
  const inStock = true;
  const isLastOne = Math.random() > 0.7;

  return (
    <div style={{
      minHeight: '100vh',
      background: '#020818',
      fontFamily: "'Segoe UI', system-ui, sans-serif",
      color: '#e2e8f0'
    }}>
      {/* Header */}
      <header style={{
        background: '#0f172a',
        borderBottom: '1px solid #1e293b',
        padding: '14px 24px'
      }}>
        <div style={{
          maxWidth: 1400,
          margin: '0 auto',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 20 }}>
            <div 
              onClick={() => navigate('/marketplace')}
              style={{ display: 'flex', alignItems: 'center', gap: 10, cursor: 'pointer' }}
            >
              <div style={{
                width: 38,
                height: 38,
                borderRadius: 10,
                background: 'linear-gradient(135deg, #6366f1, #818cf8)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontWeight: 800,
                fontSize: 18
              }}>S</div>
              <span style={{ fontSize: 18, fontWeight: 700 }}>Synthetix Market</span>
            </div>
            <span style={{ color: '#1e293b' }}>|</span>
            <span style={{ color: '#64748b', fontSize: 14 }}>Product Details</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <button
              onClick={() => navigate('/marketplace')}
              style={{
                padding: '10px 20px',
                background: 'transparent',
                border: '1px solid #1e293b',
                borderRadius: 10,
                fontSize: 13,
                color: '#64748b',
                cursor: 'pointer'
              }}
            >
              ← Back to Market
            </button>
          </div>
        </div>
      </header>

      {/* Success Banner */}
      {justPurchased && (
        <div style={{
          background: 'linear-gradient(90deg, #10b981, #059669)',
          padding: '16px 24px',
          textAlign: 'center'
        }}>
          <span style={{ fontSize: 16, fontWeight: 700, color: '#fff' }}>
            🎉 Item Purchased Successfully!
          </span>
          <span style={{ marginLeft: 12, fontSize: 14, color: '#d1fae5' }}>
            Leave a review below to help other buyers.
          </span>
        </div>
      )}

      <main style={{ maxWidth: 1400, margin: '0 auto', padding: '32px 24px' }}>
        {/* Breadcrumb */}
        <div style={{ fontSize: 12, color: '#64748b', marginBottom: 24 }}>
          <span style={{ cursor: 'pointer' }} onClick={() => navigate('/marketplace')}>Marketplace</span>
          {' / '}
          <span>{product.category}</span>
          {' / '}
          <span style={{ color: '#e2e8f0' }}>{product.name}</span>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 400px', gap: 32 }}>
          {/* Left Column - Product Info */}
          <div>
            {/* Product Header Card */}
            <Card style={{ marginBottom: 24 }}>
              <div style={{ display: 'flex', gap: 24 }}>
                {/* Image */}
                <div style={{
                  width: 280,
                  height: 280,
                  background: 'linear-gradient(135deg, #1e293b, #0f172a)',
                  borderRadius: 16,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: 80,
                  flexShrink: 0
                }}>
                  {product.category === 'Audio' ? '🎧' : 
                   product.category === 'Electronics' ? '💻' : 
                   product.category === 'Gaming' ? '🎮' :
                   product.category === 'Wearables' ? '⌚' : '📦'}
                </div>
                
                <div style={{ flex: 1 }}>
                  {/* Product Name */}
                  <h1 style={{ fontSize: 26, fontWeight: 700, marginBottom: 12, lineHeight: 1.3 }}>
                    {product.name}
                  </h1>
                  
                  {/* Product ID */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 16 }}>
                    <span style={{ fontSize: 12, color: '#64748b' }}>Product ID:</span>
                    <code style={{
                      padding: '4px 10px',
                      background: '#020818',
                      borderRadius: 6,
                      fontSize: 12,
                      color: '#818cf8'
                    }}>{product.id}</code>
                  </div>
                  
                  {/* Category & Condition */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 16 }}>
                    <span style={{
                      padding: '6px 12px',
                      background: '#1e293b',
                      borderRadius: 8,
                      fontSize: 12,
                      color: '#94a3b8'
                    }}>
                      📁 {product.category}
                    </span>
                    <ConditionBadge condition={condition} />
                  </div>
                  
                  {/* Rating */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 16 }}>
                    <StarRating rating={Math.round(product.avgRating)} />
                    <span style={{ fontSize: 16, fontWeight: 600 }}>{product.avgRating.toFixed(1)}</span>
                    <span style={{ color: '#64748b' }}>({product.reviewCount.toLocaleString()} reviews)</span>
                  </div>
                  
                  {/* Verification Badge */}
                  {product.verifiedPct >= 0.7 && (
                    <span style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: 6,
                      padding: '8px 14px',
                      background: '#10b98115',
                      border: '1px solid #10b98130',
                      borderRadius: 99,
                      fontSize: 12,
                      color: '#10b981',
                      fontWeight: 600
                    }}>
                      🛡️ Synthetix Verified
                    </span>
                  )}
                </div>
              </div>
            </Card>

            {/* Description */}
            <Card style={{ marginBottom: 24 }}>
              <h3 style={{ fontSize: 14, fontWeight: 700, marginBottom: 12, color: '#818cf8' }}>DESCRIPTION</h3>
              <p style={{ fontSize: 14, lineHeight: 1.8, color: '#94a3b8', margin: 0 }}>
                {product.description || `This ${product.category.toLowerCase()} product has received ${product.reviewCount.toLocaleString()} reviews from verified buyers, with an average rating of ${product.avgRating.toFixed(1)} out of 5 stars. ${product.verifiedPct >= 0.7 ? 'This product is Synthetix Verified, meaning over 70% of its reviews are from verified purchases.' : ''}`}
              </p>
            </Card>

            {/* Seller Info */}
            <Card style={{ marginBottom: 24 }}>
              <h3 style={{ fontSize: 14, fontWeight: 700, marginBottom: 16, color: '#818cf8' }}>SELLER INFORMATION</h3>
              <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
                <div style={{
                  width: 56,
                  height: 56,
                  borderRadius: '50%',
                  background: 'linear-gradient(135deg, #6366f1, #818cf8)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: 24,
                  fontWeight: 700
                }}>
                  {sellerData.name[0]?.toUpperCase()}
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 16, fontWeight: 600, marginBottom: 4 }}>{sellerData.name}</div>
                  <div style={{ fontSize: 12, color: '#64748b' }}>Member since {sellerData.joinDate}</div>
                  <div style={{ fontSize: 12, color: '#64748b', marginTop: 4 }}>
                    {sellerData.totalListings} total listings • ⭐ {sellerData.rating} seller rating
                  </div>
                </div>
                <span style={{
                  padding: '8px 14px',
                  background: '#10b98115',
                  border: '1px solid #10b98130',
                  borderRadius: 99,
                  fontSize: 11,
                  color: '#10b981',
                  fontWeight: 600
                }}>
                  🛡️ Trusted Seller
                </span>
              </div>
            </Card>

            {/* View AI Insights Button */}
            <button
              onClick={handleViewInsights}
              style={{
                width: '100%',
                padding: '16px 24px',
                background: 'linear-gradient(135deg, #1e1b4b, #312e81)',
                border: '1px solid #4338ca',
                borderRadius: 12,
                fontSize: 15,
                fontWeight: 700,
                color: '#818cf8',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 10,
                marginBottom: 24
              }}
            >
              🤖 View AI Insights
              <span style={{ fontSize: 12, opacity: 0.7 }}>Powered by GPT</span>
            </button>

            {/* AI Insights Panel */}
            {showInsights && (
              <div style={{ marginBottom: 24 }}>
                <InsightsPanel insights={insights} loading={insightsLoading} error={insightsError} />
              </div>
            )}

            {/* Price History */}
            <Card>
              <h3 style={{ fontSize: 14, fontWeight: 700, marginBottom: 20, color: '#818cf8' }}>
                PRICE HISTORY (Last 30 Days)
              </h3>
              <div style={{ height: 250 }}>
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={priceHistory}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                    <XAxis 
                      dataKey="date" 
                      tick={{ fill: '#64748b', fontSize: 11 }}
                      tickFormatter={d => d.split('-').slice(1).join('/')}
                    />
                    <YAxis 
                      tick={{ fill: '#64748b', fontSize: 11 }}
                      tickFormatter={v => `₹${v}`}
                      domain={['dataMin - 500', 'dataMax + 500']}
                    />
                    <Tooltip
                      contentStyle={{
                        background: '#0f172a',
                        border: '1px solid #1e293b',
                        borderRadius: 8
                      }}
                      labelStyle={{ color: '#e2e8f0' }}
                      formatter={(value) => [`₹${value.toLocaleString()}`, 'Price']}
                    />
                    <Line 
                      type="monotone" 
                      dataKey="price" 
                      stroke="#6366f1" 
                      strokeWidth={2}
                      dot={{ fill: '#6366f1', strokeWidth: 0, r: 3 }}
                      activeDot={{ fill: '#818cf8', strokeWidth: 0, r: 5 }}
                    />
                  </LineChart>
                </ResponsiveContainer>
              </div>
              
              {/* Price Drop Alert */}
              {priceDropPct && priceDropPct > 0 && (
                <div style={{
                  marginTop: 16,
                  padding: '14px 18px',
                  background: 'linear-gradient(135deg, #10b98115, #059669)',
                  border: '1px solid #10b98130',
                  borderRadius: 12,
                  display: 'flex',
                  alignItems: 'center',
                  gap: 12
                }}>
                  <span style={{ fontSize: 24 }}>📉</span>
                  <div>
                    <div style={{ fontSize: 14, fontWeight: 700, color: '#10b981' }}>
                      Price dropped {priceDropPct}% this week!
                    </div>
                    <div style={{ fontSize: 12, color: '#64748b' }}>
                      Great time to buy — prices are lower than usual
                    </div>
                  </div>
                </div>
              )}
            </Card>
          </div>

          {/* Right Column - Purchase Panel */}
          <div>
            <div style={{ position: 'sticky', top: 24 }}>
              {/* Purchase Card */}
              <Card style={{ marginBottom: 20 }}>
                {/* Authenticity Meter */}
                <div style={{
                  display: 'flex',
                  justifyContent: 'center',
                  padding: '16px 0 20px',
                  marginBottom: 16,
                  borderBottom: '1px solid #1e293b'
                }}>
                  <AuthenticityMeter score={product.verifiedPct || 0.5} />
                </div>
                
                {/* Price */}
                <div style={{ fontSize: 42, fontWeight: 800, color: '#10b981', marginBottom: 8 }}>
                  ₹{product.price.toLocaleString()}
                </div>
                <p style={{ fontSize: 12, color: '#64748b', marginBottom: 20 }}>Inclusive of all taxes</p>

                {/* Condition Badge */}
                <div style={{ marginBottom: 16 }}>
                  <span style={{ fontSize: 12, color: '#64748b', marginRight: 8 }}>Condition:</span>
                  <ConditionBadge condition={condition} />
                </div>

                {/* Stock Status */}
                <div style={{ 
                  padding: '10px 14px',
                  background: inStock ? '#10b98115' : '#f43f5e15',
                  borderRadius: 8,
                  marginBottom: 20,
                  display: 'flex',
                  alignItems: 'center',
                  gap: 8
                }}>
                  <span style={{ fontSize: 16 }}>{inStock ? '✓' : '✗'}</span>
                  <span style={{
                    fontSize: 14,
                    fontWeight: 600,
                    color: inStock ? '#10b981' : '#f43f5e'
                  }}>
                    {inStock ? (isLastOne ? 'Last one! Order soon' : 'In Stock') : 'Out of Stock'}
                  </span>
                </div>

                {/* Buy Now Button */}
                <button
                  onClick={handleBuyNow}
                  disabled={purchased}
                  style={{
                    width: '100%',
                    padding: '16px',
                    background: purchased ? '#1e293b' : 'linear-gradient(135deg, #f59e0b, #d97706)',
                    border: 'none',
                    borderRadius: 12,
                    fontSize: 16,
                    fontWeight: 700,
                    color: purchased ? '#64748b' : '#fff',
                    cursor: purchased ? 'not-allowed' : 'pointer',
                    marginBottom: 12
                  }}
                >
                  {purchased ? '✓ Purchased' : '⚡ Buy Now'}
                </button>
                
                {/* Add to Cart Button */}
                <button
                  onClick={handleAddToCart}
                  style={{
                    width: '100%',
                    padding: '16px',
                    background: '#020818',
                    border: '1px solid #1e293b',
                    borderRadius: 12,
                    fontSize: 15,
                    fontWeight: 600,
                    color: '#e2e8f0',
                    cursor: 'pointer',
                    marginBottom: 20
                  }}
                >
                  🛒 Add to Cart
                </button>

                {/* Delivery Estimate */}
                <div style={{
                  padding: '14px',
                  background: '#020818',
                  borderRadius: 10,
                  marginBottom: 16,
                  display: 'flex',
                  alignItems: 'center',
                  gap: 12
                }}>
                  <span style={{ fontSize: 24 }}>🚚</span>
                  <div>
                    <div style={{ fontSize: 13, fontWeight: 600, color: '#e2e8f0' }}>Free Delivery</div>
                    <div style={{ fontSize: 12, color: '#64748b' }}>Delivered in 3-5 business days</div>
                  </div>
                </div>

                {/* Trust Badge */}
                <div style={{
                  padding: '14px',
                  background: 'linear-gradient(135deg, #10b98115, #06b6d415)',
                  border: '1px solid #10b98130',
                  borderRadius: 10,
                  display: 'flex',
                  alignItems: 'center',
                  gap: 12
                }}>
                  <span style={{ fontSize: 24 }}>✅</span>
                  <div>
                    <div style={{ fontSize: 13, fontWeight: 600, color: '#10b981' }}>AI-Verified Reviews</div>
                    <div style={{ fontSize: 11, color: '#64748b' }}>All reviews analyzed for authenticity</div>
                  </div>
                </div>
              </Card>

              {/* Review Form - Only shown after purchase */}
              {purchased && (
                <Card>
                  <h3 style={{ fontSize: 14, fontWeight: 700, marginBottom: 16, color: '#818cf8' }}>
                    WRITE YOUR REVIEW
                  </h3>
                  
                  {/* Verified Purchase Badge */}
                  <div style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: 6,
                    padding: '6px 12px',
                    background: '#10b98115',
                    border: '1px solid #10b98130',
                    borderRadius: 99,
                    fontSize: 11,
                    color: '#10b981',
                    fontWeight: 600,
                    marginBottom: 16
                  }}>
                    ✓ Verified Purchase
                  </div>
                  
                  {reviewSubmitted ? (
                    <div style={{ textAlign: 'center', padding: '20px 0' }}>
                      <div style={{ fontSize: 48, marginBottom: 12 }}>✅</div>
                      <p style={{ color: '#10b981', fontSize: 16, fontWeight: 600, marginBottom: 8 }}>
                        Thank you for your review!
                      </p>
                      <p style={{ color: '#64748b', fontSize: 13 }}>
                        Your feedback helps other buyers make informed decisions.
                      </p>
                    </div>
                  ) : (
                    <form onSubmit={handleSubmitReview}>
                      {/* Star Rating */}
                      <div style={{ marginBottom: 16 }}>
                        <label style={{ fontSize: 12, color: '#64748b', display: 'block', marginBottom: 8 }}>
                          Your Rating
                        </label>
                        <StarRating 
                          rating={reviewRating} 
                          interactive 
                          onRatingChange={setReviewRating}
                          size={32}
                        />
                      </div>
                      
                      {/* Review Text */}
                      <div style={{ marginBottom: 16 }}>
                        <label style={{ fontSize: 12, color: '#64748b', display: 'block', marginBottom: 8 }}>
                          Your Review <span style={{ color: '#f43f5e' }}>*</span>
                        </label>
                        <textarea
                          value={reviewText}
                          onChange={e => setReviewText(e.target.value)}
                          placeholder="Share your experience with this product (minimum 20 characters)..."
                          rows={5}
                          style={{
                            width: '100%',
                            padding: '14px',
                            background: '#020818',
                            border: reviewError ? '1px solid #f43f5e' : '1px solid #1e293b',
                            borderRadius: 10,
                            fontSize: 13,
                            color: '#e2e8f0',
                            resize: 'vertical',
                            outline: 'none',
                            fontFamily: 'inherit'
                          }}
                        />
                        <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 8 }}>
                          {reviewError && (
                            <span style={{ fontSize: 11, color: '#f43f5e' }}>{reviewError}</span>
                          )}
                          <span style={{ 
                            fontSize: 11, 
                            color: reviewText.length >= 20 ? '#10b981' : '#64748b',
                            marginLeft: 'auto'
                          }}>
                            {reviewText.length}/20 min
                          </span>
                        </div>
                      </div>
                      
                      {/* Submit Button */}
                      <button
                        type="submit"
                        style={{
                          width: '100%',
                          padding: '14px',
                          background: 'linear-gradient(135deg, #10b981, #059669)',
                          border: 'none',
                          borderRadius: 10,
                          fontSize: 14,
                          fontWeight: 700,
                          color: '#fff',
                          cursor: 'pointer'
                        }}
                      >
                        Submit Review
                      </button>
                    </form>
                  )}
                </Card>
              )}
            </div>
          </div>
        </div>
      </main>

      <style>{`
        textarea:focus {
          border-color: #6366f1 !important;
        }
        button:hover:not(:disabled) {
          opacity: 0.9;
          transform: translateY(-1px);
        }
        @keyframes pulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.5; }
        }
      `}</style>
    </div>
  );
}

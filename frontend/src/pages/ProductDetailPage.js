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

const SentimentBadge = ({ sentiment }) => {
  const config = {
    loved: { text: 'Loved by Buyers ❤️', color: '#10b981', bg: '#10b98115' },
    mixed: { text: 'Mixed Reviews 😐', color: '#f59e0b', bg: '#f59e0b15' },
    avoid: { text: 'Caution Advised ⚠️', color: '#f43f5e', bg: '#f43f5e15' }
  };
  const c = config[sentiment] || config.mixed;
  return (
    <span style={{
      padding: '6px 14px',
      borderRadius: 99,
      fontSize: 13,
      fontWeight: 600,
      background: c.bg,
      color: c.color,
      border: `1px solid ${c.color}30`,
      display: 'inline-flex',
      alignItems: 'center',
      gap: 6
    }}>
      {c.text}
    </span>
  );
};

// Authenticity Meter Component
const AuthenticityMeter = ({ percentage }) => {
  const radius = 50;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference - (percentage / 100) * circumference;
  
  const getColor = () => {
    if (percentage >= 70) return '#10b981';
    if (percentage >= 40) return '#f59e0b';
    return '#f43f5e';
  };

  return (
    <div style={{ position: 'relative', width: 140, height: 140 }}>
      <svg width="140" height="140" style={{ transform: 'rotate(-90deg)' }}>
        <circle
          cx="70"
          cy="70"
          r={radius}
          stroke="#1e293b"
          strokeWidth="10"
          fill="none"
        />
        <circle
          cx="70"
          cy="70"
          r={radius}
          stroke={getColor()}
          strokeWidth="10"
          fill="none"
          strokeDasharray={circumference}
          strokeDashoffset={strokeDashoffset}
          strokeLinecap="round"
          style={{ transition: 'stroke-dashoffset 1s ease' }}
        />
      </svg>
      <div style={{
        position: 'absolute',
        top: '50%',
        left: '50%',
        transform: 'translate(-50%, -50%)',
        textAlign: 'center'
      }}>
        <div style={{ fontSize: 28, fontWeight: 800, color: getColor() }}>{percentage}%</div>
        <div style={{ fontSize: 10, color: '#64748b' }}>Verified</div>
      </div>
    </div>
  );
};

// Review Heatmap Component (GitHub-style)
const ReviewHeatmap = ({ reviews }) => {
  // Generate last 52 weeks of data
  const weeks = [];
  const now = new Date();
  
  for (let w = 51; w >= 0; w--) {
    const week = [];
    for (let d = 0; d < 7; d++) {
      const date = new Date(now);
      date.setDate(date.getDate() - (w * 7 + (6 - d)));
      
      // Simulate review activity
      const reviewCount = Math.floor(Math.random() * 10);
      week.push({
        date: date.toISOString().split('T')[0],
        count: reviewCount
      });
    }
    weeks.push(week);
  }

  const getColor = (count) => {
    if (count === 0) return '#0f172a';
    if (count <= 2) return '#164e63';
    if (count <= 5) return '#0e7490';
    if (count <= 8) return '#06b6d4';
    return '#22d3ee';
  };

  return (
    <div style={{ overflowX: 'auto' }}>
      <div style={{ display: 'flex', gap: 2, minWidth: 'fit-content' }}>
        {weeks.map((week, wi) => (
          <div key={wi} style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
            {week.map((day, di) => (
              <div
                key={di}
                title={`${day.date}: ${day.count} reviews`}
                style={{
                  width: 10,
                  height: 10,
                  borderRadius: 2,
                  background: getColor(day.count),
                  cursor: 'pointer'
                }}
              />
            ))}
          </div>
        ))}
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 12 }}>
        <span style={{ fontSize: 10, color: '#64748b' }}>Less</span>
        {[0, 2, 5, 8, 10].map(c => (
          <div key={c} style={{ width: 10, height: 10, borderRadius: 2, background: getColor(c) }} />
        ))}
        <span style={{ fontSize: 10, color: '#64748b' }}>More</span>
      </div>
    </div>
  );
};

export default function ProductDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const {
    currentUser,
    products,
    getProductById,
    getPriceHistory,
    addToCart,
    hasPurchased,
    submitReview,
    cart
  } = useApp();

  const [product, setProduct] = useState(null);
  const [priceHistory, setPriceHistory] = useState([]);
  const [quantity, setQuantity] = useState(1);
  const [activeTab, setActiveTab] = useState('overview');
  
  // Review form
  const [reviewRating, setReviewRating] = useState(5);
  const [reviewText, setReviewText] = useState('');
  const [reviewSubmitted, setReviewSubmitted] = useState(false);

  const purchased = hasPurchased(id);

  useEffect(() => {
    const p = getProductById(id);
    if (p) {
      setProduct(p);
      setPriceHistory(getPriceHistory(id));
    }
  }, [id, getProductById, getPriceHistory]);

  const handleAddToCart = () => {
    for (let i = 0; i < quantity; i++) {
      addToCart(product);
    }
  };

  const handleSubmitReview = (e) => {
    e.preventDefault();
    if (!reviewText.trim()) return;
    
    submitReview(id, {
      rating: reviewRating,
      text: reviewText,
      author: currentUser?.name || 'Anonymous'
    });
    
    setReviewSubmitted(true);
    setReviewText('');
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
              }}>T</div>
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
            <button
              onClick={() => navigate(`/insights/${id}`)}
              style={{
                padding: '10px 20px',
                background: '#1e1b4b',
                border: '1px solid #4338ca',
                borderRadius: 10,
                fontSize: 13,
                color: '#818cf8',
                fontWeight: 600,
                cursor: 'pointer'
              }}
            >
              📊 View Insights
            </button>
          </div>
        </div>
      </header>

      <main style={{ maxWidth: 1400, margin: '0 auto', padding: '32px 24px' }}>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 400px', gap: 32 }}>
          {/* Left Column - Product Info */}
          <div>
            {/* Breadcrumb */}
            <div style={{ fontSize: 12, color: '#64748b', marginBottom: 16 }}>
              <span style={{ cursor: 'pointer' }} onClick={() => navigate('/marketplace')}>Marketplace</span>
              {' / '}
              <span>{product.category}</span>
              {' / '}
              <span style={{ color: '#e2e8f0' }}>{product.name}</span>
            </div>

            {/* Product Header */}
            <Card style={{ marginBottom: 24 }}>
              <div style={{ display: 'flex', gap: 24 }}>
                {/* Image */}
                <div style={{
                  width: 200,
                  height: 200,
                  background: 'linear-gradient(135deg, #1e293b, #0f172a)',
                  borderRadius: 16,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: 64,
                  flexShrink: 0
                }}>
                  {product.category === 'Audio' ? '🎧' : product.category === 'Electronics' ? '💻' : '📦'}
                </div>
                
                <div style={{ flex: 1 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 12 }}>
                    <SentimentBadge sentiment={product.sentiment} />
                    {product.verifiedPct >= 0.7 && (
                      <span style={{ fontSize: 12, color: '#10b981' }}>🛡️ Synthetix Verified</span>
                    )}
                  </div>
                  
                  <h1 style={{ fontSize: 24, fontWeight: 700, marginBottom: 8, lineHeight: 1.3 }}>
                    {product.name}
                  </h1>
                  
                  <div style={{ fontSize: 13, color: '#64748b', marginBottom: 16 }}>
                    Product ID: {product.id}
                  </div>
                  
                  <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 16 }}>
                    <StarRating rating={Math.round(product.avgRating)} />
                    <span style={{ fontSize: 14, fontWeight: 600 }}>{product.avgRating.toFixed(1)}</span>
                    <span style={{ color: '#64748b' }}>({product.reviewCount.toLocaleString()} reviews)</span>
                  </div>
                  
                  <div style={{ fontSize: 32, fontWeight: 800, color: '#10b981' }}>
                    ₹{product.price.toLocaleString()}
                  </div>
                </div>
              </div>
            </Card>

            {/* Tabs */}
            <div style={{ display: 'flex', borderBottom: '1px solid #1e293b', marginBottom: 24 }}>
              {[
                { id: 'overview', label: 'Overview' },
                { id: 'price-history', label: 'Price History' },
                { id: 'review-activity', label: 'Review Activity' }
              ].map(tab => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  style={{
                    padding: '14px 24px',
                    background: 'none',
                    border: 'none',
                    borderBottom: activeTab === tab.id ? '2px solid #6366f1' : '2px solid transparent',
                    color: activeTab === tab.id ? '#e2e8f0' : '#64748b',
                    fontWeight: activeTab === tab.id ? 600 : 400,
                    fontSize: 14,
                    cursor: 'pointer'
                  }}
                >
                  {tab.label}
                </button>
              ))}
            </div>

            {/* Tab Content */}
            {activeTab === 'overview' && (
              <div>
                {/* Stats Grid */}
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 16, marginBottom: 24 }}>
                  {[
                    { label: 'Total Reviews', value: product.reviewCount.toLocaleString(), icon: '💬' },
                    { label: 'Avg Rating', value: product.avgRating.toFixed(1) + ' / 5', icon: '⭐' },
                    { label: 'Verified %', value: Math.round(product.verifiedPct * 100) + '%', icon: '✓' },
                    { label: 'Category', value: product.category, icon: '📁' }
                  ].map((stat, i) => (
                    <Card key={i}>
                      <div style={{ fontSize: 20, marginBottom: 8 }}>{stat.icon}</div>
                      <div style={{ fontSize: 11, color: '#64748b', marginBottom: 4 }}>{stat.label}</div>
                      <div style={{ fontSize: 18, fontWeight: 700 }}>{stat.value}</div>
                    </Card>
                  ))}
                </div>

                {/* Description */}
                <Card style={{ marginBottom: 24 }}>
                  <h3 style={{ fontSize: 14, fontWeight: 700, marginBottom: 12, color: '#818cf8' }}>DESCRIPTION</h3>
                  <p style={{ fontSize: 14, lineHeight: 1.7, color: '#94a3b8' }}>
                    {product.description || `This ${product.category.toLowerCase()} product has received ${product.reviewCount.toLocaleString()} reviews from verified buyers, with an average rating of ${product.avgRating.toFixed(1)} out of 5 stars. ${product.verifiedPct >= 0.7 ? 'This product is Synthetix Verified, meaning over 70% of its reviews are from verified purchases.' : ''}`}
                  </p>
                </Card>

                {/* Seller Info */}
                <Card>
                  <h3 style={{ fontSize: 14, fontWeight: 700, marginBottom: 16, color: '#818cf8' }}>SELLER INFORMATION</h3>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
                    <div style={{
                      width: 48,
                      height: 48,
                      borderRadius: '50%',
                      background: 'linear-gradient(135deg, #6366f1, #818cf8)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontSize: 20
                    }}>
                      {product.seller?.[0]?.toUpperCase() || '?'}
                    </div>
                    <div>
                      <div style={{ fontSize: 14, fontWeight: 600 }}>{product.seller || 'Unknown Seller'}</div>
                      <div style={{ fontSize: 12, color: '#64748b' }}>Listed {product.listedAt ? new Date(product.listedAt).toLocaleDateString() : 'recently'}</div>
                    </div>
                    {product.verifiedPct >= 0.7 && (
                      <span style={{
                        marginLeft: 'auto',
                        padding: '6px 12px',
                        background: '#10b98115',
                        border: '1px solid #10b98130',
                        borderRadius: 99,
                        fontSize: 11,
                        color: '#10b981',
                        fontWeight: 600
                      }}>
                        🛡️ Trusted Seller
                      </span>
                    )}
                  </div>
                </Card>
              </div>
            )}

            {activeTab === 'price-history' && (
              <Card>
                <h3 style={{ fontSize: 14, fontWeight: 700, marginBottom: 20, color: '#818cf8' }}>
                  PRICE HISTORY (Last 30 Days)
                </h3>
                <div style={{ height: 300 }}>
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
                <div style={{ display: 'flex', gap: 24, marginTop: 20 }}>
                  <div>
                    <div style={{ fontSize: 11, color: '#64748b' }}>Lowest Price</div>
                    <div style={{ fontSize: 16, fontWeight: 700, color: '#10b981' }}>
                      ₹{Math.min(...priceHistory.map(p => p.price)).toLocaleString()}
                    </div>
                  </div>
                  <div>
                    <div style={{ fontSize: 11, color: '#64748b' }}>Highest Price</div>
                    <div style={{ fontSize: 16, fontWeight: 700, color: '#f43f5e' }}>
                      ₹{Math.max(...priceHistory.map(p => p.price)).toLocaleString()}
                    </div>
                  </div>
                  <div>
                    <div style={{ fontSize: 11, color: '#64748b' }}>Average Price</div>
                    <div style={{ fontSize: 16, fontWeight: 700, color: '#f59e0b' }}>
                      ₹{Math.round(priceHistory.reduce((sum, p) => sum + p.price, 0) / priceHistory.length).toLocaleString()}
                    </div>
                  </div>
                </div>
              </Card>
            )}

            {activeTab === 'review-activity' && (
              <Card>
                <h3 style={{ fontSize: 14, fontWeight: 700, marginBottom: 20, color: '#818cf8' }}>
                  REVIEW ACTIVITY HEATMAP
                </h3>
                <p style={{ fontSize: 13, color: '#64748b', marginBottom: 16 }}>
                  Review activity over the past year — darker colors indicate more reviews on that day.
                </p>
                <ReviewHeatmap reviews={[]} />
              </Card>
            )}
          </div>

          {/* Right Column - Purchase Panel */}
          <div>
            <div style={{ position: 'sticky', top: 100 }}>
              {/* Purchase Card */}
              <Card style={{ marginBottom: 20 }}>
                <h3 style={{ fontSize: 16, fontWeight: 700, marginBottom: 20 }}>Purchase</h3>
                
                <div style={{ fontSize: 32, fontWeight: 800, color: '#10b981', marginBottom: 20 }}>
                  ₹{product.price.toLocaleString()}
                </div>

                {/* Quantity */}
                <div style={{ marginBottom: 20 }}>
                  <label style={{ fontSize: 12, color: '#64748b', display: 'block', marginBottom: 8 }}>Quantity</label>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                    <button
                      onClick={() => setQuantity(Math.max(1, quantity - 1))}
                      style={{
                        width: 40,
                        height: 40,
                        borderRadius: 10,
                        background: '#020818',
                        border: '1px solid #1e293b',
                        color: '#e2e8f0',
                        fontSize: 18,
                        cursor: 'pointer'
                      }}
                    >-</button>
                    <span style={{ fontSize: 18, fontWeight: 600, minWidth: 40, textAlign: 'center' }}>{quantity}</span>
                    <button
                      onClick={() => setQuantity(quantity + 1)}
                      style={{
                        width: 40,
                        height: 40,
                        borderRadius: 10,
                        background: '#020818',
                        border: '1px solid #1e293b',
                        color: '#e2e8f0',
                        fontSize: 18,
                        cursor: 'pointer'
                      }}
                    >+</button>
                    <span style={{ fontSize: 14, color: '#64748b', marginLeft: 'auto' }}>
                      Total: ₹{(product.price * quantity).toLocaleString()}
                    </span>
                  </div>
                </div>

                {/* Buttons */}
                <button
                  onClick={handleAddToCart}
                  style={{
                    width: '100%',
                    padding: '14px',
                    background: '#020818',
                    border: '1px solid #1e293b',
                    borderRadius: 12,
                    fontSize: 14,
                    fontWeight: 600,
                    color: '#e2e8f0',
                    cursor: 'pointer',
                    marginBottom: 12
                  }}
                >
                  Add to Cart
                </button>
                
                <button
                  onClick={() => { handleAddToCart(); navigate('/marketplace'); }}
                  style={{
                    width: '100%',
                    padding: '14px',
                    background: 'linear-gradient(135deg, #6366f1, #818cf8)',
                    border: 'none',
                    borderRadius: 12,
                    fontSize: 14,
                    fontWeight: 700,
                    color: '#fff',
                    cursor: 'pointer'
                  }}
                >
                  Buy Now
                </button>
              </Card>

              {/* Authenticity Meter */}
              <Card style={{ marginBottom: 20 }}>
                <h3 style={{ fontSize: 14, fontWeight: 700, marginBottom: 16, color: '#818cf8' }}>
                  REVIEW AUTHENTICITY
                </h3>
                <div style={{ display: 'flex', alignItems: 'center', gap: 20 }}>
                  <AuthenticityMeter percentage={Math.round(product.verifiedPct * 100)} />
                  <div>
                    <div style={{ fontSize: 13, marginBottom: 8 }}>
                      {product.verifiedPct >= 0.7 ? (
                        <span style={{ color: '#10b981' }}>🛡️ High Trust</span>
                      ) : product.verifiedPct >= 0.4 ? (
                        <span style={{ color: '#f59e0b' }}>⚠️ Moderate Trust</span>
                      ) : (
                        <span style={{ color: '#f43f5e' }}>🚨 Low Trust</span>
                      )}
                    </div>
                    <p style={{ fontSize: 11, color: '#64748b', lineHeight: 1.5 }}>
                      {Math.round(product.verifiedPct * 100)}% of reviews are from verified purchases.
                    </p>
                  </div>
                </div>
              </Card>

              {/* Write Review Section */}
              <Card>
                <h3 style={{ fontSize: 14, fontWeight: 700, marginBottom: 16, color: '#818cf8' }}>
                  WRITE A REVIEW
                </h3>
                
                {!purchased ? (
                  <div style={{ textAlign: 'center', padding: '20px 0' }}>
                    <div style={{ fontSize: 32, marginBottom: 12 }}>🛒</div>
                    <p style={{ color: '#64748b', fontSize: 13, marginBottom: 8 }}>
                      Purchase this product to write a review
                    </p>
                    <p style={{ color: '#475569', fontSize: 11 }}>
                      Only verified buyers can submit reviews
                    </p>
                  </div>
                ) : reviewSubmitted ? (
                  <div style={{ textAlign: 'center', padding: '20px 0' }}>
                    <div style={{ fontSize: 32, marginBottom: 12 }}>✅</div>
                    <p style={{ color: '#10b981', fontSize: 14, fontWeight: 600 }}>
                      Thank you for your review!
                    </p>
                    <p style={{ color: '#64748b', fontSize: 12, marginTop: 8 }}>
                      Your feedback helps other buyers
                    </p>
                  </div>
                ) : (
                  <form onSubmit={handleSubmitReview}>
                    <div style={{ marginBottom: 16 }}>
                      <label style={{ fontSize: 12, color: '#64748b', display: 'block', marginBottom: 8 }}>
                        Your Rating
                      </label>
                      <StarRating 
                        rating={reviewRating} 
                        interactive 
                        onRatingChange={setReviewRating}
                        size={28}
                      />
                    </div>
                    
                    <div style={{ marginBottom: 16 }}>
                      <label style={{ fontSize: 12, color: '#64748b', display: 'block', marginBottom: 8 }}>
                        Your Review
                      </label>
                      <textarea
                        value={reviewText}
                        onChange={e => setReviewText(e.target.value)}
                        placeholder="Share your experience with this product..."
                        rows={4}
                        style={{
                          width: '100%',
                          padding: '12px 14px',
                          background: '#020818',
                          border: '1px solid #1e293b',
                          borderRadius: 10,
                          fontSize: 13,
                          color: '#e2e8f0',
                          resize: 'vertical',
                          outline: 'none'
                        }}
                      />
                    </div>
                    
                    <button
                      type="submit"
                      style={{
                        width: '100%',
                        padding: '12px',
                        background: 'linear-gradient(135deg, #10b981, #059669)',
                        border: 'none',
                        borderRadius: 10,
                        fontSize: 13,
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
            </div>
          </div>
        </div>
      </main>

      <style>{`
        input:focus, textarea:focus {
          border-color: #6366f1 !important;
        }
        button:hover {
          opacity: 0.9;
        }
      `}</style>
    </div>
  );
}

import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useApp } from '../context/AppContext';

// Helper components
const Card = ({ children, style = {}, accent, onClick }) => (
  <div onClick={onClick} style={{
    background: '#0f172a',
    border: `1px solid ${accent || '#1e293b'}`,
    borderRadius: 16,
    padding: '20px 24px',
    cursor: onClick ? 'pointer' : 'default',
    transition: 'all 0.2s ease',
    ...style
  }}>
    {children}
  </div>
);

const SentimentBadge = ({ sentiment }) => {
  const config = {
    loved: { text: 'Loved ❤️', color: '#10b981', bg: '#10b98115' },
    mixed: { text: 'Mixed 😐', color: '#f59e0b', bg: '#f59e0b15' },
    avoid: { text: 'Avoid ⚠️', color: '#f43f5e', bg: '#f43f5e15' }
  };
  const c = config[sentiment] || config.mixed;
  return (
    <span style={{
      padding: '4px 10px',
      borderRadius: 99,
      fontSize: 11,
      fontWeight: 600,
      background: c.bg,
      color: c.color,
      border: `1px solid ${c.color}30`
    }}>
      {c.text}
    </span>
  );
};

const StarRating = ({ rating, size = 14 }) => (
  <div style={{ display: 'flex', gap: 2 }}>
    {[1, 2, 3, 4, 5].map(i => (
      <span key={i} style={{ fontSize: size, color: i <= rating ? '#f59e0b' : '#1e293b' }}>★</span>
    ))}
  </div>
);

const VerifiedBadge = ({ verifiedPct }) => {
  if (verifiedPct >= 0.7) {
    return <span style={{ fontSize: 11, color: '#10b981' }}>🛡️ Synthetix Verified</span>;
  } else if (verifiedPct < 0.3) {
    return <span style={{ fontSize: 11, color: '#f59e0b' }}>⚠️ Unverified Seller</span>;
  }
  return null;
};

export default function MarketplacePage() {
  const navigate = useNavigate();
  const {
    currentUser,
    logout,
    products,
    searchProducts,
    getFeaturedProducts,
    getTrendingProducts,
    getRecentReviews,
    addToCart,
    cart,
    cartTotal,
    removeFromCart,
    updateCartQuantity,
    checkout,
    listProduct,
    addToCompare,
    compareList,
    removeFromCompare,
    clearCompare
  } = useApp();

  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [showSearchDropdown, setShowSearchDropdown] = useState(false);
  const [filteredProducts, setFilteredProducts] = useState(products);
  
  // Filters
  const [priceRange, setPriceRange] = useState([0, 30000]);
  const [ratingFilter, setRatingFilter] = useState(0);
  const [sentimentFilter, setSentimentFilter] = useState('all');
  const [sortBy, setSortBy] = useState('most-reviewed');
  
  // Modals
  const [showCart, setShowCart] = useState(false);
  const [showSellModal, setShowSellModal] = useState(false);
  const [showCompareDrawer, setShowCompareDrawer] = useState(false);
  
  // Sell form
  const [sellForm, setSellForm] = useState({
    name: '',
    id: `USR-${Date.now()}`,
    category: 'Electronics',
    price: '',
    description: '',
    reviews: '',
    condition: 'New',
    defaultRating: 4,
    image: null
  });

  // Review ticker
  const recentReviews = getRecentReviews();
  const [tickerIndex, setTickerIndex] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => {
      setTickerIndex(prev => (prev + 1) % recentReviews.length);
    }, 3000);
    return () => clearInterval(interval);
  }, [recentReviews.length]);

  // Smart search
  useEffect(() => {
    if (searchQuery.length > 0) {
      const results = searchProducts(searchQuery).slice(0, 6);
      setSearchResults(results);
      setShowSearchDropdown(true);
    } else {
      setSearchResults([]);
      setShowSearchDropdown(false);
    }
  }, [searchQuery, searchProducts]);

  // Apply filters
  useEffect(() => {
    let filtered = [...products];
    
    // Price filter
    filtered = filtered.filter(p => p.price >= priceRange[0] && p.price <= priceRange[1]);
    
    // Rating filter
    if (ratingFilter > 0) {
      filtered = filtered.filter(p => p.avgRating >= ratingFilter);
    }
    
    // Sentiment filter
    if (sentimentFilter !== 'all') {
      filtered = filtered.filter(p => p.sentiment === sentimentFilter);
    }
    
    // Search filter
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      filtered = filtered.filter(p => 
        p.name.toLowerCase().includes(q) || 
        p.id.toLowerCase().includes(q)
      );
    }
    
    // Sort
    switch (sortBy) {
      case 'most-reviewed':
        filtered.sort((a, b) => b.reviewCount - a.reviewCount);
        break;
      case 'highest-rated':
        filtered.sort((a, b) => b.avgRating - a.avgRating);
        break;
      case 'lowest-price':
        filtered.sort((a, b) => a.price - b.price);
        break;
      case 'newest':
        filtered.sort((a, b) => new Date(b.listedAt) - new Date(a.listedAt));
        break;
      default:
        break;
    }
    
    setFilteredProducts(filtered);
  }, [products, priceRange, ratingFilter, sentimentFilter, sortBy, searchQuery]);

  const handleSellSubmit = (e) => {
    e.preventDefault();
    if (!sellForm.name || !sellForm.price) return;
    
    listProduct({
      ...sellForm,
      price: parseInt(sellForm.price),
      image: sellForm.image
    });
    
    setSellForm({
      name: '',
      id: `USR-${Date.now()}`,
      category: 'Electronics',
      price: '',
      description: '',
      reviews: '',
      condition: 'New',
      defaultRating: 4,
      image: null
    });
    setShowSellModal(false);
  };

  const featuredProducts = getFeaturedProducts();
  const trendingProducts = getTrendingProducts();

  return (
    <div style={{
      minHeight: '100vh',
      background: '#020818',
      fontFamily: "'Segoe UI', system-ui, sans-serif",
      color: '#e2e8f0'
    }}>
      {/* Review Ticker */}
      <div style={{
        background: 'linear-gradient(90deg, #1e1b4b, #312e81)',
        padding: '10px 24px',
        overflow: 'hidden'
      }}>
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: 12,
          animation: 'ticker 0.5s ease',
          whiteSpace: 'nowrap'
        }}>
          <span style={{ fontSize: 12, color: '#818cf8', fontWeight: 600 }}>RECENT:</span>
          <span style={{ fontSize: 13, color: '#e2e8f0' }}>
            {'★'.repeat(recentReviews[tickerIndex]?.rating || 5)}
            {'☆'.repeat(5 - (recentReviews[tickerIndex]?.rating || 5))}
          </span>
          <span style={{ fontSize: 13, color: '#94a3b8' }}>
            {recentReviews[tickerIndex]?.productId} — "{recentReviews[tickerIndex]?.text}"
          </span>
          <span style={{ fontSize: 11, color: '#64748b' }}>
            · {recentReviews[tickerIndex]?.time}
          </span>
        </div>
      </div>

      {/* Header */}
      <header style={{
        background: '#0f172a',
        borderBottom: '1px solid #1e293b',
        padding: '14px 24px',
        position: 'sticky',
        top: 0,
        zIndex: 100
      }}>
        <div style={{
          maxWidth: 1400,
          margin: '0 auto',
          display: 'flex',
          alignItems: 'center',
          gap: 24
        }}>
          {/* Logo */}
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

          {/* Search */}
          <div style={{ flex: 1, maxWidth: 500, position: 'relative' }}>
            <input
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              onFocus={() => searchQuery && setShowSearchDropdown(true)}
              onBlur={() => setTimeout(() => setShowSearchDropdown(false), 200)}
              placeholder="Search products by name or ID..."
              style={{
                width: '100%',
                padding: '12px 16px',
                paddingLeft: 44,
                background: '#020818',
                border: '1px solid #1e293b',
                borderRadius: 12,
                fontSize: 14,
                color: '#e2e8f0',
                outline: 'none'
              }}
            />
            <span style={{
              position: 'absolute',
              left: 16,
              top: '50%',
              transform: 'translateY(-50%)',
              fontSize: 16,
              color: '#64748b'
            }}>🔍</span>
            
            {/* Search Dropdown */}
            {showSearchDropdown && searchResults.length > 0 && (
              <div style={{
                position: 'absolute',
                top: '100%',
                left: 0,
                right: 0,
                background: '#0f172a',
                border: '1px solid #1e293b',
                borderRadius: 12,
                marginTop: 4,
                overflow: 'hidden',
                boxShadow: '0 10px 40px rgba(0,0,0,0.4)'
              }}>
                {searchResults.map(p => (
                  <div
                    key={p.id}
                    onClick={() => { navigate(`/product/${p.id}`); setSearchQuery(''); }}
                    style={{
                      padding: '12px 16px',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      cursor: 'pointer',
                      borderBottom: '1px solid #1e293b',
                      transition: 'background 0.2s'
                    }}
                    onMouseEnter={e => e.currentTarget.style.background = '#1e293b'}
                    onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                  >
                    <div>
                      <div style={{ fontSize: 13, fontWeight: 600 }}>{p.name}</div>
                      <div style={{ fontSize: 11, color: '#64748b' }}>{p.id}</div>
                    </div>
                    <span style={{
                      fontSize: 16,
                      color: p.sentiment === 'loved' ? '#10b981' : p.sentiment === 'avoid' ? '#f43f5e' : '#f59e0b'
                    }}>
                      {p.sentiment === 'loved' ? '🟢' : p.sentiment === 'avoid' ? '🔴' : '🟡'}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Right Actions */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
            {/* Compare Button */}
            {compareList.length > 0 && (
              <button
                onClick={() => setShowCompareDrawer(true)}
                style={{
                  padding: '10px 16px',
                  background: '#1e1b4b',
                  border: '1px solid #4338ca',
                  borderRadius: 10,
                  fontSize: 13,
                  color: '#818cf8',
                  cursor: 'pointer',
                  fontWeight: 600
                }}
              >
                Compare ({compareList.length})
              </button>
            )}

            {/* Sell Button */}
            <button
              onClick={() => setShowSellModal(true)}
              style={{
                padding: '10px 20px',
                background: 'linear-gradient(135deg, #10b981, #059669)',
                border: 'none',
                borderRadius: 10,
                fontSize: 13,
                color: '#fff',
                fontWeight: 600,
                cursor: 'pointer'
              }}
            >
              + Sell
            </button>

            {/* Cart */}
            <button
              onClick={() => setShowCart(true)}
              style={{
                position: 'relative',
                padding: '10px 14px',
                background: '#020818',
                border: '1px solid #1e293b',
                borderRadius: 10,
                fontSize: 18,
                cursor: 'pointer'
              }}
            >
              🛒
              {cart.length > 0 && (
                <span style={{
                  position: 'absolute',
                  top: -6,
                  right: -6,
                  width: 20,
                  height: 20,
                  background: '#f43f5e',
                  borderRadius: '50%',
                  fontSize: 11,
                  fontWeight: 700,
                  color: '#fff',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center'
                }}>
                  {cart.reduce((sum, item) => sum + item.quantity, 0)}
                </span>
              )}
            </button>

            {/* User */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <div style={{
                width: 36,
                height: 36,
                borderRadius: '50%',
                background: 'linear-gradient(135deg, #6366f1, #818cf8)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: 14,
                fontWeight: 700
              }}>
                {currentUser?.name?.[0]?.toUpperCase() || 'G'}
              </div>
              <div>
                <div style={{ fontSize: 13, fontWeight: 600 }}>{currentUser?.name || 'Guest'}</div>
                <div 
                  onClick={() => navigate('/history')}
                  style={{ fontSize: 11, color: '#6366f1', cursor: 'pointer' }}
                >
                  My History
                </div>
              </div>
              <button
                onClick={() => { logout(); navigate('/'); }}
                style={{
                  padding: '6px 12px',
                  background: 'transparent',
                  border: '1px solid #1e293b',
                  borderRadius: 8,
                  fontSize: 11,
                  color: '#64748b',
                  cursor: 'pointer'
                }}
              >
                Logout
              </button>
            </div>
          </div>
        </div>
      </header>

      <div style={{ maxWidth: 1400, margin: '0 auto', padding: '24px', display: 'flex', gap: 24 }}>
        {/* Sidebar Filters */}
        <aside style={{ width: 260, flexShrink: 0 }}>
          <Card style={{ position: 'sticky', top: 100 }}>
            <h3 style={{ fontSize: 14, fontWeight: 700, marginBottom: 20, color: '#818cf8' }}>FILTERS</h3>
            
            {/* Price Range */}
            <div style={{ marginBottom: 24 }}>
              <label style={{ fontSize: 12, color: '#64748b', display: 'block', marginBottom: 8 }}>
                Price Range: ₹{priceRange[0].toLocaleString()} - ₹{priceRange[1].toLocaleString()}
              </label>
              <input
                type="range"
                min="0"
                max="30000"
                step="500"
                value={priceRange[1]}
                onChange={e => setPriceRange([0, parseInt(e.target.value)])}
                style={{ width: '100%', accentColor: '#6366f1' }}
              />
            </div>

            {/* Rating Filter */}
            <div style={{ marginBottom: 24 }}>
              <label style={{ fontSize: 12, color: '#64748b', display: 'block', marginBottom: 8 }}>
                Minimum Rating
              </label>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                {[0, 1, 2, 3, 4, 5].map(r => (
                  <button
                    key={r}
                    onClick={() => setRatingFilter(r)}
                    style={{
                      padding: '6px 12px',
                      background: ratingFilter === r ? '#6366f1' : '#020818',
                      border: '1px solid #1e293b',
                      borderRadius: 8,
                      fontSize: 12,
                      color: ratingFilter === r ? '#fff' : '#64748b',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      gap: 4
                    }}
                  >
                    {r === 0 ? 'All' : <><span style={{ color: '#f59e0b' }}>{'★'.repeat(r)}</span></>}
                  </button>
                ))}
              </div>
            </div>

            {/* Sentiment Filter */}
            <div style={{ marginBottom: 24 }}>
              <label style={{ fontSize: 12, color: '#64748b', display: 'block', marginBottom: 8 }}>
                Sentiment
              </label>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {[
                  { value: 'all', label: 'All Products' },
                  { value: 'loved', label: '❤️ Loved' },
                  { value: 'mixed', label: '😐 Mixed' },
                  { value: 'avoid', label: '⚠️ Avoid' }
                ].map(s => (
                  <button
                    key={s.value}
                    onClick={() => setSentimentFilter(s.value)}
                    style={{
                      padding: '8px 12px',
                      background: sentimentFilter === s.value ? '#6366f115' : 'transparent',
                      border: `1px solid ${sentimentFilter === s.value ? '#6366f1' : '#1e293b'}`,
                      borderRadius: 8,
                      fontSize: 12,
                      color: sentimentFilter === s.value ? '#818cf8' : '#64748b',
                      cursor: 'pointer',
                      textAlign: 'left'
                    }}
                  >
                    {s.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Sort */}
            <div>
              <label style={{ fontSize: 12, color: '#64748b', display: 'block', marginBottom: 8 }}>
                Sort By
              </label>
              <select
                value={sortBy}
                onChange={e => setSortBy(e.target.value)}
                style={{
                  width: '100%',
                  padding: '10px 12px',
                  background: '#020818',
                  border: '1px solid #1e293b',
                  borderRadius: 8,
                  fontSize: 13,
                  color: '#e2e8f0',
                  outline: 'none'
                }}
              >
                <option value="most-reviewed">Most Reviewed</option>
                <option value="highest-rated">Highest Rated</option>
                <option value="lowest-price">Lowest Price</option>
                <option value="newest">Newest First</option>
              </select>
            </div>
          </Card>
        </aside>

        {/* Main Content */}
        <main style={{ flex: 1 }}>
          {/* Featured Section */}
          <section style={{ marginBottom: 32 }}>
            <h2 style={{ fontSize: 18, fontWeight: 700, marginBottom: 16, display: 'flex', alignItems: 'center', gap: 8 }}>
              🔥 Featured — Most Reviewed
            </h2>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 16 }}>
              {featuredProducts.map(p => (
                <Card 
                  key={p.id} 
                  accent="#f59e0b50"
                  onClick={() => navigate(`/product/${p.id}`)}
                  style={{ cursor: 'pointer' }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start', marginBottom: 12 }}>
                    <span style={{
                      padding: '4px 10px',
                      background: '#f59e0b20',
                      border: '1px solid #f59e0b50',
                      borderRadius: 99,
                      fontSize: 10,
                      fontWeight: 700,
                      color: '#f59e0b'
                    }}>
                      🔥 MOST REVIEWED
                    </span>
                    <SentimentBadge sentiment={p.sentiment} />
                  </div>
                  <h3 style={{ fontSize: 14, fontWeight: 600, marginBottom: 8, lineHeight: 1.4 }}>{p.name}</h3>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
                    <StarRating rating={Math.round(p.avgRating)} />
                    <span style={{ fontSize: 12, color: '#64748b' }}>({p.reviewCount})</span>
                  </div>
                  <div style={{ fontSize: 20, fontWeight: 800, color: '#10b981' }}>₹{p.price.toLocaleString()}</div>
                </Card>
              ))}
            </div>
          </section>

          {/* Trending Section */}
          {trendingProducts.length > 0 && (
            <section style={{ marginBottom: 32 }}>
              <h2 style={{ fontSize: 18, fontWeight: 700, marginBottom: 16, display: 'flex', alignItems: 'center', gap: 8 }}>
                📈 Trending Now
              </h2>
              <div style={{ display: 'flex', gap: 12, overflowX: 'auto', paddingBottom: 8 }}>
                {trendingProducts.map(p => (
                  <div
                    key={p.id}
                    onClick={() => navigate(`/product/${p.id}`)}
                    style={{
                      minWidth: 200,
                      padding: '14px 18px',
                      background: '#0f172a',
                      border: '1px solid #1e293b',
                      borderRadius: 12,
                      cursor: 'pointer'
                    }}
                  >
                    <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 4, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                      🔥 {p.name}
                    </div>
                    <div style={{ fontSize: 11, color: '#64748b' }}>{p.reviewCount} reviews</div>
                  </div>
                ))}
              </div>
            </section>
          )}

          {/* Product Grid */}
          <section>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
              <h2 style={{ fontSize: 18, fontWeight: 700 }}>
                All Products ({filteredProducts.length})
              </h2>
            </div>
            
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 16 }}>
              {filteredProducts.map(p => (
                <Card key={p.id} style={{ display: 'flex', flexDirection: 'column' }}>
                  {/* Product Image Placeholder */}
                  <div style={{
                    height: 140,
                    background: 'linear-gradient(135deg, #1e293b, #0f172a)',
                    borderRadius: 10,
                    marginBottom: 14,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: 40
                  }}>
                    {p.category === 'Audio' ? '🎧' : p.category === 'Electronics' ? '💻' : '📦'}
                  </div>

                  <div style={{ flex: 1 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start', marginBottom: 8 }}>
                      <SentimentBadge sentiment={p.sentiment} />
                      <VerifiedBadge verifiedPct={p.verifiedPct} />
                    </div>
                    
                    <h3 
                      onClick={() => navigate(`/product/${p.id}`)}
                      style={{ 
                        fontSize: 14, 
                        fontWeight: 600, 
                        marginBottom: 6, 
                        lineHeight: 1.4,
                        cursor: 'pointer',
                        display: '-webkit-box',
                        WebkitLineClamp: 2,
                        WebkitBoxOrient: 'vertical',
                        overflow: 'hidden'
                      }}
                    >
                      {p.name}
                    </h3>
                    
                    <div style={{ fontSize: 11, color: '#475569', marginBottom: 8 }}>
                      ID: {p.id}
                    </div>
                    
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
                      <StarRating rating={Math.round(p.avgRating)} />
                      <span style={{ fontSize: 12, color: '#64748b' }}>
                        {p.avgRating.toFixed(1)} ({p.reviewCount})
                      </span>
                    </div>
                    
                    <div style={{ fontSize: 22, fontWeight: 800, color: '#10b981', marginBottom: 14 }}>
                      ₹{p.price.toLocaleString()}
                    </div>
                  </div>

                  {/* Actions */}
                  <div style={{ display: 'flex', gap: 8 }}>
                    <button
                      onClick={() => navigate(`/insights/${p.id}`)}
                      style={{
                        flex: 1,
                        padding: '10px',
                        background: '#1e1b4b',
                        border: '1px solid #4338ca',
                        borderRadius: 8,
                        fontSize: 11,
                        fontWeight: 600,
                        color: '#818cf8',
                        cursor: 'pointer'
                      }}
                    >
                      View Insights
                    </button>
                    <button
                      onClick={() => addToCompare(p)}
                      style={{
                        padding: '10px',
                        background: '#020818',
                        border: '1px solid #1e293b',
                        borderRadius: 8,
                        fontSize: 14,
                        cursor: 'pointer'
                      }}
                      title="Compare"
                    >
                      📊
                    </button>
                  </div>
                  <div style={{ display: 'flex', gap: 8, marginTop: 8 }}>
                    <button
                      onClick={() => addToCart(p)}
                      style={{
                        flex: 1,
                        padding: '10px',
                        background: '#020818',
                        border: '1px solid #1e293b',
                        borderRadius: 8,
                        fontSize: 11,
                        fontWeight: 600,
                        color: '#64748b',
                        cursor: 'pointer'
                      }}
                    >
                      Add to Cart
                    </button>
                    <button
                      onClick={() => navigate(`/product/${p.id}`)}
                      style={{
                        flex: 1,
                        padding: '10px',
                        background: 'linear-gradient(135deg, #6366f1, #818cf8)',
                        border: 'none',
                        borderRadius: 8,
                        fontSize: 11,
                        fontWeight: 600,
                        color: '#fff',
                        cursor: 'pointer'
                      }}
                    >
                      Buy Now
                    </button>
                  </div>
                </Card>
              ))}
            </div>
          </section>
        </main>
      </div>

      {/* Cart Drawer */}
      {showCart && (
        <div style={{
          position: 'fixed',
          inset: 0,
          background: 'rgba(0,0,0,0.6)',
          zIndex: 200,
          display: 'flex',
          justifyContent: 'flex-end'
        }} onClick={() => setShowCart(false)}>
          <div
            onClick={e => e.stopPropagation()}
            style={{
              width: 400,
              background: '#0f172a',
              height: '100%',
              padding: 24,
              overflowY: 'auto',
              animation: 'slideIn 0.3s ease'
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
              <h2 style={{ fontSize: 18, fontWeight: 700 }}>🛒 Cart ({cart.length})</h2>
              <button onClick={() => setShowCart(false)} style={{ background: 'none', border: 'none', fontSize: 24, color: '#64748b', cursor: 'pointer' }}>×</button>
            </div>

            {cart.length === 0 ? (
              <p style={{ color: '#64748b', textAlign: 'center', padding: 40 }}>Your cart is empty</p>
            ) : (
              <>
                {cart.map(item => (
                  <div key={item.id} style={{
                    padding: '16px',
                    background: '#020818',
                    borderRadius: 12,
                    marginBottom: 12
                  }}>
                    <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 8 }}>{item.name}</div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                        <button
                          onClick={() => updateCartQuantity(item.id, item.quantity - 1)}
                          style={{ width: 28, height: 28, borderRadius: 6, background: '#1e293b', border: 'none', color: '#e2e8f0', cursor: 'pointer' }}
                        >-</button>
                        <span>{item.quantity}</span>
                        <button
                          onClick={() => updateCartQuantity(item.id, item.quantity + 1)}
                          style={{ width: 28, height: 28, borderRadius: 6, background: '#1e293b', border: 'none', color: '#e2e8f0', cursor: 'pointer' }}
                        >+</button>
                      </div>
                      <div style={{ fontSize: 14, fontWeight: 700, color: '#10b981' }}>
                        ₹{(item.price * item.quantity).toLocaleString()}
                      </div>
                    </div>
                  </div>
                ))}

                <div style={{
                  borderTop: '1px solid #1e293b',
                  paddingTop: 20,
                  marginTop: 20
                }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 20 }}>
                    <span style={{ fontSize: 16, fontWeight: 600 }}>Total</span>
                    <span style={{ fontSize: 20, fontWeight: 800, color: '#10b981' }}>₹{cartTotal.toLocaleString()}</span>
                  </div>
                  <button
                    onClick={() => { checkout(); setShowCart(false); }}
                    style={{
                      width: '100%',
                      padding: '14px',
                      background: 'linear-gradient(135deg, #6366f1, #818cf8)',
                      border: 'none',
                      borderRadius: 12,
                      fontSize: 15,
                      fontWeight: 700,
                      color: '#fff',
                      cursor: 'pointer'
                    }}
                  >
                    Checkout →
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      )}

      {/* Sell Modal */}
      {showSellModal && (
        <div style={{
          position: 'fixed',
          inset: 0,
          background: 'rgba(0,0,0,0.6)',
          zIndex: 200,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center'
        }} onClick={() => setShowSellModal(false)}>
          <div
            onClick={e => e.stopPropagation()}
            style={{
              width: 500,
              maxHeight: '90vh',
              background: '#0f172a',
              borderRadius: 20,
              padding: 32,
              overflowY: 'auto'
            }}
          >
            <h2 style={{ fontSize: 20, fontWeight: 700, marginBottom: 24 }}>📦 List Your Product</h2>
            
            <form onSubmit={handleSellSubmit}>
              <div style={{ marginBottom: 16 }}>
                <label style={{ display: 'block', fontSize: 12, color: '#64748b', marginBottom: 6 }}>Product Name *</label>
                <input
                  value={sellForm.name}
                  onChange={e => setSellForm({ ...sellForm, name: e.target.value })}
                  placeholder="e.g. Sony WH-1000XM4 Headphones"
                  required
                  style={{
                    width: '100%',
                    padding: '12px 16px',
                    background: '#020818',
                    border: '1px solid #1e293b',
                    borderRadius: 10,
                    fontSize: 14,
                    color: '#e2e8f0',
                    outline: 'none'
                  }}
                />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 16 }}>
                <div>
                  <label style={{ display: 'block', fontSize: 12, color: '#64748b', marginBottom: 6 }}>Product ID</label>
                  <input
                    value={sellForm.id}
                    onChange={e => setSellForm({ ...sellForm, id: e.target.value })}
                    style={{
                      width: '100%',
                      padding: '12px 16px',
                      background: '#020818',
                      border: '1px solid #1e293b',
                      borderRadius: 10,
                      fontSize: 14,
                      color: '#e2e8f0',
                      outline: 'none'
                    }}
                  />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: 12, color: '#64748b', marginBottom: 6 }}>Category</label>
                  <select
                    value={sellForm.category}
                    onChange={e => setSellForm({ ...sellForm, category: e.target.value })}
                    style={{
                      width: '100%',
                      padding: '12px 16px',
                      background: '#020818',
                      border: '1px solid #1e293b',
                      borderRadius: 10,
                      fontSize: 14,
                      color: '#e2e8f0',
                      outline: 'none'
                    }}
                  >
                    <option value="Electronics">Electronics</option>
                    <option value="Audio">Audio</option>
                    <option value="Accessories">Accessories</option>
                    <option value="Other">Other</option>
                  </select>
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 16 }}>
                <div>
                  <label style={{ display: 'block', fontSize: 12, color: '#64748b', marginBottom: 6 }}>Price (₹) *</label>
                  <input
                    type="number"
                    value={sellForm.price}
                    onChange={e => setSellForm({ ...sellForm, price: e.target.value })}
                    placeholder="1999"
                    required
                    style={{
                      width: '100%',
                      padding: '12px 16px',
                      background: '#020818',
                      border: '1px solid #1e293b',
                      borderRadius: 10,
                      fontSize: 14,
                      color: '#e2e8f0',
                      outline: 'none'
                    }}
                  />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: 12, color: '#64748b', marginBottom: 6 }}>Condition</label>
                  <select
                    value={sellForm.condition}
                    onChange={e => setSellForm({ ...sellForm, condition: e.target.value })}
                    style={{
                      width: '100%',
                      padding: '12px 16px',
                      background: '#020818',
                      border: '1px solid #1e293b',
                      borderRadius: 10,
                      fontSize: 14,
                      color: '#e2e8f0',
                      outline: 'none'
                    }}
                  >
                    <option value="New">New</option>
                    <option value="Like New">Like New</option>
                    <option value="Used">Used</option>
                  </select>
                </div>
              </div>

              <div style={{ marginBottom: 16 }}>
                <label style={{ display: 'block', fontSize: 12, color: '#64748b', marginBottom: 6 }}>Description</label>
                <textarea
                  value={sellForm.description}
                  onChange={e => setSellForm({ ...sellForm, description: e.target.value })}
                  placeholder="Describe your product..."
                  rows={3}
                  style={{
                    width: '100%',
                    padding: '12px 16px',
                    background: '#020818',
                    border: '1px solid #1e293b',
                    borderRadius: 10,
                    fontSize: 14,
                    color: '#e2e8f0',
                    outline: 'none',
                    resize: 'vertical'
                  }}
                />
              </div>

              <div style={{ marginBottom: 24 }}>
                <label style={{ display: 'block', fontSize: 12, color: '#64748b', marginBottom: 6 }}>
                  Paste Existing Reviews (one per line)
                </label>
                <textarea
                  value={sellForm.reviews}
                  onChange={e => setSellForm({ ...sellForm, reviews: e.target.value })}
                  placeholder="Great product, works perfectly!&#10;Excellent quality for the price.&#10;Highly recommend!"
                  rows={4}
                  style={{
                    width: '100%',
                    padding: '12px 16px',
                    background: '#020818',
                    border: '1px solid #1e293b',
                    borderRadius: 10,
                    fontSize: 14,
                    color: '#e2e8f0',
                    outline: 'none',
                    resize: 'vertical'
                  }}
                />
              </div>

              {/* Default Star Rating for Reviews */}
              <div style={{ marginBottom: 16 }}>
                <label style={{ display: 'block', fontSize: 12, color: '#64748b', marginBottom: 6 }}>
                  Default Star Rating for Reviews
                </label>
                <div style={{ display: 'flex', gap: 8 }}>
                  {[1, 2, 3, 4, 5].map(star => (
                    <button
                      key={star}
                      type="button"
                      onClick={() => setSellForm({ ...sellForm, defaultRating: star })}
                      style={{
                        padding: '8px 16px',
                        background: sellForm.defaultRating >= star ? '#f59e0b20' : '#020818',
                        border: `1px solid ${sellForm.defaultRating >= star ? '#f59e0b' : '#1e293b'}`,
                        borderRadius: 8,
                        fontSize: 18,
                        cursor: 'pointer',
                        color: sellForm.defaultRating >= star ? '#f59e0b' : '#1e293b'
                      }}
                    >
                      ★
                    </button>
                  ))}
                  <span style={{ fontSize: 12, color: '#64748b', alignSelf: 'center', marginLeft: 8 }}>
                    ({sellForm.defaultRating} star{sellForm.defaultRating !== 1 ? 's' : ''})
                  </span>
                </div>
              </div>

              {/* Image Upload Placeholder */}
              <div style={{ marginBottom: 24 }}>
                <label style={{ display: 'block', fontSize: 12, color: '#64748b', marginBottom: 6 }}>
                  Product Image (optional)
                </label>
                <div 
                  style={{
                    width: '100%',
                    height: 120,
                    background: '#020818',
                    border: '2px dashed #1e293b',
                    borderRadius: 10,
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    justifyContent: 'center',
                    cursor: 'pointer',
                    transition: 'border-color 0.2s'
                  }}
                  onMouseEnter={e => e.currentTarget.style.borderColor = '#6366f1'}
                  onMouseLeave={e => e.currentTarget.style.borderColor = '#1e293b'}
                >
                  <span style={{ fontSize: 32, marginBottom: 8 }}>📷</span>
                  <span style={{ fontSize: 12, color: '#64748b' }}>Click to upload image</span>
                  <span style={{ fontSize: 10, color: '#475569' }}>PNG, JPG up to 5MB</span>
                </div>
              </div>

              <div style={{ display: 'flex', gap: 12 }}>
                <button
                  type="button"
                  onClick={() => setShowSellModal(false)}
                  style={{
                    flex: 1,
                    padding: '14px',
                    background: 'transparent',
                    border: '1px solid #1e293b',
                    borderRadius: 12,
                    fontSize: 14,
                    fontWeight: 600,
                    color: '#64748b',
                    cursor: 'pointer'
                  }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  style={{
                    flex: 1,
                    padding: '14px',
                    background: 'linear-gradient(135deg, #10b981, #059669)',
                    border: 'none',
                    borderRadius: 12,
                    fontSize: 14,
                    fontWeight: 700,
                    color: '#fff',
                    cursor: 'pointer'
                  }}
                >
                  List Product
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Compare Drawer */}
      {showCompareDrawer && (
        <div style={{
          position: 'fixed',
          inset: 0,
          background: 'rgba(0,0,0,0.6)',
          zIndex: 200,
          display: 'flex',
          justifyContent: 'flex-end'
        }} onClick={() => setShowCompareDrawer(false)}>
          <div
            onClick={e => e.stopPropagation()}
            style={{
              width: Math.min(compareList.length * 280 + 48, 900),
              background: '#0f172a',
              height: '100%',
              padding: 24,
              overflowY: 'auto'
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
              <h2 style={{ fontSize: 18, fontWeight: 700 }}>📊 Compare Products</h2>
              <div style={{ display: 'flex', gap: 12 }}>
                <button
                  onClick={clearCompare}
                  style={{
                    padding: '8px 16px',
                    background: 'transparent',
                    border: '1px solid #1e293b',
                    borderRadius: 8,
                    fontSize: 12,
                    color: '#64748b',
                    cursor: 'pointer'
                  }}
                >
                  Clear All
                </button>
                <button
                  onClick={() => setShowCompareDrawer(false)}
                  style={{ background: 'none', border: 'none', fontSize: 24, color: '#64748b', cursor: 'pointer' }}
                >
                  ×
                </button>
              </div>
            </div>

            <div style={{ display: 'flex', gap: 16 }}>
              {compareList.map(p => (
                <div
                  key={p.id}
                  style={{
                    flex: 1,
                    minWidth: 240,
                    padding: 20,
                    background: '#020818',
                    borderRadius: 16,
                    border: '1px solid #1e293b'
                  }}
                >
                  <button
                    onClick={() => removeFromCompare(p.id)}
                    style={{
                      float: 'right',
                      background: 'none',
                      border: 'none',
                      fontSize: 16,
                      color: '#64748b',
                      cursor: 'pointer'
                    }}
                  >
                    ×
                  </button>
                  
                  <div style={{ fontSize: 28, marginBottom: 12 }}>
                    {p.category === 'Audio' ? '🎧' : p.category === 'Electronics' ? '💻' : '📦'}
                  </div>
                  
                  <h3 style={{ fontSize: 14, fontWeight: 600, marginBottom: 16, lineHeight: 1.4 }}>{p.name}</h3>
                  
                  {[
                    { label: 'Price', value: `₹${p.price.toLocaleString()}`, color: '#10b981' },
                    { label: 'Rating', value: `${p.avgRating.toFixed(1)} / 5`, color: '#f59e0b' },
                    { label: 'Reviews', value: p.reviewCount.toLocaleString(), color: '#6366f1' },
                    { label: 'Verified %', value: `${Math.round(p.verifiedPct * 100)}%`, color: p.verifiedPct >= 0.7 ? '#10b981' : '#f59e0b' },
                    { label: 'Sentiment', value: p.sentiment, color: p.sentiment === 'loved' ? '#10b981' : p.sentiment === 'avoid' ? '#f43f5e' : '#f59e0b' }
                  ].map(row => (
                    <div key={row.label} style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      padding: '10px 0',
                      borderBottom: '1px solid #1e293b'
                    }}>
                      <span style={{ fontSize: 12, color: '#64748b' }}>{row.label}</span>
                      <span style={{ fontSize: 13, fontWeight: 600, color: row.color }}>{row.value}</span>
                    </div>
                  ))}
                  
                  <button
                    onClick={() => { setShowCompareDrawer(false); navigate(`/insights/${p.id}`); }}
                    style={{
                      width: '100%',
                      marginTop: 16,
                      padding: '10px',
                      background: '#1e1b4b',
                      border: '1px solid #4338ca',
                      borderRadius: 8,
                      fontSize: 12,
                      fontWeight: 600,
                      color: '#818cf8',
                      cursor: 'pointer'
                    }}
                  >
                    View Full Insights
                  </button>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      <style>{`
        @keyframes slideIn {
          from { transform: translateX(100%); }
          to { transform: translateX(0); }
        }
        @keyframes ticker {
          from { opacity: 0; transform: translateY(-10px); }
          to { opacity: 1; transform: translateY(0); }
        }
        input:focus, select:focus, textarea:focus {
          border-color: #6366f1 !important;
        }
        button:hover {
          opacity: 0.9;
        }
      `}</style>
    </div>
  );
}

import { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useApp } from '../context/AppContext';

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

const StarRating = ({ rating, interactive, onRatingChange, size = 14 }) => {
  const [hoverRating, setHoverRating] = useState(0);
  
  return (
    <div style={{ display: 'flex', gap: 2 }}>
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

const StatusBadge = ({ status }) => {
  const config = {
    'Active': { color: '#10b981', bg: '#10b98115', icon: '✓' },
    'Sold': { color: '#6366f1', bg: '#6366f115', icon: '💰' },
    'Expired': { color: '#64748b', bg: '#64748b15', icon: '⏰' }
  };
  const c = config[status] || config['Active'];
  return (
    <span style={{
      padding: '4px 10px',
      background: c.bg,
      border: `1px solid ${c.color}30`,
      borderRadius: 99,
      fontSize: 11,
      color: c.color,
      fontWeight: 600,
      display: 'inline-flex',
      alignItems: 'center',
      gap: 4
    }}>
      {c.icon} {status}
    </span>
  );
};

export default function HistoryPage() {
  const navigate = useNavigate();
  const { 
    currentUser, 
    purchasedProducts, 
    listedProducts,
    userReviews,
    showToast,
    submitReview
  } = useApp();

  const [activeTab, setActiveTab] = useState('bought');
  const [searchQuery, setSearchQuery] = useState('');
  const [sortBy, setSortBy] = useState('newest');
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;
  
  // Review modal state
  const [reviewModal, setReviewModal] = useState(null);
  const [reviewRating, setReviewRating] = useState(5);
  const [reviewText, setReviewText] = useState('');

  // Add mock data if no real data exists
  const soldItems = useMemo(() => {
    if (listedProducts.length > 0) return listedProducts;
    // Generate mock sold items for demo
    return [
      { id: 'SOLD001', name: 'Sony WH-1000XM4', category: 'Audio', price: 24990, listedAt: '2026-02-15T10:00:00Z', views: 342, status: 'Active' },
      { id: 'SOLD002', name: 'MacBook Pro 14"', category: 'Electronics', price: 189900, listedAt: '2026-01-20T10:00:00Z', views: 128, status: 'Sold' },
      { id: 'SOLD003', name: 'iPad Air 5', category: 'Electronics', price: 54900, listedAt: '2026-01-10T10:00:00Z', views: 89, status: 'Active' },
      { id: 'SOLD004', name: 'Logitech MX Master 3', category: 'Electronics', price: 8995, listedAt: '2025-12-01T10:00:00Z', views: 456, status: 'Expired' },
      { id: 'SOLD005', name: 'Apple AirPods Pro', category: 'Audio', price: 22900, listedAt: '2026-02-28T10:00:00Z', views: 67, status: 'Active' },
    ];
  }, [listedProducts]);

  const boughtItems = useMemo(() => {
    if (purchasedProducts.length > 0) return purchasedProducts;
    // Generate mock bought items for demo
    return [
      { id: 'B07XJ8C8F5', name: 'Bose QuietComfort 45', category: 'Audio', price: 27990, purchasedAt: '2026-03-01T10:00:00Z', reviewed: true, myRating: 5 },
      { id: 'B09V3KXJPB', name: 'Apple Watch Series 8', category: 'Wearables', price: 45900, purchasedAt: '2026-02-20T10:00:00Z', reviewed: false, myRating: null },
      { id: 'B08N5WRWNW', name: 'Anker PowerCore 26800', category: 'Electronics', price: 3999, purchasedAt: '2026-02-10T10:00:00Z', reviewed: true, myRating: 4 },
      { id: 'B07Q5NHVCQ', name: 'Samsung Galaxy Buds Pro', category: 'Audio', price: 13990, purchasedAt: '2026-01-25T10:00:00Z', reviewed: false, myRating: null },
      { id: 'B0BSHF7WHW', name: 'JBL Flip 6 Speaker', category: 'Audio', price: 9999, purchasedAt: '2026-01-15T10:00:00Z', reviewed: true, myRating: 3 },
    ];
  }, [purchasedProducts]);

  // Check if user has reviewed a product
  const hasReviewed = (productId) => {
    return userReviews.some(r => r.productId === productId);
  };

  // Get user's rating for a product
  const getUserRating = (productId) => {
    const review = userReviews.find(r => r.productId === productId);
    return review?.rating || null;
  };

  // Get filtered and sorted items
  const filteredItems = useMemo(() => {
    const items = activeTab === 'bought' ? boughtItems : soldItems;
    let filtered = [...items];

    // Search filter
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      filtered = filtered.filter(item => 
        item.name?.toLowerCase().includes(q) ||
        item.id?.toLowerCase().includes(q)
      );
    }

    // Sort
    switch (sortBy) {
      case 'newest':
        filtered.sort((a, b) => new Date(b.purchasedAt || b.listedAt) - new Date(a.purchasedAt || a.listedAt));
        break;
      case 'oldest':
        filtered.sort((a, b) => new Date(a.purchasedAt || a.listedAt) - new Date(b.purchasedAt || b.listedAt));
        break;
      case 'price-high':
        filtered.sort((a, b) => b.price - a.price);
        break;
      case 'price-low':
        filtered.sort((a, b) => a.price - b.price);
        break;
      default:
        break;
    }

    return filtered;
  }, [activeTab, boughtItems, soldItems, searchQuery, sortBy]);

  // Pagination
  const totalPages = Math.ceil(filteredItems.length / itemsPerPage);
  const paginatedItems = filteredItems.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  // Stats
  const stats = useMemo(() => {
    const bought = boughtItems.reduce((sum, p) => sum + p.price, 0);
    const sold = soldItems.filter(s => s.status === 'Sold').reduce((sum, s) => sum + s.price, 0);
    const activeListings = soldItems.filter(s => s.status === 'Active').length;
    return {
      totalBought: boughtItems.length,
      totalSpent: bought,
      totalSold: soldItems.length,
      activeListings,
      totalEarned: sold
    };
  }, [boughtItems, soldItems]);

  // Export CSV
  const exportCSV = () => {
    let headers, rows;
    
    if (activeTab === 'sold') {
      headers = ['Product Name', 'Product ID', 'Price', 'Date Listed', 'Views', 'Status'];
      rows = soldItems.map(item => [
        item.name,
        item.id,
        item.price,
        new Date(item.listedAt).toLocaleDateString(),
        item.views || 0,
        item.status || 'Active'
      ]);
    } else {
      headers = ['Product Name', 'Product ID', 'Price', 'Date Purchased', 'My Rating'];
      rows = boughtItems.map(item => [
        item.name,
        item.id,
        item.price,
        new Date(item.purchasedAt).toLocaleDateString(),
        getUserRating(item.id) || item.myRating || 'Not rated'
      ]);
    }

    const csv = [headers, ...rows].map(row => row.map(cell => `"${cell}"`).join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `synthetix-${activeTab}-history-${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    window.URL.revokeObjectURL(url);
  };

  // Submit review handler
  const handleSubmitReview = () => {
    if (reviewText.trim().length < 20) {
      showToast('Review must be at least 20 characters', 'error');
      return;
    }
    
    submitReview(reviewModal.id, {
      rating: reviewRating,
      text: reviewText,
      author: currentUser?.name || 'Anonymous',
      verified: true
    });
    
    showToast('Review submitted successfully!', 'success');
    setReviewModal(null);
    setReviewText('');
    setReviewRating(5);
  };

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
            <span style={{ color: '#64748b', fontSize: 14 }}>My History</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
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
              <div style={{ fontSize: 11, color: '#64748b' }}>{currentUser?.email || 'guest@synthetix.com'}</div>
            </div>
            <button
              onClick={() => navigate('/marketplace')}
              style={{
                padding: '8px 16px',
                background: 'transparent',
                border: '1px solid #1e293b',
                borderRadius: 8,
                fontSize: 12,
                color: '#64748b',
                cursor: 'pointer',
                marginLeft: 8
              }}
            >
              ← Back
            </button>
          </div>
        </div>
      </header>

      <main style={{ maxWidth: 1400, margin: '0 auto', padding: '32px 24px' }}>
        {/* Page Title */}
        <div style={{ marginBottom: 32 }}>
          <h1 style={{ fontSize: 28, fontWeight: 800, marginBottom: 8 }}>📋 My History</h1>
          <p style={{ color: '#64748b' }}>View your sales and purchase history</p>
        </div>

        {/* Stats Cards */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: 16, marginBottom: 32 }}>
          <Card>
            <div style={{ fontSize: 11, color: '#64748b', marginBottom: 4 }}>Items Bought</div>
            <div style={{ fontSize: 24, fontWeight: 800 }}>{stats.totalBought}</div>
          </Card>
          <Card>
            <div style={{ fontSize: 11, color: '#64748b', marginBottom: 4 }}>Total Spent</div>
            <div style={{ fontSize: 24, fontWeight: 800, color: '#f43f5e' }}>₹{stats.totalSpent.toLocaleString()}</div>
          </Card>
          <Card>
            <div style={{ fontSize: 11, color: '#64748b', marginBottom: 4 }}>Items Listed</div>
            <div style={{ fontSize: 24, fontWeight: 800 }}>{stats.totalSold}</div>
          </Card>
          <Card>
            <div style={{ fontSize: 11, color: '#64748b', marginBottom: 4 }}>Active Listings</div>
            <div style={{ fontSize: 24, fontWeight: 800, color: '#10b981' }}>{stats.activeListings}</div>
          </Card>
          <Card>
            <div style={{ fontSize: 11, color: '#64748b', marginBottom: 4 }}>Total Earned</div>
            <div style={{ fontSize: 24, fontWeight: 800, color: '#6366f1' }}>₹{stats.totalEarned.toLocaleString()}</div>
          </Card>
        </div>

        {/* Tabs */}
        <div style={{ display: 'flex', gap: 8, marginBottom: 24 }}>
          <button
            onClick={() => { setActiveTab('sold'); setCurrentPage(1); }}
            style={{
              padding: '12px 24px',
              background: activeTab === 'sold' ? '#6366f1' : '#0f172a',
              border: `1px solid ${activeTab === 'sold' ? '#6366f1' : '#1e293b'}`,
              borderRadius: 10,
              fontSize: 14,
              fontWeight: 600,
              color: activeTab === 'sold' ? '#fff' : '#64748b',
              cursor: 'pointer'
            }}
          >
            💰 Items I Sold ({soldItems.length})
          </button>
          <button
            onClick={() => { setActiveTab('bought'); setCurrentPage(1); }}
            style={{
              padding: '12px 24px',
              background: activeTab === 'bought' ? '#6366f1' : '#0f172a',
              border: `1px solid ${activeTab === 'bought' ? '#6366f1' : '#1e293b'}`,
              borderRadius: 10,
              fontSize: 14,
              fontWeight: 600,
              color: activeTab === 'bought' ? '#fff' : '#64748b',
              cursor: 'pointer'
            }}
          >
            🛒 Items I Bought ({boughtItems.length})
          </button>
        </div>

        {/* Filters & Actions */}
        <Card style={{ marginBottom: 24 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 16, flexWrap: 'wrap' }}>
            {/* Search */}
            <div style={{ flex: 1, minWidth: 250, position: 'relative' }}>
              <input
                value={searchQuery}
                onChange={e => { setSearchQuery(e.target.value); setCurrentPage(1); }}
                placeholder="Search by product name or ID..."
                style={{
                  width: '100%',
                  padding: '10px 14px',
                  paddingLeft: 38,
                  background: '#020818',
                  border: '1px solid #1e293b',
                  borderRadius: 10,
                  fontSize: 13,
                  color: '#e2e8f0',
                  outline: 'none'
                }}
              />
              <span style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: '#64748b' }}>🔍</span>
            </div>

            {/* Sort */}
            <select
              value={sortBy}
              onChange={e => setSortBy(e.target.value)}
              style={{
                padding: '10px 14px',
                background: '#020818',
                border: '1px solid #1e293b',
                borderRadius: 10,
                fontSize: 13,
                color: '#e2e8f0',
                outline: 'none'
              }}
            >
              <option value="newest">Newest First</option>
              <option value="oldest">Oldest First</option>
              <option value="price-high">Price: High to Low</option>
              <option value="price-low">Price: Low to High</option>
            </select>

            {/* Export */}
            <button
              onClick={exportCSV}
              style={{
                padding: '10px 16px',
                background: '#1e1b4b',
                border: '1px solid #4338ca',
                borderRadius: 10,
                fontSize: 13,
                color: '#818cf8',
                fontWeight: 600,
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: 6
              }}
            >
              📥 Export CSV
            </button>
          </div>
        </Card>

        {/* Items Table */}
        <Card style={{ padding: 0, overflow: 'hidden' }}>
          {filteredItems.length === 0 ? (
            <div style={{ padding: 60, textAlign: 'center' }}>
              <div style={{ fontSize: 48, marginBottom: 16 }}>
                {activeTab === 'bought' ? '🛒' : '💰'}
              </div>
              <h3 style={{ fontSize: 18, fontWeight: 600, marginBottom: 8 }}>
                No {activeTab === 'bought' ? 'purchases' : 'listings'} yet
              </h3>
              <p style={{ color: '#64748b', marginBottom: 20 }}>
                {activeTab === 'bought'
                  ? 'Items you purchase will appear here'
                  : 'Items you list for sale will appear here'}
              </p>
              <button
                onClick={() => navigate('/marketplace')}
                style={{
                  padding: '12px 24px',
                  background: '#6366f1',
                  border: 'none',
                  borderRadius: 10,
                  fontSize: 14,
                  fontWeight: 600,
                  color: '#fff',
                  cursor: 'pointer'
                }}
              >
                Browse Marketplace
              </button>
            </div>
          ) : (
            <>
              {/* Table Header - SOLD */}
              {activeTab === 'sold' && (
                <div style={{
                  display: 'grid',
                  gridTemplateColumns: '1.5fr 120px 100px 120px 80px 100px 150px',
                  padding: '14px 24px',
                  background: '#0f172a',
                  borderBottom: '1px solid #1e293b',
                  fontSize: 11,
                  color: '#64748b',
                  fontWeight: 600,
                  textTransform: 'uppercase'
                }}>
                  <div>Product Name</div>
                  <div>Product ID</div>
                  <div>Price</div>
                  <div>Date Listed</div>
                  <div>Views</div>
                  <div>Status</div>
                  <div>Actions</div>
                </div>
              )}

              {/* Table Header - BOUGHT */}
              {activeTab === 'bought' && (
                <div style={{
                  display: 'grid',
                  gridTemplateColumns: '1.5fr 120px 100px 120px 100px 200px',
                  padding: '14px 24px',
                  background: '#0f172a',
                  borderBottom: '1px solid #1e293b',
                  fontSize: 11,
                  color: '#64748b',
                  fontWeight: 600,
                  textTransform: 'uppercase'
                }}>
                  <div>Product Name</div>
                  <div>Product ID</div>
                  <div>Price</div>
                  <div>Date Purchased</div>
                  <div>My Rating</div>
                  <div>Actions</div>
                </div>
              )}

              {/* Table Rows - SOLD */}
              {activeTab === 'sold' && paginatedItems.map((item, idx) => (
                <div
                  key={idx}
                  style={{
                    display: 'grid',
                    gridTemplateColumns: '1.5fr 120px 100px 120px 80px 100px 150px',
                    padding: '16px 24px',
                    borderBottom: '1px solid #1e293b',
                    alignItems: 'center',
                    fontSize: 13,
                    transition: 'background 0.2s'
                  }}
                  onMouseEnter={e => e.currentTarget.style.background = '#0f172a80'}
                  onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                    <div style={{
                      width: 40,
                      height: 40,
                      borderRadius: 8,
                      background: '#1e293b',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontSize: 18
                    }}>
                      {item.category === 'Audio' ? '🎧' : item.category === 'Electronics' ? '💻' : item.category === 'Gaming' ? '🎮' : '📦'}
                    </div>
                    <div style={{ fontWeight: 600 }}>{item.name}</div>
                  </div>
                  <div style={{ color: '#64748b', fontFamily: 'monospace', fontSize: 11 }}>
                    {item.id?.slice(0, 10)}...
                  </div>
                  <div style={{ fontWeight: 600, color: '#10b981' }}>₹{item.price.toLocaleString()}</div>
                  <div style={{ color: '#64748b', fontSize: 12 }}>
                    {new Date(item.listedAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                  </div>
                  <div style={{ color: '#94a3b8' }}>
                    👁 {item.views || Math.floor(Math.random() * 500)}
                  </div>
                  <div>
                    <StatusBadge status={item.status || 'Active'} />
                  </div>
                  <div>
                    <button
                      onClick={() => navigate(`/insights/${item.id}`)}
                      style={{
                        padding: '6px 12px',
                        background: '#1e1b4b',
                        border: '1px solid #4338ca',
                        borderRadius: 6,
                        fontSize: 11,
                        color: '#818cf8',
                        fontWeight: 600,
                        cursor: 'pointer'
                      }}
                    >
                      📊 View Insights
                    </button>
                  </div>
                </div>
              ))}

              {/* Table Rows - BOUGHT */}
              {activeTab === 'bought' && paginatedItems.map((item, idx) => {
                const reviewed = hasReviewed(item.id) || item.reviewed;
                const rating = getUserRating(item.id) || item.myRating;
                
                return (
                  <div
                    key={idx}
                    style={{
                      display: 'grid',
                      gridTemplateColumns: '1.5fr 120px 100px 120px 100px 200px',
                      padding: '16px 24px',
                      borderBottom: '1px solid #1e293b',
                      alignItems: 'center',
                      fontSize: 13,
                      transition: 'background 0.2s'
                    }}
                    onMouseEnter={e => e.currentTarget.style.background = '#0f172a80'}
                    onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                      <div style={{
                        width: 40,
                        height: 40,
                        borderRadius: 8,
                        background: '#1e293b',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontSize: 18
                      }}>
                        {item.category === 'Audio' ? '🎧' : item.category === 'Electronics' ? '💻' : item.category === 'Wearables' ? '⌚' : '📦'}
                      </div>
                      <div style={{ fontWeight: 600 }}>{item.name}</div>
                    </div>
                    <div style={{ color: '#64748b', fontFamily: 'monospace', fontSize: 11 }}>
                      {item.id?.slice(0, 10)}...
                    </div>
                    <div style={{ fontWeight: 600, color: '#f43f5e' }}>₹{item.price.toLocaleString()}</div>
                    <div style={{ color: '#64748b', fontSize: 12 }}>
                      {new Date(item.purchasedAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                    </div>
                    <div>
                      {rating ? (
                        <StarRating rating={rating} size={14} />
                      ) : (
                        <span style={{ color: '#64748b', fontSize: 11 }}>Not rated</span>
                      )}
                    </div>
                    <div style={{ display: 'flex', gap: 8 }}>
                      <button
                        onClick={() => navigate(`/insights/${item.id}`)}
                        style={{
                          padding: '6px 12px',
                          background: '#1e1b4b',
                          border: '1px solid #4338ca',
                          borderRadius: 6,
                          fontSize: 11,
                          color: '#818cf8',
                          fontWeight: 600,
                          cursor: 'pointer'
                        }}
                      >
                        📊 Insights
                      </button>
                      {!reviewed && (
                        <button
                          onClick={() => setReviewModal(item)}
                          style={{
                            padding: '6px 12px',
                            background: '#10b98115',
                            border: '1px solid #10b98130',
                            borderRadius: 6,
                            fontSize: 11,
                            color: '#10b981',
                            fontWeight: 600,
                            cursor: 'pointer'
                          }}
                        >
                          ✏️ Write Review
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}

              {/* Pagination */}
              {totalPages > 1 && (
                <div style={{
                  padding: '16px 24px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  borderTop: '1px solid #1e293b'
                }}>
                  <div style={{ fontSize: 12, color: '#64748b' }}>
                    Showing {(currentPage - 1) * itemsPerPage + 1} - {Math.min(currentPage * itemsPerPage, filteredItems.length)} of {filteredItems.length}
                  </div>
                  <div style={{ display: 'flex', gap: 8 }}>
                    <button
                      onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                      disabled={currentPage === 1}
                      style={{
                        padding: '8px 14px',
                        background: '#020818',
                        border: '1px solid #1e293b',
                        borderRadius: 8,
                        fontSize: 12,
                        color: currentPage === 1 ? '#1e293b' : '#e2e8f0',
                        cursor: currentPage === 1 ? 'not-allowed' : 'pointer'
                      }}
                    >
                      ← Prev
                    </button>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                      {Array.from({ length: totalPages }, (_, i) => i + 1)
                        .filter(p => p === 1 || p === totalPages || Math.abs(p - currentPage) <= 1)
                        .map((page, idx, arr) => (
                          <span key={page}>
                            {idx > 0 && arr[idx - 1] !== page - 1 && (
                              <span style={{ color: '#64748b', marginRight: 4 }}>...</span>
                            )}
                            <button
                              onClick={() => setCurrentPage(page)}
                              style={{
                                width: 32,
                                height: 32,
                                borderRadius: 8,
                                background: currentPage === page ? '#6366f1' : '#020818',
                                border: `1px solid ${currentPage === page ? '#6366f1' : '#1e293b'}`,
                                fontSize: 12,
                                color: currentPage === page ? '#fff' : '#64748b',
                                cursor: 'pointer'
                              }}
                            >
                              {page}
                            </button>
                          </span>
                        ))}
                    </div>
                    <button
                      onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                      disabled={currentPage === totalPages}
                      style={{
                        padding: '8px 14px',
                        background: '#020818',
                        border: '1px solid #1e293b',
                        borderRadius: 8,
                        fontSize: 12,
                        color: currentPage === totalPages ? '#1e293b' : '#e2e8f0',
                        cursor: currentPage === totalPages ? 'not-allowed' : 'pointer'
                      }}
                    >
                      Next →
                    </button>
                  </div>
                </div>
              )}
            </>
          )}
        </Card>
      </main>

      {/* Review Modal */}
      {reviewModal && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: 'rgba(0,0,0,0.8)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 1000
        }}>
          <Card style={{ width: 480, maxWidth: '90vw' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
              <h3 style={{ fontSize: 18, fontWeight: 700, margin: 0 }}>Write a Review</h3>
              <button
                onClick={() => setReviewModal(null)}
                style={{
                  background: 'none',
                  border: 'none',
                  fontSize: 20,
                  color: '#64748b',
                  cursor: 'pointer'
                }}
              >
                ✕
              </button>
            </div>
            
            <div style={{ marginBottom: 20 }}>
              <div style={{ fontSize: 14, fontWeight: 600, marginBottom: 4 }}>{reviewModal.name}</div>
              <div style={{ fontSize: 12, color: '#64748b' }}>Product ID: {reviewModal.id}</div>
            </div>

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
              marginBottom: 20
            }}>
              ✓ Verified Purchase
            </div>
            
            <div style={{ marginBottom: 20 }}>
              <label style={{ fontSize: 12, color: '#64748b', display: 'block', marginBottom: 8 }}>Your Rating</label>
              <StarRating 
                rating={reviewRating} 
                interactive 
                onRatingChange={setReviewRating}
                size={28}
              />
            </div>
            
            <div style={{ marginBottom: 20 }}>
              <label style={{ fontSize: 12, color: '#64748b', display: 'block', marginBottom: 8 }}>Your Review (min 20 chars)</label>
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
                  outline: 'none',
                  fontFamily: 'inherit'
                }}
              />
              <div style={{ fontSize: 11, color: reviewText.length >= 20 ? '#10b981' : '#64748b', marginTop: 8 }}>
                {reviewText.length}/20 characters minimum
              </div>
            </div>
            
            <div style={{ display: 'flex', gap: 12 }}>
              <button
                onClick={() => setReviewModal(null)}
                style={{
                  flex: 1,
                  padding: '12px',
                  background: '#020818',
                  border: '1px solid #1e293b',
                  borderRadius: 10,
                  fontSize: 14,
                  color: '#64748b',
                  cursor: 'pointer'
                }}
              >
                Cancel
              </button>
              <button
                onClick={handleSubmitReview}
                style={{
                  flex: 1,
                  padding: '12px',
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
            </div>
          </Card>
        </div>
      )}

      <style>{`
        input:focus, select:focus, textarea:focus {
          border-color: #6366f1 !important;
        }
        button:hover:not(:disabled) {
          opacity: 0.9;
        }
      `}</style>
    </div>
  );
}

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

const StarRating = ({ rating, size = 12 }) => (
  <div style={{ display: 'flex', gap: 1 }}>
    {[1, 2, 3, 4, 5].map(i => (
      <span key={i} style={{ fontSize: size, color: i <= rating ? '#f59e0b' : '#1e293b' }}>★</span>
    ))}
  </div>
);

export default function HistoryPage() {
  const navigate = useNavigate();
  const { currentUser, purchases, soldItems, logout } = useApp();

  const [activeTab, setActiveTab] = useState('bought');
  const [searchQuery, setSearchQuery] = useState('');
  const [dateFilter, setDateFilter] = useState('all');
  const [sortBy, setSortBy] = useState('newest');
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

  // Get filtered and sorted items
  const filteredItems = useMemo(() => {
    const items = activeTab === 'bought' ? purchases : soldItems;
    let filtered = [...items];

    // Search filter
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      filtered = filtered.filter(item => 
        item.name?.toLowerCase().includes(q) ||
        item.productId?.toLowerCase().includes(q)
      );
    }

    // Date filter
    const now = new Date();
    if (dateFilter !== 'all') {
      const days = dateFilter === '7d' ? 7 : dateFilter === '30d' ? 30 : 90;
      const cutoff = new Date(now.setDate(now.getDate() - days));
      filtered = filtered.filter(item => new Date(item.date) >= cutoff);
    }

    // Sort
    switch (sortBy) {
      case 'newest':
        filtered.sort((a, b) => new Date(b.date) - new Date(a.date));
        break;
      case 'oldest':
        filtered.sort((a, b) => new Date(a.date) - new Date(b.date));
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
  }, [activeTab, purchases, soldItems, searchQuery, dateFilter, sortBy]);

  // Pagination
  const totalPages = Math.ceil(filteredItems.length / itemsPerPage);
  const paginatedItems = filteredItems.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  // Stats
  const stats = useMemo(() => {
    const bought = purchases.reduce((sum, p) => sum + (p.price * (p.quantity || 1)), 0);
    const sold = soldItems.reduce((sum, s) => sum + s.price, 0);
    return {
      totalBought: purchases.length,
      totalSpent: bought,
      totalSold: soldItems.length,
      totalEarned: sold,
      netBalance: sold - bought
    };
  }, [purchases, soldItems]);

  // Export CSV
  const exportCSV = () => {
    const items = activeTab === 'bought' ? purchases : soldItems;
    const headers = ['Date', 'Product Name', 'Product ID', 'Price', 'Quantity', 'Total'];
    const rows = items.map(item => [
      new Date(item.date).toLocaleDateString(),
      item.name,
      item.productId,
      item.price,
      item.quantity || 1,
      item.price * (item.quantity || 1)
    ]);

    const csv = [headers, ...rows].map(row => row.join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `tristha-${activeTab}-history-${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    window.URL.revokeObjectURL(url);
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
          maxWidth: 1200,
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
              <span style={{ fontSize: 18, fontWeight: 700 }}>Tristha Market</span>
            </div>
            <span style={{ color: '#1e293b' }}>|</span>
            <span style={{ color: '#64748b', fontSize: 14 }}>Transaction History</span>
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
              <div style={{ fontSize: 11, color: '#64748b' }}>{currentUser?.email || 'guest@tristha.com'}</div>
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

      <main style={{ maxWidth: 1200, margin: '0 auto', padding: '32px 24px' }}>
        {/* Page Title */}
        <div style={{ marginBottom: 32 }}>
          <h1 style={{ fontSize: 28, fontWeight: 800, marginBottom: 8 }}>📋 Transaction History</h1>
          <p style={{ color: '#64748b' }}>View and manage your purchase and sales history</p>
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
            <div style={{ fontSize: 11, color: '#64748b', marginBottom: 4 }}>Items Sold</div>
            <div style={{ fontSize: 24, fontWeight: 800 }}>{stats.totalSold}</div>
          </Card>
          <Card>
            <div style={{ fontSize: 11, color: '#64748b', marginBottom: 4 }}>Total Earned</div>
            <div style={{ fontSize: 24, fontWeight: 800, color: '#10b981' }}>₹{stats.totalEarned.toLocaleString()}</div>
          </Card>
          <Card>
            <div style={{ fontSize: 11, color: '#64748b', marginBottom: 4 }}>Net Balance</div>
            <div style={{ 
              fontSize: 24, 
              fontWeight: 800, 
              color: stats.netBalance >= 0 ? '#10b981' : '#f43f5e' 
            }}>
              {stats.netBalance >= 0 ? '+' : ''}₹{stats.netBalance.toLocaleString()}
            </div>
          </Card>
        </div>

        {/* Tabs */}
        <div style={{ display: 'flex', gap: 8, marginBottom: 24 }}>
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
            🛒 Items Bought ({purchases.length})
          </button>
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
            💰 Items Sold ({soldItems.length})
          </button>
        </div>

        {/* Filters & Actions */}
        <Card style={{ marginBottom: 24 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 16, flexWrap: 'wrap' }}>
            {/* Search */}
            <div style={{ flex: 1, minWidth: 200, position: 'relative' }}>
              <input
                value={searchQuery}
                onChange={e => { setSearchQuery(e.target.value); setCurrentPage(1); }}
                placeholder="Search by name or ID..."
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

            {/* Date Filter */}
            <select
              value={dateFilter}
              onChange={e => { setDateFilter(e.target.value); setCurrentPage(1); }}
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
              <option value="all">All Time</option>
              <option value="7d">Last 7 Days</option>
              <option value="30d">Last 30 Days</option>
              <option value="90d">Last 90 Days</option>
            </select>

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
                No {activeTab === 'bought' ? 'purchases' : 'sales'} yet
              </h3>
              <p style={{ color: '#64748b', marginBottom: 20 }}>
                {activeTab === 'bought'
                  ? 'Items you purchase will appear here'
                  : 'Items you sell will appear here'}
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
              {/* Table Header */}
              <div style={{
                display: 'grid',
                gridTemplateColumns: activeTab === 'bought' 
                  ? '1fr 120px 100px 80px 100px 120px' 
                  : '1fr 120px 100px 120px 100px',
                padding: '14px 24px',
                background: '#0f172a',
                borderBottom: '1px solid #1e293b',
                fontSize: 11,
                color: '#64748b',
                fontWeight: 600,
                textTransform: 'uppercase'
              }}>
                <div>Product</div>
                <div>Product ID</div>
                <div>Price</div>
                {activeTab === 'bought' && <div>Qty</div>}
                <div>{activeTab === 'bought' ? 'Total' : 'Status'}</div>
                <div>Date</div>
              </div>

              {/* Table Rows */}
              {paginatedItems.map((item, idx) => (
                <div
                  key={idx}
                  style={{
                    display: 'grid',
                    gridTemplateColumns: activeTab === 'bought' 
                      ? '1fr 120px 100px 80px 100px 120px' 
                      : '1fr 120px 100px 120px 100px',
                    padding: '16px 24px',
                    borderBottom: '1px solid #1e293b',
                    alignItems: 'center',
                    fontSize: 13
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
                      {item.category === 'Audio' ? '🎧' : item.category === 'Electronics' ? '💻' : '📦'}
                    </div>
                    <div>
                      <div 
                        onClick={() => navigate(`/product/${item.productId}`)}
                        style={{ fontWeight: 600, cursor: 'pointer' }}
                      >
                        {item.name}
                      </div>
                      {item.avgRating && <StarRating rating={Math.round(item.avgRating)} />}
                    </div>
                  </div>
                  <div style={{ color: '#64748b', fontFamily: 'monospace', fontSize: 11 }}>
                    {item.productId?.slice(0, 12)}...
                  </div>
                  <div style={{ fontWeight: 600 }}>₹{item.price.toLocaleString()}</div>
                  {activeTab === 'bought' && (
                    <div style={{ color: '#64748b' }}>×{item.quantity || 1}</div>
                  )}
                  <div style={{ fontWeight: 700, color: '#10b981' }}>
                    {activeTab === 'bought' 
                      ? `₹${(item.price * (item.quantity || 1)).toLocaleString()}`
                      : (
                        <span style={{
                          padding: '4px 10px',
                          background: '#10b98115',
                          border: '1px solid #10b98130',
                          borderRadius: 99,
                          fontSize: 11,
                          color: '#10b981'
                        }}>
                          Completed
                        </span>
                      )
                    }
                  </div>
                  <div style={{ color: '#64748b', fontSize: 12 }}>
                    {new Date(item.date).toLocaleDateString('en-US', {
                      month: 'short',
                      day: 'numeric',
                      year: 'numeric'
                    })}
                  </div>
                </div>
              ))}

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
                          <>
                            {idx > 0 && arr[idx - 1] !== page - 1 && (
                              <span style={{ color: '#64748b' }}>...</span>
                            )}
                            <button
                              key={page}
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
                          </>
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

      <style>{`
        input:focus, select:focus {
          border-color: #6366f1 !important;
        }
        button:hover:not(:disabled) {
          opacity: 0.9;
        }
      `}</style>
    </div>
  );
}

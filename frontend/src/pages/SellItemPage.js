import { useState, useEffect } from 'react';
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

const StarRating = ({ rating, interactive, onRatingChange, size = 24 }) => {
  const [hoverRating, setHoverRating] = useState(0);
  
  return (
    <div style={{ display: 'flex', gap: 6 }}>
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
            transition: 'color 0.2s, transform 0.2s',
            transform: (interactive && i <= hoverRating) ? 'scale(1.1)' : 'scale(1)'
          }}
        >
          ★
        </span>
      ))}
    </div>
  );
};

export default function SellItemPage() {
  const navigate = useNavigate();
  const { currentUser, listProduct, showToast } = useApp();
  
  const [step, setStep] = useState(1); // 1: Form, 2: Review, 3: Success
  const [submitting, setSubmitting] = useState(false);
  const [createdProduct, setCreatedProduct] = useState(null);
  
  // Form state
  const [form, setForm] = useState({
    name: '',
    price: '',
    category: 'Electronics',
    condition: 'New',
    description: '',
    previousReviews: '',
    initialRating: 5
  });
  
  const [errors, setErrors] = useState({});

  const categories = ['Electronics', 'Audio', 'Gaming', 'Wearables', 'Accessories', 'General'];
  const conditions = ['New', 'Like New', 'Good', 'Fair', 'Used'];

  const validateForm = () => {
    const newErrors = {};
    
    if (!form.name.trim()) {
      newErrors.name = 'Product name is required';
    } else if (form.name.trim().length < 3) {
      newErrors.name = 'Product name must be at least 3 characters';
    }
    
    if (!form.price) {
      newErrors.price = 'Price is required';
    } else if (parseInt(form.price) <= 0) {
      newErrors.price = 'Price must be greater than 0';
    }
    
    if (!form.description.trim()) {
      newErrors.description = 'Product description is required';
    } else if (form.description.trim().length < 20) {
      newErrors.description = 'Description must be at least 20 characters';
    }
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleNext = () => {
    if (validateForm()) {
      setStep(2);
    }
  };

  const handleSubmit = async () => {
    setSubmitting(true);
    
    try {
      const result = await listProduct({
        name: form.name.trim(),
        price: parseInt(form.price),
        category: form.category,
        condition: form.condition,
        description: form.description.trim(),
        previousReviews: form.previousReviews.trim(),
        initialRating: form.initialRating
      });
      
      setCreatedProduct(result);
      setStep(3);
    } catch (err) {
      showToast('Failed to create product. Please try again.', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  const inputStyle = {
    width: '100%',
    padding: '14px 16px',
    background: '#020818',
    border: '1px solid #1e293b',
    borderRadius: 10,
    fontSize: 14,
    color: '#e2e8f0',
    outline: 'none',
    transition: 'border-color 0.2s'
  };

  const labelStyle = {
    display: 'block',
    fontSize: 13,
    fontWeight: 600,
    color: '#94a3b8',
    marginBottom: 8
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
          maxWidth: 900,
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
            <span style={{ color: '#64748b', fontSize: 14 }}>Sell an Item</span>
          </div>
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
            ← Back
          </button>
        </div>
      </header>

      <main style={{ maxWidth: 700, margin: '0 auto', padding: '40px 24px' }}>
        {/* Progress Steps */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 16, marginBottom: 40 }}>
          {[
            { num: 1, label: 'Product Details' },
            { num: 2, label: 'Review & Confirm' },
            { num: 3, label: 'Success' }
          ].map((s, idx) => (
            <div key={s.num} style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
              <div style={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                gap: 8
              }}>
                <div style={{
                  width: 40,
                  height: 40,
                  borderRadius: '50%',
                  background: step >= s.num ? '#6366f1' : '#1e293b',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontWeight: 700,
                  fontSize: 16,
                  color: step >= s.num ? '#fff' : '#64748b',
                  transition: 'all 0.3s'
                }}>
                  {step > s.num ? '✓' : s.num}
                </div>
                <span style={{ 
                  fontSize: 11, 
                  color: step >= s.num ? '#e2e8f0' : '#64748b',
                  fontWeight: step === s.num ? 600 : 400
                }}>
                  {s.label}
                </span>
              </div>
              {idx < 2 && (
                <div style={{
                  width: 60,
                  height: 2,
                  background: step > s.num ? '#6366f1' : '#1e293b',
                  marginTop: -24,
                  transition: 'background 0.3s'
                }} />
              )}
            </div>
          ))}
        </div>

        {/* Step 1: Product Details Form */}
        {step === 1 && (
          <Card>
            <h2 style={{ fontSize: 20, fontWeight: 700, marginBottom: 8 }}>📦 Product Details</h2>
            <p style={{ color: '#64748b', fontSize: 14, marginBottom: 24 }}>
              Enter the details of the item you want to sell
            </p>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
              {/* Product Name */}
              <div>
                <label style={labelStyle}>Product Name *</label>
                <input
                  type="text"
                  value={form.name}
                  onChange={e => setForm({ ...form, name: e.target.value })}
                  placeholder="e.g., Sony WH-1000XM4 Headphones"
                  style={{
                    ...inputStyle,
                    borderColor: errors.name ? '#f43f5e' : '#1e293b'
                  }}
                />
                {errors.name && <span style={{ fontSize: 12, color: '#f43f5e', marginTop: 4, display: 'block' }}>{errors.name}</span>}
              </div>

              {/* Price and Category Row */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
                <div>
                  <label style={labelStyle}>Price (₹) *</label>
                  <input
                    type="number"
                    value={form.price}
                    onChange={e => setForm({ ...form, price: e.target.value })}
                    placeholder="e.g., 24990"
                    style={{
                      ...inputStyle,
                      borderColor: errors.price ? '#f43f5e' : '#1e293b'
                    }}
                  />
                  {errors.price && <span style={{ fontSize: 12, color: '#f43f5e', marginTop: 4, display: 'block' }}>{errors.price}</span>}
                </div>
                <div>
                  <label style={labelStyle}>Category</label>
                  <select
                    value={form.category}
                    onChange={e => setForm({ ...form, category: e.target.value })}
                    style={inputStyle}
                  >
                    {categories.map(c => <option key={c} value={c}>{c}</option>)}
                  </select>
                </div>
              </div>

              {/* Condition */}
              <div>
                <label style={labelStyle}>Condition</label>
                <div style={{ display: 'flex', gap: 10 }}>
                  {conditions.map(c => (
                    <button
                      key={c}
                      onClick={() => setForm({ ...form, condition: c })}
                      style={{
                        padding: '10px 16px',
                        background: form.condition === c ? '#6366f1' : '#020818',
                        border: `1px solid ${form.condition === c ? '#6366f1' : '#1e293b'}`,
                        borderRadius: 8,
                        fontSize: 13,
                        color: form.condition === c ? '#fff' : '#94a3b8',
                        fontWeight: form.condition === c ? 600 : 400,
                        cursor: 'pointer',
                        transition: 'all 0.2s'
                      }}
                    >
                      {c}
                    </button>
                  ))}
                </div>
              </div>

              {/* Description */}
              <div>
                <label style={labelStyle}>Product Description *</label>
                <textarea
                  value={form.description}
                  onChange={e => setForm({ ...form, description: e.target.value })}
                  placeholder="Describe your product in detail. Include features, specifications, and any important information buyers should know..."
                  rows={4}
                  style={{
                    ...inputStyle,
                    resize: 'vertical',
                    minHeight: 100,
                    borderColor: errors.description ? '#f43f5e' : '#1e293b'
                  }}
                />
                {errors.description && <span style={{ fontSize: 12, color: '#f43f5e', marginTop: 4, display: 'block' }}>{errors.description}</span>}
                <span style={{ fontSize: 11, color: '#64748b', marginTop: 4, display: 'block' }}>
                  {form.description.length}/500 characters
                </span>
              </div>

              {/* Previous Customer Reviews */}
              <div>
                <label style={labelStyle}>
                  Previous Customer Reviews (Optional)
                  <span style={{ fontWeight: 400, color: '#64748b', marginLeft: 8 }}>
                    Paste any existing reviews from other platforms
                  </span>
                </label>
                <textarea
                  value={form.previousReviews}
                  onChange={e => setForm({ ...form, previousReviews: e.target.value })}
                  placeholder="Paste any reviews from Amazon, eBay, or other platforms that help demonstrate the product quality..."
                  rows={3}
                  style={{
                    ...inputStyle,
                    resize: 'vertical',
                    minHeight: 80
                  }}
                />
              </div>

              {/* Initial Rating */}
              <div>
                <label style={labelStyle}>Expected Product Rating</label>
                <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
                  <StarRating 
                    rating={form.initialRating} 
                    interactive 
                    onRatingChange={r => setForm({ ...form, initialRating: r })} 
                  />
                  <span style={{ fontSize: 14, color: '#64748b' }}>
                    {form.initialRating} star{form.initialRating !== 1 ? 's' : ''}
                  </span>
                </div>
              </div>

              {/* Next Button */}
              <button
                onClick={handleNext}
                style={{
                  width: '100%',
                  padding: '16px',
                  background: 'linear-gradient(135deg, #6366f1, #818cf8)',
                  border: 'none',
                  borderRadius: 12,
                  fontSize: 15,
                  fontWeight: 700,
                  color: '#fff',
                  cursor: 'pointer',
                  marginTop: 8,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: 8
                }}
              >
                Continue to Review →
              </button>
            </div>
          </Card>
        )}

        {/* Step 2: Review & Confirm */}
        {step === 2 && (
          <Card>
            <h2 style={{ fontSize: 20, fontWeight: 700, marginBottom: 8 }}>📋 Review Your Listing</h2>
            <p style={{ color: '#64748b', fontSize: 14, marginBottom: 24 }}>
              Please review the details before submitting
            </p>

            {/* Preview Card */}
            <div style={{
              background: '#020818',
              border: '1px solid #1e293b',
              borderRadius: 12,
              padding: 20,
              marginBottom: 24
            }}>
              <div style={{ display: 'flex', gap: 20 }}>
                <div style={{
                  width: 100,
                  height: 100,
                  background: 'linear-gradient(135deg, #1e293b, #0f172a)',
                  borderRadius: 12,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: 40,
                  flexShrink: 0
                }}>
                  {form.category === 'Audio' ? '🎧' : 
                   form.category === 'Electronics' ? '💻' : 
                   form.category === 'Gaming' ? '🎮' :
                   form.category === 'Wearables' ? '⌚' : '📦'}
                </div>
                <div style={{ flex: 1 }}>
                  <h3 style={{ fontSize: 18, fontWeight: 700, marginBottom: 8 }}>{form.name}</h3>
                  <div style={{ display: 'flex', gap: 12, marginBottom: 8 }}>
                    <span style={{
                      padding: '4px 10px',
                      background: '#1e293b',
                      borderRadius: 6,
                      fontSize: 11,
                      color: '#94a3b8'
                    }}>{form.category}</span>
                    <span style={{
                      padding: '4px 10px',
                      background: '#10b98115',
                      borderRadius: 6,
                      fontSize: 11,
                      color: '#10b981'
                    }}>{form.condition}</span>
                  </div>
                  <div style={{ fontSize: 24, fontWeight: 800, color: '#10b981' }}>
                    ₹{parseInt(form.price).toLocaleString()}
                  </div>
                </div>
              </div>
            </div>

            {/* Details Summary */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 16, marginBottom: 24 }}>
              <div>
                <span style={{ fontSize: 12, color: '#64748b' }}>Description</span>
                <p style={{ fontSize: 14, color: '#e2e8f0', marginTop: 4, lineHeight: 1.6 }}>{form.description}</p>
              </div>
              
              {form.previousReviews && (
                <div>
                  <span style={{ fontSize: 12, color: '#64748b' }}>Previous Customer Reviews</span>
                  <p style={{ fontSize: 14, color: '#94a3b8', marginTop: 4, lineHeight: 1.6, fontStyle: 'italic' }}>
                    "{form.previousReviews}"
                  </p>
                </div>
              )}

              <div>
                <span style={{ fontSize: 12, color: '#64748b' }}>Expected Rating</span>
                <div style={{ marginTop: 4 }}>
                  <StarRating rating={form.initialRating} size={18} />
                </div>
              </div>
            </div>

            {/* Seller Info */}
            <div style={{
              background: '#020818',
              border: '1px solid #1e293b',
              borderRadius: 12,
              padding: 16,
              marginBottom: 24,
              display: 'flex',
              alignItems: 'center',
              gap: 12
            }}>
              <div style={{
                width: 40,
                height: 40,
                borderRadius: '50%',
                background: 'linear-gradient(135deg, #6366f1, #818cf8)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontWeight: 700
              }}>
                {currentUser?.name?.[0]?.toUpperCase() || 'G'}
              </div>
              <div>
                <div style={{ fontSize: 14, fontWeight: 600 }}>Seller: {currentUser?.name || 'Guest'}</div>
                <div style={{ fontSize: 12, color: '#64748b' }}>{currentUser?.email || 'guest@synthetix.com'}</div>
              </div>
            </div>

            {/* Action Buttons */}
            <div style={{ display: 'flex', gap: 12 }}>
              <button
                onClick={() => setStep(1)}
                style={{
                  flex: 1,
                  padding: '16px',
                  background: 'transparent',
                  border: '1px solid #1e293b',
                  borderRadius: 12,
                  fontSize: 15,
                  fontWeight: 600,
                  color: '#64748b',
                  cursor: 'pointer'
                }}
              >
                ← Edit Details
              </button>
              <button
                onClick={handleSubmit}
                disabled={submitting}
                style={{
                  flex: 2,
                  padding: '16px',
                  background: submitting ? '#4338ca' : 'linear-gradient(135deg, #10b981, #059669)',
                  border: 'none',
                  borderRadius: 12,
                  fontSize: 15,
                  fontWeight: 700,
                  color: '#fff',
                  cursor: submitting ? 'wait' : 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: 8
                }}
              >
                {submitting ? (
                  <>⏳ Creating Listing...</>
                ) : (
                  <>✓ Confirm & List Item</>
                )}
              </button>
            </div>
          </Card>
        )}

        {/* Step 3: Success */}
        {step === 3 && createdProduct && (
          <Card style={{ textAlign: 'center' }}>
            <div style={{ fontSize: 64, marginBottom: 16 }}>🎉</div>
            <h2 style={{ fontSize: 24, fontWeight: 700, marginBottom: 8 }}>Item Listed Successfully!</h2>
            <p style={{ color: '#64748b', fontSize: 14, marginBottom: 24 }}>
              Your item is now live on the marketplace
            </p>

            {/* Product ID Badge */}
            <div style={{
              background: '#020818',
              border: '1px solid #1e293b',
              borderRadius: 12,
              padding: 20,
              marginBottom: 24,
              display: 'inline-block'
            }}>
              <div style={{ fontSize: 12, color: '#64748b', marginBottom: 8 }}>Product ID</div>
              <code style={{
                fontSize: 18,
                fontWeight: 700,
                color: '#818cf8',
                fontFamily: 'monospace'
              }}>
                {createdProduct.id}
              </code>
            </div>

            <div style={{
              background: '#10b98115',
              border: '1px solid #10b98130',
              borderRadius: 12,
              padding: 16,
              marginBottom: 24
            }}>
              <p style={{ fontSize: 13, color: '#10b981', margin: 0 }}>
                ✓ Product saved to CSV database<br/>
                ✓ Ready for insights analysis<br/>
                ✓ Available in marketplace
              </p>
            </div>

            {/* Action Buttons */}
            <div style={{ display: 'flex', gap: 12, justifyContent: 'center' }}>
              <button
                onClick={() => navigate(`/product/${createdProduct.id}`)}
                style={{
                  padding: '14px 24px',
                  background: 'linear-gradient(135deg, #6366f1, #818cf8)',
                  border: 'none',
                  borderRadius: 10,
                  fontSize: 14,
                  fontWeight: 600,
                  color: '#fff',
                  cursor: 'pointer'
                }}
              >
                View Product Page
              </button>
              <button
                onClick={() => navigate(`/insights/${createdProduct.id}`)}
                style={{
                  padding: '14px 24px',
                  background: '#1e1b4b',
                  border: '1px solid #4338ca',
                  borderRadius: 10,
                  fontSize: 14,
                  fontWeight: 600,
                  color: '#818cf8',
                  cursor: 'pointer'
                }}
              >
                📊 View Insights
              </button>
              <button
                onClick={() => navigate('/history')}
                style={{
                  padding: '14px 24px',
                  background: 'transparent',
                  border: '1px solid #1e293b',
                  borderRadius: 10,
                  fontSize: 14,
                  fontWeight: 600,
                  color: '#64748b',
                  cursor: 'pointer'
                }}
              >
                View History
              </button>
            </div>
          </Card>
        )}
      </main>
    </div>
  );
}

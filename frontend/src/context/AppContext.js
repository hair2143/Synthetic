import { createContext, useContext, useState, useEffect } from 'react';

const AppContext = createContext();

// Sample products data (using real product IDs from first 10k rows of CSV)
const SAMPLE_PRODUCTS = [
  { id: '0972683275', name: 'VideoSecu TV Wall Mount', price: 2999, category: 'Electronics', condition: 'New', seller: 'MountPro Store', sellerId: 'seller1', image: null, avgRating: 4.5, reviewCount: 219, verifiedPct: 0.82, sentiment: 'loved', description: 'Heavy-duty TV wall mount with tilt and swivel features.', listedAt: '2025-12-01' },
  { id: '1400532655', name: 'Audio Bible Collection', price: 4999, category: 'Media', condition: 'New', seller: 'FaithMedia', sellerId: 'seller2', image: null, avgRating: 4.7, reviewCount: 109, verifiedPct: 0.91, sentiment: 'loved', description: 'Complete audio collection for spiritual listening.', listedAt: '2025-11-15' },
  { id: '9983891212', name: 'Educational Book Set', price: 3499, category: 'Books', condition: 'New', seller: 'BookWorld', sellerId: 'seller3', image: null, avgRating: 4.6, reviewCount: 82, verifiedPct: 0.76, sentiment: 'loved', description: 'Comprehensive educational book set for learning.', listedAt: '2025-10-20' },
  { id: '140053271X', name: 'Inspirational Audio Guide', price: 2499, category: 'Media', condition: 'New', seller: 'AudioBooks Inc', sellerId: 'seller4', image: null, avgRating: 4.2, reviewCount: 71, verifiedPct: 0.68, sentiment: 'loved', description: 'Motivational audio guide for personal growth.', listedAt: '2026-01-05' },
  { id: '1400501466', name: 'Faith Journey Collection', price: 3999, category: 'Media', condition: 'Like New', seller: 'SpiritualMedia', sellerId: 'seller5', image: null, avgRating: 4.4, reviewCount: 43, verifiedPct: 0.85, sentiment: 'loved', description: 'Complete faith journey audio collection.', listedAt: '2026-01-10' },
  { id: '1400599997', name: 'Premium Audio Series', price: 5999, category: 'Media', condition: 'New', seller: 'ProAudio', sellerId: 'seller6', image: null, avgRating: 4.3, reviewCount: 41, verifiedPct: 0.88, sentiment: 'loved', description: 'High-quality audio series for enthusiasts.', listedAt: '2026-02-01' },
  { id: '1400532620', name: 'Classic Literature Audio', price: 2999, category: 'Media', condition: 'New', seller: 'ClassicsHub', sellerId: 'seller7', image: null, avgRating: 4.1, reviewCount: 41, verifiedPct: 0.72, sentiment: 'loved', description: 'Classic literature in audio format.', listedAt: '2026-02-15' },
  { id: '9625993428', name: 'Language Learning Kit', price: 1999, category: 'Education', condition: 'New', seller: 'LearnPro', sellerId: 'seller8', image: null, avgRating: 4.0, reviewCount: 35, verifiedPct: 0.65, sentiment: 'mixed', description: 'Complete language learning audio kit.', listedAt: '2026-02-20' },
  { id: '9573212919', name: 'Meditation Audio Guide', price: 1499, category: 'Health', condition: 'New', seller: 'ZenAudio', sellerId: 'seller9', image: null, avgRating: 3.9, reviewCount: 34, verifiedPct: 0.58, sentiment: 'mixed', description: 'Guided meditation audio for relaxation.', listedAt: '2026-03-01' },
  { id: '1400698987', name: 'Storytelling Collection', price: 2499, category: 'Media', condition: 'New', seller: 'StoryTime', sellerId: 'seller10', image: null, avgRating: 3.7, reviewCount: 28, verifiedPct: 0.45, sentiment: 'mixed', description: 'Collection of engaging storytelling audio.', listedAt: '2026-03-05' },
  { id: '9575871979', name: 'Cultural Audio Series', price: 1999, category: 'Media', condition: 'New', seller: 'CultureWorks', sellerId: 'seller11', image: null, avgRating: 4.8, reviewCount: 25, verifiedPct: 0.92, sentiment: 'loved', description: 'Audio series exploring world cultures.', listedAt: '2025-09-15' },
  { id: '1400501776', name: 'Wisdom Audio Library', price: 3499, category: 'Media', condition: 'New', seller: 'WisdomBooks', sellerId: 'seller12', image: null, avgRating: 4.5, reviewCount: 20, verifiedPct: 0.78, sentiment: 'loved', description: 'Audio library of wisdom and knowledge.', listedAt: '2025-08-20' },
  { id: '1400501520', name: 'Life Lessons Audio', price: 2999, category: 'Media', condition: 'New', seller: 'LifeAudio', sellerId: 'seller13', image: null, avgRating: 4.4, reviewCount: 20, verifiedPct: 0.86, sentiment: 'loved', description: 'Audio guide for life lessons and growth.', listedAt: '2026-01-25' },
  { id: '3744295508', name: 'European Audio Tales', price: 1499, category: 'Media', condition: 'Like New', seller: 'EuroMedia', sellerId: 'seller14', image: null, avgRating: 4.3, reviewCount: 19, verifiedPct: 0.71, sentiment: 'loved', description: 'Collection of European audio tales.', listedAt: '2026-02-10' },
  { id: '9888002198', name: 'Asian Literature Audio', price: 1799, category: 'Media', condition: 'New', seller: 'AsiaBooks', sellerId: 'seller15', image: null, avgRating: 4.6, reviewCount: 18, verifiedPct: 0.89, sentiment: 'loved', description: 'Asian literature in audio format.', listedAt: '2025-12-15' },
  { id: '9983891204', name: 'Knowledge Series Audio', price: 2199, category: 'Education', condition: 'New', seller: 'KnowledgeHub', sellerId: 'seller16', image: null, avgRating: 4.7, reviewCount: 17, verifiedPct: 0.93, sentiment: 'loved', description: 'Educational audio series for learning.', listedAt: '2026-01-30' },
  { id: '9966694544', name: 'Adventure Audio Stories', price: 1299, category: 'Media', condition: 'New', seller: 'AdventureAudio', sellerId: 'seller17', image: null, avgRating: 3.2, reviewCount: 13, verifiedPct: 0.32, sentiment: 'mixed', description: 'Exciting adventure stories in audio format.', listedAt: '2026-02-28' },
  { id: '7214047977', name: 'Travel Audio Guide', price: 999, category: 'Travel', condition: 'New', seller: 'TravelPro', sellerId: 'seller18', image: null, avgRating: 3.8, reviewCount: 13, verifiedPct: 0.25, sentiment: 'mixed', description: 'Audio travel guides for explorers.', listedAt: '2026-03-02' },
];

// Generate price history (simulated)
const generatePriceHistory = (currentPrice) => {
  const history = [];
  let price = currentPrice * 1.15; // Start higher
  for (let i = 30; i >= 0; i--) {
    const date = new Date();
    date.setDate(date.getDate() - i);
    price = price * (0.97 + Math.random() * 0.06); // Random fluctuation
    if (i === 0) price = currentPrice;
    history.push({ date: date.toISOString().split('T')[0], price: Math.round(price) });
  }
  return history;
};

// Simulated recent reviews for ticker (using real product IDs from CSV)
const RECENT_REVIEWS = [
  { productId: '0972683275', text: 'Great TV mount, easy to install!', rating: 5, time: '2 mins ago' },
  { productId: '1400532655', text: 'Wonderful audio collection', rating: 5, time: '5 mins ago' },
  { productId: '9983891212', text: 'Perfect for learning', rating: 4, time: '8 mins ago' },
  { productId: '140053271X', text: 'Very inspirational content', rating: 5, time: '12 mins ago' },
  { productId: '1400501466', text: 'Excellent quality audio', rating: 5, time: '15 mins ago' },
  { productId: '1400599997', text: 'Good premium audio series', rating: 3, time: '20 mins ago' },
  { productId: '9575871979', text: 'Quality cultural content', rating: 5, time: '25 mins ago' },
  { productId: '9966694544', text: 'Not what I expected', rating: 2, time: '30 mins ago' },
];

export function AppProvider({ children }) {
  // User state
  const [currentUser, setCurrentUser] = useState(() => {
    const saved = localStorage.getItem('synthetixUser');
    return saved ? JSON.parse(saved) : null;
  });

  // Cart state
  const [cart, setCart] = useState(() => {
    const saved = localStorage.getItem('synthetixCart');
    return saved ? JSON.parse(saved) : [];
  });

  // Products state (marketplace listings) - loaded from API (CSV)
  const [products, setProducts] = useState(SAMPLE_PRODUCTS);
  const [productsLoading, setProductsLoading] = useState(true);

  // Fetch products from API on mount
  useEffect(() => {
    const fetchProducts = async () => {
      try {
        const response = await fetch('http://127.0.0.1:8000/api/v1/products');
        if (response.ok) {
          const data = await response.json();
          // Merge API data with local product details
          const apiProducts = data.products.map((p, idx) => ({
            id: p.id,
            name: SAMPLE_PRODUCTS[idx]?.name || `Product ${p.id}`,
            price: SAMPLE_PRODUCTS[idx]?.price || Math.floor(Math.random() * 20000) + 1000,
            category: SAMPLE_PRODUCTS[idx]?.category || 'General',
            condition: SAMPLE_PRODUCTS[idx]?.condition || 'New',
            seller: SAMPLE_PRODUCTS[idx]?.seller || 'Marketplace',
            sellerId: SAMPLE_PRODUCTS[idx]?.sellerId || 'market',
            image: null,
            avgRating: p.avgRating,
            reviewCount: p.reviewCount,
            verifiedPct: p.verifiedPct,
            sentiment: p.sentiment,
            description: SAMPLE_PRODUCTS[idx]?.description || 'Product from CSV database',
            listedAt: SAMPLE_PRODUCTS[idx]?.listedAt || new Date().toISOString().split('T')[0]
          }));
          setProducts(apiProducts.length > 0 ? apiProducts : SAMPLE_PRODUCTS);
        }
      } catch (e) {
        console.log('API not available, using local products');
        setProducts(SAMPLE_PRODUCTS);
      } finally {
        setProductsLoading(false);
      }
    };
    fetchProducts();
  }, []);

  // User's listed products
  const [listedProducts, setListedProducts] = useState(() => {
    const saved = localStorage.getItem('synthetixListed');
    return saved ? JSON.parse(saved) : [];
  });

  // User's purchased products
  const [purchasedProducts, setPurchasedProducts] = useState(() => {
    const saved = localStorage.getItem('synthetixPurchased');
    return saved ? JSON.parse(saved) : [];
  });

  // Reviews submitted by user
  const [userReviews, setUserReviews] = useState(() => {
    const saved = localStorage.getItem('synthetixReviews');
    return saved ? JSON.parse(saved) : [];
  });

  // Compare products
  const [compareList, setCompareList] = useState([]);

  // Toast notifications
  const [toast, setToast] = useState(null);

  // Persist to localStorage
  useEffect(() => {
    if (currentUser) {
      localStorage.setItem('synthetixUser', JSON.stringify(currentUser));
    } else {
      localStorage.removeItem('synthetixUser');
    }
  }, [currentUser]);

  useEffect(() => {
    localStorage.setItem('synthetixCart', JSON.stringify(cart));
  }, [cart]);

  // Products always use SAMPLE_PRODUCTS (real CSV IDs) - no localStorage persistence

  useEffect(() => {
    localStorage.setItem('synthetixListed', JSON.stringify(listedProducts));
  }, [listedProducts]);

  useEffect(() => {
    localStorage.setItem('synthetixPurchased', JSON.stringify(purchasedProducts));
  }, [purchasedProducts]);

  useEffect(() => {
    localStorage.setItem('synthetixReviews', JSON.stringify(userReviews));
  }, [userReviews]);

  // Auth functions
  const login = (email, password, remember) => {
    // Admin login
    if (email === 'admin@synthetix.com' && password === 'admin123') {
      const adminUser = { name: 'Admin', email, role: 'admin' };
      setCurrentUser(adminUser);
      return { success: true, isAdmin: true };
    }
    // Regular user login (simulated)
    const user = { name: email.split('@')[0], email, role: 'user' };
    setCurrentUser(user);
    return { success: true, isAdmin: false };
  };

  const register = (name, email, password) => {
    const user = { name, email, role: 'user' };
    setCurrentUser(user);
    return { success: true };
  };

  const logout = () => {
    setCurrentUser(null);
    localStorage.removeItem('synthetixUser');
  };

  const continueAsGuest = () => {
    const guest = { name: 'Guest', email: 'guest@synthetix.com', role: 'guest' };
    setCurrentUser(guest);
  };

  // Cart functions
  const addToCart = (product) => {
    setCart(prev => {
      const existing = prev.find(p => p.id === product.id);
      if (existing) {
        return prev.map(p => p.id === product.id ? { ...p, quantity: p.quantity + 1 } : p);
      }
      return [...prev, { ...product, quantity: 1 }];
    });
    showToast('Added to cart!', 'success');
  };

  const removeFromCart = (productId) => {
    setCart(prev => prev.filter(p => p.id !== productId));
  };

  const updateCartQuantity = (productId, quantity) => {
    if (quantity <= 0) {
      removeFromCart(productId);
      return;
    }
    setCart(prev => prev.map(p => p.id === productId ? { ...p, quantity } : p));
  };

  const clearCart = () => setCart([]);

  const cartTotal = cart.reduce((sum, item) => sum + item.price * item.quantity, 0);

  // Purchase function
  const purchaseProduct = (product) => {
    const purchase = {
      ...product,
      purchasedAt: new Date().toISOString(),
      reviewed: false
    };
    setPurchasedProducts(prev => [...prev, purchase]);
    // Remove from cart if present
    removeFromCart(product.id);
    showToast('🎉 Purchase successful!', 'success');
    return purchase;
  };

  // Checkout function
  const checkout = () => {
    const purchases = cart.map(item => ({
      ...item,
      purchasedAt: new Date().toISOString(),
      reviewed: false
    }));
    setPurchasedProducts(prev => [...prev, ...purchases]);
    clearCart();
    showToast('🎉 Order placed successfully!', 'success');
    return purchases;
  };

  // List product function - saves to CSV via API
  const listProduct = async (productData) => {
    try {
      // Call API to create product in CSV
      const response = await fetch('http://127.0.0.1:8000/api/v1/products/add', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: productData.name,
          price: productData.price,
          category: productData.category || 'General',
          condition: productData.condition || 'New',
          description: productData.description || '',
          initial_review: `Great new listing: ${productData.name}`,
          initial_rating: 5
        })
      });

      if (response.ok) {
        const data = await response.json();
        const newProduct = {
          ...data.product,
          seller: currentUser?.name || 'Anonymous',
          sellerId: currentUser?.email || 'guest',
          listedAt: new Date().toISOString().split('T')[0],
          views: 0,
          status: 'active',
          image: productData.image || null
        };
        setProducts(prev => [newProduct, ...prev]);
        setListedProducts(prev => [...prev, newProduct]);
        showToast(`Product listed! ID: ${newProduct.id}`, 'success');
        return newProduct;
      } else {
        throw new Error('API error');
      }
    } catch (e) {
      // Fallback to local storage if API fails
      const newProduct = {
        ...productData,
        id: `USR-${Date.now()}`,
        seller: currentUser?.name || 'Anonymous',
        sellerId: currentUser?.email || 'guest',
        listedAt: new Date().toISOString().split('T')[0],
        avgRating: 0,
        reviewCount: 0,
        verifiedPct: 0,
        sentiment: 'mixed',
        views: 0,
        status: 'active'
      };
      setProducts(prev => [newProduct, ...prev]);
      setListedProducts(prev => [...prev, newProduct]);
      showToast('Product listed locally (API unavailable)', 'warning');
      return newProduct;
    }
  };

  // Submit review function
  const submitReview = async (productId, reviewData) => {
    // Handle both object and separate arguments
    const reviewText = typeof reviewData === 'object' ? reviewData.text : reviewData;
    const rating = typeof reviewData === 'object' ? reviewData.rating : arguments[2];
    
    const review = {
      productId,
      reviewText,
      rating,
      reviewerId: currentUser?.email || 'guest',
      reviewerName: currentUser?.name || 'Guest',
      verifiedPurchase: purchasedProducts.some(p => p.id === productId),
      submittedAt: new Date().toISOString(),
      date: new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })
    };
    
    setUserReviews(prev => [...prev, review]);
    
    // Mark product as reviewed
    setPurchasedProducts(prev => 
      prev.map(p => p.id === productId ? { ...p, reviewed: true, myRating: rating } : p)
    );
    
    // Try to submit to backend
    try {
      await fetch('http://127.0.0.1:8000/api/v1/reviews/add', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          product_id: productId,
          review_text: reviewText,
          rating,
          verified_purchase: review.verifiedPurchase,
          reviewer_id: review.reviewerId
        })
      });
    } catch (e) {
      console.log('Backend not available, review saved locally');
    }
    
    showToast('Review submitted! It will appear in insights shortly.', 'success');
    return review;
  };

  // Compare functions
  const addToCompare = (product) => {
    if (compareList.length >= 3) {
      showToast('Maximum 3 products can be compared', 'warning');
      return;
    }
    if (compareList.find(p => p.id === product.id)) {
      showToast('Product already in compare list', 'warning');
      return;
    }
    setCompareList(prev => [...prev, product]);
    showToast('Added to compare', 'success');
  };

  const removeFromCompare = (productId) => {
    setCompareList(prev => prev.filter(p => p.id !== productId));
  };

  const clearCompare = () => setCompareList([]);

  // Toast function
  const showToast = (message, type = 'info') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3000);
  };

  // Get product by ID
  const getProduct = (productId) => {
    return products.find(p => p.id === productId);
  };

  // Search products
  const searchProducts = (query) => {
    const q = query.toLowerCase();
    return products.filter(p => 
      p.name.toLowerCase().includes(q) || 
      p.id.toLowerCase().includes(q) ||
      p.category.toLowerCase().includes(q)
    );
  };

  // Get featured products (most reviewed)
  const getFeaturedProducts = () => {
    return [...products]
      .sort((a, b) => b.reviewCount - a.reviewCount)
      .slice(0, 3);
  };

  // Get trending products (simulated - high review count + recent)
  const getTrendingProducts = () => {
    return [...products]
      .filter(p => new Date(p.listedAt) > new Date(Date.now() - 60 * 24 * 60 * 60 * 1000))
      .sort((a, b) => b.reviewCount - a.reviewCount)
      .slice(0, 5);
  };

  // Get price history for a product
  const getPriceHistory = (productId) => {
    const product = getProduct(productId);
    if (!product) return [];
    return generatePriceHistory(product.price);
  };

  // Recent reviews for ticker
  const getRecentReviews = () => RECENT_REVIEWS;
  
  // Get user's review for a specific product
  const getUserReview = (productId) => {
    return userReviews.find(r => r.productId === productId) || null;
  };

  const isAuthenticated = currentUser !== null;

  const value = {
    // User
    currentUser,
    isAuthenticated,
    login,
    register,
    logout,
    continueAsGuest,
    
    // Cart
    cart,
    addToCart,
    removeFromCart,
    updateCartQuantity,
    clearCart,
    cartTotal,
    
    // Products
    products,
    productsLoading,
    getProduct,
    searchProducts,
    getFeaturedProducts,
    getTrendingProducts,
    getPriceHistory,
    listProduct,
    
    // Purchases
    purchasedProducts,
    purchaseProduct,
    checkout,
    
    // Listed
    listedProducts,
    
    // Reviews
    userReviews,
    submitReview,
    getRecentReviews,
    getUserReview,
    
    // Compare
    compareList,
    addToCompare,
    removeFromCompare,
    clearCompare,
    
    // Toast
    toast,
    showToast
  };

  return (
    <AppContext.Provider value={value}>
      {children}
      {/* Toast notification */}
      {toast && (
        <div style={{
          position: 'fixed',
          bottom: 24,
          right: 24,
          padding: '14px 24px',
          borderRadius: 12,
          background: toast.type === 'success' ? '#10b981' : toast.type === 'warning' ? '#f59e0b' : toast.type === 'error' ? '#f43f5e' : '#6366f1',
          color: '#fff',
          fontWeight: 600,
          fontSize: 14,
          boxShadow: '0 4px 20px rgba(0,0,0,0.3)',
          zIndex: 9999,
          animation: 'slideIn 0.3s ease'
        }}>
          {toast.message}
        </div>
      )}
      <style>{`
        @keyframes slideIn {
          from { transform: translateX(100px); opacity: 0; }
          to { transform: translateX(0); opacity: 1; }
        }
      `}</style>
    </AppContext.Provider>
  );
}

export const useApp = () => {
  const context = useContext(AppContext);
  if (!context) {
    throw new Error('useApp must be used within AppProvider');
  }
  return context;
};

export default AppContext;

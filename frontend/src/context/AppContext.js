import { createContext, useContext, useState, useEffect } from 'react';

const AppContext = createContext();

// Sample products data (using real product IDs from CSV)
const SAMPLE_PRODUCTS = [
  { id: 'B003ES5ZUU', name: 'Rand McNally TND 700 GPS', price: 8999, category: 'Electronics', condition: 'New', seller: 'AudioPro Store', sellerId: 'seller1', image: null, avgRating: 4.5, reviewCount: 4143, verifiedPct: 0.82, sentiment: 'loved', description: 'Professional truck GPS with 7-inch screen. Industry standard for truckers.', listedAt: '2025-12-01' },
  { id: 'B0019EHU8G', name: 'Professional Audio Monitor', price: 24999, category: 'Audio', condition: 'New', seller: 'TechGadgets', sellerId: 'seller2', image: null, avgRating: 4.7, reviewCount: 3435, verifiedPct: 0.91, sentiment: 'loved', description: 'High-end audio monitoring system with premium sound quality.', listedAt: '2025-11-15' },
  { id: 'B002WE6D44', name: 'Audio-Technica Pro Headphones', price: 12499, category: 'Audio', condition: 'New', seller: 'SoundMasters', sellerId: 'seller3', image: null, avgRating: 4.6, reviewCount: 2813, verifiedPct: 0.76, sentiment: 'loved', description: 'Critically acclaimed professional monitor headphones with exceptional clarity.', listedAt: '2025-10-20' },
  { id: 'B003ELYQGG', name: 'Wireless Speaker System', price: 7499, category: 'Audio', condition: 'New', seller: 'MusicHub', sellerId: 'seller4', image: null, avgRating: 4.2, reviewCount: 2652, verifiedPct: 0.68, sentiment: 'loved', description: 'High-quality wireless speaker with deep bass and clear highs.', listedAt: '2026-01-05' },
  { id: 'B0002L5R78', name: 'Shure SE215 Earphones', price: 11999, category: 'Audio', condition: 'Like New', seller: 'GadgetWorld', sellerId: 'seller5', image: null, avgRating: 4.4, reviewCount: 2599, verifiedPct: 0.85, sentiment: 'loved', description: 'Sound isolating earphones with dynamic micro-driver for detailed audio.', listedAt: '2026-01-10' },
  { id: 'B002V88HFE', name: 'Premium USB Audio Interface', price: 21999, category: 'Electronics', condition: 'New', seller: 'ProAudio', sellerId: 'seller6', image: null, avgRating: 4.3, reviewCount: 2082, verifiedPct: 0.88, sentiment: 'loved', description: 'Professional audio interface for music production and streaming.', listedAt: '2026-02-01' },
  { id: 'B000LRMS66', name: 'Studio Reference Monitors', price: 13999, category: 'Audio', condition: 'New', seller: 'SoundLab', sellerId: 'seller7', image: null, avgRating: 4.1, reviewCount: 1960, verifiedPct: 0.72, sentiment: 'loved', description: 'Active studio monitors for professional mixing and mastering.', listedAt: '2026-02-15' },
  { id: 'B000QUUFRW', name: 'Condenser Microphone Kit', price: 5999, category: 'Audio', condition: 'New', seller: 'VocalPro', sellerId: 'seller8', image: null, avgRating: 4.0, reviewCount: 1890, verifiedPct: 0.65, sentiment: 'mixed', description: 'Large diaphragm condenser microphone for vocals and instruments.', listedAt: '2026-02-20' },
  { id: 'B0041Q38NU', name: 'Portable DAC/Amp', price: 4499, category: 'Electronics', condition: 'New', seller: 'AudioGear', sellerId: 'seller9', image: null, avgRating: 3.9, reviewCount: 1812, verifiedPct: 0.58, sentiment: 'mixed', description: 'Portable digital-to-analog converter with headphone amplifier.', listedAt: '2026-03-01' },
  { id: 'B004QK7HI8', name: 'Wireless Bluetooth Adapter', price: 1799, category: 'Electronics', condition: 'New', seller: 'TechBasics', sellerId: 'seller10', image: null, avgRating: 3.7, reviewCount: 1581, verifiedPct: 0.45, sentiment: 'mixed', description: 'Bluetooth adapter for connecting wireless devices to any audio system.', listedAt: '2026-03-05' },
  { id: 'B000VX6XL6', name: 'Pro Audio Cable Kit', price: 2999, category: 'Accessories', condition: 'New', seller: 'CableWorks', sellerId: 'seller11', image: null, avgRating: 4.8, reviewCount: 1556, verifiedPct: 0.92, sentiment: 'loved', description: 'Professional-grade audio cables for studio and live use.', listedAt: '2025-09-15' },
  { id: 'B001XURP7W', name: 'DJ Mixer Controller', price: 4999, category: 'Electronics', condition: 'New', seller: 'DJSupply', sellerId: 'seller12', image: null, avgRating: 4.5, reviewCount: 1485, verifiedPct: 0.78, sentiment: 'loved', description: 'Professional DJ mixer with multi-channel control.', listedAt: '2025-08-20' },
  { id: 'B004XC6GJ0', name: 'Digital Audio Recorder', price: 9900, category: 'Electronics', condition: 'New', seller: 'RecordPro', sellerId: 'seller13', image: null, avgRating: 4.4, reviewCount: 1456, verifiedPct: 0.86, sentiment: 'loved', description: 'Portable digital recorder for field and studio recording.', listedAt: '2026-01-25' },
  { id: 'B004G6002M', name: 'Headphone Stand & Hanger', price: 1499, category: 'Accessories', condition: 'Like New', seller: 'DeskGear', sellerId: 'seller14', image: null, avgRating: 4.3, reviewCount: 1424, verifiedPct: 0.71, sentiment: 'loved', description: 'Premium headphone stand with cable management.', listedAt: '2026-02-10' },
  { id: 'B000S5Q9CA', name: 'Audio Splitter Cable', price: 599, category: 'Accessories', condition: 'New', seller: 'BasicAudio', sellerId: 'seller15', image: null, avgRating: 4.6, reviewCount: 1393, verifiedPct: 0.89, sentiment: 'loved', description: 'High-quality audio splitter for sharing music.', listedAt: '2025-12-15' },
  { id: 'B000BQ7GW8', name: 'XLR Microphone Cable', price: 899, category: 'Accessories', condition: 'New', seller: 'StageGear', sellerId: 'seller16', image: null, avgRating: 4.7, reviewCount: 1388, verifiedPct: 0.93, sentiment: 'loved', description: 'Professional XLR cable for microphones and audio equipment.', listedAt: '2026-01-30' },
  { id: 'B002MAPRYU', name: 'Budget IEM Earbuds', price: 1299, category: 'Audio', condition: 'New', seller: 'ValueAudio', sellerId: 'seller17', image: null, avgRating: 3.2, reviewCount: 1374, verifiedPct: 0.32, sentiment: 'avoid', description: 'Budget in-ear monitors with detachable cables.', listedAt: '2026-02-28' },
  { id: 'B00316263Y', name: 'Generic Audio Adapter', price: 499, category: 'Accessories', condition: 'New', seller: 'BudgetFinds', sellerId: 'seller18', image: null, avgRating: 2.8, reviewCount: 1332, verifiedPct: 0.25, sentiment: 'avoid', description: 'Basic audio adapter for various connections.', listedAt: '2026-03-02' },
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
  { productId: 'B003ES5ZUU', text: 'Great GPS for truckers!', rating: 5, time: '2 mins ago' },
  { productId: 'B0019EHU8G', text: 'Best audio monitor ever', rating: 5, time: '5 mins ago' },
  { productId: 'B002WE6D44', text: 'Perfect for studio work', rating: 4, time: '8 mins ago' },
  { productId: 'B003ELYQGG', text: 'Amazing wireless speaker', rating: 5, time: '12 mins ago' },
  { productId: 'B0002L5R78', text: 'Sound quality is excellent', rating: 5, time: '15 mins ago' },
  { productId: 'B002V88HFE', text: 'Good audio interface', rating: 3, time: '20 mins ago' },
  { productId: 'B000VX6XL6', text: 'Quality cables, worth it', rating: 5, time: '25 mins ago' },
  { productId: 'B002MAPRYU', text: 'Not worth the price', rating: 2, time: '30 mins ago' },
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
  const submitReview = async (productId, reviewText, rating) => {
    const review = {
      productId,
      reviewText,
      rating,
      reviewerId: currentUser?.email || 'guest',
      reviewerName: currentUser?.name || 'Guest',
      verifiedPurchase: purchasedProducts.some(p => p.id === productId),
      submittedAt: new Date().toISOString()
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

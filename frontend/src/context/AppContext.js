import { createContext, useContext, useState, useEffect } from 'react';

const AppContext = createContext();

// Sample products data (simulating marketplace listings)
const SAMPLE_PRODUCTS = [
  { id: 'B003ES5ZUU', name: 'Sony MDR-7506 Professional Headphones', price: 8999, category: 'Audio', condition: 'New', seller: 'AudioPro Store', sellerId: 'seller1', image: null, avgRating: 4.5, reviewCount: 856, verifiedPct: 0.82, sentiment: 'loved', description: 'Professional large diaphragm headphones with 40mm drivers. Industry standard for music, film, and broadcast.', listedAt: '2025-12-01' },
  { id: 'B0019EHU8G', name: 'Bose QuietComfort 35 II', price: 24999, category: 'Audio', condition: 'New', seller: 'TechGadgets', sellerId: 'seller2', image: null, avgRating: 4.7, reviewCount: 1243, verifiedPct: 0.91, sentiment: 'loved', description: 'World-class noise cancellation with premium sound quality. Google Assistant built-in.', listedAt: '2025-11-15' },
  { id: 'B002WE6D44', name: 'Audio-Technica ATH-M50x', price: 12499, category: 'Audio', condition: 'New', seller: 'SoundMasters', sellerId: 'seller3', image: null, avgRating: 4.6, reviewCount: 567, verifiedPct: 0.76, sentiment: 'loved', description: 'Critically acclaimed M50x professional monitor headphones with exceptional clarity.', listedAt: '2025-10-20' },
  { id: 'B0002L5R78', name: 'Shure SE215 Sound Isolating Earphones', price: 7499, category: 'Audio', condition: 'New', seller: 'MusicHub', sellerId: 'seller4', image: null, avgRating: 4.2, reviewCount: 423, verifiedPct: 0.68, sentiment: 'loved', description: 'Sound isolating earphones with dynamic micro-driver for detailed audio.', listedAt: '2026-01-05' },
  { id: 'B00HVLUR86', name: 'JBL Charge 4 Portable Speaker', price: 11999, category: 'Audio', condition: 'Like New', seller: 'GadgetWorld', sellerId: 'seller5', image: null, avgRating: 4.4, reviewCount: 789, verifiedPct: 0.85, sentiment: 'loved', description: 'Portable Bluetooth speaker with powerful sound and 20-hour battery life.', listedAt: '2026-01-10' },
  { id: 'B07Q5NHVCQ', name: 'Apple AirPods Pro', price: 21999, category: 'Audio', condition: 'New', seller: 'AppleStore India', sellerId: 'seller6', image: null, avgRating: 4.3, reviewCount: 1567, verifiedPct: 0.88, sentiment: 'loved', description: 'Active Noise Cancellation with Transparency mode. Customizable fit.', listedAt: '2026-02-01' },
  { id: 'B07XJL2MSB', name: 'Samsung Galaxy Buds Pro', price: 13999, category: 'Audio', condition: 'New', seller: 'SamsungOfficial', sellerId: 'seller7', image: null, avgRating: 4.1, reviewCount: 345, verifiedPct: 0.72, sentiment: 'loved', description: 'Intelligent ANC with 360 Audio. IPX7 water resistance.', listedAt: '2026-02-15' },
  { id: 'B08HZWQV2S', name: 'Anker Soundcore Life Q30', price: 5999, category: 'Audio', condition: 'New', seller: 'AnkerIndia', sellerId: 'seller8', image: null, avgRating: 4.0, reviewCount: 234, verifiedPct: 0.65, sentiment: 'mixed', description: 'Hybrid active noise cancelling headphones with multiple modes.', listedAt: '2026-02-20' },
  { id: 'B09DVP5VQG', name: 'OnePlus Buds Z2', price: 4499, category: 'Audio', condition: 'New', seller: 'OnePlusStore', sellerId: 'seller9', image: null, avgRating: 3.9, reviewCount: 189, verifiedPct: 0.58, sentiment: 'mixed', description: 'True wireless with active noise cancellation and IP55 rating.', listedAt: '2026-03-01' },
  { id: 'B08K9XBWFJ', name: 'boAt Rockerz 550', price: 1799, category: 'Audio', condition: 'New', seller: 'boAtLifestyle', sellerId: 'seller10', image: null, avgRating: 3.7, reviewCount: 2345, verifiedPct: 0.45, sentiment: 'mixed', description: 'Wireless headphone with 50mm drivers and 20 hours playback.', listedAt: '2026-03-05' },
  { id: 'B07PXGQC1Q', name: 'Logitech MX Master 3', price: 8999, category: 'Electronics', condition: 'New', seller: 'TechGadgets', sellerId: 'seller2', image: null, avgRating: 4.8, reviewCount: 678, verifiedPct: 0.92, sentiment: 'loved', description: 'Advanced wireless mouse designed for creative professionals.', listedAt: '2025-09-15' },
  { id: 'B07W6JN4GG', name: 'Razer DeathAdder V2', price: 4999, category: 'Electronics', condition: 'New', seller: 'GamingZone', sellerId: 'seller11', image: null, avgRating: 4.5, reviewCount: 456, verifiedPct: 0.78, sentiment: 'loved', description: 'Ergonomic gaming mouse with 20K DPI optical sensor.', listedAt: '2025-08-20' },
  { id: 'B086JKYD19', name: 'Apple Magic Keyboard', price: 9900, category: 'Electronics', condition: 'New', seller: 'AppleStore India', sellerId: 'seller6', image: null, avgRating: 4.4, reviewCount: 234, verifiedPct: 0.86, sentiment: 'loved', description: 'Wireless keyboard with Touch ID for Mac computers.', listedAt: '2026-01-25' },
  { id: 'B07YZTWTVC', name: 'Keychron K2 Mechanical', price: 6499, category: 'Electronics', condition: 'Like New', seller: 'KeyboardHub', sellerId: 'seller12', image: null, avgRating: 4.3, reviewCount: 189, verifiedPct: 0.71, sentiment: 'loved', description: 'Compact wireless mechanical keyboard with RGB backlight.', listedAt: '2026-02-10' },
  { id: 'B08N5WRWNW', name: 'Anker PowerCore 26800', price: 3499, category: 'Accessories', condition: 'New', seller: 'AnkerIndia', sellerId: 'seller8', image: null, avgRating: 4.6, reviewCount: 567, verifiedPct: 0.89, sentiment: 'loved', description: 'High capacity power bank with PowerIQ technology.', listedAt: '2025-12-15' },
  { id: 'B07VDYMC3C', name: 'Samsung T7 Portable SSD 1TB', price: 8999, category: 'Electronics', condition: 'New', seller: 'SamsungOfficial', sellerId: 'seller7', image: null, avgRating: 4.7, reviewCount: 345, verifiedPct: 0.93, sentiment: 'loved', description: 'Portable solid state drive with speeds up to 1050 MB/s.', listedAt: '2026-01-30' },
  { id: 'B08DFKLNSG', name: 'Generic USB-C Hub 7-in-1', price: 1299, category: 'Accessories', condition: 'New', seller: 'ValueTech', sellerId: 'seller13', image: null, avgRating: 3.2, reviewCount: 89, verifiedPct: 0.32, sentiment: 'avoid', description: 'Multi-port USB-C hub with HDMI, USB 3.0, and SD card reader.', listedAt: '2026-02-28' },
  { id: 'B09SBQZQLM', name: 'No-Brand Bluetooth Earbuds', price: 499, category: 'Audio', condition: 'New', seller: 'BudgetFinds', sellerId: 'seller14', image: null, avgRating: 2.8, reviewCount: 156, verifiedPct: 0.25, sentiment: 'avoid', description: 'Budget wireless earbuds with touch controls.', listedAt: '2026-03-02' },
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

// Simulated recent reviews for ticker
const RECENT_REVIEWS = [
  { productId: 'B003ES5ZUU', text: 'Amazing sound quality!', rating: 5, time: '2 mins ago' },
  { productId: 'B0019EHU8G', text: 'Best noise cancellation ever', rating: 5, time: '5 mins ago' },
  { productId: 'B002WE6D44', text: 'Perfect for studio work', rating: 4, time: '8 mins ago' },
  { productId: 'B07Q5NHVCQ', text: 'Worth every penny', rating: 5, time: '12 mins ago' },
  { productId: 'B07PXGQC1Q', text: 'Most comfortable mouse', rating: 5, time: '15 mins ago' },
  { productId: 'B08K9XBWFJ', text: 'Good for the price', rating: 3, time: '20 mins ago' },
  { productId: 'B08N5WRWNW', text: 'Charges my phone 5 times', rating: 5, time: '25 mins ago' },
  { productId: 'B09SBQZQLM', text: 'Stopped working after 2 days', rating: 1, time: '30 mins ago' },
];

export function AppProvider({ children }) {
  // User state
  const [currentUser, setCurrentUser] = useState(() => {
    const saved = localStorage.getItem('tristhaUser');
    return saved ? JSON.parse(saved) : null;
  });

  // Cart state
  const [cart, setCart] = useState(() => {
    const saved = localStorage.getItem('tristhaCart');
    return saved ? JSON.parse(saved) : [];
  });

  // Products state (marketplace listings)
  const [products, setProducts] = useState(() => {
    const saved = localStorage.getItem('tristhaProducts');
    return saved ? JSON.parse(saved) : SAMPLE_PRODUCTS;
  });

  // User's listed products
  const [listedProducts, setListedProducts] = useState(() => {
    const saved = localStorage.getItem('tristhaListed');
    return saved ? JSON.parse(saved) : [];
  });

  // User's purchased products
  const [purchasedProducts, setPurchasedProducts] = useState(() => {
    const saved = localStorage.getItem('tristhaPurchased');
    return saved ? JSON.parse(saved) : [];
  });

  // Reviews submitted by user
  const [userReviews, setUserReviews] = useState(() => {
    const saved = localStorage.getItem('tristhaReviews');
    return saved ? JSON.parse(saved) : [];
  });

  // Compare products
  const [compareList, setCompareList] = useState([]);

  // Toast notifications
  const [toast, setToast] = useState(null);

  // Persist to localStorage
  useEffect(() => {
    if (currentUser) {
      localStorage.setItem('tristhaUser', JSON.stringify(currentUser));
    } else {
      localStorage.removeItem('tristhaUser');
    }
  }, [currentUser]);

  useEffect(() => {
    localStorage.setItem('tristhaCart', JSON.stringify(cart));
  }, [cart]);

  useEffect(() => {
    localStorage.setItem('tristhaProducts', JSON.stringify(products));
  }, [products]);

  useEffect(() => {
    localStorage.setItem('tristhaListed', JSON.stringify(listedProducts));
  }, [listedProducts]);

  useEffect(() => {
    localStorage.setItem('tristhaPurchased', JSON.stringify(purchasedProducts));
  }, [purchasedProducts]);

  useEffect(() => {
    localStorage.setItem('tristhaReviews', JSON.stringify(userReviews));
  }, [userReviews]);

  // Auth functions
  const login = (email, password, remember) => {
    // Admin login
    if (email === 'admin@tristha.com' && password === 'admin123') {
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
    localStorage.removeItem('tristhaUser');
  };

  const continueAsGuest = () => {
    const guest = { name: 'Guest', email: 'guest@tristha.com', role: 'guest' };
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

  // List product function
  const listProduct = (productData) => {
    const newProduct = {
      ...productData,
      id: productData.id || `USR-${Date.now()}`,
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
    showToast('Product listed successfully!', 'success');
    return newProduct;
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

  const value = {
    // User
    currentUser,
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

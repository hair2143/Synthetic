import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AppProvider, useApp } from './context/AppContext';
import LoginPage from './pages/LoginPage';
import MarketplacePage from './pages/MarketplacePage';
import ProductDetailPage from './pages/ProductDetailPage';
import HistoryPage from './pages/HistoryPage';
import InsightsPage from './pages/InsightsPage';
import SellItemPage from './pages/SellItemPage';

// Protected Route wrapper
function ProtectedRoute({ children }) {
  const { isAuthenticated } = useApp();
  if (!isAuthenticated) {
    return <Navigate to="/" replace />;
  }
  return children;
}

// App Routes
function AppRoutes() {
  return (
    <Routes>
      <Route path="/" element={<LoginPage />} />
      <Route
        path="/marketplace"
        element={
          <ProtectedRoute>
            <MarketplacePage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/product/:id"
        element={
          <ProtectedRoute>
            <ProductDetailPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/insights/:id?"
        element={
          <ProtectedRoute>
            <InsightsPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/history"
        element={
          <ProtectedRoute>
            <HistoryPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/sell"
        element={
          <ProtectedRoute>
            <SellItemPage />
          </ProtectedRoute>
        }
      />
      {/* Fallback route */}
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <AppProvider>
        <AppRoutes />
      </AppProvider>
    </BrowserRouter>
  );
}

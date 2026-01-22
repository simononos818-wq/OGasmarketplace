import { BrowserRouter, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { useState, useEffect } from 'react';
import './App.css';
import LandingPage from './pages/LandingPage';
import AuthCallback from './pages/AuthCallback';
import RoleSelection from './pages/RoleSelection';
import BuyerDashboard from './pages/BuyerDashboard';
import SellerDashboard from './pages/SellerDashboard';
import { Toaster } from './components/ui/toaster';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

function AppRouter() {
  const location = useLocation();
  
  // REMINDER: DO NOT HARDCODE THE URL, OR ADD ANY FALLBACKS OR REDIRECT URLS, THIS BREAKS THE AUTH
  // Check URL fragment (not query params) for session_id - MUST be synchronous
  if (location.hash?.includes('session_id=')) {
    return <AuthCallback />;
  }
  
  return (
    <Routes>
      <Route path="/" element={<LandingPage />} />
      <Route path="/role-selection" element={<RoleSelection />} />
      <Route path="/buyer/*" element={<ProtectedRoute role="buyer"><BuyerDashboard /></ProtectedRoute>} />
      <Route path="/seller/*" element={<ProtectedRoute role="seller"><SellerDashboard /></ProtectedRoute>} />
    </Routes>
  );
}

function ProtectedRoute({ children, role }) {
  const [isAuthenticated, setIsAuthenticated] = useState(null);
  const [user, setUser] = useState(null);
  const location = useLocation();

  useEffect(() => {
    // Skip auth check if user data passed from AuthCallback
    if (location.state?.user) {
      setUser(location.state.user);
      setIsAuthenticated(true);
      return;
    }

    const checkAuth = async () => {
      try {
        const response = await fetch(`${API}/auth/me`, {
          credentials: 'include'
        });
        
        if (!response.ok) throw new Error('Not authenticated');
        
        const userData = await response.json();
        setUser(userData);
        setIsAuthenticated(true);
      } catch (error) {
        setIsAuthenticated(false);
      }
    };
    
    checkAuth();
  }, [location.state]);

  if (isAuthenticated === null) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-orange-600"></div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/" replace />;
  }

  if (role && user?.role !== role) {
    const redirectPath = user?.role === 'buyer' ? '/buyer' : '/seller';
    return <Navigate to={redirectPath} replace />;
  }

  return children;
}

function App() {
  return (
    <BrowserRouter>
      <AppRouter />
      <Toaster />
    </BrowserRouter>
  );
}

export default App;

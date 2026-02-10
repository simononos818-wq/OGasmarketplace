import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '../components/ui/button';
import { Flame, MapPin, Star, ShieldCheck, Menu } from 'lucide-react';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

function LandingPage() {
  const navigate = useNavigate();

  useEffect(() => {
    // Check if already logged in
    const checkSession = async () => {
      try {
        const response = await fetch(`${API}/auth/me`, {
          credentials: 'include'
        });
        
        if (response.ok) {
          const user = await response.json();
          navigate(user.role === 'buyer' ? '/buyer' : '/seller');
        }
      } catch (error) {
        // Not logged in, stay on landing page
      }
    };
    checkSession();
  }, [navigate]);

  const handleLogin = () => {
    // REMINDER: DO NOT HARDCODE THE URL, OR ADD ANY FALLBACKS OR REDIRECT URLS, THIS BREAKS THE AUTH
    const redirectUrl = 'https://ogaslpgmarketplace.com/buyer';
    window.location.href = `https://auth.emergentagent.com/?redirect=${encodeURIComponent(redirectUrl)}`;
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-orange-50 via-white to-orange-50">
      {/* Navigation */}
      <nav className="bg-white shadow-sm border-b border-orange-100 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-14 sm:h-16">
            <div className="flex items-center space-x-2">
              <Flame className="h-6 w-6 sm:h-8 sm:w-8 text-orange-600" />
              <span className="text-xl sm:text-2xl font-bold text-gray-900">OGas</span>
            </div>
            <Button 
              onClick={handleLogin}
              className="bg-orange-600 hover:bg-orange-700 text-white text-sm sm:text-base px-4 sm:px-6"
              data-testid="login-button"
            >
              Get Started
            </Button>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 sm:py-20">
        <div className="text-center">
          <h1 className="text-3xl sm:text-4xl md:text-5xl lg:text-6xl font-bold text-gray-900 mb-4 sm:mb-6 leading-tight">
            Find Cooking Gas
            <span className="block text-orange-600">Near You</span>
          </h1>
          <p className="text-base sm:text-lg md:text-xl text-gray-600 mb-6 sm:mb-8 max-w-2xl mx-auto px-4">
            Connect with trusted gas sellers in Nigeria. Safe, fast, and secure payment platform for all your cooking gas needs.
          </p>
          <Button 
            onClick={handleLogin}
            size="lg"
            className="bg-orange-600 hover:bg-orange-700 text-white px-6 sm:px-8 py-4 sm:py-6 text-base sm:text-lg w-full sm:w-auto"
            data-testid="hero-cta-button"
          >
            Start Shopping Now
          </Button>
        </div>

        {/* Features */}
        <div className="mt-16 sm:mt-24 grid grid-cols-1 md:grid-cols-3 gap-6 sm:gap-8">
          <div className="bg-white p-6 sm:p-8 rounded-2xl shadow-md border border-orange-100">
            <div className="bg-orange-100 w-12 h-12 sm:w-14 sm:h-14 rounded-full flex items-center justify-center mb-4">
              <MapPin className="h-6 w-6 sm:h-7 sm:w-7 text-orange-600" />
            </div>
            <h3 className="text-lg sm:text-xl font-bold text-gray-900 mb-2 sm:mb-3">Distance-Based Search</h3>
            <p className="text-sm sm:text-base text-gray-600">
              Find the nearest gas sellers to your location. Save time and get your gas refill quickly.
            </p>
          </div>

          <div className="bg-white p-6 sm:p-8 rounded-2xl shadow-md border border-orange-100">
            <div className="bg-orange-100 w-12 h-12 sm:w-14 sm:h-14 rounded-full flex items-center justify-center mb-4">
              <ShieldCheck className="h-6 w-6 sm:h-7 sm:w-7 text-orange-600" />
            </div>
            <h3 className="text-lg sm:text-xl font-bold text-gray-900 mb-2 sm:mb-3">Secure Payments</h3>
            <p className="text-sm sm:text-base text-gray-600">
              Pay safely with Paystack integration. Multiple payment options including cards and bank transfers.
            </p>
          </div>

          <div className="bg-white p-6 sm:p-8 rounded-2xl shadow-md border border-orange-100">
            <div className="bg-orange-100 w-12 h-12 sm:w-14 sm:h-14 rounded-full flex items-center justify-center mb-4">
              <Star className="h-6 w-6 sm:h-7 sm:w-7 text-orange-600" />
            </div>
            <h3 className="text-lg sm:text-xl font-bold text-gray-900 mb-2 sm:mb-3">Verified Sellers</h3>
            <p className="text-sm sm:text-base text-gray-600">
              Read reviews and ratings from other customers. Choose trusted sellers with confidence.
            </p>
          </div>
        </div>

        {/* How It Works */}
        <div className="mt-16 sm:mt-24">
          <h2 className="text-2xl sm:text-3xl font-bold text-center text-gray-900 mb-8 sm:mb-12">How It Works</h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 sm:gap-6">
            <div className="text-center">
              <div className="bg-orange-600 text-white w-10 h-10 sm:w-12 sm:h-12 rounded-full flex items-center justify-center mx-auto mb-3 sm:mb-4 text-lg sm:text-xl font-bold">
                1
              </div>
              <h4 className="font-semibold text-gray-900 mb-1 sm:mb-2 text-sm sm:text-base">Sign Up</h4>
              <p className="text-xs sm:text-sm text-gray-600">Create your account as a buyer or seller</p>
            </div>
            <div className="text-center">
              <div className="bg-orange-600 text-white w-10 h-10 sm:w-12 sm:h-12 rounded-full flex items-center justify-center mx-auto mb-3 sm:mb-4 text-lg sm:text-xl font-bold">
                2
              </div>
              <h4 className="font-semibold text-gray-900 mb-1 sm:mb-2 text-sm sm:text-base">Find Sellers</h4>
              <p className="text-xs sm:text-sm text-gray-600">Search for gas sellers near you</p>
            </div>
            <div className="text-center">
              <div className="bg-orange-600 text-white w-10 h-10 sm:w-12 sm:h-12 rounded-full flex items-center justify-center mx-auto mb-3 sm:mb-4 text-lg sm:text-xl font-bold">
                3
              </div>
              <h4 className="font-semibold text-gray-900 mb-1 sm:mb-2 text-sm sm:text-base">Place Order</h4>
              <p className="text-xs sm:text-sm text-gray-600">Choose cylinder size and delivery method</p>
            </div>
            <div className="text-center">
              <div className="bg-orange-600 text-white w-10 h-10 sm:w-12 sm:h-12 rounded-full flex items-center justify-center mx-auto mb-3 sm:mb-4 text-lg sm:text-xl font-bold">
                4
              </div>
              <h4 className="font-semibold text-gray-900 mb-1 sm:mb-2 text-sm sm:text-base">Pay & Receive</h4>
              <p className="text-xs sm:text-sm text-gray-600">Secure payment and fast delivery</p>
            </div>
          </div>
        </div>

        {/* CTA Section */}
        <div className="mt-16 sm:mt-24 bg-gradient-to-r from-orange-600 to-orange-500 rounded-2xl p-8 sm:p-12 text-center">
          <h2 className="text-2xl sm:text-3xl font-bold text-white mb-3 sm:mb-4">Ready to Get Started?</h2>
          <p className="text-orange-100 mb-6 sm:mb-8 text-base sm:text-lg">
            Join thousands of Nigerians buying and selling cooking gas safely
          </p>
          <Button 
            onClick={handleLogin}
            size="lg"
            className="bg-white text-orange-600 hover:bg-orange-50 px-6 sm:px-8 py-4 sm:py-6 text-base sm:text-lg w-full sm:w-auto"
            data-testid="cta-button"
          >
            Sign Up Now
          </Button>
        </div>
      </div>

      {/* Footer */}
      <footer className="bg-gray-900 text-white py-6 sm:py-8 mt-16 sm:mt-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <div className="flex items-center justify-center space-x-2 mb-3 sm:mb-4">
            <Flame className="h-5 w-5 sm:h-6 sm:w-6 text-orange-500" />
            <span className="text-lg sm:text-xl font-bold">OGas</span>
          </div>
          <p className="text-sm sm:text-base text-gray-400">
            © 2025 OGas Marketplace. Making cooking gas accessible to all Nigerians.
          </p>
        </div>
      </footer>
    </div>
  );
}

export default LandingPage;

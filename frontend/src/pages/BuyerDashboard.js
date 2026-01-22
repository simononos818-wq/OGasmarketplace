import { useState, useEffect } from 'react';
import { Routes, Route, Link, useNavigate } from 'react-router-dom';
import { Button } from '../components/ui/button';
import { Card } from '../components/ui/card';
import { Input } from '../components/ui/input';
import { Badge } from '../components/ui/badge';
import { 
  Flame, Search, MapPin, Star, ShoppingCart, 
  MessageCircle, LogOut, Package, User 
} from 'lucide-react';
import { useToast } from '../hooks/use-toast';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

function BuyerDashboard() {
  const [user, setUser] = useState(null);
  const [activeTab, setActiveTab] = useState('search');
  const navigate = useNavigate();

  useEffect(() => {
    fetchUser();
  }, []);

  const fetchUser = async () => {
    try {
      const response = await fetch(`${API}/auth/me`, {
        credentials: 'include'
      });
      if (response.ok) {
        const data = await response.json();
        setUser(data);
      }
    } catch (error) {
      console.error('Error fetching user:', error);
    }
  };

  const handleLogout = async () => {
    try {
      await fetch(`${API}/auth/logout`, {
        method: 'POST',
        credentials: 'include'
      });
      document.cookie = 'session_token=; path=/; max-age=0';
      navigate('/');
    } catch (error) {
      console.error('Logout error:', error);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <nav className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center space-x-2">
              <Flame className="h-8 w-8 text-orange-600" />
              <span className="text-2xl font-bold text-gray-900">OGas</span>
              <Badge className="bg-orange-100 text-orange-700">Buyer</Badge>
            </div>
            <div className="flex items-center space-x-4">
              <span className="text-sm text-gray-600">{user?.name}</span>
              <Button
                variant="ghost"
                size="sm"
                onClick={handleLogout}
                data-testid="logout-button"
              >
                <LogOut className="h-4 w-4 mr-2" />
                Logout
              </Button>
            </div>
          </div>
        </div>
      </nav>

      {/* Navigation Tabs */}
      <div className="bg-white border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex space-x-8">
            <Link to="/buyer">
              <button
                className={`py-4 px-2 border-b-2 font-medium text-sm ${
                  activeTab === 'search'
                    ? 'border-orange-600 text-orange-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700'
                }`}
                onClick={() => setActiveTab('search')}
                data-testid="search-tab"
              >
                <Search className="h-4 w-4 inline mr-2" />
                Search Sellers
              </button>
            </Link>
            <Link to="/buyer/orders">
              <button
                className={`py-4 px-2 border-b-2 font-medium text-sm ${
                  activeTab === 'orders'
                    ? 'border-orange-600 text-orange-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700'
                }`}
                onClick={() => setActiveTab('orders')}
                data-testid="orders-tab"
              >
                <Package className="h-4 w-4 inline mr-2" />
                My Orders
              </button>
            </Link>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <Routes>
          <Route path="/" element={<SearchSellers />} />
          <Route path="/seller/:sellerId" element={<SellerDetails />} />
          <Route path="/orders" element={<MyOrders />} />
          <Route path="/order/:orderId" element={<OrderDetails />} />
        </Routes>
      </div>
    </div>
  );
}

function SearchSellers() {
  const [sellers, setSellers] = useState([]);
  const [loading, setLoading] = useState(false);
  const [latitude, setLatitude] = useState('');
  const [longitude, setLongitude] = useState('');
  const [radius, setRadius] = useState(50);
  const { toast } = useToast();

  const getCurrentLocation = () => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          setLatitude(position.coords.latitude.toString());
          setLongitude(position.coords.longitude.toString());
          toast({
            title: "Location obtained",
            description: "Ready to search for sellers"
          });
        },
        (error) => {
          toast({
            title: "Location error",
            description: "Could not get your location",
            variant: "destructive"
          });
        }
      );
    }
  };

  const searchSellers = async () => {
    if (!latitude || !longitude) {
      toast({
        title: "Location required",
        description: "Please provide your location to search",
        variant: "destructive"
      });
      return;
    }

    setLoading(true);
    try {
      const response = await fetch(
        `${API}/buyers/search-sellers?lat=${latitude}&lon=${longitude}&radius_km=${radius}`,
        { credentials: 'include' }
      );
      
      if (response.ok) {
        const data = await response.json();
        setSellers(data);
        toast({
          title: "Search complete",
          description: `Found ${data.length} sellers nearby`
        });
      }
    } catch (error) {
      console.error('Search error:', error);
      toast({
        title: "Search failed",
        description: "Please try again",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      <h1 className="text-3xl font-bold text-gray-900 mb-6">Find Gas Sellers Near You</h1>
      
      {/* Search Form */}
      <Card className="p-6 mb-8">
        <div className="flex flex-col md:flex-row gap-4">
          <div className="flex-1">
            <label className="block text-sm font-medium text-gray-700 mb-2">Your Location</label>
            <div className="grid grid-cols-2 gap-2">
              <Input
                placeholder="Latitude"
                value={latitude}
                onChange={(e) => setLatitude(e.target.value)}
                data-testid="search-latitude"
              />
              <Input
                placeholder="Longitude"
                value={longitude}
                onChange={(e) => setLongitude(e.target.value)}
                data-testid="search-longitude"
              />
            </div>
          </div>
          <div className="md:w-32">
            <label className="block text-sm font-medium text-gray-700 mb-2">Radius (km)</label>
            <Input
              type="number"
              value={radius}
              onChange={(e) => setRadius(parseInt(e.target.value))}
              min="1"
              max="100"
              data-testid="search-radius"
            />
          </div>
          <div className="flex items-end gap-2">
            <Button
              variant="outline"
              onClick={getCurrentLocation}
              data-testid="get-location-btn"
            >
              <MapPin className="h-4 w-4 mr-2" />
              Get Location
            </Button>
            <Button
              onClick={searchSellers}
              disabled={loading}
              className="bg-orange-600 hover:bg-orange-700"
              data-testid="search-button"
            >
              <Search className="h-4 w-4 mr-2" />
              Search
            </Button>
          </div>
        </div>
      </Card>

      {/* Results */}
      {loading ? (
        <div className="text-center py-12">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-orange-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Searching for sellers...</p>
        </div>
      ) : sellers.length > 0 ? (
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
          {sellers.map((seller) => (
            <SellerCard key={seller.seller_id} seller={seller} />
          ))}
        </div>
      ) : (
        <Card className="p-12 text-center">
          <MapPin className="h-12 w-12 text-gray-400 mx-auto mb-4" />
          <p className="text-gray-600">No sellers found. Try adjusting your search.</p>
        </Card>
      )}
    </div>
  );
}

function SellerCard({ seller }) {
  const navigate = useNavigate();
  
  return (
    <Card className="p-6 hover:shadow-lg transition-shadow cursor-pointer"
          onClick={() => navigate(`/buyer/seller/${seller.seller_id}`)}
          data-testid={`seller-card-${seller.seller_id}`}>
      <div className="flex justify-between items-start mb-4">
        <div>
          <h3 className="font-bold text-lg text-gray-900">{seller.business_name}</h3>
          <div className="flex items-center mt-1">
            <MapPin className="h-4 w-4 text-gray-400 mr-1" />
            <span className="text-sm text-gray-600">{seller.distance_km} km away</span>
          </div>
        </div>
        {seller.is_verified && (
          <Badge className="bg-green-100 text-green-700">Verified</Badge>
        )}
      </div>

      <div className="flex items-center mb-4">
        <Star className="h-5 w-5 text-yellow-500 fill-current" />
        <span className="ml-1 font-semibold">{seller.rating.toFixed(1)}</span>
        <span className="text-sm text-gray-500 ml-1">({seller.total_reviews} reviews)</span>
      </div>

      {seller.listing && seller.listing.prices && (
        <div className="border-t pt-4">
          <p className="text-sm text-gray-600 mb-2">Prices from:</p>
          <div className="flex justify-between items-center">
            <span className="text-sm text-gray-700">
              {Object.keys(seller.listing.prices)[0]}
            </span>
            <span className="font-bold text-orange-600">
              ₦{Object.values(seller.listing.prices)[0].toLocaleString()}
            </span>
          </div>
        </div>
      )}

      <Button className="w-full mt-4 bg-orange-600 hover:bg-orange-700">
        View Details
      </Button>
    </Card>
  );
}

function SellerDetails() {
  // Placeholder - will be implemented
  return <div>Seller Details Page</div>;
}

function MyOrders() {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchOrders();
  }, []);

  const fetchOrders = async () => {
    try {
      const response = await fetch(`${API}/buyers/my-orders`, {
        credentials: 'include'
      });
      if (response.ok) {
        const data = await response.json();
        setOrders(data);
      }
    } catch (error) {
      console.error('Error fetching orders:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="text-center py-12">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-orange-600 mx-auto"></div>
      </div>
    );
  }

  return (
    <div>
      <h1 className="text-3xl font-bold text-gray-900 mb-6">My Orders</h1>
      
      {orders.length === 0 ? (
        <Card className="p-12 text-center">
          <ShoppingCart className="h-12 w-12 text-gray-400 mx-auto mb-4" />
          <p className="text-gray-600">No orders yet</p>
        </Card>
      ) : (
        <div className="space-y-4">
          {orders.map((order) => (
            <Card key={order.order_id} className="p-6" data-testid={`order-${order.order_id}`}>
              <div className="flex justify-between items-start">
                <div>
                  <h3 className="font-semibold text-gray-900">{order.seller_name}</h3>
                  <p className="text-sm text-gray-600">
                    {order.quantity}x {order.cylinder_size} cylinders
                  </p>
                  <p className="text-sm text-gray-500 mt-1">
                    Order ID: {order.order_id}
                  </p>
                </div>
                <div className="text-right">
                  <p className="font-bold text-orange-600">
                    ₦{order.total_amount.toLocaleString()}
                  </p>
                  <Badge className={
                    order.status === 'completed' ? 'bg-green-100 text-green-700' :
                    order.status === 'confirmed' ? 'bg-blue-100 text-blue-700' :
                    order.status === 'cancelled' ? 'bg-red-100 text-red-700' :
                    'bg-yellow-100 text-yellow-700'
                  }>
                    {order.status}
                  </Badge>
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}

function OrderDetails() {
  // Placeholder - will be implemented
  return <div>Order Details Page</div>;
}

export default BuyerDashboard;

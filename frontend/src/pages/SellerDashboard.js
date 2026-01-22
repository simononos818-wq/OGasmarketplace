import { useState, useEffect } from 'react';
import { Routes, Route, Link, useNavigate } from 'react-router-dom';
import { Button } from '../components/ui/button';
import { Card } from '../components/ui/card';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Textarea } from '../components/ui/textarea';
import { Badge } from '../components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../components/ui/select';
import { 
  Flame, Store, Package, Settings, LogOut, Plus, Edit 
} from 'lucide-react';
import { useToast } from '../hooks/use-toast';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

const CYLINDER_SIZES = ['3kg', '6kg', '12.5kg', '25kg', '50kg'];

function SellerDashboard() {
  const [user, setUser] = useState(null);
  const [activeTab, setActiveTab] = useState('orders');
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
              <Badge className="bg-green-100 text-green-700">Seller</Badge>
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
            <Link to="/seller">
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
                Orders
              </button>
            </Link>
            <Link to="/seller/profile">
              <button
                className={`py-4 px-2 border-b-2 font-medium text-sm ${
                  activeTab === 'profile'
                    ? 'border-orange-600 text-orange-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700'
                }`}
                onClick={() => setActiveTab('profile')}
                data-testid="profile-tab"
              >
                <Store className="h-4 w-4 inline mr-2" />
                Business Profile
              </button>
            </Link>
            <Link to="/seller/listing">
              <button
                className={`py-4 px-2 border-b-2 font-medium text-sm ${
                  activeTab === 'listing'
                    ? 'border-orange-600 text-orange-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700'
                }`}
                onClick={() => setActiveTab('listing')}
                data-testid="listing-tab"
              >
                <Settings className="h-4 w-4 inline mr-2" />
                Gas Listing
              </button>
            </Link>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <Routes>
          <Route path="/" element={<Orders />} />
          <Route path="/profile" element={<BusinessProfile />} />
          <Route path="/listing" element={<GasListing />} />
        </Routes>
      </div>
    </div>
  );
}

function Orders() {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  useEffect(() => {
    fetchOrders();
  }, []);

  const fetchOrders = async () => {
    try {
      const response = await fetch(`${API}/sellers/my-orders`, {
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

  const updateOrderStatus = async (orderId, newStatus) => {
    try {
      const response = await fetch(`${API}/sellers/orders/${orderId}/status?status=${newStatus}`, {
        method: 'PATCH',
        credentials: 'include'
      });
      
      if (response.ok) {
        toast({
          title: "Status updated",
          description: `Order ${newStatus}`
        });
        fetchOrders();
      }
    } catch (error) {
      toast({
        title: "Update failed",
        description: "Please try again",
        variant: "destructive"
      });
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
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold text-gray-900">Orders</h1>
        <Badge variant="outline" className="text-lg">
          {orders.length} Total Orders
        </Badge>
      </div>

      {orders.length === 0 ? (
        <Card className="p-12 text-center">
          <Package className="h-12 w-12 text-gray-400 mx-auto mb-4" />
          <p className="text-gray-600">No orders yet</p>
        </Card>
      ) : (
        <div className="space-y-4">
          {orders.map((order) => (
            <Card key={order.order_id} className="p-6" data-testid={`order-${order.order_id}`}>
              <div className="flex justify-between items-start mb-4">
                <div>
                  <h3 className="font-semibold text-gray-900">{order.buyer_name}</h3>
                  <p className="text-sm text-gray-600">
                    {order.quantity}x {order.cylinder_size} cylinders
                  </p>
                  <p className="text-sm text-gray-500 mt-1">Order ID: {order.order_id}</p>
                  {order.buyer_phone && (
                    <p className="text-sm text-gray-600 mt-1">📞 {order.buyer_phone}</p>
                  )}
                </div>
                <div className="text-right">
                  <p className="font-bold text-orange-600 text-lg">
                    ₦{order.total_amount.toLocaleString()}
                  </p>
                  <Badge className={
                    order.payment_status === 'completed' 
                      ? 'bg-green-100 text-green-700' 
                      : 'bg-yellow-100 text-yellow-700'
                  }>
                    {order.payment_status === 'completed' ? 'Paid' : 'Pending Payment'}
                  </Badge>
                </div>
              </div>

              <div className="border-t pt-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-600">Delivery Method</p>
                    <p className="font-medium">{order.delivery_method}</p>
                  </div>
                  <div className="flex gap-2">
                    {order.status === 'pending' && (
                      <>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => updateOrderStatus(order.order_id, 'confirmed')}
                          data-testid={`confirm-order-${order.order_id}`}
                        >
                          Confirm
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          className="text-red-600 hover:text-red-700"
                          onClick={() => updateOrderStatus(order.order_id, 'cancelled')}
                        >
                          Cancel
                        </Button>
                      </>
                    )}
                    {order.status === 'confirmed' && (
                      <Button
                        size="sm"
                        className="bg-green-600 hover:bg-green-700"
                        onClick={() => updateOrderStatus(order.order_id, 'completed')}
                        data-testid={`complete-order-${order.order_id}`}
                      >
                        Mark as Completed
                      </Button>
                    )}
                    {order.status === 'completed' && (
                      <Badge className="bg-green-100 text-green-700">Completed</Badge>
                    )}
                    {order.status === 'cancelled' && (
                      <Badge className="bg-red-100 text-red-700">Cancelled</Badge>
                    )}
                  </div>
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}

function BusinessProfile() {
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(false);
  const [formData, setFormData] = useState({
    business_name: '',
    description: '',
    phone: '',
    operating_hours: '',
    address: '',
    city: '',
    state: '',
    latitude: '',
    longitude: ''
  });
  const { toast } = useToast();

  useEffect(() => {
    fetchProfile();
  }, []);

  const fetchProfile = async () => {
    try {
      const response = await fetch(`${API}/sellers/my-profile`, {
        credentials: 'include'
      });
      if (response.ok) {
        const data = await response.json();
        setProfile(data);
        setFormData({
          business_name: data.business_name || '',
          description: data.description || '',
          phone: data.phone || '',
          operating_hours: data.operating_hours || '9:00 AM - 6:00 PM',
          address: data.location?.address || '',
          city: data.location?.city || '',
          state: data.location?.state || '',
          latitude: data.location?.latitude?.toString() || '',
          longitude: data.location?.longitude?.toString() || ''
        });
      } else if (response.status === 404) {
        setEditing(true);
      }
    } catch (error) {
      console.error('Error fetching profile:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      const response = await fetch(`${API}/sellers/profile`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          business_name: formData.business_name,
          description: formData.description,
          phone: formData.phone,
          operating_hours: formData.operating_hours,
          location: {
            latitude: parseFloat(formData.latitude),
            longitude: parseFloat(formData.longitude),
            address: formData.address,
            city: formData.city,
            state: formData.state
          }
        })
      });

      if (response.ok) {
        toast({
          title: "Profile saved",
          description: "Your business profile has been updated"
        });
        setEditing(false);
        fetchProfile();
      }
    } catch (error) {
      toast({
        title: "Save failed",
        description: "Please try again",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  if (loading && !editing) {
    return (
      <div className="text-center py-12">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-orange-600 mx-auto"></div>
      </div>
    );
  }

  if (!editing && profile) {
    return (
      <div>
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-3xl font-bold text-gray-900">Business Profile</h1>
          <Button
            onClick={() => setEditing(true)}
            className="bg-orange-600 hover:bg-orange-700"
            data-testid="edit-profile-button"
          >
            <Edit className="h-4 w-4 mr-2" />
            Edit Profile
          </Button>
        </div>

        <Card className="p-6">
          <div className="space-y-4">
            <div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">{profile.business_name}</h3>
              {profile.description && (
                <p className="text-gray-600">{profile.description}</p>
              )}
            </div>
            <div className="grid md:grid-cols-2 gap-4 border-t pt-4">
              <div>
                <p className="text-sm text-gray-500">Phone</p>
                <p className="font-medium">{profile.phone}</p>
              </div>
              <div>
                <p className="text-sm text-gray-500">Operating Hours</p>
                <p className="font-medium">{profile.operating_hours}</p>
              </div>
              <div>
                <p className="text-sm text-gray-500">Location</p>
                <p className="font-medium">
                  {profile.location?.address}, {profile.location?.city}, {profile.location?.state}
                </p>
              </div>
              <div>
                <p className="text-sm text-gray-500">Rating</p>
                <p className="font-medium">⭐ {profile.rating.toFixed(1)} ({profile.total_reviews} reviews)</p>
              </div>
            </div>
          </div>
        </Card>
      </div>
    );
  }

  return (
    <div>
      <h1 className="text-3xl font-bold text-gray-900 mb-6">
        {profile ? 'Edit' : 'Create'} Business Profile
      </h1>

      <Card className="p-6">
        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <Label htmlFor="business_name">Business Name *</Label>
            <Input
              id="business_name"
              value={formData.business_name}
              onChange={(e) => setFormData({ ...formData, business_name: e.target.value })}
              required
              data-testid="business-name-input"
            />
          </div>

          <div>
            <Label htmlFor="description">Description</Label>
            <Textarea
              id="description"
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              placeholder="Tell customers about your business..."
              rows={4}
              data-testid="description-input"
            />
          </div>

          <div className="grid md:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="phone">Phone Number *</Label>
              <Input
                id="phone"
                type="tel"
                value={formData.phone}
                onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                required
                data-testid="phone-input"
              />
            </div>
            <div>
              <Label htmlFor="operating_hours">Operating Hours</Label>
              <Input
                id="operating_hours"
                value={formData.operating_hours}
                onChange={(e) => setFormData({ ...formData, operating_hours: e.target.value })}
                placeholder="9:00 AM - 6:00 PM"
                data-testid="hours-input"
              />
            </div>
          </div>

          <div>
            <Label htmlFor="address">Business Address *</Label>
            <Input
              id="address"
              value={formData.address}
              onChange={(e) => setFormData({ ...formData, address: e.target.value })}
              required
              data-testid="address-input"
            />
          </div>

          <div className="grid md:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="city">City *</Label>
              <Input
                id="city"
                value={formData.city}
                onChange={(e) => setFormData({ ...formData, city: e.target.value })}
                required
                data-testid="city-input"
              />
            </div>
            <div>
              <Label htmlFor="state">State *</Label>
              <Input
                id="state"
                value={formData.state}
                onChange={(e) => setFormData({ ...formData, state: e.target.value })}
                required
                data-testid="state-input"
              />
            </div>
          </div>

          <div className="grid md:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="latitude">Latitude *</Label>
              <Input
                id="latitude"
                type="number"
                step="any"
                value={formData.latitude}
                onChange={(e) => setFormData({ ...formData, latitude: e.target.value })}
                required
                data-testid="latitude-input"
              />
            </div>
            <div>
              <Label htmlFor="longitude">Longitude *</Label>
              <Input
                id="longitude"
                type="number"
                step="any"
                value={formData.longitude}
                onChange={(e) => setFormData({ ...formData, longitude: e.target.value })}
                required
                data-testid="longitude-input"
              />
            </div>
          </div>

          <div className="flex gap-4">
            <Button
              type="submit"
              disabled={loading}
              className="bg-orange-600 hover:bg-orange-700"
              data-testid="save-profile-button"
            >
              {loading ? 'Saving...' : 'Save Profile'}
            </Button>
            {profile && (
              <Button
                type="button"
                variant="outline"
                onClick={() => setEditing(false)}
              >
                Cancel
              </Button>
            )}
          </div>
        </form>
      </Card>
    </div>
  );
}

function GasListing() {
  const [listing, setListing] = useState(null);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(false);
  const [prices, setPrices] = useState({
    '3kg': '',
    '6kg': '',
    '12.5kg': '',
    '25kg': '',
    '50kg': ''
  });
  const [selectedSizes, setSelectedSizes] = useState([]);
  const [deliveryAvailable, setDeliveryAvailable] = useState(true);
  const [pickupAvailable, setPickupAvailable] = useState(true);
  const [deliveryFee, setDeliveryFee] = useState('0');
  const { toast } = useToast();

  useEffect(() => {
    fetchListing();
  }, []);

  const fetchListing = async () => {
    try {
      const response = await fetch(`${API}/sellers/my-listing`, {
        credentials: 'include'
      });
      if (response.ok) {
        const data = await response.json();
        if (data) {
          setListing(data);
          setPrices(data.prices || {});
          setSelectedSizes(data.available_sizes || []);
          setDeliveryAvailable(data.delivery_available ?? true);
          setPickupAvailable(data.pickup_available ?? true);
          setDeliveryFee(data.delivery_fee?.toString() || '0');
        } else {
          setEditing(true);
        }
      }
    } catch (error) {
      console.error('Error fetching listing:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    // Filter prices for selected sizes only
    const filteredPrices = {};
    selectedSizes.forEach(size => {
      if (prices[size]) {
        filteredPrices[size] = parseInt(prices[size]);
      }
    });

    try {
      const response = await fetch(`${API}/sellers/listings`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          prices: filteredPrices,
          available_sizes: selectedSizes,
          delivery_available: deliveryAvailable,
          pickup_available: pickupAvailable,
          delivery_fee: parseInt(deliveryFee)
        })
      });

      if (response.ok) {
        toast({
          title: "Listing saved",
          description: "Your gas listing has been updated"
        });
        setEditing(false);
        fetchListing();
      }
    } catch (error) {
      toast({
        title: "Save failed",
        description: "Please try again",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const toggleSize = (size) => {
    setSelectedSizes(prev =>
      prev.includes(size)
        ? prev.filter(s => s !== size)
        : [...prev, size]
    );
  };

  if (loading && !editing) {
    return (
      <div className="text-center py-12">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-orange-600 mx-auto"></div>
      </div>
    );
  }

  if (!editing && listing) {
    return (
      <div>
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-3xl font-bold text-gray-900">Gas Listing</h1>
          <Button
            onClick={() => setEditing(true)}
            className="bg-orange-600 hover:bg-orange-700"
            data-testid="edit-listing-button"
          >
            <Edit className="h-4 w-4 mr-2" />
            Edit Listing
          </Button>
        </div>

        <Card className="p-6">
          <h3 className="text-lg font-semibold mb-4">Available Cylinder Sizes & Prices</h3>
          <div className="grid md:grid-cols-2 gap-4">
            {Object.entries(listing.prices).map(([size, price]) => (
              <div key={size} className="flex justify-between items-center p-3 bg-gray-50 rounded">
                <span className="font-medium">{size}</span>
                <span className="text-orange-600 font-bold">₦{price.toLocaleString()}</span>
              </div>
            ))}
          </div>

          <div className="mt-6 pt-6 border-t">
            <div className="grid md:grid-cols-2 gap-4">
              <div>
                <p className="text-sm text-gray-500">Delivery Available</p>
                <p className="font-medium">{listing.delivery_available ? 'Yes' : 'No'}</p>
              </div>
              <div>
                <p className="text-sm text-gray-500">Pickup Available</p>
                <p className="font-medium">{listing.pickup_available ? 'Yes' : 'No'}</p>
              </div>
              {listing.delivery_available && (
                <div>
                  <p className="text-sm text-gray-500">Delivery Fee</p>
                  <p className="font-medium">₦{listing.delivery_fee?.toLocaleString()}</p>
                </div>
              )}
            </div>
          </div>
        </Card>
      </div>
    );
  }

  return (
    <div>
      <h1 className="text-3xl font-bold text-gray-900 mb-6">
        {listing ? 'Edit' : 'Create'} Gas Listing
      </h1>

      <Card className="p-6">
        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <Label>Select Available Cylinder Sizes *</Label>
            <div className="grid grid-cols-2 md:grid-cols-5 gap-3 mt-2">
              {CYLINDER_SIZES.map(size => (
                <button
                  key={size}
                  type="button"
                  onClick={() => toggleSize(size)}
                  className={`p-3 rounded border-2 transition-all ${
                    selectedSizes.includes(size)
                      ? 'border-orange-600 bg-orange-50 text-orange-600 font-semibold'
                      : 'border-gray-200 hover:border-gray-300'
                  }`}
                  data-testid={`size-${size}`}
                >
                  {size}
                </button>
              ))}
            </div>
          </div>

          <div>
            <Label>Set Prices (₦) *</Label>
            <div className="grid md:grid-cols-2 gap-4 mt-2">
              {selectedSizes.map(size => (
                <div key={size}>
                  <Label htmlFor={`price-${size}`} className="text-sm text-gray-600">
                    {size} Price
                  </Label>
                  <Input
                    id={`price-${size}`}
                    type="number"
                    min="0"
                    value={prices[size] || ''}
                    onChange={(e) => setPrices({ ...prices, [size]: e.target.value })}
                    required
                    placeholder="0"
                    data-testid={`price-${size}`}
                  />
                </div>
              ))}
            </div>
          </div>

          <div className="grid md:grid-cols-2 gap-4">
            <div className="flex items-center space-x-2">
              <input
                type="checkbox"
                id="delivery"
                checked={deliveryAvailable}
                onChange={(e) => setDeliveryAvailable(e.target.checked)}
                className="w-4 h-4"
                data-testid="delivery-checkbox"
              />
              <Label htmlFor="delivery">Offer Delivery</Label>
            </div>
            <div className="flex items-center space-x-2">
              <input
                type="checkbox"
                id="pickup"
                checked={pickupAvailable}
                onChange={(e) => setPickupAvailable(e.target.checked)}
                className="w-4 h-4"
                data-testid="pickup-checkbox"
              />
              <Label htmlFor="pickup">Offer Pickup</Label>
            </div>
          </div>

          {deliveryAvailable && (
            <div>
              <Label htmlFor="deliveryFee">Delivery Fee (₦)</Label>
              <Input
                id="deliveryFee"
                type="number"
                min="0"
                value={deliveryFee}
                onChange={(e) => setDeliveryFee(e.target.value)}
                data-testid="delivery-fee-input"
              />
            </div>
          )}

          <div className="flex gap-4">
            <Button
              type="submit"
              disabled={loading || selectedSizes.length === 0}
              className="bg-orange-600 hover:bg-orange-700"
              data-testid="save-listing-button"
            >
              {loading ? 'Saving...' : 'Save Listing'}
            </Button>
            {listing && (
              <Button
                type="button"
                variant="outline"
                onClick={() => setEditing(false)}
              >
                Cancel
              </Button>
            )}
          </div>
        </form>
      </Card>
    </div>
  );
}

export default SellerDashboard;

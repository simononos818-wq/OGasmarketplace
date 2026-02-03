import { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { Button } from '../components/ui/button';
import { Card } from '../components/ui/card';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { ShoppingBag, Store, Flame } from 'lucide-react';
import { useToast } from '../hooks/use-toast';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

function RoleSelection() {
  const navigate = useNavigate();
  const location = useLocation();
  const { toast } = useToast();
  const [selectedRole, setSelectedRole] = useState('');
  const [loading, setLoading] = useState(false);
  const [locationLoading, setLocationLoading] = useState(false);
  const [formData, setFormData] = useState({
    phone: '',
    nin: '',
    address: '',
    city: '',
    state: '',
    latitude: '',
    longitude: ''
  });

  const { email, name, picture, temp_session_token } = location.state || {};

  if (!email) {
    navigate('/');
    return null;
  }

  const getCurrentLocation = () => {
    setLocationLoading(true);
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          setFormData(prev => ({
            ...prev,
            latitude: position.coords.latitude.toString(),
            longitude: position.coords.longitude.toString()
          }));
          setLocationLoading(false);
          toast({
            title: "Location obtained",
            description: "Your location has been captured successfully"
          });
        },
        (error) => {
          setLocationLoading(false);
          toast({
            title: "Location error",
            description: "Could not get your location. Please enable location services.",
            variant: "destructive"
          });
        }
      );
    } else {
      setLocationLoading(false);
      toast({
        title: "Not supported",
        description: "Your browser doesn't support location services",
        variant: "destructive"
      });
    }
  };

  // Auto-request location when seller role is selected
  const handleRoleSelect = (role) => {
    setSelectedRole(role);
    if (role === 'seller') {
      // Automatically request location for sellers
      setTimeout(() => {
        getCurrentLocation();
      }, 500);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    // Validate NIN for sellers
    if (selectedRole === 'seller') {
      if (!formData.nin) {
        toast({
          title: "NIN Required",
          description: "National Identification Number is mandatory for sellers",
          variant: "destructive"
        });
        return;
      }
      if (formData.nin.length !== 11 || !/^\d+$/.test(formData.nin)) {
        toast({
          title: "Invalid NIN",
          description: "NIN must be exactly 11 digits",
          variant: "destructive"
        });
        return;
      }
      if (!formData.latitude || !formData.longitude) {
        toast({
          title: "Location Required",
          description: "Please allow location access to continue as a seller",
          variant: "destructive"
        });
        return;
      }
    }

    setLoading(true);

    try {
      const requestData = {
        role: selectedRole,
        phone: formData.phone,
        nin: selectedRole === 'seller' ? formData.nin : null,
        location: formData.latitude && formData.longitude ? {
          latitude: parseFloat(formData.latitude),
          longitude: parseFloat(formData.longitude),
          address: formData.address,
          city: formData.city,
          state: formData.state
        } : null
      };

      const response = await fetch(`${API}/auth/complete-signup`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${temp_session_token}`,
          'X-User-Email': email,
          'X-User-Name': name,
          'X-User-Picture': picture || ''
        },
        body: JSON.stringify(requestData),
        credentials: 'include'
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.detail || 'Signup failed');
      }

      const data = await response.json();
      
      // Set session cookie
      document.cookie = `session_token=${data.session_token}; path=/; max-age=${7*24*60*60}; SameSite=None; Secure`;

      toast({
        title: "Welcome to OGas!",
        description: selectedRole === 'seller' 
          ? "Your seller account has been created. Verification in progress." 
          : "Your account has been created successfully"
      });

      // Redirect based on role
      const redirectPath = selectedRole === 'buyer' ? '/buyer' : '/seller';
      navigate(redirectPath, { state: { user: data.user }, replace: true });
    } catch (error) {
      console.error('Signup error:', error);
      toast({
        title: "Signup failed",
        description: error.message || "Please try again",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-orange-50 via-white to-orange-50 py-6 sm:py-12 px-4">
      <div className="max-w-4xl mx-auto">
        <div className="text-center mb-6 sm:mb-8">
          <div className="flex items-center justify-center space-x-2 mb-3 sm:mb-4">
            <Flame className="h-8 w-8 sm:h-10 sm:w-10 text-orange-600" />
            <span className="text-2xl sm:text-3xl font-bold text-gray-900">OGas</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 mb-2">Complete Your Profile</h1>
          <p className="text-sm sm:text-base text-gray-600">Choose how you want to use OGas</p>
        </div>

        {!selectedRole ? (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6">
            <Card 
              className="p-6 sm:p-8 cursor-pointer border-2 hover:border-orange-500 transition-all hover:shadow-lg active:scale-95"
              onClick={() => setSelectedRole('buyer')}
              data-testid="buyer-role-card"
            >
              <div className="text-center">
                <div className="bg-orange-100 w-16 h-16 sm:w-20 sm:h-20 rounded-full flex items-center justify-center mx-auto mb-3 sm:mb-4">
                  <ShoppingBag className="h-8 w-8 sm:h-10 sm:w-10 text-orange-600" />
                </div>
                <h2 className="text-xl sm:text-2xl font-bold text-gray-900 mb-2 sm:mb-3">I'm a Buyer</h2>
                <p className="text-sm sm:text-base text-gray-600 mb-3 sm:mb-4">
                  Find and purchase cooking gas from trusted sellers near you
                </p>
                <ul className="text-left text-xs sm:text-sm text-gray-600 space-y-1 sm:space-y-2">
                  <li>✓ Search sellers by distance</li>
                  <li>✓ Compare prices and ratings</li>
                  <li>✓ Secure online payment</li>
                  <li>✓ Track your orders</li>
                </ul>
              </div>
            </Card>

            <Card 
              className="p-6 sm:p-8 cursor-pointer border-2 hover:border-orange-500 transition-all hover:shadow-lg active:scale-95"
              onClick={() => setSelectedRole('seller')}
              data-testid="seller-role-card"
            >
              <div className="text-center">
                <div className="bg-orange-100 w-16 h-16 sm:w-20 sm:h-20 rounded-full flex items-center justify-center mx-auto mb-3 sm:mb-4">
                  <Store className="h-8 w-8 sm:h-10 sm:w-10 text-orange-600" />
                </div>
                <h2 className="text-xl sm:text-2xl font-bold text-gray-900 mb-2 sm:mb-3">I'm a Seller</h2>
                <p className="text-sm sm:text-base text-gray-600 mb-3 sm:mb-4">
                  List your gas products and reach more customers
                </p>
                <ul className="text-left text-xs sm:text-sm text-gray-600 space-y-1 sm:space-y-2">
                  <li>✓ Create your business profile</li>
                  <li>✓ Manage gas listings</li>
                  <li>✓ Receive orders online</li>
                  <li>✓ Build customer reviews</li>
                </ul>
              </div>
            </Card>
          </div>
        ) : (
          <Card className="p-4 sm:p-6 md:p-8">
            <div className="mb-4 sm:mb-6">
              <Button
                variant="ghost"
                onClick={() => setSelectedRole('')}
                className="mb-3 sm:mb-4 text-sm sm:text-base"
              >
                ← Back to role selection
              </Button>
              <h2 className="text-xl sm:text-2xl font-bold text-gray-900 mb-2">
                {selectedRole === 'buyer' ? 'Buyer' : 'Seller'} Registration
              </h2>
              <p className="text-sm sm:text-base text-gray-600">Please provide your details to continue</p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4 sm:space-y-6">
              <div>
                <Label htmlFor="phone" className="text-sm sm:text-base">Phone Number *</Label>
                <Input
                  id="phone"
                  type="tel"
                  placeholder="+234 XXX XXX XXXX"
                  value={formData.phone}
                  onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                  required
                  className="text-sm sm:text-base h-10 sm:h-11"
                  data-testid="phone-input"
                />
              </div>

              {selectedRole === 'seller' && (
                <>
                  <div>
                    <Label htmlFor="address" className="text-sm sm:text-base">Business Address *</Label>
                    <Input
                      id="address"
                      placeholder="Street address"
                      value={formData.address}
                      onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                      required
                      className="text-sm sm:text-base h-10 sm:h-11"
                      data-testid="address-input"
                    />
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
                    <div>
                      <Label htmlFor="city" className="text-sm sm:text-base">City *</Label>
                      <Input
                        id="city"
                        placeholder="Lagos"
                        value={formData.city}
                        onChange={(e) => setFormData({ ...formData, city: e.target.value })}
                        required
                        className="text-sm sm:text-base h-10 sm:h-11"
                        data-testid="city-input"
                      />
                    </div>
                    <div>
                      <Label htmlFor="state" className="text-sm sm:text-base">State *</Label>
                      <Input
                        id="state"
                        placeholder="Lagos State"
                        value={formData.state}
                        onChange={(e) => setFormData({ ...formData, state: e.target.value })}
                        required
                        className="text-sm sm:text-base h-10 sm:h-11"
                        data-testid="state-input"
                      />
                    </div>
                  </div>

                  <div>
                    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-2 gap-2">
                      <Label className="text-sm sm:text-base">Location Coordinates *</Label>
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={getCurrentLocation}
                        className="text-xs sm:text-sm w-full sm:w-auto"
                        data-testid="get-location-button"
                      >
                        Get Current Location
                      </Button>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
                      <div>
                        <Input
                          placeholder="Latitude"
                          value={formData.latitude}
                          onChange={(e) => setFormData({ ...formData, latitude: e.target.value })}
                          required
                          className="text-sm sm:text-base h-10 sm:h-11"
                          data-testid="latitude-input"
                        />
                      </div>
                      <div>
                        <Input
                          placeholder="Longitude"
                          value={formData.longitude}
                          onChange={(e) => setFormData({ ...formData, longitude: e.target.value })}
                          required
                          className="text-sm sm:text-base h-10 sm:h-11"
                          data-testid="longitude-input"
                        />
                      </div>
                    </div>
                    <p className="text-xs sm:text-sm text-gray-500 mt-1">
                      This helps buyers find you based on distance
                    </p>
                  </div>
                </>
              )}

              {selectedRole === 'buyer' && (
                <div>
                  <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-2 gap-2">
                    <Label className="text-sm sm:text-base">Your Location (Optional)</Label>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={getCurrentLocation}
                      className="text-xs sm:text-sm w-full sm:w-auto"
                    >
                      Get Current Location
                    </Button>
                  </div>
                  <p className="text-xs sm:text-sm text-gray-500 mb-2">
                    Setting your location helps find sellers near you
                  </p>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
                    <Input
                      placeholder="Latitude"
                      value={formData.latitude}
                      onChange={(e) => setFormData({ ...formData, latitude: e.target.value })}
                      className="text-sm sm:text-base h-10 sm:h-11"
                    />
                    <Input
                      placeholder="Longitude"
                      value={formData.longitude}
                      onChange={(e) => setFormData({ ...formData, longitude: e.target.value })}
                      className="text-sm sm:text-base h-10 sm:h-11"
                    />
                  </div>
                </div>
              )}

              <Button
                type="submit"
                className="w-full bg-orange-600 hover:bg-orange-700 text-sm sm:text-base h-10 sm:h-11"
                disabled={loading}
                data-testid="complete-signup-button"
              >
                {loading ? 'Creating Account...' : 'Complete Registration'}
              </Button>
            </form>
          </Card>
        )}
      </div>
    </div>
  );
}

export default RoleSelection;

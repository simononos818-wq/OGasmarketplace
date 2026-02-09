import { useState, useEffect } from 'react';
import { Card } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Badge } from '../components/ui/badge';
import { Copy, Share2, Users, TrendingUp, Gift, CheckCircle, Clock } from 'lucide-react';
import { useToast } from '../hooks/use-toast';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

function ReferralProgram({ userRole }) {
  const [referralData, setReferralData] = useState(null);
  const [stats, setStats] = useState(null);
  const [referrals, setReferrals] = useState([]);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  const rewardAmount = userRole === 'seller' ? 1000 : 500;

  useEffect(() => {
    fetchReferralData();
  }, []);

  const fetchReferralData = async () => {
    try {
      const [codeRes, statsRes, listRes] = await Promise.all([
        fetch(`${API}/referrals/my-code`, { credentials: 'include' }),
        fetch(`${API}/referrals/stats`, { credentials: 'include' }),
        fetch(`${API}/referrals/list`, { credentials: 'include' })
      ]);

      if (codeRes.ok) {
        const data = await codeRes.json();
        setReferralData(data);
      }

      if (statsRes.ok) {
        const data = await statsRes.json();
        setStats(data);
      }

      if (listRes.ok) {
        const data = await listRes.json();
        setReferrals(data.referrals || []);
      }
    } catch (error) {
      console.error('Error fetching referral data:', error);
    } finally {
      setLoading(false);
    }
  };

  const copyToClipboard = (text) => {
    navigator.clipboard.writeText(text);
    toast({
      title: "Copied!",
      description: "Referral code copied to clipboard"
    });
  };

  const shareViaWhatsApp = () => {
    const message = `Join OGas and get ₦500 OFF your first gas order! I'm loving it. Use my referral code: ${referralData.referral_code}\n\n${referralData.referral_link}`;
    window.open(`https://wa.me/?text=${encodeURIComponent(message)}`, '_blank');
  };

  const shareViaLink = () => {
    if (navigator.share) {
      navigator.share({
        title: 'Join OGas',
        text: `Use my referral code ${referralData.referral_code} and get ₦500 OFF!`,
        url: referralData.referral_link
      });
    } else {
      copyToClipboard(referralData.referral_link);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-orange-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 mb-2">Refer & Earn</h1>
        <p className="text-sm sm:text-base text-gray-600">
          Earn ₦{rewardAmount.toLocaleString()} for every friend who joins and places their first order!
        </p>
      </div>

      {/* Stats Overview */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 sm:gap-4">
        <Card className="p-4">
          <div className="flex items-center justify-between mb-2">
            <Users className="h-5 w-5 text-orange-600" />
            <Badge variant="outline" className="text-xs">Total</Badge>
          </div>
          <p className="text-2xl font-bold text-gray-900">{stats?.total_referrals || 0}</p>
          <p className="text-xs text-gray-600">Referrals</p>
        </Card>

        <Card className="p-4">
          <div className="flex items-center justify-between mb-2">
            <CheckCircle className="h-5 w-5 text-green-600" />
            <Badge variant="outline" className="text-xs bg-green-50">Active</Badge>
          </div>
          <p className="text-2xl font-bold text-gray-900">{stats?.completed_referrals || 0}</p>
          <p className="text-xs text-gray-600">Completed</p>
        </Card>

        <Card className="p-4">
          <div className="flex items-center justify-between mb-2">
            <TrendingUp className="h-5 w-5 text-blue-600" />
            <Badge variant="outline" className="text-xs bg-blue-50">Earned</Badge>
          </div>
          <p className="text-2xl font-bold text-gray-900">₦{(stats?.total_earnings || 0).toLocaleString()}</p>
          <p className="text-xs text-gray-600">Total Earnings</p>
        </Card>

        <Card className="p-4">
          <div className="flex items-center justify-between mb-2">
            <Clock className="h-5 w-5 text-yellow-600" />
            <Badge variant="outline" className="text-xs bg-yellow-50">Pending</Badge>
          </div>
          <p className="text-2xl font-bold text-gray-900">₦{(stats?.pending_earnings || 0).toLocaleString()}</p>
          <p className="text-xs text-gray-600">Pending</p>
        </Card>
      </div>

      {/* Referral Code Card */}
      <Card className="p-6 bg-gradient-to-r from-orange-50 to-orange-100 border-orange-200">
        <div className="flex items-center mb-4">
          <Gift className="h-6 w-6 text-orange-600 mr-2" />
          <h2 className="text-lg sm:text-xl font-semibold text-gray-900">Your Referral Code</h2>
        </div>

        <div className="bg-white rounded-lg p-4 mb-4 border-2 border-orange-300">
          <p className="text-xs text-gray-600 mb-1">Referral Code:</p>
          <p className="text-2xl sm:text-3xl font-bold text-orange-600 tracking-wider mb-2">
            {referralData?.referral_code}
          </p>
          <p className="text-xs text-gray-500 break-all">{referralData?.referral_link}</p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 sm:gap-3">
          <Button
            variant="outline"
            className="w-full"
            onClick={() => copyToClipboard(referralData?.referral_code)}
            data-testid="copy-code-button"
          >
            <Copy className="h-4 w-4 mr-2" />
            Copy Code
          </Button>
          
          <Button
            variant="outline"
            className="w-full"
            onClick={() => copyToClipboard(referralData?.referral_link)}
          >
            <Copy className="h-4 w-4 mr-2" />
            Copy Link
          </Button>

          <Button
            className="w-full bg-green-600 hover:bg-green-700 text-white"
            onClick={shareViaWhatsApp}
            data-testid="share-whatsapp-button"
          >
            <Share2 className="h-4 w-4 mr-2" />
            Share WhatsApp
          </Button>
        </div>

        <div className="mt-4 p-3 bg-white rounded-lg border border-orange-200">
          <p className="text-sm text-gray-700">
            <strong>How it works:</strong> Share your code with friends. When they sign up and place their first order, you both get rewarded! You earn ₦{rewardAmount.toLocaleString()} and they get ₦500 OFF their first order.
          </p>
        </div>
      </Card>

      {/* Referral List */}
      <Card className="p-6">
        <h2 className="text-lg sm:text-xl font-semibold text-gray-900 mb-4">Your Referrals</h2>
        
        {referrals.length === 0 ? (
          <div className="text-center py-8">
            <Users className="h-12 w-12 text-gray-400 mx-auto mb-3" />
            <p className="text-gray-600 mb-2">No referrals yet</p>
            <p className="text-sm text-gray-500">Share your code to start earning!</p>
          </div>
        ) : (
          <div className="space-y-3">
            {referrals.map((referral) => (
              <div 
                key={referral.referral_id} 
                className="flex items-center justify-between p-4 bg-gray-50 rounded-lg border"
              >
                <div className="flex-1">
                  <p className="font-medium text-gray-900">{referral.referee_name}</p>
                  <p className="text-sm text-gray-600">{referral.referee_email}</p>
                  <p className="text-xs text-gray-500 mt-1">
                    Joined: {new Date(referral.referee_joined).toLocaleDateString()}
                  </p>
                </div>
                <div className="text-right">
                  <p className="font-bold text-orange-600">₦{referral.reward_amount.toLocaleString()}</p>
                  <Badge 
                    className={
                      referral.status === 'completed' 
                        ? 'bg-green-100 text-green-700' 
                        : referral.status === 'pending'
                        ? 'bg-yellow-100 text-yellow-700'
                        : 'bg-gray-100 text-gray-700'
                    }
                  >
                    {referral.status === 'completed' ? 'Paid' : 'Pending Order'}
                  </Badge>
                </div>
              </div>
            ))}
          </div>
        )}
      </Card>

      {/* Credits Info */}
      {stats?.referral_credits > 0 && (
        <Card className="p-6 bg-green-50 border-green-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600 mb-1">Available Credits</p>
              <p className="text-3xl font-bold text-green-600">
                ₦{(stats.referral_credits || 0).toLocaleString()}
              </p>
            </div>
            <Gift className="h-12 w-12 text-green-600" />
          </div>
          <p className="text-sm text-gray-600 mt-3">
            Your referral credits will be automatically applied to your next order!
          </p>
        </Card>
      )}
    </div>
  );
}

export default ReferralProgram;

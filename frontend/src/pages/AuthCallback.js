import { useEffect, useRef } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

function AuthCallback() {
  const navigate = useNavigate();
  const location = useLocation();
  const hasProcessed = useRef(false);

  useEffect(() => {
    // Prevent double processing in StrictMode
    if (hasProcessed.current) return;
    hasProcessed.current = true;

    const processSession = async () => {
      try {
        // Extract session_id from URL fragment
        const hash = location.hash;
        const sessionIdMatch = hash.match(/session_id=([^&]+)/);
        
        if (!sessionIdMatch) {
          navigate('/');
          return;
        }

        const sessionId = sessionIdMatch[1];

        // Exchange session_id for user data
        const response = await fetch(`${API}/auth/session`, {
          method: 'GET',
          headers: {
            'X-Session-ID': sessionId
          },
          credentials: 'include'
        });

        if (!response.ok) {
          throw new Error('Session exchange failed');
        }

        const data = await response.json();

        if (data.is_new_user) {
          // New user - redirect to role selection
          navigate('/role-selection', { 
            state: { 
              email: data.email,
              name: data.name,
              picture: data.picture,
              temp_session_token: data.temp_session_token
            },
            replace: true
          });
        } else {
          // Existing user - set cookie and redirect to dashboard
          document.cookie = `session_token=${data.session_token}; path=/; max-age=${7*24*60*60}; SameSite=None; Secure`;
          
          const redirectPath = data.user.role === 'buyer' ? '/buyer' : '/seller';
          navigate(redirectPath, { state: { user: data.user }, replace: true });
        }
      } catch (error) {
        console.error('Auth callback error:', error);
        navigate('/');
      }
    };

    processSession();
  }, [navigate, location.hash]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="text-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-orange-600 mx-auto mb-4"></div>
        <p className="text-gray-600">Completing authentication...</p>
      </div>
    </div>
  );
}

export default AuthCallback;

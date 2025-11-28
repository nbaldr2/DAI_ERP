import { useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

const AuthNavigationWrapper = ({ children }) => {
  const navigate = useNavigate();
  const location = useLocation();
  const { isAuthenticated, loading } = useAuth();

  useEffect(() => {
    // Only redirect when auth state changes or on login page
    // Don't redirect on regular page refreshes
    if (!loading) {
      if (!isAuthenticated && location.pathname !== '/login') {
        navigate('/login');
      } else if (isAuthenticated && location.pathname === '/login') {
        navigate('/dashboard');
      }
    }
  }, [isAuthenticated, loading, location.pathname === '/login', navigate]);

  return children;
};

export default AuthNavigationWrapper;

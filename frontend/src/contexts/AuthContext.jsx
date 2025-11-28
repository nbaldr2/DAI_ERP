import { createContext, useContext, useState, useEffect } from 'react';
import api from '../services/api';
import toast from 'react-hot-toast';

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(localStorage.getItem('token'));
  const [loading, setLoading] = useState(true);

  // Check if user is authenticated on mount
  useEffect(() => {
    const initAuth = async () => {
      const storedToken = localStorage.getItem('token');
      const storedUser = localStorage.getItem('user');

      if (storedToken && storedUser) {
        try {
          setToken(storedToken);
          setUser(JSON.parse(storedUser));

          // Verify token is still valid
          const response = await api.get('/auth/me');
          if (response.data.success) {
            setUser(response.data.data.user);
            localStorage.setItem('user', JSON.stringify(response.data.data.user));
          }
        } catch (error) {
          console.error('Token validation failed:', error);
          logout();
        }
      }
      setLoading(false);
    };

    initAuth();
  }, []);

  const login = async (username, password) => {
    try {
      const response = await api.post('/auth/login', { username, password });

      if (response.data.success) {
        const { token, user } = response.data.data;

        setToken(token);
        setUser(user);

        localStorage.setItem('token', token);
        localStorage.setItem('user', JSON.stringify(user));

        toast.success(`Welcome back, ${user.name}! 👋`, {
          duration: 3000,
          icon: '🎉',
        });

        return { success: true };
      }
    } catch (error) {
      const message = error.response?.data?.message || 'Login failed. Please try again.';
      toast.error(message, {
        duration: 4000,
        icon: '❌',
      });
      return { success: false, error: message };
    }
  };

  const logout = () => {
    setToken(null);
    setUser(null);
    localStorage.removeItem('token');
    localStorage.removeItem('user');

    toast.success('Logged out successfully', {
      icon: '👋',
      duration: 2000,
    });

    // Let the caller handle navigation
    return true;
  };

  const updateUser = (updatedUser) => {
    setUser(updatedUser);
    localStorage.setItem('user', JSON.stringify(updatedUser));
  };

  const hasRole = (roles) => {
    if (!user) return false;
    if (Array.isArray(roles)) {
      return roles.includes(user.role);
    }
    return user.role === roles;
  };

  const hasPermission = (permission) => {
    if (!user) return false;

    // Admin has all permissions
    if (user.role === 'ADMIN') return true;

    const rolePermissions = {
      WAREHOUSE: ['stock:read', 'stock:create', 'stock:update', 'waste:create', 'waste:read', 'purchases:read', 'purchases:create', 'purchases:update'],
      SALES: ['stock:read', 'sales:create', 'sales:read', 'customer:read', 'customer:create'],
      ACCOUNTANT: ['*:read', 'invoice:create', 'invoice:update', 'accounting:*', 'purchases:read', 'purchases:create', 'purchases:update'],
      VIEWER: ['*:read']
    };

    const permissions = rolePermissions[user.role] || [];

    // Check if permission exists
    if (permissions.includes(permission)) return true;
    if (permissions.includes('*')) return true;

    // Check wildcard permissions
    const [resource, action] = permission.split(':');
    if (permissions.includes(`${resource}:*`)) return true;
    if (permissions.includes(`*:${action}`)) return true;

    return false;
  };

  const value = {
    user,
    token,
    loading,
    login,
    logout,
    updateUser,
    hasRole,
    hasPermission,
    isAuthenticated: !!token && !!user,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

export default AuthContext;

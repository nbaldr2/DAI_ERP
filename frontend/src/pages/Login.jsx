import { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../contexts/AuthContext';
import { Eye, EyeOff, LogIn, Loader2, Globe } from 'lucide-react';
import { clsx } from 'clsx';
import toast from 'react-hot-toast';

const Login = () => {
  const { t, i18n } = useTranslation();
  const { login, isAuthenticated, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors },
    setFocus,
  } = useForm();

  const from = location.state?.from?.pathname || '/dashboard';

  // Redirect if already authenticated
  useEffect(() => {
    if (isAuthenticated && !authLoading) {
      navigate(from, { replace: true });
    }
  }, [isAuthenticated, authLoading, navigate, from]);

  // Focus username field on mount
  useEffect(() => {
    setFocus('username');
  }, [setFocus]);

  const onSubmit = async (data) => {
    setIsLoading(true);
    try {
      const result = await login(data.username, data.password);
      if (result.success) {
        navigate(from, { replace: true });
      }
    } catch (error) {
      console.error('Login error:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const toggleLanguage = () => {
    const newLanguage = i18n.language === 'en' ? 'ar' : 'en';
    i18n.changeLanguage(newLanguage);
    document.body.dir = newLanguage === 'ar' ? 'rtl' : 'ltr';
    document.body.classList.toggle('rtl', newLanguage === 'ar');
  };

  const quickLoginUsers = [
    { username: 'admin', role: 'ADMIN' },
    { username: 'warehouse_manager', role: 'WAREHOUSE' },
    { username: 'sales_manager', role: 'SALES' },
    { username: 'accountant', role: 'ACCOUNTANT' },
    { username: 'viewer', role: 'VIEWER' },
  ];

  const handleQuickLogin = async (username) => {
    setIsLoading(true);
    await onSubmit({ username, password: 'password123' });
  };

  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-primary-50 to-primary-100">
        <div className="text-center">
          <Loader2 className="w-12 h-12 animate-spin text-primary-500 mx-auto mb-4" />
          <p className="text-text-secondary font-medium">Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-primary-50 via-white to-primary-100 py-12 px-4 sm:px-6 lg:px-8">
      {/* Language toggle */}
      <button
        onClick={toggleLanguage}
        className="fixed top-6 right-6 z-10 p-3 bg-card/80 backdrop-blur-sm rounded-full shadow-lg hover:shadow-xl transition-all duration-300 group"
        title={i18n.language === 'en' ? 'عربي' : 'English'}
      >
        <Globe className="w-5 h-5 text-text-secondary group-hover:text-primary-600 transition-colors" />
      </button>

      <div className="max-w-md w-full space-y-8 animate-fade-in">
        {/* Logo and Title */}
        <div className="text-center">
          <div className="flex justify-center mb-6">
            <img 
              src="/logo/dai.png" 
              alt="DAI Trading Logo" 
              className="w-60 h-60 rounded-2xl animate-float object-contain"
            />
          </div>
          <h2 className="text-3xl font-bold text-text-primary mb-2 animate-slide-in-up">
            {t('auth.loginTitle')}
          </h2>
          <p className="text-text-secondary animate-slide-in-up" style={{ animationDelay: '0.1s' }}>
            {t('auth.loginSubtitle')}
          </p>
          <div className="mt-4 animate-slide-in-up" style={{ animationDelay: '0.2s' }}>
            <h3 className="text-lg font-semibold text-primary-700">Dai Trading ERP</h3>
            <p className="text-sm text-text-secondary">Inventory & Sales Management</p>
          </div>
        </div>

        {/* Login Form */}
        <div className="bg-card/80 backdrop-blur-sm shadow-2xl rounded-2xl p-8 border border-white/20 animate-slide-in-up" style={{ animationDelay: '0.3s' }}>
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
            {/* Username */}
            <div>
              <label htmlFor="username" className="block text-sm font-medium text-text-secondary mb-2">
                {t('auth.username')}
              </label>
              <div className="relative">
                <input
                  {...register('username', {
                    required: t('validation.required', { field: t('auth.username') }),
                    minLength: {
                      value: 3,
                      message: t('validation.minLength', { field: t('auth.username'), min: 3 }),
                    },
                  })}
                  type="text"
                  autoComplete="username"
                  className={clsx(
                    'w-full px-4 py-3 border-2 rounded-lg transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-primary-500/20',
                    errors.username
                      ? 'border-red-300 focus:border-red-500'
                      : 'border-theme-border focus:border-primary-500'
                  )}
                  placeholder={t('auth.username')}
                />
              </div>
              {errors.username && (
                <p className="mt-2 text-sm text-red-600 animate-fade-in">
                  {errors.username.message}
                </p>
              )}
            </div>

            {/* Password */}
            <div>
              <label htmlFor="password" className="block text-sm font-medium text-text-secondary mb-2">
                {t('auth.password')}
              </label>
              <div className="relative">
                <input
                  {...register('password', {
                    required: t('validation.required', { field: t('auth.password') }),
                    minLength: {
                      value: 6,
                      message: t('validation.minLength', { field: t('auth.password'), min: 6 }),
                    },
                  })}
                  type={showPassword ? 'text' : 'password'}
                  autoComplete="current-password"
                  className={clsx(
                    'w-full px-4 py-3 pr-12 border-2 rounded-lg transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-primary-500/20',
                    errors.password
                      ? 'border-red-300 focus:border-red-500'
                      : 'border-theme-border focus:border-primary-500'
                  )}
                  placeholder={t('auth.password')}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute inset-y-0 right-0 flex items-center pr-4 text-text-secondary hover:text-text-secondary transition-colors"
                >
                  {showPassword ? (
                    <EyeOff className="w-5 h-5" />
                  ) : (
                    <Eye className="w-5 h-5" />
                  )}
                </button>
              </div>
              {errors.password && (
                <p className="mt-2 text-sm text-red-600 animate-fade-in">
                  {errors.password.message}
                </p>
              )}
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              disabled={isLoading}
              className="w-full bg-gradient-to-r from-primary-500 to-primary-600 text-white py-3 px-4 rounded-lg font-semibold text-lg shadow-lg hover:shadow-xl transform hover:-translate-y-0.5 transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none group"
            >
              {isLoading ? (
                <div className="flex items-center justify-center">
                  <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                  {t('auth.loggingIn')}
                </div>
              ) : (
                <div className="flex items-center justify-center">
                  <LogIn className="w-5 h-5 mr-2 group-hover:scale-110 transition-transform" />
                  {t('auth.loginButton')}
                </div>
              )}
            </button>
          </form>
        </div>

        {/* Quick Login Demo */}
        <div className="bg-card/60 backdrop-blur-sm rounded-2xl p-6 border border-white/20 animate-slide-in-up" style={{ animationDelay: '0.4s' }}>
          <h3 className="text-sm font-semibold text-text-primary mb-4 text-center">
            🚀 Quick Demo Login (Password: password123)
          </h3>
          <div className="grid grid-cols-2 gap-2">
            {quickLoginUsers.map((user, index) => (
              <button
                key={user.username}
                onClick={() => handleQuickLogin(user.username)}
                disabled={isLoading}
                className={clsx(
                  'p-2 text-xs rounded-lg border transition-all duration-200 hover:shadow-md disabled:opacity-50 stagger-item',
                  {
                    'bg-purple-50 border-purple-200 text-purple-700 hover:bg-purple-100': user.role === 'ADMIN',
                    'bg-blue-50 border-blue-200 text-blue-700 hover:bg-blue-100': user.role === 'WAREHOUSE',
                    'bg-green-50 border-green-200 text-green-700 hover:bg-green-100': user.role === 'SALES',
                    'bg-yellow-50 border-yellow-200 text-yellow-700 hover:bg-yellow-100': user.role === 'ACCOUNTANT',
                    'bg-background border-theme-border text-text-secondary hover:bg-card-hover': user.role === 'VIEWER',
                  }
                )}
                style={{ animationDelay: `${0.5 + index * 0.1}s` }}
              >
                <div className="font-medium">{user.username}</div>
                <div className="text-xs opacity-75">{user.role}</div>
              </button>
            ))}
          </div>
        </div>

        {/* Footer */}
        <div className="text-center text-sm text-text-secondary animate-fade-in" style={{ animationDelay: '0.6s' }}>
          <p>© 2025 Dai Trading. Professional ERP System</p>
          <p className="mt-1">Built with ❤️ for Qatar</p>
        </div>
      </div>
    </div>
  );
};

export default Login;

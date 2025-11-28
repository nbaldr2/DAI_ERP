import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Home, ArrowLeft, Search } from 'lucide-react';
import Button from '../components/Button';

const NotFound = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();

  const handleGoHome = () => {
    navigate('/dashboard');
  };

  const handleGoBack = () => {
    navigate(-1);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 flex items-center justify-center p-4">
      <div className="text-center max-w-md w-full animate-fade-in">
        {/* 404 Illustration */}
        <div className="relative mb-8">
          <div className="text-9xl font-bold text-gray-200 select-none animate-bounce">
            404
          </div>
          <div className="absolute inset-0 flex items-center justify-center">
            <Search className="w-16 h-16 text-gray-400 animate-pulse" />
          </div>
        </div>

        {/* Error Message */}
        <div className="mb-8 animate-slide-in-up">
          <h1 className="text-3xl font-bold text-gray-900 mb-4">
            Page Not Found
          </h1>
          <p className="text-gray-600 text-lg mb-2">
            Sorry, we couldn't find the page you're looking for.
          </p>
          <p className="text-gray-500 text-sm">
            The page might have been moved, deleted, or you entered the wrong URL.
          </p>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-col sm:flex-row gap-4 justify-center animate-slide-in-up" style={{ animationDelay: '0.2s' }}>
          <Button
            onClick={handleGoBack}
            variant="outline"
            icon={ArrowLeft}
            className="flex-1 sm:flex-initial"
          >
            Go Back
          </Button>
          <Button
            onClick={handleGoHome}
            variant="primary"
            icon={Home}
            className="flex-1 sm:flex-initial"
          >
            Go to Dashboard
          </Button>
        </div>

        {/* Decorative Elements */}
        <div className="mt-12 text-xs text-gray-400 animate-fade-in" style={{ animationDelay: '0.4s' }}>
          <p>© 2025 Dai Trading ERP System</p>
        </div>
      </div>

      {/* Background decoration */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden">
        <div className="absolute top-1/4 left-1/4 w-64 h-64 bg-primary-100 rounded-full opacity-20 animate-float" />
        <div className="absolute bottom-1/4 right-1/4 w-48 h-48 bg-primary-200 rounded-full opacity-10 animate-float" style={{ animationDelay: '2s' }} />
      </div>
    </div>
  );
};

export default NotFound;

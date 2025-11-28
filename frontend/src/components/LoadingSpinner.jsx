import { Loader2 } from 'lucide-react';
import { clsx } from 'clsx';

const LoadingSpinner = ({
  fullScreen = false,
  size = 'md',
  message = 'Loading...',
  className = ''
}) => {
  const sizes = {
    sm: 'w-4 h-4',
    md: 'w-8 h-8',
    lg: 'w-12 h-12',
    xl: 'w-16 h-16',
  };

  if (fullScreen) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-white/90 backdrop-blur-sm animate-fade-in">
        <div className="text-center">
          <div className="relative">
            <Loader2 className={`${sizes[size]} animate-spin text-primary-500 mx-auto`} />
            <div className="absolute inset-0 rounded-full bg-primary-100 animate-pulse opacity-20"></div>
          </div>
          {message && (
            <p className="mt-4 text-gray-600 font-medium animate-pulse">
              {message}
            </p>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className={clsx('flex items-center justify-center py-12', className)}>
      <div className="text-center">
        <div className="relative">
          <Loader2 className={`${sizes[size]} animate-spin text-primary-500 mx-auto`} />
          <div className="absolute inset-0 rounded-full bg-primary-100 animate-pulse opacity-20"></div>
        </div>
        {message && (
          <p className="mt-2 text-sm text-gray-500 animate-pulse">
            {message}
          </p>
        )}
      </div>
    </div>
  );
};

export default LoadingSpinner;

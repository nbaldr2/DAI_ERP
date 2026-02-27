import { clsx } from 'clsx';

const Card = ({
  children,
  title,
  subtitle,
  action,
  className = '',
  hoverable = false,
  padding = true,
  shadow = 'md',
  rounded = 'xl',
  border = true,
  loading = false,
  ...props
}) => {
  const baseStyles = clsx(
    'bg-card transition-all duration-300 backdrop-blur-md',
    {
      'shadow-sm': shadow === 'sm',
      'shadow-md': shadow === 'md',
      'shadow-lg': shadow === 'lg',
      'shadow-xl': shadow === 'xl',
      'shadow-none': shadow === 'none',
      'rounded-lg': rounded === 'lg',
      'rounded-xl': rounded === 'xl',
      'rounded-2xl': rounded === '2xl',
      'rounded-none': rounded === 'none',
      'border border-theme-border': border,
      'p-6': padding,
      'hover:shadow-xl hover:-translate-y-1 cursor-pointer': hoverable,
    }
  );

  if (loading) {
    return (
      <div className={clsx(baseStyles, 'animate-pulse', className)} {...props}>
        <div className="space-y-4">
          {title && (
            <div className="space-y-2">
              <div className="h-5 bg-gray-200 rounded w-1/3"></div>
              {subtitle && <div className="h-4 bg-gray-200 rounded w-1/2"></div>}
            </div>
          )}
          <div className="space-y-3">
            <div className="h-4 bg-gray-200 rounded"></div>
            <div className="h-4 bg-gray-200 rounded w-5/6"></div>
            <div className="h-4 bg-gray-200 rounded w-4/6"></div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={clsx(baseStyles, className)} {...props}>
      {(title || subtitle || action) && (
        <div className="flex items-start justify-between mb-6 flex-shrink-0">
          <div className="flex-1">
            {title && (
              <h3 className="text-lg font-semibold text-text-primary mb-1">
                {title}
              </h3>
            )}
            {subtitle && (
              <p className="text-sm text-text-secondary">
                {subtitle}
              </p>
            )}
          </div>
          {action && (
            <div className="flex-shrink-0 ml-4">
              {action}
            </div>
          )}
        </div>
      )}

      <div className="animate-fade-in flex-1 flex flex-col min-h-0">
        {children}
      </div>
    </div>
  );
};

export default Card;

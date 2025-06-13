import React from 'react';

// Utility function for className merging
function cn(...classes: (string | undefined | null | false)[]): string {
  return classes.filter(Boolean).join(' ');
}

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  children: React.ReactNode;
  variant?: 'primary' | 'secondary' | 'outline' | 'ghost' | 'destructive';
  size?: 'sm' | 'default' | 'lg' | 'xl';
  loading?: boolean;
}

export function Button({ 
  children, 
  className = '', 
  variant = 'primary', 
  size = 'default',
  loading = false,
  disabled,
  ...props 
}: ButtonProps) {
  const baseClasses = 'inline-flex items-center justify-center rounded-lg font-medium transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 relative';
  
  const variantClasses = {
    primary: 'bg-gradient-to-r from-brand-500 to-secondary-500 text-white shadow-md hover:shadow-lg hover:from-brand-600 hover:to-secondary-600 focus-visible:ring-brand-500 transform hover:-translate-y-0.5',
    secondary: 'bg-white text-brand-700 border border-brand-200 shadow-sm hover:bg-brand-50 hover:border-brand-300 focus-visible:ring-brand-500',
    outline: 'border border-gray-300 bg-white text-gray-700 shadow-sm hover:bg-gray-50 hover:border-gray-400 focus-visible:ring-gray-500',
    ghost: 'text-gray-700 hover:bg-gray-100 hover:text-gray-900 focus-visible:ring-gray-500',
    destructive: 'bg-red-600 text-white shadow-md hover:bg-red-700 focus-visible:ring-red-500 transform hover:-translate-y-0.5'
  };
  
  const sizeClasses = {
    sm: 'h-8 px-3 text-sm',
    default: 'h-10 px-4 py-2',
    lg: 'h-12 px-6 text-lg',
    xl: 'h-14 px-8 text-xl'
  };
  
  const classes = cn(
    baseClasses, 
    variantClasses[variant], 
    sizeClasses[size], 
    className
  );
  
  return (
    <button 
      className={classes} 
      disabled={disabled || loading}
      {...props}
    >
      {loading && (
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
        </div>
      )}
      <span className={loading ? 'opacity-0' : 'opacity-100'}>
        {children}
      </span>
    </button>
  );
} 
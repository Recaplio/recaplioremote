import React from 'react';

// Utility function for className merging
function cn(...classes: (string | undefined | null | false)[]): string {
  return classes.filter(Boolean).join(' ');
}

export interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  variant?: 'default' | 'error' | 'success';
  inputSize?: 'sm' | 'default' | 'lg';
}

export interface TextareaProps extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  variant?: 'default' | 'error' | 'success';
  inputSize?: 'sm' | 'default' | 'lg';
}

const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ className, type = 'text', variant = 'default', inputSize = 'default', ...props }, ref) => {
    const baseClasses = 'block w-full rounded-lg border bg-white px-3 text-gray-900 placeholder-gray-500 shadow-sm transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-opacity-20 disabled:bg-gray-50 disabled:text-gray-500 disabled:cursor-not-allowed';
    
    const variantClasses = {
      default: 'border-gray-300 focus:border-brand-500 focus:ring-brand-500 hover:border-gray-400',
      error: 'border-red-300 focus:border-red-500 focus:ring-red-500 text-red-900 placeholder-red-400',
      success: 'border-green-300 focus:border-green-500 focus:ring-green-500 text-green-900 placeholder-green-400'
    };
    
    const sizeClasses = {
      sm: 'py-1.5 text-sm',
      default: 'py-2',
      lg: 'py-3 text-lg'
    };

    return (
      <input
        type={type}
        className={cn(
          baseClasses,
          variantClasses[variant],
          sizeClasses[inputSize],
          className
        )}
        ref={ref}
        {...props}
      />
    );
  }
);

Input.displayName = 'Input';

const Textarea = React.forwardRef<HTMLTextAreaElement, TextareaProps>(
  ({ className, variant = 'default', inputSize = 'default', ...props }, ref) => {
    const baseClasses = 'block w-full rounded-lg border bg-white px-3 text-gray-900 placeholder-gray-500 shadow-sm transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-opacity-20 disabled:bg-gray-50 disabled:text-gray-500 disabled:cursor-not-allowed resize-vertical';
    
    const variantClasses = {
      default: 'border-gray-300 focus:border-brand-500 focus:ring-brand-500 hover:border-gray-400',
      error: 'border-red-300 focus:border-red-500 focus:ring-red-500 text-red-900 placeholder-red-400',
      success: 'border-green-300 focus:border-green-500 focus:ring-green-500 text-green-900 placeholder-green-400'
    };
    
    const sizeClasses = {
      sm: 'py-1.5 text-sm min-h-[80px]',
      default: 'py-2 min-h-[100px]',
      lg: 'py-3 text-lg min-h-[120px]'
    };

    return (
      <textarea
        className={cn(
          baseClasses,
          variantClasses[variant],
          sizeClasses[inputSize],
          className
        )}
        ref={ref}
        {...props}
      />
    );
  }
);

Textarea.displayName = 'Textarea';

export { Input, Textarea }; 
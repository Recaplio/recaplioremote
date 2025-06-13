import React from 'react';

interface CardProps {
  children: React.ReactNode;
  className?: string;
  variant?: 'default' | 'elevated' | 'bordered';
}

interface CardHeaderProps {
  children: React.ReactNode;
  className?: string;
}

interface CardTitleProps {
  children: React.ReactNode;
  className?: string;
  as?: 'h1' | 'h2' | 'h3' | 'h4' | 'h5' | 'h6';
}

interface CardContentProps {
  children: React.ReactNode;
  className?: string;
}

interface CardFooterProps {
  children: React.ReactNode;
  className?: string;
}

export function Card({ children, className = '', variant = 'default' }: CardProps) {
  const variantClasses = {
    default: 'rounded-xl border border-gray-200 bg-white shadow-soft hover:shadow-medium',
    elevated: 'rounded-xl bg-white shadow-medium hover:shadow-strong border-0',
    bordered: 'rounded-xl border-2 border-gray-200 bg-white shadow-sm hover:shadow-soft hover:border-gray-300'
  };
  
  const classes = `${variantClasses[variant]} transition-all duration-300 ${className}`;
  return <div className={classes}>{children}</div>;
}

export function CardHeader({ children, className = '' }: CardHeaderProps) {
  const classes = `flex flex-col space-y-2 p-6 ${className}`;
  return <div className={classes}>{children}</div>;
}

export function CardTitle({ children, className = '', as: Component = 'h3' }: CardTitleProps) {
  const classes = `text-xl font-semibold leading-tight tracking-tight text-gray-900 ${className}`;
  return <Component className={classes}>{children}</Component>;
}

export function CardContent({ children, className = '' }: CardContentProps) {
  const classes = `p-6 pt-0 ${className}`;
  return <div className={classes}>{children}</div>;
}

export function CardFooter({ children, className = '' }: CardFooterProps) {
  const classes = `flex items-center p-6 pt-0 ${className}`;
  return <div className={classes}>{children}</div>;
} 
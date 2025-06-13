import React from 'react';

interface CardProps {
  children: React.ReactNode;
  className?: string;
}

interface CardHeaderProps {
  children: React.ReactNode;
  className?: string;
}

interface CardTitleProps {
  children: React.ReactNode;
  className?: string;
}

interface CardContentProps {
  children: React.ReactNode;
  className?: string;
}

export function Card({ children, className = '' }: CardProps) {
  const classes = `rounded-lg border border-gray-200 bg-white shadow-sm ${className}`;
  return <div className={classes}>{children}</div>;
}

export function CardHeader({ children, className = '' }: CardHeaderProps) {
  const classes = `flex flex-col space-y-1.5 p-6 ${className}`;
  return <div className={classes}>{children}</div>;
}

export function CardTitle({ children, className = '' }: CardTitleProps) {
  const classes = `text-2xl font-semibold leading-none tracking-tight ${className}`;
  return <h3 className={classes}>{children}</h3>;
}

export function CardContent({ children, className = '' }: CardContentProps) {
  const classes = `p-6 pt-0 ${className}`;
  return <div className={classes}>{children}</div>;
} 
import React from 'react';

interface InputProps {
  type?: string;
  value?: string | number;
  onChange?: (e: React.ChangeEvent<HTMLInputElement>) => void;
  placeholder?: string;
  className?: string;
  disabled?: boolean;
  min?: number;
  max?: number;
}

interface TextareaProps {
  value?: string;
  onChange?: (e: React.ChangeEvent<HTMLTextAreaElement>) => void;
  placeholder?: string;
  className?: string;
  disabled?: boolean;
  rows?: number;
}

export function Input({ 
  type = 'text', 
  value, 
  onChange, 
  placeholder, 
  className = '', 
  disabled = false,
  min,
  max
}: InputProps) {
  const baseClasses = 'block w-full rounded-md border border-gray-300 px-3 py-2 text-sm placeholder-gray-400 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 disabled:bg-gray-50 disabled:text-gray-500';
  
  return (
    <input
      type={type}
      value={value}
      onChange={onChange}
      placeholder={placeholder}
      disabled={disabled}
      min={min}
      max={max}
      className={`${baseClasses} ${className}`}
    />
  );
}

export function Textarea({ 
  value, 
  onChange, 
  placeholder, 
  className = '', 
  disabled = false,
  rows = 3
}: TextareaProps) {
  const baseClasses = 'block w-full rounded-md border border-gray-300 px-3 py-2 text-sm placeholder-gray-400 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 disabled:bg-gray-50 disabled:text-gray-500 resize-vertical';
  
  return (
    <textarea
      value={value}
      onChange={onChange}
      placeholder={placeholder}
      disabled={disabled}
      rows={rows}
      className={`${baseClasses} ${className}`}
    />
  );
} 
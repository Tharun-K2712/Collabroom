'use client';

import React from 'react';
import { cn } from '@/lib/utils';

export interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  helperText?: string;
  icon?: React.ReactNode;
  rightElement?: React.ReactNode;
}

export const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ className, label, error, helperText, icon, rightElement, id, ...props }, ref) => {
    const inputId = id || (label ? label.toLowerCase().replace(/\s+/g, '-') : undefined);

    return (
      <div className="w-full flex flex-col gap-1.5 text-left">
        {label && (
          <label htmlFor={inputId} className="text-xs font-medium text-slate-300">
            {label}
          </label>
        )}
        <div className="relative flex items-center">
          {icon && <div className="absolute left-3 text-muted pointer-events-none">{icon}</div>}
          <input
            id={inputId}
            ref={ref}
            className={cn(
              'w-full bg-input border border-border rounded-lg text-sm text-text placeholder:text-muted/60 transition-all duration-200 focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary',
              icon ? 'pl-9' : 'px-3.5',
              rightElement ? 'pr-11' : 'pr-3.5',
              'py-2',
              error ? 'border-danger focus:border-danger focus:ring-danger' : '',
              className
            )}
            {...props}
          />
          {rightElement && (
            <div className="absolute right-3 flex items-center gap-1.5 text-muted">
              {rightElement}
            </div>
          )}
        </div>
        {error && <p className="text-xs text-danger font-medium">{error}</p>}
        {helperText && !error && <p className="text-xs text-muted">{helperText}</p>}
      </div>
    );
  }
);

Input.displayName = 'Input';

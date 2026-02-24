import * as React from 'react';
import { cn } from '../../lib/utils';

export interface InputProps
  extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  success?: string;
}

const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ className, type, label, error, success, ...props }, ref) => {
    return (
      <div className="w-full">
        {label && (
          <label
            className="mb-2 block text-sm font-bold text-foreground tracking-wide"
            htmlFor={props.id}
          >
            {label}
          </label>
        )}
        <input
          type={type}
          className={cn(
            'flex h-12 w-full rounded-xl border-2 border-input bg-gradient-to-r from-background via-background to-background/80 px-4 py-3 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 transition-all duration-300 hover:border-primary-300 focus:border-primary-500 hover:shadow-lg focus:shadow-xl backdrop-blur-sm hover:scale-[1.01] focus:scale-[1.02]',
            'before:absolute before:inset-0 before:bg-gradient-to-r before:from-white/5 before:to-transparent before:opacity-0 hover:before:opacity-100 before:transition-opacity',
            error && 'border-error-500 focus-visible:ring-error-500 hover:border-error-400',
            success && 'border-success-500 focus-visible:ring-success-500 hover:border-success-400',
            className
          )}
          ref={ref}
          {...props}
        />
        {error && (
          <p className="mt-2 text-xs text-error-600 font-medium flex items-center">
            <span className="mr-1">⚠️</span>
            {error}
          </p>
        )}
        {success && (
          <p className="mt-2 text-xs text-success-600 font-medium flex items-center">
            <span className="mr-1">✅</span>
            {success}
          </p>
        )}
      </div>
    );
  }
);
Input.displayName = 'Input';

export { Input };
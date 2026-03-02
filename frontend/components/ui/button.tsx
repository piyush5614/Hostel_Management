import React from 'react';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '../../lib/utils';

const buttonVariants = cva(
  'inline-flex items-center justify-center rounded-xl text-sm font-semibold transition-all duration-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500 focus-visible:ring-offset-2 disabled:opacity-50 disabled:pointer-events-none hover:shadow-xl active:scale-95 relative overflow-hidden group btn-textured',
  {
    variants: {
      variant: {
        default: 'bg-gradient-to-r from-primary-600 via-primary-700 to-primary-800 text-white hover:from-primary-700 hover:via-primary-800 hover:to-primary-900 shadow-lg hover:shadow-2xl transform hover:scale-[1.02] before:absolute before:inset-0 before:bg-gradient-to-r before:from-white/20 before:to-transparent before:opacity-0 hover:before:opacity-100 before:transition-opacity border border-primary-500/20',
        destructive: 'bg-gradient-to-r from-error-600 via-error-700 to-error-800 text-white hover:from-error-700 hover:via-error-800 hover:to-error-900 shadow-lg hover:shadow-2xl transform hover:scale-[1.02] border border-error-500/20',
        outline: 'border-2 border-input bg-gradient-to-r from-background to-background/80 hover:bg-gradient-to-r hover:from-accent hover:to-accent/80 hover:text-accent-foreground hover:border-primary-300 hover:shadow-lg transform hover:scale-[1.02] backdrop-blur-sm',
        secondary: 'bg-gradient-to-r from-secondary-600 via-secondary-700 to-secondary-800 text-white hover:from-secondary-700 hover:via-secondary-800 hover:to-secondary-900 shadow-lg hover:shadow-2xl transform hover:scale-[1.02] border border-secondary-500/20',
        ghost: 'hover:bg-gradient-to-r hover:from-accent hover:to-accent/80 hover:text-accent-foreground hover:shadow-md transform hover:scale-[1.02] rounded-xl',
        link: 'underline-offset-4 hover:underline text-primary-600 hover:text-primary-700 transition-colors',
        success: 'bg-gradient-to-r from-success-600 via-success-700 to-success-800 text-white hover:from-success-700 hover:via-success-800 hover:to-success-900 shadow-lg hover:shadow-2xl transform hover:scale-[1.02] border border-success-500/20',
        warning: 'bg-gradient-to-r from-warning-600 via-warning-700 to-warning-800 text-white hover:from-warning-700 hover:via-warning-800 hover:to-warning-900 shadow-lg hover:shadow-2xl transform hover:scale-[1.02] border border-warning-500/20',
      },
      size: {
        default: 'h-11 py-2 px-6',
        sm: 'h-9 px-4 rounded-lg text-xs',
        lg: 'h-12 px-8 rounded-xl text-base',
        icon: 'h-11 w-11 rounded-xl',
      },
    },
    defaultVariants: {
      variant: 'default',
      size: 'default',
    },
  }
);

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  isLoading?: boolean;
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, isLoading = false, children, ...props }, ref) => {
    return (
      <button
        className={cn(buttonVariants({ variant, size, className }))}
        ref={ref}
        disabled={isLoading || props.disabled}
        {...props}
      >
        {/* Enhanced loading spinner */}
        {isLoading ? (
          <span className="mr-2 inline-block animate-spin">
            <svg
              className="h-5 w-5"
              xmlns="http://www.w3.org/2000/svg"
              fill="none"
              viewBox="0 0 24 24"
            >
              <circle
                className="opacity-25"
                cx="12"
                cy="12"
                r="10"
                stroke="currentColor"
                strokeWidth="4"
              />
              <path
                className="opacity-75"
                fill="currentColor"
                d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
              />
            </svg>
          </span>
        ) : null}
        
        {/* Enhanced button content with texture overlay */}
        <span className="relative z-10 flex items-center justify-center">
          {children}
        </span>
        
        {/* Enhanced hover effect overlay */}
        <div className="absolute inset-0 bg-gradient-to-r from-white/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none"></div>
      </button>
    );
  }
);

Button.displayName = 'Button';

export { Button, buttonVariants };
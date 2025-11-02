import * as React from 'react';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '@/lib/utils/helpers';

const buttonVariants = cva(
  'inline-flex items-center justify-center whitespace-nowrap rounded-md text-sm font-medium transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 disabled:cursor-not-allowed',
  {
    variants: {
      variant: {
        default:
          'bg-gradient-to-r from-blue-600 to-blue-500 text-white shadow-md hover:from-blue-700 hover:to-blue-600 hover:shadow-lg hover:scale-[1.02] active:scale-[0.98]',
        secondary:
          'bg-gradient-to-r from-gray-100 to-gray-50 text-gray-800 border border-gray-200 shadow-sm hover:from-gray-200 hover:to-gray-100 hover:shadow-md hover:scale-[1.02] active:scale-[0.98]',
        outline:
          'border-2 border-blue-500 text-blue-600 bg-white hover:bg-blue-50 hover:border-blue-600 hover:shadow-md hover:scale-[1.02] active:scale-[0.98]',
        ghost:
          'text-gray-600 hover:bg-gray-100 hover:text-gray-800 hover:scale-[1.02] active:scale-[0.98]',
        destructive:
          'bg-gradient-to-r from-red-600 to-red-500 text-white shadow-md hover:from-red-700 hover:to-red-600 hover:shadow-lg hover:scale-[1.02] active:scale-[0.98]',
        success:
          'bg-gradient-to-r from-green-600 to-green-500 text-white shadow-md hover:from-green-700 hover:to-green-600 hover:shadow-lg hover:scale-[1.02] active:scale-[0.98]',
        warning:
          'bg-gradient-to-r from-yellow-500 to-orange-500 text-white shadow-md hover:from-yellow-600 hover:to-orange-600 hover:shadow-lg hover:scale-[1.02] active:scale-[0.98]'
      },
      size: {
        default: 'h-9 px-4 py-2',
        sm: 'h-8 rounded-md px-3 text-xs',
        lg: 'h-11 rounded-md px-8 text-base',
        icon: 'h-9 w-9'
      }
    },
    defaultVariants: { variant: 'default', size: 'default' }
  }
);

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, ...props }, ref) => {
    return (
      <button className={cn(buttonVariants({ variant, size }), className)} ref={ref} {...props} />
    );
  }
);
Button.displayName = 'Button';

export { Button, buttonVariants };

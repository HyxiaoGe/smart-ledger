import React from 'react';
import NextLink from 'next/link';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '@/lib/utils/helpers';

const linkVariants = cva(
  'inline-flex items-center justify-center rounded-md text-sm font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50',
  {
    variants: {
      variant: {
        default: 'text-primary underline-offset-4 hover:underline',
        destructive: 'text-destructive underline-offset-4 hover:underline',
        outline: 'border border-input bg-background hover:bg-accent hover:text-accent-foreground',
        secondary: 'text-secondary-foreground underline-offset-4 hover:underline',
        ghost: 'hover:bg-accent hover:text-accent-foreground',
        link: 'text-primary underline-offset-4 hover:underline',
      },
      size: {
        default: 'h-10 px-4 py-2',
        sm: 'h-9 rounded-md px-3',
        lg: 'h-11 rounded-md px-8',
        icon: 'h-10 w-10',
      },
    },
    defaultVariants: {
      variant: 'default',
      size: 'default',
    },
  }
);

export interface LinkProps
  extends React.AnchorHTMLAttributes<HTMLAnchorElement>,
    VariantProps<typeof linkVariants> {
  href: string;
  asChild?: boolean;
}

const Link = React.forwardRef<HTMLAnchorElement, LinkProps>(
  ({ className, href, asChild = false, variant, size, ...props }, ref) => {
    if (asChild) {
      return React.cloneElement(props.children as React.ReactElement, {
        className: cn(linkVariants({ variant, size, className })),
        ref,
        ...props,
      });
    }

    return (
      <NextLink
        href={href}
        className={cn(linkVariants({ variant, size, className }))}
        ref={ref}
        {...props}
      />
    );
  }
);

Link.displayName = 'Link';

export { Link, linkVariants };
import { forwardRef, type HTMLAttributes } from 'react';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '@/lib/cn';

const cardVariants = cva(
  'rounded-lg border bg-slate-800 border-slate-700',
  {
    variants: {
      padding: {
        sm: 'p-3',
        md: 'p-4',
        lg: 'p-6',
      },
      pixelated: {
        true: 'pixel-border',
        false: '',
      },
    },
    defaultVariants: {
      padding: 'md',
      pixelated: false,
    },
  }
);

export interface KCardProps
  extends HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof cardVariants> {}

export const KCard = forwardRef<HTMLDivElement, KCardProps>(
  ({ className, padding, pixelated, children, ...props }, ref) => {
    return (
      <div
        className={cn(cardVariants({ padding, pixelated, className }))}
        ref={ref}
        {...props}
      >
        {children}
      </div>
    );
  }
);

KCard.displayName = 'KCard';

export type KCardHeaderProps = HTMLAttributes<HTMLDivElement>;

export function KCardHeader({ className, children, ...props }: KCardHeaderProps) {
  return (
    <div className={cn('flex items-center justify-between mb-3', className)} {...props}>
      {children}
    </div>
  );
}

export type KCardTitleProps = HTMLAttributes<HTMLHeadingElement>;

export function KCardTitle({ className, children, ...props }: KCardTitleProps) {
  return (
    <h3 className={cn('text-sm font-semibold text-slate-100', className)} {...props}>
      {children}
    </h3>
  );
}

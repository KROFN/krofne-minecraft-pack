import { type HTMLAttributes } from 'react';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '@/lib/cn';

const badgeVariants = cva(
  'inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium',
  {
    variants: {
      variant: {
        success: 'bg-emerald-500/20 text-emerald-400',
        warning: 'bg-amber-500/20 text-amber-400',
        error: 'bg-red-500/20 text-red-400',
        info: 'bg-sky-500/20 text-sky-400',
        neutral: 'bg-slate-500/20 text-slate-400',
      },
    },
    defaultVariants: {
      variant: 'neutral',
    },
  }
);

export interface KBadgeProps
  extends HTMLAttributes<HTMLSpanElement>,
    VariantProps<typeof badgeVariants> {}

export function KBadge({ className, variant, children, ...props }: KBadgeProps) {
  return (
    <span className={cn(badgeVariants({ variant, className }))} {...props}>
      {children}
    </span>
  );
}

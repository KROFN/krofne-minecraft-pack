import { type HTMLAttributes } from 'react';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '@/lib/cn';

const progressVariants = cva('', {
  variants: {
    variant: {
      default: 'bg-emerald-500',
      success: 'bg-emerald-500',
      warning: 'bg-amber-500',
      error: 'bg-red-500',
    },
  },
  defaultVariants: {
    variant: 'default',
  },
});

export interface KProgressProps
  extends HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof progressVariants> {
  value: number;
  label?: string;
  showPercent?: boolean;
}

export function KProgress({
  className,
  variant,
  value,
  label,
  showPercent = true,
  ...props
}: KProgressProps) {
  const clampedValue = Math.max(0, Math.min(100, value));

  return (
    <div className={cn('w-full', className)} {...props}>
      {(label || showPercent) && (
        <div className="flex items-center justify-between text-xs text-slate-400 mb-1">
          {label && <span>{label}</span>}
          {showPercent && <span>{Math.round(clampedValue)}%</span>}
        </div>
      )}
      <div className="w-full h-2 bg-slate-700 rounded-full overflow-hidden">
        <div
          className={cn(
            'h-full rounded-full transition-all duration-300 ease-out',
            progressVariants({ variant })
          )}
          style={{ width: `${clampedValue}%` }}
        />
      </div>
    </div>
  );
}

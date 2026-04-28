import { useState } from 'react';
import * as AlertDialog from '@radix-ui/react-alert-dialog';
import { KButton } from './KButton';
import { cn } from '@/lib/cn';
import { AlertTriangle, Info, AlertCircle } from 'lucide-react';

interface ConfirmDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  message: string;
  variant?: 'danger' | 'warning' | 'info';
  confirmLabel?: string;
  cancelLabel?: string;
  onConfirm: () => void;
}

const variantConfig = {
  danger: {
    icon: <AlertCircle className="w-6 h-6 text-red-400" />,
    buttonVariant: 'danger' as const,
    iconBg: 'bg-red-500/10',
  },
  warning: {
    icon: <AlertTriangle className="w-6 h-6 text-amber-400" />,
    buttonVariant: 'danger' as const,
    iconBg: 'bg-amber-500/10',
  },
  info: {
    icon: <Info className="w-6 h-6 text-sky-400" />,
    buttonVariant: 'primary' as const,
    iconBg: 'bg-sky-500/10',
  },
};

export function ConfirmDialog({
  open,
  onOpenChange,
  title,
  message,
  variant = 'warning',
  confirmLabel = 'Подтвердить',
  cancelLabel = 'Отмена',
  onConfirm,
}: ConfirmDialogProps) {
  const [loading, setLoading] = useState(false);
  const config = variantConfig[variant];

  async function handleConfirm() {
    setLoading(true);
    try {
      await onConfirm();
      onOpenChange(false);
    } catch {
      // Error handling is done by parent
    } finally {
      setLoading(false);
    }
  }

  return (
    <AlertDialog.Root open={open} onOpenChange={onOpenChange}>
      <AlertDialog.Portal>
        <AlertDialog.Overlay className="fixed inset-0 bg-black/60 data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0" />
        <AlertDialog.Content
          className={cn(
            'fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 z-50',
            'w-full max-w-md bg-slate-800 border border-slate-700 rounded-lg p-6',
            'shadow-xl'
          )}
        >
          <div className="flex items-start gap-4">
            <div className={cn('shrink-0 rounded-full p-2', config.iconBg)}>
              {config.icon}
            </div>
            <div className="flex-1">
              <AlertDialog.Title className="text-lg font-semibold text-slate-100">
                {title}
              </AlertDialog.Title>
              <AlertDialog.Description className="mt-2 text-sm text-slate-400">
                {message}
              </AlertDialog.Description>
            </div>
          </div>
          <div className="flex justify-end gap-3 mt-6">
            <AlertDialog.Cancel asChild>
              <KButton variant="secondary" onClick={() => onOpenChange(false)}>
                {cancelLabel}
              </KButton>
            </AlertDialog.Cancel>
            <AlertDialog.Action asChild>
              <KButton variant={config.buttonVariant} loading={loading} onClick={handleConfirm}>
                {confirmLabel}
              </KButton>
            </AlertDialog.Action>
          </div>
        </AlertDialog.Content>
      </AlertDialog.Portal>
    </AlertDialog.Root>
  );
}

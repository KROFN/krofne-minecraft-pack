import { KBadge } from '@/components/common/KBadge';
import { getStatusBgColor, getStatusLabel, getStatusIcon } from '@/lib/status';
import type { ModStatus } from '@shared/types/mod';

interface ModStatusBadgeProps {
  status: ModStatus;
}

export function ModStatusBadge({ status }: ModStatusBadgeProps) {
  const variantMap: Record<string, 'success' | 'warning' | 'error' | 'info' | 'neutral'> = {
    installed: 'success',
    missing: 'warning',
    wrong_hash: 'error',
    extra: 'warning',
    allowed_extra: 'info',
    download_pending: 'info',
    downloaded: 'success',
    updated: 'success',
    disabled: 'neutral',
    failed: 'error',
  };

  return (
    <KBadge variant={variantMap[status] ?? 'neutral'}>
      {getStatusIcon(status)} {getStatusLabel(status)}
    </KBadge>
  );
}

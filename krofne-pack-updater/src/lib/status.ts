import type { ModStatus } from '@shared/types/mod';

/**
 * Return Tailwind text color class for a mod status.
 */
export function getStatusColor(status: ModStatus): string {
  switch (status) {
    case 'installed':
      return 'text-emerald-500';
    case 'missing':
      return 'text-amber-500';
    case 'wrong_hash':
      return 'text-red-500';
    case 'extra':
      return 'text-orange-500';
    case 'allowed_extra':
      return 'text-sky-500';
    case 'download_pending':
      return 'text-blue-500';
    case 'downloaded':
      return 'text-green-500';
    case 'updated':
      return 'text-green-500';
    case 'disabled':
      return 'text-slate-500';
    case 'failed':
      return 'text-red-500';
    default:
      return 'text-slate-400';
  }
}

/**
 * Return Tailwind background color class for a mod status (for badges).
 */
export function getStatusBgColor(status: ModStatus): string {
  switch (status) {
    case 'installed':
      return 'bg-emerald-500/20 text-emerald-400';
    case 'missing':
      return 'bg-amber-500/20 text-amber-400';
    case 'wrong_hash':
      return 'bg-red-500/20 text-red-400';
    case 'extra':
      return 'bg-orange-500/20 text-orange-400';
    case 'allowed_extra':
      return 'bg-sky-500/20 text-sky-400';
    case 'download_pending':
      return 'bg-blue-500/20 text-blue-400';
    case 'downloaded':
      return 'bg-green-500/20 text-green-400';
    case 'updated':
      return 'bg-green-500/20 text-green-400';
    case 'disabled':
      return 'bg-slate-500/20 text-slate-400';
    case 'failed':
      return 'bg-red-500/20 text-red-400';
    default:
      return 'bg-slate-500/20 text-slate-400';
  }
}

/**
 * Return Russian label for a mod status.
 */
export function getStatusLabel(status: ModStatus): string {
  switch (status) {
    case 'installed':
      return 'Установлен';
    case 'missing':
      return 'Отсутствует';
    case 'wrong_hash':
      return 'Хэш не совпадает';
    case 'extra':
      return 'Лишний';
    case 'allowed_extra':
      return 'Разрешённый';
    case 'download_pending':
      return 'Ожидает загрузки';
    case 'downloaded':
      return 'Загружен';
    case 'updated':
      return 'Обновлён';
    case 'disabled':
      return 'Отключён';
    case 'failed':
      return 'Ошибка';
    default:
      return status;
  }
}

/**
 * Return emoji/icon for a mod status.
 */
export function getStatusIcon(status: ModStatus): string {
  switch (status) {
    case 'installed':
      return '✅';
    case 'missing':
      return '⬇️';
    case 'wrong_hash':
      return '🔁';
    case 'extra':
      return '📦';
    case 'allowed_extra':
      return '🟦';
    case 'download_pending':
      return '⏳';
    case 'downloaded':
      return '✅';
    case 'updated':
      return '🔄';
    case 'disabled':
      return '🚫';
    case 'failed':
      return '❌';
    default:
      return '❓';
  }
}

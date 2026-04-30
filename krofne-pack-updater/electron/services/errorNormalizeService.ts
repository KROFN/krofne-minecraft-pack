import type { UserFriendlyError } from '../../shared/types/sync';

let cancelRequested = false;

export function setCancelRequested(value: boolean): void {
  cancelRequested = value;
}

export function isCancelRequested(): boolean {
  return cancelRequested;
}

export function normalizeUserError(error: unknown): UserFriendlyError {
  if (!(error instanceof Error)) {
    return {
      title: 'Неизвестная ошибка',
      message: 'Произошла неожиданная ошибка. Попробуйте снова.',
      technicalDetails: String(error),
    };
  }

  const msg = error.message.toLowerCase();
  const name = error.name;

  // Cancel
  if (cancelRequested && (name === 'AbortError' || msg.includes('abort') || msg.includes('cancel'))) {
    return {
      title: 'Синхронизация отменена',
      message: 'Вы отменили синхронизацию. Уже успешно скачанные файлы сохранены.',
      technicalDetails: error.message,
    };
  }

  // Timeout
  if (name === 'TimeoutError' || name === 'AbortError' || msg.includes('timeout') || msg.includes('aborted due to timeout')) {
    return {
      title: 'Скачивание заняло слишком много времени',
      message: 'Проверь интернет и попробуй снова. Уже скачанные файлы не будут скачиваться повторно.',
      technicalDetails: error.message,
    };
  }

  // HTTP 404
  if (msg.includes('404') || msg.includes('not found')) {
    return {
      title: 'Файл не найден',
      message: 'Один из файлов модпака не найден на GitHub. Сообщи владельцу сборки.',
      technicalDetails: error.message,
    };
  }

  // Network errors
  if (msg.includes('enotfound') || msg.includes('econnreset') || msg.includes('econnrefused') ||
      msg.includes('network') || msg.includes('fetch failed') || msg.includes('internet')) {
    return {
      title: 'Проблема с интернетом',
      message: 'Не удалось скачать файл. Проверь подключение и попробуй снова.',
      technicalDetails: error.message,
    };
  }

  // SHA-512 mismatch
  if (msg.includes('hash mismatch') || msg.includes('sha512')) {
    return {
      title: 'Файл скачался повреждённым',
      message: 'Проверка SHA-512 не прошла. Попробуй снова. Если ошибка повторяется — сообщи владельцу сборки.',
      technicalDetails: error.message,
    };
  }

  // Write permission
  if (msg.includes('eacces') || msg.includes('permission') || msg.includes('eperm') || msg.includes('нет прав')) {
    return {
      title: 'Нет прав на запись',
      message: 'Приложение не может записывать файлы в выбранную папку mods. Выбери другую папку или запусти от администратора.',
      technicalDetails: error.message,
    };
  }

  // Default
  return {
    title: 'Ошибка синхронизации',
    message: error.message,
    technicalDetails: error.stack,
  };
}

import { ConfirmDialog } from '@/components/common/ConfirmDialog';
import * as api from '@/lib/api';
import type { BackupSession } from '@shared/types/backup';

interface RollbackDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  backup: BackupSession;
  onRollback: () => void;
}

export function RollbackDialog({ open, onOpenChange, backup, onRollback }: RollbackDialogProps) {
  async function handleRollback() {
    if (!api.isElectron()) return;
    await api.rollbackBackup(backup.id);
    onRollback();
  }

  return (
    <ConfirmDialog
      open={open}
      onOpenChange={onOpenChange}
      title="Откатить бэкап?"
      message={`Это восстановит состояние модов из бэкапа от ${backup.createdAt}. Текущие файлы будут заменены. Версия: ${backup.packVersionBefore ?? '—'} → ${backup.packVersionAfter}. Файлов: ${backup.fileCount}. Это действие нельзя отменить.`}
      variant="danger"
      confirmLabel="Откатить"
      cancelLabel="Отмена"
      onConfirm={handleRollback}
    />
  );
}

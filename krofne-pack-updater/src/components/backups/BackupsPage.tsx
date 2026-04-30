import { useState, useEffect, useCallback } from 'react';
import { RefreshCw, FolderOpen } from 'lucide-react';
import { useAppState } from '@/app/AppShell';
import { KButton } from '@/components/common/KButton';
import { EmptyState } from '@/components/common/EmptyState';
import { BackupCard } from './BackupCard';
import * as api from '@/lib/api';
import type { BackupSession } from '@shared/types/backup';

export function BackupsPage() {
  const [backups, setBackups] = useState<BackupSession[]>([]);
  const [loading, setLoading] = useState(false);

  const loadBackups = useCallback(async () => {
    if (!api.isElectron()) return;
    setLoading(true);
    try {
      const list = await api.listBackups();
      setBackups(list);
    } catch {
      // ignore
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadBackups();
  }, [loadBackups]);

  async function handleOpenFolder() {
    if (!api.isElectron()) return;
    try {
      // Open the backup folder — use the first backup's mods dir as reference
      await api.openFolder(backups[0]?.modsDir ?? '');
    } catch {
      // ignore
    }
  }

  if (backups.length === 0 && !loading) {
    return (
      <EmptyState
        icon={<FolderOpen className="w-12 h-12" />}
        title="Нет бэкапов"
        description="Бэкапы создаются автоматически при синхронизации модов"
        actionLabel="Обновить список"
        onAction={loadBackups}
      />
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <h2 className="text-lg font-semibold text-slate-100">Бэкапы</h2>
        <div className="flex-1" />
        <KButton variant="secondary" size="sm" onClick={loadBackups} loading={loading}>
          <RefreshCw className="w-3.5 h-3.5" />
          Обновить список
        </KButton>
        <KButton variant="ghost" size="sm" onClick={handleOpenFolder}>
          <FolderOpen className="w-3.5 h-3.5" />
          Открыть папку backup
        </KButton>
      </div>

      <div className="space-y-3">
        {backups.map((backup) => (
          <BackupCard key={backup.id} backup={backup} onRollback={loadBackups} />
        ))}
      </div>
    </div>
  );
}

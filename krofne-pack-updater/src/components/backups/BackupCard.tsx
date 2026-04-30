import { useState } from 'react';
import { ChevronDown, RotateCcw } from 'lucide-react';
import { KCard } from '@/components/common/KCard';
import { KBadge } from '@/components/common/KBadge';
import { KButton } from '@/components/common/KButton';
import { RollbackDialog } from './RollbackDialog';
import { formatDate, formatBytes } from '@/lib/format';
import { cn } from '@/lib/cn';
import type { BackupSession, BackupMeta } from '@shared/types/backup';
import * as api from '@/lib/api';

interface BackupCardProps {
  backup: BackupSession;
  onRollback: () => void;
}

export function BackupCard({ backup, onRollback }: BackupCardProps) {
  const [expanded, setExpanded] = useState(false);
  const [meta, setMeta] = useState<BackupMeta | null>(null);
  const [loadingMeta, setLoadingMeta] = useState(false);
  const [showRollback, setShowRollback] = useState(false);

  async function handleExpand() {
    if (expanded) {
      setExpanded(false);
      return;
    }

    if (!meta && api.isElectron()) {
      setLoadingMeta(true);
      try {
        const m = await api.getBackupMeta(backup.id);
        setMeta(m);
      } catch {
        // ignore
      } finally {
        setLoadingMeta(false);
      }
    }
    setExpanded(true);
  }

  return (
    <>
      <KCard padding="md">
        <div className="flex items-center gap-4">
          {/* Date */}
          <div className="min-w-[140px]">
            <p className="text-sm font-medium text-slate-200">{formatDate(backup.createdAt)}</p>
          </div>

          {/* Version change */}
          <div className="flex items-center gap-2 text-sm">
            <span className="text-slate-400">
              {backup.packVersionBefore ?? '—'}
            </span>
            <span className="text-slate-500">→</span>
            <span className="text-emerald-400">{backup.packVersionAfter}</span>
          </div>

          {/* File count */}
          <KBadge variant="neutral">{backup.fileCount} файлов</KBadge>

          <div className="flex-1" />

          <KButton variant="ghost" size="sm" onClick={handleExpand} loading={loadingMeta}>
            <ChevronDown className={cn('w-4 h-4 transition-transform', expanded && 'rotate-180')} />
          </KButton>

          <KButton variant="danger" size="sm" onClick={() => setShowRollback(true)}>
            <RotateCcw className="w-3.5 h-3.5" />
            Откатить
          </KButton>
        </div>

        {/* Expanded details */}
        {expanded && meta && (
          <div className="mt-3 pt-3 border-t border-slate-700">
            <p className="text-xs text-slate-500 mb-2">Файлы в бэкапе:</p>
            <div className="max-h-40 overflow-y-auto space-y-1">
              {meta.files.map((file, i) => (
                <div key={i} className="flex items-center justify-between text-xs">
                  <span className="text-slate-300 font-mono">{file.fileName}</span>
                  <span className="text-slate-500">{file.reason}</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </KCard>

      <RollbackDialog
        open={showRollback}
        onOpenChange={setShowRollback}
        backup={backup}
        onRollback={onRollback}
      />
    </>
  );
}

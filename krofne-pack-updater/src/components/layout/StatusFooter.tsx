import { AlertTriangle, FolderOpen } from 'lucide-react';
import { useAppState } from '@/app/AppShell';
import * as api from '@/lib/api';
import { cn } from '@/lib/cn';

export function StatusFooter() {
  const { modsPath, syncProgress, needsRecovery, isSyncing } = useAppState();

  const progressPct = syncProgress?.percent ?? 0;

  return (
    <footer className="h-9 bg-slate-900 border-t border-slate-700 flex items-center px-4 text-xs text-slate-400 gap-4 shrink-0">
      {/* Mods path */}
      <div className="flex items-center gap-1.5 min-w-0">
        <FolderOpen className="w-3 h-3 shrink-0" />
        <span className="truncate">
          {modsPath || 'Папка не выбрана'}
        </span>
      </div>

      {/* Sync progress */}
      {isSyncing && syncProgress && (
        <div className="flex items-center gap-2 flex-1">
          <div className="flex-1 h-1.5 bg-slate-700 rounded-full overflow-hidden">
            <div
              className={cn(
                'h-full rounded-full transition-all duration-300',
                syncProgress.phase === 'error' ? 'bg-red-500' : 'bg-emerald-500'
              )}
              style={{ width: `${progressPct}%` }}
            />
          </div>
          <span className="text-slate-300 whitespace-nowrap">
            {progressPct}% — {syncProgress.message || syncProgress.phase}
          </span>
        </div>
      )}

      {/* Recovery warning */}
      {needsRecovery && (
        <button
          onClick={() => {
            if (api.isElectron()) {
              api.performRecovery().catch(() => {});
            }
          }}
          className="flex items-center gap-1 text-amber-400 hover:text-amber-300"
        >
          <AlertTriangle className="w-3 h-3" />
          Требуется восстановление
        </button>
      )}

      {/* Spacer */}
      {!isSyncing && <div className="flex-1" />}

      {/* Last action */}
      {!isSyncing && syncProgress && syncProgress.phase === 'done' && (
        <span className="text-emerald-400">✓ Синхронизация завершена</span>
      )}
    </footer>
  );
}

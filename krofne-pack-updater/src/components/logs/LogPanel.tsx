import { useState, useEffect, useCallback } from 'react';
import { Copy, FolderOpen, Trash2 } from 'lucide-react';
import { useAppState } from '@/app/AppShell';
import { KCard } from '@/components/common/KCard';
import { KButton } from '@/components/common/KButton';
import { KBadge } from '@/components/common/KBadge';
import { EmptyState } from '@/components/common/EmptyState';
import * as api from '@/lib/api';
import { cn } from '@/lib/cn';
import type { SyncLogEntry, LogLevel } from '@shared/types/logs';

const levelColors: Record<LogLevel, string> = {
  info: 'text-slate-400',
  warn: 'text-amber-400',
  error: 'text-red-400',
  debug: 'text-slate-500',
};

const levelBadgeVariants: Record<LogLevel, 'success' | 'warning' | 'error' | 'neutral'> = {
  info: 'neutral',
  warn: 'warning',
  error: 'error',
  debug: 'neutral',
};

export function LogPanel() {
  const { logs, setLogs } = useAppState();
  const [loading, setLoading] = useState(false);
  const [copied, setCopied] = useState(false);

  const loadLogs = useCallback(async () => {
    if (!api.isElectron()) return;
    setLoading(true);
    try {
      const entries = await api.getLogs();
      setLogs(entries);
    } catch {
      // ignore
    } finally {
      setLoading(false);
    }
  }, [setLogs]);

  useEffect(() => {
    loadLogs();
  }, [loadLogs]);

  async function handleCopy() {
    if (!api.isElectron()) return;
    try {
      await api.copyLogsToClipboard();
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // ignore
    }
  }

  async function handleOpenFolder() {
    if (!api.isElectron()) return;
    try {
      await api.openLogsFolder();
    } catch {
      // ignore
    }
  }

  if (logs.length === 0 && !loading) {
    return (
      <EmptyState
        icon={<Trash2 className="w-12 h-12" />}
        title="Нет логов"
        description="Логи появятся после проверки или синхронизации"
        actionLabel="Обновить"
        onAction={loadLogs}
      />
    );
  }

  return (
    <div className="space-y-3">
      {/* Actions */}
      <div className="flex items-center gap-2">
        <KButton variant="secondary" size="sm" onClick={loadLogs} loading={loading}>
          Обновить
        </KButton>
        <KButton variant="secondary" size="sm" onClick={handleCopy}>
          <Copy className="w-3.5 h-3.5" />
          {copied ? 'Скопировано!' : 'Скопировать лог'}
        </KButton>
        <KButton variant="ghost" size="sm" onClick={handleOpenFolder}>
          <FolderOpen className="w-3.5 h-3.5" />
          Открыть папку логов
        </KButton>
      </div>

      {/* Log entries */}
      <div className="bg-slate-900 border border-slate-700 rounded-lg max-h-[60vh] overflow-y-auto">
        {logs.map((entry) => (
          <div
            key={entry.id}
            className="flex items-start gap-3 px-3 py-2 border-b border-slate-800 last:border-0 hover:bg-slate-800/50"
          >
            <span className="text-xs text-slate-600 font-mono whitespace-nowrap mt-0.5">
              {entry.time}
            </span>
            <KBadge variant={levelBadgeVariants[entry.level]} className="shrink-0 mt-0.5">
              {entry.level.toUpperCase()}
            </KBadge>
            <span className={cn('text-sm flex-1', levelColors[entry.level])}>
              {entry.message}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

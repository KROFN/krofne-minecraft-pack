import { useState } from 'react';
import { RefreshCw, Play, Ban } from 'lucide-react';
import { useAppState } from '@/app/AppShell';
import { KButton } from '@/components/common/KButton';
import { KProgress } from '@/components/common/KProgress';
import * as api from '@/lib/api';

export function MainActionPanel() {
  const state = useAppState();
  const [cancelling, setCancelling] = useState(false);

  async function handleCheck() {
    if (!api.isElectron()) return;
    state.setError(null);
    state.setUserFriendlyError(null);
    try {
      const plan = await api.checkMods();
      state.setSyncPlan(plan);
      state.setManifest(plan.manifest);
    } catch (err) {
      state.setError(err instanceof Error ? err.message : String(err));
    }
  }

  async function handleSync() {
    if (!api.isElectron() || !state.syncPlan) return;
    state.setIsSyncing(true);
    state.setError(null);
    state.setUserFriendlyError(null);
    try {
      await api.synchronize(state.syncPlan);
      state.setIsSyncing(false);
    } catch (err) {
      state.setIsSyncing(false);
      const errMsg = err instanceof Error ? err.message : String(err);
      state.setError(errMsg);

      // Try to parse as user-friendly error
      try {
        const parsed = JSON.parse(errMsg);
        if (parsed && parsed.title && parsed.message) {
          state.setUserFriendlyError(parsed);
        }
      } catch {
        state.setUserFriendlyError({
          title: 'Ошибка синхронизации',
          message: errMsg,
        });
      }
    }
  }

  async function handleCancel() {
    if (!api.isElectron()) return;
    setCancelling(true);
    try {
      await api.cancelSync();
      state.setIsSyncing(false);
    } catch {
      state.setIsSyncing(false);
    } finally {
      setCancelling(false);
    }
  }

  function formatBytes(bytes: number | undefined | null): string {
    if (bytes == null || bytes === 0) return '';
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  }

  const progress = state.syncProgress;
  const totalPercent = progress?.totalBytes && progress.totalBytes > 0
    ? Math.round((progress.totalDownloadedBytes ?? 0) / progress.totalBytes * 100)
    : progress?.percent ?? 0;

  return (
    <div className="bg-slate-800 border border-slate-700 rounded-lg p-6">
      <div className="flex flex-col sm:flex-row items-center gap-4">
        <KButton
          size="lg"
          onClick={handleCheck}
          disabled={state.isSyncing}
        >
          <RefreshCw className="w-5 h-5" />
          Проверить
        </KButton>

        {state.syncPlan && state.syncPlan.summary.totalActions > 0 && (
          <KButton
            size="lg"
            onClick={handleSync}
            loading={state.isSyncing}
            disabled={state.isSyncing}
          >
            <Play className="w-5 h-5" />
            Синхронизировать ({state.syncPlan.summary.totalActions} действий)
          </KButton>
        )}

        {state.isSyncing && (
          <KButton
            variant="secondary"
            size="lg"
            onClick={handleCancel}
            loading={cancelling}
          >
            <Ban className="w-5 h-5" />
            Отменить
          </KButton>
        )}

        {state.error && !state.isSyncing && (
          <div className="text-sm">
            {state.userFriendlyError ? (
              <>
                <p className="text-red-400 font-medium">{state.userFriendlyError.title}</p>
                <p className="text-red-400/80">{state.userFriendlyError.message}</p>
                {state.userFriendlyError.technicalDetails && state.settings.debugMode && (
                  <details className="mt-1">
                    <summary className="text-xs text-slate-500 cursor-pointer">Технические детали</summary>
                    <pre className="mt-1 text-xs text-slate-600 whitespace-pre-wrap break-all max-h-32 overflow-y-auto">
                      {state.userFriendlyError.technicalDetails}
                    </pre>
                  </details>
                )}
              </>
            ) : (
              <p className="text-red-400">{state.error}</p>
            )}
          </div>
        )}
      </div>

      {state.isSyncing && progress && (
        <div className="mt-4 space-y-3">
          <KProgress
            value={totalPercent}
            variant={progress.phase === 'error' ? 'error' : 'default'}
            label={progress.message || progress.phase}
            showPercent
          />

          {/* File-level progress */}
          {progress.currentFileName && (
            <div className="bg-slate-900/50 rounded-lg p-3 space-y-2">
              <div className="flex items-center justify-between text-xs">
                <span className="text-slate-400 truncate mr-2">
                  {progress.currentFileName}
                </span>
                {progress.filePercent != null && (
                  <span className="text-slate-300 shrink-0">{progress.filePercent}%</span>
                )}
              </div>
              {progress.fileDownloadedBytes != null && progress.fileTotalBytes != null && progress.fileTotalBytes > 0 && (
                <KProgress
                  value={progress.filePercent ?? 0}
                  variant="default"
                />
              )}
            </div>
          )}

          {/* Total download progress */}
          {progress.totalBytes != null && progress.totalBytes > 0 && (
            <p className="text-xs text-slate-500 text-center">
              {formatBytes(progress.totalDownloadedBytes)} / {formatBytes(progress.totalBytes)} • {progress.completedActions}/{progress.totalActions} файлов
            </p>
          )}

          {!progress.totalBytes && progress.currentFile && (
            <p className="text-xs text-slate-500 truncate">
              {progress.currentFile}
            </p>
          )}
        </div>
      )}
    </div>
  );
}

import { RefreshCw, Play } from 'lucide-react';
import { useAppState } from '@/app/AppShell';
import { KButton } from '@/components/common/KButton';
import { KProgress } from '@/components/common/KProgress';
import * as api from '@/lib/api';

export function MainActionPanel() {
  const state = useAppState();

  async function handleCheck() {
    if (!api.isElectron()) return;
    state.setError(null);
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
    try {
      await api.synchronize(state.syncPlan);
      state.setIsSyncing(false);
    } catch (err) {
      state.setIsSyncing(false);
      state.setError(err instanceof Error ? err.message : String(err));
    }
  }

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

        {state.error && (
          <p className="text-sm text-red-400">{state.error}</p>
        )}
      </div>

      {state.isSyncing && state.syncProgress && (
        <div className="mt-4">
          <KProgress
            value={state.syncProgress.percent}
            variant={state.syncProgress.phase === 'error' ? 'error' : 'default'}
            label={state.syncProgress.message || state.syncProgress.phase}
            showPercent
          />
          {state.syncProgress.currentFile && (
            <p className="text-xs text-slate-500 mt-1 truncate">
              {state.syncProgress.currentFile}
            </p>
          )}
        </div>
      )}
    </div>
  );
}

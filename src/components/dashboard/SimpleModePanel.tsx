import { useState, useCallback } from 'react';
import {
  FolderSearch,
  CheckCircle2,
  DownloadCloud,
  Loader2,
  AlertCircle,
  RefreshCw,
  ChevronRight,
  FolderOpen,
} from 'lucide-react';
import { useAppState } from '@/app/AppShell';
import * as api from '@/lib/api';
import { KButton } from '@/components/common/KButton';
import { KCard } from '@/components/common/KCard';
import { KProgress } from '@/components/common/KProgress';
import { cn } from '@/lib/cn';
import type { MinecraftFolderCandidate } from '@shared/types/ipc';

type SimpleStep =
  | 'no_path'
  | 'path_found'
  | 'checking'
  | 'up_to_date'
  | 'needs_update'
  | 'syncing'
  | 'done'
  | 'error';

export function SimpleModePanel() {
  const state = useAppState();
  const [step, setStep] = useState<SimpleStep>(
    state.modsPath ? 'path_found' : 'no_path'
  );
  const [candidates, setCandidates] = useState<MinecraftFolderCandidate[]>([]);
  const [detecting, setDetecting] = useState(false);

  // ─── Folder Detection ─────────────────────────────────────────────
  const handleDetectFolders = useCallback(async () => {
    if (!api.isElectron()) return;
    setDetecting(true);
    try {
      const found = await api.detectMinecraftFolders();
      setCandidates(found);
    } catch (err) {
      state.setError(err instanceof Error ? err.message : String(err));
    } finally {
      setDetecting(false);
    }
  }, [state]);

  const handleSelectCandidate = useCallback(async (modsPath: string) => {
    const newSettings = { ...state.settings, lastModsPath: modsPath };
    state.setSettings(newSettings);
    state.setModsPath(modsPath);
    if (api.isElectron()) {
      await api.saveSettings({ lastModsPath: modsPath });
    }
    setStep('path_found');
  }, [state]);

  const handleManualSelect = useCallback(async () => {
    if (!api.isElectron()) return;
    try {
      const path = await api.selectModsFolder();
      if (path) {
        state.setModsPath(path);
        state.setSettings({ ...state.settings, lastModsPath: path });
        setStep('path_found');
      }
    } catch (err) {
      state.setError(err instanceof Error ? err.message : String(err));
    }
  }, [state]);

  // ─── Check Mods ───────────────────────────────────────────────────
  const handleCheck = useCallback(async () => {
    if (!api.isElectron()) return;
    setStep('checking');
    state.setError(null);
    try {
      const plan = await api.checkMods();
      state.setSyncPlan(plan);
      state.setManifest(plan.manifest);
      if (plan.summary.totalActions === 0) {
        setStep('up_to_date');
      } else {
        setStep('needs_update');
      }
    } catch (err) {
      state.setError(err instanceof Error ? err.message : String(err));
      setStep('error');
    }
  }, [state]);

  // ─── Synchronize ──────────────────────────────────────────────────
  const handleSync = useCallback(async () => {
    if (!api.isElectron() || !state.syncPlan) return;
    setStep('syncing');
    state.setIsSyncing(true);
    state.setError(null);
    try {
      await api.synchronize(state.syncPlan);
      state.setIsSyncing(false);
      setStep('done');
      // Update settings with new pack version
      if (state.syncPlan.manifest) {
        state.setSettings({
          ...state.settings,
          lastSuccessfulPackVersion: state.syncPlan.manifest.packVersion,
        });
      }
    } catch (err) {
      state.setIsSyncing(false);
      state.setError(err instanceof Error ? err.message : String(err));
      setStep('error');
    }
  }, [state]);

  const handleRetry = useCallback(() => {
    state.setError(null);
    setStep(state.modsPath ? 'path_found' : 'no_path');
  }, [state]);

  // ─── Render Steps ─────────────────────────────────────────────────

  // No mods path
  if (step === 'no_path') {
    return (
      <div className="space-y-6">
        <div className="text-center">
          <FolderSearch className="w-16 h-16 text-slate-500 mx-auto mb-4" />
          <h2 className="text-2xl font-bold text-slate-100 mb-2">
            Найдите папку модов
          </h2>
          <p className="text-slate-400">
            Укажите папку <span className="text-slate-200">.minecraft/mods</span>, чтобы проверить и обновить моды
          </p>
        </div>

        <KButton size="lg" className="w-full" onClick={handleDetectFolders} loading={detecting}>
          <FolderSearch className="w-5 h-5" />
          Найти автоматически
        </KButton>

        {candidates.length > 0 && (
          <div className="space-y-2">
            {candidates.map((c, i) => (
              <button
                key={i}
                onClick={() => handleSelectCandidate(c.modsPath)}
                className="w-full flex items-center gap-3 p-3 bg-slate-800 border border-slate-700 rounded-lg hover:border-emerald-500/50 transition-colors text-left"
              >
                <FolderOpen className="w-5 h-5 text-emerald-500 shrink-0" />
                <div className="flex-1 min-w-0">
                  <div className="text-sm text-slate-200 font-medium truncate">{c.label}</div>
                  <div className="text-xs text-slate-400 truncate">{c.modsPath}</div>
                </div>
                <span className={cn(
                  'text-xs px-2 py-0.5 rounded',
                  c.confidence === 'high' ? 'bg-emerald-500/20 text-emerald-400' :
                  c.confidence === 'medium' ? 'bg-amber-500/20 text-amber-400' :
                  'bg-slate-500/20 text-slate-400'
                )}>
                  {c.confidence === 'high' ? 'Точно' : c.confidence === 'medium' ? 'Возможно' : 'Может быть'}
                </span>
              </button>
            ))}
          </div>
        )}

        <div className="relative">
          <div className="absolute inset-0 flex items-center">
            <div className="w-full border-t border-slate-700" />
          </div>
          <div className="relative flex justify-center text-xs">
            <span className="bg-background px-2 text-slate-500">или</span>
          </div>
        </div>

        <KButton variant="secondary" size="lg" className="w-full" onClick={handleManualSelect}>
          <FolderOpen className="w-5 h-5" />
          Выбрать папку вручную
        </KButton>
      </div>
    );
  }

  // Path found — show check button
  if (step === 'path_found') {
    return (
      <div className="space-y-6">
        <div className="text-center">
          <FolderOpen className="w-16 h-16 text-emerald-500/60 mx-auto mb-4" />
          <h2 className="text-2xl font-bold text-slate-100 mb-2">
            Папка найдена
          </h2>
          <p className="text-sm text-slate-400 mb-1">
            Моды будут проверены в:
          </p>
          <p className="text-sm text-emerald-400 font-mono bg-slate-800 px-3 py-2 rounded-lg break-all">
            {state.modsPath}
          </p>
        </div>

        <KButton size="lg" className="w-full" onClick={handleCheck}>
          <RefreshCw className="w-5 h-5" />
          Проверить моды
        </KButton>

        <KButton variant="ghost" size="sm" className="w-full" onClick={() => { state.setModsPath(null); setStep('no_path'); }}>
          Выбрать другую папку
        </KButton>
      </div>
    );
  }

  // Checking
  if (step === 'checking') {
    return (
      <div className="text-center py-8">
        <Loader2 className="w-16 h-16 text-emerald-500 mx-auto mb-4 animate-spin" />
        <h2 className="text-2xl font-bold text-slate-100 mb-2">
          Проверяем моды...
        </h2>
        <p className="text-slate-400">
          Загружаем манифест и сверяем файлы
        </p>
      </div>
    );
  }

  // Up to date
  if (step === 'up_to_date') {
    return (
      <div className="space-y-6">
        <div className="text-center">
          <CheckCircle2 className="w-20 h-20 text-emerald-500 mx-auto mb-4" />
          <h2 className="text-2xl font-bold text-slate-100 mb-2">
            Всё актуально!
          </h2>
          <p className="text-slate-400">
            Все моды соответствуют сборке
          </p>
        </div>

        {state.manifest && (
          <KCard padding="md" className="text-center">
            <p className="text-lg font-semibold text-slate-200">{state.manifest.packName}</p>
            <p className="text-sm text-slate-400">
              v{state.manifest.packVersion} • {state.manifest.minecraftVersion} • {state.manifest.loader}
            </p>
          </KCard>
        )}

        <KButton variant="secondary" size="lg" className="w-full" onClick={handleCheck}>
          <RefreshCw className="w-5 h-5" />
          Проверить ещё раз
        </KButton>
      </div>
    );
  }

  // Needs update
  if (step === 'needs_update') {
    const plan = state.syncPlan;
    return (
      <div className="space-y-6">
        <div className="text-center">
          <DownloadCloud className="w-16 h-16 text-amber-500 mx-auto mb-4" />
          <h2 className="text-2xl font-bold text-slate-100 mb-2">
            Доступно обновление
          </h2>
          <p className="text-slate-400">
            Необходимо выполнить {plan?.summary.totalActions ?? 0} действий
          </p>
        </div>

        {state.manifest && (
          <KCard padding="md" className="text-center">
            <p className="text-lg font-semibold text-slate-200">{state.manifest.packName}</p>
            <p className="text-sm text-slate-400">
              v{state.manifest.packVersion} • {state.manifest.minecraftVersion} • {state.manifest.loader}
            </p>
          </KCard>
        )}

        {plan && (
          <div className="grid grid-cols-2 gap-3">
            {plan.summary.missingCount > 0 && (
              <div className="bg-amber-500/10 border border-amber-500/20 rounded-lg p-3 text-center">
                <div className="text-2xl font-bold text-amber-400">{plan.summary.missingCount}</div>
                <div className="text-xs text-amber-400/80">Скачать</div>
              </div>
            )}
            {plan.summary.wrongHashCount > 0 && (
              <div className="bg-red-500/10 border border-red-500/20 rounded-lg p-3 text-center">
                <div className="text-2xl font-bold text-red-400">{plan.summary.wrongHashCount}</div>
                <div className="text-xs text-red-400/80">Заменить</div>
              </div>
            )}
            {plan.summary.extraCount > 0 && (
              <div className="bg-orange-500/10 border border-orange-500/20 rounded-lg p-3 text-center">
                <div className="text-2xl font-bold text-orange-400">{plan.summary.extraCount}</div>
                <div className="text-xs text-orange-400/80">Лишние</div>
              </div>
            )}
            {plan.summary.installedCount > 0 && (
              <div className="bg-emerald-500/10 border border-emerald-500/20 rounded-lg p-3 text-center">
                <div className="text-2xl font-bold text-emerald-400">{plan.summary.installedCount}</div>
                <div className="text-xs text-emerald-400/80">Установлено</div>
              </div>
            )}
          </div>
        )}

        <KButton size="lg" className="w-full" onClick={handleSync}>
          <ChevronRight className="w-5 h-5" />
          Синхронизировать
        </KButton>
      </div>
    );
  }

  // Syncing
  if (step === 'syncing') {
    return (
      <div className="space-y-6">
        <div className="text-center">
          <Loader2 className="w-16 h-16 text-emerald-500 mx-auto mb-4 animate-spin" />
          <h2 className="text-2xl font-bold text-slate-100 mb-2">
            Синхронизация...
          </h2>
          <p className="text-slate-400">
            {state.syncProgress?.message || 'Подготовка...'}
          </p>
        </div>

        <KProgress
          value={state.syncProgress?.percent ?? 0}
          variant={state.syncProgress?.phase === 'error' ? 'error' : 'default'}
          showPercent
        />

        {state.syncProgress?.currentFile && (
          <p className="text-xs text-slate-500 text-center truncate">
            {state.syncProgress.currentFile}
          </p>
        )}
      </div>
    );
  }

  // Done
  if (step === 'done') {
    return (
      <div className="space-y-6">
        <div className="text-center">
          <CheckCircle2 className="w-20 h-20 text-emerald-500 mx-auto mb-4" />
          <h2 className="text-2xl font-bold text-slate-100 mb-2">
            Готово!
          </h2>
          <p className="text-slate-400">
            Синхронизация завершена успешно
          </p>
        </div>

        {state.manifest && (
          <KCard padding="md" className="text-center">
            <p className="text-lg font-semibold text-slate-200">{state.manifest.packName}</p>
            <p className="text-sm text-slate-400">
              v{state.manifest.packVersion} • {state.manifest.minecraftVersion} • {state.manifest.loader}
            </p>
          </KCard>
        )}

        <KButton variant="secondary" size="lg" className="w-full" onClick={handleCheck}>
          <RefreshCw className="w-5 h-5" />
          Проверить ещё раз
        </KButton>
      </div>
    );
  }

  // Error
  if (step === 'error') {
    return (
      <div className="space-y-6">
        <div className="text-center">
          <AlertCircle className="w-16 h-16 text-red-500 mx-auto mb-4" />
          <h2 className="text-2xl font-bold text-slate-100 mb-2">
            Ошибка
          </h2>
          <p className="text-sm text-red-400 bg-red-500/10 rounded-lg p-3">
            {state.error || 'Неизвестная ошибка'}
          </p>
        </div>

        <KButton size="lg" className="w-full" onClick={handleRetry}>
          <RefreshCw className="w-5 h-5" />
          Попробовать снова
        </KButton>
      </div>
    );
  }

  return null;
}

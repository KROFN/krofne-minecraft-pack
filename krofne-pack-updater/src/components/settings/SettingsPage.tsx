import { useState } from 'react';
import { Save, RotateCcw, Info, Trash2 } from 'lucide-react';
import { useAppState } from '@/app/AppShell';
import { KCard, KCardHeader, KCardTitle } from '@/components/common/KCard';
import { KButton } from '@/components/common/KButton';
import { KBadge } from '@/components/common/KBadge';
import * as api from '@/lib/api';
import { DEFAULT_SETTINGS } from '@shared/types/settings';
import { APP_VERSION } from '@shared/constants';

export function SettingsPage() {
  const { settings, setSettings } = useAppState();
  const [manifestUrl, setManifestUrl] = useState(settings.manifestUrl);
  const [uiMode, setUiMode] = useState<'simple' | 'detailed'>(settings.uiMode);
  const [debugMode, setDebugMode] = useState(settings.debugMode);
  const [maxParallel, setMaxParallel] = useState(settings.maxParallelDownloads);
  const [retries, setRetries] = useState(settings.downloadRetries);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [checkingUpdate, setCheckingUpdate] = useState(false);
  const [updateInfo, setUpdateInfo] = useState<{ hasUpdate: boolean; version: string | null } | null>(null);
  const [clearingCache, setClearingCache] = useState(false);
  const [cacheCleared, setCacheCleared] = useState(false);
  const [showCacheConfirm, setShowCacheConfirm] = useState(false);

  async function handleSave() {
    setSaving(true);
    try {
      const newSettings = {
        ...settings,
        manifestUrl,
        uiMode,
        debugMode,
        maxParallelDownloads: maxParallel,
        downloadRetries: retries,
      };
      setSettings(newSettings);
      if (api.isElectron()) {
        await api.saveSettings({
          manifestUrl,
          uiMode,
          debugMode,
          maxParallelDownloads: maxParallel,
          downloadRetries: retries,
        });
      }
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    } catch {
      // ignore
    } finally {
      setSaving(false);
    }
  }

  function handleResetUrl() {
    setManifestUrl(DEFAULT_SETTINGS.manifestUrl);
  }

  async function handleCheckUpdate() {
    if (!api.isElectron()) return;
    setCheckingUpdate(true);
    try {
      const info = await api.checkAppUpdate();
      setUpdateInfo({ hasUpdate: info.hasUpdate, version: info.latestVersion });
    } catch {
      setUpdateInfo({ hasUpdate: false, version: null });
    } finally {
      setCheckingUpdate(false);
    }
  }

  return (
    <div className="space-y-6 max-w-2xl">
      <h2 className="text-lg font-semibold text-slate-100">Настройки</h2>

      {/* Manifest URL */}
      <KCard padding="md">
        <KCardHeader>
          <KCardTitle>URL манифеста</KCardTitle>
        </KCardHeader>
        <div className="flex gap-2">
          <input
            type="text"
            value={manifestUrl}
            onChange={(e) => setManifestUrl(e.target.value)}
            className="flex-1 px-3 py-2 bg-slate-900 border border-slate-700 rounded-lg text-sm text-slate-200 font-mono focus:outline-none focus:border-emerald-500/50"
          />
          <KButton variant="secondary" size="sm" onClick={handleResetUrl}>
            <RotateCcw className="w-3.5 h-3.5" />
            Сбросить
          </KButton>
        </div>
      </KCard>

      {/* UI Mode */}
      <KCard padding="md">
        <KCardHeader>
          <KCardTitle>Режим интерфейса</KCardTitle>
        </KCardHeader>
        <div className="flex gap-2">
          <button
            onClick={() => setUiMode('simple')}
            className={`flex-1 px-4 py-3 rounded-lg border text-sm font-medium transition-colors ${
              uiMode === 'simple'
                ? 'bg-emerald-500/10 border-emerald-500/50 text-emerald-400'
                : 'bg-slate-900 border-slate-700 text-slate-400 hover:text-slate-300'
            }`}
          >
            Простой
            <p className="text-xs font-normal mt-0.5 opacity-70">Минимальный интерфейс для обновления</p>
          </button>
          <button
            onClick={() => setUiMode('detailed')}
            className={`flex-1 px-4 py-3 rounded-lg border text-sm font-medium transition-colors ${
              uiMode === 'detailed'
                ? 'bg-emerald-500/10 border-emerald-500/50 text-emerald-400'
                : 'bg-slate-900 border-slate-700 text-slate-400 hover:text-slate-300'
            }`}
          >
            Подробный
            <p className="text-xs font-normal mt-0.5 opacity-70">Таблицы модов, логи, детали</p>
          </button>
        </div>
      </KCard>

      {/* Debug Mode */}
      <KCard padding="md">
        <KCardHeader>
          <KCardTitle>Режим отладки</KCardTitle>
        </KCardHeader>
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm text-slate-300">Показывать хэши, URL загрузки и технические данные</p>
          </div>
          <button
            onClick={() => setDebugMode(!debugMode)}
            className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
              debugMode ? 'bg-emerald-600' : 'bg-slate-700'
            }`}
          >
            <span
              className={`inline-block h-4 w-4 rounded-full bg-white transition-transform ${
                debugMode ? 'translate-x-6' : 'translate-x-1'
              }`}
            />
          </button>
        </div>
      </KCard>

      {/* Download settings */}
      <KCard padding="md">
        <KCardHeader>
          <KCardTitle>Загрузки</KCardTitle>
        </KCardHeader>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="text-xs text-slate-400 block mb-1">Параллельных загрузок</label>
            <input
              type="number"
              min={1}
              max={10}
              value={maxParallel}
              onChange={(e) => setMaxParallel(parseInt(e.target.value) || 3)}
              className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-lg text-sm text-slate-200 focus:outline-none focus:border-emerald-500/50"
            />
          </div>
          <div>
            <label className="text-xs text-slate-400 block mb-1">Попыток загрузки</label>
            <input
              type="number"
              min={1}
              max={10}
              value={retries}
              onChange={(e) => setRetries(parseInt(e.target.value) || 3)}
              className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-lg text-sm text-slate-200 focus:outline-none focus:border-emerald-500/50"
            />
          </div>
        </div>
      </KCard>

      {/* Download Cache */}
      <KCard padding="md">
        <KCardHeader>
          <KCardTitle>Cache загрузок</KCardTitle>
        </KCardHeader>
        <div className="space-y-3">
          <p className="text-sm text-slate-400">
            Скачанные и проверенные файлы сохраняются в <code className="text-slate-300 bg-slate-900 px-1.5 py-0.5 rounded">_krofne_download_cache</code>.
            При повторной синхронизации файлы из cache не скачиваются заново.
          </p>
          {showCacheConfirm ? (
            <div className="bg-amber-500/10 border border-amber-500/20 rounded-lg p-3 space-y-2">
              <p className="text-sm text-amber-400">Удалить все файлы из cache? Это безопасно — при следующей синхронизации файлы скачаются заново.</p>
              <div className="flex gap-2">
                <KButton variant="secondary" size="sm" onClick={async () => {
                  setShowCacheConfirm(false);
                  if (!api.isElectron()) return;
                  setClearingCache(true);
                  try {
                    await api.clearDownloadCache();
                    setCacheCleared(true);
                    setTimeout(() => setCacheCleared(false), 3000);
                  } catch {
                    // ignore
                  } finally {
                    setClearingCache(false);
                  }
                }} loading={clearingCache}>
                  Да, удалить
                </KButton>
                <KButton variant="ghost" size="sm" onClick={() => setShowCacheConfirm(false)}>
                  Отмена
                </KButton>
              </div>
            </div>
          ) : (
            <KButton variant="secondary" size="sm" onClick={() => setShowCacheConfirm(true)}>
              <Trash2 className="w-3.5 h-3.5" />
              {cacheCleared ? 'Cache очищен!' : 'Очистить cache'}
            </KButton>
          )}
        </div>
      </KCard>

      {/* Save button */}
      <KButton size="lg" className="w-full" onClick={handleSave} loading={saving}>
        <Save className="w-5 h-5" />
        {saved ? 'Сохранено!' : 'Сохранить настройки'}
      </KButton>

      {/* App info */}
      <KCard padding="md">
        <KCardHeader>
          <KCardTitle className="flex items-center gap-2">
            <Info className="w-4 h-4 text-slate-500" />
            О приложении
          </KCardTitle>
        </KCardHeader>
        <div className="space-y-2">
          <div className="flex items-center justify-between text-sm">
            <span className="text-slate-400">Версия</span>
            <span className="text-slate-200">v{APP_VERSION}</span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-sm text-slate-400">Обновления</span>
            {updateInfo ? (
              <KBadge variant={updateInfo.hasUpdate ? 'info' : 'success'}>
                {updateInfo.hasUpdate ? `Доступно v${updateInfo.version}` : 'Актуально'}
              </KBadge>
            ) : (
              <KButton variant="ghost" size="sm" onClick={handleCheckUpdate} loading={checkingUpdate}>
                Проверить
              </KButton>
            )}
          </div>
        </div>
      </KCard>
    </div>
  );
}

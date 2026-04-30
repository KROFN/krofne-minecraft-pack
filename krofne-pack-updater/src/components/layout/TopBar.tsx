import { useState, useEffect } from 'react';
import { RefreshCw, Bug, Monitor, Smartphone } from 'lucide-react';
import { useAppState } from '@/app/AppShell';
import * as api from '@/lib/api';
import type { AppUpdateInfo } from '@shared/types/ipc';

export function TopBar() {
  const { settings, setSettings, manifest } = useAppState();
  const [updateInfo, setUpdateInfo] = useState<AppUpdateInfo | null>(null);

  useEffect(() => {
    if (!api.isElectron()) return;
    api.checkAppUpdate().then(setUpdateInfo).catch(() => {});
  }, []);

  function toggleUiMode() {
    const newMode: 'simple' | 'detailed' = settings.uiMode === 'simple' ? 'detailed' : 'simple';
    const newSettings = { ...settings, uiMode: newMode };
    setSettings(newSettings);
    if (api.isElectron()) {
      api.saveSettings({ uiMode: newMode }).catch(() => {});
    }
  }

  return (
    <header className="flex items-center justify-between px-4 h-12 bg-slate-900 border-b border-slate-700 shrink-0">
      <div className="flex items-center gap-3">
        <h1 className="text-lg font-bold tracking-tight">
          <span className="text-emerald-500">krofne</span>
          <span className="text-slate-300">PackUpdater</span>
        </h1>
        {manifest && (
          <span className="text-xs text-slate-400 bg-slate-800 px-2 py-0.5 rounded">
            v{manifest.packVersion}
          </span>
        )}
      </div>

      <div className="flex items-center gap-2">
        {settings.debugMode && (
          <span className="flex items-center gap-1 text-xs text-amber-400 bg-amber-500/10 px-2 py-0.5 rounded">
            <Bug className="w-3 h-3" />
            Debug
          </span>
        )}

        {updateInfo?.hasUpdate && (
          <span className="flex items-center gap-1 text-xs text-sky-400 bg-sky-500/10 px-2 py-0.5 rounded">
            <RefreshCw className="w-3 h-3" />
            Обновление {updateInfo.latestVersion}
          </span>
        )}

        <button
          onClick={toggleUiMode}
          className="flex items-center gap-1 text-xs text-slate-400 hover:text-slate-200 bg-slate-800 hover:bg-slate-700 px-2 py-1 rounded transition-colors"
          title={settings.uiMode === 'simple' ? 'Переключить в подробный режим' : 'Переключить в простой режим'}
        >
          {settings.uiMode === 'simple' ? (
            <><Monitor className="w-3 h-3" /> Подробный</>
          ) : (
            <><Smartphone className="w-3 h-3" /> Простой</>
          )}
        </button>
      </div>
    </header>
  );
}

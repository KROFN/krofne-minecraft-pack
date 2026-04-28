import { FolderOpen, ExternalLink, Search } from 'lucide-react';
import { useAppState } from '@/app/AppShell';
import { KCard, KCardHeader, KCardTitle } from '@/components/common/KCard';
import { KButton } from '@/components/common/KButton';
import * as api from '@/lib/api';

export function FolderCard() {
  const { modsPath, setModsPath, settings, setSettings } = useAppState();

  async function handleChangeFolder() {
    if (!api.isElectron()) return;
    try {
      const path = await api.selectModsFolder();
      if (path) {
        setModsPath(path);
        setSettings({ ...settings, lastModsPath: path });
        await api.saveSettings({ lastModsPath: path });
      }
    } catch {
      // ignore cancel
    }
  }

  async function handleAutoDetect() {
    if (!api.isElectron()) return;
    try {
      const candidates = await api.detectMinecraftFolders();
      if (candidates.length > 0 && candidates[0].modsPath) {
        const path = candidates[0].modsPath;
        setModsPath(path);
        setSettings({ ...settings, lastModsPath: path });
        await api.saveSettings({ lastModsPath: path });
      }
    } catch {
      // ignore
    }
  }

  async function handleOpenInExplorer() {
    if (!api.isElectron() || !modsPath) return;
    try {
      await api.openFolder(modsPath);
    } catch {
      // ignore
    }
  }

  return (
    <KCard padding="md">
      <KCardHeader>
        <KCardTitle className="flex items-center gap-2">
          <FolderOpen className="w-4 h-4 text-emerald-500" />
          Папка модов
        </KCardTitle>
      </KCardHeader>

      <div className="mb-3">
        {modsPath ? (
          <p className="text-sm text-emerald-400 font-mono bg-slate-900 px-3 py-2 rounded break-all">
            {modsPath}
          </p>
        ) : (
          <p className="text-sm text-slate-500">
            Папка не выбрана
          </p>
        )}
      </div>

      <div className="flex flex-wrap gap-2">
        <KButton variant="secondary" size="sm" onClick={handleChangeFolder}>
          <FolderOpen className="w-3.5 h-3.5" />
          Выбрать папку
        </KButton>
        <KButton variant="secondary" size="sm" onClick={handleAutoDetect}>
          <Search className="w-3.5 h-3.5" />
          Найти автоматически
        </KButton>
        {modsPath && (
          <KButton variant="ghost" size="sm" onClick={handleOpenInExplorer}>
            <ExternalLink className="w-3.5 h-3.5" />
            Открыть в проводнике
          </KButton>
        )}
      </div>
    </KCard>
  );
}

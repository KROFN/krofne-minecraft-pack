import { Package } from 'lucide-react';
import { useAppState } from '@/app/AppShell';
import { KCard, KCardHeader, KCardTitle } from '@/components/common/KCard';
import { KBadge } from '@/components/common/KBadge';
import { formatDate } from '@/lib/format';

export function PackInfoCard() {
  const { manifest } = useAppState();

  if (!manifest) return null;

  const latestChangelog = manifest.changelog?.[0];

  return (
    <KCard padding="md">
      <KCardHeader>
        <KCardTitle className="flex items-center gap-2">
          <Package className="w-4 h-4 text-emerald-500" />
          Сборка
        </KCardTitle>
        <KBadge variant="success">v{manifest.packVersion}</KBadge>
      </KCardHeader>

      <div className="space-y-2">
        <div className="flex items-center justify-between text-sm">
          <span className="text-slate-400">Название</span>
          <span className="text-slate-200 font-medium">{manifest.packName}</span>
        </div>
        <div className="flex items-center justify-between text-sm">
          <span className="text-slate-400">Minecraft</span>
          <span className="text-slate-200">{manifest.minecraftVersion}</span>
        </div>
        <div className="flex items-center justify-between text-sm">
          <span className="text-slate-400">Загрузчик</span>
          <span className="text-slate-200">{manifest.loader}{manifest.loaderVersion ? ` ${manifest.loaderVersion}` : ''}</span>
        </div>
        <div className="flex items-center justify-between text-sm">
          <span className="text-slate-400">Модов</span>
          <span className="text-slate-200">{manifest.mods.length}</span>
        </div>
        <div className="flex items-center justify-between text-sm">
          <span className="text-slate-400">Обновлено</span>
          <span className="text-slate-200">{formatDate(manifest.manifestUpdatedAt)}</span>
        </div>
      </div>

      {latestChangelog && (
        <div className="mt-3 pt-3 border-t border-slate-700">
          <p className="text-xs text-slate-400 mb-1">Последние изменения (v{latestChangelog.version}):</p>
          <ul className="text-xs text-slate-300 space-y-0.5">
            {latestChangelog.items.slice(0, 3).map((item, i) => (
              <li key={i} className="flex items-start gap-1.5">
                <span className="text-emerald-500 mt-0.5">•</span>
                <span>{item}</span>
              </li>
            ))}
            {latestChangelog.items.length > 3 && (
              <li className="text-slate-500">+ещё {latestChangelog.items.length - 3}</li>
            )}
          </ul>
        </div>
      )}
    </KCard>
  );
}

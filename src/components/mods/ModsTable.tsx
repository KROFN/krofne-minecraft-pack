import { useState, useMemo } from 'react';
import { ArrowUpDown, Search } from 'lucide-react';
import { useAppState } from '@/app/AppShell';
import { KBadge } from '@/components/common/KBadge';
import { EmptyState } from '@/components/common/EmptyState';
import { ModStatusBadge } from './ModStatusBadge';
import { ModDetailsDrawer } from './ModDetailsDrawer';
import { formatBytes, truncateMiddle } from '@/lib/format';
import { cn } from '@/lib/cn';
import type { ModCheckResult } from '@shared/types/mod';
import type { ModStatus } from '@shared/types/mod';

type SortField = 'status' | 'name' | 'fileName' | 'size';
type SortDir = 'asc' | 'desc';

export function ModsTable() {
  const { syncPlan, settings } = useAppState();
  const [sortField, setSortField] = useState<SortField>('status');
  const [sortDir, setSortDir] = useState<SortDir>('asc');
  const [filterStatus, setFilterStatus] = useState<ModStatus | 'all'>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedMod, setSelectedMod] = useState<ModCheckResult | null>(null);

  const allMods = useMemo(() => {
    if (!syncPlan) return [];
    return [
      ...syncPlan.installed,
      ...syncPlan.missing,
      ...syncPlan.wrongHash,
      ...syncPlan.extra,
      ...syncPlan.allowedExtra,
    ];
  }, [syncPlan]);

  const filteredMods = useMemo(() => {
    let mods = allMods;

    if (filterStatus !== 'all') {
      mods = mods.filter((m) => m.status === filterStatus);
    }

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      mods = mods.filter(
        (m) =>
          m.manifestMod?.name.toLowerCase().includes(q) ||
          m.manifestMod?.fileName.toLowerCase().includes(q) ||
          m.localFile?.fileName.toLowerCase().includes(q)
      );
    }

    return mods.sort((a, b) => {
      let cmp = 0;
      switch (sortField) {
        case 'status':
          cmp = a.status.localeCompare(b.status);
          break;
        case 'name':
          cmp = (a.manifestMod?.name ?? a.localFile?.fileName ?? '').localeCompare(
            b.manifestMod?.name ?? b.localFile?.fileName ?? ''
          );
          break;
        case 'fileName':
          cmp = (a.manifestMod?.fileName ?? '').localeCompare(b.manifestMod?.fileName ?? '');
          break;
        case 'size':
          cmp = (a.localFile?.sizeBytes ?? 0) - (b.localFile?.sizeBytes ?? 0);
          break;
      }
      return sortDir === 'asc' ? cmp : -cmp;
    });
  }, [allMods, filterStatus, searchQuery, sortField, sortDir]);

  function toggleSort(field: SortField) {
    if (sortField === field) {
      setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortField(field);
      setSortDir('asc');
    }
  }

  if (!syncPlan) {
    return (
      <EmptyState
        icon={<Search className="w-12 h-12" />}
        title="Нет данных о модах"
        description="Сначала проверьте моды на главной странице"
      />
    );
  }

  const statusCounts = allMods.reduce<Record<string, number>>((acc, m) => {
    acc[m.status] = (acc[m.status] || 0) + 1;
    return acc;
  }, {});

  return (
    <div className="space-y-4">
      {/* Filters */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="relative flex-1 min-w-[200px] max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
          <input
            type="text"
            placeholder="Поиск модов..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-sm text-slate-200 placeholder-slate-500 focus:outline-none focus:border-emerald-500/50"
          />
        </div>
        <div className="flex flex-wrap gap-1.5">
          <button
            onClick={() => setFilterStatus('all')}
            className={cn(
              'px-2.5 py-1 text-xs rounded-md transition-colors',
              filterStatus === 'all'
                ? 'bg-emerald-500/20 text-emerald-400'
                : 'bg-slate-800 text-slate-400 hover:text-slate-300'
            )}
          >
            Все ({allMods.length})
          </button>
          {Object.entries(statusCounts).map(([status, count]) => (
            <button
              key={status}
              onClick={() => setFilterStatus(status as ModStatus)}
              className={cn(
                'px-2.5 py-1 text-xs rounded-md transition-colors',
                filterStatus === status
                  ? 'bg-emerald-500/20 text-emerald-400'
                  : 'bg-slate-800 text-slate-400 hover:text-slate-300'
              )}
            >
              {status} ({count})
            </button>
          ))}
        </div>
      </div>

      {/* Table */}
      <div className="overflow-x-auto rounded-lg border border-slate-700">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-slate-900">
              <th className="text-left px-3 py-2.5 text-slate-400 font-medium">
                <button onClick={() => toggleSort('status')} className="flex items-center gap-1 hover:text-slate-200">
                  Статус <ArrowUpDown className="w-3 h-3" />
                </button>
              </th>
              <th className="text-left px-3 py-2.5 text-slate-400 font-medium">
                <button onClick={() => toggleSort('name')} className="flex items-center gap-1 hover:text-slate-200">
                  Название <ArrowUpDown className="w-3 h-3" />
                </button>
              </th>
              <th className="text-left px-3 py-2.5 text-slate-400 font-medium">
                <button onClick={() => toggleSort('fileName')} className="flex items-center gap-1 hover:text-slate-200">
                  Файл (manifest) <ArrowUpDown className="w-3 h-3" />
                </button>
              </th>
              <th className="text-left px-3 py-2.5 text-slate-400 font-medium">Локальный файл</th>
              <th className="text-right px-3 py-2.5 text-slate-400 font-medium">
                <button onClick={() => toggleSort('size')} className="flex items-center gap-1 hover:text-slate-200 ml-auto">
                  Размер <ArrowUpDown className="w-3 h-3" />
                </button>
              </th>
              {settings.debugMode && (
                <>
                  <th className="text-left px-3 py-2.5 text-slate-400 font-medium">SHA-512</th>
                  <th className="text-left px-3 py-2.5 text-slate-400 font-medium">URL</th>
                </>
              )}
            </tr>
          </thead>
          <tbody>
            {filteredMods.map((mod, i) => (
              <tr
                key={`${mod.status}-${mod.manifestMod?.id ?? mod.localFile?.fileName}-${i}`}
                onClick={() => setSelectedMod(mod)}
                className={cn(
                  'cursor-pointer border-t border-slate-700/50 transition-colors hover:bg-slate-700/30',
                  i % 2 === 0 ? 'bg-slate-800' : 'bg-slate-800/50'
                )}
              >
                <td className="px-3 py-2">
                  <ModStatusBadge status={mod.status} />
                </td>
                <td className="px-3 py-2 text-slate-200 max-w-[200px] truncate">
                  {mod.manifestMod?.name ?? mod.localFile?.fileName ?? '—'}
                </td>
                <td className="px-3 py-2 text-slate-300 max-w-[200px] truncate font-mono text-xs">
                  {mod.manifestMod?.fileName ?? '—'}
                </td>
                <td className="px-3 py-2 text-slate-300 max-w-[200px] truncate font-mono text-xs">
                  {mod.localFile ? truncateMiddle(mod.localFile.fileName, 30) : '—'}
                </td>
                <td className="px-3 py-2 text-slate-400 text-right">
                  {mod.localFile ? formatBytes(mod.localFile.sizeBytes) : (mod.manifestMod?.sizeBytes ? formatBytes(mod.manifestMod.sizeBytes) : '—')}
                </td>
                {settings.debugMode && (
                  <>
                    <td className="px-3 py-2 text-slate-500 font-mono text-xs">
                      {mod.localFile ? truncateMiddle(mod.localFile.sha512, 20) : '—'}
                    </td>
                    <td className="px-3 py-2 text-slate-500 text-xs max-w-[150px] truncate">
                      {mod.manifestMod?.downloadUrl ?? '—'}
                    </td>
                  </>
                )}
              </tr>
            ))}
          </tbody>
        </table>

        {filteredMods.length === 0 && (
          <div className="py-8 text-center text-slate-500 text-sm">
            Моды не найдены
          </div>
        )}
      </div>

      <p className="text-xs text-slate-500">Всего: {filteredMods.length} из {allMods.length}</p>

      {/* Details drawer */}
      {selectedMod && (
        <ModDetailsDrawer mod={selectedMod} onClose={() => setSelectedMod(null)} />
      )}
    </div>
  );
}

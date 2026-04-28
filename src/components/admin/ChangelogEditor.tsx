import { useState } from 'react';
import { Plus, Trash2, ChevronDown, ChevronUp } from 'lucide-react';
import { KCard, KCardHeader, KCardTitle } from '@/components/common/KCard';
import { KButton } from '@/components/common/KButton';
import { KBadge } from '@/components/common/KBadge';
import type { ChangelogEntry } from '@shared/types/manifest';

export function ChangelogEditor() {
  const [entries, setEntries] = useState<ChangelogEntry[]>([]);
  const [newVersion, setNewVersion] = useState('');
  const [newDate, setNewDate] = useState(new Date().toISOString().slice(0, 10));
  const [newItems, setNewItems] = useState('');
  const [expandedIdx, setExpandedIdx] = useState<number | null>(null);

  function addEntry() {
    if (!newVersion.trim()) return;
    const items = newItems
      .split('\n')
      .map((s) => s.trim())
      .filter(Boolean);
    const entry: ChangelogEntry = {
      version: newVersion.trim(),
      date: newDate,
      items,
    };
    setEntries((prev) => [entry, ...prev]);
    setNewVersion('');
    setNewItems('');
  }

  function removeEntry(index: number) {
    setEntries((prev) => prev.filter((_, i) => i !== index));
  }

  function addItemToEntry(entryIndex: number, item: string) {
    setEntries((prev) =>
      prev.map((entry, i) =>
        i === entryIndex
          ? { ...entry, items: [...entry.items, item] }
          : entry
      )
    );
  }

  function removeItemFromEntry(entryIndex: number, itemIndex: number) {
    setEntries((prev) =>
      prev.map((entry, i) =>
        i === entryIndex
          ? { ...entry, items: entry.items.filter((_, j) => j !== itemIndex) }
          : entry
      )
    );
  }

  return (
    <div className="space-y-4">
      {/* Add new entry */}
      <KCard padding="md">
        <KCardHeader>
          <KCardTitle>Добавить запись</KCardTitle>
        </KCardHeader>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-3">
          <div>
            <label className="text-xs text-slate-400 block mb-1">Версия</label>
            <input
              type="text"
              value={newVersion}
              onChange={(e) => setNewVersion(e.target.value)}
              className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-lg text-sm text-slate-200 focus:outline-none focus:border-emerald-500/50"
              placeholder="1.1.0"
            />
          </div>
          <div>
            <label className="text-xs text-slate-400 block mb-1">Дата</label>
            <input
              type="date"
              value={newDate}
              onChange={(e) => setNewDate(e.target.value)}
              className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-lg text-sm text-slate-200 focus:outline-none focus:border-emerald-500/50"
            />
          </div>
        </div>

        <div className="mb-3">
          <label className="text-xs text-slate-400 block mb-1">Изменения (по одному на строку)</label>
          <textarea
            value={newItems}
            onChange={(e) => setNewItems(e.target.value)}
            className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-lg text-sm text-slate-200 focus:outline-none focus:border-emerald-500/50 min-h-[80px] resize-y"
            placeholder={"Добавлен мод X\nОбновлён мод Y\nУдалён мод Z"}
          />
        </div>

        <KButton size="sm" onClick={addEntry} disabled={!newVersion.trim()}>
          <Plus className="w-4 h-4" />
          Добавить
        </KButton>
      </KCard>

      {/* Existing entries */}
      {entries.length > 0 && (
        <div className="space-y-2">
          {entries.map((entry, i) => (
            <KCard key={i} padding="md">
              <div className="flex items-center gap-3">
                <KBadge variant="success">v{entry.version}</KBadge>
                <span className="text-xs text-slate-400">{entry.date}</span>
                <span className="text-xs text-slate-500">{entry.items.length} изменений</span>
                <div className="flex-1" />
                <button
                  onClick={() => setExpandedIdx(expandedIdx === i ? null : i)}
                  className="text-slate-400 hover:text-slate-200"
                >
                  {expandedIdx === i ? (
                    <ChevronUp className="w-4 h-4" />
                  ) : (
                    <ChevronDown className="w-4 h-4" />
                  )}
                </button>
                <button
                  onClick={() => removeEntry(i)}
                  className="text-red-400 hover:text-red-300"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>

              {expandedIdx === i && (
                <div className="mt-3 pt-3 border-t border-slate-700 space-y-1">
                  {entry.items.map((item, j) => (
                    <div key={j} className="flex items-center gap-2 text-sm text-slate-300">
                      <span className="text-emerald-500">•</span>
                      <span className="flex-1">{item}</span>
                      <button
                        onClick={() => removeItemFromEntry(i, j)}
                        className="text-red-400/50 hover:text-red-400"
                      >
                        <Trash2 className="w-3 h-3" />
                      </button>
                    </div>
                  ))}

                  <AddItemForm onAdd={(item) => addItemToEntry(i, item)} />
                </div>
              )}
            </KCard>
          ))}
        </div>
      )}

      {entries.length === 0 && (
        <p className="text-sm text-slate-500 text-center py-4">
          Нет записей чейнджлога. Добавьте первую запись выше.
        </p>
      )}
    </div>
  );
}

function AddItemForm({ onAdd }: { onAdd: (item: string) => void }) {
  const [value, setValue] = useState('');

  function handleAdd() {
    if (!value.trim()) return;
    onAdd(value.trim());
    setValue('');
  }

  return (
    <div className="flex gap-2 mt-2">
      <input
        type="text"
        value={value}
        onChange={(e) => setValue(e.target.value)}
        onKeyDown={(e) => e.key === 'Enter' && handleAdd()}
        className="flex-1 px-2 py-1 bg-slate-900 border border-slate-700 rounded text-xs text-slate-200 focus:outline-none focus:border-emerald-500/50"
        placeholder="Добавить изменение..."
      />
      <KButton variant="ghost" size="sm" onClick={handleAdd}>
        <Plus className="w-3 h-3" />
      </KButton>
    </div>
  );
}

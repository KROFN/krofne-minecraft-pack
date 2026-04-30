import { useState } from 'react';
import { cn } from '@/lib/cn';
import { ManifestGeneratorPanel } from './ManifestGeneratorPanel';
import { ChangelogEditor } from './ChangelogEditor';

type AdminTab = 'manifest' | 'changelog';

export function AdminPage() {
  const [activeTab, setActiveTab] = useState<AdminTab>('manifest');

  const tabs: { id: AdminTab; label: string }[] = [
    { id: 'manifest', label: 'Генератор манифеста' },
    { id: 'changelog', label: 'Редактор чейнджлога' },
  ];

  return (
    <div className="space-y-4">
      <h2 className="text-lg font-semibold text-slate-100">Админ</h2>

      {/* Tabs */}
      <div className="flex gap-1 bg-slate-900 p-1 rounded-lg w-fit">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={cn(
              'px-4 py-2 text-sm rounded-md transition-colors',
              activeTab === tab.id
                ? 'bg-emerald-600 text-white'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800'
            )}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Content */}
      {activeTab === 'manifest' && <ManifestGeneratorPanel />}
      {activeTab === 'changelog' && <ChangelogEditor />}
    </div>
  );
}

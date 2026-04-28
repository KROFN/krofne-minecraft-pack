import { useAppState } from '@/app/AppShell';

interface SummaryItem {
  emoji: string;
  label: string;
  count: number;
  colorClass: string;
  bgClass: string;
}

export function SummaryCards() {
  const { syncPlan } = useAppState();

  if (!syncPlan) return null;

  const items: SummaryItem[] = [
    {
      emoji: '✅',
      label: 'Установлено',
      count: syncPlan.summary.installedCount,
      colorClass: 'text-emerald-400',
      bgClass: 'bg-emerald-500/10 border-emerald-500/20',
    },
    {
      emoji: '⬇️',
      label: 'Скачать',
      count: syncPlan.summary.missingCount,
      colorClass: 'text-amber-400',
      bgClass: 'bg-amber-500/10 border-amber-500/20',
    },
    {
      emoji: '🔁',
      label: 'Заменить',
      count: syncPlan.summary.wrongHashCount,
      colorClass: 'text-red-400',
      bgClass: 'bg-red-500/10 border-red-500/20',
    },
    {
      emoji: '📦',
      label: 'Лишние',
      count: syncPlan.summary.extraCount,
      colorClass: 'text-orange-400',
      bgClass: 'bg-orange-500/10 border-orange-500/20',
    },
    {
      emoji: '🟦',
      label: 'Разрешённые',
      count: syncPlan.summary.allowedExtraCount,
      colorClass: 'text-sky-400',
      bgClass: 'bg-sky-500/10 border-sky-500/20',
    },
  ].filter((item) => item.count > 0);

  if (items.length === 0) return null;

  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
      {items.map((item) => (
        <div
          key={item.label}
          className={`${item.bgClass} border rounded-lg p-3 text-center`}
        >
          <div className="text-2xl mb-1">{item.emoji}</div>
          <div className={`text-2xl font-bold ${item.colorClass}`}>{item.count}</div>
          <div className="text-xs text-slate-400 mt-0.5">{item.label}</div>
        </div>
      ))}
    </div>
  );
}

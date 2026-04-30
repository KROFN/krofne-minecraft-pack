import { Home, Package, Archive, Wrench, Settings } from 'lucide-react';
import { useRoute, type AppRoute } from '@/app/routes';
import { useAppState } from '@/app/AppShell';
import { cn } from '@/lib/cn';

interface NavItem {
  route: AppRoute;
  label: string;
  icon: React.ReactNode;
}

const navItems: NavItem[] = [
  { route: 'home', label: 'Главная', icon: <Home className="w-5 h-5" /> },
  { route: 'mods', label: 'Моды', icon: <Package className="w-5 h-5" /> },
  { route: 'backups', label: 'Бэкапы', icon: <Archive className="w-5 h-5" /> },
  { route: 'admin', label: 'Админ', icon: <Wrench className="w-5 h-5" /> },
  { route: 'settings', label: 'Настройки', icon: <Settings className="w-5 h-5" /> },
];

export function Sidebar() {
  const { route, navigate } = useRoute();
  const { syncPlan, isSyncing } = useAppState();

  return (
    <nav className="w-52 bg-slate-900 border-r border-slate-700 flex flex-col shrink-0">
      <div className="flex-1 py-2">
        {navItems.map((item) => {
          const isActive = route === item.route;
          return (
            <button
              key={item.route}
              onClick={() => navigate(item.route)}
              className={cn(
                'w-full flex items-center gap-3 px-4 py-2.5 text-sm transition-colors',
                isActive
                  ? 'bg-emerald-500/10 text-emerald-400 border-r-2 border-emerald-500'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800'
              )}
            >
              {item.icon}
              <span>{item.label}</span>
              {item.route === 'mods' && syncPlan && syncPlan.summary.totalActions > 0 && (
                <span className="ml-auto text-xs bg-amber-500/20 text-amber-400 px-1.5 py-0.5 rounded">
                  {syncPlan.summary.totalActions}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {isSyncing && (
        <div className="px-4 py-3 border-t border-slate-700">
          <div className="flex items-center gap-2 text-xs text-emerald-400">
            <div className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse" />
            Синхронизация...
          </div>
        </div>
      )}
    </nav>
  );
}

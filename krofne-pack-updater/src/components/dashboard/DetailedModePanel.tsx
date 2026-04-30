import { useAppState } from '@/app/AppShell';
import { PackInfoCard } from './PackInfoCard';
import { FolderCard } from './FolderCard';
import { SummaryCards } from './SummaryCards';
import { MainActionPanel } from './MainActionPanel';
import { ServerStatusCard } from './ServerStatusCard';

export function DetailedModePanel() {
  const { manifest, syncPlan } = useAppState();

  return (
    <div className="space-y-6">
      {/* Top row: Pack info + Folder info */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {manifest && <PackInfoCard />}
        <FolderCard />
      </div>

      {/* Summary cards */}
      {syncPlan && <SummaryCards />}

      {/* Main action panel */}
      <MainActionPanel />

      {/* Server status */}
      {manifest?.server && <ServerStatusCard />}
    </div>
  );
}

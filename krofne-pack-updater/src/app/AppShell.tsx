import {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  type ReactNode,
} from 'react';
import type { AppSettings } from '@shared/types/settings';
import { DEFAULT_SETTINGS } from '@shared/types/settings';
import type { Manifest } from '@shared/types/manifest';
import type { SyncPlan, SyncProgress, UserFriendlyError } from '@shared/types/sync';
import type { SyncLogEntry } from '@shared/types/logs';
import { RouteProvider, useRoute } from './routes';
import * as api from '@/lib/api';
import { TopBar } from '@/components/layout/TopBar';
import { Sidebar } from '@/components/layout/Sidebar';
import { StatusFooter } from '@/components/layout/StatusFooter';
import { SimpleModePanel } from '@/components/dashboard/SimpleModePanel';
import { DetailedModePanel } from '@/components/dashboard/DetailedModePanel';
import { ModsTable } from '@/components/mods/ModsTable';
import { LogPanel } from '@/components/logs/LogPanel';
import { BackupsPage } from '@/components/backups/BackupsPage';
import { AdminPage } from '@/components/admin/AdminPage';
import { SettingsPage } from '@/components/settings/SettingsPage';

// ─── App State Context ───────────────────────────────────────────────

interface AppState {
  settings: AppSettings;
  setSettings: (s: AppSettings) => void;
  manifest: Manifest | null;
  setManifest: (m: Manifest | null) => void;
  syncPlan: SyncPlan | null;
  setSyncPlan: (p: SyncPlan | null) => void;
  syncProgress: SyncProgress | null;
  setSyncProgress: (p: SyncProgress | null) => void;
  modsPath: string | null;
  setModsPath: (p: string | null) => void;
  isSyncing: boolean;
  setIsSyncing: (b: boolean) => void;
  error: string | null;
  setError: (e: string | null) => void;
  userFriendlyError: UserFriendlyError | null;
  setUserFriendlyError: (e: UserFriendlyError | null) => void;
  logs: SyncLogEntry[];
  setLogs: (l: SyncLogEntry[]) => void;
  needsRecovery: boolean;
  setNeedsRecovery: (b: boolean) => void;
}

const AppStateContext = createContext<AppState | null>(null);

export function useAppState(): AppState {
  const ctx = useContext(AppStateContext);
  if (!ctx) throw new Error('useAppState must be used within AppShell');
  return ctx;
}

// ─── App Shell Layout ────────────────────────────────────────────────

function AppShellLayout() {
  const { route } = useRoute();
  const state = useContext(AppStateContext)!;

  const isSimple = state.settings.uiMode === 'simple';

  // Render main content based on route
  function renderContent() {
    switch (route) {
      case 'home':
        return isSimple ? <SimpleModePanel /> : <DetailedModePanel />;
      case 'mods':
        return <ModsTable />;
      case 'backups':
        return <BackupsPage />;
      case 'admin':
        return <AdminPage />;
      case 'settings':
        return <SettingsPage />;
      default:
        return <SimpleModePanel />;
    }
  }

  if (isSimple) {
    return (
      <div className="flex flex-col h-screen bg-background">
        <TopBar />
        <main className="flex-1 flex items-center justify-center overflow-auto p-6">
          <div className="w-full max-w-2xl">
            {renderContent()}
          </div>
        </main>
        <StatusFooter />
      </div>
    );
  }

  return (
    <div className="flex flex-col h-screen bg-background">
      <TopBar />
      <div className="flex flex-1 overflow-hidden">
        <Sidebar />
        <main className="flex-1 overflow-auto p-6">
          {renderContent()}
        </main>
      </div>
      <StatusFooter />
    </div>
  );
}

// ─── AppShell with State Provider ────────────────────────────────────

export function AppShell() {
  const [settings, setSettings] = useState<AppSettings>(DEFAULT_SETTINGS);
  const [manifest, setManifest] = useState<Manifest | null>(null);
  const [syncPlan, setSyncPlan] = useState<SyncPlan | null>(null);
  const [syncProgress, setSyncProgress] = useState<SyncProgress | null>(null);
  const [modsPath, setModsPath] = useState<string | null>(null);
  const [isSyncing, setIsSyncing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [userFriendlyError, setUserFriendlyError] = useState<UserFriendlyError | null>(null);
  const [logs, setLogs] = useState<SyncLogEntry[]>([]);
  const [needsRecovery, setNeedsRecovery] = useState(false);

  // Load settings on mount
  useEffect(() => {
    if (!api.isElectron()) return;

    api.getSettings()
      .then((s) => {
        setSettings(s);
        setModsPath(s.lastModsPath);
      })
      .catch((err) => setError(err.message));

    // Check recovery on mount
    api.checkRecovery()
      .then((needs) => setNeedsRecovery(needs))
      .catch(() => {});
  }, []);

  // Subscribe to sync progress
  useEffect(() => {
    if (!api.isElectron()) return;
    const unsub = api.onSyncProgress((progress) => {
      setSyncProgress(progress);
      if (progress.phase === 'done' || progress.phase === 'error' || progress.phase === 'cancelled') {
        setIsSyncing(false);
      }
    });
    return unsub;
  }, []);

  const appState: AppState = {
    settings,
    setSettings,
    manifest,
    setManifest,
    syncPlan,
    setSyncPlan,
    syncProgress,
    setSyncProgress,
    modsPath,
    setModsPath,
    isSyncing,
    setIsSyncing,
    error,
    setError,
    userFriendlyError,
    setUserFriendlyError,
    logs,
    setLogs,
    needsRecovery,
    setNeedsRecovery,
  };

  return (
    <AppStateContext.Provider value={appState}>
      <RouteProvider>
        <AppShellLayout />
      </RouteProvider>
    </AppStateContext.Provider>
  );
}

'use client'

import { useState, useEffect, useCallback } from 'react'
import {
  Home,
  Package,
  Archive,
  Wrench,
  Settings,
  FolderOpen,
  RefreshCw,
  DownloadCloud,
  CheckCircle2,
  Loader2,
  AlertCircle,
  ChevronRight,
  Server,
  Copy,
  FileText,
  Shield,
  Clock,
  ChevronDown,
  ExternalLink,
  Zap,
} from 'lucide-react'

// ─── Types ────────────────────────────────────────────────────────────

type AppRoute = 'home' | 'mods' | 'backups' | 'admin' | 'settings'
type UIMode = 'simple' | 'detailed'
type ModStatus = 'installed' | 'missing' | 'wrong_hash' | 'extra' | 'allowed_extra'

interface MockMod {
  id: string
  name: string
  fileName: string
  size: string
  status: ModStatus
  hash: string
}

interface LogEntry {
  time: string
  level: 'info' | 'warn' | 'error'
  message: string
}

// ─── Mock Data ────────────────────────────────────────────────────────

const MOCK_MODS: MockMod[] = [
  { id: '1', name: 'Create', fileName: 'create-1.20.1-0.5.1f.jar', size: '12.4 MB', status: 'installed', hash: 'a1b2c3d4e5f6' },
  { id: '2', name: 'JEI', fileName: 'jei-1.20.1-forge-15.2.0.27.jar', size: '1.8 MB', status: 'installed', hash: 'b2c3d4e5f6a1' },
  { id: '3', name: 'Applied Energistics 2', fileName: 'appliedenergistics2-forge-15.0.23.jar', size: '8.2 MB', status: 'wrong_hash', hash: 'c3d4e5f6a1b2' },
  { id: '4', name: 'Mekanism', fileName: 'Mekanism-1.20.1-10.4.6.20.jar', size: '5.6 MB', status: 'installed', hash: 'd4e5f6a1b2c3' },
  { id: '5', name: 'Sophisticated Backpacks', fileName: 'sophisticatedbackpacks-1.20.1-3.20.1.jar', size: '2.1 MB', status: 'missing', hash: 'e5f6a1b2c3d4' },
  { id: '6', name: 'Waystones', fileName: 'waystones-forge-1.20.1-14.1.3.jar', size: '1.4 MB', status: 'installed', hash: 'f6a1b2c3d4e5' },
  { id: '7', name: 'JourneyMap', fileName: 'journeymap-1.20.1-5.9.18-forge.jar', size: '6.7 MB', status: 'wrong_hash', hash: '1a2b3c4d5e6f' },
  { id: '8', name: 'Xaero\'s Minimap', fileName: 'Xaeros_Minimap_24.0.3_Forge_1.20.jar', size: '1.9 MB', status: 'extra', hash: '2b3c4d5e6f1a' },
  { id: '9', name: 'Iron Chests', fileName: 'ironchests-1.20.1-forge-14.4.4.jar', size: '0.8 MB', status: 'installed', hash: '3c4d5e6f1a2b' },
  { id: '10', name: 'Appleskin', fileName: 'appleskin-forge-mc1.20.1-2.4.0.jar', size: '0.2 MB', status: 'allowed_extra', hash: '4d5e6f1a2b3c' },
]

const MOCK_LOGS: LogEntry[] = [
  { time: '14:32:01', level: 'info', message: 'Запуск krofnePackUpdater v1.0.0' },
  { time: '14:32:02', level: 'info', message: 'Загрузка манифеста из https://raw.githubusercontent.com/...' },
  { time: '14:32:03', level: 'info', message: 'Манифест загружен: krofnePack v1.0.0, 45 модов' },
  { time: '14:32:04', level: 'info', message: 'Сканирование папки mods...' },
  { time: '14:32:05', level: 'info', message: 'Найдено файлов: 42 .jar' },
  { time: '14:32:06', level: 'warn', message: 'Несовпадение хэша: appliedenergistics2-forge-15.0.23.jar' },
  { time: '14:32:06', level: 'warn', message: 'Несовпадение хэша: journeymap-1.20.1-5.9.18-forge.jar' },
  { time: '14:32:07', level: 'info', message: 'Отсутствует: sophisticatedbackpacks-1.20.1-3.20.1.jar' },
  { time: '14:32:07', level: 'warn', message: 'Лишний мод: Xaeros_Minimap_24.0.3_Forge_1.20.jar' },
  { time: '14:32:08', level: 'info', message: 'Проверка завершена. Действий: 6' },
]

const STATUS_CONFIG: Record<ModStatus, { label: string; icon: string; bg: string; text: string }> = {
  installed: { label: 'Установлен', icon: '✅', bg: 'bg-emerald-500/20', text: 'text-emerald-400' },
  missing: { label: 'Отсутствует', icon: '⬇️', bg: 'bg-amber-500/20', text: 'text-amber-400' },
  wrong_hash: { label: 'Хэш не совпадает', icon: '🔁', bg: 'bg-red-500/20', text: 'text-red-400' },
  extra: { label: 'Лишний', icon: '📦', bg: 'bg-orange-500/20', text: 'text-orange-400' },
  allowed_extra: { label: 'Разрешённый', icon: '🟦', bg: 'bg-sky-500/20', text: 'text-sky-400' },
}

// ─── Pixel Border Utility ─────────────────────────────────────────────

function pixelBorder(extraClass = '') {
  return `border border-slate-700 ${extraClass}`
}

// ─── Main Component ───────────────────────────────────────────────────

export default function KrofnePackUpdaterPreview() {
  const [uiMode, setUiMode] = useState<UIMode>('simple')
  const [route, setRoute] = useState<AppRoute>('home')
  const [isSyncing, setIsSyncing] = useState(false)
  const [syncProgress, setSyncProgress] = useState(0)
  const [syncDone, setSyncDone] = useState(false)
  const [currentFile, setCurrentFile] = useState('')

  // Simulate sync
  const handleSync = useCallback(() => {
    setIsSyncing(true)
    setSyncDone(false)
    setSyncProgress(0)

    const files = [
      'sophisticatedbackpacks-1.20.1-3.20.1.jar',
      'appliedenergistics2-forge-15.0.23.jar',
      'journeymap-1.20.1-5.9.18-forge.jar',
      'Перемещение Xaeros_Minimap в _disabled...',
    ]

    let step = 0
    const interval = setInterval(() => {
      step++
      const progress = Math.min(step * 12, 100)
      setSyncProgress(progress)
      if (step <= files.length) {
        setCurrentFile(files[step - 1] || '')
      }
      if (progress >= 100) {
        clearInterval(interval)
        setTimeout(() => {
          setIsSyncing(false)
          setSyncDone(true)
          setCurrentFile('')
        }, 500)
      }
    }, 600)
  }, [])

  // Reset state when switching modes
  useEffect(() => {
    setRoute('home')
    if (syncDone) setSyncDone(false)
  }, [uiMode, syncDone])

  return (
    <div className="min-h-screen bg-slate-950 text-slate-300 selection:bg-emerald-500/30">
      {/* ─── Top Bar ──────────────────────────────────────────────── */}
      <header className="bg-slate-900 border-b border-slate-700 px-6 py-3 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2">
            <Zap className="w-5 h-5 text-emerald-500" />
            <h1 className="text-lg font-bold text-slate-100">
              krofne<span className="text-emerald-500">Pack</span>Updater
            </h1>
          </div>
          <span className="text-xs bg-emerald-500/20 text-emerald-400 px-2 py-0.5 rounded font-medium">
            v1.0.0
          </span>
          <span className="text-xs text-slate-500 hidden sm:inline">
            Minecraft 1.20.1 Forge
          </span>
        </div>
        <div className="flex items-center gap-3">
          <span className="text-xs text-slate-500 hidden md:inline">
            Веб-превью (не Electron)
          </span>
          <button
            onClick={() => setUiMode(uiMode === 'simple' ? 'detailed' : 'simple')}
            className="flex items-center gap-2 px-3 py-1.5 text-xs bg-slate-800 border border-slate-700 rounded-lg hover:border-emerald-500/50 hover:text-emerald-400 transition-all"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            {uiMode === 'simple' ? 'Подробный режим' : 'Простой режим'}
          </button>
        </div>
      </header>

      {/* ─── Main Content ─────────────────────────────────────────── */}
      {uiMode === 'simple' ? (
        <SimpleMode
          isSyncing={isSyncing}
          syncProgress={syncProgress}
          syncDone={syncDone}
          currentFile={currentFile}
          onSync={handleSync}
          onSwitchMode={() => setUiMode('detailed')}
        />
      ) : (
        <DetailedMode
          route={route}
          onRouteChange={setRoute}
          isSyncing={isSyncing}
          syncProgress={syncProgress}
          syncDone={syncDone}
          currentFile={currentFile}
          onSync={handleSync}
        />
      )}

      {/* ─── Status Footer ────────────────────────────────────────── */}
      <footer className="fixed bottom-0 left-0 right-0 bg-slate-900 border-t border-slate-700 px-6 py-2 flex items-center justify-between text-xs text-slate-500">
        <div className="flex items-center gap-2">
          <FolderOpen className="w-3.5 h-3.5" />
          <span className="truncate max-w-md">C:\Users\Player\AppData\Roaming\.minecraft\mods</span>
        </div>
        <div className="flex items-center gap-4">
          {isSyncing && (
            <div className="flex items-center gap-2 text-emerald-400">
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
              Синхронизация...
            </div>
          )}
          {syncDone && !isSyncing && (
            <div className="flex items-center gap-2 text-emerald-400">
              <CheckCircle2 className="w-3.5 h-3.5" />
              Готово
            </div>
          )}
          <span>krofnePackUpdater v1.0.0</span>
        </div>
      </footer>
    </div>
  )
}

// ─── Simple Mode ──────────────────────────────────────────────────────

function SimpleMode({
  isSyncing,
  syncProgress,
  syncDone,
  currentFile,
  onSync,
  onSwitchMode,
}: {
  isSyncing: boolean
  syncProgress: number
  syncDone: boolean
  currentFile: string
  onSync: () => void
  onSwitchMode: () => void
}) {
  return (
    <main className="flex items-center justify-center p-6" style={{ minHeight: 'calc(100vh - 88px)' }}>
      <div className="w-full max-w-2xl space-y-5">
        {/* ─── Header ─────────────────────────────────────────────── */}
        <div className="text-center mb-2">
          <h2 className="text-2xl font-bold text-slate-100">
            krofne<span className="text-emerald-500">Pack</span>Updater
          </h2>
          <p className="text-sm text-slate-400 mt-1">
            Обновление модов для Minecraft 1.20.1 Forge
          </p>
        </div>

        {/* ─── Mods Folder Card ───────────────────────────────────── */}
        <div className={pixelBorder('bg-slate-800 rounded-lg p-4')}>
          <div className="flex items-start gap-3">
            <FolderOpen className="w-5 h-5 text-emerald-500 mt-0.5 shrink-0" />
            <div className="flex-1 min-w-0">
              <p className="text-xs text-slate-500 mb-1">Папка mods</p>
              <p className="text-sm text-slate-200 font-mono break-all">
                C:\Users\Player\AppData\Roaming\.minecraft\mods
              </p>
            </div>
            <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />
          </div>
        </div>

        {/* ─── Pack Info Card ─────────────────────────────────────── */}
        <div className={pixelBorder('bg-slate-800 rounded-lg p-4')}>
          <div className="flex items-start gap-3">
            <Package className="w-5 h-5 text-emerald-500 mt-0.5 shrink-0" />
            <div className="flex-1 min-w-0">
              <p className="text-xs text-slate-500 mb-1">Сборка</p>
              <p className="text-sm text-slate-200 font-semibold">
                krofnePack v1.0.0
              </p>
              <p className="text-xs text-slate-400 mt-0.5">
                Minecraft 1.20.1 &bull; Forge &bull; 45 модов
              </p>
            </div>
          </div>
        </div>

        {/* ─── Status ─────────────────────────────────────────────── */}
        {!isSyncing && !syncDone && (
          <div className={pixelBorder('bg-amber-500/5 rounded-lg p-4')}>
            <div className="flex items-center gap-3">
              <AlertCircle className="w-5 h-5 text-amber-500 shrink-0" />
              <div>
                <p className="text-sm font-medium text-amber-400">
                  ⚠️ Нужно обновить моды
                </p>
                <p className="text-xs text-slate-400 mt-1">
                  Будет скачано: <span className="text-amber-400">3</span>,{' '}
                  Будет заменено: <span className="text-red-400">2</span>,{' '}
                  Будет отключено лишних: <span className="text-orange-400">1</span>
                </p>
              </div>
            </div>
          </div>
        )}

        {/* ─── Syncing State ──────────────────────────────────────── */}
        {isSyncing && (
          <div className={pixelBorder('bg-emerald-500/5 rounded-lg p-5')}>
            <div className="text-center space-y-4">
              <Loader2 className="w-12 h-12 text-emerald-500 mx-auto animate-spin" />
              <div>
                <p className="text-sm font-medium text-slate-200">Синхронизация...</p>
                <p className="text-xs text-slate-400 mt-1">
                  {currentFile || 'Подготовка...'}
                </p>
              </div>
              {/* Progress bar */}
              <div className="w-full bg-slate-700 rounded-full h-2.5 overflow-hidden">
                <div
                  className="bg-emerald-500 h-full rounded-full transition-all duration-500 ease-out"
                  style={{ width: `${syncProgress}%` }}
                />
              </div>
              <p className="text-xs text-slate-500">{syncProgress}%</p>
            </div>
          </div>
        )}

        {/* ─── Done State ─────────────────────────────────────────── */}
        {syncDone && !isSyncing && (
          <div className={pixelBorder('bg-emerald-500/5 rounded-lg p-5')}>
            <div className="text-center space-y-3">
              <CheckCircle2 className="w-14 h-14 text-emerald-500 mx-auto" />
              <div>
                <p className="text-lg font-bold text-emerald-400">Готово!</p>
                <p className="text-sm text-slate-400">Синхронизация завершена успешно</p>
              </div>
              <div className="bg-slate-800 rounded-lg p-3 mt-2">
                <p className="text-sm text-slate-200 font-semibold">krofnePack v1.0.0</p>
                <p className="text-xs text-slate-400">Minecraft 1.20.1 &bull; Forge</p>
              </div>
            </div>
          </div>
        )}

        {/* ─── Sync Button ────────────────────────────────────────── */}
        {!isSyncing && !syncDone && (
          <button
            onClick={onSync}
            className="w-full flex items-center justify-center gap-2 px-6 py-3.5 bg-emerald-600 hover:bg-emerald-500 text-white font-semibold rounded-lg transition-all duration-200 hover:shadow-lg hover:shadow-emerald-500/25 active:scale-[0.98]"
          >
            <ChevronRight className="w-5 h-5" />
            Синхронизировать
          </button>
        )}

        {/* ─── Re-check Button (after done) ──────────────────────── */}
        {syncDone && !isSyncing && (
          <button
            onClick={() => window.location.reload()}
            className="w-full flex items-center justify-center gap-2 px-6 py-3 bg-slate-800 border border-slate-700 text-slate-300 rounded-lg hover:border-emerald-500/50 hover:text-emerald-400 transition-all"
          >
            <RefreshCw className="w-5 h-5" />
            Проверить ещё раз
          </button>
        )}

        {/* ─── Toggle to Detailed Mode ───────────────────────────── */}
        <button
          onClick={onSwitchMode}
          className="w-full flex items-center justify-center gap-2 px-4 py-2.5 text-sm text-slate-400 hover:text-emerald-400 transition-colors"
        >
          <ChevronDown className="w-4 h-4" />
          Подробный режим
        </button>

        {/* ─── Server Info ────────────────────────────────────────── */}
        <div className={pixelBorder('bg-slate-800/50 rounded-lg p-3')}>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-xs text-slate-500">
              <Server className="w-3.5 h-3.5" />
              <span>krofne server — example.com:25565</span>
            </div>
            <button
              className="flex items-center gap-1 text-xs text-slate-500 hover:text-emerald-400 transition-colors"
              onClick={() => navigator.clipboard?.writeText('example.com:25565')}
            >
              <Copy className="w-3 h-3" />
              Копировать
            </button>
          </div>
        </div>
      </div>
    </main>
  )
}

// ─── Detailed Mode ────────────────────────────────────────────────────

function DetailedMode({
  route,
  onRouteChange,
  isSyncing,
  syncProgress,
  syncDone,
  currentFile,
  onSync,
}: {
  route: AppRoute
  onRouteChange: (r: AppRoute) => void
  isSyncing: boolean
  syncProgress: number
  syncDone: boolean
  currentFile: string
  onSync: () => void
}) {
  return (
    <div className="flex" style={{ minHeight: 'calc(100vh - 88px)' }}>
      {/* ─── Sidebar ─────────────────────────────────────────────── */}
      <nav className="w-52 bg-slate-900 border-r border-slate-700 flex flex-col shrink-0">
        <div className="flex-1 py-2">
          {(
            [
              { route: 'home' as AppRoute, label: 'Главная', icon: <Home className="w-5 h-5" /> },
              { route: 'mods' as AppRoute, label: 'Моды', icon: <Package className="w-5 h-5" /> },
              { route: 'backups' as AppRoute, label: 'Бэкапы', icon: <Archive className="w-5 h-5" /> },
              { route: 'admin' as AppRoute, label: 'Админ', icon: <Wrench className="w-5 h-5" /> },
              { route: 'settings' as AppRoute, label: 'Настройки', icon: <Settings className="w-5 h-5" /> },
            ] as const
          ).map((item) => {
            const isActive = route === item.route
            return (
              <button
                key={item.route}
                onClick={() => onRouteChange(item.route)}
                className={`w-full flex items-center gap-3 px-4 py-2.5 text-sm transition-colors ${
                  isActive
                    ? 'bg-emerald-500/10 text-emerald-400 border-r-2 border-emerald-500'
                    : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800'
                }`}
              >
                {item.icon}
                <span>{item.label}</span>
                {item.route === 'mods' && (
                  <span className="ml-auto text-xs bg-amber-500/20 text-amber-400 px-1.5 py-0.5 rounded">
                    6
                  </span>
                )}
              </button>
            )
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

      {/* ─── Content Area ────────────────────────────────────────── */}
      <main className="flex-1 overflow-auto p-6 space-y-6">
        {route === 'home' && (
          <DetailedHome
            isSyncing={isSyncing}
            syncProgress={syncProgress}
            syncDone={syncDone}
            currentFile={currentFile}
            onSync={onSync}
          />
        )}
        {route === 'mods' && <DetailedMods />}
        {route === 'backups' && <DetailedBackups />}
        {route === 'admin' && <DetailedAdmin />}
        {route === 'settings' && <DetailedSettings />}
      </main>
    </div>
  )
}

// ─── Detailed Home Panel ──────────────────────────────────────────────

function DetailedHome({
  isSyncing,
  syncProgress,
  syncDone,
  currentFile,
  onSync,
}: {
  isSyncing: boolean
  syncProgress: number
  syncDone: boolean
  currentFile: string
  onSync: () => void
}) {
  return (
    <>
      {/* ─── Info Cards Row ──────────────────────────────────────── */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Pack Info */}
        <div className={pixelBorder('bg-slate-800 rounded-lg p-4')}>
          <div className="flex items-center gap-2 mb-3">
            <Package className="w-4 h-4 text-emerald-500" />
            <h3 className="text-sm font-semibold text-slate-200">Сборка</h3>
          </div>
          <p className="text-lg font-bold text-slate-100">krofnePack</p>
          <p className="text-xs text-slate-400 mt-1">v1.0.0 &bull; Minecraft 1.20.1 &bull; Forge</p>
          <p className="text-xs text-slate-500 mt-1">Модов в сборке: 45</p>
        </div>

        {/* Folder Info */}
        <div className={pixelBorder('bg-slate-800 rounded-lg p-4')}>
          <div className="flex items-center gap-2 mb-3">
            <FolderOpen className="w-4 h-4 text-emerald-500" />
            <h3 className="text-sm font-semibold text-slate-200">Папка mods</h3>
          </div>
          <p className="text-xs font-mono text-slate-300 break-all">
            C:\Users\Player\AppData\Roaming\.minecraft\mods
          </p>
          <div className="flex gap-2 mt-3">
            <button className="text-xs px-2 py-1 bg-slate-700 rounded text-slate-300 hover:bg-slate-600 transition-colors">
              Выбрать
            </button>
            <button className="text-xs px-2 py-1 bg-slate-700 rounded text-slate-300 hover:bg-slate-600 transition-colors flex items-center gap-1">
              <ExternalLink className="w-3 h-3" />
              Открыть
            </button>
          </div>
        </div>
      </div>

      {/* ─── Summary Cards ───────────────────────────────────────── */}
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-3">
        {[
          { label: 'Установлено', value: 42, bg: 'bg-emerald-500/10', border: 'border-emerald-500/20', text: 'text-emerald-400', icon: '✅' },
          { label: 'Скачать', value: 3, bg: 'bg-amber-500/10', border: 'border-amber-500/20', text: 'text-amber-400', icon: '⬇️' },
          { label: 'Заменить', value: 2, bg: 'bg-red-500/10', border: 'border-red-500/20', text: 'text-red-400', icon: '🔁' },
          { label: 'Лишние', value: 1, bg: 'bg-orange-500/10', border: 'border-orange-500/20', text: 'text-orange-400', icon: '📦' },
          { label: 'Разрешённые', value: 2, bg: 'bg-sky-500/10', border: 'border-sky-500/20', text: 'text-sky-400', icon: '🟦' },
        ].map((card) => (
          <div
            key={card.label}
            className={`${card.bg} ${card.border} border rounded-lg p-3 text-center`}
          >
            <div className="text-lg mb-1">{card.icon}</div>
            <div className={`text-2xl font-bold ${card.text}`}>{card.value}</div>
            <div className={`text-xs ${card.text} opacity-80`}>{card.label}</div>
          </div>
        ))}
      </div>

      {/* ─── Action Panel ────────────────────────────────────────── */}
      <div className={pixelBorder('bg-slate-800 rounded-lg p-4')}>
        <div className="flex items-center gap-2 mb-4">
          <Zap className="w-4 h-4 text-emerald-500" />
          <h3 className="text-sm font-semibold text-slate-200">Действия</h3>
        </div>

        {isSyncing ? (
          <div className="space-y-4">
            <div className="flex items-center gap-3">
              <Loader2 className="w-5 h-5 text-emerald-500 animate-spin" />
              <div>
                <p className="text-sm text-slate-200">Синхронизация...</p>
                <p className="text-xs text-slate-400">{currentFile || 'Подготовка...'}</p>
              </div>
            </div>
            <div className="w-full bg-slate-700 rounded-full h-2.5 overflow-hidden">
              <div
                className="bg-emerald-500 h-full rounded-full transition-all duration-500 ease-out"
                style={{ width: `${syncProgress}%` }}
              />
            </div>
            <p className="text-xs text-slate-500 text-center">{syncProgress}%</p>
          </div>
        ) : syncDone ? (
          <div className="flex items-center gap-3">
            <CheckCircle2 className="w-5 h-5 text-emerald-500" />
            <div>
              <p className="text-sm text-emerald-400 font-medium">Синхронизация завершена!</p>
              <p className="text-xs text-slate-400">Все моды обновлены до актуальных версий</p>
            </div>
          </div>
        ) : (
          <div className="flex gap-3">
            <button
              onClick={onSync}
              className="flex items-center gap-2 px-5 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white font-semibold rounded-lg transition-all hover:shadow-lg hover:shadow-emerald-500/25"
            >
              <ChevronRight className="w-4 h-4" />
              Синхронизировать
            </button>
            <button className="flex items-center gap-2 px-4 py-2.5 bg-slate-700 hover:bg-slate-600 text-slate-300 rounded-lg transition-colors">
              <RefreshCw className="w-4 h-4" />
              Проверить
            </button>
          </div>
        )}
      </div>

      {/* ─── Server Status ───────────────────────────────────────── */}
      <div className={pixelBorder('bg-slate-800 rounded-lg p-4')}>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Server className="w-4 h-4 text-emerald-500" />
            <div>
              <p className="text-sm text-slate-200">krofne server</p>
              <p className="text-xs text-slate-400 font-mono">example.com:25565</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <span className="flex items-center gap-1.5 text-xs text-emerald-400">
              <span className="w-2 h-2 bg-emerald-500 rounded-full" />
              Доступен
            </span>
            <button
              className="text-xs px-2 py-1 bg-slate-700 rounded text-slate-300 hover:bg-slate-600 transition-colors flex items-center gap-1"
              onClick={() => navigator.clipboard?.writeText('example.com:25565')}
            >
              <Copy className="w-3 h-3" />
              IP
            </button>
          </div>
        </div>
      </div>

      {/* ─── Log Panel ───────────────────────────────────────────── */}
      <div className={pixelBorder('bg-slate-800 rounded-lg p-4')}>
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <FileText className="w-4 h-4 text-emerald-500" />
            <h3 className="text-sm font-semibold text-slate-200">Логи</h3>
          </div>
          <button className="text-xs px-2 py-1 bg-slate-700 rounded text-slate-300 hover:bg-slate-600 transition-colors flex items-center gap-1">
            <Copy className="w-3 h-3" />
            Копировать
          </button>
        </div>
        <div className="bg-slate-900 rounded-lg p-3 max-h-48 overflow-y-auto font-mono text-xs space-y-1">
          {MOCK_LOGS.map((log, i) => (
            <div key={i} className="flex gap-2">
              <span className="text-slate-600 shrink-0">{log.time}</span>
              <span
                className={`shrink-0 ${
                  log.level === 'error'
                    ? 'text-red-400'
                    : log.level === 'warn'
                    ? 'text-amber-400'
                    : 'text-slate-500'
                }`}
              >
                [{log.level.toUpperCase().padEnd(4)}]
              </span>
              <span
                className={
                  log.level === 'error'
                    ? 'text-red-300'
                    : log.level === 'warn'
                    ? 'text-amber-300'
                    : 'text-slate-400'
                }
              >
                {log.message}
              </span>
            </div>
          ))}
        </div>
      </div>
    </>
  )
}

// ─── Detailed Mods Panel ──────────────────────────────────────────────

function DetailedMods() {
  const [filter, setFilter] = useState<ModStatus | 'all'>('all')

  const filtered = filter === 'all' ? MOCK_MODS : MOCK_MODS.filter((m) => m.status === filter)

  return (
    <>
      {/* ─── Filter Bar ──────────────────────────────────────────── */}
      <div className="flex items-center gap-2 flex-wrap">
        <span className="text-sm text-slate-400">Фильтр:</span>
        {(['all', 'installed', 'missing', 'wrong_hash', 'extra', 'allowed_extra'] as const).map(
          (f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`text-xs px-2.5 py-1 rounded transition-colors ${
                filter === f
                  ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                  : 'bg-slate-800 text-slate-400 border border-slate-700 hover:text-slate-200'
              }`}
            >
              {f === 'all' ? 'Все' : STATUS_CONFIG[f].icon + ' ' + STATUS_CONFIG[f].label}
            </button>
          )
        )}
      </div>

      {/* ─── Mods Table ──────────────────────────────────────────── */}
      <div className={pixelBorder('bg-slate-800 rounded-lg overflow-hidden')}>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-700 bg-slate-800/80">
                <th className="text-left px-4 py-3 text-xs font-semibold text-slate-400 uppercase tracking-wider">
                  Статус
                </th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-slate-400 uppercase tracking-wider">
                  Название
                </th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-slate-400 uppercase tracking-wider hidden md:table-cell">
                  Файл
                </th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-slate-400 uppercase tracking-wider hidden lg:table-cell">
                  Размер
                </th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-slate-400 uppercase tracking-wider hidden xl:table-cell">
                  SHA-512
                </th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((mod, i) => {
                const sc = STATUS_CONFIG[mod.status]
                return (
                  <tr
                    key={mod.id}
                    className={`border-b border-slate-700/50 hover:bg-slate-700/30 transition-colors ${
                      i % 2 === 1 ? 'bg-slate-800/50' : ''
                    }`}
                  >
                    <td className="px-4 py-2.5">
                      <span
                        className={`inline-flex items-center gap-1.5 text-xs px-2 py-0.5 rounded ${sc.bg} ${sc.text}`}
                      >
                        {sc.icon} {sc.label}
                      </span>
                    </td>
                    <td className="px-4 py-2.5 text-slate-200 font-medium">{mod.name}</td>
                    <td className="px-4 py-2.5 text-slate-400 font-mono text-xs hidden md:table-cell">
                      {mod.fileName}
                    </td>
                    <td className="px-4 py-2.5 text-slate-400 hidden lg:table-cell">{mod.size}</td>
                    <td className="px-4 py-2.5 text-slate-500 font-mono text-xs hidden xl:table-cell">
                      {mod.hash}...
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
        <div className="px-4 py-2 border-t border-slate-700 text-xs text-slate-500">
          Показано: {filtered.length} из {MOCK_MODS.length}
        </div>
      </div>
    </>
  )
}

// ─── Detailed Backups Panel ───────────────────────────────────────────

function DetailedBackups() {
  const backups = [
    { date: '2025-03-05 14:30', version: '0.9.0 → 1.0.0', files: 6, size: '34.2 MB' },
    { date: '2025-03-01 10:15', version: '0.8.5 → 0.9.0', files: 4, size: '18.7 MB' },
    { date: '2025-02-25 16:45', version: '0.8.0 → 0.8.5', files: 2, size: '9.1 MB' },
  ]

  return (
    <>
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-bold text-slate-100">Бэкапы</h2>
        <div className="flex gap-2">
          <button className="flex items-center gap-1.5 text-xs px-3 py-1.5 bg-slate-800 border border-slate-700 rounded-lg hover:border-emerald-500/50 hover:text-emerald-400 transition-all">
            <RefreshCw className="w-3.5 h-3.5" />
            Обновить
          </button>
          <button className="flex items-center gap-1.5 text-xs px-3 py-1.5 bg-slate-800 border border-slate-700 rounded-lg hover:border-emerald-500/50 hover:text-emerald-400 transition-all">
            <FolderOpen className="w-3.5 h-3.5" />
            Открыть папку
          </button>
        </div>
      </div>

      <div className="space-y-3">
        {backups.map((b, i) => (
          <div key={i} className={pixelBorder('bg-slate-800 rounded-lg p-4')}>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Archive className="w-5 h-5 text-emerald-500" />
                <div>
                  <p className="text-sm font-medium text-slate-200">{b.version}</p>
                  <p className="text-xs text-slate-400">{b.date}</p>
                </div>
              </div>
              <div className="flex items-center gap-4">
                <div className="text-right">
                  <p className="text-xs text-slate-400">{b.files} файлов</p>
                  <p className="text-xs text-slate-500">{b.size}</p>
                </div>
                <button className="text-xs px-3 py-1.5 bg-red-500/10 border border-red-500/20 text-red-400 rounded hover:bg-red-500/20 transition-colors flex items-center gap-1">
                  <Shield className="w-3 h-3" />
                  Откатить
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>
    </>
  )
}

// ─── Detailed Admin Panel ─────────────────────────────────────────────

function DetailedAdmin() {
  const [activeTab, setActiveTab] = useState<'manifest' | 'changelog'>('manifest')

  return (
    <>
      <h2 className="text-lg font-bold text-slate-100">Администрирование</h2>

      {/* Tabs */}
      <div className="flex gap-1 bg-slate-800 rounded-lg p-1 w-fit">
        {[
          { id: 'manifest' as const, label: 'Генератор манифеста' },
          { id: 'changelog' as const, label: 'Редактор чейнджлога' },
        ].map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`text-xs px-4 py-2 rounded-md transition-colors ${
              activeTab === tab.id
                ? 'bg-emerald-500/20 text-emerald-400'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {activeTab === 'manifest' ? (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {/* Form */}
          <div className={pixelBorder('bg-slate-800 rounded-lg p-4 space-y-3')}>
            <h3 className="text-sm font-semibold text-slate-200">Параметры манифеста</h3>
            {[
              { label: 'Название сборки', value: 'krofnePack' },
              { label: 'Версия сборки', value: '1.0.0' },
              { label: 'Версия Minecraft', value: '1.20.1' },
              { label: 'Загрузчик', value: 'forge' },
              { label: 'GitHub Raw URL', value: 'https://raw.githubusercontent.com/...' },
            ].map((field) => (
              <div key={field.label}>
                <label className="text-xs text-slate-400 mb-1 block">{field.label}</label>
                <input
                  type="text"
                  defaultValue={field.value}
                  className="w-full bg-slate-900 border border-slate-700 rounded px-3 py-1.5 text-sm text-slate-200 focus:outline-none focus:border-emerald-500/50"
                  readOnly
                />
              </div>
            ))}
            <div className="flex gap-2 pt-2">
              <button className="flex items-center gap-1.5 text-xs px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg transition-colors">
                <Package className="w-3.5 h-3.5" />
                Сканировать папку
              </button>
              <button className="flex items-center gap-1.5 text-xs px-4 py-2 bg-slate-700 hover:bg-slate-600 text-slate-300 rounded-lg transition-colors">
                <FileText className="w-3.5 h-3.5" />
                Сгенерировать
              </button>
            </div>
          </div>

          {/* Preview */}
          <div className={pixelBorder('bg-slate-800 rounded-lg p-4')}>
            <h3 className="text-sm font-semibold text-slate-200 mb-3">Предпросмотр манифеста</h3>
            <pre className="bg-slate-900 rounded-lg p-3 text-xs font-mono text-slate-400 overflow-auto max-h-80">
{`{
  "schemaVersion": 1,
  "packName": "krofnePack",
  "packVersion": "1.0.0",
  "minecraftVersion": "1.20.1",
  "loader": "forge",
  "mods": [
    {
      "name": "Create",
      "fileName": "create-1.20.1-0.5.1f.jar",
      "sha512": "a1b2c3d4...",
      "downloadUrl": "https://raw.github...",
      "size": 13025280
    }
  ]
}`}
            </pre>
          </div>
        </div>
      ) : (
        <div className={pixelBorder('bg-slate-800 rounded-lg p-4')}>
          <h3 className="text-sm font-semibold text-slate-200 mb-3">Чейнджлог</h3>
          <div className="space-y-3">
            {[
              { version: 'v1.0.0', date: '2025-03-05', items: ['Добавлен Sophisticated Backpacks', 'Обновлён Create до 0.5.1f', 'Обновлён AE2 до 15.0.23'] },
              { version: 'v0.9.0', date: '2025-03-01', items: ['Добавлен Mekanism', 'Удалён Thermal Expansion'] },
            ].map((entry) => (
              <div key={entry.version} className="bg-slate-900 rounded-lg p-3">
                <div className="flex items-center gap-2 mb-2">
                  <span className="text-xs bg-emerald-500/20 text-emerald-400 px-2 py-0.5 rounded">
                    {entry.version}
                  </span>
                  <span className="text-xs text-slate-500 flex items-center gap-1">
                    <Clock className="w-3 h-3" />
                    {entry.date}
                  </span>
                </div>
                <ul className="text-xs text-slate-400 space-y-1 ml-4 list-disc">
                  {entry.items.map((item, j) => (
                    <li key={j}>{item}</li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </div>
      )}
    </>
  )
}

// ─── Detailed Settings Panel ──────────────────────────────────────────

function DetailedSettings() {
  return (
    <>
      <h2 className="text-lg font-bold text-slate-100">Настройки</h2>

      <div className={pixelBorder('bg-slate-800 rounded-lg p-4 space-y-5')}>
        {/* Manifest URL */}
        <div>
          <label className="text-xs text-slate-400 mb-1 block">URL манифеста</label>
          <div className="flex gap-2">
            <input
              type="text"
              defaultValue="https://raw.githubusercontent.com/KROFN/krofne-minecraft-pack/main/manifest.json"
              className="flex-1 bg-slate-900 border border-slate-700 rounded px-3 py-1.5 text-sm text-slate-200 font-mono focus:outline-none focus:border-emerald-500/50"
              readOnly
            />
            <button className="text-xs px-3 py-1.5 bg-slate-700 hover:bg-slate-600 text-slate-300 rounded transition-colors">
              Сбросить
            </button>
          </div>
        </div>

        {/* UI Mode */}
        <div>
          <label className="text-xs text-slate-400 mb-2 block">Режим интерфейса</label>
          <div className="grid grid-cols-2 gap-3">
            <div className="bg-slate-900 border-2 border-emerald-500/30 rounded-lg p-3 text-center cursor-pointer">
              <p className="text-sm font-medium text-emerald-400">Простой</p>
              <p className="text-xs text-slate-500 mt-1">Минимальный интерфейс</p>
            </div>
            <div className="bg-slate-900 border border-slate-700 rounded-lg p-3 text-center cursor-pointer hover:border-slate-600 transition-colors">
              <p className="text-sm font-medium text-slate-300">Подробный</p>
              <p className="text-xs text-slate-500 mt-1">Полный контроль</p>
            </div>
          </div>
        </div>

        {/* Debug Mode */}
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm text-slate-200">Режим отладки</p>
            <p className="text-xs text-slate-500">Показывать SHA-512, URL загрузки и подробные логи</p>
          </div>
          <div className="w-10 h-5 bg-slate-700 rounded-full relative cursor-pointer">
            <div className="w-4 h-4 bg-slate-400 rounded-full absolute top-0.5 left-0.5 transition-transform" />
          </div>
        </div>

        {/* Parallel Downloads */}
        <div>
          <label className="text-xs text-slate-400 mb-1 block">Параллельные загрузки</label>
          <input
            type="number"
            defaultValue={3}
            min={1}
            max={10}
            className="w-24 bg-slate-900 border border-slate-700 rounded px-3 py-1.5 text-sm text-slate-200 focus:outline-none focus:border-emerald-500/50"
            readOnly
          />
        </div>

        {/* Retries */}
        <div>
          <label className="text-xs text-slate-400 mb-1 block">Попыток при ошибке</label>
          <input
            type="number"
            defaultValue={3}
            min={1}
            max={10}
            className="w-24 bg-slate-900 border border-slate-700 rounded px-3 py-1.5 text-sm text-slate-200 focus:outline-none focus:border-emerald-500/50"
            readOnly
          />
        </div>

        {/* Save */}
        <div className="flex items-center justify-between pt-2 border-t border-slate-700">
          <div className="text-xs text-slate-500">
            krofnePackUpdater v1.0.0
          </div>
          <button className="flex items-center gap-1.5 text-xs px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg transition-colors">
            <CheckCircle2 className="w-3.5 h-3.5" />
            Сохранить
          </button>
        </div>
      </div>
    </>
  )
}

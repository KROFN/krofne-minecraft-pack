import { X, ExternalLink } from 'lucide-react';
import { useAppState } from '@/app/AppShell';
import { ModStatusBadge } from './ModStatusBadge';
import { formatBytes, truncateMiddle, formatSha512, formatDate } from '@/lib/format';
import { getStatusLabel, getStatusIcon } from '@/lib/status';
import type { ModCheckResult } from '@shared/types/mod';

interface ModDetailsDrawerProps {
  mod: ModCheckResult;
  onClose: () => void;
}

export function ModDetailsDrawer({ mod, onClose }: ModDetailsDrawerProps) {
  const { settings } = useAppState();

  return (
    <div className="fixed inset-0 z-40 flex justify-end">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/50" onClick={onClose} />

      {/* Drawer */}
      <div className="relative w-full max-w-md bg-slate-800 border-l border-slate-700 overflow-y-auto shadow-xl">
        {/* Header */}
        <div className="sticky top-0 bg-slate-800 border-b border-slate-700 px-4 py-3 flex items-center justify-between">
          <h3 className="text-sm font-semibold text-slate-100">Подробности мода</h3>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-200 transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-4 space-y-4">
          {/* Status */}
          <div>
            <label className="text-xs text-slate-500 block mb-1">Статус</label>
            <ModStatusBadge status={mod.status} />
          </div>

          {/* Name */}
          {mod.manifestMod && (
            <div>
              <label className="text-xs text-slate-500 block mb-1">Название</label>
              <p className="text-sm text-slate-200">{mod.manifestMod.name}</p>
            </div>
          )}

          {/* Message */}
          <div>
            <label className="text-xs text-slate-500 block mb-1">Сообщение</label>
            <p className="text-sm text-slate-300">{mod.message}</p>
          </div>

          {/* Manifest file info */}
          {mod.manifestMod && (
            <div className="bg-slate-900 rounded-lg p-3 space-y-2">
              <h4 className="text-xs font-medium text-slate-400">Информация из манифеста</h4>
              <div className="space-y-1.5">
                <div className="flex justify-between text-xs">
                  <span className="text-slate-500">Файл</span>
                  <span className="text-slate-300 font-mono">{mod.manifestMod.fileName}</span>
                </div>
                {mod.manifestMod.sizeBytes && (
                  <div className="flex justify-between text-xs">
                    <span className="text-slate-500">Размер</span>
                    <span className="text-slate-300">{formatBytes(mod.manifestMod.sizeBytes)}</span>
                  </div>
                )}
                <div className="flex justify-between text-xs">
                  <span className="text-slate-500">Сторона</span>
                  <span className="text-slate-300">{mod.manifestMod.side}</span>
                </div>
                <div className="flex justify-between text-xs">
                  <span className="text-slate-500">Обязательный</span>
                  <span className="text-slate-300">{mod.manifestMod.required ? 'Да' : 'Нет'}</span>
                </div>
                {settings.debugMode && (
                  <>
                    <div className="flex justify-between text-xs">
                      <span className="text-slate-500">Ожидаемый SHA-512</span>
                      <span className="text-slate-400 font-mono">{formatSha512(mod.manifestMod.sha512)}</span>
                    </div>
                    <div className="flex justify-between text-xs">
                      <span className="text-slate-500">ID</span>
                      <span className="text-slate-400 font-mono">{mod.manifestMod.id}</span>
                    </div>
                  </>
                )}
              </div>
            </div>
          )}

          {/* Local file info */}
          {mod.localFile && (
            <div className="bg-slate-900 rounded-lg p-3 space-y-2">
              <h4 className="text-xs font-medium text-slate-400">Локальный файл</h4>
              <div className="space-y-1.5">
                <div className="flex justify-between text-xs">
                  <span className="text-slate-500">Файл</span>
                  <span className="text-slate-300 font-mono">{mod.localFile.fileName}</span>
                </div>
                <div className="flex justify-between text-xs">
                  <span className="text-slate-500">Размер</span>
                  <span className="text-slate-300">{formatBytes(mod.localFile.sizeBytes)}</span>
                </div>
                <div className="flex justify-between text-xs">
                  <span className="text-slate-500">Изменён</span>
                  <span className="text-slate-300">{formatDate(mod.localFile.modifiedAt)}</span>
                </div>
                {settings.debugMode && (
                  <div className="flex justify-between text-xs">
                    <span className="text-slate-500">SHA-512</span>
                    <span className="text-slate-400 font-mono">{formatSha512(mod.localFile.sha512)}</span>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Expected filename */}
          {mod.expectedFileName && (
            <div>
              <label className="text-xs text-slate-500 block mb-1">Ожидаемое имя файла</label>
              <p className="text-sm text-slate-300 font-mono">{mod.expectedFileName}</p>
            </div>
          )}

          {/* Download URL (debug) */}
          {settings.debugMode && mod.manifestMod?.downloadUrl && (
            <div>
              <label className="text-xs text-slate-500 block mb-1">URL загрузки</label>
              <a
                href={mod.manifestMod.downloadUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="text-xs text-sky-400 hover:text-sky-300 flex items-center gap-1 break-all"
              >
                {truncateMiddle(mod.manifestMod.downloadUrl, 60)}
                <ExternalLink className="w-3 h-3 shrink-0" />
              </a>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

import { useState, useCallback } from 'react';
import { Copy, Wifi, WifiOff, Loader2 } from 'lucide-react';
import { useAppState } from '@/app/AppShell';
import { KCard, KCardHeader, KCardTitle } from '@/components/common/KCard';
import { KBadge } from '@/components/common/KBadge';
import { KButton } from '@/components/common/KButton';
import * as api from '@/lib/api';
import type { ServerStatusResult } from '@shared/types/ipc';

export function ServerStatusCard() {
  const { manifest } = useAppState();
  const [status, setStatus] = useState<ServerStatusResult | null>(null);
  const [checking, setChecking] = useState(false);
  const [copied, setCopied] = useState(false);

  const server = manifest?.server;
  const serverAddr = server ? `${server.address}:${server.port}` : '';

  const handleCheckStatus = useCallback(async () => {
    if (!server || !api.isElectron()) return;
    setChecking(true);
    try {
      const result = await api.checkServerStatus(server.address, server.port);
      setStatus(result);
    } catch {
      setStatus({ reachable: false, latencyMs: null, error: 'Не удалось проверить' });
    } finally {
      setChecking(false);
    }
  }, [server]);

  const handleCopyIP = useCallback(async () => {
    if (!serverAddr) return;
    try {
      await navigator.clipboard.writeText(serverAddr);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Fallback — ignore
    }
  }, [serverAddr]);

  if (!server) return null;

  return (
    <KCard padding="md">
      <KCardHeader>
        <KCardTitle className="flex items-center gap-2">
          {status?.reachable ? (
            <Wifi className="w-4 h-4 text-emerald-500" />
          ) : (
            <WifiOff className="w-4 h-4 text-slate-500" />
          )}
          Сервер
        </KCardTitle>
        {status && (
          <KBadge variant={status.reachable ? 'success' : 'error'}>
            {status.reachable ? 'Онлайн' : 'Оффлайн'}
          </KBadge>
        )}
      </KCardHeader>

      <div className="space-y-2">
        <div className="flex items-center justify-between text-sm">
          <span className="text-slate-400">Название</span>
          <span className="text-slate-200 font-medium">{server.name}</span>
        </div>
        <div className="flex items-center justify-between text-sm">
          <span className="text-slate-400">Адрес</span>
          <span className="text-slate-200 font-mono">{serverAddr}</span>
        </div>
        {status?.latencyMs !== null && status?.latencyMs !== undefined && (
          <div className="flex items-center justify-between text-sm">
            <span className="text-slate-400">Пинг</span>
            <span className="text-emerald-400">{status.latencyMs} мс</span>
          </div>
        )}
      </div>

      <div className="flex gap-2 mt-3">
        <KButton variant="secondary" size="sm" onClick={handleCopyIP}>
          <Copy className="w-3.5 h-3.5" />
          {copied ? 'Скопировано!' : 'Скопировать IP'}
        </KButton>
        <KButton variant="secondary" size="sm" onClick={handleCheckStatus} loading={checking}>
          {checking ? (
            <Loader2 className="w-3.5 h-3.5 animate-spin" />
          ) : (
            <Wifi className="w-3.5 h-3.5" />
          )}
          Проверить доступность
        </KButton>
      </div>
    </KCard>
  );
}

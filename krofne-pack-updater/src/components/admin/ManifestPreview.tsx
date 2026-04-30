import { useState } from 'react';
import { Copy, Check } from 'lucide-react';
import { KButton } from '@/components/common/KButton';
import type { Manifest } from '@shared/types/manifest';
import { cn } from '@/lib/cn';

interface ManifestPreviewProps {
  manifest: Manifest;
}

export function ManifestPreview({ manifest }: ManifestPreviewProps) {
  const [copied, setCopied] = useState(false);

  const jsonString = JSON.stringify(manifest, null, 2);

  async function handleCopy() {
    try {
      await navigator.clipboard.writeText(jsonString);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // ignore
    }
  }

  // Simple syntax highlighting
  function highlightJson(json: string): React.ReactNode[] {
    return json.split('\n').map((line, i) => {
      // Key: value pattern
      const keyMatch = line.match(/^(\s*)"([^"]+)":\s*(.*)$/);
      if (keyMatch) {
        const [, indent, key, value] = keyMatch;
        return (
          <div key={i} className="font-mono text-xs leading-5">
            <span className="text-slate-600">{indent}</span>
            <span className="text-sky-400">"{key}"</span>
            <span className="text-slate-500">: </span>
            <span className={getValueColor(value)}>{value}</span>
          </div>
        );
      }
      return (
        <div key={i} className="font-mono text-xs leading-5 text-slate-400">
          {line}
        </div>
      );
    });
  }

  function getValueColor(value: string): string {
    if (value.startsWith('"')) return 'text-emerald-400';
    if (value === 'true' || value === 'false') return 'text-amber-400';
    if (!isNaN(Number(value))) return 'text-purple-400';
    if (value.startsWith('[') || value.startsWith('{')) return 'text-slate-400';
    return 'text-slate-300';
  }

  return (
    <div className="relative">
      <div className="absolute top-2 right-2 z-10">
        <KButton variant="ghost" size="sm" onClick={handleCopy}>
          {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
        </KButton>
      </div>
      <div className="bg-slate-900 border border-slate-700 rounded-lg p-4 max-h-96 overflow-y-auto">
        {highlightJson(jsonString)}
      </div>
    </div>
  );
}

import { useState, useCallback } from 'react';
import { FolderOpen, Upload, FileCode, Copy, Save } from 'lucide-react';
import { KCard, KCardHeader, KCardTitle } from '@/components/common/KCard';
import { KButton } from '@/components/common/KButton';
import { KBadge } from '@/components/common/KBadge';
import { ManifestPreview } from './ManifestPreview';
import * as api from '@/lib/api';
import { formatBytes, formatSha512 } from '@/lib/format';
import type { Manifest } from '@shared/types/manifest';
import type { AdminScanResult } from '@shared/types/ipc';
import type { ChangelogEntry } from '@shared/types/manifest';

interface ManifestForm {
  packName: string;
  packVersion: string;
  minecraftVersion: string;
  loader: string;
  loaderVersion: string;
  githubRawBaseUrl: string;
  localModsPath: string;
  oldManifestUrl: string;
  changelog: ChangelogEntry[];
}

const defaultForm: ManifestForm = {
  packName: '',
  packVersion: '',
  minecraftVersion: '1.20.1',
  loader: 'forge',
  loaderVersion: '',
  githubRawBaseUrl: '',
  localModsPath: '',
  oldManifestUrl: '',
  changelog: [],
};

export function ManifestGeneratorPanel() {
  const [form, setForm] = useState<ManifestForm>(defaultForm);
  const [scanResult, setScanResult] = useState<AdminScanResult | null>(null);
  const [scanning, setScanning] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [generatedManifest, setGeneratedManifest] = useState<Manifest | null>(null);
  const [saving, setSaving] = useState(false);
  const [copied, setCopied] = useState(false);

  function updateForm(field: keyof ManifestForm, value: string) {
    setForm((prev) => ({ ...prev, [field]: value }));
  }

  const handleSelectFolder = useCallback(async () => {
    if (!api.isElectron()) return;
    try {
      const path = await api.selectModsFolder();
      if (path) {
        updateForm('localModsPath', path);
      }
    } catch {
      // ignore
    }
  }, []);

  const handleScan = useCallback(async () => {
    if (!api.isElectron() || !form.localModsPath) return;
    setScanning(true);
    try {
      const result = await api.adminScanFolder(form.localModsPath);
      setScanResult(result);
    } catch {
      // ignore
    } finally {
      setScanning(false);
    }
  }, [form.localModsPath]);

  const handleGenerate = useCallback(async () => {
    if (!api.isElectron()) return;
    setGenerating(true);
    try {
      const manifest = await api.adminGenerateManifest({
        packName: form.packName,
        packVersion: form.packVersion,
        minecraftVersion: form.minecraftVersion,
        loader: form.loader,
        loaderVersion: form.loaderVersion || null,
        githubRawBaseUrl: form.githubRawBaseUrl,
        localModsPath: form.localModsPath,
        oldManifestUrl: form.oldManifestUrl || undefined,
        changelog: form.changelog,
      });
      setGeneratedManifest(manifest);
    } catch {
      // ignore
    } finally {
      setGenerating(false);
    }
  }, [form]);

  const handleSave = useCallback(async () => {
    if (!api.isElectron() || !generatedManifest) return;
    setSaving(true);
    try {
      await api.adminSaveManifest(generatedManifest, 'manifest.draft.json');
    } catch {
      // ignore
    } finally {
      setSaving(false);
    }
  }, [generatedManifest]);

  const handleCopy = useCallback(() => {
    if (!generatedManifest) return;
    navigator.clipboard.writeText(JSON.stringify(generatedManifest, null, 2))
      .then(() => {
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
      })
      .catch(() => {});
  }, [generatedManifest]);

  return (
    <div className="space-y-4">
      {/* Form fields */}
      <KCard padding="lg">
        <KCardHeader>
          <KCardTitle>Параметры манифеста</KCardTitle>
        </KCardHeader>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="text-xs text-slate-400 block mb-1">Название сборки</label>
            <input
              type="text"
              value={form.packName}
              onChange={(e) => updateForm('packName', e.target.value)}
              className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-lg text-sm text-slate-200 focus:outline-none focus:border-emerald-500/50"
              placeholder="Krofne Pack"
            />
          </div>
          <div>
            <label className="text-xs text-slate-400 block mb-1">Версия сборки</label>
            <input
              type="text"
              value={form.packVersion}
              onChange={(e) => updateForm('packVersion', e.target.value)}
              className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-lg text-sm text-slate-200 focus:outline-none focus:border-emerald-500/50"
              placeholder="1.0.0"
            />
          </div>
          <div>
            <label className="text-xs text-slate-400 block mb-1">Версия Minecraft</label>
            <input
              type="text"
              value={form.minecraftVersion}
              onChange={(e) => updateForm('minecraftVersion', e.target.value)}
              className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-lg text-sm text-slate-200 focus:outline-none focus:border-emerald-500/50"
            />
          </div>
          <div>
            <label className="text-xs text-slate-400 block mb-1">Загрузчик</label>
            <select
              value={form.loader}
              onChange={(e) => updateForm('loader', e.target.value)}
              className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-lg text-sm text-slate-200 focus:outline-none focus:border-emerald-500/50"
            >
              <option value="forge">Forge</option>
              <option value="fabric">Fabric</option>
              <option value="neoforge">NeoForge</option>
              <option value="quilt">Quilt</option>
            </select>
          </div>
          <div>
            <label className="text-xs text-slate-400 block mb-1">Версия загрузчика</label>
            <input
              type="text"
              value={form.loaderVersion}
              onChange={(e) => updateForm('loaderVersion', e.target.value)}
              className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-lg text-sm text-slate-200 focus:outline-none focus:border-emerald-500/50"
              placeholder="47.3.0"
            />
          </div>
          <div>
            <label className="text-xs text-slate-400 block mb-1">GitHub Raw Base URL</label>
            <input
              type="text"
              value={form.githubRawBaseUrl}
              onChange={(e) => updateForm('githubRawBaseUrl', e.target.value)}
              className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-lg text-sm text-slate-200 focus:outline-none focus:border-emerald-500/50"
              placeholder="https://raw.githubusercontent.com/..."
            />
          </div>
          <div>
            <label className="text-xs text-slate-400 block mb-1">Локальная папка mods</label>
            <div className="flex gap-2">
              <input
                type="text"
                value={form.localModsPath}
                onChange={(e) => updateForm('localModsPath', e.target.value)}
                className="flex-1 px-3 py-2 bg-slate-900 border border-slate-700 rounded-lg text-sm text-slate-200 font-mono focus:outline-none focus:border-emerald-500/50"
                placeholder="/path/to/mods"
              />
              <KButton variant="secondary" size="sm" onClick={handleSelectFolder}>
                <FolderOpen className="w-3.5 h-3.5" />
              </KButton>
            </div>
          </div>
          <div>
            <label className="text-xs text-slate-400 block mb-1">URL старого манифеста (опционально)</label>
            <input
              type="text"
              value={form.oldManifestUrl}
              onChange={(e) => updateForm('oldManifestUrl', e.target.value)}
              className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-lg text-sm text-slate-200 focus:outline-none focus:border-emerald-500/50"
              placeholder="https://..."
            />
          </div>
        </div>
      </KCard>

      {/* Scan + Generate */}
      <div className="flex gap-3">
        <KButton onClick={handleScan} loading={scanning} disabled={!form.localModsPath}>
          <FileCode className="w-4 h-4" />
          Сканировать папку
        </KButton>
        <KButton
          onClick={handleGenerate}
          loading={generating}
          disabled={!form.packName || !form.packVersion || !form.localModsPath}
          variant="primary"
        >
          Сгенерировать манифест
        </KButton>
      </div>

      {/* Scan results */}
      {scanResult && (
        <KCard padding="md">
          <KCardHeader>
            <KCardTitle>Отсканированные файлы ({scanResult.files.length})</KCardTitle>
          </KCardHeader>
          <div className="max-h-60 overflow-y-auto space-y-1">
            {scanResult.files.map((file, i) => (
              <div key={i} className="flex items-center justify-between text-xs py-1">
                <span className="text-slate-300 font-mono">{file.fileName}</span>
                <div className="flex items-center gap-3">
                  <span className="text-slate-500">{formatBytes(file.sizeBytes)}</span>
                  <span className="text-slate-600 font-mono">{formatSha512(file.sha512)}</span>
                </div>
              </div>
            ))}
          </div>
        </KCard>
      )}

      {/* Generated manifest preview */}
      {generatedManifest && (
        <div className="space-y-3">
          <div className="flex items-center gap-2">
            <h3 className="text-sm font-semibold text-slate-200">Сгенерированный манифест</h3>
            <KBadge variant="success">v{generatedManifest.packVersion}</KBadge>
          </div>

          <div className="flex gap-2 mb-2">
            <KButton variant="secondary" size="sm" onClick={handleSave} loading={saving}>
              <Save className="w-3.5 h-3.5" />
              Сохранить manifest.draft.json
            </KButton>
            <KButton variant="secondary" size="sm" onClick={handleCopy}>
              <Copy className="w-3.5 h-3.5" />
              {copied ? 'Скопировано!' : 'Скопировать manifest'}
            </KButton>
          </div>

          <ManifestPreview manifest={generatedManifest} />
        </div>
      )}
    </div>
  );
}

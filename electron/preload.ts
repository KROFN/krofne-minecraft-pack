import { contextBridge, ipcRenderer } from 'electron';
import type { KrofnePackAPI } from '../shared/types/ipc';

const api: KrofnePackAPI = {
  // Settings
  getSettings: () => ipcRenderer.invoke('settings:get'),
  saveSettings: (settings) => ipcRenderer.invoke('settings:save', settings),

  // Minecraft folder
  detectMinecraftFolders: () => ipcRenderer.invoke('minecraft:detectFolders'),
  selectModsFolder: () => ipcRenderer.invoke('minecraft:selectFolder'),

  // Manifest
  loadManifest: (url) => ipcRenderer.invoke('manifest:load', url),

  // Check & Sync
  checkMods: () => ipcRenderer.invoke('sync:check'),
  synchronize: (syncPlan) => ipcRenderer.invoke('sync:execute', syncPlan),
  onSyncProgress: (callback) => {
    const handler = (_event: Electron.IpcRendererEvent, progress: unknown) => {
      callback(progress as any);
    };
    ipcRenderer.on('sync:progress', handler);
    return () => ipcRenderer.removeListener('sync:progress', handler);
  },

  // Backups
  listBackups: () => ipcRenderer.invoke('backup:list'),
  getBackupMeta: (sessionId) => ipcRenderer.invoke('backup:getMeta', sessionId),
  rollbackBackup: (sessionId) => ipcRenderer.invoke('backup:rollback', sessionId),

  // Folder operations
  openFolder: (path) => ipcRenderer.invoke('folder:open', path),

  // Server
  checkServerStatus: (address, port) =>
    ipcRenderer.invoke('server:checkStatus', address, port),

  // App
  getAppVersion: () => ipcRenderer.invoke('app:getVersion'),
  checkAppUpdate: () => ipcRenderer.invoke('app:checkUpdate'),

  // Admin
  adminScanFolder: (folderPath) =>
    ipcRenderer.invoke('admin:scanFolder', folderPath),
  adminGenerateManifest: (data) =>
    ipcRenderer.invoke('admin:generateManifest', data),
  adminSaveManifest: (manifest, filePath) =>
    ipcRenderer.invoke('admin:saveManifest', manifest, filePath),

  // Logs
  getLogs: () => ipcRenderer.invoke('logs:get'),
  openLogsFolder: () => ipcRenderer.invoke('logs:openFolder'),
  copyLogsToClipboard: () => ipcRenderer.invoke('logs:copyToClipboard'),

  // Recovery
  checkRecovery: () => ipcRenderer.invoke('recovery:check'),
  performRecovery: () => ipcRenderer.invoke('recovery:perform'),
};

contextBridge.exposeInMainWorld('krofnePack', api);

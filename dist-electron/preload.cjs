"use strict";

// electron/preload.ts
var import_electron = require("electron");
var api = {
  // Settings
  getSettings: () => import_electron.ipcRenderer.invoke("settings:get"),
  saveSettings: (settings) => import_electron.ipcRenderer.invoke("settings:save", settings),
  // Minecraft folder
  detectMinecraftFolders: () => import_electron.ipcRenderer.invoke("minecraft:detectFolders"),
  selectModsFolder: () => import_electron.ipcRenderer.invoke("minecraft:selectFolder"),
  // Manifest
  loadManifest: (url) => import_electron.ipcRenderer.invoke("manifest:load", url),
  // Check & Sync
  checkMods: () => import_electron.ipcRenderer.invoke("sync:check"),
  synchronize: (syncPlan) => import_electron.ipcRenderer.invoke("sync:execute", syncPlan),
  onSyncProgress: (callback) => {
    const handler = (_event, progress) => {
      callback(progress);
    };
    import_electron.ipcRenderer.on("sync:progress", handler);
    return () => import_electron.ipcRenderer.removeListener("sync:progress", handler);
  },
  // Backups
  listBackups: () => import_electron.ipcRenderer.invoke("backup:list"),
  getBackupMeta: (sessionId) => import_electron.ipcRenderer.invoke("backup:getMeta", sessionId),
  rollbackBackup: (sessionId) => import_electron.ipcRenderer.invoke("backup:rollback", sessionId),
  // Folder operations
  openFolder: (path) => import_electron.ipcRenderer.invoke("folder:open", path),
  // Server
  checkServerStatus: (address, port) => import_electron.ipcRenderer.invoke("server:checkStatus", address, port),
  // App
  getAppVersion: () => import_electron.ipcRenderer.invoke("app:getVersion"),
  checkAppUpdate: () => import_electron.ipcRenderer.invoke("app:checkUpdate"),
  // Admin
  adminScanFolder: (folderPath) => import_electron.ipcRenderer.invoke("admin:scanFolder", folderPath),
  adminGenerateManifest: (data) => import_electron.ipcRenderer.invoke("admin:generateManifest", data),
  adminSaveManifest: (manifest, filePath) => import_electron.ipcRenderer.invoke("admin:saveManifest", manifest, filePath),
  // Logs
  getLogs: () => import_electron.ipcRenderer.invoke("logs:get"),
  openLogsFolder: () => import_electron.ipcRenderer.invoke("logs:openFolder"),
  copyLogsToClipboard: () => import_electron.ipcRenderer.invoke("logs:copyToClipboard"),
  // Recovery
  checkRecovery: () => import_electron.ipcRenderer.invoke("recovery:check"),
  performRecovery: () => import_electron.ipcRenderer.invoke("recovery:perform")
};
import_electron.contextBridge.exposeInMainWorld("krofnePack", api);
//# sourceMappingURL=preload.cjs.map

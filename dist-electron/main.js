var __defProp = Object.defineProperty;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __esm = (fn, res) => function __init() {
  return fn && (res = (0, fn[__getOwnPropNames(fn)[0]])(fn = 0)), res;
};
var __export = (target, all) => {
  for (var name in all)
    __defProp(target, name, { get: all[name], enumerable: true });
};

// shared/constants.ts
var APP_VERSION, BACKUP_FOLDER_NAME, DISABLED_FOLDER_NAME, SYNC_STATE_FILE, BACKUP_META_FILE, SETTINGS_FILE, UPDATE_CHECK_URL, GITHUB_RELEASES_URL, MAX_PARALLEL_DOWNLOADS, DOWNLOAD_RETRIES, DOWNLOAD_TIMEOUT_MS, MOD_FILE_EXTENSION, DOWNLOAD_TEMP_EXTENSION;
var init_constants = __esm({
  "shared/constants.ts"() {
    "use strict";
    APP_VERSION = "1.0.0";
    BACKUP_FOLDER_NAME = "_backup_by_krofne_pack";
    DISABLED_FOLDER_NAME = "_disabled_by_krofne_pack";
    SYNC_STATE_FILE = ".krofne-sync-state.json";
    BACKUP_META_FILE = "backup-meta.json";
    SETTINGS_FILE = "settings.json";
    UPDATE_CHECK_URL = "https://raw.githubusercontent.com/KROFN/krofnePackUpdater/main/update.json";
    GITHUB_RELEASES_URL = "https://github.com/KROFN/krofnePackUpdater/releases/latest";
    MAX_PARALLEL_DOWNLOADS = 3;
    DOWNLOAD_RETRIES = 3;
    DOWNLOAD_TIMEOUT_MS = 6e4;
    MOD_FILE_EXTENSION = ".jar";
    DOWNLOAD_TEMP_EXTENSION = ".download";
  }
});

// electron/utils/safePath.ts
import path from "path";
import fs from "fs/promises";
function normalizePath(p) {
  return path.resolve(path.normalize(p));
}
async function ensureDir(dirPath) {
  const resolved = normalizePath(dirPath);
  await fs.mkdir(resolved, { recursive: true });
}
function safeJoin(...segments) {
  return normalizePath(path.join(...segments));
}
function getBackupDir(modsPath) {
  return safeJoin(modsPath, BACKUP_FOLDER_NAME);
}
function getDisabledDir(modsPath) {
  return safeJoin(modsPath, DISABLED_FOLDER_NAME);
}
var init_safePath = __esm({
  "electron/utils/safePath.ts"() {
    "use strict";
    init_constants();
  }
});

// electron/utils/fileSystem.ts
var fileSystem_exports = {};
__export(fileSystem_exports, {
  copyFile: () => copyFile,
  deleteFile: () => deleteFile,
  fileExists: () => fileExists,
  getFileModifiedTime: () => getFileModifiedTime,
  getFileSize: () => getFileSize,
  listFiles: () => listFiles,
  moveFile: () => moveFile,
  openFolderInExplorer: () => openFolderInExplorer,
  readJsonFile: () => readJsonFile,
  writeJsonFile: () => writeJsonFile
});
import fs2 from "fs/promises";
import fsCb from "fs";
import path2 from "path";
import { spawn } from "child_process";
async function readJsonFile(filePath) {
  try {
    const resolved = normalizePath(filePath);
    const content = await fs2.readFile(resolved, "utf-8");
    return JSON.parse(content);
  } catch {
    return null;
  }
}
async function writeJsonFile(filePath, data) {
  const resolved = normalizePath(filePath);
  await ensureDir(path2.dirname(resolved));
  const content = JSON.stringify(data, null, 2) + "\n";
  await fs2.writeFile(resolved, content, "utf-8");
}
async function copyFile(src, dest) {
  const resolvedSrc = normalizePath(src);
  const resolvedDest = normalizePath(dest);
  await ensureDir(path2.dirname(resolvedDest));
  await fs2.copyFile(resolvedSrc, resolvedDest);
}
async function moveFile(src, dest) {
  const resolvedSrc = normalizePath(src);
  const resolvedDest = normalizePath(dest);
  await ensureDir(path2.dirname(resolvedDest));
  await fs2.rename(resolvedSrc, resolvedDest);
}
async function deleteFile(filePath) {
  try {
    const resolved = normalizePath(filePath);
    await fs2.unlink(resolved);
  } catch (err) {
    if (err?.code !== "ENOENT") throw err;
  }
}
async function listFiles(dirPath, extension) {
  const resolved = normalizePath(dirPath);
  let entries;
  try {
    entries = await fs2.readdir(resolved);
  } catch {
    return [];
  }
  const result = [];
  for (const entry of entries) {
    if (extension && !entry.endsWith(extension)) continue;
    const fullPath = path2.join(resolved, entry);
    try {
      const stat = await fs2.stat(fullPath);
      if (stat.isFile()) {
        result.push(fullPath);
      }
    } catch {
    }
  }
  return result;
}
async function fileExists(filePath) {
  try {
    const resolved = normalizePath(filePath);
    await fs2.access(resolved, fsCb.constants.F_OK);
    return true;
  } catch {
    return false;
  }
}
async function getFileSize(filePath) {
  const resolved = normalizePath(filePath);
  const stat = await fs2.stat(resolved);
  return stat.size;
}
async function getFileModifiedTime(filePath) {
  const resolved = normalizePath(filePath);
  const stat = await fs2.stat(resolved);
  return stat.mtime.toISOString();
}
async function openFolderInExplorer(folderPath) {
  const resolved = normalizePath(folderPath);
  return new Promise((resolve, reject) => {
    const child = spawn("explorer", [resolved], {
      shell: false,
      detached: true,
      stdio: "ignore"
    });
    child.unref();
    resolve();
  });
}
var init_fileSystem = __esm({
  "electron/utils/fileSystem.ts"() {
    "use strict";
    init_safePath();
  }
});

// electron/main.ts
import { fileURLToPath } from "node:url";
import { app as app4, BrowserWindow as BrowserWindow2 } from "electron";
import path14 from "node:path";

// electron/ipc/registerIpcHandlers.ts
init_constants();
import { ipcMain, dialog, clipboard } from "electron";
import path13 from "path";

// electron/services/settingsService.ts
import path3 from "path";
import { app } from "electron";

// shared/types/settings.ts
var DEFAULT_SETTINGS = {
  manifestUrl: "https://raw.githubusercontent.com/KROFN/krofne-minecraft-pack/main/manifest.json",
  lastModsPath: null,
  uiMode: "simple",
  debugMode: false,
  maxParallelDownloads: 3,
  downloadRetries: 3
};

// electron/services/settingsService.ts
init_constants();
init_fileSystem();
function getSettingsPath() {
  return path3.join(app.getPath("userData"), SETTINGS_FILE);
}
async function getSettings() {
  const data = await readJsonFile(getSettingsPath());
  if (!data) {
    return { ...DEFAULT_SETTINGS };
  }
  return { ...DEFAULT_SETTINGS, ...data };
}
async function saveSettings(partial) {
  const current = await getSettings();
  const updated = { ...current, ...partial };
  await writeJsonFile(getSettingsPath(), updated);
  return updated;
}

// electron/services/logService.ts
import path4 from "path";
import fs3 from "fs/promises";
import { app as app2 } from "electron";

// electron/utils/time.ts
function formatTimestamp(date) {
  const d = date ?? /* @__PURE__ */ new Date();
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  const hours = String(d.getHours()).padStart(2, "0");
  const minutes = String(d.getMinutes()).padStart(2, "0");
  const seconds = String(d.getSeconds()).padStart(2, "0");
  return `${year}-${month}-${day}_${hours}-${minutes}-${seconds}`;
}
function formatIsoDate(date) {
  const d = date ?? /* @__PURE__ */ new Date();
  return d.toISOString();
}
function formatDateForLog(date) {
  const d = date ?? /* @__PURE__ */ new Date();
  const hours = String(d.getHours()).padStart(2, "0");
  const minutes = String(d.getMinutes()).padStart(2, "0");
  const seconds = String(d.getSeconds()).padStart(2, "0");
  return `${hours}:${minutes}:${seconds}`;
}

// electron/services/logService.ts
init_safePath();
var MAX_LOG_ENTRIES = 1e3;
var LOGS_DIR_NAME = "logs";
var logBuffer = [];
var entryCounter = 0;
function getLogsDir() {
  return path4.join(app2.getPath("userData"), LOGS_DIR_NAME);
}
function getLatestLogPath() {
  return path4.join(getLogsDir(), "latest.log");
}
function getDailyLogPath() {
  const now = /* @__PURE__ */ new Date();
  const dateStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;
  return path4.join(getLogsDir(), `${dateStr}.log`);
}
function formatLogLine(entry) {
  const time = formatDateForLog(new Date(entry.time));
  let line = `[${time}] [${entry.level.toUpperCase()}] ${entry.message}`;
  if (entry.details !== void 0) {
    line += ` | ${JSON.stringify(entry.details)}`;
  }
  return line;
}
async function writeToFile(entry) {
  try {
    const logsDir = getLogsDir();
    await ensureDir(logsDir);
    const line = formatLogLine(entry) + "\n";
    const latestPath = getLatestLogPath();
    await fs3.appendFile(latestPath, line, "utf-8");
    const dailyPath = getDailyLogPath();
    if (dailyPath) {
      await fs3.appendFile(dailyPath, line, "utf-8");
    }
  } catch {
  }
}
function log(level, message, details) {
  const entry = {
    id: String(++entryCounter),
    time: formatIsoDate(),
    level,
    message,
    ...details !== void 0 ? { details } : {}
  };
  logBuffer.push(entry);
  if (logBuffer.length > MAX_LOG_ENTRIES) {
    logBuffer = logBuffer.slice(logBuffer.length - MAX_LOG_ENTRIES);
  }
  writeToFile(entry);
}
function getLogs() {
  return [...logBuffer];
}
function getLogsFilePath() {
  return normalizePath(getLogsDir());
}
function copyLogsToClipboard() {
  return logBuffer.map(formatLogLine).join("\n");
}
async function initLogSession() {
  try {
    const latestPath = getLatestLogPath();
    await ensureDir(path4.dirname(latestPath));
    await fs3.writeFile(latestPath, "", "utf-8");
  } catch {
  }
}

// electron/services/manifestService.ts
function validateManifest(data) {
  if (!data || typeof data !== "object") {
    throw new Error("Manifest is not a valid JSON object.");
  }
  const obj = data;
  if (obj.schemaVersion === void 0 || obj.schemaVersion === null) {
    throw new Error('Manifest is missing "schemaVersion".');
  }
  if (typeof obj.schemaVersion !== "number") {
    throw new Error('Manifest "schemaVersion" must be a number.');
  }
  if (!obj.packName || typeof obj.packName !== "string") {
    throw new Error('Manifest is missing or has invalid "packName".');
  }
  if (!obj.packVersion || typeof obj.packVersion !== "string") {
    throw new Error('Manifest is missing or has invalid "packVersion".');
  }
  if (!obj.minecraftVersion || typeof obj.minecraftVersion !== "string") {
    throw new Error('Manifest is missing or has invalid "minecraftVersion".');
  }
  if (!obj.loader || typeof obj.loader !== "string") {
    throw new Error('Manifest is missing or has invalid "loader".');
  }
  const validLoaders = ["forge", "fabric", "neoforge", "quilt"];
  if (!validLoaders.includes(obj.loader)) {
    throw new Error(`Manifest "loader" must be one of: ${validLoaders.join(", ")}. Got: "${obj.loader}".`);
  }
  if (!Array.isArray(obj.mods)) {
    throw new Error('Manifest "mods" must be an array.');
  }
  for (let i = 0; i < obj.mods.length; i++) {
    const mod = obj.mods[i];
    if (!mod || typeof mod !== "object") {
      throw new Error(`Manifest mods[${i}] is not a valid object.`);
    }
    const m = mod;
    if (!m.id || typeof m.id !== "string") {
      throw new Error(`Manifest mods[${i}] is missing or has invalid "id".`);
    }
    if (!m.name || typeof m.name !== "string") {
      throw new Error(`Manifest mods[${i}] is missing or has invalid "name".`);
    }
    if (!m.fileName || typeof m.fileName !== "string") {
      throw new Error(`Manifest mods[${i}] is missing or has invalid "fileName".`);
    }
    if (!m.downloadUrl || typeof m.downloadUrl !== "string") {
      throw new Error(`Manifest mods[${i}] is missing or has invalid "downloadUrl".`);
    }
    if (!m.sha512 || typeof m.sha512 !== "string") {
      throw new Error(`Manifest mods[${i}] is missing or has invalid "sha512".`);
    }
  }
  return obj;
}
async function loadManifest(url) {
  log("info", `Loading manifest from: ${url}`);
  let response;
  try {
    response = await fetch(url, {
      signal: AbortSignal.timeout(3e4)
    });
  } catch (err) {
    log("error", `Failed to fetch manifest: ${err.message}`);
    throw new Error(`Failed to fetch manifest from URL: ${err.message}`);
  }
  if (!response.ok) {
    const msg = `Failed to fetch manifest: HTTP ${response.status} ${response.statusText}`;
    log("error", msg);
    throw new Error(msg);
  }
  let data;
  try {
    data = await response.json();
  } catch (err) {
    log("error", `Failed to parse manifest JSON: ${err.message}`);
    throw new Error(`Manifest is not valid JSON: ${err.message}`);
  }
  const manifest = validateManifest(data);
  log("info", `Manifest loaded successfully: ${manifest.packName} v${manifest.packVersion} (${manifest.mods.length} mods)`);
  return manifest;
}

// electron/services/minecraftPathService.ts
init_safePath();
init_fileSystem();
import path5 from "path";
import fs4 from "fs/promises";
import os from "os";
async function detectMinecraftFolders() {
  const candidates = [];
  const settings = await getSettings();
  if (settings.lastModsPath) {
    const exists = await fileExists(settings.lastModsPath);
    if (exists) {
      try {
        const stat = await fs4.stat(settings.lastModsPath);
        if (stat.isDirectory()) {
          candidates.push({
            label: path5.basename(path5.dirname(settings.lastModsPath)) + "/" + path5.basename(settings.lastModsPath),
            modsPath: normalizePath(settings.lastModsPath),
            confidence: "high",
            reason: "Previously used mods folder",
            lastModifiedAt: stat.mtime.toISOString()
          });
        }
      } catch {
      }
    }
  }
  const appDataPath = process.env.APPDATA || path5.join(os.homedir(), "AppData", "Roaming");
  const minecraftDir = normalizePath(path5.join(appDataPath, ".minecraft"));
  const modsDir = path5.join(minecraftDir, "mods");
  if (modsDir !== (settings.lastModsPath ? normalizePath(settings.lastModsPath) : "")) {
    const modsExists = await fileExists(modsDir);
    if (modsExists) {
      try {
        const stat = await fs4.stat(modsDir);
        if (stat.isDirectory()) {
          candidates.push({
            label: ".minecraft/mods",
            modsPath: normalizePath(modsDir),
            confidence: "high",
            reason: "Standard Minecraft Forge mods folder found",
            lastModifiedAt: stat.mtime.toISOString()
          });
        }
      } catch {
      }
    }
  }
  const mcDirExists = await fileExists(minecraftDir);
  if (mcDirExists) {
    try {
      const stat = await fs4.stat(minecraftDir);
      if (stat.isDirectory()) {
        const alreadyHasModsDir = candidates.some(
          (c) => normalizePath(c.modsPath) === normalizePath(modsDir)
        );
        if (!alreadyHasModsDir) {
          candidates.push({
            label: ".minecraft (create mods folder)",
            modsPath: normalizePath(modsDir),
            confidence: "medium",
            reason: "Minecraft folder found; mods subfolder can be created",
            lastModifiedAt: stat.mtime.toISOString()
          });
        }
      }
    } catch {
    }
  }
  log("info", `Detected ${candidates.length} Minecraft folder candidate(s)`);
  return candidates;
}

// electron/services/scannerService.ts
init_constants();
init_fileSystem();
init_safePath();
import path6 from "path";

// electron/services/hashService.ts
import crypto from "crypto";
import fs5 from "fs";
async function computeFileSha512(filePath) {
  return new Promise((resolve, reject) => {
    const hash = crypto.createHash("sha512");
    const stream = fs5.createReadStream(filePath);
    stream.on("data", (data) => {
      hash.update(data);
    });
    stream.on("end", () => {
      resolve(hash.digest("hex"));
    });
    stream.on("error", (err) => {
      reject(err);
    });
  });
}

// electron/services/scannerService.ts
async function scanModsDirectory(modsPath) {
  const resolvedModsPath = normalizePath(modsPath);
  log("info", `Scanning mods directory: ${resolvedModsPath}`);
  const allFiles = await listFiles(resolvedModsPath, MOD_FILE_EXTENSION);
  const backupDir = path6.join(resolvedModsPath, BACKUP_FOLDER_NAME);
  const disabledDir = path6.join(resolvedModsPath, DISABLED_FOLDER_NAME);
  const jarFiles = allFiles.filter((filePath) => {
    const parentDir = path6.dirname(filePath);
    if (parentDir === backupDir || parentDir === disabledDir) {
      return false;
    }
    if (parentDir.startsWith(backupDir + path6.sep) || parentDir.startsWith(disabledDir + path6.sep)) {
      return false;
    }
    return true;
  });
  log("info", `Found ${jarFiles.length} .jar file(s) to scan`);
  const results = [];
  for (const filePath of jarFiles) {
    const fileName = path6.basename(filePath);
    try {
      const [sizeBytes, modifiedAt, sha512] = await Promise.all([
        getFileSize(filePath),
        getFileModifiedTime(filePath),
        computeFileSha512(filePath)
      ]);
      results.push({
        fileName,
        absolutePath: normalizePath(filePath),
        sizeBytes,
        modifiedAt,
        sha512
      });
    } catch (err) {
      log("warn", `Failed to scan file ${fileName}: ${err.message}`);
    }
  }
  log("info", `Scanned ${results.length} mod file(s) successfully`);
  return results;
}

// electron/services/syncPlannerService.ts
init_safePath();
import path8 from "path";

// electron/utils/filename.ts
init_constants();
import path7 from "path";
function getModIdFromFileName(fileName) {
  let base = fileName.replace(/\.jar$/i, "");
  base = base.replace(/[-_](?:mc|forge|fabric|neoforge|quilt).*/i, "");
  base = base.replace(/[-_]\d.*$/i, "");
  base = base.replace(/[^a-zA-Z0-9]/g, "_");
  base = base.replace(/_+/g, "_");
  base = base.replace(/^_+|_+$/g, "");
  return base.toLowerCase() || "unknown_mod";
}
function addTimestampToFileName(fileName, timestamp) {
  const ext = path7.extname(fileName);
  const base = path7.basename(fileName, ext);
  return `${base}__${timestamp}${ext}`;
}
function getTempDownloadPath(targetPath) {
  return targetPath + DOWNLOAD_TEMP_EXTENSION;
}

// electron/services/syncPlannerService.ts
function buildSyncPlan(manifest, localMods, modsDir) {
  const resolvedModsDir = normalizePath(modsDir);
  const disabledDir = getDisabledDir(resolvedModsDir);
  log("info", `Building sync plan for ${manifest.mods.length} manifest mods vs ${localMods.length} local mods`);
  const localByHash = /* @__PURE__ */ new Map();
  const localByFileName = /* @__PURE__ */ new Map();
  for (const mod of localMods) {
    localByHash.set(mod.sha512.toLowerCase(), mod);
    localByFileName.set(mod.fileName.toLowerCase(), mod);
  }
  const manifestByHash = /* @__PURE__ */ new Map();
  const manifestByFileName = /* @__PURE__ */ new Map();
  for (const mod of manifest.mods) {
    manifestByHash.set(mod.sha512.toLowerCase(), mod);
    manifestByFileName.set(mod.fileName.toLowerCase(), mod);
  }
  const installed = [];
  const missing = [];
  const wrongHash = [];
  const actions = [];
  const matchedLocalKeys = /* @__PURE__ */ new Set();
  for (const manifestMod of manifest.mods) {
    const targetPath = path8.join(resolvedModsDir, manifestMod.fileName);
    const hashKey = manifestMod.sha512.toLowerCase();
    const fileNameKey = manifestMod.fileName.toLowerCase();
    const localByHashMatch = localByHash.get(hashKey);
    const localByFileNameMatch = localByFileName.get(fileNameKey);
    if (localByHashMatch) {
      matchedLocalKeys.add(localByHashMatch.sha512.toLowerCase());
      const result = {
        status: "installed",
        manifestMod,
        localFile: localByHashMatch,
        message: `Already installed: ${manifestMod.name}`
      };
      installed.push(result);
      if (localByHashMatch.fileName !== manifestMod.fileName) {
        const renameAction = {
          id: `rename-${manifestMod.id}`,
          type: "rename_to_manifest_filename",
          mod: manifestMod,
          localFile: localByHashMatch,
          targetPath,
          reason: `Rename ${localByHashMatch.fileName} \u2192 ${manifestMod.fileName}`
        };
        actions.push(renameAction);
        result.expectedFileName = manifestMod.fileName;
      }
    } else if (localByFileNameMatch) {
      matchedLocalKeys.add(localByFileNameMatch.sha512.toLowerCase());
      const result = {
        status: "wrong_hash",
        manifestMod,
        localFile: localByFileNameMatch,
        expectedFileName: manifestMod.fileName,
        message: `Wrong version: ${manifestMod.name} (hash mismatch)`
      };
      wrongHash.push(result);
      const replaceAction = {
        id: `replace-${manifestMod.id}`,
        type: "replace",
        mod: manifestMod,
        localFile: localByFileNameMatch,
        targetPath,
        reason: `Replace ${manifestMod.fileName} with correct version`
      };
      actions.push(replaceAction);
    } else {
      const result = {
        status: "missing",
        manifestMod,
        expectedFileName: manifestMod.fileName,
        message: `Missing: ${manifestMod.name}`
      };
      missing.push(result);
      const downloadAction = {
        id: `download-${manifestMod.id}`,
        type: "download",
        mod: manifestMod,
        targetPath,
        reason: `Download ${manifestMod.name}`
      };
      actions.push(downloadAction);
    }
  }
  const extra = [];
  const allowedExtra = [];
  const allowedRules = manifest.allowedExtraMods || [];
  for (const localMod of localMods) {
    const hashKey = localMod.sha512.toLowerCase();
    if (matchedLocalKeys.has(hashKey)) continue;
    if (manifestByHash.has(hashKey)) continue;
    const fileNameKey = localMod.fileName.toLowerCase();
    if (manifestByFileName.has(fileNameKey)) continue;
    const isAllowed = checkAllowedExtra(localMod, allowedRules);
    if (isAllowed) {
      const result = {
        status: "allowed_extra",
        localFile: localMod,
        message: `Allowed extra mod: ${localMod.fileName}`
      };
      allowedExtra.push(result);
    } else {
      const timestamp = formatIsoDate().replace(/[:.]/g, "-");
      const disabledFileName = addTimestampToFileName(localMod.fileName, timestamp);
      const disabledPath = path8.join(disabledDir, disabledFileName);
      const result = {
        status: "extra",
        localFile: localMod,
        message: `Extra mod will be disabled: ${localMod.fileName}`
      };
      extra.push(result);
      const moveAction = {
        id: `disable-${localMod.fileName}`,
        type: "move_extra_to_disabled",
        localFile: localMod,
        targetPath: disabledPath,
        reason: `Move extra mod to disabled: ${localMod.fileName}`
      };
      actions.push(moveAction);
    }
  }
  const plan = {
    createdAt: formatIsoDate(),
    modsDir: resolvedModsDir,
    manifest,
    installed,
    missing,
    wrongHash,
    extra,
    allowedExtra,
    actions,
    summary: {
      installedCount: installed.length,
      missingCount: missing.length,
      wrongHashCount: wrongHash.length,
      extraCount: extra.length,
      allowedExtraCount: allowedExtra.length,
      totalActions: actions.length
    }
  };
  log("info", `Sync plan built: ${plan.summary.installedCount} installed, ${plan.summary.missingCount} missing, ${plan.summary.wrongHashCount} wrong hash, ${plan.summary.extraCount} extra, ${plan.summary.allowedExtraCount} allowed extra, ${plan.summary.totalActions} total actions`);
  return plan;
}
function checkAllowedExtra(localMod, rules) {
  for (const rule of rules) {
    switch (rule.match) {
      case "filename_contains":
        if (localMod.fileName.toLowerCase().includes(rule.value.toLowerCase())) {
          return true;
        }
        break;
      case "filename_regex":
        try {
          const regex = new RegExp(rule.value, "i");
          if (regex.test(localMod.fileName)) {
            return true;
          }
        } catch {
        }
        break;
      case "sha512":
        if (localMod.sha512.toLowerCase() === rule.value.toLowerCase()) {
          return true;
        }
        break;
    }
  }
  return false;
}

// electron/services/syncExecutorService.ts
init_constants();
import path11 from "path";

// electron/services/downloadService.ts
import fs6 from "fs";
import path9 from "path";

// electron/utils/retry.ts
async function retryWithBackoff(fn, maxRetries, baseDelayMs = 1e3) {
  let lastError;
  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error;
      if (!isRetryableError(error)) {
        throw error;
      }
      if (attempt < maxRetries) {
        const delay = baseDelayMs * Math.pow(2, attempt);
        const jitter = Math.floor(Math.random() * delay * 0.5);
        await sleep(delay + jitter);
      }
    }
  }
  throw lastError;
}
function isRetryableError(error) {
  if (error instanceof Error) {
    const message = error.message.toLowerCase();
    if (message.includes("404") || message.includes("not found")) {
      return false;
    }
    if (message.includes("eacces") || message.includes("permission") || message.includes("eperm")) {
      return false;
    }
    if (message.includes("econnreset") || message.includes("econnrefused") || message.includes("etimedout") || message.includes("socket hang up") || message.includes("network") || message.includes("timeout") || message.includes("fetch failed") || message.includes("enotfound") || message.includes("ehostunreach")) {
      return true;
    }
    if (message.includes("hash mismatch") || message.includes("sha512")) {
      return true;
    }
    if (error.name === "AbortError") {
      return false;
    }
  }
  if (typeof error === "object" && error !== null && "code" in error) {
    const code = error.code;
    const retryableCodes = [
      "ECONNRESET",
      "ECONNREFUSED",
      "ETIMEDOUT",
      "ENOTFOUND",
      "EHOSTUNREACH",
      "ENETUNREACH",
      "EAI_AGAIN"
    ];
    if (retryableCodes.includes(code)) {
      return true;
    }
    if (code === "EACCES" || code === "EPERM" || code === "ENOENT") {
      return false;
    }
  }
  return false;
}
function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

// electron/services/downloadService.ts
init_fileSystem();
init_safePath();
init_constants();
async function downloadFile(url, targetPath, expectedSha512, retries = 3, onProgress) {
  const resolvedTarget = normalizePath(targetPath);
  const tempPath = getTempDownloadPath(resolvedTarget);
  const fileName = path9.basename(resolvedTarget);
  log("info", `Starting download: ${fileName} from ${url}`);
  await retryWithBackoff(
    async () => {
      await ensureDir(path9.dirname(resolvedTarget));
      await deleteFile(tempPath);
      const response = await fetch(url, {
        signal: AbortSignal.timeout(DOWNLOAD_TIMEOUT_MS)
      });
      if (!response.ok) {
        throw new Error(`Download failed: HTTP ${response.status} ${response.statusText}`);
      }
      if (!response.body) {
        throw new Error("Download failed: No response body");
      }
      const totalBytes = response.headers.get("content-length") ? parseInt(response.headers.get("content-length"), 10) : null;
      let bytesDownloaded = 0;
      const writeStream = fs6.createWriteStream(tempPath);
      const reader = response.body.getReader();
      const writeDone = new Promise((resolve, reject) => {
        writeStream.on("finish", resolve);
        writeStream.on("error", reject);
      });
      try {
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          writeStream.write(value);
          bytesDownloaded += value.length;
          if (onProgress) {
            onProgress({
              fileName,
              bytesDownloaded,
              totalBytes,
              percent: totalBytes ? Math.round(bytesDownloaded / totalBytes * 100) : null
            });
          }
        }
      } finally {
        writeStream.end();
      }
      await writeDone;
      log("info", `Verifying hash for ${fileName}...`);
      const actualSha512 = await computeFileSha512(tempPath);
      if (actualSha512.toLowerCase() !== expectedSha512.toLowerCase()) {
        await deleteFile(tempPath);
        const err = new Error(
          `Hash mismatch for ${fileName}: expected ${expectedSha512.substring(0, 16)}... got ${actualSha512.substring(0, 16)}...`
        );
        log("error", err.message);
        throw err;
      }
      log("info", `Download verified: ${fileName} (hash OK, left as .download)`);
    },
    retries,
    1e3
  );
}

// electron/services/backupService.ts
init_constants();
init_safePath();
init_fileSystem();
init_fileSystem();
import path10 from "path";
import fs7 from "fs/promises";
async function createBackupSession(modsDir, packVersionBefore, packVersionAfter, files) {
  const backupBase = getBackupDir(modsDir);
  await ensureDir(backupBase);
  const timestamp = formatTimestamp();
  const sessionFolderName = `backup_${timestamp}`;
  const sessionPath = path10.join(backupBase, sessionFolderName);
  await ensureDir(sessionPath);
  log("info", `Created backup session: ${sessionFolderName}`);
  return sessionFolderName;
}
async function addFileToBackup(sessionPath, originalPath, fileName) {
  const resolvedSession = normalizePath(sessionPath);
  await ensureDir(resolvedSession);
  const backupPath = path10.join(resolvedSession, fileName);
  let finalBackupPath = backupPath;
  let counter = 1;
  while (await fileExists(finalBackupPath)) {
    const ext = path10.extname(fileName);
    const base = path10.basename(fileName, ext);
    finalBackupPath = path10.join(resolvedSession, `${base}_${counter}${ext}`);
    counter++;
  }
  await copyFile(originalPath, finalBackupPath);
  log("debug", `Backed up: ${fileName} \u2192 ${path10.basename(finalBackupPath)}`);
  return finalBackupPath;
}
async function writeBackupMeta(sessionPath, meta) {
  const resolvedSession = normalizePath(sessionPath);
  const metaPath = path10.join(resolvedSession, BACKUP_META_FILE);
  await writeJsonFile(metaPath, meta);
  log("info", `Backup metadata written to ${metaPath}`);
}
async function listBackups(modsDir) {
  const backupBase = getBackupDir(modsDir);
  if (!await fileExists(backupBase)) {
    return [];
  }
  const resolvedBase = normalizePath(backupBase);
  let entries;
  try {
    entries = await fs7.readdir(resolvedBase);
  } catch {
    return [];
  }
  const sessions = [];
  for (const entry of entries) {
    const entryPath = path10.join(resolvedBase, entry);
    try {
      const stat = await fs7.stat(entryPath);
      if (!stat.isDirectory()) continue;
    } catch {
      continue;
    }
    const metaPath = path10.join(entryPath, BACKUP_META_FILE);
    const meta = await readJsonFile(metaPath);
    if (meta) {
      sessions.push({
        id: entry,
        folderName: entry,
        createdAt: meta.createdAt,
        packVersionBefore: meta.packVersionBefore,
        packVersionAfter: meta.packVersionAfter,
        fileCount: meta.files.length,
        modsDir: meta.modsDir
      });
    } else {
      sessions.push({
        id: entry,
        folderName: entry,
        createdAt: "",
        packVersionBefore: null,
        packVersionAfter: "",
        fileCount: 0,
        modsDir
      });
    }
  }
  sessions.sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  return sessions;
}
async function getBackupMeta(modsDir, sessionId) {
  const backupBase = getBackupDir(modsDir);
  const metaPath = path10.join(backupBase, sessionId, BACKUP_META_FILE);
  return readJsonFile(metaPath);
}
async function rollbackBackup(modsDir, sessionId) {
  const backupBase = getBackupDir(modsDir);
  const sessionPath = path10.join(backupBase, sessionId);
  const metaPath = path10.join(sessionPath, BACKUP_META_FILE);
  const meta = await readJsonFile(metaPath);
  if (!meta) {
    throw new Error(`Backup session ${sessionId} has no metadata. Cannot rollback.`);
  }
  log("info", `Starting rollback of backup session: ${sessionId} (${meta.files.length} file(s))`);
  const emergencyTimestamp = formatTimestamp();
  const emergencySessionName = `emergency_${emergencyTimestamp}`;
  const emergencySessionPath = path10.join(backupBase, emergencySessionName);
  await ensureDir(emergencySessionPath);
  const emergencyRecords = [];
  const failedRestores = [];
  for (const record of meta.files) {
    try {
      if (!await fileExists(record.backupPath)) {
        log("warn", `Backup file not found: ${record.backupPath}, skipping`);
        failedRestores.push(`${record.fileName}: backup file missing`);
        continue;
      }
      if (await fileExists(record.originalPath)) {
        try {
          const emergencyBackupPath = path10.join(emergencySessionPath, path10.basename(record.originalPath));
          let finalEmergencyPath = emergencyBackupPath;
          let counter = 1;
          while (await fileExists(finalEmergencyPath)) {
            const ext = path10.extname(record.originalPath);
            const base = path10.basename(record.originalPath, ext);
            finalEmergencyPath = path10.join(emergencySessionPath, `${base}_${counter}${ext}`);
            counter++;
          }
          await copyFile(record.originalPath, finalEmergencyPath);
          emergencyRecords.push({
            originalPath: record.originalPath,
            backupPath: finalEmergencyPath,
            fileName: path10.basename(record.originalPath),
            reason: "Emergency backup before rollback"
          });
          log("debug", `Emergency backed up current: ${path10.basename(record.originalPath)}`);
        } catch (err) {
          log("warn", `Could not emergency-backup ${record.originalPath}: ${err.message}`);
        }
        await deleteFile(record.originalPath);
      }
      await ensureDir(path10.dirname(record.originalPath));
      await copyFile(record.backupPath, record.originalPath);
      log("info", `Restored: ${record.fileName} \u2192 ${record.originalPath}`);
    } catch (err) {
      log("error", `Failed to restore ${record.fileName}: ${err.message}`);
      failedRestores.push(`${record.fileName}: ${err.message}`);
    }
  }
  if (emergencyRecords.length > 0) {
    const emergencyMeta = {
      createdAt: formatIsoDate(),
      packVersionBefore: meta.packVersionAfter,
      packVersionAfter: meta.packVersionBefore ?? "unknown",
      modsDir,
      files: emergencyRecords
    };
    await writeJsonFile(path10.join(emergencySessionPath, BACKUP_META_FILE), emergencyMeta);
  }
  log("info", `Rollback completed for session: ${sessionId}`);
  if (failedRestores.length > 0) {
    log("warn", `Rollback had ${failedRestores.length} failed restore(s): ${failedRestores.join("; ")}`);
    throw new Error(
      `Rollback partially completed. ${failedRestores.length} file(s) could not be restored:
${failedRestores.join("\n")}`
    );
  }
}

// electron/services/syncExecutorService.ts
init_fileSystem();
init_safePath();
async function executeSyncPlan(plan, onProgress) {
  const modsDir = normalizePath(plan.modsDir);
  const backupDir = getBackupDir(modsDir);
  const disabledDir = getDisabledDir(modsDir);
  const stateFilePath = path11.join(modsDir, SYNC_STATE_FILE);
  const totalActions = plan.actions.length;
  let completedActions = 0;
  const sendProgress = (partial) => {
    const progress = {
      phase: partial.phase ?? "checking",
      currentAction: partial.currentAction,
      completedActions,
      totalActions,
      currentFile: partial.currentFile,
      percent: totalActions > 0 ? Math.round(completedActions / totalActions * 100) : 0,
      message: partial.message ?? ""
    };
    onProgress?.(progress);
  };
  try {
    try {
      const testFile = path11.join(modsDir, ".krofne-write-test");
      await writeJsonFile(testFile, { test: true });
      const { deleteFile: deleteFile2 } = await Promise.resolve().then(() => (init_fileSystem(), fileSystem_exports));
      await deleteFile2(testFile);
    } catch {
      throw new Error(
        `\u041D\u0435\u0442 \u043F\u0440\u0430\u0432 \u043D\u0430 \u0437\u0430\u043F\u0438\u0441\u044C \u0432 \u043F\u0430\u043F\u043A\u0443 mods: ${modsDir}
\u041F\u0440\u043E\u0432\u0435\u0440\u044C\u0442\u0435, \u0447\u0442\u043E \u043F\u0430\u043F\u043A\u0430 \u0441\u0443\u0449\u0435\u0441\u0442\u0432\u0443\u0435\u0442 \u0438 \u0443 \u0432\u0430\u0441 \u0435\u0441\u0442\u044C \u043F\u0440\u0430\u0432\u0430 \u043D\u0430 \u0437\u0430\u043F\u0438\u0441\u044C.`
      );
    }
    log("info", `Starting sync execution for ${plan.manifest.packName} v${plan.manifest.packVersion}`);
    const syncState = {
      syncId: `sync-${Date.now()}`,
      startedAt: formatIsoDate(),
      status: "running",
      completedActions: [],
      pendingActions: plan.actions.map((a) => a.id),
      tempFiles: []
    };
    await writeJsonFile(stateFilePath, syncState);
    const settings = await getSettings();
    const filesToBackup = [];
    for (const action of plan.actions) {
      if (action.type === "replace" && action.localFile) {
        filesToBackup.push({
          originalPath: action.localFile.absolutePath,
          fileName: action.localFile.fileName,
          reason: action.reason
        });
      }
    }
    let sessionPath = null;
    const backupRecords = [];
    if (filesToBackup.length > 0) {
      const sessionId = await createBackupSession(
        modsDir,
        settings.lastSuccessfulPackVersion ?? null,
        plan.manifest.packVersion,
        filesToBackup
      );
      sessionPath = path11.join(backupDir, sessionId);
      log("info", `Backup session created: ${sessionId} with ${filesToBackup.length} file(s)`);
      for (const file of filesToBackup) {
        try {
          const backupPath = await addFileToBackup(sessionPath, file.originalPath, file.fileName);
          backupRecords.push({
            originalPath: file.originalPath,
            backupPath,
            fileName: file.fileName,
            reason: file.reason
          });
        } catch (err) {
          log("error", `Failed to backup ${file.fileName}: ${err.message}`);
          throw new Error(`Backup failed for ${file.fileName}: ${err.message}`);
        }
      }
    }
    const downloadActions = plan.actions.filter(
      (a) => a.type === "download" || a.type === "replace"
    );
    if (downloadActions.length > 0) {
      sendProgress({ phase: "downloading", message: `Downloading ${downloadActions.length} mod(s)...` });
      const parallelLimit = plan.manifest.settings?.maxParallelDownloads ?? MAX_PARALLEL_DOWNLOADS;
      const retries = plan.manifest.settings?.downloadRetries ?? DOWNLOAD_RETRIES;
      await runWithParallelLimit(downloadActions, parallelLimit, async (action) => {
        if (!action.mod) throw new Error(`Action ${action.id} has no mod reference`);
        sendProgress({
          phase: "downloading",
          currentAction: action.id,
          currentFile: action.mod.fileName,
          message: `Downloading ${action.mod.name}...`
        });
        await downloadFile(action.mod.downloadUrl, action.targetPath, action.mod.sha512, retries);
        const tempPath = getTempDownloadPath(action.targetPath);
        syncState.tempFiles.push(tempPath);
        await writeJsonFile(stateFilePath, syncState);
        log("info", `Downloaded and verified: ${action.mod.fileName}`);
      });
      completedActions += downloadActions.length;
    }
    sendProgress({ phase: "checking", message: "Re-verifying downloaded files..." });
    for (const action of downloadActions) {
      if (!action.mod) continue;
      const tempPath = getTempDownloadPath(action.targetPath);
      if (!await fileExists(tempPath)) {
        throw new Error(`Download temp file missing: ${path11.basename(tempPath)}`);
      }
      const actualHash = await computeFileSha512(tempPath);
      if (actualHash.toLowerCase() !== action.mod.sha512.toLowerCase()) {
        throw new Error(
          `Re-verification failed for ${action.mod.fileName}: hash mismatch after download. This should not happen \u2014 the download may have been corrupted.`
        );
      }
    }
    log("info", "All downloaded files re-verified successfully");
    const replaceActions = plan.actions.filter((a) => a.type === "replace");
    if (replaceActions.length > 0) {
      sendProgress({ phase: "replacing", message: `Replacing ${replaceActions.length} mod(s)...` });
      for (const action of replaceActions) {
        if (!action.localFile) continue;
        sendProgress({
          phase: "replacing",
          currentAction: action.id,
          currentFile: action.localFile.fileName,
          message: `Removing old version: ${action.localFile.fileName}...`
        });
        await deleteFile(action.localFile.absolutePath);
        log("info", `Removed old file (backup exists): ${action.localFile.fileName}`);
      }
    }
    sendProgress({ phase: "replacing", message: "Installing downloaded mods..." });
    for (const action of downloadActions) {
      const tempPath = getTempDownloadPath(action.targetPath);
      if (await fileExists(tempPath)) {
        await moveFile(tempPath, action.targetPath);
        log("info", `Installed: ${path11.basename(action.targetPath)}`);
        const idx = syncState.tempFiles.indexOf(tempPath);
        if (idx >= 0) syncState.tempFiles.splice(idx, 1);
        completedActions++;
      } else {
        throw new Error(`Temp download file not found: ${path11.basename(tempPath)}`);
      }
    }
    const renameActions = plan.actions.filter((a) => a.type === "rename_to_manifest_filename");
    if (renameActions.length > 0) {
      sendProgress({ phase: "renaming", message: `Renaming ${renameActions.length} file(s)...` });
      for (const action of renameActions) {
        if (!action.localFile) continue;
        sendProgress({
          phase: "renaming",
          currentAction: action.id,
          currentFile: action.localFile.fileName,
          message: `Renaming ${action.localFile.fileName} \u2192 ${path11.basename(action.targetPath)}`
        });
        await moveFile(action.localFile.absolutePath, action.targetPath);
        log("info", `Renamed: ${action.localFile.fileName} \u2192 ${path11.basename(action.targetPath)}`);
        completedActions++;
      }
    }
    const disableActions = plan.actions.filter((a) => a.type === "move_extra_to_disabled");
    if (disableActions.length > 0) {
      sendProgress({ phase: "moving", message: `Moving ${disableActions.length} extra mod(s) to disabled...` });
      await ensureDir(disabledDir);
      for (const action of disableActions) {
        if (!action.localFile) continue;
        sendProgress({
          phase: "moving",
          currentAction: action.id,
          currentFile: action.localFile.fileName,
          message: `Moving ${action.localFile.fileName} to disabled...`
        });
        let targetPath = action.targetPath;
        if (await fileExists(targetPath)) {
          const ext = path11.extname(action.localFile.fileName);
          const base = path11.basename(action.localFile.fileName, ext);
          const timestamp = formatTimestamp();
          targetPath = path11.join(disabledDir, `${base}__${timestamp}${ext}`);
        }
        await moveFile(action.localFile.absolutePath, targetPath);
        log("info", `Moved to disabled: ${action.localFile.fileName} \u2192 ${path11.basename(targetPath)}`);
        completedActions++;
      }
    }
    if (sessionPath && backupRecords.length > 0) {
      const meta = {
        createdAt: formatIsoDate(),
        packVersionBefore: settings.lastSuccessfulPackVersion ?? null,
        packVersionAfter: plan.manifest.packVersion,
        modsDir,
        files: backupRecords
      };
      await writeBackupMeta(sessionPath, meta);
    }
    syncState.status = "completed";
    syncState.completedActions = plan.actions.map((a) => a.id);
    syncState.pendingActions = [];
    syncState.tempFiles = [];
    await writeJsonFile(stateFilePath, syncState);
    await saveSettings({ lastSuccessfulPackVersion: plan.manifest.packVersion });
    sendProgress({
      phase: "done",
      message: "Sync completed successfully!",
      percent: 100
    });
    log("info", `Sync completed successfully for ${plan.manifest.packName} v${plan.manifest.packVersion}`);
  } catch (err) {
    log("error", `Sync failed: ${err.message}`);
    try {
      const existingState = await readJsonFile(stateFilePath);
      if (existingState && existingState.status === "running") {
        existingState.status = "interrupted";
        await writeJsonFile(stateFilePath, existingState);
      }
    } catch {
    }
    sendProgress({
      phase: "error",
      message: `Sync failed: ${err.message}`
    });
    throw err;
  }
}
async function runWithParallelLimit(items, limit, fn) {
  const executing = [];
  for (const item of items) {
    const promise = fn(item).then(() => {
      executing.splice(executing.indexOf(promise), 1);
    });
    executing.push(promise);
    if (executing.length >= limit) {
      await Promise.race(executing);
    }
  }
  await Promise.all(executing);
}

// electron/services/updateCheckService.ts
init_constants();
async function checkForUpdate() {
  log("info", `Checking for app update... Current version: ${APP_VERSION}`);
  try {
    const response = await fetch(UPDATE_CHECK_URL, {
      signal: AbortSignal.timeout(15e3)
    });
    if (!response.ok) {
      log("warn", `Update check failed: HTTP ${response.status}`);
      return {
        hasUpdate: false,
        latestVersion: null,
        downloadUrl: null,
        notes: []
      };
    }
    const data = await response.json();
    const latestVersion = data.latestVersion ?? null;
    const downloadUrl = data.downloadUrl ?? GITHUB_RELEASES_URL;
    const notes = data.notes ?? [];
    if (!latestVersion) {
      log("warn", "Update check: no version found in update.json");
      return {
        hasUpdate: false,
        latestVersion: null,
        downloadUrl: null,
        notes: []
      };
    }
    const hasUpdate = compareVersions(latestVersion, APP_VERSION) > 0;
    log("info", `Update check: latest=${latestVersion}, current=${APP_VERSION}, hasUpdate=${hasUpdate}`);
    return {
      hasUpdate,
      latestVersion,
      downloadUrl,
      notes
    };
  } catch (err) {
    log("warn", `Update check error: ${err.message}`);
    return {
      hasUpdate: false,
      latestVersion: null,
      downloadUrl: null,
      notes: []
    };
  }
}
function compareVersions(a, b) {
  const partsA = a.replace(/^v/, "").split(".").map(Number);
  const partsB = b.replace(/^v/, "").split(".").map(Number);
  const len = Math.max(partsA.length, partsB.length);
  for (let i = 0; i < len; i++) {
    const numA = partsA[i] ?? 0;
    const numB = partsB[i] ?? 0;
    if (numA !== numB) return numA - numB;
  }
  return 0;
}

// electron/services/serverStatusService.ts
import net from "net";
async function checkServerStatus(address, port) {
  log("info", `Checking server status: ${address}:${port}`);
  return new Promise((resolve) => {
    const startTime = Date.now();
    const socket = new net.Socket();
    socket.setTimeout(5e3);
    socket.on("connect", () => {
      const latency = Date.now() - startTime;
      socket.destroy();
      log("info", `Server ${address}:${port} is reachable (${latency}ms)`);
      resolve({
        reachable: true,
        latencyMs: latency,
        error: null
      });
    });
    socket.on("timeout", () => {
      socket.destroy();
      log("warn", `Server ${address}:${port} connection timed out`);
      resolve({
        reachable: false,
        latencyMs: null,
        error: "Connection timed out (5s)"
      });
    });
    socket.on("error", (err) => {
      socket.destroy();
      log("warn", `Server ${address}:${port} error: ${err.message}`);
      resolve({
        reachable: false,
        latencyMs: null,
        error: err.message
      });
    });
    socket.on("close", () => {
    });
    try {
      socket.connect(port, address);
    } catch (err) {
      log("warn", `Server ${address}:${port} connect error: ${err.message}`);
      resolve({
        reachable: false,
        latencyMs: null,
        error: err.message
      });
    }
  });
}

// electron/services/adminManifestService.ts
init_constants();
import path12 from "path";
init_fileSystem();
init_safePath();
async function adminScanFolder(folderPath) {
  const resolved = normalizePath(folderPath);
  log("info", `Admin scanning folder: ${resolved}`);
  const jarFiles = await listFiles(resolved, MOD_FILE_EXTENSION);
  const files = [];
  for (const filePath of jarFiles) {
    const fileName = path12.basename(filePath);
    try {
      const [sha512, sizeBytes] = await Promise.all([
        computeFileSha512(filePath),
        getFileSize(filePath)
      ]);
      files.push({
        fileName,
        sha512,
        sizeBytes
      });
    } catch (err) {
      log("warn", `Admin scan: failed to process ${fileName}: ${err.message}`);
    }
  }
  log("info", `Admin scan complete: ${files.length} .jar file(s) found`);
  return { files };
}
async function adminGenerateManifest(data) {
  log("info", `Admin generating manifest: ${data.packName} v${data.packVersion}`);
  const scanResult = await adminScanFolder(data.localModsPath);
  let oldManifest = null;
  if (data.oldManifestUrl) {
    try {
      oldManifest = await loadManifest(data.oldManifestUrl);
      log("info", `Old manifest loaded: ${oldManifest.packName} v${oldManifest.packVersion} (${oldManifest.mods.length} mods)`);
    } catch (err) {
      log("warn", `Could not load old manifest: ${err.message}`);
    }
  }
  const oldModsByHash = /* @__PURE__ */ new Map();
  if (oldManifest) {
    for (const mod of oldManifest.mods) {
      oldModsByHash.set(mod.sha512.toLowerCase(), mod);
    }
  }
  const mods = scanResult.files.map((file) => {
    const existingMod = oldModsByHash.get(file.sha512.toLowerCase());
    if (existingMod) {
      return {
        ...existingMod,
        fileName: file.fileName,
        sizeBytes: file.sizeBytes
      };
    }
    const id = getModIdFromFileName(file.fileName);
    const downloadUrl = data.githubRawBaseUrl ? `${data.githubRawBaseUrl.replace(/\/$/, "")}/${file.fileName}` : "";
    return {
      id,
      name: file.fileName.replace(/\.jar$/i, ""),
      fileName: file.fileName,
      downloadUrl,
      sha512: file.sha512,
      sizeBytes: file.sizeBytes,
      required: true,
      side: "both"
    };
  });
  const manifest = {
    schemaVersion: 1,
    packName: data.packName,
    packVersion: data.packVersion,
    minecraftVersion: data.minecraftVersion,
    loader: data.loader,
    loaderVersion: data.loaderVersion,
    manifestUpdatedAt: formatIsoDate(),
    changelog: data.changelog,
    settings: {
      extraFilesPolicy: "move_to_disabled",
      maxParallelDownloads: 3,
      downloadRetries: 3
    },
    mods,
    allowedExtraMods: oldManifest?.allowedExtraMods
  };
  log("info", `Manifest generated: ${mods.length} mod(s)`);
  return manifest;
}
async function adminSaveManifest(manifest, filePath) {
  const resolved = normalizePath(filePath);
  await writeJsonFile(resolved, manifest);
  log("info", `Manifest saved to: ${resolved}`);
}

// electron/ipc/registerIpcHandlers.ts
init_fileSystem();
init_safePath();
init_fileSystem();
function registerIpcHandlers() {
  initLogSession().catch(() => {
  });
  log("info", `krofnePackUpdater v${APP_VERSION} starting...`);
  ipcMain.handle("settings:get", async () => {
    try {
      return await getSettings();
    } catch (err) {
      log("error", `settings:get failed: ${err.message}`);
      throw err;
    }
  });
  ipcMain.handle("settings:save", async (_event, partial) => {
    try {
      return await saveSettings(partial);
    } catch (err) {
      log("error", `settings:save failed: ${err.message}`);
      throw err;
    }
  });
  ipcMain.handle("minecraft:detectFolders", async () => {
    try {
      return await detectMinecraftFolders();
    } catch (err) {
      log("error", `minecraft:detectFolders failed: ${err.message}`);
      throw err;
    }
  });
  ipcMain.handle("minecraft:selectFolder", async () => {
    try {
      const result = await dialog.showOpenDialog({
        properties: ["openDirectory"],
        title: "Select Minecraft mods folder"
      });
      if (result.canceled || result.filePaths.length === 0) {
        return null;
      }
      const selectedPath = result.filePaths[0];
      await saveSettings({ lastModsPath: selectedPath });
      return selectedPath;
    } catch (err) {
      log("error", `minecraft:selectFolder failed: ${err.message}`);
      throw err;
    }
  });
  ipcMain.handle("manifest:load", async (_event, url) => {
    try {
      const manifestUrl = url || (await getSettings()).manifestUrl;
      if (!manifestUrl) {
        throw new Error("No manifest URL configured. Please set it in settings.");
      }
      return await loadManifest(manifestUrl);
    } catch (err) {
      log("error", `manifest:load failed: ${err.message}`);
      throw err;
    }
  });
  ipcMain.handle("sync:check", async () => {
    try {
      const settings = await getSettings();
      if (!settings.lastModsPath) {
        throw new Error("No mods folder selected. Please select your Minecraft mods folder first.");
      }
      const modsPath = normalizePath(settings.lastModsPath);
      const modsPathValid = await fileExists(modsPath);
      if (!modsPathValid) {
        throw new Error(`Mods folder does not exist: ${modsPath}`);
      }
      const manifestUrl = settings.manifestUrl;
      if (!manifestUrl) {
        throw new Error("No manifest URL configured. Please set it in settings.");
      }
      const manifest = await loadManifest(manifestUrl);
      log("info", `Scanning mods directory: ${modsPath}`);
      const localMods = await scanModsDirectory(modsPath);
      const plan = buildSyncPlan(manifest, localMods, modsPath);
      return plan;
    } catch (err) {
      log("error", `sync:check failed: ${err.message}`);
      throw err;
    }
  });
  ipcMain.handle("sync:execute", async (event, syncPlan) => {
    try {
      await executeSyncPlan(syncPlan, (progress) => {
        event.sender.send("sync:progress", progress);
      });
    } catch (err) {
      log("error", `sync:execute failed: ${err.message}`);
      throw err;
    }
  });
  ipcMain.handle("backup:list", async () => {
    try {
      const settings = await getSettings();
      if (!settings.lastModsPath) {
        return [];
      }
      return await listBackups(settings.lastModsPath);
    } catch (err) {
      log("error", `backup:list failed: ${err.message}`);
      throw err;
    }
  });
  ipcMain.handle("backup:getMeta", async (_event, sessionId) => {
    try {
      const settings = await getSettings();
      if (!settings.lastModsPath) {
        return null;
      }
      return await getBackupMeta(settings.lastModsPath, sessionId);
    } catch (err) {
      log("error", `backup:getMeta failed: ${err.message}`);
      throw err;
    }
  });
  ipcMain.handle("backup:rollback", async (_event, sessionId) => {
    try {
      const settings = await getSettings();
      if (!settings.lastModsPath) {
        throw new Error("No mods folder configured.");
      }
      await rollbackBackup(settings.lastModsPath, sessionId);
    } catch (err) {
      log("error", `backup:rollback failed: ${err.message}`);
      throw err;
    }
  });
  ipcMain.handle("folder:open", async (_event, folderPath) => {
    try {
      await openFolderInExplorer(folderPath);
    } catch (err) {
      log("error", `folder:open failed: ${err.message}`);
      throw err;
    }
  });
  ipcMain.handle("server:checkStatus", async (_event, address, port) => {
    try {
      return await checkServerStatus(address, port);
    } catch (err) {
      log("error", `server:checkStatus failed: ${err.message}`);
      throw err;
    }
  });
  ipcMain.handle("app:getVersion", async () => {
    return APP_VERSION;
  });
  ipcMain.handle("app:checkUpdate", async () => {
    try {
      return await checkForUpdate();
    } catch (err) {
      log("error", `app:checkUpdate failed: ${err.message}`);
      throw err;
    }
  });
  ipcMain.handle("admin:scanFolder", async (_event, folderPath) => {
    try {
      return await adminScanFolder(folderPath);
    } catch (err) {
      log("error", `admin:scanFolder failed: ${err.message}`);
      throw err;
    }
  });
  ipcMain.handle("admin:generateManifest", async (_event, data) => {
    try {
      return await adminGenerateManifest(data);
    } catch (err) {
      log("error", `admin:generateManifest failed: ${err.message}`);
      throw err;
    }
  });
  ipcMain.handle("admin:saveManifest", async (_event, manifest, filePath) => {
    try {
      await adminSaveManifest(manifest, filePath);
    } catch (err) {
      log("error", `admin:saveManifest failed: ${err.message}`);
      throw err;
    }
  });
  ipcMain.handle("logs:get", async () => {
    return getLogs();
  });
  ipcMain.handle("logs:openFolder", async () => {
    try {
      await openFolderInExplorer(getLogsFilePath());
    } catch (err) {
      log("error", `logs:openFolder failed: ${err.message}`);
      throw err;
    }
  });
  ipcMain.handle("logs:copyToClipboard", async () => {
    try {
      const text = copyLogsToClipboard();
      clipboard.writeText(text);
      return text;
    } catch (err) {
      log("error", `logs:copyToClipboard failed: ${err.message}`);
      throw err;
    }
  });
  ipcMain.handle("recovery:check", async () => {
    try {
      const settings = await getSettings();
      if (!settings.lastModsPath) {
        return false;
      }
      const stateFilePath = path13.join(settings.lastModsPath, SYNC_STATE_FILE);
      const state = await readJsonFile(stateFilePath);
      return state?.status === "running" || state?.status === "interrupted";
    } catch {
      return false;
    }
  });
  ipcMain.handle("recovery:perform", async () => {
    try {
      const settings = await getSettings();
      if (!settings.lastModsPath) {
        throw new Error("No mods folder configured.");
      }
      const modsPath = normalizePath(settings.lastModsPath);
      const tempFiles = await listFiles(modsPath, DOWNLOAD_TEMP_EXTENSION);
      for (const tempFile of tempFiles) {
        try {
          await deleteFile(tempFile);
          log("info", `Recovery: deleted temp file ${path13.basename(tempFile)}`);
        } catch (err) {
          log("warn", `Recovery: could not delete temp file ${path13.basename(tempFile)}: ${err.message}`);
        }
      }
      const stateFilePath = path13.join(modsPath, SYNC_STATE_FILE);
      try {
        await deleteFile(stateFilePath);
        log("info", "Recovery: removed sync state file");
      } catch (err) {
        log("warn", `Recovery: could not remove sync state file: ${err.message}`);
      }
      log("info", "Recovery completed. Please re-check mods to get a fresh sync plan.");
    } catch (err) {
      log("error", `recovery:perform failed: ${err.message}`);
      throw err;
    }
  });
  log("info", "All IPC handlers registered");
}

// electron/main.ts
var MAIN_FILE = fileURLToPath(import.meta.url);
var DIST_ELECTRON_DIR = path14.dirname(MAIN_FILE);
var mainWindow = null;
function createWindow() {
  mainWindow = new BrowserWindow2({
    width: 1100,
    height: 750,
    minWidth: 800,
    minHeight: 600,
    title: "krofnePackUpdater",
    backgroundColor: "#1a1a2e",
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      preload: path14.join(DIST_ELECTRON_DIR, "preload.cjs")
    }
  });
  if (process.env.NODE_ENV === "development" || !app4.isPackaged) {
    mainWindow.loadURL("http://127.0.0.1:5173");
  } else {
    mainWindow.loadFile(path14.join(DIST_ELECTRON_DIR, "../dist/index.html"));
  }
  mainWindow.on("closed", () => {
    mainWindow = null;
  });
}
app4.whenReady().then(() => {
  registerIpcHandlers();
  createWindow();
  app4.on("activate", () => {
    if (BrowserWindow2.getAllWindows().length === 0) createWindow();
  });
});
app4.on("window-all-closed", () => {
  if (process.platform !== "darwin") app4.quit();
});
//# sourceMappingURL=main.js.map

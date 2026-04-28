/**
 * Sync Engine Test Suite for krofnePackUpdater
 *
 * Tests the real sync pipeline against fake fixtures — no Minecraft, no internet.
 * Uses file:// URLs for downloads and Bun's mock system for Electron dependencies.
 *
 * IMPORTANT: All service imports must be DYNAMIC (not static) because
 * Bun hoists static imports above mock.module() calls, causing the real
 * 'electron' module to load before we can mock it.
 *
 * Scenarios:
 * 1. Happy path: check + execute + verify
 * 2. Failure: hash mismatch → retry → sync halt
 * 3. Rollback: restore from backup
 */
import { test, describe, beforeAll, afterAll, expect, mock } from 'bun:test';
import path from 'path';
import fs from 'fs/promises';

// ============================================================
// Mock Electron BEFORE any dynamic import of services
// ============================================================
const TEST_USERDATA = '/tmp/krofne-test-userdata';

mock.module('electron', () => ({
  app: {
    getPath: (name: string) => {
      if (name === 'userData') return TEST_USERDATA;
      return '/tmp/krofne-test';
    },
    getVersion: () => '1.0.0-test',
  },
}));

// ============================================================
// Dynamic imports — loaded AFTER mock is set up
// ============================================================
let buildSyncPlan: typeof import('../electron/services/syncPlannerService').buildSyncPlan;
let executeSyncPlan: typeof import('../electron/services/syncExecutorService').executeSyncPlan;
let scanModsDirectory: typeof import('../electron/services/scannerService').scanModsDirectory;
let computeFileSha512: typeof import('../electron/services/hashService').computeFileSha512;
let rollbackBackup: typeof import('../electron/services/backupService').rollbackBackup;
let listBackups: typeof import('../electron/services/backupService').listBackups;
let saveSettings: typeof import('../electron/services/settingsService').saveSettings;
let getSettings: typeof import('../electron/services/settingsService').getSettings;

type Manifest = import('../shared/types/manifest').Manifest;
type SyncPlan = import('../shared/types/sync').SyncPlan;
type SyncState = import('../shared/types/sync').SyncState;
type LocalModFile = import('../shared/types/mod').LocalModFile;
type BackupMeta = import('../shared/types/backup').BackupMeta;

let SYNC_STATE_FILE: string;
let fileExists: (filePath: string) => Promise<boolean>;
let readJsonFile: <T>(filePath: string) => Promise<T | null>;
let writeJsonFile: (filePath: string, data: unknown) => Promise<void>;
let ensureDir: (dirPath: string) => Promise<void>;
let normalizePath: (p: string) => string;

// ============================================================
// Test fixture paths
// ============================================================
const PROJECT_ROOT = '/home/z/my-project/krofne-pack-updater';
const FIXTURES_DIR = path.join(PROJECT_ROOT, 'test-fixtures');
const FAKE_MINECRAFT = path.join(FIXTURES_DIR, 'fake-minecraft');
const REMOTE_FILES = path.join(FIXTURES_DIR, 'remote-files');
const MANIFEST_PATH = path.join(FIXTURES_DIR, 'manifest.test.json');

// We copy fixtures to a temp dir so tests don't pollute the originals
const TEST_RUN_DIR = '/tmp/krofne-sync-test-run';

// ============================================================
// Helpers
// ============================================================
let testModsDir: string;
let testRemoteDir: string;
let manifest: Manifest;

async function copyDirRecursive(src: string, dest: string): Promise<void> {
  await ensureDir(dest);
  const entries = await fs.readdir(src, { withFileTypes: true });
  for (const entry of entries) {
    const srcPath = path.join(src, entry.name);
    const destPath = path.join(dest, entry.name);
    if (entry.isDirectory()) {
      await copyDirRecursive(srcPath, destPath);
    } else {
      await fs.copyFile(srcPath, destPath);
    }
  }
}

async function cleanDir(dir: string): Promise<void> {
  try {
    await fs.rm(dir, { recursive: true, force: true });
  } catch {
    // ignore
  }
}

async function listAllFiles(dir: string): Promise<string[]> {
  const results: string[] = [];
  try {
    const entries = await fs.readdir(dir, { withFileTypes: true });
    for (const entry of entries) {
      const fullPath = path.join(dir, entry.name);
      if (entry.isDirectory()) {
        results.push(...await listAllFiles(fullPath));
      } else {
        results.push(fullPath);
      }
    }
  } catch {
    // ignore
  }
  return results;
}

// ============================================================
// Load all modules dynamically AFTER mock is set up
// ============================================================
async function loadModules() {
  const syncPlanner = await import('../electron/services/syncPlannerService');
  buildSyncPlan = syncPlanner.buildSyncPlan;

  const syncExecutor = await import('../electron/services/syncExecutorService');
  executeSyncPlan = syncExecutor.executeSyncPlan;

  const scanner = await import('../electron/services/scannerService');
  scanModsDirectory = scanner.scanModsDirectory;

  const hash = await import('../electron/services/hashService');
  computeFileSha512 = hash.computeFileSha512;

  const backup = await import('../electron/services/backupService');
  rollbackBackup = backup.rollbackBackup;
  listBackups = backup.listBackups;

  const settings = await import('../electron/services/settingsService');
  saveSettings = settings.saveSettings;
  getSettings = settings.getSettings;

  const constants = await import('../shared/constants');
  SYNC_STATE_FILE = constants.SYNC_STATE_FILE;

  const fileSystem = await import('../electron/utils/fileSystem');
  fileExists = fileSystem.fileExists;
  readJsonFile = fileSystem.readJsonFile;
  writeJsonFile = fileSystem.writeJsonFile;

  const safePath = await import('../electron/utils/safePath');
  ensureDir = safePath.ensureDir;
  normalizePath = safePath.normalizePath;
}

// ============================================================
// Test Suite
// ============================================================

describe('Sync Engine — Test Fixtures', () => {
  beforeAll(async () => {
    // Load all modules (with electron mock active)
    await loadModules();

    // Clean up any previous test run
    await cleanDir(TEST_RUN_DIR);
    await cleanDir(TEST_USERDATA);

    // Copy fake-minecraft to test run directory
    testModsDir = path.join(TEST_RUN_DIR, 'fake-minecraft', 'mods');
    testRemoteDir = path.join(TEST_RUN_DIR, 'remote-files');

    await copyDirRecursive(FAKE_MINECRAFT, path.join(TEST_RUN_DIR, 'fake-minecraft'));
    await copyDirRecursive(REMOTE_FILES, testRemoteDir);

    // Load manifest and fix download URLs to point to our test remote dir
    const rawManifest = await readJsonFile<Manifest>(MANIFEST_PATH);
    if (!rawManifest) throw new Error('Failed to load manifest.test.json');
    manifest = rawManifest;

    // Update download URLs to point to the test remote directory
    for (const mod of manifest.mods) {
      mod.downloadUrl = `file://${testRemoteDir}/${mod.fileName}`;
    }

    // Initialize settings
    await saveSettings({
      manifestUrl: '',
      lastModsPath: testModsDir,
      uiMode: 'detailed',
      debugMode: false,
    });
  });

  afterAll(async () => {
    await cleanDir(TEST_RUN_DIR);
    await cleanDir(TEST_USERDATA);
  });

  // ============================================================
  // 1. CHECK STAGE — BuildSyncPlan
  // ============================================================
  describe('1. Check Stage (buildSyncPlan)', () => {
    let localMods: LocalModFile[];
    let plan: SyncPlan;

    beforeAll(async () => {
      localMods = await scanModsDirectory(testModsDir);
      plan = buildSyncPlan(manifest, localMods, testModsDir);
    });

    test('should find 4 local .jar files', () => {
      expect(localMods.length).toBe(4);
      const names = localMods.map(m => m.fileName).sort();
      expect(names).toEqual(['installed-ok.jar', 'random-extra.jar', 'wrong-version.jar', 'xaero-extra.jar']);
    });

    test('installed count = 1 (installed-ok.jar)', () => {
      expect(plan.summary.installedCount).toBe(1);
      expect(plan.installed[0].manifestMod?.fileName).toBe('installed-ok.jar');
      expect(plan.installed[0].status).toBe('installed');
    });

    test('missing count = 1 (missing-mod.jar)', () => {
      expect(plan.summary.missingCount).toBe(1);
      expect(plan.missing[0].manifestMod?.fileName).toBe('missing-mod.jar');
      expect(plan.missing[0].status).toBe('missing');
    });

    test('wrong_hash count = 1 (wrong-version.jar)', () => {
      expect(plan.summary.wrongHashCount).toBe(1);
      expect(plan.wrongHash[0].manifestMod?.fileName).toBe('wrong-version.jar');
      expect(plan.wrongHash[0].status).toBe('wrong_hash');
    });

    test('extra count = 1 (random-extra.jar)', () => {
      expect(plan.summary.extraCount).toBe(1);
      expect(plan.extra[0].localFile?.fileName).toBe('random-extra.jar');
      expect(plan.extra[0].status).toBe('extra');
    });

    test('allowed_extra count = 1 (xaero-extra.jar)', () => {
      expect(plan.summary.allowedExtraCount).toBe(1);
      expect(plan.allowedExtra[0].localFile?.fileName).toBe('xaero-extra.jar');
      expect(plan.allowedExtra[0].status).toBe('allowed_extra');
    });

    test('actions are correct', () => {
      const actionTypes = plan.actions.map(a => ({ type: a.type, file: a.mod?.fileName ?? a.localFile?.fileName }));

      // missing-mod.jar → download
      const downloadAction = actionTypes.find(a => a.type === 'download' && a.file === 'missing-mod.jar');
      expect(downloadAction).toBeDefined();

      // wrong-version.jar → replace
      const replaceAction = actionTypes.find(a => a.type === 'replace' && a.file === 'wrong-version.jar');
      expect(replaceAction).toBeDefined();

      // random-extra.jar → move_extra_to_disabled
      const disableAction = actionTypes.find(a => a.type === 'move_extra_to_disabled' && a.file === 'random-extra.jar');
      expect(disableAction).toBeDefined();

      // xaero-extra.jar → no action (allowed extra)
      const xaeroAction = actionTypes.find(a => a.file === 'xaero-extra.jar');
      expect(xaeroAction).toBeUndefined();
    });
  });

  // ============================================================
  // 2. EXECUTE STAGE — Full sync
  // ============================================================
  describe('2. Execute Stage (happy path)', () => {
    let plan: SyncPlan;

    beforeAll(async () => {
      const localMods = await scanModsDirectory(testModsDir);
      plan = buildSyncPlan(manifest, localMods, testModsDir);

      // Execute the sync
      await executeSyncPlan(plan);
    });

    test('missing-mod.jar appeared in mods', async () => {
      const filePath = path.join(testModsDir, 'missing-mod.jar');
      expect(await fileExists(filePath)).toBe(true);
    });

    test('wrong-version.jar replaced with correct hash', async () => {
      const filePath = path.join(testModsDir, 'wrong-version.jar');
      expect(await fileExists(filePath)).toBe(true);

      const actualHash = await computeFileSha512(filePath);
      expect(actualHash.toLowerCase()).toBe(manifest.mods.find(m => m.id === 'wrong-version')!.sha512.toLowerCase());
    });

    test('old wrong-version.jar backed up in _backup_by_krofne_pack', async () => {
      const backupDir = path.join(testModsDir, '_backup_by_krofne_pack');
      expect(await fileExists(backupDir)).toBe(true);

      // Find the backup session
      const entries = await fs.readdir(backupDir);
      const sessionDirs = entries.filter(e => e.startsWith('backup_'));
      expect(sessionDirs.length).toBeGreaterThanOrEqual(1);

      // Check that wrong-version.jar is in the backup
      const sessionPath = path.join(backupDir, sessionDirs[0]);
      const backupFiles = await fs.readdir(sessionPath);
      const hasJarBackup = backupFiles.some(f => f.startsWith('wrong-version') && f.endsWith('.jar'));
      expect(hasJarBackup).toBe(true);
    });

    test('backup-meta.json exists in backup session', async () => {
      const backupDir = path.join(testModsDir, '_backup_by_krofne_pack');
      const entries = await fs.readdir(backupDir);
      const sessionDirs = entries.filter(e => e.startsWith('backup_'));
      const metaPath = path.join(backupDir, sessionDirs[0], 'backup-meta.json');

      const meta = await readJsonFile<BackupMeta>(metaPath);
      expect(meta).not.toBeNull();
      expect(meta!.files.length).toBeGreaterThanOrEqual(1);
      expect(meta!.files.some(f => f.fileName.startsWith('wrong-version'))).toBe(true);
    });

    test('random-extra.jar moved to _disabled_by_krofne_pack', async () => {
      const disabledDir = path.join(testModsDir, '_disabled_by_krofne_pack');
      expect(await fileExists(disabledDir)).toBe(true);

      // Check for the file (might have timestamp suffix)
      const entries = await fs.readdir(disabledDir);
      const hasRandomExtra = entries.some(e => e.startsWith('random-extra') && e.endsWith('.jar'));
      expect(hasRandomExtra).toBe(true);

      // Original should no longer be in mods
      const originalPath = path.join(testModsDir, 'random-extra.jar');
      expect(await fileExists(originalPath)).toBe(false);
    });

    test('xaero-extra.jar still in mods (allowed extra)', async () => {
      const filePath = path.join(testModsDir, 'xaero-extra.jar');
      expect(await fileExists(filePath)).toBe(true);
    });

    test('installed-ok.jar still in mods (unchanged)', async () => {
      const filePath = path.join(testModsDir, 'installed-ok.jar');
      expect(await fileExists(filePath)).toBe(true);
    });

    test('no .download files remain after successful sync', async () => {
      const allFiles = await listAllFiles(testModsDir);
      const downloadFiles = allFiles.filter(f => f.endsWith('.download'));
      expect(downloadFiles.length).toBe(0);
    });

    test('.krofne-sync-state.json has completed status', async () => {
      const statePath = path.join(testModsDir, SYNC_STATE_FILE);
      const state = await readJsonFile<SyncState>(statePath);
      expect(state).not.toBeNull();
      expect(state!.status).toBe('completed');
      expect(state!.tempFiles.length).toBe(0);
    });
  });

  // ============================================================
  // 3. FAILURE TEST — hash mismatch, retry, sync halt
  // ============================================================
  describe('3. Failure Test (hash mismatch → sync halt)', () => {
    let failureModsDir: string;
    let failureRemoteDir: string;
    let failureManifest: Manifest;

    beforeAll(async () => {
      // Create a fresh test environment for failure tests
      failureModsDir = path.join(TEST_RUN_DIR, 'failure-fake-minecraft', 'mods');
      failureRemoteDir = path.join(TEST_RUN_DIR, 'failure-remote-files');

      await copyDirRecursive(FAKE_MINECRAFT, path.join(TEST_RUN_DIR, 'failure-fake-minecraft'));

      // Create a corrupted version of missing-mod.jar in remote
      await ensureDir(failureRemoteDir);
      // Write a file with WRONG content (so SHA won't match the manifest)
      await fs.writeFile(
        path.join(failureRemoteDir, 'missing-mod.jar'),
        'CORRUPTED-content-that-does-not-match-hash',
      );

      // Also write the correct wrong-version.jar for replace
      await fs.writeFile(
        path.join(failureRemoteDir, 'wrong-version.jar'),
        'wrong-version-correct-content-v1.0',
      );

      // Use a manifest where missing-mod.jar's SHA doesn't match the corrupted file
      failureManifest = JSON.parse(JSON.stringify(manifest));
      for (const mod of failureManifest.mods) {
        mod.downloadUrl = `file://${failureRemoteDir}/${mod.fileName}`;
      }

      // Reduce retries to 1 so the failure test doesn't take too long
      // (3 retries with exponential backoff = ~7+ seconds)
      failureManifest.settings.downloadRetries = 1;

      // Reinitialize settings for the failure test
      await saveSettings({
        manifestUrl: '',
        lastModsPath: failureModsDir,
        uiMode: 'detailed',
        debugMode: false,
        lastSuccessfulPackVersion: undefined,
      });
    });

    test('sync fails when download hash mismatches after retries', async () => {
      const localMods = await scanModsDirectory(failureModsDir);
      const plan = buildSyncPlan(failureManifest, localMods, failureModsDir);

      // The missing-mod.jar remote file is corrupted, so hash won't match
      // After 3 retries, it should throw
      try {
        await executeSyncPlan(plan);
        // If we get here, the test should fail — we expected an error
        expect.unreachable('Expected sync to fail due to hash mismatch');
      } catch (err: any) {
        expect(err).toBeDefined();
        // The error may be from retryWithBackoff (hash mismatch) or from
        // the sync executor (re-verification failed, download temp missing, etc.)
        const msg = err.message.toLowerCase();
        const isHashMismatch = msg.includes('hash mismatch');
        const isSyncFailed = msg.includes('sync failed');
        expect(isHashMismatch || isSyncFailed).toBe(true);
      }
    }, 30000); // 30s timeout: retries with exponential backoff take time

    test('final .jar is NOT created from broken .download', async () => {
      // missing-mod.jar should NOT exist in mods (it was never successfully downloaded)
      const filePath = path.join(failureModsDir, 'missing-mod.jar');
      expect(await fileExists(filePath)).toBe(false);
    });

    test('old files are not replaced (sync halted before touching local files)', async () => {
      // wrong-version.jar should still be the OLD version
      const filePath = path.join(failureModsDir, 'wrong-version.jar');
      expect(await fileExists(filePath)).toBe(true);

      // Verify it's still the old hash (not the new one)
      const actualHash = await computeFileSha512(filePath);
      const expectedOldHash = '18559414c2fccbffe9b6b4844968dfe51491ebbe4cc8e02bbd3c04c159d7f720169ccf5e5073e29bf5627656f12831c09bfd88e6ffb89c6dfc0cb63c8f7bea71';
      expect(actualHash.toLowerCase()).toBe(expectedOldHash.toLowerCase());
    });

    test('.download files cleaned up or safely left for recovery', async () => {
      // After failure, .download files may remain for recovery
      // But they should NOT be the final .jar files
      const allFiles = await listAllFiles(failureModsDir);
      const jarFiles = allFiles.filter(f =>
        f.endsWith('.jar') &&
        !f.includes('_backup_by_krofne_pack') &&
        !f.includes('_disabled_by_krofne_pack')
      );

      // missing-mod.jar should NOT be among the jar files
      expect(jarFiles.some(f => path.basename(f) === 'missing-mod.jar')).toBe(false);
    });

    test('.krofne-sync-state.json has interrupted status', async () => {
      const statePath = path.join(failureModsDir, SYNC_STATE_FILE);
      const state = await readJsonFile<SyncState>(statePath);
      expect(state).not.toBeNull();
      expect(state!.status).toBe('interrupted');
    });
  });

  // ============================================================
  // 4. ROLLBACK TEST
  // ============================================================
  describe('4. Rollback Test', () => {
    let rollbackModsDir: string;
    let rollbackRemoteDir: string;
    let rollbackManifest: Manifest;
    let sessionId: string;

    beforeAll(async () => {
      // Fresh environment for rollback test
      rollbackModsDir = path.join(TEST_RUN_DIR, 'rollback-fake-minecraft', 'mods');
      rollbackRemoteDir = path.join(TEST_RUN_DIR, 'rollback-remote-files');

      await copyDirRecursive(FAKE_MINECRAFT, path.join(TEST_RUN_DIR, 'rollback-fake-minecraft'));
      await copyDirRecursive(REMOTE_FILES, rollbackRemoteDir);

      rollbackManifest = JSON.parse(JSON.stringify(manifest));
      for (const mod of rollbackManifest.mods) {
        mod.downloadUrl = `file://${rollbackRemoteDir}/${mod.fileName}`;
      }

      // Reinitialize settings
      await saveSettings({
        manifestUrl: '',
        lastModsPath: rollbackModsDir,
        uiMode: 'detailed',
        debugMode: false,
        lastSuccessfulPackVersion: undefined,
      });

      // Run sync first
      const localMods = await scanModsDirectory(rollbackModsDir);
      const plan = buildSyncPlan(rollbackManifest, localMods, rollbackModsDir);
      await executeSyncPlan(plan);

      // Get the backup session ID
      const backups = await listBackups(rollbackModsDir);
      expect(backups.length).toBeGreaterThanOrEqual(1);
      sessionId = backups[0].folderName;
    });

    test('rollback restores wrong-version.jar from backup', async () => {
      // Before rollback: wrong-version.jar has the NEW hash
      const filePath = path.join(rollbackModsDir, 'wrong-version.jar');
      const hashBeforeRollback = await computeFileSha512(filePath);
      const expectedNewHash = rollbackManifest.mods.find(m => m.id === 'wrong-version')!.sha512.toLowerCase();
      expect(hashBeforeRollback.toLowerCase()).toBe(expectedNewHash);

      // Perform rollback
      await rollbackBackup(rollbackModsDir, sessionId);

      // After rollback: wrong-version.jar should have the OLD hash
      const hashAfterRollback = await computeFileSha512(filePath);
      const expectedOldHash = '18559414c2fccbffe9b6b4844968dfe51491ebbe4cc8e02bbd3c04c159d7f720169ccf5e5073e29bf5627656f12831c09bfd88e6ffb89c6dfc0cb63c8f7bea71';
      expect(hashAfterRollback.toLowerCase()).toBe(expectedOldHash.toLowerCase());
    });

    test('current file before rollback went to emergency backup', async () => {
      const backupDir = path.join(rollbackModsDir, '_backup_by_krofne_pack');
      const entries = await fs.readdir(backupDir);

      // Should have both the original backup and the emergency backup
      const emergencyDirs = entries.filter(e => e.startsWith('emergency_'));
      expect(emergencyDirs.length).toBeGreaterThanOrEqual(1);

      // Emergency backup should contain the current (new) version of wrong-version.jar
      const emergencyPath = path.join(backupDir, emergencyDirs[0]);
      const emergencyFiles = await fs.readdir(emergencyPath);
      const hasJar = emergencyFiles.some(f => f.startsWith('wrong-version') && f.endsWith('.jar'));
      expect(hasJar).toBe(true);
    });

    test('rollback creates emergency backup with metadata', async () => {
      const backupDir = path.join(rollbackModsDir, '_backup_by_krofne_pack');
      const entries = await fs.readdir(backupDir);
      const emergencyDirs = entries.filter(e => e.startsWith('emergency_'));

      const metaPath = path.join(backupDir, emergencyDirs[0], 'backup-meta.json');
      const meta = await readJsonFile<BackupMeta>(metaPath);
      expect(meta).not.toBeNull();
      expect(meta!.files.length).toBeGreaterThanOrEqual(1);
    });
  });
});

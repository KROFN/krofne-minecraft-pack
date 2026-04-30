import path from 'path';
import type { Manifest, ManifestMod, AllowedExtraModRule } from '../../shared/types/manifest';
import type { LocalModFile, ModCheckResult } from '../../shared/types/mod';
import type { SyncPlan, SyncAction } from '../../shared/types/sync';
import { getBackupDir, getDisabledDir, normalizePath } from '../utils/safePath';
import { addTimestampToFileName } from '../utils/filename';
import { formatIsoDate } from '../utils/time';
import { log } from './logService';

/**
 * Build a SyncPlan from a manifest and local mods.
 *
 * Logic:
 * - For each ManifestMod:
 *   - SHA match → installed (if filename differs → add rename action)
 *   - FileName match but SHA differs → wrong_hash, action replace
 *   - Neither → missing, action download
 * - For each local .jar not in manifest:
 *   - Check against allowedExtraMods rules
 *   - If allowed → allowed_extra
 *   - Else → extra, action move_extra_to_disabled
 */
export function buildSyncPlan(
  manifest: Manifest,
  localMods: LocalModFile[],
  modsDir: string,
): SyncPlan {
  const resolvedModsDir = normalizePath(modsDir);
  const disabledDir = getDisabledDir(resolvedModsDir);

  log('info', `Building sync plan for ${manifest.mods.length} manifest mods vs ${localMods.length} local mods`);

  // Build indexes
  const localByHash = new Map<string, LocalModFile>();
  const localByFileName = new Map<string, LocalModFile>();

  for (const mod of localMods) {
    localByHash.set(mod.sha512.toLowerCase(), mod);
    localByFileName.set(mod.fileName.toLowerCase(), mod);
  }

  const manifestByHash = new Map<string, ManifestMod>();
  const manifestByFileName = new Map<string, ManifestMod>();

  for (const mod of manifest.mods) {
    manifestByHash.set(mod.sha512.toLowerCase(), mod);
    manifestByFileName.set(mod.fileName.toLowerCase(), mod);
  }

  const installed: ModCheckResult[] = [];
  const missing: ModCheckResult[] = [];
  const wrongHash: ModCheckResult[] = [];
  const actions: SyncAction[] = [];
  const matchedLocalKeys = new Set<string>(); // track which local mods we've accounted for

  // Process each manifest mod
  for (const manifestMod of manifest.mods) {
    const targetPath = path.join(resolvedModsDir, manifestMod.fileName);
    const hashKey = manifestMod.sha512.toLowerCase();
    const fileNameKey = manifestMod.fileName.toLowerCase();

    const localByHashMatch = localByHash.get(hashKey);
    const localByFileNameMatch = localByFileName.get(fileNameKey);

    if (localByHashMatch) {
      // SHA match — this mod is installed
      matchedLocalKeys.add(localByHashMatch.sha512.toLowerCase());

      const result: ModCheckResult = {
        status: 'installed',
        manifestMod,
        localFile: localByHashMatch,
        message: `Already installed: ${manifestMod.name}`,
      };
      installed.push(result);

      // If filename differs from manifest, add a rename action
      if (localByHashMatch.fileName !== manifestMod.fileName) {
        const renameAction: SyncAction = {
          id: `rename-${manifestMod.id}`,
          type: 'rename_to_manifest_filename',
          mod: manifestMod,
          localFile: localByHashMatch,
          targetPath,
          reason: `Rename ${localByHashMatch.fileName} → ${manifestMod.fileName}`,
        };
        actions.push(renameAction);
        result.expectedFileName = manifestMod.fileName;
      }
    } else if (localByFileNameMatch) {
      // Filename matches but SHA differs — wrong version
      matchedLocalKeys.add(localByFileNameMatch.sha512.toLowerCase());

      const result: ModCheckResult = {
        status: 'wrong_hash',
        manifestMod,
        localFile: localByFileNameMatch,
        expectedFileName: manifestMod.fileName,
        message: `Wrong version: ${manifestMod.name} (hash mismatch)`,
      };
      wrongHash.push(result);

      const replaceAction: SyncAction = {
        id: `replace-${manifestMod.id}`,
        type: 'replace',
        mod: manifestMod,
        localFile: localByFileNameMatch,
        targetPath,
        reason: `Replace ${manifestMod.fileName} with correct version`,
      };
      actions.push(replaceAction);
    } else {
      // Not found at all — missing
      const result: ModCheckResult = {
        status: 'missing',
        manifestMod,
        expectedFileName: manifestMod.fileName,
        message: `Missing: ${manifestMod.name}`,
      };
      missing.push(result);

      const downloadAction: SyncAction = {
        id: `download-${manifestMod.id}`,
        type: 'download',
        mod: manifestMod,
        targetPath,
        reason: `Download ${manifestMod.name}`,
      };
      actions.push(downloadAction);
    }
  }

  // Process extra local mods (not in manifest)
  const extra: ModCheckResult[] = [];
  const allowedExtra: ModCheckResult[] = [];
  const allowedRules = manifest.allowedExtraMods || [];

  for (const localMod of localMods) {
    const hashKey = localMod.sha512.toLowerCase();

    // Skip if we already matched this local mod to a manifest entry
    if (matchedLocalKeys.has(hashKey)) continue;

    // Check if this local mod matches the manifest by hash (it was already handled above)
    if (manifestByHash.has(hashKey)) continue;

    // Check if this local mod matches by filename
    const fileNameKey = localMod.fileName.toLowerCase();
    if (manifestByFileName.has(fileNameKey)) continue;

    // This is an extra mod — check against allowed rules
    const isAllowed = checkAllowedExtra(localMod, allowedRules);

    if (isAllowed) {
      const result: ModCheckResult = {
        status: 'allowed_extra',
        localFile: localMod,
        message: `Allowed extra mod: ${localMod.fileName}`,
      };
      allowedExtra.push(result);
    } else {
      const timestamp = formatIsoDate().replace(/[:.]/g, '-');
      const disabledFileName = addTimestampToFileName(localMod.fileName, timestamp);
      const disabledPath = path.join(disabledDir, disabledFileName);

      const result: ModCheckResult = {
        status: 'extra',
        localFile: localMod,
        message: `Extra mod will be disabled: ${localMod.fileName}`,
      };
      extra.push(result);

      const moveAction: SyncAction = {
        id: `disable-${localMod.fileName}`,
        type: 'move_extra_to_disabled',
        localFile: localMod,
        targetPath: disabledPath,
        reason: `Move extra mod to disabled: ${localMod.fileName}`,
      };
      actions.push(moveAction);
    }
  }

  const plan: SyncPlan = {
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
      totalActions: actions.length,
    },
  };

  log('info', `Sync plan built: ${plan.summary.installedCount} installed, ${plan.summary.missingCount} missing, ${plan.summary.wrongHashCount} wrong hash, ${plan.summary.extraCount} extra, ${plan.summary.allowedExtraCount} allowed extra, ${plan.summary.totalActions} total actions`);

  return plan;
}

/**
 * Check if a local mod matches any allowedExtraMods rule.
 */
function checkAllowedExtra(localMod: LocalModFile, rules: AllowedExtraModRule[]): boolean {
  for (const rule of rules) {
    switch (rule.match) {
      case 'filename_contains':
        if (localMod.fileName.toLowerCase().includes(rule.value.toLowerCase())) {
          return true;
        }
        break;
      case 'filename_regex':
        try {
          const regex = new RegExp(rule.value, 'i');
          if (regex.test(localMod.fileName)) {
            return true;
          }
        } catch {
          // Invalid regex — skip
        }
        break;
      case 'sha512':
        if (localMod.sha512.toLowerCase() === rule.value.toLowerCase()) {
          return true;
        }
        break;
    }
  }
  return false;
}

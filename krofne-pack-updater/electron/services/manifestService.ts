import type { Manifest } from '../../shared/types/manifest';
import { log } from './logService';

/**
 * Validate that parsed data conforms to the Manifest schema.
 * Throws a user-friendly error if validation fails.
 */
export function validateManifest(data: unknown): Manifest {
  if (!data || typeof data !== 'object') {
    throw new Error('Manifest is not a valid JSON object.');
  }

  const obj = data as Record<string, unknown>;

  // schemaVersion
  if (obj.schemaVersion === undefined || obj.schemaVersion === null) {
    throw new Error('Manifest is missing "schemaVersion".');
  }
  if (typeof obj.schemaVersion !== 'number') {
    throw new Error('Manifest "schemaVersion" must be a number.');
  }

  // packName
  if (!obj.packName || typeof obj.packName !== 'string') {
    throw new Error('Manifest is missing or has invalid "packName".');
  }

  // packVersion
  if (!obj.packVersion || typeof obj.packVersion !== 'string') {
    throw new Error('Manifest is missing or has invalid "packVersion".');
  }

  // minecraftVersion
  if (!obj.minecraftVersion || typeof obj.minecraftVersion !== 'string') {
    throw new Error('Manifest is missing or has invalid "minecraftVersion".');
  }

  // loader
  if (!obj.loader || typeof obj.loader !== 'string') {
    throw new Error('Manifest is missing or has invalid "loader".');
  }
  const validLoaders = ['forge', 'fabric', 'neoforge', 'quilt'];
  if (!validLoaders.includes(obj.loader)) {
    throw new Error(`Manifest "loader" must be one of: ${validLoaders.join(', ')}. Got: "${obj.loader}".`);
  }

  // mods
  if (!Array.isArray(obj.mods)) {
    throw new Error('Manifest "mods" must be an array.');
  }

  // Validate each mod entry
  for (let i = 0; i < obj.mods.length; i++) {
    const mod = obj.mods[i];
    if (!mod || typeof mod !== 'object') {
      throw new Error(`Manifest mods[${i}] is not a valid object.`);
    }
    const m = mod as Record<string, unknown>;
    if (!m.id || typeof m.id !== 'string') {
      throw new Error(`Manifest mods[${i}] is missing or has invalid "id".`);
    }
    if (!m.name || typeof m.name !== 'string') {
      throw new Error(`Manifest mods[${i}] is missing or has invalid "name".`);
    }
    if (!m.fileName || typeof m.fileName !== 'string') {
      throw new Error(`Manifest mods[${i}] is missing or has invalid "fileName".`);
    }
    if (!m.downloadUrl || typeof m.downloadUrl !== 'string') {
      throw new Error(`Manifest mods[${i}] is missing or has invalid "downloadUrl".`);
    }
    if (!m.sha512 || typeof m.sha512 !== 'string') {
      throw new Error(`Manifest mods[${i}] is missing or has invalid "sha512".`);
    }
  }

  return obj as unknown as Manifest;
}

/**
 * Fetch manifest JSON from a URL, validate it, and return it.
 */
export async function loadManifest(url: string): Promise<Manifest> {
  log('info', `Loading manifest from: ${url}`);

  let response: Response;
  try {
    response = await fetch(url, {
      signal: AbortSignal.timeout(30000),
    });
  } catch (err: any) {
    log('error', `Failed to fetch manifest: ${err.message}`);
    throw new Error(`Failed to fetch manifest from URL: ${err.message}`);
  }

  if (!response.ok) {
    const msg = `Failed to fetch manifest: HTTP ${response.status} ${response.statusText}`;
    log('error', msg);
    throw new Error(msg);
  }

  let data: unknown;
  try {
    data = await response.json();
  } catch (err: any) {
    log('error', `Failed to parse manifest JSON: ${err.message}`);
    throw new Error(`Manifest is not valid JSON: ${err.message}`);
  }

  const manifest = validateManifest(data);
  log('info', `Manifest loaded successfully: ${manifest.packName} v${manifest.packVersion} (${manifest.mods.length} mods)`);
  return manifest;
}

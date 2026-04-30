import { build } from "esbuild";
import { rm } from "node:fs/promises";

// Clean previous build output
await rm("dist-electron", { recursive: true, force: true });

// Build main process as ESM bundle
await build({
  entryPoints: ["electron/main.ts"],
  outfile: "dist-electron/main.js",
  bundle: true,
  platform: "node",
  format: "esm",
  target: "node22",
  sourcemap: true,
  external: ["electron"],
  logLevel: "info",
});

// Build preload as CJS bundle
// IMPORTANT: preload MUST be CJS because Electron's contextBridge
// does not work with ESM preload — "Cannot use import statement outside a module"
await build({
  entryPoints: ["electron/preload.ts"],
  outfile: "dist-electron/preload.cjs",
  bundle: true,
  platform: "node",
  format: "cjs",
  target: "node22",
  sourcemap: true,
  external: ["electron"],
  logLevel: "info",
});

// Verify output files exist
import { access, constants } from "node:fs/promises";

try {
  await access("dist-electron/main.js", constants.F_OK);
  console.log("✓ dist-electron/main.js exists");
} catch {
  console.error("✗ dist-electron/main.js NOT found!");
  process.exit(1);
}

try {
  await access("dist-electron/preload.cjs", constants.F_OK);
  console.log("✓ dist-electron/preload.cjs exists");
} catch {
  console.error("✗ dist-electron/preload.cjs NOT found!");
  process.exit(1);
}

console.log("Electron build complete.");

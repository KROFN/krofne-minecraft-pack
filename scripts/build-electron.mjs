import { build } from "esbuild";
import { rm } from "node:fs/promises";

await rm("dist-electron", { recursive: true, force: true });

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
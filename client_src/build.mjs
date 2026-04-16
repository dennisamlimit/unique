/**
 * Compiles TypeScript source files from client_src/ to client_packages/.
 * Uses esbuild from server/node_modules (already installed as a dev dependency).
 */
import { mkdir } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const srcDir = resolve(root, "client_src");
const outDir = resolve(root, "client_packages");
const esbuildBin = resolve(root, "server", "node_modules", "esbuild", "lib", "main.js");

const { build } = await import(pathToFileURL(esbuildBin).href);

const modules = [
  "auth/index",
  "admin/index",
  "chat/index",
  "hud/index",
  "phone/index",
  "faction_map/index",
  "interaction/index",
  "orga/index",
  "usermenu/index",
  "dl/index",
  "fingerpointing/index",
  "admin_utils"
];

for (const mod of modules) {
  const outFile = resolve(outDir, `${mod}.js`);
  await mkdir(resolve(outFile, ".."), { recursive: true });

  await build({
    entryPoints: [resolve(srcDir, `${mod}.ts`)],
    bundle: true,
    platform: "browser",
    format: "iife",
    target: ["chrome80"],
    outfile: outFile,
    sourcemap: false,
    legalComments: "none",
    alias: {
      "@shared": resolve(root, "shared")
    },
    loader: {
      ".json": "json"
    }
  });
}

console.log("[client_src] Build abgeschlossen.");

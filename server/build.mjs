import { build } from "esbuild";
import { mkdir, rm, writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const outDir = resolve(root, "packages", "unique-server");

await rm(outDir, { recursive: true, force: true });
await mkdir(outDir, { recursive: true });

await build({
  entryPoints: [resolve(root, "server", "src", "index.ts")],
  bundle: true,
  platform: "node",
  format: "cjs",
  target: ["node20"],
  outfile: resolve(outDir, "index.js"),
  sourcemap: false,
  legalComments: "none",
  banner: {
    js: "\"use strict\";"
  }
});

await writeFile(resolve(root, "packages", "index.js"), "require(\"./unique-server/index.js\");\n", "utf8");

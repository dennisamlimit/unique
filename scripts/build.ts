import { build } from "esbuild";

const target = process.argv[2];

if (!target || !["server", "client"].includes(target)) {
  console.error("Usage: tsx scripts/build.ts <server|client>");
  process.exit(1);
}

const isServer = target === "server";

await build({
  absWorkingDir: process.cwd(),
  entryPoints: [isServer ? "./src/server/index.ts" : "./src/client/index.ts"],
  outfile: isServer
    ? "./dist/server-files/packages/unique/index.js"
    : "./dist/server-files/client_packages/unique/index.js",
  bundle: true,
  platform: isServer ? "node" : "browser",
  format: isServer ? "cjs" : "iife",
  target: "es2020",
  sourcemap: true,
  external: isServer ? ["pg-native"] : [],
  logLevel: "info"
});

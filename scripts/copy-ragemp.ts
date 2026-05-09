import { cp, mkdir, copyFile, stat, writeFile } from "node:fs/promises";
import path from "node:path";

const distRoot = path.resolve("dist/server-files");
const ragempClientPackages = path.resolve("ragemp/client_packages");

await mkdir(path.join(distRoot, "client_packages"), { recursive: true });
await mkdir(path.join(distRoot, "packages"), { recursive: true });

await copyFile(path.resolve("ragemp/conf.json"), path.join(distRoot, "conf.json"));
if (await pathExists(ragempClientPackages)) {
  await cp(ragempClientPackages, path.join(distRoot, "client_packages"), { recursive: true });
}
await writeFile(path.join(distRoot, "client_packages/index.js"), "require('./unique/index.js');\n", "utf8");
await writeFile(path.join(distRoot, "packages/index.js"), "require('./unique/index.js');\n", "utf8");

console.log("RAGE bootstrap files copied.");

async function pathExists(filePath: string) {
  try {
    await stat(filePath);
    return true;
  } catch {
    return false;
  }
}

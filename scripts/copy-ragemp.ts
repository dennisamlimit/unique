import { mkdir, copyFile, writeFile } from "node:fs/promises";
import path from "node:path";

const distRoot = path.resolve("dist/server-files");

await mkdir(path.join(distRoot, "client_packages"), { recursive: true });
await mkdir(path.join(distRoot, "packages"), { recursive: true });

await copyFile(path.resolve("ragemp/conf.json"), path.join(distRoot, "conf.json"));
await writeFile(path.join(distRoot, "client_packages/index.js"), "require('./unique/index.js');\n", "utf8");
await writeFile(path.join(distRoot, "packages/index.js"), "require('./unique/index.js');\n", "utf8");

console.log("RAGE bootstrap files copied.");

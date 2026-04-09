import { build } from "esbuild";
import { copyFile, mkdir, rm, writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { spawn } from "node:child_process";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const dist = resolve(root, "dist");

const entries = [
  { name: "auth", entry: resolve(root, "src/auth/main.jsx"), title: "Unique Auth" },
  { name: "chat", entry: resolve(root, "src/chat/main.jsx"), title: "Unique Chat" },
  { name: "hud", entry: resolve(root, "src/hud/main.jsx"), title: "Unique HUD" }
];

function run(command, args) {
  return new Promise((resolveRun, rejectRun) => {
    const child = spawn(command, args, { cwd: root, shell: false, stdio: "inherit" });
    child.on("exit", (code) => {
      if (code === 0) {
        resolveRun();
        return;
      }

      rejectRun(new Error(`${command} ${args.join(" ")} exited with code ${code}`));
    });
  });
}

function htmlFor(app) {
  return `<!DOCTYPE html>
<html lang="de">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>${app.title}</title>
  <link rel="stylesheet" href="ui.css" />
</head>
<body>
  <div id="root"></div>
  <script src="${app.name}.js"></script>
</body>
</html>
`;
}

await rm(dist, { recursive: true, force: true });
await mkdir(resolve(dist, "shared"), { recursive: true });

await run(process.execPath, [
  "node_modules/tailwindcss/lib/cli.js",
  "-c",
  "tailwind.config.js",
  "-i",
  "src/styles.css",
  "-o",
  "dist/shared/ui.css",
  "--minify"
]);

for (const app of entries) {
  await mkdir(resolve(dist, app.name), { recursive: true });
  await copyFile(resolve(dist, "shared", "ui.css"), resolve(dist, app.name, "ui.css"));

  await build({
    entryPoints: [app.entry],
    bundle: true,
    minify: true,
    sourcemap: false,
    format: "iife",
    jsx: "automatic",
    target: ["chrome80"],
    outfile: resolve(dist, app.name, `${app.name}.js`),
    loader: {
      ".png": "file",
      ".webp": "file",
      ".woff2": "file"
    },
    define: {
      "process.env.NODE_ENV": '"production"'
    }
  });

  await writeFile(resolve(dist, app.name, `${app.name}.html`), htmlFor(app), "utf8");
}

import { build } from "esbuild";
import { copyFile, mkdir, writeFile, cp, stat } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { spawn } from "node:child_process";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const dist = resolve(root, "..", "..", "client_packages");
const assets = {
  logo: resolve(root, "assets", "Unique_logo.png"),
  font: resolve(root, "assets", "ChaletComprime-CologneSixty.woff2")
};

const entries = [
  { name: "auth", entry: resolve(root, "src/auth/main.jsx"), title: "Unique Auth" },
  { name: "charselect", entry: resolve(root, "src/auth/CharSelectEntry.jsx"), title: "Unique Character Selection" },
  { name: "admin", entry: resolve(root, "src/admin/main.jsx"), title: "Unique Admin" },
  { name: "admin", entry: resolve(root, "src/admin/main.jsx"), title: "Unique Admin" },
  { name: "chat", entry: resolve(root, "src/chat/main.jsx"), title: "Unique Chat" },
  { name: "hud", entry: resolve(root, "src/hud/main.jsx"), title: "Unique HUD" },
  { name: "interaction", entry: resolve(root, "src/interaction/main.jsx"), title: "Unique Interaction" },
  { name: "orga",      entry: resolve(root, "src/orga/main.jsx"),      title: "Unique Organisation" },
  { name: "usermenu", entry: resolve(root, "src/usermenu/main.jsx"), title: "Unique Usermenu" },
  { name: "wardrobe", entry: resolve(root, "src/wardrobe/main.jsx"), title: "Unique Wardrobe" },
  { name: "inventory", entry: resolve(root, "src/inventory/main.jsx"), title: "Unique Inventory" },
  { name: "banking", entry: resolve(root, "src/banking/main.jsx"), title: "Unique Banking" }
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
  <link href="https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800&family=Manrope:wght@400;500;600&display=swap" rel="stylesheet" />
  <link href="https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined:wght,FILL@100..700,0..1&display=swap" rel="stylesheet" />
  <link rel="stylesheet" href="ui.css" />
  <link rel="stylesheet" href="${app.name}.css" />
  <style>html,body{background:transparent!important;margin:0;padding:0}</style>
</head>
<body>
  <div id="root"></div>
  <script src="${app.name}.js"></script>
</body>
</html>
`;
}

await mkdir(resolve(dist, "shared"), { recursive: true });

await run(process.execPath, [
  "node_modules/tailwindcss/lib/cli.js",
  "-c",
  "tailwind.config.js",
  "-i",
  "src/styles.css",
  "-o",
  resolve(dist, "shared", "ui.css"),
  "--minify"
]);

for (const app of entries) {
  await mkdir(resolve(dist, app.name), { recursive: true });
  await copyFile(resolve(dist, "shared", "ui.css"), resolve(dist, app.name, "ui.css"));
  await copyFile(assets.logo, resolve(dist, app.name, "Unique_logo.png"));
  await copyFile(assets.font, resolve(dist, app.name, "ChaletComprime-CologneSixty.woff2"));
  
  // Copy app-specific CSS if it exists
  const appCss = resolve(root, "src", app.name, `${app.name}.css`);
  try {
    await copyFile(appCss, resolve(dist, app.name, `${app.name}.css`));
    console.log(`[BUILD] Copied ${app.name}.css`);
  } catch (e) {
    // Some apps might only use Tailwind (ui.css)
  }

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

  // Copy app-internal assets if they exist
  const appAssets = resolve(root, "src", app.name, "assets");
  try {
    await stat(appAssets);
    await cp(appAssets, resolve(dist, app.name, "assets"), { recursive: true });
    console.log(`[BUILD] Copied assets for ${app.name}`);
  } catch (e) {
    // No app-specific assets folder
  }
}

await copyFile(assets.logo, resolve(dist, "shared", "Unique_logo.png"));

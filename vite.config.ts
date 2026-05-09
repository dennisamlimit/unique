import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";

export default defineConfig({
  root: "src/cef",
  plugins: [react()],
  build: {
    outDir: "../../dist/server-files/client_packages/unique_cef",
    emptyOutDir: true
  }
});

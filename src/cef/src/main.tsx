import React from "react";
import ReactDOM from "react-dom/client";
import { App } from "./App";
import "./styles.css";

try {
  ReactDOM.createRoot(document.getElementById("root")!).render(
    <React.StrictMode>
      <App />
    </React.StrictMode>
  );
} catch (error) {
  const root = document.getElementById("root");
  if (root) {
    root.innerHTML = `<div style="position:fixed;inset:0;display:grid;place-items:center;background:#070a0f;color:white;font-family:Arial,sans-serif;z-index:99999"><div style="max-width:560px;border:1px solid rgba(241,184,75,.5);background:rgba(17,19,24,.94);padding:24px;border-radius:8px"><strong style="color:#f1b84b">CEF Fehler</strong><p>${String(error)}</p></div></div>`;
  }
}

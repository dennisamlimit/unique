import React, { useCallback, useEffect, useMemo, useState } from "react";
import { createRoot } from "react-dom/client";
import { logoSrc } from "../lib/brand.js";
import { trigger } from "../lib/rage.js";

const commands = [
  { level: 1, name: "myadmin", usage: "/myadmin", description: "Eigenes Admin-Level und Modus anzeigen." },
  { level: 1, name: "veh", usage: "/veh [modell] [farbe1] [farbe2] [kennzeichen]", description: "Admin-Fahrzeug spawnen." },
  { level: 1, name: "aheal", usage: "/aheal [spielerId]", description: "Dich oder einen Spieler heilen." },
  { level: 1, name: "revive", usage: "/revive [spielerId]", description: "Dich oder einen Spieler wiederbeleben." },
  { level: 1, name: "apos", usage: "/apos oder /apos x y z rot", description: "Position anzeigen oder setzen." },
  { level: 1, name: "serverspawn", usage: "/serverspawn", description: "Aktuellen Server-Spawn anzeigen." },
  { level: 2, name: "msg", usage: "/msg [nachricht]", description: "Admin-Nachricht an alle senden." },
  { level: 2, name: "findaccountsc", usage: "/findaccountsc [socialClubId]", description: "Account per Social-Club-ID finden." },
  { level: 2, name: "goto", usage: "/goto [spielerId]", description: "Zu einem Spieler teleportieren." },
  { level: 2, name: "gethere", usage: "/gethere [spielerId]", description: "Spieler zu dir teleportieren." },
  { level: 2, name: "gotospawn", usage: "/gotospawn", description: "Zum Server-Spawn teleportieren." },
  { level: 2, name: "dl", usage: "/dl", description: "Fahrzeug-Debug-Label in Unique-Lila ein- oder ausschalten." },
  { level: 2, name: "kick", usage: "/kick [spielerId] [grund]", description: "Spieler vom Server kicken." },
  { level: 2, name: "jail", usage: "/jail [spielerId] [dauer: 30s/10m/1h] [grund]", description: "Spieler ins Admin-Jail in Dimension 1 setzen." },
  { level: 2, name: "unjail", usage: "/unjail [spielerId]", description: "Spieler manuell aus dem Admin-Jail entlassen." },
  { level: 3, name: "setmoney", usage: "/setmoney [spielerId] [betrag]", description: "Bargeld setzen." },
  { level: 3, name: "addmoney", usage: "/addmoney [spielerId] [betrag]", description: "Bargeld aendern." },
  { level: 3, name: "setbank", usage: "/setbank [spielerId] [betrag]", description: "Bankgeld setzen." },
  { level: 3, name: "addbank", usage: "/addbank [spielerId] [betrag]", description: "Bankgeld aendern." },
  { level: 4, name: "ban", usage: "/ban [spielerId] [dauer optional: 30m/2h/7d] [grund]", description: "Account permanent oder temporaer bannen." },
  { level: 4, name: "unban", usage: "/unban [accountId]", description: "Temporaere Bans aufheben. Permanente Bans erst ab Level 7." },
  { level: 10, name: "setadmin", usage: "/setadmin [accountId] [level]", description: "Admin-Level setzen." },
  { level: 10, name: "setserverspawn", usage: "/setserverspawn", description: "Server-Spawn auf deine Position setzen." }
];

function CommandIcon() {
  return (
    <svg viewBox="0 0 48 48" className="h-6 w-6 fill-none stroke-current stroke-[2]">
      <path d="M9 14h30M9 24h21M9 34h14" />
      <path d="M34 28l5 5-5 5" />
    </svg>
  );
}

function ShieldIcon() {
  return (
    <svg viewBox="0 0 48 48" className="h-6 w-6 fill-none stroke-current stroke-[2]">
      <path d="M24 6 38 12v11c0 9-6 16-14 19-8-3-14-10-14-19V12l14-6Z" />
      <path d="m18 24 4 4 8-9" />
    </svg>
  );
}

function CommandRow({ command }) {
  return (
    <article className="grid gap-3 rounded-md border border-violet-200/[0.12] bg-black/[0.26] p-3 transition hover:border-violet-200/[0.28] hover:bg-white/[0.05]">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <span className="grid h-7 w-7 shrink-0 place-items-center rounded bg-fuchsia-500/[0.18] text-fuchsia-100">
              <CommandIcon />
            </span>
            <div className="min-w-0">
              <div className="truncate text-sm font-black uppercase tracking-normal text-white">{command.usage}</div>
              <div className="text-xs font-semibold text-zinc-400">{command.description}</div>
            </div>
          </div>
        </div>
        <span className="rounded bg-violet-400/[0.12] px-2 py-1 text-[10px] font-black uppercase text-violet-100">Lv. {command.level}</span>
      </div>
    </article>
  );
}

function PanelIcon({ type }) {
  const common = "h-5 w-5 fill-none stroke-current stroke-[2]";

  if (type === "players") {
    return (
      <svg viewBox="0 0 48 48" className={common}>
        <circle cx="18" cy="17" r="7" />
        <circle cx="32" cy="18" r="5" />
        <path d="M7 40c2-9 8-13 11-13s10 4 12 13" />
        <path d="M28 38c2-6 6-9 10-9 2 0 5 2 7 7" />
      </svg>
    );
  }

  if (type === "logs") {
    return (
      <svg viewBox="0 0 48 48" className={common}>
        <path d="M14 8h20l5 6v26H14z" />
        <path d="M33 8v7h6M19 22h14M19 29h14M19 36h9" />
      </svg>
    );
  }

  if (type === "commands") {
    return <CommandIcon />;
  }

  return (
    <svg viewBox="0 0 48 48" className={common}>
      <path d="M9 24 24 10l15 14v16H13V24" />
      <path d="M20 40V28h8v12" />
    </svg>
  );
}

function PlayerCard({ player }) {
  return (
    <article className="grid gap-2 rounded-md border border-violet-200/[0.12] bg-black/[0.24] p-3">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="truncate text-sm font-black uppercase text-white">{player.name}</div>
          <div className="text-xs font-semibold text-zinc-500">Spieler-ID {player.playerId} | Account {player.accountId || "-"}</div>
        </div>
        <span className={`rounded px-2 py-1 text-[10px] font-black uppercase ${player.adminLevel > 0 ? "bg-fuchsia-500/[0.18] text-fuchsia-100" : "bg-white/[0.06] text-zinc-400"}`}>
          Lv. {player.adminLevel}
        </span>
      </div>
      <div className="text-[11px] font-bold uppercase text-zinc-500">{player.adminMode ? "Admin-Modus aktiv" : "Normaler Modus"}</div>
    </article>
  );
}

function AdminApp() {
  const [visible, setVisible] = useState(false);
  const [adminLevel, setAdminLevel] = useState(0);
  const [activePanel, setActivePanel] = useState("home");
  const [players, setPlayers] = useState([]);
  const [notice, setNotice] = useState("");

  const allowedCommands = useMemo(() => commands.filter((command) => command.level <= adminLevel), [adminLevel]);
  const grouped = useMemo(() => {
    return allowedCommands.reduce((groups, command) => {
      groups[command.level] = groups[command.level] || [];
      groups[command.level].push(command);
      return groups;
    }, {});
  }, [allowedCommands]);
  const onlineAdmins = useMemo(() => players.filter((player) => player.adminLevel > 0), [players]);

  const close = useCallback(() => {
    setVisible(false);
  }, []);

  const requestClose = useCallback(() => {
    setVisible(false);
    trigger("cef:admin:close");
  }, []);

  const open = useCallback((level, onlinePlayers = []) => {
    setAdminLevel(Number(level) || 0);
    setPlayers(Array.isArray(onlinePlayers) ? onlinePlayers : []);
    setActivePanel("home");
    setNotice("");
    setVisible(true);
  }, []);

  useEffect(() => {
    window.adminApp = {
      open,
      close,
      setNotice: (message) => setNotice(message || "")
    };

    trigger("cef:admin:ready");

    return () => {
      delete window.adminApp;
    };
  }, [close, open]);

  if (!visible) {
    return null;
  }

  const navItems = [
    { id: "home", label: "Home", icon: "home" },
    { id: "players", label: "Spieler", icon: "players" },
    { id: "logs", label: "Logs", icon: "logs" },
    { id: "commands", label: "Befehle", icon: "commands" }
  ];

  return (
    <main className="fixed inset-0 grid bg-black/[0.72] text-white backdrop-blur-md">
      <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(120deg,rgba(4,4,8,0.98),rgba(18,8,30,0.9)_46%,rgba(70,18,100,0.5)_76%,rgba(5,5,8,0.96))]" />
      <div className="pointer-events-none absolute inset-x-[7vw] top-[14vh] h-[62vh] -skew-x-12 border-y border-violet-300/[0.08] bg-violet-400/[0.04]" />

      <section className="relative grid h-screen w-screen grid-rows-[auto_1fr_auto] overflow-hidden border border-violet-200/[0.12] bg-black/[0.32] shadow-[0_20px_90px_rgba(0,0,0,0.72)]">
        <header className="flex items-center justify-between gap-4 border-b border-violet-200/[0.12] px-8 py-6">
          <div className="flex items-center gap-3">
            <img className="h-10 w-10 rounded object-contain" src={logoSrc} alt="Unique Roleplay" />
            <div>
              <div className="font-display text-5xl leading-none">Admin Menu</div>
              <div className="flex items-center gap-2 text-xs font-black uppercase text-fuchsia-200">
                <ShieldIcon />
                Level {adminLevel} aktiv
              </div>
            </div>
          </div>
          <button type="button" onClick={requestClose} className="h-10 rounded-md border border-violet-200/[0.16] bg-white/[0.06] px-4 text-xs font-black uppercase text-zinc-200 hover:bg-white/[0.12]">
            Schliessen
          </button>
        </header>

        <div className="grid min-h-0 grid-cols-[260px_1fr]">
          <aside className="border-r border-violet-200/[0.12] bg-black/[0.24] p-5">
            <nav className="grid gap-2">
              {navItems.map((item) => (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => setActivePanel(item.id)}
                  className={`flex h-12 items-center gap-3 rounded-md border px-3 text-left text-xs font-black uppercase transition ${
                    activePanel === item.id
                      ? "border-fuchsia-200/[0.5] bg-fuchsia-500/[0.2] text-white shadow-[0_0_20px_rgba(217,70,239,0.24)]"
                      : "border-white/[0.06] bg-white/[0.03] text-zinc-400 hover:border-violet-200/[0.28] hover:bg-white/[0.08] hover:text-white"
                  }`}
                >
                  <PanelIcon type={item.icon} />
                  {item.label}
                </button>
              ))}
            </nav>
          </aside>

          <div className="unique-scrollbar min-h-0 overflow-y-auto px-8 py-6">
            {activePanel === "home" && (
              <div className="grid gap-5">
                <section className="grid gap-3 rounded-md border border-violet-200/[0.12] bg-black/[0.24] p-5">
                  <div className="font-display text-5xl leading-none">Willkommen im Admin Center</div>
                  <p className="max-w-[72ch] text-sm font-semibold leading-6 text-zinc-300">
                    Links findest du Spieleruebersicht, Logs und eine Befehlsreferenz. Commands werden weiterhin ueber Chat oder gezielte Panels ausgefuehrt, damit nichts versehentlich losgeht.
                  </p>
                </section>

                <section className="grid gap-3">
                  <div className="flex items-center gap-3">
                    <div className="h-1 w-10 rounded bg-fuchsia-400 shadow-[0_0_18px_rgba(217,70,239,0.7)]" />
                    <h2 className="text-xs font-black uppercase tracking-normal text-violet-100">Admins online</h2>
                  </div>
                  <div className="grid gap-3 lg:grid-cols-3">
                    {onlineAdmins.length > 0 ? onlineAdmins.map((player) => <PlayerCard key={`${player.serverId}-${player.accountId}`} player={player} />) : (
                      <div className="rounded-md border border-violet-200/[0.12] bg-black/[0.24] p-4 text-sm font-semibold text-zinc-400">Aktuell sind keine weiteren Admins online.</div>
                    )}
                  </div>
                </section>
              </div>
            )}

            {activePanel === "players" && (
              <section className="grid gap-3">
                <div className="flex items-center gap-3">
                  <div className="h-1 w-10 rounded bg-fuchsia-400 shadow-[0_0_18px_rgba(217,70,239,0.7)]" />
                  <h2 className="text-xs font-black uppercase tracking-normal text-violet-100">Spieler online</h2>
                </div>
                <div className="grid gap-3 lg:grid-cols-3">
                  {players.map((player) => <PlayerCard key={`${player.serverId}-${player.accountId}`} player={player} />)}
                </div>
              </section>
            )}

            {activePanel === "logs" && (
              <section className="grid place-items-center rounded-md border border-violet-200/[0.12] bg-black/[0.24] p-12 text-center">
                <div className="font-display text-5xl leading-none text-white">Logs</div>
                <p className="mt-3 max-w-[48ch] text-sm font-semibold leading-6 text-zinc-400">
                  Noch keine Admin-Logs vorhanden. Das Panel ist vorbereitet, damit wir spaeter Kick/Ban/Geld/Teleport-Aktionen sauber anzeigen koennen.
                </p>
              </section>
            )}

            {activePanel === "commands" && (
              <div className="grid gap-5">
                {Object.keys(grouped).map((level) => (
                  <section key={level} className="grid gap-3">
                    <div className="flex items-center gap-3">
                      <div className="h-1 w-10 rounded bg-fuchsia-400 shadow-[0_0_18px_rgba(217,70,239,0.7)]" />
                      <h2 className="text-xs font-black uppercase tracking-normal text-violet-100">Admin-Level {level}</h2>
                    </div>
                    <div className="grid gap-3 lg:grid-cols-2">
                      {grouped[level].map((command) => <CommandRow key={command.name} command={command} />)}
                    </div>
                  </section>
                ))}
              </div>
            )}
          </div>
        </div>

        <footer className="border-t border-violet-200/[0.12] px-8 py-4 text-sm font-semibold text-zinc-400">
          {notice || "F3 schliesst das Menue. Du siehst nur Commands bis zu deinem Admin-Level."}
        </footer>
      </section>
    </main>
  );
}

createRoot(document.getElementById("root")).render(<AdminApp />);

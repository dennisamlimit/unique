import React, { useCallback, useEffect, useMemo, useState } from "react";
import { createRoot } from "react-dom/client";
import { logoSrc } from "../lib/brand.js";
import { trigger } from "../lib/rage.js";

// Commands are now fetched dynamically from the server.
const commandsPlaceHolder = [];

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
  const level = command.requiredLevel || command.level || 0;
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
        <span className="rounded bg-violet-400/[0.12] px-2 py-1 text-[10px] font-black uppercase text-violet-100">Lv. {level}</span>
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

  if (type === "commands" || type === "perms") {
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
  const [factions, setFactions] = useState([]);
  const [commands, setCommands] = useState([]);
  const [logs, setLogs] = useState([]);
  const [notice, setNotice] = useState("");
  const [factionForm, setFactionForm] = useState({ type: "state", shortName: "", name: "", colorHex: "#33AA88", mapIconId: "" });
  const [leaderForm, setLeaderForm] = useState({ accountId: "", factionId: "" });
  const [spawnFactionId, setSpawnFactionId] = useState("");
  const [wardrobeForm, setWardrobeForm] = useState({ factionId: "", label: "" });
  const [vehicleForm, setVehicleForm] = useState({ factionId: "", minRankLevel: "1", modelName: "", displayName: "" });
  const [defaultTarget, setDefaultTarget] = useState("all");
  const [localCommandLevels, setLocalCommandLevels] = useState({});

  const allowedCommands = useMemo(() => commands.filter((command) => (command.requiredLevel || command.level || 0) <= adminLevel), [adminLevel, commands]);
  const grouped = useMemo(() => {
    return allowedCommands.reduce((groups, command) => {
      const lvl = command.requiredLevel || command.level || 0;
      groups[lvl] = groups[lvl] || [];
      groups[lvl].push(command);
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
      setNotice: (message) => setNotice(message || ""),
      setCommands: (raw) => {
          try {
              const parsed = JSON.parse(raw || "[]");
              setCommands(parsed);
              // Clear local overrides that match the server state
              setLocalCommandLevels(prev => {
                const next = { ...prev };
                for (const cmd of parsed) {
                    if (next[cmd.commandId] === cmd.requiredLevel) {
                        delete next[cmd.commandId];
                    }
                }
                return next;
              });
          } catch(e) { setCommands([]); }
      },
      setLogs: (raw) => {
          try {
              setLogs(JSON.parse(raw || "[]"));
          } catch(e) { setLogs([]); }
      },
      setFactions: (rawPayload) => {
        try {
          const parsed = JSON.parse(rawPayload || "[]");
          setFactions(Array.isArray(parsed) ? parsed : []);
        } catch (error) {
          setFactions([]);
        }
      }
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
    { id: "factions", label: "Fraktionen", icon: "home" },
    { id: "logs", label: "Logs", icon: "logs" },
    { id: "commands", label: "Befehle", icon: "commands" },
    ...(adminLevel === 10 ? [{ id: "perms", label: "Berechtigungen", icon: "perms" }] : [])
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
              <div className="font-display text-5xl leading-none">Admin Center</div>
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

            {activePanel === "factions" && (
              <section className="grid gap-5">
                <div className="grid gap-5 xl:grid-cols-2">
                  <div className="grid gap-3 rounded-md border border-violet-200/[0.12] bg-black/[0.24] p-5">
                    <h2 className="text-xs font-black uppercase tracking-normal text-violet-100">Fraktion erstellen</h2>
                    <div className="grid gap-3">
                      <input value={factionForm.type} onChange={(e) => setFactionForm((current) => ({ ...current, type: e.target.value }))} className="h-10 rounded-md border border-violet-300/[0.18] bg-black/[0.48] px-3 text-sm font-semibold text-white" placeholder="Typ" />
                      <input value={factionForm.shortName} onChange={(e) => setFactionForm((current) => ({ ...current, shortName: e.target.value }))} className="h-10 rounded-md border border-violet-300/[0.18] bg-black/[0.48] px-3 text-sm font-semibold text-white" placeholder="Kuerzel" />
                      <input value={factionForm.mapIconId} onChange={(e) => setFactionForm((current) => ({ ...current, mapIconId: e.target.value.replace(/[^0-9]/g, "") }))} className="h-10 rounded-md border border-violet-300/[0.18] bg-black/[0.48] px-3 text-sm font-semibold text-white" placeholder="GTA Icon-ID optional" />
                      <input value={factionForm.name} onChange={(e) => setFactionForm((current) => ({ ...current, name: e.target.value }))} className="h-10 rounded-md border border-violet-300/[0.18] bg-black/[0.48] px-3 text-sm font-semibold text-white" placeholder="Name" />
                      <input value={factionForm.colorHex} onChange={(e) => setFactionForm((current) => ({ ...current, colorHex: e.target.value }))} className="h-10 rounded-md border border-violet-300/[0.18] bg-black/[0.48] px-3 text-sm font-semibold text-white" placeholder="#RRGGBB" />
                      <button type="button" onClick={() => trigger("cef:admin:createFaction", factionForm.type, factionForm.shortName, factionForm.name, factionForm.colorHex, factionForm.mapIconId || "0")} className="h-10 rounded-md bg-fuchsia-500 text-xs font-black uppercase text-white">
                        Fraktion erstellen
                      </button>
                    </div>
                  </div>

                  <div className="grid gap-3 rounded-md border border-violet-200/[0.12] bg-black/[0.24] p-5">
                    <h2 className="text-xs font-black uppercase tracking-normal text-violet-100">Leader setzen</h2>
                    <div className="grid gap-3">
                      <input value={leaderForm.accountId} onChange={(e) => setLeaderForm((current) => ({ ...current, accountId: e.target.value }))} className="h-10 rounded-md border border-violet-300/[0.18] bg-black/[0.48] px-3 text-sm font-semibold text-white" placeholder="Account-ID" />
                      <input value={leaderForm.factionId} onChange={(e) => setLeaderForm((current) => ({ ...current, factionId: e.target.value }))} className="h-10 rounded-md border border-violet-300/[0.18] bg-black/[0.48] px-3 text-sm font-semibold text-white" placeholder="Fraktion-ID" />
                      <button type="button" onClick={() => trigger("cef:admin:setFactionLeader", leaderForm.accountId, leaderForm.factionId)} className="h-10 rounded-md bg-fuchsia-500 text-xs font-black uppercase text-white">
                        Leader setzen
                      </button>
                    </div>
                  </div>

                  <div className="grid gap-3 rounded-md border border-violet-200/[0.12] bg-black/[0.24] p-5">
                    <h2 className="text-xs font-black uppercase tracking-normal text-violet-100">Spawn und Kammer</h2>
                    <div className="grid gap-3">
                      <input value={spawnFactionId} onChange={(e) => setSpawnFactionId(e.target.value)} className="h-10 rounded-md border border-violet-300/[0.18] bg-black/[0.48] px-3 text-sm font-semibold text-white" placeholder="Fraktion-ID fuer Spawn" />
                      <button type="button" onClick={() => trigger("cef:admin:setFactionSpawn", spawnFactionId)} className="h-10 rounded-md bg-fuchsia-500 text-xs font-black uppercase text-white">
                        Spawn auf Position setzen
                      </button>
                      <input value={wardrobeForm.factionId} onChange={(e) => setWardrobeForm((current) => ({ ...current, factionId: e.target.value }))} className="h-10 rounded-md border border-violet-300/[0.18] bg-black/[0.48] px-3 text-sm font-semibold text-white" placeholder="Fraktion-ID fuer Kammer" />
                      <input value={wardrobeForm.label} onChange={(e) => setWardrobeForm((current) => ({ ...current, label: e.target.value }))} className="h-10 rounded-md border border-violet-300/[0.18] bg-black/[0.48] px-3 text-sm font-semibold text-white" placeholder="Kammername" />
                      <button type="button" onClick={() => trigger("cef:admin:addFactionWardrobe", wardrobeForm.factionId, wardrobeForm.label)} className="h-10 rounded-md bg-fuchsia-500 text-xs font-black uppercase text-white">
                        Kleidungskammer erstellen
                      </button>
                    </div>
                  </div>

                  <div className="grid gap-3 rounded-md border border-violet-200/[0.12] bg-black/[0.24] p-5">
                    <h2 className="text-xs font-black uppercase tracking-normal text-violet-100">Fraktionsfahrzeug erstellen</h2>
                    <div className="grid gap-3">
                      <input value={vehicleForm.factionId} onChange={(e) => setVehicleForm((current) => ({ ...current, factionId: e.target.value }))} className="h-10 rounded-md border border-violet-300/[0.18] bg-black/[0.48] px-3 text-sm font-semibold text-white" placeholder="Fraktion-ID" />
                      <input value={vehicleForm.minRankLevel} onChange={(e) => setVehicleForm((current) => ({ ...current, minRankLevel: e.target.value }))} className="h-10 rounded-md border border-violet-300/[0.18] bg-black/[0.48] px-3 text-sm font-semibold text-white" placeholder="Mindestrang" />
                      <input value={vehicleForm.modelName} onChange={(e) => setVehicleForm((current) => ({ ...current, modelName: e.target.value }))} className="h-10 rounded-md border border-violet-300/[0.18] bg-black/[0.48] px-3 text-sm font-semibold text-white" placeholder="Fahrzeugmodell" />
                      <input value={vehicleForm.displayName} onChange={(e) => setVehicleForm((current) => ({ ...current, displayName: e.target.value }))} className="h-10 rounded-md border border-violet-300/[0.18] bg-black/[0.48] px-3 text-sm font-semibold text-white" placeholder="Anzeigename" />
                      <button type="button" onClick={() => trigger("cef:admin:createFactionVehicle", vehicleForm.factionId, vehicleForm.minRankLevel, vehicleForm.modelName, vehicleForm.displayName)} className="h-10 rounded-md bg-fuchsia-500 text-xs font-black uppercase text-white">
                        Fahrzeug erstellen
                      </button>
                    </div>
                  </div>
                </div>

                <div className="rounded-md border border-violet-200/[0.12] bg-black/[0.24] p-5">
                  <div className="flex items-center justify-between gap-3">
                    <h2 className="text-xs font-black uppercase tracking-normal text-violet-100">Bestehende Fraktionen</h2>
                    <div className="flex items-center gap-2">
                      <input value={defaultTarget} onChange={(e) => setDefaultTarget(e.target.value)} className="h-9 rounded-md border border-violet-300/[0.18] bg-black/[0.48] px-3 text-xs font-semibold text-white" placeholder="all oder ID" />
                      <button type="button" onClick={() => trigger("cef:admin:syncFactionDefaults", defaultTarget)} className="h-9 rounded-md bg-fuchsia-500 px-3 text-[10px] font-black uppercase text-white">
                        Defaults syncen
                      </button>
                    </div>
                  </div>
                  <div className="mt-4 grid gap-3 lg:grid-cols-2">
                    {factions.map((faction) => (
                      <article key={faction.factionId} className="rounded-md border border-violet-200/[0.1] bg-black/[0.24] p-3">
                        <div className="text-sm font-black uppercase text-white">[{faction.shortName}] {faction.name}</div>
                        <div className="text-xs font-semibold text-zinc-400">ID {faction.factionId} | {faction.type} | {faction.colorHex} | Icon {faction.mapIconId}</div>
                      </article>
                    ))}
                  </div>
                </div>
              </section>
            )}

            {activePanel === "logs" && (
              <section className="grid gap-3">
                <div className="flex items-center gap-3">
                    <div className="h-1 w-10 rounded bg-fuchsia-400 shadow-[0_0_18px_rgba(217,70,239,0.7)]" />
                    <h2 className="text-xs font-black uppercase tracking-normal text-violet-100">Admin Logs (Letzte 50)</h2>
                    <button onClick={() => trigger("cef:admin:requestLogs")} className="ml-auto text-[10px] font-black uppercase text-fuchsia-400 hover:text-fuchsia-300">Aktualisieren</button>
                </div>
                <div className="grid gap-2">
                    {logs.map((log) => (
                        <article key={log.log_id} className="flex items-center justify-between gap-4 rounded-md border border-violet-200/[0.1] bg-black/20 p-3">
                            <div className="min-w-0">
                                <div className="text-[10px] font-black uppercase text-fuchsia-300">{log.action_type} | {new Date(log.created_at).toLocaleString()}</div>
                                <div className="truncate text-xs font-semibold text-white">{log.details}</div>
                            </div>
                            <div className="text-right shrink-0">
                                <div className="text-[10px] font-black uppercase text-zinc-500">Admin</div>
                                <div className="text-xs font-bold text-white">{log.first_name} {log.last_name}</div>
                            </div>
                        </article>
                    ))}
                </div>
              </section>
            )}

            {activePanel === "commands" && (
              <div className="grid gap-5">
                {Object.keys(grouped).sort((a, b) => Number(a) - Number(b)).map((level) => (
                  <section key={level} className="grid gap-3">
                    <div className="flex items-center gap-3">
                      <div className="h-1 w-10 rounded bg-fuchsia-400 shadow-[0_0_18px_rgba(217,70,239,0.7)]" />
                      <h2 className="text-xs font-black uppercase tracking-normal text-violet-100">Admin-Level {level}</h2>
                    </div>
                    <div className="grid gap-3 lg:grid-cols-2">
                      {grouped[level].map((command) => <CommandRow key={command.commandId || command.name} command={command} />)}
                    </div>
                  </section>
                ))}
              </div>
            )}

            {activePanel === "perms" && (
                <section className="grid gap-5">
                    <div className="flex items-center justify-between gap-3">
                        <div className="flex items-center gap-3">
                            <div className="h-1 w-10 rounded bg-fuchsia-400 shadow-[0_0_18px_rgba(217,70,239,0.7)]" />
                            <h2 className="text-xs font-black uppercase tracking-normal text-violet-100">Berechtigungs-Verwaltung</h2>
                        </div>
                        <div className="text-[10px] font-bold text-zinc-500 italic">Andere Admins sehen Änderungen erst nach dem Speichern.</div>
                    </div>
                    <div className="grid gap-1.5">
                        {commands.map((cmd) => {
                            const isChanged = localCommandLevels[cmd.commandId] !== undefined && localCommandLevels[cmd.commandId] !== cmd.requiredLevel;
                            const currentLevel = localCommandLevels[cmd.commandId] ?? cmd.requiredLevel;

                            return (
                                <article key={cmd.commandId} className="flex items-center justify-between gap-4 rounded-md border border-violet-200/[0.1] bg-black/20 p-3 hover:bg-black/40 transition-colors">
                                    <div className="min-w-0 flex-1">
                                        <div className="flex items-center gap-2">
                                            <div className="text-sm font-black uppercase text-white">{cmd.usage}</div>
                                            {isChanged && <span className="rounded-full bg-fuchsia-500 w-1.5 h-1.5 animate-pulse shadow-[0_0_8px_#d946ef]" title="Ungespeicherte Änderung" />}
                                        </div>
                                        <div className="truncate text-xs font-semibold text-zinc-500">{cmd.description}</div>
                                    </div>
                                    <div className="flex items-center gap-4">
                                        <div className="flex items-center gap-2">
                                            <span className="text-[10px] font-black uppercase text-zinc-500">Level</span>
                                            <select 
                                                value={currentLevel} 
                                                onChange={(e) => setLocalCommandLevels(prev => ({ ...prev, [cmd.commandId]: Number(e.target.value) }))}
                                                className={`h-8 w-16 rounded border transition-colors bg-black/40 px-2 text-xs font-bold text-white outline-none ${isChanged ? 'border-fuchsia-500/50 text-fuchsia-100' : 'border-white/10'}`}
                                            >
                                                {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map(l => <option key={l} value={l}>{l}</option>)}
                                            </select>
                                        </div>
                                        <button 
                                            disabled={!isChanged}
                                            onClick={() => trigger("cef:admin:updateCommandLevel", cmd.commandId, currentLevel)}
                                            className={`h-8 rounded px-3 text-[10px] font-black uppercase transition-all ${isChanged ? 'bg-fuchsia-500 text-white shadow-[0_0_12px_rgba(217,70,239,0.3)] hover:scale-105 active:scale-95' : 'bg-white/5 text-zinc-600 grayscale blur-[0.2px]'}`}
                                        >
                                            Speichern
                                        </button>
                                    </div>
                                </article>
                            );
                        })}
                    </div>
                </section>
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

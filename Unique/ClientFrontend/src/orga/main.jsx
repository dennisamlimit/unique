import React, { useEffect, useMemo, useState } from "react";
import { createRoot } from "react-dom/client";
import { trigger } from "../lib/rage.js";

function parsePayload(raw) {
  if (!raw) return null;
  try { return JSON.parse(raw); } catch { return null; }
}

function hasPermission(payload, permission) {
  return Array.isArray(payload?.permissions) && payload.permissions.includes(permission);
}

function prettyPermission(permission) {
  return String(permission || "").replace(/_/g, " ").replace(/\b\w/g, (l) => l.toUpperCase());
}

function colorHexToRgba(hex, alpha = 0.18) {
  const n = String(hex || "").replace("#", "");
  if (!/^[0-9a-fA-F]{6}$/.test(n)) return `rgba(99,102,241,${alpha})`;
  const r = parseInt(n.slice(0, 2), 16);
  const g = parseInt(n.slice(2, 4), 16);
  const b = parseInt(n.slice(4, 6), 16);
  return `rgba(${r},${g},${b},${alpha})`;
}

// ─── Icons ───────────────────────────────────────────────────────────────────

function IconPeople() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-5 w-5">
      <path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2"/>
      <circle cx="9" cy="7" r="4"/>
      <path d="M23 21v-2a4 4 0 00-3-3.87"/>
      <path d="M16 3.13a4 4 0 010 7.75"/>
    </svg>
  );
}

function IconGrades() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-5 w-5">
      <rect x="3" y="3" width="7" height="7" rx="1"/>
      <rect x="14" y="3" width="7" height="7" rx="1"/>
      <rect x="3" y="14" width="7" height="7" rx="1"/>
      <rect x="14" y="14" width="7" height="7" rx="1"/>
    </svg>
  );
}

function IconClothing() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-5 w-5">
      <path d="M20.38 3.46L16 2a4 4 0 01-8 0L3.62 3.46a2 2 0 00-1.34 2.23l.58 3.57a1 1 0 00.99.84H6v10c0 1.1.9 2 2 2h8a2 2 0 002-2V10h2.15a1 1 0 00.99-.84l.58-3.57a2 2 0 00-1.34-2.23z"/>
    </svg>
  );
}

function IconCar() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-5 w-5">
      <path d="M19 17h2c.6 0 1-.4 1-1v-2c0-.6-.4-1-1-1h-2.2l-2.7-5.4C15.7 6.1 14.2 5 12.5 5H6c-1.1 0-2 .9-2 2v6H3c-.6 0-1 .4-1 1v2c0 .6.4 1 1 1h2"/>
      <circle cx="7" cy="17" r="2"/>
      <path d="M9 17h6"/>
      <circle cx="17" cy="17" r="2"/>
    </svg>
  );
}

function IconShop() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-5 w-5">
      <circle cx="9" cy="21" r="1"/>
      <circle cx="20" cy="21" r="1"/>
      <path d="M1 1h4l2.68 13.39a2 2 0 002 1.61h9.72a2 2 0 002-1.61L23 6H6"/>
    </svg>
  );
}

function IconInfo() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-5 w-5">
      <circle cx="12" cy="12" r="10"/>
      <line x1="12" y1="16" x2="12" y2="12"/>
      <line x1="12" y1="8" x2="12.01" y2="8"/>
    </svg>
  );
}

// ─── Shared styles ────────────────────────────────────────────────────────────

const inputCls = "h-10 w-full rounded border border-white/[0.1] bg-white/[0.04] px-3 text-sm font-semibold text-white placeholder-zinc-600 focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500/50 focus:border-indigo-400/40 transition-colors";
const labelCls = "block text-[10px] font-black uppercase tracking-wide text-zinc-500 mb-1";
const btnPrimary = "h-9 cursor-pointer rounded bg-indigo-600 px-4 text-[11px] font-black uppercase text-white transition-colors hover:bg-indigo-500 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500/50";
const btnSecondary = "h-9 cursor-pointer rounded border border-white/[0.1] bg-white/[0.04] px-4 text-[11px] font-black uppercase text-zinc-300 transition-colors hover:bg-white/[0.1] hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/20";
const btnDanger = "h-9 cursor-pointer rounded bg-rose-600 px-4 text-[11px] font-black uppercase text-white transition-colors hover:bg-rose-500 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-rose-500/50";

function FieldGroup({ label, children }) {
  return (
    <div>
      <div className={labelCls}>{label}</div>
      {children}
    </div>
  );
}

// ─── ConfirmDialog ────────────────────────────────────────────────────────────

function ConfirmDialog({ dialog, onCancel, onConfirm }) {
  if (!dialog) return null;
  return (
    <div className="absolute inset-0 z-50 grid place-items-center bg-black/60 backdrop-blur-sm rounded-lg">
      <div className="w-[min(480px,calc(100%-32px))] rounded-lg border border-white/[0.1] bg-[#181a2e] p-5 shadow-2xl">
        <div className="text-sm font-black uppercase text-white">{dialog.title}</div>
        <div className="mt-2 text-sm text-zinc-400 leading-relaxed">{dialog.message}</div>
        <div className="mt-4 flex justify-end gap-2">
          <button type="button" onClick={onCancel} className={btnSecondary}>Abbrechen</button>
          <button
            type="button"
            onClick={onConfirm}
            className={dialog.variant === "danger" ? btnDanger : btnPrimary}
          >
            Bestaetigen
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── SidebarNav ───────────────────────────────────────────────────────────────

function SideNavItem({ icon, label, description, active, onClick }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`group w-full cursor-pointer rounded-md p-3 text-left transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500/40 ${
        active
          ? "bg-white/[0.08]"
          : "hover:bg-white/[0.04]"
      }`}
    >
      <div className="flex items-start gap-3">
        <div className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-md transition-colors ${
          active ? "bg-indigo-600 text-white" : "bg-white/[0.06] text-zinc-400 group-hover:bg-indigo-600/60 group-hover:text-white"
        }`}>
          {icon}
        </div>
        <div className="min-w-0 pt-0.5">
          <div className={`text-[12px] font-black uppercase leading-tight ${active ? "text-white" : "text-zinc-300 group-hover:text-white"}`}>
            {label}
          </div>
          <div className="mt-0.5 text-[10px] leading-snug text-zinc-600 line-clamp-2">{description}</div>
        </div>
      </div>
    </button>
  );
}

// ─── OutfitPreview ────────────────────────────────────────────────────────────

function OutfitPreview({ clothing }) {
  const slots = [
    { label: "Top",   value: clothing?.[0] },
    { label: "Under", value: clothing?.[1] },
    { label: "Pants", value: clothing?.[2] },
    { label: "Shoes", value: clothing?.[3] }
  ];
  return (
    <div className="grid grid-cols-2 gap-2">
      {slots.map((slot) => (
        <div key={slot.label} className="rounded border border-white/[0.08] bg-white/[0.03] px-3 py-2">
          <div className="text-[10px] font-black uppercase text-zinc-500">{slot.label}</div>
          <div className="mt-0.5 text-xs font-semibold text-zinc-200">
            {Array.isArray(slot.value) ? `${slot.value[0]} / ${slot.value[1]}` : "—"}
          </div>
        </div>
      ))}
    </div>
  );
}

// ─── Tab content ──────────────────────────────────────────────────────────────

function MembersTab({ payload, canManageRanks, accent, queueConfirm }) {
  const [memberSearch, setMemberSearch] = useState("");
  const filteredMembers = useMemo(() => {
    const query = memberSearch.trim().toLowerCase();
    const members = Array.isArray(payload?.members) ? payload.members : [];
    if (!query) return members;
    return members.filter((m) =>
      String(m.playerName || "").toLowerCase().includes(query) ||
      String(m.accountId || "").includes(query) ||
      String(m.rankName || "").toLowerCase().includes(query)
    );
  }, [memberSearch, payload]);

  const onlineCount = (payload?.members || []).filter((m) => m.online).length;
  const totalCount = payload?.members?.length || 0;

  return (
    <div className="flex flex-col gap-4 h-full">
      {/* Stats header */}
      <div className="grid grid-cols-2 gap-3">
        <div className="flex items-center gap-3 rounded border border-white/[0.08] bg-white/[0.03] px-4 py-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded bg-indigo-600/20">
            <svg className="h-6 w-6 text-indigo-400" fill="currentColor" viewBox="0 0 24 24">
              <path d="M16 11c1.66 0 2.99-1.34 2.99-3S17.66 5 16 5c-1.66 0-3 1.34-3 3s1.34 3 3 3zm-8 0c1.66 0 2.99-1.34 2.99-3S9.66 5 8 5C6.34 5 5 6.34 5 8s1.34 3 3 3zm0 2c-2.33 0-7 1.17-7 3.5V19h14v-2.5c0-2.33-4.67-3.5-7-3.5zm8 0c-.29 0-.62.02-.97.05 1.16.84 1.97 1.97 1.97 3.45V19h6v-2.5c0-2.33-4.67-3.5-7-3.5z"/>
            </svg>
          </div>
          <div>
            <div className="text-[10px] font-black uppercase text-zinc-500">Mitglieder</div>
            <div className="text-xl font-black text-white leading-none">{onlineCount}<span className="text-sm text-zinc-500">/{totalCount}</span></div>
          </div>
        </div>
        <div className="flex items-center justify-between rounded border border-white/[0.08] bg-white/[0.03] px-4 py-3">
          <div>
            <div className="text-[10px] font-black uppercase text-zinc-500">Bewerbungen</div>
            <div className="text-lg font-black text-white">Resumes</div>
          </div>
          <button type="button" className={btnPrimary}>View Resumes</button>
        </div>
      </div>

      {/* Search + Table */}
      <div className="flex-1 min-h-0 rounded border border-white/[0.08] bg-white/[0.02] overflow-hidden flex flex-col">
        <div className="flex items-center justify-between px-4 py-3 border-b border-white/[0.06]">
          <div className="text-[11px] font-black uppercase text-zinc-500">Liste der Mitglieder</div>
          <div>
            <label htmlFor="member-search" className="sr-only">Mitglieder suchen</label>
            <input
              id="member-search"
              value={memberSearch}
              onChange={(e) => setMemberSearch(e.target.value)}
              className="h-8 w-52 rounded border border-white/[0.1] bg-white/[0.04] px-3 text-xs font-semibold text-white placeholder-zinc-600 focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500/40 transition-colors"
              placeholder="Name, Rang, ID..."
            />
          </div>
        </div>
        {/* Table header */}
        <div className="grid grid-cols-[1fr_160px_120px] gap-2 px-4 py-2 border-b border-white/[0.06]">
          <div className="text-[10px] font-black uppercase text-zinc-500">Mitglied</div>
          <div className="text-[10px] font-black uppercase text-zinc-500">Rang</div>
          <div className="text-[10px] font-black uppercase text-zinc-500">Option</div>
        </div>
        {/* Rows */}
        <div className="flex-1 overflow-y-auto">
          {filteredMembers.map((member) => (
            <div
              key={member.accountId}
              className="grid grid-cols-[1fr_160px_120px] gap-2 items-center px-4 py-2.5 border-b border-white/[0.04] hover:bg-white/[0.03] transition-colors"
            >
              <div className="flex items-center gap-2 min-w-0">
                <span className={`h-2.5 w-2.5 shrink-0 rounded-full ${member.online ? "bg-green-400" : "bg-red-500"}`} />
                <div className="min-w-0">
                  <div className="text-sm font-bold text-white truncate">{member.playerName}</div>
                  {member.online && (
                    <div className="text-[10px] text-zinc-500">ID {member.serverId}</div>
                  )}
                </div>
              </div>
              <div className="text-sm text-zinc-300 truncate">{member.rankName}</div>
              <div>
                {canManageRanks ? (
                  <div className="flex flex-wrap gap-1">
                    {payload.ranks?.slice(0, 4).map((rank) => (
                      <button
                        key={`${member.accountId}-${rank.rankLevel}`}
                        type="button"
                        title={`${rank.rankName} (Rang ${rank.rankLevel})`}
                        onClick={() => queueConfirm(
                          "Rang aendern",
                          `${member.playerName} auf Rang ${rank.rankLevel} (${rank.rankName}) setzen?`,
                          () => trigger("cef:orga:setRank", member.accountId, rank.rankLevel)
                        )}
                        className={`cursor-pointer rounded px-2 py-1 text-[10px] font-black uppercase transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500/40 ${
                          member.rankLevel === rank.rankLevel
                            ? "bg-indigo-600 text-white"
                            : "bg-white/[0.06] text-zinc-300 hover:bg-indigo-600/60 hover:text-white"
                        }`}
                      >
                        {rank.rankLevel}
                      </button>
                    ))}
                  </div>
                ) : (
                  <button
                    type="button"
                    className="cursor-pointer rounded bg-indigo-600 px-3 py-1 text-[10px] font-black uppercase text-white transition-colors hover:bg-indigo-500"
                  >
                    Manage
                  </button>
                )}
              </div>
            </div>
          ))}
          {filteredMembers.length === 0 && (
            <div className="flex items-center justify-center h-20 text-sm text-zinc-600">
              Keine Mitglieder gefunden.
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function RanksTab({ payload, canEditRankMeta, canManageRanks, accent, queueConfirm }) {
  const [selectedRankLevel, setSelectedRankLevel] = useState(
    () => Number(payload?.ranks?.[0]?.rankLevel || 1)
  );
  const [rankNameDraft, setRankNameDraft] = useState(
    () => String(payload?.ranks?.[0]?.rankName || "")
  );

  const selectedRank = useMemo(() => {
    const ranks = Array.isArray(payload?.ranks) ? payload.ranks : [];
    return ranks.find((r) => Number(r.rankLevel) === Number(selectedRankLevel)) || ranks[0] || null;
  }, [payload, selectedRankLevel]);

  const selectedRankPermissions = useMemo(() => {
    const map = payload?.rankPermissions || {};
    const keys = map?.[String(selectedRankLevel)] ?? map?.[selectedRankLevel] ?? [];
    return Array.isArray(keys) ? keys : [];
  }, [payload, selectedRankLevel]);

  useEffect(() => {
    if (selectedRank) setRankNameDraft(String(selectedRank.rankName || `Rang ${selectedRank.rankLevel}`));
  }, [selectedRank]);

  return (
    <div className="grid gap-4 xl:grid-cols-[260px_1fr] h-full">
      {/* Rank list */}
      <div className="rounded border border-white/[0.08] bg-white/[0.02] p-3 overflow-y-auto">
        <div className="text-[10px] font-black uppercase text-zinc-500 mb-2 px-1">Rangliste</div>
        <div className="grid gap-1">
          {payload.ranks?.map((rank) => (
            <button
              key={rank.rankLevel}
              type="button"
              onClick={() => setSelectedRankLevel(rank.rankLevel)}
              className={`cursor-pointer rounded px-3 py-2.5 text-left transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500/40 ${
                selectedRankLevel === rank.rankLevel
                  ? "bg-indigo-600/80 text-white"
                  : "text-zinc-300 hover:bg-white/[0.06] hover:text-white"
              }`}
            >
              <div className="text-[10px] font-bold uppercase text-current opacity-70">Rang {rank.rankLevel}</div>
              <div className="text-sm font-black uppercase">{rank.rankName}</div>
            </button>
          ))}
        </div>
      </div>

      {/* Rank editor */}
      <div className="rounded border border-white/[0.08] bg-white/[0.02] p-4 overflow-y-auto">
        <div className="text-[10px] font-black uppercase text-zinc-500 mb-4">
          Rang {selectedRank?.rankLevel || "—"} bearbeiten
        </div>
        {selectedRank ? (
          <div className="grid gap-4">
            <FieldGroup label="Rangname">
              <div className="flex gap-2">
                <input
                  value={rankNameDraft}
                  onChange={(e) => setRankNameDraft(e.target.value)}
                  disabled={!canEditRankMeta}
                  className={`${inputCls} disabled:cursor-not-allowed disabled:opacity-50`}
                  placeholder="Rangname eingeben"
                />
                {canEditRankMeta && (
                  <button
                    type="button"
                    onClick={() => queueConfirm(
                      "Rangname speichern",
                      `Rang ${selectedRank.rankLevel} in "${rankNameDraft.trim() || selectedRank.rankName}" umbenennen?`,
                      () => trigger("cef:orga:setRankName", selectedRank.rankLevel, rankNameDraft)
                    )}
                    className={btnPrimary}
                  >
                    Speichern
                  </button>
                )}
              </div>
            </FieldGroup>
            <div>
              <div className={labelCls}>Rechte fuer Rang {selectedRank.rankLevel}</div>
              <div className="flex flex-wrap gap-2 mt-1">
                {(payload.availablePermissions || []).map((permKey) => {
                  const enabled = selectedRankPermissions.includes(permKey);
                  return (
                    <button
                      key={`${selectedRank.rankLevel}-${permKey}`}
                      type="button"
                      disabled={!canEditRankMeta}
                      onClick={() => queueConfirm(
                        "Rangrecht aendern",
                        `${prettyPermission(permKey)} fuer Rang ${selectedRank.rankLevel} ${enabled ? "entfernen" : "aktivieren"}?`,
                        () => trigger("cef:orga:setRankPermission", selectedRank.rankLevel, permKey, !enabled)
                      )}
                      className={`cursor-pointer rounded px-3 py-1.5 text-[10px] font-black uppercase transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500/40 disabled:cursor-not-allowed disabled:opacity-50 ${
                        enabled
                          ? "bg-indigo-600 text-white hover:bg-indigo-500"
                          : "bg-white/[0.06] text-zinc-300 hover:bg-white/[0.12]"
                      }`}
                    >
                      {prettyPermission(permKey)}
                    </button>
                  );
                })}
              </div>
            </div>
          </div>
        ) : (
          <div className="text-sm text-zinc-500">Keine Rangdaten vorhanden.</div>
        )}
      </div>
    </div>
  );
}

function VehiclesTab({ payload, canManageVehicles, accent, queueConfirm }) {
  return (
    <div className="flex flex-col gap-4 h-full overflow-hidden">
      <div className="flex items-center justify-between rounded border border-white/[0.08] bg-white/[0.03] px-5 py-4 shrink-0">
        <div>
          <div className="text-[10px] font-black uppercase text-zinc-500">Organisation Fuhrpark</div>
          <div className="text-xl font-black text-white">{payload.vehicles?.length || 0} Fahrzeuge</div>
        </div>
        <div className="text-right">
          <div className="text-[10px] font-black uppercase text-zinc-500">Saldo</div>
          <div className="text-xl font-black text-emerald-400">${(payload.balance || 0).toLocaleString()}</div>
        </div>
      </div>

      <div className="flex-1 min-h-0 overflow-y-auto">
        <div className="grid gap-4 md:grid-cols-2">
          {payload.vehicles?.length > 0 ? (
            payload.vehicles.map((vehicle) => (
              <div key={vehicle.factionVehicleId} className="relative flex flex-col rounded-lg border border-white/[0.08] bg-white/[0.02] overflow-hidden group">
                <div className="p-4 flex-1">
                  <div className="flex items-start justify-between gap-3 mb-2">
                    <div className="min-w-0">
                      <div className="text-[10px] font-black uppercase text-zinc-500 mb-0.5 line-clamp-1">{vehicle.modelName}</div>
                      <div className="text-base font-black uppercase text-white leading-tight">{vehicle.displayName}</div>
                      <div className="mt-1 text-[11px] font-bold text-zinc-400 tracking-wider bg-white/[0.04] inline-block px-1.5 py-0.5 rounded">
                        {vehicle.numberPlate}
                      </div>
                    </div>
                    <div className="flex flex-col items-end gap-1">
                      <span className="rounded bg-indigo-600/30 px-2 py-0.5 text-[9px] font-black uppercase text-indigo-300">
                        Rang {vehicle.minRankLevel}+
                      </span>
                      <span className={`rounded px-2 py-0.5 text-[9px] font-black uppercase ${vehicle.isSpawned ? "bg-emerald-500/20 text-emerald-400" : "bg-zinc-700/40 text-zinc-500"}`}>
                        {vehicle.isSpawned ? "Ausgeparkt" : "Geparkt"}
                      </span>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-2 mt-4">
                    <button
                      type="button"
                      disabled={vehicle.isSpawned}
                      onClick={() => trigger("server:orga:spawnVehicle", vehicle.factionVehicleId)}
                      className={`${btnPrimary} flex-1 text-[10px] disabled:opacity-30 disabled:cursor-not-allowed`}
                    >
                      Ausparken
                    </button>
                    <button
                      type="button"
                      disabled={!vehicle.isSpawned}
                      onClick={() => trigger("server:orga:parkVehicle", vehicle.factionVehicleId)}
                      className={`${btnSecondary} flex-1 text-[10px] disabled:opacity-30 disabled:cursor-not-allowed`}
                    >
                      Einparken
                    </button>
                  </div>
                </div>

                {canManageVehicles && (
                  <div className="border-t border-white/[0.06] bg-white/[0.01] px-4 py-2 flex items-center justify-between">
                    <div className="flex gap-1">
                      <button
                        type="button"
                        onClick={() => trigger("server:orga:setVehicleRank", vehicle.factionVehicleId, Math.max(1, vehicle.minRankLevel - 1))}
                        className="h-7 w-7 flex items-center justify-center rounded border border-white/[0.1] hover:bg-white/[0.1] text-xs font-bold"
                      >
                        −
                      </button>
                      <button
                        type="button"
                        onClick={() => trigger("server:orga:setVehicleRank", vehicle.factionVehicleId, Math.min(20, vehicle.minRankLevel + 1))}
                        className="h-7 w-7 flex items-center justify-center rounded border border-white/[0.1] hover:bg-white/[0.1] text-xs font-bold"
                      >
                        +
                      </button>
                    </div>
                    <button
                      type="button"
                      onClick={() => queueConfirm("Fahrzeug loeschen", `${vehicle.displayName} wirklich dauerhaft aus dem Bestand loeschen?`, () => trigger("server:orga:deleteVehicle", vehicle.factionVehicleId), "danger")}
                      className="text-[10px] font-black uppercase text-rose-500/70 hover:text-rose-400 transition-colors"
                    >
                      Entfernen
                    </button>
                  </div>
                )}
              </div>
            ))
          ) : (
            <div className="col-span-full py-20 flex flex-col items-center justify-center text-zinc-600 rounded-lg border-2 border-dashed border-white/[0.04]">
              <IconCar />
              <div className="mt-2 text-sm font-semibold">Keine Fahrzeuge im Fuhrpark</div>
              <div className="text-xs">Besuche den Markt um neue Autos zu erwerben.</div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function MarketTab({ payload, catalog, canManageVehicles, accent, queueConfirm }) {
  return (
    <div className="flex flex-col gap-4 h-full overflow-hidden">
      <div className="flex items-center justify-between rounded border border-white/[0.08] bg-white/[0.03] px-5 py-4 shrink-0">
        <div>
          <div className="text-[10px] font-black uppercase text-zinc-500">Fahrzeug Markt</div>
          <div className="text-xl font-black text-white">Verfuegbare Modelle</div>
        </div>
        <div className="text-right">
          <div className="text-[10px] font-black uppercase text-zinc-500">Budget</div>
          <div className="text-xl font-black text-emerald-400">${(payload.balance || 0).toLocaleString()}</div>
        </div>
      </div>

      <div className="flex-1 min-h-0 overflow-y-auto">
        <div className="grid gap-4 md:grid-cols-2 2xl:grid-cols-3">
          {Array.isArray(catalog) && catalog.length > 0 ? (
            catalog.map((item) => (
              <div key={item.catalogId} className="relative flex flex-col rounded-lg border border-white/[0.08] bg-[#1c1e34]/50 overflow-hidden group hover:border-indigo-500/30 transition-all">
                <div className="h-32 bg-zinc-900 border-b border-white/[0.04] relative flex items-center justify-center overflow-hidden">
                  {item.imageUrl ? (
                    <img src={item.imageUrl} alt={item.displayName} className="w-full h-full object-contain" />
                  ) : (
                    <div className="flex flex-col items-center justify-center text-zinc-700">
                      <IconCar />
                      <div className="mt-1 text-[8px] font-black uppercase tracking-widest opacity-30">No Preview</div>
                    </div>
                  )}
                </div>
                <div className="p-4 flex-1 flex flex-col">
                  <div className="flex-1">
                    <div className="text-[10px] font-black uppercase text-zinc-500 mb-0.5">{item.modelName}</div>
                    <div className="text-base font-black uppercase text-white leading-tight">{item.displayName}</div>
                    <div className="mt-3 text-lg font-black text-emerald-400">${item.price.toLocaleString()}</div>
                  </div>

                  <button
                    type="button"
                    disabled={!canManageVehicles || payload.balance < item.price}
                    onClick={() => queueConfirm("Fahrzeug kaufen", `${item.displayName} fuer $${item.price.toLocaleString()} aus dem Orga-Budget kaufen?`, () => trigger("server:orga:buyVehicle", item.catalogId))}
                    className={`mt-4 w-full h-10 rounded text-[11px] font-black uppercase tracking-wider transition-all shadow-lg ${
                      canManageVehicles && payload.balance >= item.price
                        ? "bg-emerald-600 text-white hover:bg-emerald-500 active:scale-95"
                        : "bg-white/[0.04] text-zinc-500 cursor-not-allowed"
                    }`}
                  >
                    {payload.balance < item.price ? "Zu teuer" : "Kaufen"}
                  </button>
                </div>
              </div>
            ))
          ) : (
            <div className="col-span-full py-20 flex flex-col items-center justify-center text-zinc-600">
              <IconShop />
              <div className="mt-2 text-sm font-semibold text-zinc-500">Der Markt ist aktuell leer.</div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

const outfitSlots = [
  { label: "Top",   dKey: "topD",   tKey: "topT"   },
  { label: "Under", dKey: "underD", tKey: "underT" },
  { label: "Pants", dKey: "pantsD", tKey: "pantsT" },
  { label: "Shoes", dKey: "shoesD", tKey: "shoesT" },
];

function OutfitsTab({ payload, canManageOutfits, accent, queueConfirm }) {
  const [outfitForm, setOutfitForm] = useState({
    category: "dienst", name: "",
    topD: "15", topT: "0",
    underD: "15", underT: "0",
    pantsD: "4", pantsT: "0",
    shoesD: "1", shoesT: "0"
  });

  return (
    <div className="grid gap-4 xl:grid-cols-[320px_1fr] h-full">
      <div className="rounded border border-white/[0.08] bg-white/[0.02] p-4 overflow-y-auto">
        <div className="text-[10px] font-black uppercase text-zinc-500 mb-3">Neues Outfit</div>
        {canManageOutfits ? (
          <div className="grid gap-3">
            <FieldGroup label="Kategorie">
              <input value={outfitForm.category} onChange={(e) => setOutfitForm((c) => ({ ...c, category: e.target.value }))} className={inputCls} placeholder="z.B. dienst"/>
            </FieldGroup>
            <FieldGroup label="Outfitname">
              <input value={outfitForm.name} onChange={(e) => setOutfitForm((c) => ({ ...c, name: e.target.value }))} className={inputCls} placeholder="Name des Outfits"/>
            </FieldGroup>
            {outfitSlots.map(({ label, dKey, tKey }) => (
              <div key={label} className="rounded border border-white/[0.06] bg-white/[0.02] p-3">
                <div className="mb-2 text-[10px] font-black uppercase tracking-wide text-indigo-300/70">{label}</div>
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <div className={labelCls}>Drawable</div>
                    <input value={outfitForm[dKey]} onChange={(e) => setOutfitForm((c) => ({ ...c, [dKey]: e.target.value }))} className={inputCls} placeholder="0"/>
                  </div>
                  <div>
                    <div className={labelCls}>Texture</div>
                    <input value={outfitForm[tKey]} onChange={(e) => setOutfitForm((c) => ({ ...c, [tKey]: e.target.value }))} className={inputCls} placeholder="0"/>
                  </div>
                </div>
              </div>
            ))}
            <div className="rounded border border-white/[0.06] bg-white/[0.02] p-3">
              <div className={`${labelCls} mb-2`}>Vorschau</div>
              <OutfitPreview clothing={[
                [Number(outfitForm.topD), Number(outfitForm.topT)],
                [Number(outfitForm.underD), Number(outfitForm.underT)],
                [Number(outfitForm.pantsD), Number(outfitForm.pantsT)],
                [Number(outfitForm.shoesD), Number(outfitForm.shoesT)]
              ]} />
            </div>
            <button
              type="button"
              onClick={() => trigger("cef:orga:createOutfit", outfitForm.category, outfitForm.name, JSON.stringify([
                [Number(outfitForm.topD), Number(outfitForm.topT)],
                [Number(outfitForm.underD), Number(outfitForm.underT)],
                [Number(outfitForm.pantsD), Number(outfitForm.pantsT)],
                [Number(outfitForm.shoesD), Number(outfitForm.shoesT)]
              ]))}
              className={btnPrimary + " w-full"}
            >
              Outfit erstellen
            </button>
          </div>
        ) : (
          <div className="text-sm text-zinc-500">Dir fehlen die Outfit-Verwaltungsrechte.</div>
        )}
      </div>

      <div className="rounded border border-white/[0.08] bg-white/[0.02] p-4 overflow-y-auto">
        <div className="text-[10px] font-black uppercase text-zinc-500 mb-3">Bestehende Outfits</div>
        <div className="grid gap-3">
          {payload.outfits?.length > 0 ? payload.outfits.map((outfit) => (
            <div key={outfit.outfitId} className="rounded border border-white/[0.08] bg-white/[0.03] p-3">
              <div className="flex items-start justify-between gap-2">
                <div>
                  <div className="text-sm font-black uppercase text-white">{outfit.name}</div>
                  <div className="text-xs text-zinc-400">{outfit.category}</div>
                </div>
                <span className="rounded bg-indigo-600/20 px-2 py-0.5 text-[10px] font-black uppercase text-indigo-300">{outfit.category}</span>
              </div>
              <div className="mt-2"><OutfitPreview clothing={outfit.clothing} /></div>
              {canManageOutfits && (
                <button
                  type="button"
                  onClick={() => queueConfirm("Outfit loeschen", `${outfit.name} wirklich loeschen?`, () => trigger("cef:orga:deleteOutfit", outfit.outfitId), "danger")}
                  className="mt-2 cursor-pointer rounded bg-rose-600/80 px-3 py-1.5 text-[10px] font-black uppercase text-white transition-colors hover:bg-rose-500 focus-visible:outline-none"
                >
                  Outfit loeschen
                </button>
              )}
            </div>
          )) : (
            <div className="text-sm text-zinc-500">Keine Outfits vorhanden.</div>
          )}
        </div>
      </div>
    </div>
  );
}

function InfoTab({ payload, accent }) {
  return (
    <div className="grid gap-4 xl:grid-cols-2 h-full">
      <div className="rounded border border-white/[0.08] bg-white/[0.02] p-4">
        <div className="text-[10px] font-black uppercase text-zinc-500 mb-3">Organisation</div>
        <div className="grid gap-2 text-sm text-zinc-300">
          <div className="rounded border border-white/[0.06] bg-white/[0.03] px-3 py-2">
            <div className={labelCls}>Grunddaten</div>
            <div>ID {payload.faction?.factionId || "—"} | Typ {payload.faction?.factionType || "—"}</div>
            <div>Short: {payload.faction?.factionShortName || "—"}</div>
          </div>
          <div className="rounded border border-white/[0.06] bg-white/[0.03] px-3 py-2">
            <div className={labelCls}>Infrastruktur</div>
            <div>Kleidungskammern: {payload.wardrobePoints?.length || 0}</div>
            <div>Fahrzeuge: {payload.vehicles?.length || 0}</div>
            <div>Outfits: {payload.outfits?.length || 0}</div>
          </div>
        </div>
      </div>
      <div className="rounded border border-white/[0.08] bg-white/[0.02] p-4">
        <div className="text-[10px] font-black uppercase text-zinc-500 mb-3">Deine Rechte</div>
        <div className="flex flex-wrap gap-2">
          {(payload.permissions || []).map((perm) => (
            <span key={perm} className="rounded bg-indigo-600/20 px-2 py-1 text-[10px] font-black uppercase text-indigo-300">
              {perm}
            </span>
          ))}
          {(payload.permissions || []).length === 0 && (
            <div className="text-sm text-zinc-500">Keine Rechte gesetzt.</div>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── Main App ─────────────────────────────────────────────────────────────────

function OrgaApp() {
  const [visible, setVisible] = useState(false);
  const [payload, setPayload] = useState(null);
  const [catalog, setCatalog] = useState([]);
  const [activeTab, setActiveTab] = useState("members");
  const [confirmDialog, setConfirmDialog] = useState(null);

  useEffect(() => {
    window.orgaApp = {
      open: (rawPayload) => {
        const p = parsePayload(rawPayload);
        setPayload(p);
        setConfirmDialog(null);
        setActiveTab("members");
        setVisible(true);
        trigger("server:orga:getCatalog");
      },
      setCatalog: (raw) => setCatalog(parsePayload(raw)),
      updateVehicles: (rawVehicles, newBalance) => {
        const vehicles = parsePayload(rawVehicles);
        setPayload((prev) => ({ ...prev, vehicles, balance: newBalance }));
      },
      updateVehiclesOnly: (rawVehicles) => {
        const vehicles = parsePayload(rawVehicles);
        setPayload((prev) => ({ ...prev, vehicles }));
      },
      close: () => setVisible(false)
    };
    trigger("cef:orga:ready");
    return () => { delete window.orgaApp; };
  }, []);

  const canManageRanks = useMemo(() => hasPermission(payload, "manage_members") || hasPermission(payload, "manage_ranks"), [payload]);
  const canEditRankMeta = useMemo(() => hasPermission(payload, "manage_ranks"), [payload]);
  const canManageVehicles = useMemo(() => hasPermission(payload, "manage_vehicles"), [payload]);
  const canManageOutfits = useMemo(() => hasPermission(payload, "manage_storage") || hasPermission(payload, "manage_ranks"), [payload]);
  const accent = payload?.faction?.factionColorHex || "#6366f1";

  function queueConfirm(title, message, action, variant = "success") {
    setConfirmDialog({ title, message, action, variant });
  }

  if (!visible || !payload) return null;

  const navItems = [
    { id: "members",  icon: <IconPeople />,   label: "Mitarbeiter",  description: "Mitglieder verwalten und neue finden." },
    { id: "ranks",    icon: <IconGrades />,   label: "Raenge",       description: "Raenge in deiner Organisation verwalten." },
    { id: "outfits",  icon: <IconClothing />, label: "Kleidung",     description: "Kleidung deiner Organisation verwalten." },
    { id: "vehicles", icon: <IconCar />,      label: "Fuhrpark",     description: "Fraktionsfahrzeuge ausparken und einparken." },
    { id: "market",   icon: <IconShop />,     label: "Markt",        description: "Neue Fahrzeuge fuer die Orga erwerben." },
    { id: "info",     icon: <IconInfo />,     label: "Info",         description: "Organisationsdaten und deine Rechte." },
  ];

  return (
    <div className="fixed inset-0 grid place-items-center text-white" style={{ zIndex: 9999 }}>
      {/* Modal window */}
      <div className="relative w-[90vw] h-[88vh] rounded-xl bg-[#14161c] shadow-[0_30px_60px_rgba(0,0,0,0.75)] flex flex-col overflow-hidden" style={{ border: "2px solid rgba(59,130,246,0.85)" }}>

        <ConfirmDialog
          dialog={confirmDialog}
          onCancel={() => setConfirmDialog(null)}
          onConfirm={() => { const a = confirmDialog?.action; setConfirmDialog(null); a?.(); }}
        />

        {/* Title bar */}
        <div className="flex items-center justify-between px-5 py-4 shrink-0" style={{ background: "#0f172a", borderBottom: "1px solid rgba(59,130,246,0.45)" }}>
          <div className="flex items-center gap-3">
            <div
              className="h-3 w-3 rounded-full"
              style={{ backgroundColor: accent }}
            />
            <div className="text-base font-black text-white">
              Management of {payload.faction?.factionName || "Organisation"}
            </div>
            <span className="rounded bg-white/[0.06] px-2 py-0.5 text-[10px] font-black uppercase text-zinc-400">
              {payload.faction?.factionShortName} | Rang {payload.faction?.rankLevel}: {payload.faction?.rankName}
            </span>
          </div>
          <button
            type="button"
            onClick={() => trigger("cef:orga:close")}
            className="flex h-7 w-7 cursor-pointer items-center justify-center rounded border border-white/[0.1] bg-white/[0.04] text-zinc-400 transition-colors hover:bg-white/[0.1] hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/20"
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" className="h-4 w-4">
              <line x1="18" y1="6" x2="6" y2="18"/>
              <line x1="6" y1="6" x2="18" y2="18"/>
            </svg>
          </button>
        </div>

        {/* Body: sidebar + content */}
        <div className="flex flex-1 min-h-0">
          {/* Sidebar */}
          <nav className="w-52 shrink-0 border-r border-white/[0.06] bg-[#0c0d1a] p-2 overflow-y-auto">
            {navItems.map((item) => (
              <SideNavItem
                key={item.id}
                icon={item.icon}
                label={item.label}
                description={item.description}
                active={activeTab === item.id}
                onClick={() => setActiveTab(item.id)}
              />
            ))}
          </nav>

          {/* Content */}
          <div className="flex-1 min-w-0 p-4 overflow-y-auto">
            {activeTab === "members"  && <MembersTab  payload={payload} canManageRanks={canManageRanks} accent={accent} queueConfirm={queueConfirm} />}
            {activeTab === "ranks"    && <RanksTab    payload={payload} canEditRankMeta={canEditRankMeta} canManageRanks={canManageRanks} accent={accent} queueConfirm={queueConfirm} />}
            {activeTab === "outfits"  && <OutfitsTab  payload={payload} canManageOutfits={canManageOutfits} accent={accent} queueConfirm={queueConfirm} />}
            {activeTab === "vehicles" && <VehiclesTab payload={payload} canManageVehicles={canManageVehicles} accent={accent} queueConfirm={queueConfirm} />}
            {activeTab === "market"   && <MarketTab   payload={payload} catalog={catalog} canManageVehicles={canManageVehicles} accent={accent} queueConfirm={queueConfirm} />}
            {activeTab === "info"     && <InfoTab     payload={payload} accent={accent} />}
          </div>
        </div>
      </div>
    </div>
  );
}

createRoot(document.getElementById("root")).render(<OrgaApp />);

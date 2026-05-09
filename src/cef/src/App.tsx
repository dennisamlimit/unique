import {
  AlertTriangle,
  BadgeCent,
  Banknote,
  Ban,
  BarChart3,
  Boxes,
  Briefcase,
  Brush,
  Bug,
  CalendarDays,
  CarFront,
  CheckCircle2,
  ChevronDown,
  Clock,
  ClipboardList,
  DoorOpen,
  Eye,
  Flag,
  Heart,
  HelpCircle,
  Home,
  KeyRound,
  LayoutDashboard,
  Lock,
  LogIn,
  MapPin,
  MessageSquare,
  Palette,
  Package,
  Plane,
  Phone,
  Plus,
  Scissors,
  Search,
  Send,
  ShieldCheck,
  Shirt,
  ShoppingBag,
  SlidersHorizontal,
  Sparkles,
  Star,
  Settings,
  Terminal,
  Ticket,
  Trophy,
  UserCog,
  UserRound,
  Users,
  Wallet,
  Wrench,
  X
} from "lucide-react";
import { FormEvent, type PointerEvent as ReactPointerEvent, useEffect, useMemo, useRef, useState } from "react";
import { InventoryUI, type NearbyInventoryPlayer } from "./components/Inventory";
import { emitToClient, notifyReady } from "./lib/ragemp";

type Screen = "disclaimer" | "auth" | "characters" | "spawn" | "world";
type AuthMode = "login" | "register";
type CreatorTab = "identity" | "genetics" | "face" | "details" | "hair" | "clothing";
type ChatMode = "ic" | "ooc" | "me" | "do" | "try";
type ThemeColorKey = "ink" | "panel" | "line" | "bg" | "deep" | "teal" | "gold" | "danger";

interface ThemeSettings {
  preset: string;
  colors: Record<ThemeColorKey, string>;
}

const chatModes: ChatMode[] = ["ic", "ooc", "me", "do", "try"];
const chatModeLabels: Record<ChatMode, string> = {
  ic: "IC",
  ooc: "OOC",
  me: "ME",
  do: "DO",
  try: "TRY"
};

const themeColorFields: Array<{ key: ThemeColorKey; label: string }> = [
  { key: "gold", label: "Primaer" },
  { key: "teal", label: "Sekundaer" },
  { key: "danger", label: "Warnung" },
  { key: "ink", label: "Flaeche dunkel" },
  { key: "panel", label: "Panel" },
  { key: "line", label: "Linien" },
  { key: "bg", label: "Hintergrund" },
  { key: "deep", label: "Tiefe" }
];

const themePresets: Array<{ id: string; label: string; colors: Record<ThemeColorKey, string> }> = [
  {
    id: "classic",
    label: "Original",
    colors: {
      ink: "#111318",
      panel: "#191d24",
      line: "#2f3742",
      bg: "#070a0f",
      deep: "#05070a",
      teal: "#1db7a6",
      gold: "#f1b84b",
      danger: "#e85d75"
    }
  },
  {
    id: "midnight",
    label: "Midnight",
    colors: {
      ink: "#0d1320",
      panel: "#151d2d",
      line: "#2c3a56",
      bg: "#060912",
      deep: "#03050a",
      teal: "#38bdf8",
      gold: "#fbbf24",
      danger: "#fb7185"
    }
  },
  {
    id: "lilac",
    label: "Flieder",
    colors: {
      ink: "#15101d",
      panel: "#21172f",
      line: "#4c3a66",
      bg: "#0b0711",
      deep: "#050308",
      teal: "#c084fc",
      gold: "#f0abfc",
      danger: "#fb7185"
    }
  },
  {
    id: "mono-light",
    label: "Weiss/Grau",
    colors: {
      ink: "#2b3038",
      panel: "#3a404a",
      line: "#8b95a3",
      bg: "#15181d",
      deep: "#0c0e12",
      teal: "#e5e7eb",
      gold: "#ffffff",
      danger: "#f87171"
    }
  },
  {
    id: "blackout",
    label: "Schwarz",
    colors: {
      ink: "#050505",
      panel: "#0b0b0d",
      line: "#252529",
      bg: "#000000",
      deep: "#000000",
      teal: "#9ca3af",
      gold: "#f5f5f5",
      danger: "#dc2626"
    }
  },
  {
    id: "ice",
    label: "Ice",
    colors: {
      ink: "#071016",
      panel: "#0d1b24",
      line: "#254255",
      bg: "#03080c",
      deep: "#010406",
      teal: "#67e8f9",
      gold: "#bae6fd",
      danger: "#f43f5e"
    }
  }
];

const defaultTheme = themePresets[0];

const hairColors = [
  "#0c0c0c", "#1d1a17", "#281d18", "#3d1f15", "#682e19", "#954b29", "#a35234", "#9b5f3d",
  "#b57e54", "#c19167", "#af7f53", "#be9560", "#d0ac75", "#b37f43", "#dbac68", "#e4ba7e",
  "#bd895a", "#83422c", "#8e3a28", "#8a241c", "#962b20", "#a7271d", "#c4351f", "#d8421f",
  "#c35731", "#d24b21", "#816755", "#917660", "#a88c74", "#d0b69e", "#513442", "#744557",
  "#a94663", "#cb1e8e", "#f63f78", "#ed9393", "#0b917e", "#248081", "#1b4d6b", "#578d4b",
  "#235433", "#155146", "#889e2e", "#71881b", "#468f21", "#cc953d", "#ebb010", "#ec971a",
  "#e76816", "#e64810", "#ec4d0e", "#c22313", "#e43315", "#ae1b18", "#6d0c0e", "#281914",
  "#3d241a", "#4c281a", "#5d3929", "#69402b", "#291b16", "#0e0e10", "#e6bb84", "#d8ac74"
];

const blendControls = [
  ["Gesichtsform Mutter", 0, 45, 1],
  ["Gesichtsform Vater", 0, 45, 1],
  ["Hautfarbe Mutter", 0, 45, 1],
  ["Hautfarbe Vater", 0, 45, 1],
  ["Gesichts-Mix", 0, 1, 0.05],
  ["Haut-Mix", 0, 1, 0.05]
] as const;

const faceFeatureLabels = [
  "Nasenbreite", "Nasenhoehe", "Nasenlaenge", "Nasenbruecke", "Nasenspitze", "Nasenruecken",
  "Brauenhoehe", "Brauenbreite", "Wangenknochenhoehe", "Wangenknochenbreite", "Wangenbreite",
  "Augen", "Lippen", "Kieferbreite", "Kieferhoehe", "Kinnlaenge", "Kinnposition", "Kinnbreite",
  "Kinnform", "Nackenbreite"
];

const headOverlayControls = [
  ["Schoenheitsfehler", 23],
  ["Augenbrauen", 33],
  ["Altersflecken", 14],
  ["Make-up", 74],
  ["Roetung", 32],
  ["Teint", 11],
  ["Sonnenschaden", 10],
  ["Lippenstift", 9],
  ["Sommersprossen", 17],
  ["Brustbehaarung", 16],
  ["Hautunreinheiten", 11],
  ["Koerperunreinheiten", 1]
] as const;

const clothingControls = [
  ["Maske", 1, 200],
  ["Torso", 3, 240],
  ["Hose", 4, 195],
  ["Tasche", 5, 120],
  ["Schuhe", 6, 101],
  ["Accessoires", 7, 180],
  ["Untershirt", 8, 240],
  ["Weste", 9, 80],
  ["Decals", 10, 120],
  ["Oberteil", 11, 361]
] as const;

const propControls = [
  ["Hut", 0, 200],
  ["Brille", 1, 80],
  ["Ohren", 2, 50],
  ["Uhr", 6, 50],
  ["Armband", 7, 50]
] as const;

const defaultAppearance: CharacterAppearance = {
  gender: "male",
  blendData: [0, 0, 0, 0, 0.5, 0.5],
  eyeColor: 0,
  hair: [0, 0, 0],
  beard: [255, 0],
  faceFeatures: Array.from({ length: 20 }, () => 0),
  headOverlays: Array.from({ length: 12 }, () => -1),
  headOverlayColors: Array.from({ length: 12 }, () => 0),
  headOverlayOpacities: Array.from({ length: 12 }, () => 1),
  clothing: [0, 0, 0, 15, 0, 0, 1, 0, 15, 0, 0, 15],
  clothingTextures: Array.from({ length: 12 }, () => 0),
  props: [-1, -1, -1, -1, -1],
  propTextures: Array.from({ length: 5 }, () => 0)
};

function loadThemeSettings(): ThemeSettings {
  try {
    const stored = window.localStorage.getItem("unique-ui-theme");
    if (!stored) {
      return { preset: defaultTheme.id, colors: { ...defaultTheme.colors } };
    }
    const parsed = JSON.parse(stored) as Partial<ThemeSettings>;
    return {
      preset: parsed.preset ?? "custom",
      colors: normalizeThemeColors(parsed.colors)
    };
  } catch {
    return { preset: defaultTheme.id, colors: { ...defaultTheme.colors } };
  }
}

function normalizeThemeColors(value: unknown): Record<ThemeColorKey, string> {
  const colors = typeof value === "object" && value ? value as Partial<Record<ThemeColorKey, string>> : {};
  return themeColorFields.reduce((next, field) => {
    next[field.key] = normalizeHexColor(colors[field.key], defaultTheme.colors[field.key]);
    return next;
  }, {} as Record<ThemeColorKey, string>);
}

function normalizeHexColor(value: unknown, fallback: string) {
  const color = String(value ?? "").trim();
  return /^#[0-9a-fA-F]{6}$/.test(color) ? color.toLowerCase() : fallback;
}

function applyThemeSettings(theme: ThemeSettings) {
  const root = document.documentElement;
  themeColorFields.forEach((field) => {
    const hex = normalizeHexColor(theme.colors[field.key], defaultTheme.colors[field.key]);
    root.style.setProperty(`--unique-${field.key}`, hex);
    root.style.setProperty(`--unique-${field.key}-rgb`, hexToRgbTriplet(hex));
  });
}

function hexToRgbTriplet(hex: string) {
  const normalized = normalizeHexColor(hex, "#000000").slice(1);
  const number = Number.parseInt(normalized, 16);
  const red = (number >> 16) & 255;
  const green = (number >> 8) & 255;
  const blue = number & 255;
  return `${red} ${green} ${blue}`;
}

function hslToHex(hue: number, saturation: number, lightness: number) {
  const chroma = (1 - Math.abs(2 * lightness - 1)) * saturation;
  const segment = hue / 60;
  const x = chroma * (1 - Math.abs(segment % 2 - 1));
  const match = lightness - chroma / 2;
  const [red, green, blue] = segment < 1
    ? [chroma, x, 0]
    : segment < 2
      ? [x, chroma, 0]
      : segment < 3
        ? [0, chroma, x]
        : segment < 4
          ? [0, x, chroma]
          : segment < 5
            ? [x, 0, chroma]
            : [chroma, 0, x];

  return [red, green, blue]
    .map((value) => Math.round((value + match) * 255).toString(16).padStart(2, "0"))
    .join("");
}

const customPickerColors = [
  "#ffffff", "#d1d5db", "#9ca3af", "#4b5563", "#111827", "#000000",
  ...[0, 18, 36, 52, 74, 100, 130, 160, 188, 210, 235, 260, 282, 304, 328, 348].flatMap((hue) => [
    `#${hslToHex(hue, 0.86, 0.68)}`,
    `#${hslToHex(hue, 0.82, 0.52)}`,
    `#${hslToHex(hue, 0.76, 0.34)}`
  ])
];
function encodeThemeCode(colors: Record<ThemeColorKey, string>) {
  const payload = JSON.stringify({ v: 1, colors: normalizeThemeColors(colors) });
  try {
    return window.btoa(payload);
  } catch {
    return "";
  }
}

function decodeThemeCode(code: string) {
  try {
    const decoded = window.atob(code.trim());
    const parsed = JSON.parse(decoded) as { colors?: unknown };
    return normalizeThemeColors(parsed.colors);
  } catch {
    return null;
  }
}

function readThemeFromPayload(payload: unknown) {
  if (typeof payload !== "string" || !payload.trim()) {
    return null;
  }
  try {
    const parsed = JSON.parse(payload) as { colors?: unknown };
    return normalizeThemeColors(parsed.colors);
  } catch {
    return null;
  }
}

export function App() {
  const [theme, setTheme] = useState<ThemeSettings>(() => loadThemeSettings());
  const [screen, setScreen] = useState<Screen>("disclaimer");
  const [authMode, setAuthMode] = useState<AuthMode>("register");
  const [bootstrap, setBootstrap] = useState<AuthBootstrap | null>(null);
  const [characters, setCharacters] = useState<CharacterInfo[]>([]);
  const [uniqueCoins, setUniqueCoins] = useState(0);
  const [creatorDraft, setCreatorDraft] = useState<CreatorStartPayload | null>(null);
  const [message, setMessage] = useState("");
  const [spawnOptions, setSpawnOptions] = useState<SpawnOptionsPayload | null>(null);
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([
    { tone: "info", author: "SYSTEM", text: "Willkommen auf Unique Roleplay." }
  ]);
  const [chatOpen, setChatOpen] = useState(false);
  const [deadChatOnly, setDeadChatOnly] = useState(false);
  const [deathScreen, setDeathScreen] = useState<DeathScreenPayload | null>(null);
  const [deathScreenKey, setDeathScreenKey] = useState(0);
  const [hudData, setHudData] = useState<HudDataPayload | null>(null);
  const [vehicleHud, setVehicleHud] = useState<VehicleHudPayload>({ visible: false });
  const [hudLocation, setHudLocation] = useState<HudLocationPayload>({
    street: "Unbekannte Strasse",
    crossing: "",
    area: "Los Santos"
  });
  const [supportTicketResult, setSupportTicketResult] = useState<{ ok: boolean; message: string } | null>(null);
  const [supportTickets, setSupportTickets] = useState<SupportTicket[]>([]);
  const [supportMuteNotice, setSupportMuteNotice] = useState<SupportMuteNoticePayload | null>(null);
  const [chatMuteNotice, setChatMuteNotice] = useState<ChatMuteNoticePayload | null>(null);
  const [adminScreenNotice, setAdminScreenNotice] = useState<AdminScreenNoticePayload | null>(null);
  const [adminJailStatus, setAdminJailStatus] = useState<AdminJailStatusPayload | null>(null);
  const [currentCharacter, setCurrentCharacter] = useState<CharacterInfo | null>(null);
  const [mainMenuOpen, setMainMenuOpen] = useState(false);
  const [adminOpen, setAdminOpen] = useState(false);
  const [inventoryOpen, setInventoryOpen] = useState(false);
  const [inventoryNearbyPlayers, setInventoryNearbyPlayers] = useState<NearbyInventoryPlayer[]>([]);
  const [interactionHintTarget, setInteractionHintTarget] = useState<VehicleInteractionTarget | null>(null);
  const [vehicleInteractionTarget, setVehicleInteractionTarget] = useState<VehicleInteractionTarget | null>(null);
  const adminScreenTimer = useRef<number | null>(null);
  const [adminData, setAdminData] = useState<AdminPanelPayload>({
    admins: [],
    players: [],
    commands: [],
    logs: [],
    tickets: [],
    currentAdminLevel: 0,
    adminMode: false,
    canManagePermissions: false,
    canViewLogs: false
  });

  useEffect(() => {
    applyThemeSettings(theme);
    try {
      window.localStorage.setItem("unique-ui-theme", JSON.stringify(theme));
    } catch {}
  }, [theme]);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      emitToClient("unique:cef:saveUiTheme", { colors: normalizeThemeColors(theme.colors) });
    }, 650);
    return () => window.clearTimeout(timer);
  }, [theme]);

  useEffect(() => {
    window.uniqueBridge = {
      receive: (event) => {
        if (event.type === "auth:bootstrap") {
          const savedTheme = readThemeFromPayload(event.payload.uiTheme);
          if (savedTheme) {
            setTheme({ preset: "custom", colors: savedTheme });
          }
          setBootstrap(event.payload);
          setAuthMode(event.payload.knownEmail ? "login" : "register");
          return;
        }

        if (event.type === "auth:error" || event.type === "characters:error") {
          setMessage(event.payload.message);
          return;
        }

        if (event.type === "creator:start") {
          setMessage("");
          setCreatorDraft(event.payload);
          return;
        }

        if (event.type === "characters:list") {
          setMessage("");
          setCreatorDraft(null);
          setSpawnOptions(null);
          setCharacters(event.payload.characters);
          setUniqueCoins(event.payload.uniqueCoins ?? 0);
          const savedTheme = readThemeFromPayload(event.payload.uiTheme);
          if (savedTheme) {
            setTheme({ preset: "custom", colors: savedTheme });
          }
          setScreen("characters");
        }

        if (event.type === "spawn:options") {
          setMessage("");
          setCreatorDraft(null);
          setSpawnOptions(event.payload);
          setScreen("spawn");
          return;
        }

        if (event.type === "world:enter") {
          const savedTheme = readThemeFromPayload(event.payload.uiTheme);
          if (savedTheme) {
            setTheme({ preset: "custom", colors: savedTheme });
          }
          setMessage("");
          setCreatorDraft(null);
          setSpawnOptions(null);
          setCurrentCharacter(event.payload.character);
          setHudData({
            characterId: event.payload.character.id,
            playerCount: 1,
            maxPlayers: 100,
            cash: event.payload.character.cash,
            bankBalance: event.payload.character.bankBalance,
            uniqueCoins,
            onlineSeconds: 0,
            adminMode: false,
            tickets: 0
          });
          setScreen("world");
          return;
        }

        if (event.type === "hud:data") {
          setHudData(event.payload);
          setCurrentCharacter((current) => current
            ? { ...current, cash: event.payload.cash, bankBalance: event.payload.bankBalance }
            : current);
          return;
        }

        if (event.type === "hud:location") {
          setHudLocation(event.payload);
          return;
        }

        if (event.type === "vehicle:hud") {
          setVehicleHud(event.payload);
          return;
        }

        if (event.type === "chat:push") {
          setChatMessages((current) => [...current, event.payload].slice(-120));
          return;
        }

        if (event.type === "chat:open") {
          setDeadChatOnly(Boolean(event.payload.dead));
          setInventoryOpen(false);
          setInteractionHintTarget(null);
          setVehicleInteractionTarget(null);
          setChatOpen(true);
          return;
        }

        if (event.type === "menu:open") {
          setChatOpen(false);
          setAdminOpen(false);
          setInventoryOpen(false);
          setInteractionHintTarget(null);
          setVehicleInteractionTarget(null);
          setSupportTicketResult(null);
          setMainMenuOpen(true);
          emitToClient("unique:cef:requestSupportTickets", {});
          return;
        }

        if (event.type === "menu:close") {
          setMainMenuOpen(false);
          return;
        }

        if (event.type === "support:ticketResult") {
          setSupportTicketResult(event.payload);
          return;
        }

        if (event.type === "support:tickets") {
          setSupportTickets(event.payload.tickets ?? []);
          return;
        }

        if (event.type === "support:muteNotice") {
          setSupportMuteNotice(event.payload);
          playPenaltyNoticeSound();
          window.setTimeout(() => setSupportMuteNotice(null), 9000);
          return;
        }

        if (event.type === "chat:muteNotice") {
          setChatMuteNotice(event.payload);
          playPenaltyNoticeSound();
          window.setTimeout(() => setChatMuteNotice(null), 9000);
          return;
        }

        if (event.type === "admin:screen") {
          if (adminScreenTimer.current) {
            window.clearTimeout(adminScreenTimer.current);
          }
          setAdminScreenNotice(event.payload);
          adminScreenTimer.current = window.setTimeout(() => {
            setAdminScreenNotice(null);
            adminScreenTimer.current = null;
          }, 5000);
          playPenaltyNoticeSound();
          return;
        }

        if (event.type === "admin:jailStatus") {
          setAdminJailStatus(event.payload.active ? event.payload : null);
          return;
        }

        if (event.type === "death:show") {
          setDeathScreen(event.payload);
          setDeathScreenKey((current) => current + 1);
          setChatOpen(false);
          setAdminOpen(false);
          setMainMenuOpen(false);
          setInventoryOpen(false);
          setInteractionHintTarget(null);
          setVehicleInteractionTarget(null);
          return;
        }

        if (event.type === "death:hide") {
          setDeathScreen(null);
          setDeadChatOnly(false);
          return;
        }

        if (event.type === "admin:open") {
          setChatOpen(false);
          setDeadChatOnly(false);
          setMainMenuOpen(false);
          setInventoryOpen(false);
          setInteractionHintTarget(null);
          setVehicleInteractionTarget(null);
          setAdminOpen(true);
          return;
        }

        if (event.type === "admin:close") {
          setAdminOpen(false);
          return;
        }

        if (event.type === "inventory:open") {
          setChatOpen(false);
          setDeadChatOnly(false);
          setMainMenuOpen(false);
          setAdminOpen(false);
          setInteractionHintTarget(null);
          setVehicleInteractionTarget(null);
          setInventoryOpen(true);
          return;
        }

        if (event.type === "inventory:close") {
          setInventoryOpen(false);
          return;
        }

        if (event.type === "inventory:nearbyPlayers") {
          setInventoryNearbyPlayers(event.payload.players ?? []);
          return;
        }

        if (event.type === "interaction:hint") {
          setInteractionHintTarget(event.payload.visible && event.payload.target ? event.payload.target : null);
          return;
        }

        if (event.type === "interaction:open") {
          setChatOpen(false);
          setDeadChatOnly(false);
          setMainMenuOpen(false);
          setAdminOpen(false);
          setInventoryOpen(false);
          setInteractionHintTarget(null);
          setVehicleInteractionTarget(event.payload);
          playInteractionOpenSound();
          return;
        }

        if (event.type === "interaction:close") {
          setVehicleInteractionTarget(null);
          return;
        }

        if (event.type === "admin:data") {
          setAdminData(event.payload);
        }
      }
    };

    const preventCopy = (event: Event) => {
      if (event.target instanceof Element && event.target.closest("input, textarea, [contenteditable='true']")) {
        return;
      }
      if (event.type === "dragstart" && event.target instanceof Element && event.target.closest("[data-inventory-draggable]")) {
        return;
      }
      event.preventDefault();
    };
    const sendFocusState = (focused: boolean) => emitToClient("unique:cef:uiFocus", { focused });
    const updateFocusState = () => {
      const active = document.activeElement;
      sendFocusState(Boolean(active && ["INPUT", "TEXTAREA"].includes(active.tagName)));
    };
    const handleFocusOut = () => window.setTimeout(updateFocusState, 0);
    document.addEventListener("copy", preventCopy);
    document.addEventListener("cut", preventCopy);
    document.addEventListener("contextmenu", preventCopy);
    document.addEventListener("dragstart", preventCopy);
    document.addEventListener("selectstart", preventCopy);
    document.addEventListener("focusin", updateFocusState);
    document.addEventListener("focusout", handleFocusOut);

    notifyReady();
    const timer = window.setTimeout(() => setScreen("auth"), 3000);

    return () => {
      window.clearTimeout(timer);
      if (adminScreenTimer.current) {
        window.clearTimeout(adminScreenTimer.current);
      }
      document.removeEventListener("copy", preventCopy);
      document.removeEventListener("cut", preventCopy);
      document.removeEventListener("contextmenu", preventCopy);
      document.removeEventListener("dragstart", preventCopy);
      document.removeEventListener("selectstart", preventCopy);
      document.removeEventListener("focusin", updateFocusState);
      document.removeEventListener("focusout", handleFocusOut);
      delete window.uniqueBridge;
    };
  }, []);

  return (
    <main className="min-h-screen overflow-hidden bg-transparent text-white">
      {screen === "disclaimer" ? <DisclaimerBackdrop /> : screen === "world" ? null : <AppBackdrop transparentPreview={Boolean(creatorDraft)} />}
      {screen === "disclaimer" ? <Disclaimer /> : null}
      {screen === "auth" ? (
        <AuthPanel
          bootstrap={bootstrap}
          mode={authMode}
          message={message}
          onModeChange={setAuthMode}
          onMessage={setMessage}
        />
      ) : null}
      {screen === "characters" ? (
        <CharacterSelect
          characters={characters}
          uniqueCoins={uniqueCoins}
          creatorDraft={creatorDraft}
          message={message}
          onCloseCreator={() => {
            if (creatorDraft) {
              emitToClient("unique:cef:cancelCharacterCreation", {});
            }
            setCreatorDraft(null);
          }}
        />
      ) : null}
      {screen === "spawn" && spawnOptions ? (
        <SpawnSelect payload={spawnOptions} message={message} onBack={() => setScreen("characters")} />
      ) : null}
      {screen === "world" ? (
        <>
          <WorldHud data={hudData} location={hudLocation} />
          {vehicleHud.visible ? <VehicleHud data={vehicleHud} /> : null}
          {interactionHintTarget && !vehicleInteractionTarget && !chatOpen && !adminOpen && !mainMenuOpen && !inventoryOpen ? (
            <VehicleInteractionHint target={interactionHintTarget} />
          ) : null}
          {adminJailStatus ? <AdminJailOverlay status={adminJailStatus} onExpired={() => setAdminJailStatus(null)} /> : null}
          {!adminOpen && !mainMenuOpen && !inventoryOpen ? <ChatHud messages={chatMessages} open={chatOpen} deadOnly={deadChatOnly} onClose={() => setChatOpen(false)} /> : null}
          {vehicleInteractionTarget ? (
            <VehicleInteractionMenu target={vehicleInteractionTarget} onClose={() => setVehicleInteractionTarget(null)} />
          ) : null}
          {mainMenuOpen ? (
            <MainMenu
              character={currentCharacter}
              hudData={hudData}
              uniqueCoins={uniqueCoins}
              supportTicketResult={supportTicketResult}
              supportTickets={supportTickets}
              theme={theme}
              onThemeChange={(colors) => setTheme({ preset: "custom", colors })}
              onThemePreset={(preset) => setTheme({ preset: preset.id, colors: { ...preset.colors } })}
              onClose={() => setMainMenuOpen(false)}
            />
          ) : null}
          {adminOpen ? <AdminPanel data={adminData} result={supportTicketResult} onClose={() => setAdminOpen(false)} /> : null}
          {inventoryOpen ? <InventoryUI nearbyPlayers={inventoryNearbyPlayers} /> : null}
        </>
      ) : null}
      {supportMuteNotice ? <SupportMuteNotice notice={supportMuteNotice} onClose={() => setSupportMuteNotice(null)} /> : null}
      {chatMuteNotice ? <ChatMuteNotice notice={chatMuteNotice} onClose={() => setChatMuteNotice(null)} /> : null}
      {adminScreenNotice ? <AdminScreenNotice notice={adminScreenNotice} onClose={() => setAdminScreenNotice(null)} /> : null}
      {deathScreen ? <DeathScreen key={deathScreenKey} initialSeconds={deathScreen.seconds} /> : null}
    </main>
  );
}

function DisclaimerBackdrop() {
  return (
    <>
      <div className="fixed inset-0 bg-unique-deep" />
      <div className="disclaimer-tiles fixed inset-0 opacity-70" />
      <div className="theme-disclaimer-gradient fixed inset-0" />
      <div className="fixed inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-unique-teal to-transparent" />
      <div className="fixed inset-x-0 bottom-0 h-64 bg-gradient-to-t from-black to-transparent" />
    </>
  );
}

function SupportMuteNotice({ notice, onClose }: { notice: SupportMuteNoticePayload; onClose: () => void }) {
  return <PenaltyNotice title="Du wurdest vom Support ausgeschlossen" tone="Support-Sperre" notice={notice} onClose={onClose} />;
}

function ChatMuteNotice({ notice, onClose }: { notice: ChatMuteNoticePayload; onClose: () => void }) {
  return <PenaltyNotice title="Du wurdest vom Chat ausgeschlossen" tone="Chat-Mute" notice={notice} onClose={onClose} />;
}

function AdminScreenNotice({ notice }: { notice: AdminScreenNoticePayload; onClose: () => void }) {
  const Icon = getAdminScreenIcon(notice.type);
  const headline = notice.type === "amsg" ? `Nachricht vom Administrator (${notice.administrator})` : getAdminScreenHeadline(notice);
  const message = notice.message ?? getAdminScreenMessage(notice.type);

  return (
    <div className="fixed inset-0 z-[120] flex h-screen w-screen items-center justify-center overflow-hidden bg-[#05080b]/80 text-white">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_18%_16%,rgba(0,185,170,0.14),transparent_30%),radial-gradient(circle_at_82%_20%,rgba(246,185,48,0.13),transparent_28%),linear-gradient(90deg,rgba(1,18,20,0.75),rgba(7,8,11,0.92),rgba(23,15,5,0.72))]" />
      <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.025)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.025)_1px,transparent_1px)] bg-[size:42px_42px] opacity-35" />
      <div className="pointer-events-none absolute left-0 top-0 h-20 w-20 border-l-4 border-t-4 border-[#f6b930]" />
      <div className="pointer-events-none absolute bottom-0 right-0 h-20 w-20 border-b-4 border-r-4 border-[#00c7b7]" />

      <section className="relative flex w-[min(90vw,520px)] flex-col items-center text-center">
        <div className="mb-7 flex h-[74px] w-[74px] items-center justify-center rounded-full border border-[#f6b930]/45 bg-black/35 text-[#f6b930] shadow-2xl shadow-[#f6b930]/15 backdrop-blur-md">
          <Icon className="h-[42px] w-[42px]" aria-hidden />
        </div>

        <p className="mb-3 text-xs font-black uppercase tracking-[0.38em] text-[#f6b930]/80">
          Administration
        </p>

        <h1 className="text-[28px] font-semibold tracking-normal text-white drop-shadow-[0_2px_10px_rgba(0,0,0,0.85)] md:text-[34px]">
          {headline}
        </h1>

        <div className="mt-7 w-full rounded-2xl border border-white/10 bg-black/28 p-5 shadow-2xl shadow-black/30 backdrop-blur-md">
          <div className="space-y-3 text-left text-sm md:text-[15px]">
            <AdminScreenInfoRow label="Administrator" value={notice.administrator} />
            {notice.targetName ? <AdminScreenInfoRow label="Spieler" value={notice.targetName} /> : null}
            {notice.reason ? <AdminScreenInfoRow label="Grund" value={notice.reason} /> : null}
            {notice.duration ? <AdminScreenInfoRow label="Dauer" value={notice.duration} /> : null}
            {notice.expiresAt ? <AdminScreenInfoRow label="Verbleibend" value={formatRemainingUntil(notice.expiresAt)} /> : null}
            <AdminScreenInfoRow label="Datum" value={formatDateTime(notice.createdAt ?? new Date().toISOString())} />
          </div>
        </div>

        <p className="mt-6 max-w-md text-sm leading-6 text-white/45">
          {message}
        </p>
      </section>
    </div>
  );
}

function AdminScreenInfoRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between gap-5 border-b border-white/[0.06] pb-3 last:border-b-0 last:pb-0">
      <span className="text-xs font-bold uppercase tracking-[0.18em] text-white/35">{label}</span>
      <span className="text-right font-semibold text-white/90">{value}</span>
    </div>
  );
}

function AdminJailOverlay({ status, onExpired }: { status: AdminJailStatusPayload; onExpired: () => void }) {
  const [now, setNow] = useState(() => Date.now());
  const expiresAt = status.expiresAt ? new Date(status.expiresAt).getTime() : now;
  const remainingSeconds = Math.max(0, Math.ceil((expiresAt - now) / 1000));
  const startSeconds = Math.max(1, Math.trunc(status.durationSeconds ?? remainingSeconds));
  const progress = Math.max(0, Math.min(100, (remainingSeconds / startSeconds) * 100));

  useEffect(() => {
    const timer = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(timer);
  }, []);

  useEffect(() => {
    if (remainingSeconds <= 0) {
      onExpired();
    }
  }, [remainingSeconds, onExpired]);

  return (
    <div className="pointer-events-none fixed inset-x-0 top-4 z-[35] flex justify-center px-4 text-white">
      <div className="relative flex max-w-[calc(100vw-2rem)] items-center gap-3 overflow-hidden rounded-xl border border-unique-gold/30 bg-unique-ink/80 px-4 py-2 shadow-2xl shadow-black/35 backdrop-blur-md">
        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md border border-unique-gold/40 bg-unique-gold/10 text-unique-gold">
          <Lock className="h-[18px] w-[18px]" aria-hidden />
        </div>
        <div className="flex min-w-0 flex-wrap items-center gap-x-4 gap-y-1 text-xs">
          <span className="font-black uppercase text-white">{status.type === "warn" ? "Warn-Jail" : "Admin-Jail"}</span>
          <span className="text-white/60">{status.administrator ?? "Administration"}</span>
          <span className="hidden text-white/30 sm:inline">/</span>
          <span className="max-w-[220px] truncate text-white/60">{status.reason ?? "Kein Grund angegeben"}</span>
          <span className="font-black text-unique-gold">{formatAdminJailTime(remainingSeconds)}</span>
        </div>
        <div className="absolute bottom-0 left-0 h-[2px] w-full bg-white/10">
          <div className="h-full bg-unique-gold transition-all duration-1000 ease-linear" style={{ width: `${progress}%` }} />
        </div>
      </div>
    </div>
  );
}

type VehicleInteractionAction = {
  id: VehicleInteractionActionId;
  label: string;
  icon: React.ReactNode;
  disabled?: (target: VehicleInteractionTarget) => boolean;
};

const vehicleInteractionActions: VehicleInteractionAction[] = [
  { id: "lock", label: "Tuerschloss", icon: <Lock className="h-6 w-6" aria-hidden /> },
  { id: "engine", label: "Motor", icon: <KeyRound className="h-6 w-6" aria-hidden /> },
  { id: "doors", label: "Tueren", icon: <DoorOpen className="h-6 w-6" aria-hidden /> },
  { id: "trunk", label: "Kofferraum", icon: <Boxes className="h-6 w-6" aria-hidden />, disabled: (target) => Boolean(target.meta?.locked) },
  { id: "hood", label: "Motorhaube", icon: <CarFront className="h-6 w-6" aria-hidden /> },
  { id: "glovebox", label: "Handschuhfach", icon: <Package className="h-6 w-6" aria-hidden /> },
  { id: "passengers", label: "Insassen", icon: <Users className="h-6 w-6" aria-hidden /> },
  { id: "keys", label: "Schluessel", icon: <KeyRound className="h-6 w-6" aria-hidden /> },
  { id: "search", label: "Durchsuchen", icon: <Search className="h-6 w-6" aria-hidden /> },
  { id: "repair", label: "Reparieren", icon: <Wrench className="h-6 w-6" aria-hidden />, disabled: (target) => !target.meta?.repairReady }
];

const vehicleInteractionRows = [3, 4, 3];

function VehicleInteractionHint({ target }: { target: VehicleInteractionTarget }) {
  const fallbackScreen = useMemo(() => ({ x: 50, y: 50 }), []);
  const [displayScreen, setDisplayScreen] = useState(() => target.screen ?? fallbackScreen);
  const targetScreenRef = useRef(target.screen ?? fallbackScreen);

  useEffect(() => {
    targetScreenRef.current = target.screen ?? fallbackScreen;
    if (!target.screen) {
      setDisplayScreen(fallbackScreen);
    }
  }, [fallbackScreen, target.screen]);

  useEffect(() => {
    let frame = 0;
    const tick = () => {
      setDisplayScreen((current) => {
        const nextTarget = targetScreenRef.current;
        const dx = nextTarget.x - current.x;
        const dy = nextTarget.y - current.y;
        if (Math.abs(dx) < 0.025 && Math.abs(dy) < 0.025) {
          return current.x === nextTarget.x && current.y === nextTarget.y ? current : nextTarget;
        }
        return {
          x: current.x + dx * 0.46,
          y: current.y + dy * 0.46
        };
      });
      frame = window.requestAnimationFrame(tick);
    };

    frame = window.requestAnimationFrame(tick);
    return () => window.cancelAnimationFrame(frame);
  }, []);

  return (
    <div className="pointer-events-none fixed inset-0 z-[32] text-white">
      <div
        className="absolute flex flex-col items-center"
        style={{ left: `${displayScreen.x}%`, top: `${displayScreen.y}%`, transform: "translate(-50%, -50%)" }}
      >
        <div className="relative grid h-12 w-12 place-items-center rounded-full border border-unique-gold/75 bg-unique-ink/34 shadow-[0_0_18px_rgb(var(--unique-gold-rgb)/0.20)] backdrop-blur-[2px]">
          <div className="absolute inset-1 rounded-full border border-unique-teal/35" />
          <span className="text-lg font-black leading-none text-unique-gold">G</span>
        </div>
      </div>
    </div>
  );
}

function VehicleInteractionMenu({ target, onClose }: { target: VehicleInteractionTarget; onClose: () => void }) {
  const [selectedIndex, setSelectedIndex] = useState<number | null>(null);
  const rows = useMemo(() => buildVehicleInteractionRows(vehicleInteractionActions, vehicleInteractionRows), []);

  useEffect(() => {
    setSelectedIndex(null);
  }, [target.id]);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape" || event.key.toLowerCase() === "g") {
        event.preventDefault();
        close();
        return;
      }

      if (event.key === "ArrowDown" || event.key === "ArrowRight") {
        event.preventDefault();
        setSelectedIndex((current) => (current === null ? 0 : (current + 1) % vehicleInteractionActions.length));
        return;
      }

      if (event.key === "ArrowUp" || event.key === "ArrowLeft") {
        event.preventDefault();
        setSelectedIndex((current) => (current === null ? vehicleInteractionActions.length - 1 : (current - 1 + vehicleInteractionActions.length) % vehicleInteractionActions.length));
        return;
      }

      if (event.key === "Enter" && selectedIndex !== null) {
        event.preventDefault();
        select(vehicleInteractionActions[selectedIndex]);
      }
    };

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [selectedIndex, target]);

  function close() {
    emitToClient("unique:cef:vehicleInteractionClose", {});
    onClose();
  }

  function select(action: VehicleInteractionAction) {
    if (action.disabled?.(target)) {
      return;
    }

    emitToClient("unique:cef:vehicleInteractionSelect", {
      actionId: action.id,
      targetId: target.id,
      targetType: target.type
    });
    onClose();
  }

  return (
    <section className="fixed inset-0 z-[80] overflow-hidden bg-black/18 text-white">
      <div className="pointer-events-none absolute inset-0 backdrop-blur-[1px]" />
      <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(115deg,rgb(var(--unique-bg-rgb)/0.92),rgb(var(--unique-ink-rgb)/0.72)_52%,rgb(var(--unique-deep-rgb)/0.92))]" />
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_50%_48%,rgb(var(--unique-teal-rgb)/0.14),transparent_34%)]" />

      <div className="interaction-enter relative flex h-full w-full items-center justify-center px-4">
        <button
          type="button"
          className="absolute right-5 top-5 grid h-10 w-10 place-items-center rounded-md border border-white/10 bg-black/28 text-white/65 transition hover:border-unique-gold/50 hover:text-white"
          onClick={close}
        >
          <X className="h-4 w-4" aria-hidden />
        </button>

        <header className="absolute left-1/2 top-[15%] -translate-x-1/2 text-center">
          <CarFront className="mx-auto mb-2 h-6 w-6 text-unique-gold" aria-hidden />
          <h2 className="max-w-[80vw] truncate text-2xl font-semibold text-white drop-shadow">{target.name || "Fahrzeug"}</h2>
          <p className="mt-1 text-xs font-black uppercase text-white/45">
            {target.subtitle || "Fahrzeuginteraktion"} {Number.isFinite(target.distance) ? `/ ${target.distance.toFixed(1)} m` : ""}
          </p>
        </header>

        <div className="relative flex flex-col items-center pt-16">
          <div className="pointer-events-none absolute left-1/2 top-1/2 h-[320px] w-[500px] max-w-[90vw] -translate-x-1/2 -translate-y-1/2 rounded-full bg-unique-teal/10 blur-2xl" />
          {rows.map((row, rowIndex) => {
            const previousItems = rows.slice(0, rowIndex).reduce((sum, current) => sum + current.length, 0);
            return (
              <div key={`vehicle-row-${rowIndex}`} className="relative -mt-3 flex items-center justify-center first:mt-0">
                {row.map((action, index) => {
                  const globalIndex = previousItems + index;
                  return (
                    <VehicleHexAction
                      key={action.id}
                      action={action}
                      target={target}
                      selected={globalIndex === selectedIndex}
                      disabled={Boolean(action.disabled?.(target))}
                      onHover={() => setSelectedIndex(globalIndex)}
                      onLeave={() => setSelectedIndex(null)}
                      onClick={() => select(action)}
                    />
                  );
                })}
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}

function VehicleHexAction({
  action,
  target,
  selected,
  disabled,
  onHover,
  onLeave,
  onClick
}: {
  action: VehicleInteractionAction;
  target: VehicleInteractionTarget;
  selected: boolean;
  disabled: boolean;
  onHover: () => void;
  onLeave: () => void;
  onClick: () => void;
}) {
  const hexClip = "polygon(50% 0%, 94% 25%, 94% 75%, 50% 100%, 6% 75%, 6% 25%)";

  return (
    <button
      type="button"
      disabled={disabled}
      className="group relative mx-px my-[-4px] flex h-[124px] w-[124px] items-center justify-center transition-transform duration-100 hover:z-20 hover:scale-[1.02] active:scale-[0.99] disabled:cursor-not-allowed disabled:opacity-45"
      onMouseEnter={onHover}
      onMouseLeave={onLeave}
      onClick={onClick}
    >
      <div
        className={`absolute inset-0 transition-colors duration-100 ${selected ? "bg-unique-gold/80 shadow-[0_0_18px_rgb(var(--unique-gold-rgb)/0.18)]" : "bg-unique-line/90 group-hover:bg-unique-teal/65"}`}
        style={{ clipPath: hexClip }}
      />
      <div
        className={`absolute inset-[2px] transition-colors duration-100 ${selected ? "bg-unique-ink" : "bg-unique-panel group-hover:bg-unique-ink"}`}
        style={{ clipPath: hexClip }}
      />
      <div
        className="absolute inset-[8px] bg-[radial-gradient(circle_at_top,rgb(var(--unique-teal-rgb)/0.20),transparent_68%)] opacity-75 transition group-hover:bg-[radial-gradient(circle_at_top,rgb(var(--unique-gold-rgb)/0.18),transparent_68%)]"
        style={{ clipPath: hexClip }}
      />
      <div className="pointer-events-none relative z-10 flex flex-col items-center justify-center px-3 text-center">
        <span className={selected ? "text-unique-gold" : "text-unique-teal group-hover:text-unique-gold"}>{action.icon}</span>
        <span className="mt-2 max-w-[98px] text-[10px] font-black uppercase leading-[1.08] text-white/95">{getVehicleActionLabel(action, target)}</span>
        {disabled ? <span className="mt-1 text-[9px] font-black uppercase text-white/35">Gesperrt</span> : null}
      </div>
    </button>
  );
}

function getVehicleActionLabel(action: VehicleInteractionAction, target: VehicleInteractionTarget) {
  if (action.id === "lock" || action.id === "doors") {
    return target.meta?.locked ? "Aufschliessen" : "Abschliessen";
  }
  if (action.id === "engine") {
    return target.meta?.engineOn ? "Motor aus" : "Motor an";
  }
  if (action.id === "trunk") {
    return target.meta?.trunkOpen ? "Kofferraum zu" : "Kofferraum";
  }
  if (action.id === "hood") {
    return target.meta?.hoodOpen ? "Haube zu" : "Motorhaube";
  }
  return action.label;
}

function buildVehicleInteractionRows(actions: VehicleInteractionAction[], rowCounts: number[]) {
  const rows: VehicleInteractionAction[][] = [];
  let cursor = 0;

  rowCounts.forEach((count) => {
    const row = actions.slice(cursor, cursor + count);
    if (row.length) {
      rows.push(row);
    }
    cursor += count;
  });

  if (cursor < actions.length) {
    rows.push(actions.slice(cursor));
  }

  return rows;
}

function getAdminScreenIcon(type: AdminScreenNoticePayload["type"]) {
  if (type === "amsg") {
    return MessageSquare;
  }
  if (type === "ban" || type === "iban") {
    return Ban;
  }
  if (type === "mute") {
    return Lock;
  }
  if (type === "warn") {
    return AlertTriangle;
  }
  return ShieldCheck;
}

function getAdminScreenHeadline(notice: AdminScreenNoticePayload) {
  if (notice.type === "ban") {
    return "Dein Charakter wurde gesperrt";
  }
  if (notice.type === "iban") {
    return "Dein Account wurde gesperrt";
  }
  if (notice.type === "jail") {
    return "Du wurdest ins Admin-Jail gesetzt";
  }
  if (notice.type === "warn") {
    return "Du hast eine Verwarnung erhalten";
  }
  if (notice.type === "mute") {
    return "Du wurdest vom Chat ausgeschlossen";
  }
  return notice.title;
}

function getAdminScreenMessage(type: AdminScreenNoticePayload["type"]) {
  if (type === "ban" || type === "iban") {
    return "Du wurdest voruebergehend vom Server ausgeschlossen.";
  }
  if (type === "jail") {
    return "Du befindest dich bis zum Ablauf der Strafe im Admin-Jail.";
  }
  if (type === "warn") {
    return "Die Verwarnung ist 7 Tage gueltig. Ab 3 aktiven Warns folgt automatisch ein Bann.";
  }
  if (type === "mute") {
    return "Du kannst bis zum Ablauf der Strafe nicht im Chat schreiben.";
  }
  return "";
}

function PenaltyNotice({ title, tone, notice, onClose }: { title: string; tone: string; notice: { administrator: string; reason: string; expiresAt: string }; onClose: () => void }) {
  return (
    <section className="fixed inset-0 z-[90] grid place-items-center bg-black/45 px-6">
      <div className="w-full max-w-[560px] rounded-md border border-unique-danger/55 bg-unique-ink/96 p-6 text-center shadow-2xl shadow-black/60">
        <div className="mx-auto grid h-14 w-14 place-items-center rounded-md border border-unique-danger/45 bg-unique-danger/15 text-red-100">
          <Ticket className="h-7 w-7" aria-hidden />
        </div>
        <p className="mt-5 text-xs font-black uppercase tracking-[0.18em] text-unique-danger">{tone}</p>
        <h2 className="mt-2 text-2xl font-black text-white">{title}</h2>
        <div className="mt-5 grid gap-2 rounded-md border border-white/10 bg-black/25 p-4 text-left">
          <SupportMuteRow label="Administrator" value={notice.administrator} />
          <SupportMuteRow label="Ablauf" value={formatDateTime(notice.expiresAt)} />
          <SupportMuteRow label="Grund" value={notice.reason} />
        </div>
        <button type="button" className="mt-5 rounded-md bg-unique-gold px-5 py-2 text-sm font-black text-unique-ink" onClick={onClose}>
          Verstanden
        </button>
      </div>
    </section>
  );
}

function SupportMuteRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="grid gap-1 sm:grid-cols-[130px_1fr]">
      <span className="text-xs font-black uppercase text-white/35">{label}</span>
      <strong className="break-words text-sm text-white">{value}</strong>
    </div>
  );
}

function AppBackdrop({ transparentPreview = false }: { transparentPreview?: boolean }) {
  if (transparentPreview) {
    return null;
  }

  return (
    <>
      <div className="fixed inset-0 bg-unique-bg" />
      <div className="app-grid fixed inset-0 opacity-40" />
      <div className="theme-app-gradient fixed inset-0" />
      <div className="fixed inset-x-0 bottom-0 h-48 bg-gradient-to-t from-black/80 to-transparent" />
    </>
  );
}

function Disclaimer() {
  return (
    <section className="relative flex min-h-screen items-center justify-center px-6">
      <div className="w-full max-w-xl text-center">
        <div className="mx-auto mb-6 flex h-16 w-16 items-center justify-center rounded-full border border-unique-teal/30 bg-black/45 shadow-[0_0_60px_rgb(var(--unique-teal-rgb)/0.20)]">
          <ShieldCheck className="h-8 w-8 text-unique-teal" aria-hidden />
        </div>
        <p className="text-sm font-semibold uppercase tracking-[0.28em] text-unique-gold">Unique Roleplay</p>
        <h1 className="mt-4 text-4xl font-semibold sm:text-5xl">Hinweis</h1>
        <p className="mt-5 text-base leading-7 text-white/72">
          Unique Roleplay ist ein eigenstaendiges Community-Projekt und steht in keiner Verbindung zu Rockstar Games,
          Take-Two Interactive oder offiziellen Grand Theft Auto Online Diensten.
        </p>
        <div className="mt-9 h-2 overflow-hidden rounded-full border border-white/10 bg-black/55 shadow-inner">
          <div className="h-full rounded-full bg-gradient-to-r from-unique-teal via-unique-teal to-unique-gold disclaimer-progress" />
        </div>
      </div>
    </section>
  );
}

function AuthPanel(props: {
  bootstrap: AuthBootstrap | null;
  mode: AuthMode;
  message: string;
  onModeChange: (mode: AuthMode) => void;
  onMessage: (message: string) => void;
}) {
  const [email, setEmail] = useState(props.bootstrap?.knownEmail ?? "");
  const [password, setPassword] = useState("");

  useEffect(() => {
    setEmail(props.bootstrap?.knownEmail ?? "");
  }, [props.bootstrap?.knownEmail]);

  const title = props.mode === "login" ? "Einloggen" : "Account erstellen";
  const submitEvent = props.mode === "login" ? "unique:cef:login" : "unique:cef:register";

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    props.onMessage("");
    emitToClient(submitEvent, { email, password });
  }

  return (
    <section className="relative flex min-h-screen items-center justify-center overflow-hidden px-6 py-10">
      <div className="pointer-events-none absolute left-0 top-0 h-16 w-16 border-l-[6px] border-t-[6px] border-unique-gold/90" />
      <div className="pointer-events-none absolute right-0 top-0 h-px w-1/2 bg-gradient-to-l from-unique-teal/50 to-transparent" />
      <div className="pointer-events-none absolute bottom-[14%] left-[12%] text-7xl font-light text-white/10">x</div>

      <div className="grid w-full max-w-5xl animate-panel overflow-hidden rounded-lg border border-white/10 bg-black/25 shadow-2xl shadow-black/40 backdrop-blur md:grid-cols-[0.8fr_1.2fr]">
        <aside className="hidden border-r border-white/10 bg-black/20 p-8 md:flex md:flex-col md:justify-between">
          <div>
            <h1 className="text-3xl font-black uppercase tracking-wide text-unique-gold">Unique</h1>
            <p className="mt-3 text-sm text-white/45">{props.bootstrap?.socialClubName ?? "Social Club"}</p>
          </div>
          <div className="rounded-md border border-white/10 bg-white/5 p-5">
            <p className="text-xs text-white/35">Account</p>
            <p className="mt-2 text-2xl font-light text-white">{props.mode === "login" ? "Login" : "Registrierung"}</p>
          </div>
        </aside>

        <div className="p-7 sm:p-10">
          <header className="mb-8 flex items-start justify-between gap-5">
            <div>
              <p className="text-sm font-semibold uppercase tracking-[0.22em] text-unique-gold">Account</p>
              <h2 className="mt-3 text-3xl font-light text-white">{title}</h2>
            </div>
            <div>
              <span className="flex h-11 w-11 items-center justify-center rounded-full bg-unique-gold text-unique-ink">
                <UserRound className="h-5 w-5" aria-hidden />
              </span>
            </div>
          </header>

          <form onSubmit={submit}>
            <div className="grid gap-4">
              <TextInput label="E-Mail" type="email" value={email} onChange={setEmail} autoComplete="email" />
              <TextInput
                label="Passwort"
                type="password"
                value={password}
                onChange={setPassword}
                autoComplete={props.mode === "login" ? "current-password" : "new-password"}
                minLength={6}
              />
              {props.message ? <ErrorText message={props.message} /> : null}
            </div>

            <button className="mt-8 flex w-full items-center justify-center gap-2 rounded-md border border-unique-gold/75 bg-unique-gold/10 px-4 py-3 text-sm font-semibold text-unique-gold transition hover:bg-unique-gold hover:text-unique-ink">
              {props.mode === "login" ? <LogIn className="h-4 w-4" aria-hidden /> : <Plus className="h-4 w-4" aria-hidden />}
              {title}
            </button>

            <button
              type="button"
              className="mt-3 w-full rounded-md border border-white/10 px-4 py-3 text-sm text-white/70 transition hover:border-white/25 hover:text-white"
              onClick={() => props.onModeChange(props.mode === "login" ? "register" : "login")}
            >
              {props.mode === "login" ? "Neuen Unique Account erstellen" : "Ich habe bereits einen Account"}
            </button>
          </form>
        </div>
      </div>
    </section>
  );
}

function CharacterSelect({
  characters,
  uniqueCoins,
  creatorDraft,
  message,
  onCloseCreator
}: {
  characters: CharacterInfo[];
  uniqueCoins: number;
  creatorDraft: CreatorStartPayload | null;
  message: string;
  onCloseCreator: () => void;
}) {
  const bySlot = useMemo(() => new Map(characters.map((character) => [character.slot, character])), [characters]);

  if (creatorDraft) {
    return (
      <CharacterCreatorView
        draft={creatorDraft}
        message={message}
        onClose={onCloseCreator}
      />
    );
  }

  return (
    <section className="relative min-h-screen overflow-hidden px-6 py-8">
      <div className="pointer-events-none absolute left-0 top-0 h-20 w-20 border-l-[6px] border-t-[6px] border-unique-gold/90" />
      <div className="pointer-events-none absolute bottom-0 right-0 h-28 w-28 border-b-[6px] border-r-[6px] border-unique-teal/80" />
      <div className="pointer-events-none absolute left-[7%] top-[31%] text-6xl font-light text-white/10">x</div>
      <div className="pointer-events-none absolute right-[8%] bottom-[20%] text-7xl font-light text-unique-gold/30">x</div>

      <div className="mx-auto flex min-h-[calc(100vh-4rem)] w-full max-w-7xl animate-panel flex-col">
        <header className="flex items-start justify-between gap-5 border-b border-white/10 pb-7">
          <div>
            <div className="flex items-baseline gap-4">
              <h1 className="text-3xl font-black uppercase tracking-wide text-unique-gold">Unique</h1>
              <div>
                <p className="text-sm font-semibold text-white">Charakterauswahl</p>
                <p className="text-xs text-white/40">Waehle dein Leben</p>
              </div>
            </div>
          </div>
          <div className="flex items-center gap-3 text-right">
            {message ? <ErrorText message={message} compact /> : null}
            <div className="min-w-36">
              <p className="text-xs text-white/40">Unique Coins</p>
              <p className="text-xl font-semibold text-white">{formatNumber(uniqueCoins)}</p>
            </div>
            <span className="flex h-9 w-9 items-center justify-center rounded-full bg-unique-gold text-unique-ink">
              <BadgeCent className="h-5 w-5" aria-hidden />
            </span>
          </div>
        </header>

        <div className="grid flex-1 gap-0 md:grid-cols-3">
          {[1, 2, 3].map((slot) => (
            <CharacterSlot
              key={slot}
              slot={slot}
              character={bySlot.get(slot)}
              onCreate={() => emitToClient("unique:cef:beginCharacterCreation", { slot })}
            />
          ))}
        </div>
      </div>
    </section>
  );
}

function CharacterSlot({
  slot,
  character,
  onCreate
}: {
  slot: number;
  character?: CharacterInfo;
  onCreate: () => void;
}) {
  const locked = slot === 3 && !character;
  const slotTitle = slot === 3 ? "Gold Slot" : character ? `${character.firstName} ${character.lastName}` : "Account nicht erstellt";
  const slotSubtitle = character ? `Charakter #${slot}` : slot === 3 ? "Premium Charakter" : `Slot ${slot}`;

  if (character) {
    const level = Math.max(1, Number(character.level ?? 1));
    const experience = Math.max(0, Number(character.experience ?? 0));
    const nextLevelExperience = getNextLevelExperience(level);
    const progress = Math.min(100, Math.round((experience / nextLevelExperience) * 100));

    return (
      <article className="flex min-h-[620px] flex-col border-r border-white/10 px-8 py-12 last:border-r-0">
        <div className="text-center">
          <h2 className="text-3xl font-light text-white">{slotTitle}</h2>
          <p className="mt-2 text-sm text-white/40">{slotSubtitle}</p>
        </div>

        <div className="mt-8 grid gap-3">
          <ProfileInfo label="Name" value={`${character.firstName} ${character.lastName}`} />
          <div className="rounded-md border border-white/10 bg-black/20 px-5 py-4">
            <div className="flex items-center justify-between gap-5">
              <div>
                <p className="text-xs text-white/30">Level und Erfahrung</p>
                <p className="mt-1 text-base text-white">
                  {level} <span className="text-white/50">({formatNumber(experience)} / {formatNumber(nextLevelExperience)} XP)</span>
                </p>
              </div>
              <div
                className="grid h-12 w-12 shrink-0 place-items-center rounded-full text-sm font-semibold text-white"
                style={{ background: `conic-gradient(var(--unique-gold) ${progress}%, rgba(255,255,255,0.12) 0)` }}
              >
                <div className="grid h-9 w-9 place-items-center rounded-full bg-unique-panel">{level}</div>
              </div>
            </div>
          </div>
          <ProfileInfo icon={<Briefcase className="h-4 w-4" aria-hidden />} label="Organisation" value={character.organization ?? "Zivilist"} />
          <ProfileInfo icon={<Star className="h-4 w-4" aria-hidden />} label="Rang" value={character.organizationRank ?? "Keine"} />
          <ProfileInfo icon={<Banknote className="h-4 w-4" aria-hidden />} label="Bank" value={formatMoney(character.bankBalance)} />
          <ProfileInfo icon={<BadgeCent className="h-4 w-4" aria-hidden />} label="Bargeld" value={formatMoney(character.cash)} />
        </div>

        <button
          className="mt-auto flex w-full items-center justify-center gap-2 rounded-md border border-unique-gold/75 bg-unique-gold/10 px-4 py-3 text-sm font-semibold text-unique-gold transition hover:bg-unique-gold hover:text-unique-ink"
          onClick={() => emitToClient("unique:cef:selectCharacter", { characterId: character.id })}
        >
          <LogIn className="h-4 w-4" aria-hidden />
          Auswaehlen
        </button>
      </article>
    );
  }

  return (
    <article className="flex min-h-[620px] flex-col border-r border-white/10 px-8 py-12 last:border-r-0">
      <div className="text-center">
        <h2 className="text-3xl font-light text-white">{slotTitle}</h2>
        <p className="mt-2 text-sm text-white/40">{slotSubtitle}</p>
      </div>

      <div className="flex flex-1 items-center justify-center">
        <div className="max-w-xs text-center">
          <div className="mx-auto grid h-20 w-20 place-items-center rounded-full bg-white/5 text-4xl text-white/12">
            {locked ? <Lock className="h-9 w-9 text-unique-gold/70" aria-hidden /> : "?"}
          </div>
          <p className="mt-8 text-lg text-white">{locked ? "Gold Slot freischalten" : "Du kannst erstellen"}</p>
          <p className="mt-3 text-sm leading-6 text-white/40">
            {locked
              ? "Dieser Slot ist fuer einen spaeteren Premium-Charakter vorbereitet."
              : "Erstelle einen neuen Charakter und starte mit eigenen Daten in Los Santos."}
          </p>
        </div>
      </div>

      <button
        className={`flex w-full items-center justify-center gap-2 rounded-md border px-4 py-3 text-sm font-semibold transition ${
          locked
            ? "border-unique-gold/35 bg-unique-gold/10 text-unique-gold/55"
            : "border-unique-gold/75 bg-unique-gold/10 text-unique-gold hover:bg-unique-gold hover:text-unique-ink"
        }`}
        disabled={locked}
        onClick={onCreate}
      >
        {locked ? <Lock className="h-4 w-4" aria-hidden /> : <UserCog className="h-4 w-4" aria-hidden />}
        {locked ? "Gesperrt" : "Erstellen"}
      </button>
    </article>
  );
}

function SpawnSelect({ payload, message, onBack }: { payload: SpawnOptionsPayload; message: string; onBack: () => void }) {
  const iconById: Record<SpawnOptionsPayload["options"][number]["id"], React.ReactNode> = {
    server: <Plane className="h-5 w-5" aria-hidden />,
    last: <MapPin className="h-5 w-5" aria-hidden />,
    faction: <Briefcase className="h-5 w-5" aria-hidden />,
    house: <Lock className="h-5 w-5" aria-hidden />
  };

  return (
    <section className="relative flex min-h-screen items-center justify-center px-6 py-10">
      <div className="w-full max-w-5xl animate-panel">
        <header className="mb-8 flex items-end justify-between gap-5 border-b border-white/10 pb-6">
          <div>
            <p className="text-sm font-semibold uppercase tracking-[0.22em] text-unique-gold">Spawn Auswahl</p>
            <h1 className="mt-3 text-4xl font-light text-white">{payload.character.firstName} {payload.character.lastName}</h1>
          </div>
          <button
            type="button"
            className="rounded-md border border-white/10 px-4 py-2 text-sm text-white/65 transition hover:border-white/25 hover:text-white"
            onClick={onBack}
          >
            Zurueck
          </button>
        </header>

        {message ? <ErrorText message={message} compact /> : null}

        <div className="grid gap-4 md:grid-cols-2">
          {payload.options.map((option) => (
            <button
              key={option.id}
              type="button"
              disabled={!option.enabled}
              className={`min-h-44 rounded-md border p-6 text-left transition ${
                option.enabled
                  ? "border-unique-gold/45 bg-black/35 hover:border-unique-gold hover:bg-unique-gold/10"
                  : "cursor-not-allowed border-white/10 bg-black/20 opacity-45"
              }`}
              onClick={() => option.enabled && emitToClient("unique:cef:chooseSpawn", { spawnType: option.id })}
            >
              <div className="flex items-start justify-between gap-4">
                <span className={`grid h-12 w-12 place-items-center rounded-md border ${option.enabled ? "border-unique-gold/35 bg-unique-gold/10 text-unique-gold" : "border-white/10 bg-white/5 text-white/45"}`}>
                  {iconById[option.id]}
                </span>
                {!option.enabled ? <span className="rounded border border-white/10 px-2 py-1 text-xs uppercase tracking-[0.16em] text-white/40">Gesperrt</span> : null}
              </div>
              <h2 className="mt-6 text-2xl font-semibold text-white">{option.title}</h2>
              <p className="mt-3 text-sm leading-6 text-white/50">{option.description}</p>
            </button>
          ))}
        </div>
      </div>
    </section>
  );
}

type MainMenuTab = "dashboard" | "stats" | "shop" | "battlepass" | "tasks" | "property" | "finance" | "faction" | "events" | "support" | "settings";
type SupportCategoryId = "stuck" | "bug" | "player" | "account" | "shop" | "faction" | "event" | "other";

const supportCategories: Array<{ id: SupportCategoryId; label: string; description: string; icon: React.ReactNode }> = [
  { id: "stuck", label: "Stuck", description: "Feststecken, eingefroren oder Position kaputt.", icon: <Wrench className="h-4 w-4" aria-hidden /> },
  { id: "bug", label: "Bug", description: "Fehlerhafte Funktion, Anzeige oder Systemverhalten.", icon: <Bug className="h-4 w-4" aria-hidden /> },
  { id: "player", label: "Spieler", description: "Meldung zu Verhalten, RP-Situation oder Konflikt.", icon: <Users className="h-4 w-4" aria-hidden /> },
  { id: "account", label: "Account", description: "Login, Charaktere, Coins oder Kontodaten.", icon: <UserRound className="h-4 w-4" aria-hidden /> },
  { id: "shop", label: "Shop", description: "Kauf, Coins, Premium oder fehlende Inhalte.", icon: <ShoppingBag className="h-4 w-4" aria-hidden /> },
  { id: "faction", label: "Fraktion", description: "Fraktionsrechte, Rang, Dienst oder Fahrzeuge.", icon: <Flag className="h-4 w-4" aria-hidden /> },
  { id: "event", label: "Event", description: "Eventteilnahme, Belohnung oder Ablauf.", icon: <CalendarDays className="h-4 w-4" aria-hidden /> },
  { id: "other", label: "Sonstiges", description: "Alles, was in keine andere Kategorie passt.", icon: <HelpCircle className="h-4 w-4" aria-hidden /> }
];

function MainMenu({
  character,
  hudData,
  uniqueCoins,
  supportTicketResult,
  supportTickets,
  theme,
  onThemeChange,
  onThemePreset,
  onClose
}: {
  character: CharacterInfo | null;
  hudData: HudDataPayload | null;
  uniqueCoins: number;
  supportTicketResult: { ok: boolean; message: string } | null;
  supportTickets: SupportTicket[];
  theme: ThemeSettings;
  onThemeChange: (colors: Record<ThemeColorKey, string>) => void;
  onThemePreset: (preset: (typeof themePresets)[number]) => void;
  onClose: () => void;
}) {
  const [tab, setTab] = useState<MainMenuTab>("dashboard");
  const [ticketCategory, setTicketCategory] = useState<SupportCategoryId>("stuck");
  const [ticketMessage, setTicketMessage] = useState("");
  const [ticketReply, setTicketReply] = useState("");
  const [selectedTicketId, setSelectedTicketId] = useState<number | null>(null);
  const [ticketPending, setTicketPending] = useState(false);
  const [localTicketMessage, setLocalTicketMessage] = useState<{ ok: boolean; message: string } | null>(null);
  const characterId = hudData?.characterId ?? character?.id ?? 0;
  const characterName = character ? `${character.firstName} ${character.lastName}` : "Charakter";
  const coins = hudData?.uniqueCoins ?? uniqueCoins;
  const onlineSeconds = hudData?.onlineSeconds ?? 0;

  const tabs: Array<{ id: MainMenuTab; label: string; icon: React.ReactNode }> = [
    { id: "dashboard", label: "M-Menue", icon: <LayoutDashboard className="h-5 w-5" aria-hidden /> },
    { id: "stats", label: "Statistik", icon: <BarChart3 className="h-5 w-5" aria-hidden /> },
    { id: "shop", label: "Shop", icon: <ShoppingBag className="h-5 w-5" aria-hidden /> },
    { id: "battlepass", label: "Battlepass", icon: <Trophy className="h-5 w-5" aria-hidden /> },
    { id: "tasks", label: "Aufgaben", icon: <ClipboardList className="h-5 w-5" aria-hidden /> },
    { id: "property", label: "Besitz", icon: <Package className="h-5 w-5" aria-hidden /> },
    { id: "finance", label: "Finanzen", icon: <Wallet className="h-5 w-5" aria-hidden /> },
    { id: "faction", label: "Fraktion", icon: <Flag className="h-5 w-5" aria-hidden /> },
    { id: "events", label: "Events", icon: <CalendarDays className="h-5 w-5" aria-hidden /> },
    { id: "support", label: "Support", icon: <Ticket className="h-5 w-5" aria-hidden /> },
    { id: "settings", label: "Einstellungen", icon: <Settings className="h-5 w-5" aria-hidden /> }
  ];

  useEffect(() => {
    if (!supportTicketResult) {
      return;
    }
    setTicketPending(false);
    setLocalTicketMessage(supportTicketResult);
    if (supportTicketResult.ok) {
      setTicketMessage("");
    }
  }, [supportTicketResult]);

  function close() {
    emitToClient("unique:cef:mainMenuClose", {});
    onClose();
  }

  function submitTicket() {
    if (ticketPending) {
      return;
    }
    const message = ticketMessage.trim();
    if (message.length < 10) {
      setLocalTicketMessage({ ok: false, message: "Bitte beschreibe dein Anliegen etwas genauer." });
      return;
    }

    setTicketPending(true);
    setLocalTicketMessage(null);
    emitToClient("unique:cef:supportTicketCreate", { category: ticketCategory, message });
  }

  const level = Math.max(1, Number(character?.level ?? 1));
  const cash = hudData?.cash ?? character?.cash ?? 0;
  const bank = hudData?.bankBalance ?? character?.bankBalance ?? 0;
  const organization = character?.organization || "Zivilist";
  const rank = character?.organizationRank || "Kein Rang";
  const ticketCount = supportTickets.length;
  const premiumTier = "Kein Premium";
  const submitReply = (ticketId: number) => {
    const reply = ticketReply.trim();
    if (reply.length < 2) {
      setLocalTicketMessage({ ok: false, message: "Antwort ist zu kurz." });
      return;
    }
    setLocalTicketMessage(null);
    emitToClient("unique:cef:replySupportTicket", { ticketId, message: reply });
    setTicketReply("");
  };

  const fullscreenContent = tab === "support" ? (
    <MenuSupport
      category={ticketCategory}
      message={ticketMessage}
      tickets={supportTickets}
      selectedTicketId={selectedTicketId}
      pending={ticketPending}
      result={localTicketMessage}
      onCategory={setTicketCategory}
      onMessage={setTicketMessage}
      reply={ticketReply}
      onReply={setTicketReply}
      onSelectedTicket={setSelectedTicketId}
      onSubmitReply={submitReply}
      onSubmit={submitTicket}
    />
  ) : tab === "settings" ? (
    <MenuSettings theme={theme} onThemeChange={onThemeChange} onThemePreset={onThemePreset} />
  ) : tab === "tasks" ? (
    <MenuTasks />
  ) : tab === "finance" ? (
    <MenuFinance character={character} hudData={hudData} uniqueCoins={coins} />
  ) : tab === "faction" ? (
    <MenuFaction character={character} />
  ) : tab === "property" ? (
    <MenuPlaceholder icon={<Home className="h-7 w-7" />} title="Besitz" items={["Immobilien", "Fahrzeuge", "Lager", "Schluessel"]} />
  ) : tab === "events" ? (
    <MenuPlaceholder icon={<CalendarDays className="h-7 w-7" />} title="Events" items={["Aktive Events", "Anmeldungen", "Belohnungen", "Historie"]} />
  ) : tab === "battlepass" ? (
    <MenuBattlepass />
  ) : null;

  return (
    <section className="fixed inset-0 z-50 overflow-hidden bg-unique-bg font-sans text-white">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_18%_18%,rgb(var(--unique-teal-rgb)/0.16),transparent_28%),radial-gradient(circle_at_75%_80%,rgb(var(--unique-gold-rgb)/0.12),transparent_32%),linear-gradient(115deg,rgb(var(--unique-bg-rgb)),rgb(var(--unique-deep-rgb))_48%,rgb(var(--unique-ink-rgb)))]" />
      <div className="absolute inset-0 opacity-25 bg-[linear-gradient(rgba(255,255,255,0.045)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.03)_1px,transparent_1px)] bg-[size:32px_32px]" />
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,transparent_0%,rgba(0,0,0,0.36)_100%)]" />
      {tab === "dashboard" ? (
        <button type="button" className="absolute right-8 top-7 z-[65] border border-black/70 bg-black/24 px-4 py-3 text-[10px] font-black uppercase tracking-[1px] text-white/48 transition-colors hover:border-unique-danger/50 hover:text-red-200" onClick={close}>
          Schliessen ESC
        </button>
      ) : null}

      {tab === "shop" ? <MenuShopWindow coins={coins} premiumTier={premiumTier} onClose={() => setTab("dashboard")} /> : null}
      {tab === "stats" ? <MenuCharacterWindow character={character} hudData={hudData} uniqueCoins={coins} onlineSeconds={onlineSeconds} onClose={() => setTab("dashboard")} /> : null}

      {tab === "support" && fullscreenContent ? <MenuFullscreenPage eyebrow="Admin Kontakt" title="Ticketsupport" icon={<Ticket className="h-4 w-4" aria-hidden />} onClose={() => setTab("dashboard")}>{fullscreenContent}</MenuFullscreenPage> : null}
      {tab === "settings" && fullscreenContent ? <MenuFullscreenPage eyebrow="Sicherheit" title="Einstellungen" icon={<ShieldCheck className="h-4 w-4" aria-hidden />} onClose={() => setTab("dashboard")}>{fullscreenContent}</MenuFullscreenPage> : null}
      {tab !== "dashboard" && tab !== "shop" && tab !== "stats" && tab !== "support" && tab !== "settings" && fullscreenContent ? <MenuFullscreenPage eyebrow="Unique Roleplay" title={characterName} icon={<LayoutDashboard className="h-4 w-4" aria-hidden />} onClose={() => setTab("dashboard")}>{fullscreenContent}</MenuFullscreenPage> : null}

      <main className="absolute left-1/2 top-1/2 h-[660px] w-[1176px] -translate-x-1/2 -translate-y-1/2">
        <MenuPremiumPanel tier={premiumTier} />
        <MenuDailyPanel level={level} onlineSeconds={onlineSeconds} />
        <MenuCharacterTile characterName={characterName} characterId={characterId} level={level} onClick={() => setTab("stats")} />
        <MenuShopTile coins={coins} onClick={() => setTab("shop")} />

        <MenuPreviewTile id="achievements" title="Erfolge" subtitle={`Level ${level}\n${formatNumber(character?.experience ?? 0)} XP`} x={156} y={294} w={240} h={240} accent="gold" icon={<Star className="h-5 w-5" />} onClick={() => setTab("battlepass")} />
        <MenuPreviewTile id="organization" title="Organisation" subtitle={`${organization}\n${rank}`} x={416} y={180} w={240} h={354} accent="blue" icon={<Briefcase className="h-5 w-5" />} onClick={() => setTab("faction")} />
        <MenuPreviewTile id="work" title="Arbeit" subtitle={organization === "Zivilist" ? "Kein Job aktiv" : rank} x={676} y={180} w={240} h={166} accent="green" icon={<CalendarDays className="h-5 w-5" />} onClick={() => setTab("tasks")} />
        <MenuPreviewTile id="business" title="Finanzen" subtitle={`Cash ${formatMoney(cash)}\nBank ${formatMoney(bank)}`} x={936} y={180} w={240} h={166} accent="gold" icon={<BarChart3 className="h-5 w-5" />} onClick={() => setTab("finance")} />
        <MenuPreviewTile id="family" title="Familie" subtitle={character?.maritalStatus === "married" ? "Verheiratet" : "Single"} x={676} y={366} w={240} h={168} accent="pink" icon={<Users className="h-5 w-5" />} onClick={() => setTab("events")} />
        <MenuPreviewTile id="inventory" title="Inventar" subtitle="Mit I oeffnen" x={936} y={366} w={240} h={254} accent="teal" icon={<Package className="h-5 w-5" />} onClick={() => setTab("property")} />
        <MenuPreviewTile id="admin" title="Admin Kontakt" subtitle={ticketCount ? `${ticketCount} offene Tickets` : "Ticket erstellen"} x={156} y={568} w={360} h={50} accent="muted" icon={<Ticket className="h-5 w-5" />} compact onClick={() => setTab("support")} />
        <MenuPreviewTile id="settings" title="Sicherheit & Einstellungen" subtitle="ThemeEditor" x={536} y={568} w={380} h={50} accent="muted" icon={<ShieldCheck className="h-5 w-5" />} compact onClick={() => setTab("settings")} />
        <MenuPreviewTile id="earn" title="Geld verdienen" subtitle={`Online heute ${formatOnlineDuration(onlineSeconds)}\nCoins ${formatNumber(coins)}`} x={676} y={0} w={500} h={140} accent="teal" icon={<Sparkles className="h-5 w-5" />} onClick={() => setTab("tasks")} />
      </main>
    </section>
  );
}

type MenuPreviewAccent = "teal" | "gold" | "blue" | "green" | "pink" | "muted";
type MenuShopItemKind = "clothes" | "vehicle" | "generic";
type MenuShopConfirmAction = {
  itemKind: MenuShopItemKind;
  title: string;
  subtitle: string;
  price?: number;
  productId?: string;
};

function UniqueIconSvg({ size = 20, strokeWidth = 2, className = "", children }: { size?: number; strokeWidth?: number; className?: string; children: React.ReactNode }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round" className={className} aria-hidden="true">
      {children}
    </svg>
  );
}

function UniqueCashIcon(props: { size?: number; strokeWidth?: number; className?: string }) { return <UniqueIconSvg {...props}><rect x="3" y="6" width="18" height="12" rx="2" /><circle cx="12" cy="12" r="3" /><path d="M6 9h.01" /><path d="M18 15h.01" /></UniqueIconSvg>; }
function UniqueBankIcon(props: { size?: number; strokeWidth?: number; className?: string }) { return <UniqueIconSvg {...props}><path d="M3 10h18" /><path d="M5 10v9" /><path d="M9 10v9" /><path d="M15 10v9" /><path d="M19 10v9" /><path d="M3 19h18" /><path d="m12 3 9 5H3z" /></UniqueIconSvg>; }
function UniqueUserIcon(props: { size?: number; strokeWidth?: number; className?: string }) { return <UniqueIconSvg {...props}><path d="M20 21a8 8 0 0 0-16 0" /><circle cx="12" cy="7" r="4" /></UniqueIconSvg>; }
function UniqueMapPinIcon(props: { size?: number; strokeWidth?: number; className?: string }) { return <UniqueIconSvg {...props}><path d="M20 10c0 5-8 12-8 12S4 15 4 10a8 8 0 1 1 16 0Z" /><circle cx="12" cy="10" r="3" /></UniqueIconSvg>; }
function UniqueMicIcon(props: { size?: number; strokeWidth?: number; className?: string }) { return <UniqueIconSvg {...props}><rect x="9" y="2" width="6" height="12" rx="3" /><path d="M5 10a7 7 0 0 0 14 0" /><path d="M12 17v5" /><path d="M8 22h8" /></UniqueIconSvg>; }
function UniqueMicOffIcon(props: { size?: number; strokeWidth?: number; className?: string }) { return <UniqueIconSvg {...props}><rect x="9" y="2" width="6" height="12" rx="3" /><path d="M5 10a7 7 0 0 0 14 0" /><path d="M12 17v5" /><path d="M8 22h8" /><path d="M4 4 20 20" /></UniqueIconSvg>; }
function UniqueMenuIcon(props: { size?: number; strokeWidth?: number; className?: string }) { return <UniqueIconSvg {...props}><path d="M4 6h16" /><path d="M4 12h16" /><path d="M4 18h16" /></UniqueIconSvg>; }
function UniqueClockIcon(props: { size?: number; strokeWidth?: number; className?: string }) { return <UniqueIconSvg {...props}><circle cx="12" cy="12" r="9" /><path d="M12 7v5l3 2" /></UniqueIconSvg>; }
function UniqueShieldIcon(props: { size?: number; strokeWidth?: number; className?: string }) { return <UniqueIconSvg {...props}><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10Z" /></UniqueIconSvg>; }
function UniqueCoinIcon(props: { size?: number; strokeWidth?: number; className?: string }) { return <UniqueIconSvg {...props}><circle cx="12" cy="12" r="9" /><path d="M12 7v10" /><path d="M8.5 9.5A4 4 0 0 1 12 8a4 4 0 0 1 0 8 4 4 0 0 1-3.5-1.5" /></UniqueIconSvg>; }
function UniqueCrownIcon(props: { size?: number; strokeWidth?: number; className?: string }) { return <UniqueIconSvg {...props}><path d="m3 8 4 3 5-7 5 7 4-3-2 10H5z" /><path d="M5 21h14" /></UniqueIconSvg>; }

function menuPreviewAccentClass(accent: MenuPreviewAccent) {
  const classes: Record<MenuPreviewAccent, string> = {
    teal: "border-unique-teal/45 text-unique-teal hover:border-unique-teal/75",
    gold: "border-unique-gold/55 text-unique-gold hover:border-unique-gold/80",
    blue: "border-sky-500/45 text-sky-300 hover:border-sky-400/75",
    green: "border-emerald-400/45 text-emerald-300 hover:border-emerald-300/75",
    pink: "border-unique-danger/45 text-red-200 hover:border-unique-danger/75",
    muted: "border-white/12 text-white/58 hover:border-white/26"
  };
  return classes[accent];
}

function MenuPreviewTile({
  title,
  subtitle,
  x,
  y,
  w,
  h,
  accent,
  icon,
  compact = false,
  onClick
}: {
  id: string;
  title: string;
  subtitle?: string;
  x: number;
  y: number;
  w: number;
  h: number;
  accent: MenuPreviewAccent;
  icon: React.ReactNode;
  compact?: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`group absolute overflow-hidden border bg-black/30 text-left transition-[background-color,border-color,transform] duration-150 hover:-translate-y-[1px] hover:bg-white/[0.055] active:scale-[0.99] ${menuPreviewAccentClass(accent)}`}
      style={{ left: x, top: y, width: w, height: h }}
    >
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_80%_15%,rgba(255,255,255,0.08),transparent_28%),linear-gradient(135deg,rgba(255,255,255,0.035),transparent_48%,rgba(0,0,0,0.18))]" />
      <div className="pointer-events-none absolute inset-0 opacity-[0.1] bg-[linear-gradient(rgba(255,255,255,0.42)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.34)_1px,transparent_1px)] bg-[size:28px_28px]" />
      <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-current opacity-40 transition-opacity duration-150 group-hover:opacity-75" />
      {compact ? (
        <div className="relative z-10 flex h-full items-center gap-4 px-6">
          <div className="shrink-0 text-current transition-transform duration-150 group-hover:scale-105">{icon}</div>
          <div className="min-w-0">
            <h3 className="truncate text-[15px] font-black uppercase leading-none tracking-[0.8px] text-white/92">{title}</h3>
            {subtitle ? <p className="mt-1 truncate text-[9px] font-bold uppercase tracking-[0.7px] text-white/36">{subtitle}</p> : null}
          </div>
        </div>
      ) : (
        <div className="relative z-10 flex h-full flex-col justify-between p-6">
          <div className="flex items-center gap-3 text-current transition-transform duration-150 group-hover:translate-x-[2px]">{icon}</div>
          <div>
            <h3 className="whitespace-pre-line text-[17px] font-black uppercase leading-[1.08] tracking-[0.8px] text-white/92">{title}</h3>
            {subtitle ? <p className="mt-2 max-w-[250px] whitespace-pre-line text-[10px] font-bold uppercase leading-[1.35] tracking-[0.7px] text-white/42">{subtitle}</p> : null}
          </div>
        </div>
      )}
    </button>
  );
}

function MenuPremiumPanel({ tier }: { tier: string }) {
  return (
    <div className="absolute left-0 top-0 h-[156px] w-[128px] overflow-hidden border border-unique-gold/45 bg-black/34 text-center text-unique-gold transition-colors duration-150 hover:border-unique-gold/75">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_50%_10%,rgb(var(--unique-gold-rgb)/0.18),transparent_38%),linear-gradient(180deg,rgba(255,255,255,0.04),rgb(var(--unique-gold-rgb)/0.08))]" />
      <div className="relative flex h-full flex-col items-center justify-center px-4">
        <div className="flex h-11 w-11 items-center justify-center border border-unique-gold/35 bg-black/20"><Trophy className="h-5 w-5" aria-hidden /></div>
        <div className="mt-6 text-[14px] font-black uppercase leading-[1.05] tracking-[0.8px] text-white/92">Premium<br />Status</div>
        <div className="mt-3 border border-white/8 bg-black/18 px-3 py-1 text-[9px] font-black uppercase tracking-[1px] text-white/50">{tier}</div>
      </div>
    </div>
  );
}

function MenuDailyPanel({ level, onlineSeconds }: { level: number; onlineSeconds: number }) {
  return (
    <div className="absolute left-0 top-[180px] h-[388px] w-[128px] overflow-hidden border border-unique-teal/55 bg-black/30 text-center text-unique-teal transition-colors duration-150 hover:border-unique-teal/85">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_60%_20%,rgb(var(--unique-teal-rgb)/0.28),transparent_32%),linear-gradient(180deg,rgb(var(--unique-teal-rgb)/0.14),rgba(0,0,0,0.2))]" />
      <div className="relative flex h-full flex-col items-center px-4 pt-[70px]">
        <div className="flex h-10 w-10 items-center justify-center border border-unique-gold/30 bg-black/20 text-unique-gold"><ClipboardList className="h-4 w-4" aria-hidden /></div>
        <div className="mt-7 text-[14px] font-black uppercase leading-[1.05] tracking-[0.7px] text-white/90">Taegliche<br />Aufgaben</div>
        <div className="mt-5 text-[9px] font-black uppercase tracking-[1px] text-white/34">Level {level}</div>
        <div className="mt-2 text-[9px] font-black uppercase tracking-[1px] text-white/34">{formatOnlineDuration(onlineSeconds)}</div>
        <div className="mt-auto mb-[66px] flex gap-3 text-white/18"><Star className="h-3.5 w-3.5" /><Star className="h-3.5 w-3.5" /><Star className="h-3.5 w-3.5" /></div>
      </div>
    </div>
  );
}

function MenuCharacterTile({ characterName, characterId, level, onClick }: { characterName: string; characterId: number; level: number; onClick: () => void }) {
  return (
    <button type="button" onClick={onClick} className="group absolute left-[156px] top-0 h-[140px] w-[500px] overflow-hidden border border-emerald-400/18 bg-gradient-to-r from-emerald-950/70 via-black/32 to-transparent text-left transition-[border-color,transform] duration-150 hover:-translate-y-[1px] hover:border-emerald-300/45 active:scale-[0.99]">
      <div className="pointer-events-none absolute inset-0 opacity-[0.08] bg-[linear-gradient(rgba(255,255,255,0.45)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.35)_1px,transparent_1px)] bg-[size:28px_28px]" />
      <div className="absolute left-[122px] top-8 max-w-[340px] truncate text-[24px] font-light uppercase tracking-[1px] text-white/92">{characterName}</div>
      <div className="absolute left-[146px] top-[82px] flex items-center gap-2 text-[9px] font-black uppercase tracking-[0.6px] text-white/58"><BarChart3 className="h-3.5 w-3.5" aria-hidden /> ID {characterId || "0000"} / Level {level}</div>
    </button>
  );
}

function MenuShopTile({ coins, onClick }: { coins: number; onClick: () => void }) {
  return (
    <button type="button" onClick={onClick} className="group absolute left-[156px] top-[180px] h-[98px] w-[240px] overflow-hidden border border-unique-teal/45 bg-black/36 text-left text-unique-teal transition-[border-color,background-color,transform] duration-150 hover:-translate-y-[1px] hover:border-unique-teal/75 hover:bg-white/[0.055] active:scale-[0.99]">
      <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(135deg,rgba(255,255,255,0.035),transparent_48%,rgba(0,0,0,0.18))]" />
      <BadgeCent className="absolute right-4 top-4 h-12 w-12 rotate-[-16deg] text-unique-gold opacity-75 transition-transform duration-150 group-hover:translate-x-1" aria-hidden />
      <div className="relative z-10 flex h-full flex-col justify-between p-5">
        <div className="flex items-center gap-2"><ShoppingBag className="h-4.5 w-4.5" aria-hidden /><div className="text-[17px] font-black uppercase tracking-[0.8px] text-white/92">Shop</div></div>
        <div className="flex items-center gap-2 text-[10px] font-black uppercase text-unique-gold"><BadgeCent className="h-3.5 w-3.5" aria-hidden /> {formatNumber(coins)} Unique Coins</div>
      </div>
    </button>
  );
}

function MenuFullscreenPage({ eyebrow, title, icon, onClose, children }: { eyebrow: string; title: string; icon: React.ReactNode; onClose: () => void; children: React.ReactNode }) {
  return (
    <div className="absolute inset-0 z-[60] overflow-y-auto bg-unique-bg/98 text-white">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_18%_18%,rgb(var(--unique-teal-rgb)/0.14),transparent_30%),linear-gradient(115deg,rgb(var(--unique-bg-rgb)),rgb(var(--unique-panel-rgb))_48%,rgb(var(--unique-ink-rgb)))]" />
      <div className="absolute inset-0 opacity-[0.14] bg-[linear-gradient(rgba(255,255,255,0.35)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.25)_1px,transparent_1px)] bg-[size:36px_36px]" />
      <header className="relative mx-10 mt-10 flex items-center justify-between border-b border-white/8 pb-6">
        <div>
          <div className="flex items-center gap-2 text-[10px] font-black uppercase tracking-[2.4px] text-unique-teal">{icon}{eyebrow}</div>
          <h2 className="mt-2 text-[42px] font-light uppercase tracking-[1.4px] text-white/92">{title}</h2>
        </div>
        <button type="button" onClick={onClose} className="border border-white/10 bg-black/24 px-4 py-3 text-[10px] font-black uppercase tracking-[1px] text-white/48 transition-colors hover:border-unique-danger/50 hover:text-red-200">Schliessen ESC</button>
      </header>
      <main className="relative mx-10 mt-8 pb-10">{children}</main>
    </div>
  );
}

function MenuShopWindow({ coins, premiumTier, onClose }: { coins: number; premiumTier: string; onClose: () => void }) {
  const [category, setCategory] = useState("premium");
  const [confirmAction, setConfirmAction] = useState<MenuShopConfirmAction | null>(null);
  const [selectedProduct, setSelectedProduct] = useState<string | null>(null);
  const [localCoins, setLocalCoins] = useState(coins);
  const [localPremiumTier, setLocalPremiumTier] = useState(premiumTier);
  const categories = [
    { id: "premium", label: "Premium", icon: <Trophy className="h-4 w-4" aria-hidden /> },
    { id: "kleidung", label: "Kleidung", icon: <Shirt className="h-4 w-4" aria-hidden /> },
    { id: "fahrzeuge", label: "Fahrzeuge", icon: <CarFront className="h-4 w-4" aria-hidden /> },
    { id: "container", label: "Container", icon: <Package className="h-4 w-4" aria-hidden /> },
    { id: "geld", label: "Geld", icon: <BadgeCent className="h-4 w-4" aria-hidden /> },
    { id: "sonstiges", label: "Sonstiges", icon: <Star className="h-4 w-4" aria-hidden /> }
  ];
  const currentCategory = categories.find((item) => item.id === category) ?? categories[0];
  const products = category === "premium"
    ? [
        { id: "premium", title: "Premium", price: 10, description: "Basis Premium Status" },
        { id: "premiumPlus", title: "Premium+", price: 30, description: "Erweiterter Premium Status" }
      ]
    : Array.from({ length: 12 }).map((_, index) => ({
        id: `${category}-${index}`,
        title: category === "fahrzeuge" ? "Fahrzeug vorbereitet" : category === "kleidung" ? "Kleidung vorbereitet" : category === "container" ? "Container vorbereitet" : category === "geld" ? "Geldpaket vorbereitet" : "Item vorbereitet",
        price: [15, 25, 40, 65, 100, 280][index % 6],
        description: "Shop-Backend vorbereitet"
      }));
  const shownCoins = Math.max(0, localCoins);

  function openConfirm(product: { id: string; title: string; price: number; description: string }) {
    const itemKind: MenuShopItemKind = category === "kleidung" ? "clothes" : category === "fahrzeuge" ? "vehicle" : "generic";
    setConfirmAction({
      itemKind,
      title: category === "kleidung" ? "Kleidung verwalten" : category === "fahrzeuge" ? "Fahrzeug verwalten" : `${product.title} kaufen?`,
      subtitle: category === "kleidung" ? `${product.title}\n\nAnprobieren oder kaufen?` : category === "fahrzeuge" ? `${product.title}\n\nProbefahrt oder kaufen?` : product.description,
      price: product.price,
      productId: product.id
    });
  }

  function previewAction() {
    setConfirmAction(null);
  }

  function buyAction() {
    if (!confirmAction) {
      return;
    }
    if (typeof confirmAction.price === "number" && localCoins >= confirmAction.price) {
      setLocalCoins((current) => Math.max(0, current - confirmAction.price!));
      if (confirmAction.productId) {
        setSelectedProduct(confirmAction.productId);
        if (confirmAction.productId === "premium") {
          setLocalPremiumTier("Premium");
        }
        if (confirmAction.productId === "premiumPlus") {
          setLocalPremiumTier("Premium+");
        }
      }
    }
    setConfirmAction(null);
  }

  return (
    <div className="absolute inset-0 z-[60] overflow-hidden bg-unique-bg/98 text-white">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_24%_28%,rgb(var(--unique-teal-rgb)/0.13),transparent_26%),radial-gradient(circle_at_78%_60%,rgb(var(--unique-gold-rgb)/0.12),transparent_30%),linear-gradient(115deg,rgb(var(--unique-bg-rgb)),rgb(var(--unique-panel-rgb))_48%,rgb(var(--unique-ink-rgb)))]" />
      <div className="absolute inset-0 opacity-[0.12] bg-[linear-gradient(rgba(255,255,255,0.35)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.25)_1px,transparent_1px)] bg-[size:36px_36px]" />
      <aside className="absolute bottom-10 left-10 top-10 w-[260px] border-r border-white/8 pr-5">
        <div className="mb-6 border-b border-white/8 pb-5">
          <div className="flex items-center justify-between">
            <div className="text-[10px] font-black uppercase tracking-[2px] text-unique-teal">Unique Shop</div>
            <button type="button" onClick={onClose} className="border border-white/10 bg-black/24 px-3 py-2 text-[10px] font-black uppercase tracking-[1px] text-white/48 transition-colors hover:border-unique-danger/50 hover:text-red-200">ESC</button>
          </div>
          <div className="mt-4 flex items-center gap-2 text-unique-gold"><UniqueCoinIcon size={21} /><span className="text-[26px] font-black">{formatNumber(shownCoins)}</span><span className="text-[11px] font-bold text-white/40">UC</span></div>
          <div className="mt-3 border border-white/8 bg-black/22 px-4 py-3 text-[10px] font-black uppercase tracking-[1px] text-white/45">Premium: {localPremiumTier}</div>
        </div>
        <div className="space-y-2">
          {categories.map((item) => (
            <button key={item.id} type="button" onClick={() => setCategory(item.id)} className={`flex h-[52px] w-full items-center gap-4 border px-4 text-left transition-[background-color,border-color,transform] duration-150 hover:translate-x-1 ${category === item.id ? "border-unique-gold/55 bg-unique-gold/10 text-unique-gold" : "border-white/6 bg-white/[0.025] text-white/44 hover:border-unique-teal/38 hover:text-white/72"}`}>
              {item.icon}<span className="text-[12px] font-black uppercase tracking-[1.2px]">{item.label}</span>
            </button>
          ))}
        </div>
      </aside>
      <main className="absolute bottom-10 left-[330px] right-10 top-10 overflow-hidden">
        <div className="mb-6 flex items-end justify-between">
          <div>
            <div className="text-[10px] font-black uppercase tracking-[2px] text-unique-teal">Kategorie</div>
            <h2 className="mt-1 text-[38px] font-black uppercase tracking-[1.4px] text-white/92">{currentCategory.label}</h2>
          </div>
          <div className="border border-white/8 bg-black/22 px-5 py-3 text-right">
            <div className="text-[10px] font-black uppercase tracking-[1.5px] text-white/32">Premium Status</div>
            <div className="mt-1 text-[15px] font-black uppercase text-white/82">{localPremiumTier}</div>
          </div>
        </div>
        <div className="h-[calc(100%-88px)] overflow-y-auto pr-2">
          <div className={category === "premium" ? "grid grid-cols-3 gap-5 pb-10" : "grid grid-cols-4 gap-5 pb-10"}>
            {products.map((product, index) => (
              <button key={product.id} type="button" onClick={() => openConfirm(product)} className={`group relative overflow-hidden border p-6 text-left transition-[border-color,background-color,transform] duration-150 hover:-translate-y-[2px] active:scale-[0.99] ${selectedProduct === product.id ? "border-unique-gold/75 bg-unique-gold/10" : category === "premium" ? "h-[300px] border-white/10 bg-unique-panel/70 hover:border-unique-teal/55" : "h-[280px] border-white/8 bg-unique-panel/72 hover:border-unique-gold/48"}`}>
                <div className="absolute right-[-28px] top-[-28px] h-44 w-44 rounded-full bg-unique-gold/12" />
                {category === "premium" ? <Trophy className="h-9 w-9 text-unique-gold" aria-hidden /> : <div className={`absolute inset-x-6 top-9 h-[130px] ${index % 4 === 0 ? "bg-unique-gold" : index % 4 === 1 ? "bg-unique-teal" : index % 4 === 2 ? "bg-sky-500" : "bg-unique-danger"} opacity-80 transition-transform duration-150 group-hover:scale-[1.03]`} />}
                <div className={category === "premium" ? "mt-12 text-[30px] font-black uppercase text-white/92" : "absolute bottom-0 left-0 right-0 h-[92px] bg-black/32 p-4"}>
                  <div className={category === "premium" ? "" : "text-[15px] font-black uppercase leading-tight text-white/90"}>{product.title}</div>
                  <div className="mt-3 text-[12px] font-bold uppercase tracking-[0.8px] text-white/42">{product.description}</div>
                  <div className="mt-5 flex items-center gap-2 text-unique-gold"><UniqueCoinIcon size={16} /><span className="text-[20px] font-black">{product.price}</span></div>
                </div>
              </button>
            ))}
          </div>
        </div>
      </main>
      {confirmAction ? <MenuShopConfirmPopup action={confirmAction} onCancel={() => setConfirmAction(null)} onPreview={previewAction} onBuy={buyAction} /> : null}
    </div>
  );
}

function MenuShopConfirmPopup({ action, onCancel, onPreview, onBuy }: { action: MenuShopConfirmAction; onCancel: () => void; onPreview: () => void; onBuy: () => void }) {
  const isClothes = action.itemKind === "clothes";
  const isVehicle = action.itemKind === "vehicle";

  return (
    <div className="absolute inset-0 z-[70] flex items-center justify-center bg-black/90">
      <div className="w-[460px] border border-unique-gold/55 bg-[#05070b] p-6 shadow-[0_24px_80px_rgba(0,0,0,0.85)]">
        <div className="flex items-center gap-3 text-unique-gold"><UniqueCrownIcon size={24} /><div className="text-[18px] font-black uppercase tracking-[1px] text-white/92">Aktion auswaehlen</div></div>
        <div className="mt-6 text-[24px] font-black uppercase text-white/90">{action.title}</div>
        <p className="mt-2 whitespace-pre-line text-[12px] font-bold uppercase leading-5 tracking-[0.7px] text-white/42">{action.subtitle}</p>
        {typeof action.price === "number" ? <div className="mt-5 flex items-center gap-2 text-unique-gold"><UniqueCoinIcon size={19} /><span className="text-[22px] font-black">{action.price}</span><span className="text-[10px] font-black uppercase tracking-[1px] text-white/35">Unique Coins</span></div> : null}
        {isClothes || isVehicle ? (
          <div className="mt-7 grid grid-cols-3 gap-3">
            <button type="button" onClick={onCancel} className="h-11 border border-black/80 bg-black/55 text-[11px] font-black uppercase tracking-[1px] text-white/70 transition-colors hover:border-white/24 hover:text-white/90">Abbrechen</button>
            <button type="button" onClick={onPreview} className="h-11 border border-unique-teal/45 bg-unique-teal/10 text-[11px] font-black uppercase tracking-[1px] text-unique-teal transition-colors hover:bg-unique-teal/16">{isClothes ? "Anprobieren" : "Probefahrt"}</button>
            <button type="button" onClick={onBuy} className="h-11 border border-unique-gold/50 bg-unique-gold/14 text-[11px] font-black uppercase tracking-[1px] text-unique-gold transition-colors hover:bg-unique-gold/20">Kaufen</button>
          </div>
        ) : (
          <div className="mt-7 grid grid-cols-2 gap-3">
            <button type="button" onClick={onCancel} className="h-11 border border-black/80 bg-black/55 text-[11px] font-black uppercase tracking-[1px] text-white/70 transition-colors hover:border-white/24 hover:text-white/90">Abbrechen</button>
            <button type="button" onClick={onBuy} className="h-11 border border-unique-gold/50 bg-unique-gold/14 text-[11px] font-black uppercase tracking-[1px] text-unique-gold transition-colors hover:bg-unique-gold/20">Kaufen</button>
          </div>
        )}
      </div>
    </div>
  );
}

function MenuCharacterWindow({ character, hudData, uniqueCoins, onlineSeconds, onClose }: { character: CharacterInfo | null; hudData: HudDataPayload | null; uniqueCoins: number; onlineSeconds: number; onClose: () => void }) {
  const characterName = character ? `${character.firstName} ${character.lastName}` : "Charakter";
  const stats = [
    { label: "Charakter-ID", value: String(hudData?.characterId ?? character?.id ?? 0) },
    { label: "Level", value: String(character?.level ?? 1) },
    { label: "Erfahrung", value: formatNumber(character?.experience ?? 0) },
    { label: "Spielzeit", value: formatOnlineDuration(onlineSeconds) },
    { label: "Job", value: character?.organization || "Zivilist" },
    { label: "Rang", value: character?.organizationRank || "Kein Rang" },
    { label: "Bargeld", value: formatMoney(hudData?.cash ?? character?.cash ?? 0) },
    { label: "Bank", value: formatMoney(hudData?.bankBalance ?? character?.bankBalance ?? 0) },
    { label: "Unique Coins", value: formatNumber(uniqueCoins) },
    { label: "Status", value: "Aktiv" },
    { label: "Familie", value: character?.maritalStatus === "married" ? "Verheiratet" : "Single" },
    { label: "Geschlecht", value: character?.appearance?.gender === "female" ? "Weiblich" : "Maennlich" }
  ];

  return (
    <div className="absolute inset-0 z-[60] overflow-hidden bg-unique-bg/98 text-white">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_18%_18%,rgb(var(--unique-teal-rgb)/0.14),transparent_30%),linear-gradient(115deg,rgb(var(--unique-bg-rgb)),rgb(var(--unique-panel-rgb))_48%,rgb(var(--unique-ink-rgb)))]" />
      <div className="absolute inset-0 opacity-[0.14] bg-[linear-gradient(rgba(255,255,255,0.35)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.25)_1px,transparent_1px)] bg-[size:36px_36px]" />
      <header className="relative mx-10 mt-10 flex items-center justify-between border-b border-white/8 pb-6">
        <div>
          <div className="text-[10px] font-black uppercase tracking-[2.4px] text-unique-teal">Charakter</div>
          <h2 className="mt-2 text-[42px] font-light uppercase tracking-[1.4px] text-white/92">{characterName}</h2>
          <div className="mt-2 flex items-center gap-2 text-[11px] font-black uppercase tracking-[1px] text-white/42"><BarChart3 className="h-4 w-4" aria-hidden /> Charakter Statistiken</div>
        </div>
        <button type="button" onClick={onClose} className="border border-white/10 bg-black/24 px-4 py-3 text-[10px] font-black uppercase tracking-[1px] text-white/48 transition-colors hover:border-unique-danger/50 hover:text-red-200">Schliessen ESC</button>
      </header>
      <main className="relative mx-10 mt-8 grid grid-cols-[360px_1fr] gap-6">
        <section className="h-[560px] border border-unique-teal/22 bg-unique-teal/10 p-6">
          <div className="flex h-28 w-28 items-center justify-center rounded-full border border-white/10 bg-black/22 text-[34px] font-black text-white/70">{character?.level ?? 1}</div>
          <div className="mt-7 text-[11px] font-black uppercase tracking-[1.8px] text-white/34">Charakterprofil</div>
          <div className="mt-2 text-[24px] font-black uppercase text-white/90">{characterName}</div>
          <p className="mt-4 text-[12px] font-bold uppercase leading-6 tracking-[0.8px] text-white/38">Aktuelle Charakterdaten aus deinem Ingame-Account.</p>
        </section>
        <section className="grid h-[560px] grid-cols-4 gap-4 overflow-y-auto pr-2">
          {stats.map((stat) => (
            <div key={stat.label} className="h-[128px] border border-white/8 bg-black/18 p-5 transition-colors duration-150 hover:border-unique-teal/35">
              <div className="text-[9px] font-black uppercase tracking-[1.4px] text-white/32">{stat.label}</div>
              <div className="mt-8 truncate text-[18px] font-black uppercase text-white/82">{stat.value}</div>
            </div>
          ))}
        </section>
      </main>
    </div>
  );
}

function MainMenuHeader({ tab, characterName }: { tab: { label: string; icon: React.ReactNode }; characterName: string }) {
  return (
    <header className="mb-5 flex items-center justify-between gap-4 border-b border-white/10 pb-5">
      <div>
        <p className="flex items-center gap-2 text-sm font-black uppercase text-unique-gold">{tab.icon}{tab.label}</p>
        <h1 className="mt-2 text-3xl font-black leading-none">{characterName}</h1>
      </div>
      <div className="hidden text-right text-xs font-bold uppercase text-white/40 md:block">
        Unique Roleplay<br />Spielermenue
      </div>
    </header>
  );
}

function MenuDashboard({ character, hudData, uniqueCoins, onlineSeconds, onSupport }: { character: CharacterInfo | null; hudData: HudDataPayload | null; uniqueCoins: number; onlineSeconds: number; onSupport: () => void }) {
  const level = Math.max(1, Number(character?.level ?? 1));
  const experience = Math.max(0, Number(character?.experience ?? 0));
  const nextLevelExperience = getNextLevelExperience(level);
  const progress = Math.min(100, Math.round((experience / nextLevelExperience) * 100));

  return (
    <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_360px]">
      <section className="rounded-md border border-white/10 bg-white/5 p-5">
        <div className="grid gap-3 md:grid-cols-4">
          <MenuMetric label="Level" value={String(level)} icon={<Star className="h-5 w-5" aria-hidden />} />
          <MenuMetric label="Bargeld" value={formatHudMoney(hudData?.cash ?? character?.cash ?? 0)} icon={<Banknote className="h-5 w-5" aria-hidden />} />
          <MenuMetric label="Bank" value={formatHudMoney(hudData?.bankBalance ?? character?.bankBalance ?? 0)} icon={<Wallet className="h-5 w-5" aria-hidden />} />
          <MenuMetric label="Coins" value={formatNumber(uniqueCoins)} icon={<BadgeCent className="h-5 w-5" aria-hidden />} />
        </div>

        <div className="mt-5 rounded-md border border-white/10 bg-black/25 p-5">
          <div className="flex items-center justify-between gap-4">
            <div>
              <p className="text-xs font-black uppercase text-white/40">Fortschritt</p>
              <p className="mt-1 text-xl font-black">Level {level}</p>
            </div>
            <p className="text-sm font-bold text-white/55">{formatNumber(experience)} / {formatNumber(nextLevelExperience)} XP</p>
          </div>
          <div className="mt-4 h-3 overflow-hidden rounded bg-white/10">
            <div className="h-full bg-unique-gold" style={{ width: `${progress}%` }} />
          </div>
        </div>

        <div className="mt-5 grid gap-3 md:grid-cols-3">
          <MenuAction title="Support" text="Ticket erstellen" icon={<Ticket className="h-5 w-5" aria-hidden />} onClick={onSupport} />
          <MenuAction title="Battlepass" text="Saison vorbereitet" icon={<Trophy className="h-5 w-5" aria-hidden />} />
          <MenuAction title="Aufgaben" text="Tagesziele vorbereitet" icon={<ClipboardList className="h-5 w-5" aria-hidden />} />
        </div>
      </section>

      <aside className="grid content-start gap-3">
        <MenuPanel title="Status">
          <MenuInfoRow label="Online heute" value={formatOnlineDuration(onlineSeconds)} />
          <MenuInfoRow label="Fraktion" value={character?.organization || "Zivilist"} />
          <MenuInfoRow label="Rang" value={character?.organizationRank || "Keine"} />
          <MenuInfoRow label="Telefon" value={String(100000 + (hudData?.characterId ?? character?.id ?? 0))} />
        </MenuPanel>
      </aside>
    </div>
  );
}

function MenuStats({ character, hudData, uniqueCoins, onlineSeconds }: { character: CharacterInfo | null; hudData: HudDataPayload | null; uniqueCoins: number; onlineSeconds: number }) {
  const rows = [
    ["Charakter-ID", String(hudData?.characterId ?? character?.id ?? 0)],
    ["Level", String(character?.level ?? 1)],
    ["Erfahrung", formatNumber(character?.experience ?? 0)],
    ["Online heute", formatOnlineDuration(onlineSeconds)],
    ["Unique Coins", formatNumber(uniqueCoins)],
    ["Familienstand", character?.maritalStatus === "married" ? "Verheiratet" : "Single"],
    ["Geschlecht", character?.appearance?.gender === "female" ? "Weiblich" : "Maennlich"],
    ["Warnungen", "0"]
  ];

  return (
    <MenuPanel title="Statistik">
      <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
        {rows.map(([label, value]) => <MenuMetric key={label} label={label} value={value} icon={<BarChart3 className="h-5 w-5" aria-hidden />} />)}
      </div>
    </MenuPanel>
  );
}

function MenuFinance({ character, hudData, uniqueCoins }: { character: CharacterInfo | null; hudData: HudDataPayload | null; uniqueCoins: number }) {
  return (
    <div className="grid gap-5 lg:grid-cols-3">
      <MenuMetric label="Bargeld" value={formatMoney(hudData?.cash ?? character?.cash ?? 0)} icon={<Banknote className="h-6 w-6" aria-hidden />} />
      <MenuMetric label="Bankkonto" value={formatMoney(hudData?.bankBalance ?? character?.bankBalance ?? 0)} icon={<Wallet className="h-6 w-6" aria-hidden />} />
      <MenuMetric label="Unique Coins" value={formatNumber(uniqueCoins)} icon={<BadgeCent className="h-6 w-6" aria-hidden />} />
      <MenuPanel title="Transaktionen">
        <MenuEmpty text="Transaktionsverlauf vorbereitet." />
      </MenuPanel>
    </div>
  );
}

function MenuFaction({ character }: { character: CharacterInfo | null }) {
  return (
    <MenuPanel title="Fraktion">
      <div className="grid gap-3 md:grid-cols-2">
        <MenuMetric label="Organisation" value={character?.organization || "Zivilist"} icon={<Flag className="h-5 w-5" aria-hidden />} />
        <MenuMetric label="Rang" value={character?.organizationRank || "Keine"} icon={<ShieldCheck className="h-5 w-5" aria-hidden />} />
      </div>
      <MenuEmpty text="Dienststatus, Mitglieder und Rechte werden hier angebunden." />
    </MenuPanel>
  );
}

function MenuBattlepass() {
  return (
    <MenuPanel title="Battlepass">
      <div className="grid gap-4 lg:grid-cols-[1fr_280px]">
        <div className="rounded-md border border-unique-gold/30 bg-unique-gold/10 p-5">
          <p className="text-xs font-black uppercase text-unique-gold">Saison 1</p>
          <h2 className="mt-2 text-2xl font-black">Vorbereitet</h2>
          <div className="mt-6 h-3 overflow-hidden rounded bg-black/35">
            <div className="h-full w-[12%] bg-unique-gold" />
          </div>
        </div>
        <MenuEmpty text="Belohnungen und Missionen folgen." />
      </div>
    </MenuPanel>
  );
}

function MenuTasks() {
  const tasks = ["Tagesaufgabe abschliessen", "Arbeitsroute fahren", "Event besuchen", "Support-Regeln lesen"];
  return (
    <MenuPanel title="Aufgaben">
      <div className="grid gap-3">
        {tasks.map((task) => (
          <div key={task} className="flex items-center justify-between rounded-md border border-white/10 bg-black/20 px-4 py-3">
            <span className="font-bold text-white/75">{task}</span>
            <span className="text-xs font-black uppercase text-white/35">Offen</span>
          </div>
        ))}
      </div>
    </MenuPanel>
  );
}

function MenuPlaceholder({ icon, title, items }: { icon: React.ReactNode; title: string; items: string[] }) {
  return (
    <MenuPanel title={title}>
      <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
        {items.map((item) => <MenuMetric key={item} label={item} value="Vorbereitet" icon={icon} />)}
      </div>
    </MenuPanel>
  );
}

function MenuSupport({
  category,
  message,
  tickets,
  selectedTicketId,
  pending,
  result,
  reply,
  onCategory,
  onMessage,
  onReply,
  onSelectedTicket,
  onSubmitReply,
  onSubmit
}: {
  category: SupportCategoryId;
  message: string;
  tickets: SupportTicket[];
  selectedTicketId: number | null;
  pending: boolean;
  result: { ok: boolean; message: string } | null;
  reply: string;
  onCategory: (category: SupportCategoryId) => void;
  onMessage: (value: string) => void;
  onReply: (value: string) => void;
  onSelectedTicket: (ticketId: number | null) => void;
  onSubmitReply: (ticketId: number) => void;
  onSubmit: () => void;
}) {
  const selectedTicket = tickets.find((ticket) => ticket.id === selectedTicketId) ?? tickets[0] ?? null;

  return (
    <div className="grid gap-5 xl:grid-cols-[minmax(0,520px)_minmax(0,1fr)]">
      <MenuPanel title="Neues Ticket">
        <div className="grid gap-4">
          <SupportCategoryCombobox value={category} onChange={onCategory} />
          <label className="block">
            <span className="text-xs font-black uppercase text-white/45">Beschreibung</span>
            <textarea
              className="mt-2 min-h-72 w-full resize-none rounded-md border border-white/12 bg-black/35 p-4 text-sm leading-6 text-white outline-none transition placeholder:text-white/30 focus:border-unique-gold"
              value={message}
              maxLength={1200}
              placeholder="Was ist passiert? Wo bist du? Was soll ein Teammitglied pruefen?"
              onChange={(event) => onMessage(event.target.value)}
            />
          </label>
          {result ? (
            <div className={`rounded-md border px-4 py-3 text-sm font-bold ${result.ok ? "border-unique-teal/40 bg-unique-teal/10 text-unique-teal" : "border-unique-danger/40 bg-unique-danger/10 text-red-100"}`}>
              {result.message}
            </div>
          ) : null}
          <button type="button" className="flex h-12 items-center justify-center gap-2 rounded-md bg-unique-gold px-4 text-sm font-black text-unique-ink transition hover:bg-unique-gold/85 disabled:cursor-wait disabled:opacity-60" disabled={pending} onClick={onSubmit}>
            <Send className="h-4 w-4" aria-hidden />
            {pending ? "Wird gesendet" : "Ticket erstellen"}
          </button>
        </div>
      </MenuPanel>

      <MenuPanel title="Meine offenen Tickets">
        <div className="grid gap-4 lg:grid-cols-[280px_minmax(0,1fr)]">
          <div className="grid content-start gap-2">
            {tickets.length ? tickets.map((ticket) => (
              <button
                key={ticket.id}
                type="button"
                className={`rounded-md border px-3 py-3 text-left transition ${selectedTicket?.id === ticket.id ? "border-unique-gold bg-unique-gold/10" : "border-white/10 bg-black/20 hover:border-white/25"}`}
                onClick={() => onSelectedTicket(ticket.id)}
              >
                <div className="flex items-center justify-between gap-2">
                  <span className="text-sm font-black">Ticket #{ticket.id}</span>
                  <SupportBadge label={supportCategoryLabel(ticket.category)} />
                </div>
                <p className="mt-2 line-clamp-2 text-xs leading-5 text-white/50">{ticket.message}</p>
                <p className="mt-2 text-[11px] font-bold uppercase text-white/35">{supportStatusLabel(ticket.status)} / {supportPriorityLabel(ticket.priority)}</p>
              </button>
            )) : <MenuEmpty text="Du hast aktuell keine offenen Tickets." />}
          </div>

          <div className="min-h-[430px] rounded-md border border-white/10 bg-black/18 p-4">
            {selectedTicket ? (
              <>
                <div className="flex flex-wrap items-center justify-between gap-3 border-b border-white/10 pb-3">
                  <div>
                    <p className="text-lg font-black">Ticket #{selectedTicket.id}</p>
                    <p className="mt-1 text-xs font-bold uppercase text-white/40">{supportCategoryLabel(selectedTicket.category)} / {supportStatusLabel(selectedTicket.status)}</p>
                  </div>
                  {selectedTicket.assignedAdminName ? <SupportBadge label={selectedTicket.assignedAdminName} /> : <SupportBadge label="Nicht geclaimed" />}
                </div>
                <TicketTimeline messages={selectedTicket.messages} />
                <label className="mt-4 block">
                  <span className="text-xs font-black uppercase text-white/45">Antwort</span>
                  <textarea
                    className="mt-2 min-h-24 w-full resize-none rounded-md border border-white/12 bg-black/35 p-3 text-sm leading-6 text-white outline-none transition placeholder:text-white/30 focus:border-unique-gold"
                    value={reply}
                    maxLength={1200}
                    placeholder="Weitere Informationen oder Rueckfrage beantworten"
                    onChange={(event) => onReply(event.target.value)}
                  />
                </label>
                <button type="button" className="mt-3 flex h-10 items-center justify-center gap-2 rounded-md border border-unique-gold/40 bg-unique-gold/10 px-4 text-sm font-black text-unique-gold transition hover:bg-unique-gold hover:text-unique-ink" onClick={() => onSubmitReply(selectedTicket.id)}>
                  <Send className="h-4 w-4" aria-hidden />
                  Antworten
                </button>
              </>
            ) : (
              <MenuEmpty text="Waehle links ein Ticket aus, um den Verlauf zu lesen." />
            )}
          </div>
        </div>
      </MenuPanel>
    </div>
  );
}

function SupportCategoryCombobox({ value, onChange }: { value: SupportCategoryId; onChange: (value: SupportCategoryId) => void }) {
  const [open, setOpen] = useState(false);
  const selected = supportCategories.find((item) => item.id === value) ?? supportCategories[0];

  return (
    <div className="relative z-40">
      <span className="text-xs font-black uppercase text-white/45">Kategorie</span>
      <button
        type="button"
        className="mt-2 flex h-12 w-full items-center justify-between gap-3 rounded-md border border-white/12 bg-unique-panel px-4 text-left text-sm font-black text-white outline-none transition hover:border-unique-gold"
        onClick={() => setOpen((current) => !current)}
      >
        <span className="flex min-w-0 items-center gap-2">
          <span className="text-unique-gold">{selected.icon}</span>
          <span className="truncate">{selected.label}</span>
        </span>
        <ChevronDown className={`h-4 w-4 shrink-0 text-white/55 transition ${open ? "rotate-180" : ""}`} aria-hidden />
      </button>
      {open ? (
        <div className="absolute left-0 right-0 top-[76px] z-[80] max-h-80 overflow-y-auto rounded-md border border-unique-gold/45 bg-unique-ink p-2 shadow-2xl shadow-black">
          {supportCategories.map((item) => (
            <button
              key={item.id}
              type="button"
              className={`flex w-full items-start gap-3 rounded-md px-3 py-3 text-left transition ${item.id === value ? "bg-unique-gold text-unique-ink" : "text-white/75 hover:bg-white/10 hover:text-white"}`}
              onClick={() => {
                onChange(item.id);
                setOpen(false);
              }}
            >
              <span className={item.id === value ? "mt-0.5 text-unique-ink" : "mt-0.5 text-unique-gold"}>{item.icon}</span>
              <span>
                <span className="block text-sm font-black">{item.label}</span>
                <span className={item.id === value ? "mt-1 block text-xs leading-5 text-unique-ink/70" : "mt-1 block text-xs leading-5 text-white/45"}>{item.description}</span>
              </span>
            </button>
          ))}
        </div>
      ) : null}
    </div>
  );
}

function TicketTimeline({ messages }: { messages: SupportTicketMessage[] }) {
  const scrollRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const node = scrollRef.current;
    if (!node) {
      return;
    }
    node.scrollTop = node.scrollHeight;
  }, [messages.length]);

  return (
    <div ref={scrollRef} className="mt-4 max-h-[360px] space-y-3 overflow-y-auto pr-2">
      {messages.length ? messages.map((entry) => (
        <div key={entry.id} className={`rounded-md border px-3 py-3 ${entry.authorRole === "admin" ? "border-unique-gold/25 bg-unique-gold/10" : entry.authorRole === "system" ? "border-white/10 bg-white/5" : "border-unique-teal/20 bg-unique-teal/10"}`}>
          <div className="flex items-center justify-between gap-3">
            <p className="flex min-w-0 items-center gap-2 text-sm font-black">
              {entry.authorRole === "admin" ? <span className="rounded bg-unique-gold px-1.5 py-0.5 text-[10px] font-black text-unique-ink">ADMIN</span> : null}
              <span className="truncate">{entry.authorName}</span>
            </p>
            <span className="text-[11px] font-bold uppercase text-white/35">{formatDateTime(entry.createdAt)}</span>
          </div>
          <p className="mt-2 whitespace-pre-wrap text-sm leading-6 text-white/75">{entry.message}</p>
        </div>
      )) : <MenuEmpty text="Noch kein Verlauf vorhanden." />}
    </div>
  );
}

function SupportBadge({ label }: { label: string }) {
  return <span className="rounded border border-white/10 bg-white/8 px-2 py-1 text-[11px] font-black uppercase text-white/65">{label}</span>;
}

function supportCategoryLabel(category: SupportTicket["category"] | SupportCategoryId) {
  return supportCategories.find((item) => item.id === category)?.label ?? "Sonstiges";
}

function supportStatusLabel(status: SupportTicket["status"]) {
  if (status === "in_progress") {
    return "In Bearbeitung";
  }
  if (status === "closed") {
    return "Geschlossen";
  }
  return "Offen";
}

function supportPriorityLabel(priority: SupportTicket["priority"]) {
  if (priority === "critical") {
    return "Kritisch";
  }
  if (priority === "high") {
    return "Hoch";
  }
  if (priority === "low") {
    return "Niedrig";
  }
  return "Normal";
}

function MenuSettings({
  theme,
  onThemeChange,
  onThemePreset
}: {
  theme: ThemeSettings;
  onThemeChange: (colors: Record<ThemeColorKey, string>) => void;
  onThemePreset: (preset: (typeof themePresets)[number]) => void;
}) {
  const [themeCode, setThemeCode] = useState("");
  const [themeCodeMessage, setThemeCodeMessage] = useState("");
  const [selectedColorKey, setSelectedColorKey] = useState<ThemeColorKey>("gold");
  const selectedField = themeColorFields.find((field) => field.key === selectedColorKey) ?? themeColorFields[0];

  function updateColor(key: ThemeColorKey, value: string) {
    onThemeChange({ ...theme.colors, [key]: value });
  }

  function exportThemeCode() {
    const code = encodeThemeCode(theme.colors);
    setThemeCode(code);
    setThemeCodeMessage("Theme-Code erstellt.");
  }

  function importThemeCode() {
    const colors = decodeThemeCode(themeCode);
    if (!colors) {
      setThemeCodeMessage("Ungueltiger Theme-Code.");
      return;
    }
    onThemeChange(colors);
    setThemeCodeMessage("Theme wurde geladen.");
  }

  async function copyThemeCode() {
    const code = themeCode.trim() || encodeThemeCode(theme.colors);
    setThemeCode(code);

    try {
      await window.navigator.clipboard.writeText(code);
      setThemeCodeMessage("Theme-Code kopiert.");
      return;
    } catch {}

    try {
      const node = document.createElement("textarea");
      node.value = code;
      node.style.position = "fixed";
      node.style.left = "-9999px";
      document.body.appendChild(node);
      node.select();
      document.execCommand("copy");
      document.body.removeChild(node);
      setThemeCodeMessage("Theme-Code kopiert.");
    } catch {
      setThemeCodeMessage("Kopieren nicht moeglich.");
    }
  }

  return (
    <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_360px]">
      <MenuPanel title="Theme">
        <div className="grid gap-4">
          <div className="grid gap-2 md:grid-cols-3">
            {themePresets.map((preset) => (
              <button
                key={preset.id}
                type="button"
                className={`rounded-md border px-4 py-3 text-left transition ${theme.preset === preset.id ? "border-unique-gold bg-unique-gold/12 text-unique-gold" : "border-white/10 bg-black/20 text-white/70 hover:border-unique-gold/45 hover:text-white"}`}
                onClick={() => onThemePreset(preset)}
              >
                <span className="block text-sm font-black">{preset.label}</span>
                <span className="mt-3 flex gap-1.5">
                  {themeColorFields.slice(0, 5).map((field) => (
                    <span key={field.key} className="h-5 w-5 rounded-sm border border-white/10" style={{ backgroundColor: preset.colors[field.key] }} />
                  ))}
                </span>
              </button>
            ))}
          </div>

          <div className="rounded-md border border-white/10 bg-black/20 p-4">
            <div className="grid gap-4 md:grid-cols-[240px_minmax(0,1fr)]">
              <ThemeCategoryCombobox value={selectedColorKey} onChange={setSelectedColorKey} />

              <ThemeColorPicker
                field={selectedField}
                value={theme.colors[selectedField.key]}
                onChange={(value) => updateColor(selectedField.key, value)}
              />
            </div>

            <ThemePreview colors={theme.colors} />
          </div>

          <div className="rounded-md border border-white/10 bg-black/20 p-4">
            <p className="text-xs font-black uppercase text-white/40">Theme-Code</p>
            <textarea
              className="mt-3 min-h-20 w-full resize-none rounded-md border border-white/10 bg-unique-ink p-3 font-mono text-xs leading-5 text-white outline-none focus:border-unique-gold"
              value={themeCode}
              onChange={(event) => setThemeCode(event.target.value)}
              placeholder="Theme-Code einfuegen oder exportieren"
            />
            <div className="mt-3 flex flex-wrap gap-2">
              <button type="button" className="rounded-md bg-unique-gold px-4 py-2 text-sm font-black text-unique-ink" onClick={exportThemeCode}>Code erstellen</button>
              <button type="button" className="rounded-md border border-unique-teal/35 bg-unique-teal/10 px-4 py-2 text-sm font-black text-unique-teal" onClick={copyThemeCode}>Copy</button>
              <button type="button" className="rounded-md border border-white/10 bg-white/5 px-4 py-2 text-sm font-black text-white" onClick={importThemeCode}>Code laden</button>
            </div>
            {themeCodeMessage ? <p className="mt-3 text-sm font-bold text-white/55">{themeCodeMessage}</p> : null}
          </div>
        </div>
      </MenuPanel>

      <MenuPanel title="Anzeige">
        <div className="grid gap-3">
          <MenuToggle label="HUD anzeigen" defaultChecked />
          <MenuToggle label="Chat sichtbar" defaultChecked />
          <MenuToggle label="Benachrichtigungen" defaultChecked />
          <MenuToggle label="Minimaler Modus" />
        </div>
      </MenuPanel>
    </div>
  );
}

function ThemeCategoryCombobox({ value, onChange }: { value: ThemeColorKey; onChange: (value: ThemeColorKey) => void }) {
  const [open, setOpen] = useState(false);
  const selected = themeColorFields.find((field) => field.key === value) ?? themeColorFields[0];

  return (
    <div className="relative z-20">
      <span className="text-xs font-black uppercase text-white/40">Kategorie</span>
      <button
        type="button"
        className="mt-2 flex h-11 w-full items-center justify-between gap-3 rounded-md border border-white/10 bg-unique-ink px-3 text-left text-sm font-black text-white outline-none transition hover:border-unique-gold/60"
        onClick={() => setOpen((current) => !current)}
      >
        <span>{selected.label}</span>
        <ChevronDown className={`h-4 w-4 text-white/45 transition ${open ? "rotate-180" : ""}`} aria-hidden />
      </button>

      {open ? (
        <div className="absolute left-0 right-0 top-[70px] z-30 rounded-md border border-unique-gold/45 bg-unique-ink p-1 shadow-2xl shadow-black">
          {themeColorFields.map((field) => (
            <button
              key={field.key}
              type="button"
              className={`flex h-9 w-full items-center justify-between rounded px-3 text-left text-sm font-black transition ${field.key === value ? "bg-unique-gold text-unique-ink" : "text-white/65 hover:bg-white/10 hover:text-white"}`}
              onClick={() => {
                onChange(field.key);
                setOpen(false);
              }}
            >
              {field.label}
            </button>
          ))}
        </div>
      ) : null}
    </div>
  );
}

function ThemeColorPicker({ field, value, onChange }: { field: { key: ThemeColorKey; label: string }; value: string; onChange: (value: string) => void }) {
  const safeValue = normalizeHexColor(value, defaultTheme.colors[field.key]);
  const [paletteOpen, setPaletteOpen] = useState(false);
  const [paletteHue, setPaletteHue] = useState(210);
  const paletteRef = useRef<HTMLDivElement | null>(null);
  const hueRef = useRef<HTMLDivElement | null>(null);

  function pickPaletteColor(event: ReactPointerEvent<HTMLDivElement>) {
    const rect = paletteRef.current?.getBoundingClientRect();
    if (!rect) {
      return;
    }

    const x = Math.min(1, Math.max(0, (event.clientX - rect.left) / rect.width));
    const y = Math.min(1, Math.max(0, (event.clientY - rect.top) / rect.height));
    onChange(`#${hslToHex(paletteHue, x, 1 - y * 0.82)}`);
  }

  function pickHue(event: ReactPointerEvent<HTMLDivElement>) {
    const rect = hueRef.current?.getBoundingClientRect();
    if (!rect) {
      return;
    }

    const x = Math.min(1, Math.max(0, (event.clientX - rect.left) / rect.width));
    const hue = Math.round(x * 360);
    setPaletteHue(hue);
    onChange(`#${hslToHex(hue, 0.78, 0.55)}`);
  }

  return (
    <div className="relative">
      <div className="flex items-end justify-between gap-3">
        <div>
          <span className="text-xs font-black uppercase text-white/40">Farbe</span>
          <p className="mt-2 text-sm font-black text-white">{field.label}</p>
        </div>
        <button
          type="button"
          className="h-11 w-14 rounded-md border border-white/15 shadow-inner shadow-black transition hover:scale-105 hover:border-unique-gold"
          style={{ backgroundColor: safeValue }}
          onClick={() => setPaletteOpen((current) => !current)}
          aria-label={`${field.label} Palette oeffnen`}
        />
      </div>

      {paletteOpen ? (
        <div className="absolute right-0 top-14 z-40 w-[340px] rounded-md border border-unique-gold/45 bg-unique-ink p-3 shadow-2xl shadow-black">
          <div
            ref={paletteRef}
            className="h-44 cursor-crosshair rounded border border-white/10"
            style={{
              background:
                `linear-gradient(to top, #000, transparent), linear-gradient(to right, #fff, hsl(${paletteHue} 100% 50%))`
            }}
            onPointerDown={(event) => {
              event.currentTarget.setPointerCapture(event.pointerId);
              pickPaletteColor(event);
            }}
            onPointerMove={(event) => {
              if (event.buttons === 1) {
                pickPaletteColor(event);
              }
            }}
          />
          <div
            ref={hueRef}
            className="mt-3 h-7 cursor-ew-resize rounded border border-white/10"
            style={{
              background:
                "linear-gradient(to right, #ff0000, #ffff00, #00ff00, #00ffff, #0000ff, #ff00ff, #ff0000)"
            }}
            onPointerDown={(event) => {
              event.currentTarget.setPointerCapture(event.pointerId);
              pickHue(event);
            }}
            onPointerMove={(event) => {
              if (event.buttons === 1) {
                pickHue(event);
              }
            }}
          />
          <div className="mt-3 flex items-center justify-between gap-3">
            <span className="font-mono text-xs font-black text-white/55">{safeValue}</span>
            <button
              type="button"
              className="rounded border border-white/10 bg-white/[0.04] px-3 py-1.5 text-xs font-black uppercase text-white/55 transition hover:border-white/25 hover:text-white"
              onClick={() => setPaletteOpen(false)}
            >
              Fertig
            </button>
          </div>
        </div>
      ) : null}

      <div className="mt-3 grid grid-cols-9 gap-1.5">
        {customPickerColors.map((color, index) => (
          <button
            key={`${field.key}-${color}-${index}`}
            type="button"
            className={`h-7 rounded-sm border transition hover:scale-105 ${safeValue === color ? "border-unique-gold ring-2 ring-unique-gold/45" : "border-white/15 hover:border-white/60"}`}
            style={{ backgroundColor: color }}
            onClick={() => onChange(color)}
            aria-label={`${field.label} ${color}`}
          />
        ))}
      </div>

      <div className="mt-3 grid gap-3 md:grid-cols-[88px_minmax(0,1fr)]">
        <div className="flex h-11 items-center justify-center rounded-md border border-white/10 bg-unique-ink font-mono text-xs font-black text-white/65">
          {safeValue}
        </div>
        <input
          className="h-11 w-full rounded-md border border-white/10 bg-unique-ink px-3 font-mono text-sm text-white outline-none focus:border-unique-gold"
          value={value}
          maxLength={7}
          onChange={(event) => onChange(event.target.value)}
          onBlur={() => onChange(safeValue)}
        />
      </div>
    </div>
  );
}

function ThemePreview({ colors }: { colors: Record<ThemeColorKey, string> }) {
  return (
    <div className="mt-4 grid gap-2 rounded-md border border-white/10 bg-black/20 p-3">
      <div className="h-10 rounded-md" style={{ background: `linear-gradient(90deg, ${colors.teal}, ${colors.gold})` }} />
      <div className="grid grid-cols-4 gap-2">
        {themeColorFields.map((field) => (
          <span key={field.key} className="h-7 rounded-sm border border-white/10" style={{ backgroundColor: colors[field.key] }} title={field.label} />
        ))}
      </div>
    </div>
  );
}

function MenuPanel({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="rounded-md border border-white/10 bg-unique-panel/86 p-5 shadow-xl shadow-black/20">
      <h2 className="mb-4 text-lg font-black">{title}</h2>
      {children}
    </section>
  );
}

function MenuMetric({ label, value, icon }: { label: string; value: string; icon: React.ReactNode }) {
  return (
    <div className="rounded-md border border-white/10 bg-black/22 p-4">
      <p className="flex items-center gap-2 text-xs font-black uppercase text-white/40"><span className="text-unique-gold">{icon}</span>{label}</p>
      <p className="mt-3 truncate text-xl font-black text-white">{value}</p>
    </div>
  );
}

function MenuAction({ title, text, icon, onClick }: { title: string; text: string; icon: React.ReactNode; onClick?: () => void }) {
  return (
    <button type="button" className="rounded-md border border-white/10 bg-black/20 p-4 text-left transition hover:border-unique-gold/60 hover:bg-unique-gold/10" onClick={onClick}>
      <p className="flex items-center gap-2 text-sm font-black text-white">{icon}{title}</p>
      <p className="mt-2 text-sm text-white/45">{text}</p>
    </button>
  );
}

function MenuInfoRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between gap-4 border-b border-white/8 py-3 last:border-b-0">
      <span className="text-sm text-white/45">{label}</span>
      <strong className="max-w-[180px] truncate text-right text-sm text-white">{value}</strong>
    </div>
  );
}

function MenuEmpty({ text }: { text: string }) {
  return <div className="rounded-md border border-dashed border-white/12 bg-black/18 p-5 text-sm font-bold text-white/45">{text}</div>;
}

function MenuToggle({ label, defaultChecked = false }: { label: string; defaultChecked?: boolean }) {
  return (
    <label className="flex items-center justify-between rounded-md border border-white/10 bg-black/20 px-4 py-3">
      <span className="font-bold text-white/75">{label}</span>
      <input type="checkbox" className="h-5 w-5 accent-unique-gold" defaultChecked={defaultChecked} />
    </label>
  );
}

type VehicleControlState = "off" | "on" | "warn";

function VehicleHudIcon({
  size = 24,
  strokeWidth = 2.4,
  className = "",
  children
}: {
  size?: number;
  strokeWidth?: number;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={strokeWidth}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden="true"
    >
      {children}
    </svg>
  );
}

function GaugeHudIcon(props: { size?: number; strokeWidth?: number; className?: string }) {
  return (
    <VehicleHudIcon {...props}>
      <path d="M4 15a8 8 0 0 1 16 0" />
      <path d="M7 19a9 9 0 1 1 10 0" />
      <path d="M12 15l4-4" />
      <path d="M12 15h.01" />
    </VehicleHudIcon>
  );
}

function EngineHudIcon(props: { size?: number; strokeWidth?: number; className?: string }) {
  return (
    <VehicleHudIcon {...props}>
      <path d="M3 10h3l2-3h5v3h2l2 2h3v6h-3l-2 2H8l-2-3H3z" />
      <path d="M9 7V4" />
      <path d="M7 4h6" />
      <path d="M20 13h2" />
      <path d="M20 17h2" />
    </VehicleHudIcon>
  );
}

function FuelHudIcon(props: { size?: number; strokeWidth?: number; className?: string }) {
  return (
    <VehicleHudIcon {...props}>
      <path d="M6 21V5a2 2 0 0 1 2-2h6a2 2 0 0 1 2 2v16" />
      <path d="M5 21h12" />
      <path d="M8 7h6" />
      <path d="M16 8h2l3 3v7a2 2 0 0 0 2 2" />
      <path d="M20 11h-2" />
    </VehicleHudIcon>
  );
}

function CarDoorHudIcon(props: { size?: number; strokeWidth?: number; className?: string }) {
  return (
    <VehicleHudIcon {...props}>
      <path d="M5 20V7.5c0-.9.6-1.7 1.5-1.95L15 3l4 6v11" />
      <path d="M7 9h9.5" />
      <path d="M8 13h2" />
      <path d="M19 20H5" />
      <path d="M15 3v17" />
    </VehicleHudIcon>
  );
}

function clampHudValue(value: number, min = 0, max = 100) {
  return Math.min(max, Math.max(min, value));
}

function padHudSpeed(value: number) {
  return String(Math.max(0, Math.round(value))).padStart(3, "0");
}

function getVehicleControlClasses(state: VehicleControlState) {
  if (state === "on") {
    return {
      icon: "text-unique-gold drop-shadow-[0_0_7px_rgb(var(--unique-gold-rgb)/0.65)]",
      key: "border-unique-gold text-unique-gold bg-unique-gold/14 shadow-[0_0_14px_rgb(var(--unique-gold-rgb)/0.25)]"
    };
  }

  if (state === "warn") {
    return {
      icon: "text-unique-danger drop-shadow-[0_0_7px_rgb(var(--unique-danger-rgb)/0.52)]",
      key: "border-unique-danger text-unique-danger bg-unique-danger/10 shadow-[0_0_14px_rgb(var(--unique-danger-rgb)/0.20)]"
    };
  }

  return {
    icon: "text-white/68",
    key: "border-white/22 text-white/78 bg-black/12"
  };
}

function VehicleControlButton({ icon, keyLabel, state }: { icon: React.ReactNode; keyLabel: string; state: VehicleControlState }) {
  const classes = getVehicleControlClasses(state);

  return (
    <div className="flex w-[74px] flex-col items-center gap-[4px] outline-none">
      <div className={classes.icon}>{icon}</div>
      <div className={`flex h-[25px] min-w-[54px] items-center justify-center rounded-full border px-4 text-[13px] font-extrabold leading-none tracking-wide ${classes.key}`}>
        {keyLabel}
      </div>
    </div>
  );
}

function VehicleHud({ data }: { data: VehicleHudPayload }) {
  const safeFuel = clampHudValue(Number(data.fuel ?? 0));
  const safeMotorHealth = clampHudValue(Math.round(((data.motorHealth ?? 1000) / 1000) * 100));
  const engineOn = Boolean(data.engineOn);
  const isCruise = Boolean(data.cruise);
  const doorsOpen = !data.locked;

  const engineState: VehicleControlState = engineOn ? "on" : "warn";
  const cruiseState: VehicleControlState = isCruise ? "on" : "off";
  const doorState: VehicleControlState = doorsOpen ? "warn" : "off";
  const speedValue = useMemo(() => engineOn ? Number(data.speed ?? 0) : 0, [data.speed, engineOn]);

  return (
    <section className="pointer-events-none fixed bottom-8 right-8 z-[28] h-[306px] w-[420px] select-none text-white">
      <div className="relative h-[306px] w-[420px]">
        <div className="absolute left-[85px] top-[7px] h-[224px] w-[250px] rounded-full bg-unique-gold/[0.02] blur-xl" />

        <svg className="absolute left-[82px] top-[6px]" width="256" height="238" viewBox="0 0 256 238" aria-hidden="true">
          <path d="M44 210 A106 106 0 1 1 212 210" fill="none" stroke="rgba(255,255,255,0.32)" strokeWidth="7" strokeLinecap="butt" />
          <path d="M44 210 A106 106 0 1 1 212 210" fill="none" stroke="rgb(var(--unique-gold-rgb) / 0.24)" strokeWidth="3" strokeLinecap="butt" />
        </svg>

        <div className="absolute left-[58px] top-[64px] flex h-[160px] w-[42px] flex-col items-center">
          <div className="mb-3 text-[16px] font-extrabold tracking-wide text-white/90 drop-shadow-[0_0_7px_rgba(255,255,255,0.18)]">{safeMotorHealth}%</div>
          <div className="relative h-[112px] w-[12px] overflow-hidden rounded-[4px] bg-white/10 shadow-[0_0_0_2px_rgba(255,255,255,0.14),inset_0_0_10px_rgba(0,0,0,0.45)]">
            <div className="absolute bottom-0 left-0 w-full rounded-[4px] bg-gradient-to-t from-white/82 to-white shadow-[0_0_12px_rgba(255,255,255,0.32)]" style={{ height: `${safeMotorHealth}%` }} />
          </div>
          <EngineHudIcon size={20} strokeWidth={2.5} className="mt-4 text-white/88" />
        </div>

        <div className="absolute right-[58px] top-[64px] flex h-[160px] w-[42px] flex-col items-center">
          <div className="mb-3 text-[16px] font-extrabold tracking-wide text-unique-gold drop-shadow-[0_0_8px_rgb(var(--unique-gold-rgb)/0.32)]">{safeFuel}%</div>
          <div className="relative h-[112px] w-[12px] overflow-hidden rounded-[4px] bg-white/10 shadow-[0_0_0_2px_rgba(255,255,255,0.14),inset_0_0_10px_rgba(0,0,0,0.45)]">
            <div className="absolute bottom-0 left-0 w-full rounded-[4px] bg-gradient-to-t from-unique-teal to-unique-gold shadow-[0_0_14px_rgb(var(--unique-gold-rgb)/0.58)]" style={{ height: `${safeFuel}%` }} />
          </div>
          <FuelHudIcon size={20} strokeWidth={2.5} className="mt-4 text-unique-gold drop-shadow-[0_0_8px_rgb(var(--unique-gold-rgb)/0.28)]" />
        </div>

        <div className="absolute left-[130px] top-[94px] w-[160px] text-center">
          <div className="text-[58px] font-extrabold leading-none tracking-[5px] text-white/70 tabular-nums drop-shadow-[0_0_16px_rgb(var(--unique-gold-rgb)/0.12)]">
            {padHudSpeed(speedValue)}
          </div>
          <div className="mt-2 text-[18px] font-semibold leading-none tracking-[5px] text-white/42">KM/H</div>
        </div>

        <div className="absolute left-1/2 top-[242px] flex -translate-x-1/2 items-start gap-[6px]">
          <VehicleControlButton icon={<GaugeHudIcon size={20} strokeWidth={2.15} />} keyLabel="X" state={cruiseState} />
          <VehicleControlButton icon={<EngineHudIcon size={21} strokeWidth={2.15} />} keyLabel="STRG" state={engineState} />
          <VehicleControlButton icon={<CarDoorHudIcon size={21} strokeWidth={2.15} />} keyLabel="L" state={doorState} />
        </div>
      </div>
    </section>
  );
}

function WorldHud({ data, location }: { data: HudDataPayload | null; location: HudLocationPayload }) {
  const [now, setNow] = useState(() => new Date());

  useEffect(() => {
    const timer = window.setInterval(() => setNow(new Date()), 1000);
    return () => window.clearInterval(timer);
  }, []);

  const playerCount = data?.playerCount ?? 0;
  const maxPlayers = Math.max(playerCount, data?.maxPlayers ?? 100);
  const tickets = Math.max(0, Number(data?.tickets ?? 0));
  const streetName = location.street || "Unbekannte Strasse";
  const zoneName = location.crossing ? `${location.crossing} / ${location.area}` : location.area || "Unbekannte Zone";

  return (
    <section className="pointer-events-none fixed inset-0 z-20 font-sans text-white">
      <div className="absolute right-8 top-7 flex w-[380px] flex-col items-end gap-3">
        <div className="flex items-center gap-3">
          <div className="text-right">
            <div className="text-[20px] font-black uppercase tracking-[2px] text-white/92">Unique Roleplay</div>
            <div className="mt-1 text-[10px] font-black uppercase tracking-[1.7px] text-unique-gold">
              ID: <span className="text-white">{data?.characterId ?? 0}</span> | Online: <span className="text-white">{playerCount}/{maxPlayers}</span>
            </div>
          </div>
          <div className="flex h-11 w-11 items-center justify-center border border-black/70 bg-unique-gold/10 text-unique-gold"><UniqueUserIcon size={19} /></div>
        </div>

        <div className="flex flex-col items-end gap-2">
          <HudMoneyPill icon={<UniqueCashIcon size={15} />} label="Bargeld" value={formatHudMoney(data?.cash ?? 0)} accent="teal" />
          <HudMoneyPill icon={<UniqueBankIcon size={15} />} label="Bank" value={formatHudMoney(data?.bankBalance ?? 0)} accent="gold" />
        </div>
      </div>

      <div className="absolute bottom-[34px] left-[330px] flex flex-col gap-2">
        <div className="ml-[2px] flex flex-col gap-2">
          <HudKeyHint keyName="M" icon={<UniqueMenuIcon size={14} />} />
          <HudKeyHint keyName="N" icon={<UniqueMicOffIcon size={14} />} />
        </div>

        <div className="min-w-[300px] max-w-[380px] overflow-hidden border border-black/70 bg-black/30 px-4 py-3 text-white">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center border border-black/70 bg-unique-gold/10 text-unique-gold"><UniqueMapPinIcon size={17} /></div>
            <div className="min-w-0">
              <div className="truncate text-[13px] font-black uppercase tracking-[1px] text-white/88">{streetName}</div>
              <div className="mt-1 truncate text-[10px] font-black uppercase tracking-[1.4px] text-unique-gold">{zoneName}</div>
            </div>
          </div>
        </div>
      </div>

      {data?.adminMode ? <HudAdminOverlay tickets={tickets} /> : null}

      <div className="absolute bottom-8 right-8 z-20 overflow-hidden border border-black/70 bg-black/30 px-4 py-3 text-white">
        <div className="flex items-center gap-3">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center border border-black/70 bg-unique-gold/10 text-unique-gold"><UniqueClockIcon size={17} /></div>
          <div className="text-right">
            <div className="text-[18px] font-black tracking-[1px] text-white/92">{formatClock(now)}</div>
            <div className="mt-1 text-[10px] font-black uppercase tracking-[1.8px] text-unique-gold">{formatDate(now)}</div>
          </div>
        </div>
      </div>
    </section>
  );
}

function HudMoneyPill({ icon, label, value, accent = "gold" }: { icon: React.ReactNode; label: string; value: string; accent?: "gold" | "teal" }) {
  const accentClass = accent === "teal" ? "text-unique-teal" : "text-unique-gold";

  return (
    <div className={`flex h-10 min-w-[158px] items-center gap-2 border border-black/70 bg-black/30 px-3 ${accentClass}`}>
      <div>{icon}</div>
      <div className="min-w-0">
        <div className="text-[8px] font-black uppercase tracking-[1.4px] text-white/30">{label}</div>
        <div className="truncate text-[12px] font-black uppercase tracking-[0.5px] text-white/84">{value}</div>
      </div>
    </div>
  );
}

function HudKeyHint({ keyName, icon, active = false }: { keyName: string; icon: React.ReactNode; active?: boolean }) {
  return (
    <div className={`relative flex h-10 w-10 items-center justify-center overflow-visible border bg-black/30 shadow-[0_10px_24px_rgba(0,0,0,0.32)] ${active ? "border-black/70 text-emerald-300" : "border-black/70 text-white/70"}`}>
      <div className="absolute -right-[5px] -top-[5px] flex h-4 min-w-[16px] items-center justify-center border border-black/70 bg-black/80 px-[3px] text-[7px] font-black uppercase tracking-[0.7px] text-unique-gold">
        {keyName}
      </div>
      <span className={active ? "text-emerald-300" : "text-unique-gold"}>{icon}</span>
    </div>
  );
}

function HudAdminOverlay({ tickets }: { tickets: number }) {
  const danger = tickets > 5;

  return (
    <div className="absolute bottom-8 left-1/2 flex -translate-x-1/2 flex-col items-center text-center">
      <div className={danger ? "text-[24px] font-black text-red-400" : "text-[24px] font-black text-white/86"}>{tickets}</div>
      <div className="text-[10px] font-black uppercase tracking-[1.8px] text-white/40">Tickets</div>
      <div className="mt-2 flex items-center gap-2 border border-black/70 bg-black/30 px-4 py-2 text-unique-gold"><UniqueShieldIcon size={15} /><span className="text-[10px] font-black uppercase tracking-[1.5px]">Adminmodus</span></div>
    </div>
  );
}

function HudServerHeader({ characterId, online, maxOnline }: { characterId: number; online: number; maxOnline: number }) {
  return (
    <div className="text-right">
      <div className="text-3xl font-black italic leading-none">
        Unique<span className="text-unique-gold"> Roleplay</span>
      </div>
      <div className="mt-2 flex items-center justify-end gap-3 text-sm font-black">
        <span className="text-unique-gold">ID: <span className="text-white">{characterId}</span></span>
        <span className="h-4 w-px bg-unique-gold/35" />
        <span className="flex items-center gap-1 text-white">
          <Users className="h-4 w-4 text-unique-gold" aria-hidden />
          {online}/{maxOnline}
        </span>
      </div>
    </div>
  );
}

function HudMoneyLine({ icon, value, delta, muted = false }: { icon: React.ReactNode; value: string; delta: number; muted?: boolean }) {
  const deltaText = formatHudDelta(delta);

  return (
    <div className={`relative flex items-center justify-end gap-2 ${muted ? "text-white/65" : "text-white"}`}>
      {deltaText ? (
        <div className={`absolute right-0 -top-5 animate-[moneyFloat_1.45s_ease-out_forwards] text-sm font-black ${delta > 0 ? "text-unique-teal" : "text-unique-gold"}`}>
          {deltaText}
        </div>
      ) : null}
      <span className={muted ? "text-white/65" : "text-unique-gold"}>{icon}</span>
      <span className={muted ? "text-lg font-black" : "text-3xl font-black"}>{value}</span>
    </div>
  );
}

function AdminTicketCounter({ tickets }: { tickets: number }) {
  const danger = tickets > 5;

  return (
    <div className="absolute bottom-6 left-1/2 -translate-x-1/2 text-center drop-shadow-[0_2px_2px_rgba(0,0,0,.75)]">
      <div className={`flex items-center justify-center gap-2 text-3xl font-black ${danger ? "text-red-400" : "text-white"}`}>
        <Ticket className={`h-7 w-7 ${danger ? "text-red-400" : "text-unique-gold"}`} aria-hidden />
        {tickets}
      </div>
      <div className="mt-1 text-xs font-bold uppercase tracking-[0.18em] text-white/55">Tickets</div>
    </div>
  );
}

function DeathScreen({ initialSeconds }: { initialSeconds: number }) {
  const [remaining, setRemaining] = useState(Math.max(1, Math.floor(initialSeconds)));
  const [choice, setChoice] = useState<"ambulance" | "giveup" | null>(null);
  const completedRef = useRef(false);
  const maxSeconds = Math.max(remaining, 240);
  const progress = Math.max(0, Math.min(100, (remaining / maxSeconds) * 100));

  useEffect(() => {
    const timer = window.setInterval(() => {
      setRemaining((current) => Math.max(0, current - 1));
    }, 1000);

    return () => window.clearInterval(timer);
  }, []);

  useEffect(() => {
    if (remaining > 0 || completedRef.current) {
      return;
    }

    completedRef.current = true;
    emitToClient("unique:cef:deathRespawn", {});
  }, [remaining]);

  function callAmbulance() {
    if (choice) {
      return;
    }
    setChoice("ambulance");
    setRemaining(240);
  }

  function giveUp() {
    if (choice) {
      return;
    }
    setChoice("giveup");
    setRemaining(90);
  }

  return (
    <section className="fixed inset-0 z-50 flex items-end justify-center bg-black/55 px-6 py-10 backdrop-blur-[1px]">
      <div className="w-full max-w-3xl overflow-hidden rounded-lg border border-red-300/15 bg-unique-bg/82 shadow-2xl shadow-black/60">
        <div className="border-b border-white/10 bg-gradient-to-r from-red-950/35 via-black/20 to-transparent px-7 py-6">
          <p className="text-xs font-semibold uppercase tracking-[0.24em] text-red-200/80">Bewusstlos</p>
          <div className="mt-3 flex items-end justify-between gap-6">
            <div>
              <h1 className="text-4xl font-semibold text-white">Du bist verletzt</h1>
              <p className="mt-2 text-sm text-white/55">Bleib ruhig. Nach Ablauf des Timers wirst du versorgt.</p>
            </div>
            <div className="text-right">
              <p className="text-xs text-white/40">Verbleibend</p>
              <p className="font-mono text-5xl font-black text-red-100">{formatDuration(remaining)}</p>
            </div>
          </div>
        </div>

        <div className="px-7 py-6">
          <div className="h-2 overflow-hidden rounded-full bg-white/10">
            <div className="h-full rounded-full bg-gradient-to-r from-red-400 via-unique-gold to-unique-teal transition-all duration-500" style={{ width: `${progress}%` }} />
          </div>

          <div className="mt-6 grid gap-3 md:grid-cols-2">
            <button
              type="button"
              disabled={Boolean(choice)}
              className={`flex min-h-24 items-center gap-4 rounded-md border px-5 py-4 text-left transition ${
                choice === "ambulance"
                  ? "border-unique-teal bg-unique-teal/18"
                  : choice
                    ? "cursor-not-allowed border-white/10 bg-white/5 opacity-35"
                  : "border-white/10 bg-white/5 hover:border-unique-teal/55 hover:bg-unique-teal/10"
              }`}
              onClick={callAmbulance}
            >
              <span className="grid h-12 w-12 shrink-0 place-items-center rounded-md bg-unique-teal text-unique-ink">
                <ShieldCheck className="h-6 w-6" aria-hidden />
              </span>
              <span>
                <span className="block text-base font-semibold text-white">Krankenwagen rufen</span>
                <span className="mt-1 block text-sm text-white/50">Timer wird auf 04:00 gesetzt.</span>
              </span>
            </button>

            <button
              type="button"
              disabled={Boolean(choice)}
              className={`flex min-h-24 items-center gap-4 rounded-md border px-5 py-4 text-left transition ${
                choice === "giveup"
                  ? "border-red-300/70 bg-red-500/14"
                  : choice
                    ? "cursor-not-allowed border-white/10 bg-white/5 opacity-35"
                  : "border-white/10 bg-white/5 hover:border-red-300/45 hover:bg-red-500/10"
              }`}
              onClick={giveUp}
            >
              <span className="grid h-12 w-12 shrink-0 place-items-center rounded-md bg-red-400 text-black">
                <X className="h-6 w-6" aria-hidden />
              </span>
              <span>
                <span className="block text-base font-semibold text-white">Aufgeben</span>
                <span className="mt-1 block text-sm text-white/50">Timer wird auf 01:30 gesetzt.</span>
              </span>
            </button>
          </div>
        </div>
      </div>
    </section>
  );
}

function CharacterCreatorView({ draft, message, onClose }: { draft: CreatorStartPayload; message: string; onClose: () => void }) {
  const [tab, setTab] = useState<CreatorTab>("identity");
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [appearance, setAppearance] = useState<CharacterAppearance>(draft.appearance ?? defaultAppearance);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      emitToClient("unique:cef:previewAppearance", appearance);
    }, 350);

    return () => window.clearTimeout(timer);
  }, [appearance]);

  useEffect(() => {
    emitToClient("unique:cef:focusCreatorCamera", { focus: tab });
  }, [tab]);

  function update<K extends keyof CharacterAppearance>(key: K, value: CharacterAppearance[K]) {
    setAppearance((current) => ({ ...current, [key]: value }));
  }

  function updateArray(key: keyof CharacterAppearance, index: number, value: number) {
    const current = appearance[key];
    if (!Array.isArray(current)) {
      return;
    }
    const next = [...current];
    next[index] = value;
    setAppearance({ ...appearance, [key]: next });
  }

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    emitToClient("unique:cef:createCharacter", {
      slot: draft.slot,
      firstName,
      lastName,
      appearance
    });
  }

  return (
    <section className="relative flex min-h-screen items-center justify-start px-6 py-8">
      <form className="grid max-h-[92vh] w-full max-w-[760px] animate-panel grid-cols-[180px_1fr] overflow-hidden rounded-lg border border-white/10 bg-unique-ink/60 shadow-2xl shadow-black/25 backdrop-blur-sm" onSubmit={submit}>
        <aside className="border-r border-white/10 bg-black/10 p-4">
          <div className="mb-5 flex items-start justify-between gap-3">
            <div>
              <p className="text-xs uppercase tracking-[0.2em] text-unique-gold">Slot {draft.slot}</p>
              <h1 className="mt-2 text-xl font-semibold">Creator</h1>
            </div>
            <button type="button" className="rounded-md border border-white/10 p-2 text-white/65 hover:text-white" onClick={onClose}>
              <X className="h-4 w-4" aria-hidden />
            </button>
          </div>
          <div className="grid gap-2">
            <TabButton active={tab === "identity"} icon={<UserRound className="h-4 w-4" />} label="Identitaet" onClick={() => setTab("identity")} />
            <TabButton active={tab === "genetics"} icon={<Sparkles className="h-4 w-4" />} label="Genetik" onClick={() => setTab("genetics")} />
            <TabButton active={tab === "face"} icon={<SlidersHorizontal className="h-4 w-4" />} label="Gesicht" onClick={() => setTab("face")} />
            <TabButton active={tab === "details"} icon={<Brush className="h-4 w-4" />} label="Details" onClick={() => setTab("details")} />
            <TabButton active={tab === "hair"} icon={<Scissors className="h-4 w-4" />} label="Haare" onClick={() => setTab("hair")} />
            <TabButton active={tab === "clothing"} icon={<Shirt className="h-4 w-4" />} label="Kleidung" onClick={() => setTab("clothing")} />
          </div>
        </aside>

        <div className="flex min-h-0 flex-col">
          <div className="border-b border-white/10 bg-black/10 p-5">
            <div className="grid gap-4 md:grid-cols-2">
              <TextInput label="Vorname" value={firstName} onChange={setFirstName} />
              <TextInput label="Nachname" value={lastName} onChange={setLastName} />
            </div>
            {message ? <div className="mt-4"><ErrorText message={message} /></div> : null}
          </div>

          <div className="min-h-0 overflow-y-auto bg-black/5 p-5">
            {tab === "identity" ? <IdentityTab appearance={appearance} update={update} /> : null}
            {tab === "genetics" ? <GeneticsTab appearance={appearance} update={updateArray} updateValue={update} /> : null}
            {tab === "face" ? <FaceTab appearance={appearance} update={updateArray} /> : null}
            {tab === "details" ? <DetailsTab appearance={appearance} update={updateArray} /> : null}
            {tab === "hair" ? <HairTab appearance={appearance} update={updateArray} /> : null}
            {tab === "clothing" ? <ClothingTab appearance={appearance} update={updateArray} /> : null}
          </div>

          <footer className="flex items-center justify-between gap-4 border-t border-white/10 bg-black/10 p-5">
            <button type="button" className="rounded-md border border-white/10 px-4 py-3 text-sm text-white/70 hover:text-white" onClick={() => setAppearance(defaultAppearance)}>
              Zuruecksetzen
            </button>
            <button className="flex items-center justify-center gap-2 rounded-md bg-unique-gold px-5 py-3 text-sm font-semibold text-unique-ink transition hover:bg-unique-gold/85">
              <Plus className="h-4 w-4" aria-hidden />
              Charakter erstellen
            </button>
          </footer>
        </div>
      </form>
    </section>
  );
}

function IdentityTab({ appearance, update }: { appearance: CharacterAppearance; update: <K extends keyof CharacterAppearance>(key: K, value: CharacterAppearance[K]) => void }) {
  return (
    <Section title="Grundlagen" icon={<UserCog className="h-4 w-4" />}>
      <div className="grid grid-cols-2 gap-3">
        <button type="button" className={modeClass(appearance.gender === "male")} onClick={() => update("gender", "male")}>Mann</button>
        <button type="button" className={modeClass(appearance.gender === "female")} onClick={() => update("gender", "female")}>Frau</button>
      </div>
    </Section>
  );
}

function GeneticsTab({
  appearance,
  update,
  updateValue
}: {
  appearance: CharacterAppearance;
  update: (key: keyof CharacterAppearance, index: number, value: number) => void;
  updateValue: <K extends keyof CharacterAppearance>(key: K, value: CharacterAppearance[K]) => void;
}) {
  return (
    <Section title="Genetik" icon={<Sparkles className="h-4 w-4" />}>
      <div className="grid gap-3 md:grid-cols-2">
        {blendControls.map(([label, min, max, step], index) => (
          <RangeControl key={label} label={label} min={min} max={max} step={step} value={appearance.blendData[index]} onChange={(value) => update("blendData", index, value)} />
        ))}
        <RangeControl label="Augenfarbe" min={0} max={31} value={appearance.eyeColor} onChange={(value) => updateValue("eyeColor", value)} />
      </div>
    </Section>
  );
}

function FaceTab({ appearance, update }: { appearance: CharacterAppearance; update: (key: keyof CharacterAppearance, index: number, value: number) => void }) {
  return (
    <Section title="Gesichtsform" icon={<SlidersHorizontal className="h-4 w-4" />}>
      <div className="grid gap-3 md:grid-cols-2">
        {faceFeatureLabels.map((label, index) => (
          <RangeControl key={label} label={label} min={-1} max={1} step={0.1} value={appearance.faceFeatures[index]} onChange={(value) => update("faceFeatures", index, value)} />
        ))}
      </div>
    </Section>
  );
}

function DetailsTab({ appearance, update }: { appearance: CharacterAppearance; update: (key: keyof CharacterAppearance, index: number, value: number) => void }) {
  return (
    <Section title="Details und Overlays" icon={<Brush className="h-4 w-4" />}>
      <div className="grid gap-4">
        {headOverlayControls.map(([label, max], index) => (
          <div key={label} className="rounded-md border border-white/10 bg-white/5 p-3">
            <RangeControl label={label} min={-1} max={max} value={appearance.headOverlays[index]} onChange={(value) => update("headOverlays", index, value)} />
            <div className="mt-3 grid gap-3 md:grid-cols-2">
              <RangeControl label="Farbe" min={0} max={63} value={appearance.headOverlayColors[index]} onChange={(value) => update("headOverlayColors", index, value)} />
              <RangeControl label="Staerke" min={0} max={1} step={0.05} value={appearance.headOverlayOpacities[index]} onChange={(value) => update("headOverlayOpacities", index, value)} />
            </div>
          </div>
        ))}
      </div>
    </Section>
  );
}

function HairTab({ appearance, update }: { appearance: CharacterAppearance; update: (key: keyof CharacterAppearance, index: number, value: number) => void }) {
  return (
    <Section title="Haare und Bart" icon={<Scissors className="h-4 w-4" />}>
      <div className="grid gap-4">
        <RangeControl label="Haarstil" min={0} max={75} value={appearance.hair[0]} onChange={(value) => update("hair", 0, value)} />
        <ColorGrid label="Haarfarbe" value={appearance.hair[1]} onChange={(value) => update("hair", 1, value)} />
        <ColorGrid label="Haarton" value={appearance.hair[2]} onChange={(value) => update("hair", 2, value)} />
        <RangeControl label="Bartstil" min={-1} max={28} value={appearance.beard[0] === 255 ? -1 : appearance.beard[0]} onChange={(value) => update("beard", 0, value < 0 ? 255 : value)} />
        <ColorGrid label="Bartfarbe" value={appearance.beard[1]} onChange={(value) => update("beard", 1, value)} />
      </div>
    </Section>
  );
}

function ClothingTab({ appearance, update }: { appearance: CharacterAppearance; update: (key: keyof CharacterAppearance, index: number, value: number) => void }) {
  return (
    <Section title="Kleidung und Props" icon={<Shirt className="h-4 w-4" />}>
      <div className="grid gap-4">
        {clothingControls.map(([label, componentId, max]) => (
          <div key={label} className="rounded-md border border-white/10 bg-white/5 p-3">
            <RangeControl label={label} min={0} max={max} value={appearance.clothing[componentId]} onChange={(value) => update("clothing", componentId, value)} />
            <div className="mt-3">
              <RangeControl label="Textur" min={0} max={25} value={appearance.clothingTextures[componentId]} onChange={(value) => update("clothingTextures", componentId, value)} />
            </div>
          </div>
        ))}
        <div className="grid gap-4 md:grid-cols-2">
          {propControls.map(([label, propId, max], index) => (
            <div key={label} className="rounded-md border border-white/10 bg-white/5 p-3">
              <RangeControl label={label} min={-1} max={max} value={appearance.props[index]} onChange={(value) => update("props", index, value)} />
              <div className="mt-3">
                <RangeControl label="Textur" min={0} max={25} value={appearance.propTextures[index]} onChange={(value) => update("propTextures", index, value)} />
              </div>
            </div>
          ))}
        </div>
      </div>
    </Section>
  );
}

function ChatHud({ messages, open, deadOnly, onClose }: { messages: ChatMessage[]; open: boolean; deadOnly: boolean; onClose: () => void }) {
  const [input, setInput] = useState("");
  const [mode, setMode] = useState<ChatMode>("ic");
  const [faded, setFaded] = useState(false);
  const inputRef = useRef<HTMLInputElement | null>(null);
  const scrollRef = useRef<HTMLDivElement | null>(null);
  const fadeTimer = useRef<number | null>(null);
  const historyRef = useRef<string[]>([]);
  const historyIndexRef = useRef(-1);

  function clearFade() {
    if (fadeTimer.current) {
      window.clearTimeout(fadeTimer.current);
      fadeTimer.current = null;
    }
    setFaded(false);
  }

  function startFade() {
    clearFade();
    fadeTimer.current = window.setTimeout(() => setFaded(true), 9000);
  }

  function scrollToBottom(smooth = open) {
    window.requestAnimationFrame(() => {
      scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: smooth ? "smooth" : "auto" });
    });
  }

  useEffect(() => {
    if (open) {
      clearFade();
      setInput("");
      if (deadOnly) {
        setMode("ooc");
      }
      historyIndexRef.current = -1;
      window.setTimeout(() => inputRef.current?.focus(), 0);
      scrollToBottom();
      return;
    }
    startFade();
  }, [open, deadOnly]);

  useEffect(() => {
    if (deadOnly) {
      setMode("ooc");
    }
  }, [deadOnly]);

  useEffect(() => {
    if (messages.length > 0) {
      clearFade();
      scrollToBottom();
      if (!open) {
        startFade();
      }
    }
  }, [messages.length]);

  useEffect(() => () => {
    if (fadeTimer.current) {
      window.clearTimeout(fadeTimer.current);
    }
  }, []);

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    submitInput();
  }

  function submitInput() {
    const text = input.trim();
    if (!text) {
      close();
      return;
    }

    emitToClient("unique:cef:chatSubmit", { text, mode: deadOnly ? "ooc" : mode });
    if (historyRef.current[historyRef.current.length - 1] !== text) {
      historyRef.current = [...historyRef.current, text].slice(-40);
    }
    historyIndexRef.current = -1;
    setInput("");
    onClose();
  }

  function close() {
    setInput("");
    historyIndexRef.current = -1;
    inputRef.current?.blur();
    emitToClient("unique:cef:chatClose", {});
    onClose();
    startFade();
  }

  const showChat = open || (!faded && messages.length > 0);

  return (
    <section className={`pointer-events-none fixed inset-0 z-[60] transition duration-300 ${showChat ? "opacity-100" : "opacity-0"}`}>
      <style>{`
        .unique-chat-scroll-left {
          direction: rtl;
          scrollbar-color: rgba(0, 0, 0, .82) rgba(0, 0, 0, .28);
          scrollbar-width: thin;
        }
        .unique-chat-scroll-left::-webkit-scrollbar {
          width: 5px;
        }
        .unique-chat-scroll-left::-webkit-scrollbar-track {
          background: rgba(0, 0, 0, .28);
        }
        .unique-chat-scroll-left::-webkit-scrollbar-thumb {
          background: rgba(0, 0, 0, .86);
          border-radius: 999px;
        }
        .unique-chat-scroll-left > div {
          direction: ltr;
        }
      `}</style>
      <div className="pointer-events-auto absolute left-7 top-8 w-[720px] max-w-[calc(100vw-56px)]">
        <div className="relative overflow-hidden border-y border-unique-gold/18 bg-black/58 shadow-[0_0_30px_rgba(0,0,0,.28)] backdrop-blur-[2px]">
          <div className="absolute inset-0 bg-gradient-to-r from-black/35 via-black/18 to-transparent" />
          <div className="absolute right-0 top-0 h-full w-[3px] bg-unique-gold/65 shadow-[0_0_14px_rgb(var(--unique-gold-rgb)/.55)]" />
          <div className="absolute right-0 top-0 h-full w-px bg-white/10" />

          <div ref={scrollRef} onWheel={clearFade} className="unique-chat-scroll-left relative h-[260px] overflow-y-auto overflow-x-hidden py-3 pl-3 pr-4">
            <div className="flex flex-col gap-1.5">
              {messages.map((message, index) => (
                <ChatLine key={`${message.author}-${message.text}-${index}`} message={message} />
              ))}
            </div>
          </div>
          <div className="absolute right-4 top-1/2 -translate-y-1/2 text-xl font-black text-white/30">&gt;</div>
        </div>

        {open ? (
          <>
            <div className="mt-2 flex items-center gap-1.5">
              {chatModes.map((chatMode) => (
                <button
                  key={chatMode}
                  type="button"
                  disabled={deadOnly && chatMode !== "ooc"}
                  className={`h-9 min-w-[74px] rounded px-5 text-sm font-black uppercase tracking-[0.08em] transition ${
                    mode === chatMode
                      ? "bg-unique-gold text-unique-ink shadow-[0_0_18px_rgb(var(--unique-gold-rgb)/.35)]"
                      : deadOnly && chatMode !== "ooc"
                        ? "cursor-not-allowed border border-white/10 bg-black/25 text-white/25"
                        : "border border-white/10 bg-black/40 text-white/75 hover:border-unique-gold/40 hover:bg-unique-gold/10"
                  }`}
                  onClick={() => {
                    if (deadOnly && chatMode !== "ooc") {
                      return;
                    }
                    setMode(chatMode);
                    inputRef.current?.focus();
                  }}
                >
                {chatModeLabels[chatMode]}
                </button>
              ))}
              {deadOnly ? (
                <span className="ml-2 rounded border border-white/10 bg-black/45 px-3 py-2 text-xs font-bold text-white/55">
                  Bewusstlos: nur OOC
                </span>
              ) : null}
            </div>

            <form className="mt-2 flex h-[46px] items-center border-y border-unique-gold/20 bg-black/42 shadow-[0_0_22px_rgb(var(--unique-gold-rgb)/.14)] backdrop-blur-[2px]" onSubmit={submit}>
              <div className="flex h-full w-12 items-center justify-center text-2xl font-black text-unique-gold">&gt;</div>
              <input
                ref={inputRef}
                data-chat-input
                autoFocus
                maxLength={180}
                autoComplete="off"
                spellCheck={false}
                className="h-full min-w-0 flex-1 bg-transparent px-2 text-[15px] font-bold text-white outline-none placeholder:text-white/35"
                value={input}
                onChange={(event) => setInput(event.target.value)}
                onKeyDown={(event) => {
                  if (event.key === "Enter") {
                    event.preventDefault();
                    submitInput();
                  }
                  if (event.key === "Escape") {
                    event.preventDefault();
                    close();
                  }
                  if (event.key === "ArrowUp") {
                    if (historyRef.current.length > 0) {
                      const nextIndex = historyIndexRef.current < 0
                        ? historyRef.current.length - 1
                        : Math.max(0, historyIndexRef.current - 1);
                      historyIndexRef.current = nextIndex;
                      setInput(historyRef.current[nextIndex]);
                    }
                    event.preventDefault();
                  }
                  if (event.key === "ArrowDown") {
                    if (historyRef.current.length > 0 && historyIndexRef.current >= 0) {
                      const nextIndex = historyIndexRef.current + 1;
                      if (nextIndex >= historyRef.current.length) {
                        historyIndexRef.current = -1;
                        setInput("");
                      } else {
                        historyIndexRef.current = nextIndex;
                        setInput(historyRef.current[nextIndex]);
                      }
                    }
                    event.preventDefault();
                  }
                }}
                placeholder="Nachricht eingeben..."
              />
              <div className="mr-2 rounded border border-unique-gold/25 bg-unique-gold/10 px-2 py-1 text-[11px] font-black uppercase tracking-[0.12em] text-unique-gold">
                {chatModeLabels[mode]}
              </div>
              <button type="button" onClick={submitInput} className="mr-2 h-8 rounded bg-unique-gold px-4 text-xs font-black uppercase tracking-[0.1em] text-unique-ink transition hover:bg-unique-gold/85">Senden</button>
            </form>
          </>
        ) : null}
      </div>
    </section>
  );
}

function ChatLine({ message }: { message: ChatMessage }) {
  const tone = message.tone === "say" ? "ic" : message.tone;
  const time = message.time ?? getCurrentTime();
  const isAction = tone === "me" || tone === "do" || tone === "try";

  if (message.tone === "admin") {
    return (
      <div className="flex items-start gap-2 text-[15px] font-bold leading-[19px] text-red-100 drop-shadow-[0_1px_1px_rgba(0,0,0,.85)]">
        <div className="min-w-0 flex-1 break-words">
          <span className="mr-1 text-white/45">[{time}]</span>
          <span className="mr-1 text-red-200">[ADMIN]</span>
          {message.author ? <span className="mr-1 text-white">{message.author}:</span> : null}
          <span className="text-red-100">{message.text}</span>
        </div>
      </div>
    );
  }

  if (message.tone === "info" || message.tone === "error") {
    return (
      <div className="flex items-start gap-2 text-[15px] font-bold leading-[19px] drop-shadow-[0_1px_1px_rgba(0,0,0,.85)]">
        <div className="min-w-0 flex-1 break-words">
          <span className="mr-1 text-white/45">[{time}]</span>
          <span className={`mr-1 ${chatToneClass(message.tone)}`}>{chatToneLabel(message.tone)}:</span>
          <span className={chatTextClass(message.tone)}>{message.text}</span>
        </div>
      </div>
    );
  }

  return (
    <div className="flex items-start gap-2 text-[15px] font-bold leading-[19px] text-white drop-shadow-[0_1px_1px_rgba(0,0,0,.85)]">
      <div className="min-w-0 flex-1 break-words">
        <span className="mr-1 text-white/45">[{time}]</span>
        <span className={`mr-1 ${chatToneClass(message.tone)}`}>{chatToneLabel(message.tone)}:</span>
        {!isAction && message.author ? <span className="mr-1 text-white">{message.author}:</span> : null}
        <span className={chatTextClass(message.tone)}>{message.text}</span>
      </div>
    </div>
  );
}

function AdminPanel({ data, result, onClose }: { data: AdminPanelPayload; result: { ok: boolean; message: string } | null; onClose: () => void }) {
  const [tab, setTab] = useState<"admins" | "players" | "tickets" | "commands" | "permissions" | "logs">("players");
  const [openPermissionCommand, setOpenPermissionCommand] = useState<string | null>(null);
  const onlineAdmins = data.admins.filter((admin) => admin.online);
  const offlineAdmins = data.admins.filter((admin) => !admin.online);
  const commandLevels = new Map(data.commands.map((command) => [command.command, command.minLevel]));
  const visibleCommandLevels = new Map(data.commands.filter((command) => command.minLevel <= data.currentAdminLevel).map((command) => [command.command, command.minLevel]));
  const commandHelp = [
    ["/admin", "Adminmodus aktivieren oder deaktivieren"],
    ["/dim [charId]", "Dimension anzeigen"],
    ["/setdim <dimension>", "Eigene Dimension setzen"],
    ["/setdim <charId> <dimension>", "Spieler in Dimension setzen"],
    ["/msg <nachricht>", "Serverweite Admin-Nachricht senden"],
    ["/veh [modell] [r g b] [kennzeichen]", "Fahrzeug spawnen"],
    ["/dl", "Fahrzeug-Debug mit IDs ein- oder ausblenden"],
    ["/delveh <id>", "Fahrzeug anhand der /dl-ID loeschen"],
    ["/getveh <id>", "Fahrzeug anhand der /dl-ID zu dir teleportieren"],
    ["/amsg <charId> <nachricht>", "Admin-Screen an einen Spieler senden"],
    ["/ban <charId> <dauer> <grund>", "Charakter bannen, Standarddauer in Tagen"],
    ["/iban <charId> <grund>", "Account permanent bannen"],
    ["/unban <charId>", "Aktiven Charakter-Bann aufheben"],
    ["/uniban <charId>", "Permanenten Account-Bann aufheben"],
    ["/jail <charId> <dauer> <grund>", "Spieler in Dimension 1 inhaftieren, Standarddauer in Minuten"],
    ["/unjail <charId>", "Aktive Jail-Strafe aufheben"],
    ["/warn <charId> <jaildauer> <grund>", "7 Tage gueltigen Warn vergeben und Spieler jailen"],
    ["/unwarn <charId>", "Letzten aktiven Warn entfernen"],
    ["/tmute <charId> <dauer> <grund>", "Spieler vom Ticketsupport ausschliessen"],
    ["/tunmute <charId>", "Ticketsupport-Sperre aufheben"],
    ["/mute <charId> <dauer> <grund>", "Spieler vom Chat ausschliessen"],
    ["/unmute <charId>", "Chat-Sperre aufheben"],
    ["/heal", "Dich selbst heilen"],
    ["/heal <charId>", "Spieler per Charakter-ID heilen"],
    ["/armor", "Dir selbst Armor geben"],
    ["/armor <charId>", "Spieler per Charakter-ID Armor geben"],
    ["/revive", "Dich selbst wiederbeleben"],
    ["/revive <charId>", "Spieler per Charakter-ID wiederbeleben"],
    ["/addcash [charId] <betrag>", "Bargeld hinzufuegen"],
    ["/setcash [charId] <betrag>", "Bargeld setzen"],
    ["/addbank [charId] <betrag>", "Bankguthaben hinzufuegen"],
    ["/setbank [charId] <betrag>", "Bankguthaben setzen"],
    ["/adduniquecoins [charId] <betrag>", "Unique Coins hinzufuegen"],
    ["/setuniquecoins [charId] <betrag>", "Unique Coins setzen"],
    ["/setadmin <charId> <0-10>", "Adminlevel setzen"],
    ["permissions", "F3-Berechtigungstab verwalten"],
    ["logs", "F3-Adminlogs einsehen"]
  ] as const;
  const sortedCommandHelp = commandHelp
    .map(([command, description]) => {
      const key = command.replace(/^\//, "").split(/\s+/)[0].toLowerCase();
      return { command, description, key, minLevel: commandLevels.get(key) ?? 1 };
    })
    .filter((entry) => visibleCommandLevels.has(entry.key))
    .sort((a, b) => a.minLevel - b.minLevel || a.command.localeCompare(b.command));
  const commandGroups = sortedCommandHelp.reduce((groups: Map<number, Array<(typeof sortedCommandHelp)[number]>>, entry) => {
    const current = groups.get(entry.minLevel) ?? [];
    current.push(entry);
    groups.set(entry.minLevel, current);
    return groups;
  }, new Map<number, typeof sortedCommandHelp>());

  function close() {
    emitToClient("unique:cef:adminClose", {});
    onClose();
  }

  return (
    <section className="unique-admin-panel fixed inset-0 z-50 flex items-center justify-center overflow-hidden bg-[rgba(4,3,8,0.78)] text-white">
      <div className="relative flex h-full w-full overflow-hidden border border-black/80 bg-unique-ink/96 text-white shadow-[0_0_120px_rgba(0,0,0,0.65)]">
        <div className="pointer-events-none absolute left-0 top-0 h-1 w-24 bg-unique-gold" />
        <div className="pointer-events-none absolute bottom-0 right-0 h-1 w-28 bg-unique-teal" />
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_22%_12%,rgb(var(--unique-gold-rgb)/0.12),transparent_28%),radial-gradient(circle_at_80%_82%,rgb(var(--unique-teal-rgb)/0.09),transparent_28%)]" />
        <aside className="relative flex w-[330px] flex-col border-r border-black/80 bg-[linear-gradient(180deg,rgb(var(--unique-panel-rgb)/0.96),rgb(var(--unique-ink-rgb)/0.98))] p-5">
          <div className="mb-5 flex items-start justify-between">
            <div>
              <div className="text-[10px] font-black uppercase tracking-[3.2px] text-unique-gold">Unique Administration</div>
              <div className="mt-3 text-[30px] font-black uppercase leading-none text-white">Dashboard</div>
              <p className="mt-1 text-sm text-white/45">Level {data.currentAdminLevel} · {data.adminMode ? "Adminmodus aktiv" : "Adminmodus aus"}</p>
            </div>
            <button className="flex h-9 w-9 items-center justify-center border border-white/10 bg-black/18 text-white/45 transition-colors hover:border-unique-danger/45 hover:text-red-200" onClick={close}>
              <X className="h-4 w-4" aria-hidden />
            </button>
          </div>

          <div className="hidden">
            <AdminSummary icon={<Users className="h-4 w-4" />} label="Spieler online" value={String(data.players.length)} />
            <AdminSummary icon={<ShieldCheck className="h-4 w-4" />} label="Admins online" value={String(onlineAdmins.length)} />
            <AdminSummary icon={<Ticket className="h-4 w-4" />} label="Offene Tickets" value={String(data.tickets.length)} />
            <AdminSummary icon={<Terminal className="h-4 w-4" />} label="Befehle" value={String(data.commands.length)} />
          </div>

          <nav className="mt-2 flex flex-col gap-2">
            <AdminTab active={tab === "players"} label="Online Spieler" onClick={() => setTab("players")} />
            <AdminTab active={tab === "tickets"} label="Tickets" onClick={() => setTab("tickets")} />
            <AdminTab active={tab === "admins"} label="Admins" onClick={() => setTab("admins")} />
            <AdminTab active={tab === "commands"} label="Befehle" onClick={() => setTab("commands")} />
            {data.canViewLogs ? <AdminTab active={tab === "logs"} label="Logs" onClick={() => setTab("logs")} /> : null}
            {data.canManagePermissions ? <AdminTab active={tab === "permissions"} label="Berechtigungen" onClick={() => setTab("permissions")} /> : null}
          </nav>
        </aside>

        <main className="relative flex-1 overflow-hidden bg-[linear-gradient(135deg,rgb(var(--unique-bg-rgb)),rgb(var(--unique-ink-rgb))_62%,rgb(var(--unique-panel-rgb)/0.74))] p-6">
          <div className="absolute inset-0 opacity-[0.16] bg-[linear-gradient(rgba(0,0,0,0.85)_1px,transparent_1px),linear-gradient(90deg,rgba(0,0,0,0.85)_1px,transparent_1px)] bg-[size:44px_44px]" />
          <div className="relative flex h-full min-h-0 flex-col overflow-hidden">
          {result ? (
            <div className={`mb-4 shrink-0 rounded-md border px-4 py-3 text-sm font-black ${result.ok ? "border-unique-teal/35 bg-unique-teal/10 text-unique-teal" : "border-unique-danger/45 bg-unique-danger/10 text-red-100"}`}>
              {result.message}
            </div>
          ) : null}

          <div className="min-h-0 flex-1 overflow-hidden">
          {tab === "players" ? (
            <div className="grid h-full auto-rows-max gap-4 overflow-y-auto pr-2 xl:grid-cols-3">
              {data.players.length ? data.players.map((player) => (
                <section key={player.id} className="rounded-md border border-white/10 bg-white/5 p-4 transition hover:border-unique-gold/35">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="text-xs text-white/35">Charakter #{player.id}</p>
                      <h3 className="mt-1 text-lg font-semibold text-white">{player.name}</h3>
                    </div>
                    <span className="rounded-md border border-white/10 bg-black/30 px-2 py-1 text-xs text-white/70">
                      {player.adminLevel > 0 ? `Admin ${player.adminLevel}` : "Spieler"}
                    </span>
                  </div>
                  <div className="mt-4 grid gap-2 text-sm">
                    <AdminRow label="Level" value={String(player.level)} />
                    <AdminRow label="Bargeld" value={formatMoney(player.cash)} />
                    <AdminRow label="Bank" value={formatMoney(player.bankBalance)} />
                    <AdminRow label="Unique Coins" value={formatNumber(player.uniqueCoins)} />
                  </div>
                </section>
              )) : <EmptyAdminText text="Keine Spieler online." />}
            </div>
          ) : null}

          {tab === "tickets" ? <AdminTicketsSection tickets={data.tickets} currentAdminLevel={data.currentAdminLevel} /> : null}

          {tab === "admins" ? (
            <div className="grid h-full auto-rows-max gap-5 overflow-y-auto pr-2 xl:grid-cols-2">
              <AdminSection title="Online Admins">
                {onlineAdmins.length ? onlineAdmins.map((admin) => (
                  <AdminRow
                    key={`online-${admin.accountId}`}
                    label={`${admin.name}${admin.characterId ? ` (#${admin.characterId})` : ""}`}
                    value={`Level ${admin.level}`}
                  />
                )) : <EmptyAdminText text="Keine Admins online." />}
              </AdminSection>

              <AdminSection title="Offline Admins">
                {offlineAdmins.length ? offlineAdmins.map((admin) => (
                  <AdminRow key={`offline-${admin.accountId}`} label={admin.name} value={`Level ${admin.level}`} />
                )) : <EmptyAdminText text="Keine Admins offline." />}
              </AdminSection>
            </div>
          ) : null}

          {tab === "commands" ? (
            <AdminSection title="Befehle" className="h-full" bodyClassName="min-h-0 flex-1 overflow-y-auto p-4 pr-2">
              <div className="grid gap-4">
                {Array.from(commandGroups.entries()).map(([level, commands]) => (
                  <div key={level} className="rounded-md border border-white/10 bg-white/5 p-3">
                    <h3 className="mb-3 text-sm font-black uppercase text-unique-gold">Admin Level {level}</h3>
                    <div className="grid gap-2 xl:grid-cols-2">
                      {commands.map(({ command, description }) => (
                        <AdminRow key={command} label={command} value={description} />
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </AdminSection>
          ) : null}

          {tab === "logs" && data.canViewLogs ? <AdminLogsSection logs={data.logs} /> : null}

          {tab === "permissions" && data.canManagePermissions ? (
            <AdminSection title="Berechtigungen" className="h-full" bodyClassName="min-h-0 flex-1 overflow-y-auto p-4 pr-2">
              <div className="grid gap-2 xl:grid-cols-2">
                {[...data.commands].sort((a, b) => a.minLevel - b.minLevel || a.command.localeCompare(b.command)).map((command) => (
                  <div key={command.command} className="flex items-center justify-between gap-3 rounded-md border border-white/10 bg-white/5 px-4 py-3">
                    <span className="font-mono text-sm text-white">{command.command}</span>
                    <AdminLevelCombobox
                      value={command.minLevel}
                      open={openPermissionCommand === command.command}
                      onOpenChange={(open) => setOpenPermissionCommand(open ? command.command : null)}
                      onChange={(level) => emitToClient("unique:cef:setCommandPermission", { command: command.command, minLevel: level })}
                    />
                  </div>
                ))}
              </div>
            </AdminSection>
          ) : null}
          </div>
          </div>
        </main>
      </div>
    </section>
  );
}

function AdminLogsSection({ logs }: { logs: AdminLogEntry[] }) {
  const [idFilter, setIdFilter] = useState("");
  const [interactionFilter, setInteractionFilter] = useState("");
  const [fromFilter, setFromFilter] = useState({ date: "", time: "" });
  const [toFilter, setToFilter] = useState({ date: "", time: "" });
  const fromTime = parseAdminDateTimeFilter(fromFilter.date, fromFilter.time, false);
  const toTime = parseAdminDateTimeFilter(toFilter.date, toFilter.time, true);
  const normalizedInteraction = interactionFilter.trim().toLowerCase();
  const normalizedId = idFilter.trim().toLowerCase();
  const filteredLogs = logs.filter((entry) => {
    const created = new Date(entry.createdAt).getTime();
    if (fromTime && created < fromTime) {
      return false;
    }
    if (toTime && created > toTime) {
      return false;
    }
    if (normalizedId) {
      const haystack = [
        entry.id,
        entry.adminCharacterId,
        entry.adminAccountId,
        entry.adminName,
        entry.command,
        entry.rawArgs,
        entry.details,
        formatDateTime(entry.createdAt)
      ].filter((value) => value !== null && value !== undefined).join(" ").toLowerCase();
      if (!haystack.includes(normalizedId)) {
        return false;
      }
    }
    if (normalizedInteraction) {
      const haystack = [
        entry.command,
        entry.rawArgs,
        entry.details,
        entry.adminName,
        entry.success ? "ok erfolgreich success" : "fehler error fehlgeschlagen"
      ].filter((value) => value !== null && value !== undefined).join(" ").toLowerCase();
      if (!haystack.includes(normalizedInteraction)) {
        return false;
      }
    }
    return true;
  });

  return (
    <AdminSection title={`Admin Logs (${filteredLogs.length}/${logs.length})`} className="h-full" bodyClassName="flex min-h-0 flex-1 flex-col p-4">
      <div className="mb-4 grid shrink-0 gap-3 xl:grid-cols-4">
        <label className="rounded-md border border-white/10 bg-white/5 p-3">
          <span className="text-[11px] font-black uppercase text-white/35">ID / Admin / Spieler</span>
          <input className="mt-2 h-10 w-full rounded-md border border-white/10 bg-unique-ink px-3 text-sm text-white outline-none focus:border-unique-gold" value={idFilter} onChange={(event) => setIdFilter(event.target.value)} onKeyDown={(event) => event.stopPropagation()} placeholder="z.B. 2 oder Nate" />
        </label>
        <label className="rounded-md border border-white/10 bg-white/5 p-3">
          <span className="text-[11px] font-black uppercase text-white/35">Interaktion</span>
          <input className="mt-2 h-10 w-full rounded-md border border-white/10 bg-unique-ink px-3 text-sm text-white outline-none focus:border-unique-gold" value={interactionFilter} onChange={(event) => setInteractionFilter(event.target.value)} onKeyDown={(event) => event.stopPropagation()} placeholder="mute, getveh, Grund..." />
        </label>
        <AdminDateTimeFilter label="Von" value={fromFilter} onChange={setFromFilter} />
        <AdminDateTimeFilter label="Bis" value={toFilter} onChange={setToFilter} />
      </div>
      <div className="grid min-h-0 flex-1 content-start gap-2 overflow-y-auto pr-1">
        {filteredLogs.length ? filteredLogs.map((entry) => (
          <div key={entry.id} className="rounded-md border border-white/10 bg-white/5 px-4 py-3">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="min-w-0">
                <p className="flex flex-wrap items-center gap-2 text-sm font-black text-white">
                  <span className={entry.success ? "text-unique-teal" : "text-unique-danger"}>{entry.success ? "OK" : "FEHLER"}</span>
                  <span className="font-mono text-unique-gold">/{entry.command}</span>
                  <span className="truncate text-white/75">{entry.rawArgs}</span>
                </p>
                <p className="mt-1 text-xs text-white/45">{entry.adminName}{entry.details ? ` / ${entry.details}` : ""}</p>
              </div>
              <span className="shrink-0 text-xs font-bold uppercase text-white/35">{formatDateTime(entry.createdAt)}</span>
            </div>
          </div>
        )) : <EmptyAdminText text="Keine Logs fuer diesen Filter." />}
      </div>
    </AdminSection>
  );
}

function AdminDateTimeFilter({
  label,
  value,
  onChange
}: {
  label: string;
  value: { date: string; time: string };
  onChange: (value: { date: string; time: string }) => void;
}) {
  return (
    <label className="rounded-md border border-white/10 bg-white/5 p-3">
      <span className="text-[11px] font-black uppercase text-white/35">{label}</span>
      <div className="mt-2 grid grid-cols-[1fr_86px] gap-2">
        <input
          className="h-10 w-full rounded-md border border-white/10 bg-unique-ink px-3 text-sm text-white outline-none focus:border-unique-gold"
          value={value.date}
          inputMode="numeric"
          onChange={(event) => onChange({ ...value, date: event.target.value.replace(/[^\d.]/g, "").slice(0, 10) })}
          onKeyDown={(event) => event.stopPropagation()}
          placeholder="TT.MM.JJJJ"
        />
        <input
          className="h-10 w-full rounded-md border border-white/10 bg-unique-ink px-3 text-sm text-white outline-none focus:border-unique-gold"
          value={value.time}
          inputMode="numeric"
          onChange={(event) => onChange({ ...value, time: event.target.value.replace(/[^\d:]/g, "").slice(0, 5) })}
          onKeyDown={(event) => event.stopPropagation()}
          placeholder="HH:MM"
        />
      </div>
    </label>
  );
}

function AdminLevelCombobox({ value, open, onOpenChange, onChange }: { value: number; open: boolean; onOpenChange: (open: boolean) => void; onChange: (level: number) => void }) {
  const levels = Array.from({ length: 10 }, (_, index) => index + 1);

  return (
    <div className={`relative w-36 ${open ? "z-[1000]" : "z-40"}`}>
      <button
        type="button"
        className="flex h-10 w-full items-center justify-between gap-2 rounded-md border border-white/10 bg-unique-ink px-3 text-left text-sm font-black text-white outline-none transition hover:border-unique-gold"
        onClick={() => onOpenChange(!open)}
      >
        Level {value}
        <ChevronDown className={`h-4 w-4 text-white/55 transition ${open ? "rotate-180" : ""}`} aria-hidden />
      </button>
      {open ? (
        <div className="absolute right-0 top-12 z-[1001] grid w-full gap-1 rounded-md border border-unique-gold/45 bg-unique-ink p-2 shadow-2xl shadow-black">
          {levels.map((level) => (
            <button
              key={level}
              type="button"
              className={`rounded-md px-3 py-2 text-left text-sm font-black transition ${level === value ? "bg-unique-gold text-unique-ink" : "text-white/75 hover:bg-white/10 hover:text-white"}`}
              onClick={() => {
                onChange(level);
                onOpenChange(false);
              }}
            >
              Level {level}
            </button>
          ))}
        </div>
      ) : null}
    </div>
  );
}

function AdminTab({ active, label, onClick }: { active: boolean; label: string; onClick: () => void }) {
  return (
    <button
      type="button"
      className={`group relative h-12 overflow-hidden border px-4 text-left text-[12px] font-black uppercase tracking-[0.9px] transition-[border-color,background-color,transform] duration-150 hover:translate-x-1 ${active ? "border-unique-gold/50 bg-unique-gold/12 text-white" : "border-white/7 bg-unique-ink text-white/52 hover:border-unique-gold/35 hover:text-white/82"}`}
      onClick={onClick}
    >
      {active ? <div className="absolute inset-y-0 left-0 w-[3px] bg-unique-gold" /> : null}
      {label}
    </button>
  );
}

function AdminTicketsSection({ tickets, currentAdminLevel }: { tickets: SupportTicket[]; currentAdminLevel: number }) {
  const [selectedTicketId, setSelectedTicketId] = useState<number | null>(tickets[0]?.id ?? null);
  const [reply, setReply] = useState("");
  const selected = tickets.find((ticket) => ticket.id === selectedTicketId) ?? tickets[0] ?? null;

  useEffect(() => {
    if (!selectedTicketId || !tickets.some((ticket) => ticket.id === selectedTicketId)) {
      setSelectedTicketId(tickets[0]?.id ?? null);
    }
  }, [tickets, selectedTicketId]);

  function updateTicket(ticketId: number, payload: Record<string, unknown>) {
    emitToClient("unique:cef:updateSupportTicket", { ticketId, ...payload });
  }

  function submitReply(closeAfter = false) {
    if (!selected) {
      return;
    }
    const message = reply.trim();
    if (closeAfter) {
      updateTicket(selected.id, { action: "close", message });
      setReply("");
      return;
    }
    if (message.length < 2) {
      return;
    }
    updateTicket(selected.id, { action: "reply", message });
    setReply("");
  }

  if (!tickets.length) {
    return <AdminSection title="Tickets"><EmptyAdminText text="Keine offenen Tickets." /></AdminSection>;
  }

  return (
    <div className="grid items-start gap-4 xl:grid-cols-[360px_minmax(0,1fr)]">
      <AdminSection title="Offene Tickets" className="max-h-[calc(100vh-13rem)] overflow-hidden">
        <div className="grid max-h-[calc(100vh-18rem)] content-start gap-2 overflow-y-auto pr-1">
          {tickets.map((ticket) => (
            <button
              key={ticket.id}
              type="button"
              className={`rounded-md border px-3 py-3 text-left transition ${selected?.id === ticket.id ? "border-unique-gold bg-unique-gold/10" : "border-white/10 bg-white/5 hover:border-white/25"}`}
              onClick={() => setSelectedTicketId(ticket.id)}
            >
              <div className="flex items-center justify-between gap-2">
                <span className="font-black">#{ticket.id} {ticket.characterName}</span>
                <SupportBadge label={supportPriorityLabel(ticket.priority)} />
              </div>
              <p className="mt-2 line-clamp-2 text-xs leading-5 text-white/50">{ticket.message}</p>
              <p className="mt-2 text-[11px] font-bold uppercase text-white/35">
                {supportCategoryLabel(ticket.category)} / {supportStatusLabel(ticket.status)}{ticket.assignedAdminName ? ` / ${ticket.assignedAdminName}` : ""}
              </p>
            </button>
          ))}
        </div>
      </AdminSection>

      {selected ? (
        <AdminSection title={`Ticket #${selected.id}`}>
          <div className="grid gap-4 2xl:grid-cols-[minmax(0,1fr)_320px]">
            <div>
              <div className="grid gap-2 md:grid-cols-4">
                <AdminTicketCombobox label="Kategorie" value={selected.category} options={supportCategories.map((item) => ({ value: item.id, label: item.label, icon: item.icon }))} onChange={(category) => updateTicket(selected.id, { action: "classify", category, priority: selected.priority })} />
                <AdminTicketCombobox label="Schwere" value={selected.priority} options={[{ value: "low", label: "Niedrig" }, { value: "normal", label: "Normal" }, { value: "high", label: "Hoch" }, { value: "critical", label: "Kritisch" }]} onChange={(priority) => updateTicket(selected.id, { action: "classify", category: selected.category, priority })} />
                <AdminInfoBox label="Status" value={supportStatusLabel(selected.status)} />
                <AdminInfoBox label="Claim" value={selected.assignedAdminName ?? "Offen"} />
              </div>

              <TicketTimeline messages={selected.messages} />

              <label className="mt-4 block">
                <span className="text-xs font-black uppercase tracking-[0.12em] text-white/45">Antwort / Abschlussnotiz</span>
                <textarea
                  className="mt-2 min-h-28 w-full resize-none rounded-md border border-white/10 bg-black/30 p-3 text-sm leading-6 text-white outline-none focus:border-unique-gold"
                  value={reply}
                  maxLength={1200}
                  onChange={(event) => setReply(event.target.value)}
                  placeholder="Antwort an den Spieler oder interne Abschlussnotiz"
                />
              </label>

              <div className="mt-3 flex flex-wrap gap-2">
                <button type="button" className="rounded-md bg-unique-gold px-4 py-2 text-sm font-black text-unique-ink" onClick={() => updateTicket(selected.id, { action: "claim" })}>Claimen</button>
                <button type="button" className="rounded-md border border-white/10 bg-white/5 px-4 py-2 text-sm font-black text-white" onClick={() => submitReply(false)}>Antworten</button>
                <button type="button" className="rounded-md border border-unique-teal/40 bg-unique-teal/10 px-4 py-2 text-sm font-black text-unique-teal" onClick={() => updateTicket(selected.id, { action: "request_help", level: Math.min(10, currentAdminLevel + 1) })}>Höhere Admins anfragen</button>
                <button type="button" className="rounded-md border border-unique-danger/45 bg-unique-danger/10 px-4 py-2 text-sm font-black text-red-100" onClick={() => submitReply(true)}>Schließen</button>
              </div>
            </div>

            <aside className="grid content-start gap-3">
              <div className="grid gap-2 rounded-md border border-white/10 bg-white/5 p-3">
                <p className="text-[11px] font-black uppercase text-white/35">Shortcuts</p>
                <AdminTicketShortcutButton icon={<MapPin className="h-4 w-4" />} label="Zum Spieler" disabled={!selected.ownerOnline} onClick={() => updateTicket(selected.id, { action: "goto_player" })} />
                <AdminTicketShortcutButton icon={<Users className="h-4 w-4" />} label="Spieler zu mir" disabled={!selected.ownerOnline} onClick={() => updateTicket(selected.id, { action: "bring_player" })} />
                <AdminTicketShortcutButton icon={<Eye className="h-4 w-4" />} label="Spectate" disabled={!selected.ownerOnline} onClick={() => updateTicket(selected.id, { action: "spectate_player" })} />
              </div>
              <AdminInfoBox label="Spieler" value={`${selected.characterName} (#${selected.characterId})`} />
              <AdminInfoBox label="Verbindung" value={selected.ownerOnline ? "Online" : "Offline"} />
              <AdminInfoBox label="Erstellt" value={formatDateTime(selected.createdAt)} />
              <AdminInfoBox label="Aktualisiert" value={formatDateTime(selected.updatedAt)} />
              <AdminInfoBox label="Eskalation" value={selected.escalatedToLevel ? `Ab Admin Level ${selected.escalatedToLevel}` : "Keine"} />
            </aside>
          </div>
        </AdminSection>
      ) : null}
    </div>
  );
}

function AdminTicketShortcutButton({ icon, label, disabled = false, onClick }: { icon: React.ReactNode; label: string; disabled?: boolean; onClick: () => void }) {
  return (
    <button
      type="button"
      className="flex h-10 items-center justify-start gap-2 rounded-md border border-white/10 bg-unique-ink px-3 text-sm font-black text-white transition hover:border-unique-gold hover:text-unique-gold disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:border-white/10 disabled:hover:text-white"
      disabled={disabled}
      onClick={onClick}
    >
      <span className="text-unique-gold">{icon}</span>
      {label}
    </button>
  );
}

function AdminTicketCombobox({
  label,
  value,
  options,
  onChange
}: {
  label: string;
  value: string;
  options: Array<{ value: string; label: string; icon?: React.ReactNode }>;
  onChange: (value: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const selected = options.find((option) => option.value === value) ?? options[0];

  return (
    <div className={`relative rounded-md border border-white/10 bg-white/5 p-3 ${open ? "z-[1200]" : "z-30"}`}>
      <span className="text-[11px] font-black uppercase text-white/35">{label}</span>
      <button
        type="button"
        className="mt-2 flex h-10 w-full items-center justify-between gap-2 rounded-md border border-white/10 bg-unique-ink px-3 text-left text-sm font-bold text-white outline-none transition hover:border-unique-gold"
        onClick={() => setOpen((current) => !current)}
      >
        <span className="flex min-w-0 items-center gap-2">
          {selected?.icon ? <span className="text-unique-gold">{selected.icon}</span> : null}
          <span className="truncate">{selected?.label ?? "-"}</span>
        </span>
        <ChevronDown className={`h-4 w-4 shrink-0 text-white/55 transition ${open ? "rotate-180" : ""}`} aria-hidden />
      </button>
      {open ? (
        <div className="absolute left-3 right-3 top-[78px] z-[1201] max-h-72 overflow-y-auto rounded-md border border-unique-gold/45 bg-unique-ink p-2 shadow-2xl shadow-black">
          {options.map((option) => (
            <button
              key={option.value}
              type="button"
              className={`flex w-full items-center gap-2 rounded-md px-3 py-2 text-left text-sm font-black transition ${option.value === value ? "bg-unique-gold text-unique-ink" : "text-white/75 hover:bg-white/10 hover:text-white"}`}
              onClick={() => {
                onChange(option.value);
                setOpen(false);
              }}
            >
              {option.icon ? <span className={option.value === value ? "text-unique-ink" : "text-unique-gold"}>{option.icon}</span> : null}
              {option.label}
            </button>
          ))}
        </div>
      ) : null}
    </div>
  );
}

function AdminInfoBox({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-md border border-white/10 bg-white/5 p-3">
      <p className="text-[11px] font-black uppercase text-white/35">{label}</p>
      <p className="mt-2 break-words text-sm font-black text-white">{value}</p>
    </div>
  );
}

function AdminSection({
  title,
  className = "",
  bodyClassName = "p-4",
  children
}: {
  title: string;
  className?: string;
  bodyClassName?: string;
  children: React.ReactNode;
}) {
  return (
    <section className={`flex min-h-0 flex-col overflow-hidden border border-white/8 bg-unique-panel/92 ${className}`}>
      <div className="shrink-0 border-b border-white/8 bg-unique-ink/68 px-5 py-4">
        <h3 className="text-[11px] font-black uppercase tracking-[2px] text-unique-gold">{title}</h3>
      </div>
      <div className={bodyClassName}>
      {children}
      </div>
    </section>
  );
}

function AdminSummary({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return (
    <div className="rounded-md border border-white/10 bg-white/5 p-3">
      <p className="flex items-center gap-2 text-xs text-white/45">{icon}{label}</p>
      <p className="mt-1 text-2xl font-semibold text-white">{value}</p>
    </div>
  );
}

function AdminRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="mb-2 flex items-center justify-between gap-3 border border-white/8 bg-unique-ink/70 px-3 py-2 text-sm">
      <span className="text-white/80">{label}</span>
      <strong className="text-white">{value}</strong>
    </div>
  );
}

function EmptyAdminText({ text }: { text: string }) {
  return <p className="border border-white/8 bg-unique-ink/70 px-3 py-3 text-sm text-white/50">{text}</p>;
}

function TextInput(props: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  type?: string;
  autoComplete?: string;
  minLength?: number;
}) {
  return (
    <label className="block">
      <span className="text-sm text-white/70">{props.label}</span>
      <input
        className="mt-2 w-full rounded-md border border-unique-line bg-unique-ink px-4 py-3 text-sm outline-none transition focus:border-unique-teal"
        type={props.type ?? "text"}
        value={props.value}
        autoComplete={props.autoComplete}
        minLength={props.minLength}
        onChange={(event) => props.onChange(event.target.value)}
        required
      />
    </label>
  );
}

function TabButton({ active, icon, label, onClick }: { active: boolean; icon: React.ReactNode; label: string; onClick: () => void }) {
  return (
    <button type="button" className={`flex items-center gap-2 rounded-md px-3 py-2 text-sm transition ${active ? "bg-unique-teal text-unique-ink" : "text-white/65 hover:bg-white/10 hover:text-white"}`} onClick={onClick}>
      {icon}
      {label}
    </button>
  );
}

function Section({ title, icon, children }: { title: string; icon: React.ReactNode; children: React.ReactNode }) {
  return (
    <section>
      <h2 className="mb-4 flex items-center gap-2 text-lg font-semibold">
        <span className="text-unique-gold">{icon}</span>
        {title}
      </h2>
      {children}
    </section>
  );
}

function RangeControl({ label, min, max, step = 1, value, onChange }: { label: string; min: number; max: number; step?: number; value: number; onChange: (value: number) => void }) {
  return (
    <label className="grid grid-cols-[150px_1fr_54px] items-center gap-3 text-xs text-white/70">
      <span>{label}</span>
      <input className="accent-unique-teal" type="range" min={min} max={max} step={step} value={value} onChange={(event) => onChange(Number(event.target.value))} />
      <span className="rounded bg-white/7 px-2 py-1 text-center text-white">{Number(value).toFixed(step < 1 ? 2 : 0)}</span>
    </label>
  );
}

function ColorGrid({ label, value, onChange }: { label: string; value: number; onChange: (value: number) => void }) {
  return (
    <div>
      <div className="mb-2 flex items-center justify-between text-xs text-white/70">
        <span>{label}</span>
        <span className="rounded bg-white/7 px-2 py-1 text-white">{value}</span>
      </div>
      <div className="grid grid-cols-[repeat(16,minmax(0,1fr))] gap-1">
        {hairColors.map((color, index) => (
          <button
            key={`${color}-${index}`}
            type="button"
            className={`h-5 rounded-sm border ${value === index ? "border-unique-gold" : "border-white/10"}`}
            style={{ backgroundColor: color }}
            onClick={() => onChange(index)}
          />
        ))}
      </div>
    </div>
  );
}

function ProfileInfo({ icon, label, value }: { icon?: React.ReactNode; label: string; value: string }) {
  return (
    <div className="rounded-md border border-white/10 bg-black/20 px-5 py-4">
      <p className="flex items-center gap-2 text-xs text-white/30">
        {icon ? <span className="text-unique-gold">{icon}</span> : null}
        {label}
      </p>
      <p className="mt-1 text-base text-white">{value}</p>
    </div>
  );
}

function Stat({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return (
    <div className="flex items-center justify-between rounded-md border border-white/10 bg-white/5 px-4 py-3">
      <span className="flex items-center gap-2 text-sm text-white/60">
        {icon}
        {label}
      </span>
      <strong className="text-sm font-semibold text-white">{value}</strong>
    </div>
  );
}

function ErrorText({ message, compact = false }: { message: string; compact?: boolean }) {
  return <p className={`${compact ? "max-w-sm" : "w-full"} rounded-md border border-unique-danger/40 bg-unique-danger/10 px-4 py-3 text-sm text-red-100`}>{message}</p>;
}

function modeClass(active: boolean) {
  return `rounded-md border px-4 py-3 text-sm font-semibold transition ${active ? "border-unique-teal bg-unique-teal text-unique-ink" : "border-white/10 bg-white/5 text-white/70 hover:text-white"}`;
}

function chatToneClass(tone: ChatMessage["tone"]) {
  if (tone === "admin") {
    return "text-red-200";
  }
  if (tone === "ooc") {
    return "text-unique-teal";
  }
  if (tone === "me" || tone === "do" || tone === "try") {
    return "text-unique-gold";
  }
  if (tone === "error") {
    return "text-red-100";
  }
  if (tone === "info") {
    return "text-unique-teal";
  }
  return "text-white/70";
}

function chatTextClass(tone: ChatMessage["tone"]) {
  if (tone === "ooc") {
    return "text-white/80";
  }
  if (tone === "me" || tone === "do" || tone === "try") {
    return "text-unique-gold/90";
  }
  if (tone === "admin" || tone === "error") {
    return "text-red-100";
  }
  if (tone === "info") {
    return "text-unique-teal";
  }
  return "text-white";
}

function chatToneLabel(tone: ChatMessage["tone"]) {
  if (tone === "say") {
    return "IC";
  }
  if (tone === "info") {
    return "SYSTEM";
  }
  return tone.toUpperCase();
}

function getCurrentTime() {
  const now = new Date();
  return `${String(now.getHours()).padStart(2, "0")}:${String(now.getMinutes()).padStart(2, "0")}`;
}

function formatMoney(value: number) {
  return new Intl.NumberFormat("de-DE", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0
  }).format(value);
}

function formatHudMoney(value: number) {
  return `$${new Intl.NumberFormat("en-US", { maximumFractionDigits: 0 }).format(Math.max(0, Math.trunc(value)))}`;
}

function formatHudDelta(value: number) {
  const amount = Math.trunc(value);
  if (!amount) {
    return "";
  }

  return `${amount > 0 ? "+" : "-"}${formatHudMoney(Math.abs(amount))}`;
}

function formatNumber(value: number) {
  return new Intl.NumberFormat("de-DE", { maximumFractionDigits: 0 }).format(value);
}

function formatDuration(totalSeconds: number) {
  const minutes = Math.floor(Math.max(0, totalSeconds) / 60);
  const seconds = Math.max(0, totalSeconds) % 60;
  return `${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;
}

function formatOnlineDuration(totalSeconds: number) {
  const safeSeconds = Math.max(0, Math.floor(totalSeconds));
  const hours = Math.floor(safeSeconds / 3600);
  const minutes = Math.floor((safeSeconds % 3600) / 60);
  return `${hours} H. ${minutes} M.`;
}

function formatClock(date: Date) {
  return `${String(date.getHours()).padStart(2, "0")}:${String(date.getMinutes()).padStart(2, "0")}`;
}

function formatDate(date: Date) {
  return `${String(date.getDate()).padStart(2, "0")}.${String(date.getMonth() + 1).padStart(2, "0")}.${date.getFullYear()}`;
}

function formatDateTime(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return "-";
  }
  return `${formatDate(date)} ${formatClock(date)}`;
}

function formatRemainingUntil(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return "-";
  }

  const totalSeconds = Math.max(0, Math.ceil((date.getTime() - Date.now()) / 1000));
  const days = Math.floor(totalSeconds / 86400);
  const hours = Math.floor((totalSeconds % 86400) / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;
  if (days > 0) {
    return `${days} Tag${days === 1 ? "" : "e"}${hours ? ` ${hours} Std.` : ""}`;
  }
  if (hours > 0) {
    return `${hours} Std.${minutes ? ` ${minutes} Min.` : ""}`;
  }
  if (minutes > 0) {
    return `${minutes} Min.${seconds ? ` ${seconds} Sek.` : ""}`;
  }
  return `${seconds} Sek.`;
}

function formatAdminJailTime(totalSeconds: number) {
  const safeSeconds = Math.max(0, Math.trunc(totalSeconds));
  const hours = Math.floor(safeSeconds / 3600);
  const minutes = Math.floor((safeSeconds % 3600) / 60);
  const seconds = safeSeconds % 60;
  if (hours > 0) {
    return `${String(hours).padStart(2, "0")}:${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;
  }
  return `${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;
}

function parseAdminDateTimeFilter(dateValue: string, timeValue: string, endOfDay: boolean) {
  const dateMatch = dateValue.trim().match(/^(\d{2})\.(\d{2})\.(\d{4})$/);
  if (!dateMatch) {
    return null;
  }

  const [, dayText, monthText, yearText] = dateMatch;
  const timeMatch = timeValue.trim().match(/^(\d{2}):(\d{2})$/);
  const day = Number(dayText);
  const month = Number(monthText) - 1;
  const year = Number(yearText);
  const hours = timeMatch ? Number(timeMatch[1]) : endOfDay ? 23 : 0;
  const minutes = timeMatch ? Number(timeMatch[2]) : endOfDay ? 59 : 0;
  const date = new Date(year, month, day, hours, minutes, endOfDay ? 59 : 0, endOfDay ? 999 : 0);
  if (
    Number.isNaN(date.getTime())
    || date.getFullYear() !== year
    || date.getMonth() !== month
    || date.getDate() !== day
    || hours > 23
    || minutes > 59
  ) {
    return null;
  }
  return date.getTime();
}

function playPenaltyNoticeSound() {
  try {
    const AudioContextClass = window.AudioContext || (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!AudioContextClass) {
      return;
    }
    const context = new AudioContextClass();
    const oscillator = context.createOscillator();
    const gain = context.createGain();
    oscillator.type = "sine";
    oscillator.frequency.setValueAtTime(620, context.currentTime);
    oscillator.frequency.exponentialRampToValueAtTime(360, context.currentTime + 0.22);
    gain.gain.setValueAtTime(0.001, context.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.12, context.currentTime + 0.025);
    gain.gain.exponentialRampToValueAtTime(0.001, context.currentTime + 0.28);
    oscillator.connect(gain);
    gain.connect(context.destination);
    oscillator.start();
    oscillator.stop(context.currentTime + 0.3);
    window.setTimeout(() => context.close(), 420);
  } catch {}
}

function playInteractionOpenSound() {
  try {
    const AudioContextClass = window.AudioContext || (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!AudioContextClass) {
      return;
    }
    const context = new AudioContextClass();
    const oscillator = context.createOscillator();
    const gain = context.createGain();
    oscillator.type = "triangle";
    oscillator.frequency.setValueAtTime(720, context.currentTime);
    oscillator.frequency.exponentialRampToValueAtTime(980, context.currentTime + 0.055);
    gain.gain.setValueAtTime(0.001, context.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.045, context.currentTime + 0.012);
    gain.gain.exponentialRampToValueAtTime(0.001, context.currentTime + 0.09);
    oscillator.connect(gain);
    gain.connect(context.destination);
    oscillator.start();
    oscillator.stop(context.currentTime + 0.1);
    window.setTimeout(() => context.close(), 160);
  } catch {}
}

function getNextLevelExperience(level: number) {
  return Math.max(320, level * 320);
}




import {
  BadgeCent,
  Banknote,
  BarChart3,
  Briefcase,
  Brush,
  Bug,
  CalendarDays,
  CheckCircle2,
  ChevronDown,
  ClipboardList,
  Eye,
  Flag,
  Heart,
  HelpCircle,
  Home,
  LayoutDashboard,
  Lock,
  LogIn,
  MapPin,
  Palette,
  Package,
  Plane,
  Phone,
  Plus,
  Scissors,
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
import { FormEvent, useEffect, useMemo, useRef, useState } from "react";
import { emitToClient, notifyReady } from "./lib/ragemp";

type Screen = "disclaimer" | "auth" | "characters" | "spawn" | "world";
type AuthMode = "login" | "register";
type CreatorTab = "identity" | "genetics" | "face" | "details" | "hair" | "clothing";
type ChatMode = "ic" | "ooc" | "me" | "do" | "try";

const chatModes: ChatMode[] = ["ic", "ooc", "me", "do", "try"];
const chatModeLabels: Record<ChatMode, string> = {
  ic: "IC",
  ooc: "OOC",
  me: "ME",
  do: "DO",
  try: "TRY"
};

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

export function App() {
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
  const [hudLocation, setHudLocation] = useState<HudLocationPayload>({
    street: "Unbekannte Strasse",
    crossing: "",
    area: "Los Santos"
  });
  const [supportTicketResult, setSupportTicketResult] = useState<{ ok: boolean; message: string } | null>(null);
  const [supportTickets, setSupportTickets] = useState<SupportTicket[]>([]);
  const [supportMuteNotice, setSupportMuteNotice] = useState<SupportMuteNoticePayload | null>(null);
  const [chatMuteNotice, setChatMuteNotice] = useState<ChatMuteNoticePayload | null>(null);
  const [currentCharacter, setCurrentCharacter] = useState<CharacterInfo | null>(null);
  const [mainMenuOpen, setMainMenuOpen] = useState(false);
  const [adminOpen, setAdminOpen] = useState(false);
  const [adminData, setAdminData] = useState<AdminPanelPayload>({
    admins: [],
    players: [],
    commands: [],
    tickets: [],
    currentAdminLevel: 0,
    adminMode: false,
    canManagePermissions: false
  });

  useEffect(() => {
    window.uniqueBridge = {
      receive: (event) => {
        if (event.type === "auth:bootstrap") {
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

        if (event.type === "chat:push") {
          setChatMessages((current) => [...current, event.payload].slice(-120));
          return;
        }

        if (event.type === "chat:open") {
          setDeadChatOnly(Boolean(event.payload.dead));
          setChatOpen(true);
          return;
        }

        if (event.type === "menu:open") {
          setChatOpen(false);
          setAdminOpen(false);
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

        if (event.type === "death:show") {
          setDeathScreen(event.payload);
          setDeathScreenKey((current) => current + 1);
          setChatOpen(false);
          setAdminOpen(false);
          setMainMenuOpen(false);
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
          setAdminOpen(true);
          return;
        }

        if (event.type === "admin:close") {
          setAdminOpen(false);
          return;
        }

        if (event.type === "admin:data") {
          setAdminData(event.payload);
        }
      }
    };

    const preventCopy = (event: Event) => event.preventDefault();
    document.addEventListener("copy", preventCopy);
    document.addEventListener("cut", preventCopy);
    document.addEventListener("contextmenu", preventCopy);
    document.addEventListener("dragstart", preventCopy);
    document.addEventListener("selectstart", preventCopy);

    notifyReady();
    const timer = window.setTimeout(() => setScreen("auth"), 3000);

    return () => {
      window.clearTimeout(timer);
      document.removeEventListener("copy", preventCopy);
      document.removeEventListener("cut", preventCopy);
      document.removeEventListener("contextmenu", preventCopy);
      document.removeEventListener("dragstart", preventCopy);
      document.removeEventListener("selectstart", preventCopy);
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
          {!adminOpen && !mainMenuOpen ? <ChatHud messages={chatMessages} open={chatOpen} deadOnly={deadChatOnly} onClose={() => setChatOpen(false)} /> : null}
          {mainMenuOpen ? <MainMenu character={currentCharacter} hudData={hudData} uniqueCoins={uniqueCoins} supportTicketResult={supportTicketResult} supportTickets={supportTickets} onClose={() => setMainMenuOpen(false)} /> : null}
          {adminOpen ? <AdminPanel data={adminData} result={supportTicketResult} onClose={() => setAdminOpen(false)} /> : null}
        </>
      ) : null}
      {supportMuteNotice ? <SupportMuteNotice notice={supportMuteNotice} onClose={() => setSupportMuteNotice(null)} /> : null}
      {chatMuteNotice ? <ChatMuteNotice notice={chatMuteNotice} onClose={() => setChatMuteNotice(null)} /> : null}
      {deathScreen ? <DeathScreen key={deathScreenKey} initialSeconds={deathScreen.seconds} /> : null}
    </main>
  );
}

function DisclaimerBackdrop() {
  return (
    <>
      <div className="fixed inset-0 bg-[#05070a]" />
      <div className="disclaimer-tiles fixed inset-0 opacity-70" />
      <div className="fixed inset-0 bg-[radial-gradient(circle_at_22%_18%,rgba(46,111,255,0.24),transparent_32%),radial-gradient(circle_at_78%_72%,rgba(241,184,75,0.16),transparent_30%),linear-gradient(135deg,rgba(3,5,9,0.45),rgba(0,0,0,0.90))]" />
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

function PenaltyNotice({ title, tone, notice, onClose }: { title: string; tone: string; notice: { administrator: string; reason: string; expiresAt: string }; onClose: () => void }) {
  return (
    <section className="fixed inset-0 z-[90] grid place-items-center bg-black/45 px-6">
      <div className="w-full max-w-[560px] rounded-md border border-unique-danger/55 bg-[#111318]/96 p-6 text-center shadow-2xl shadow-black/60">
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
      <div className="fixed inset-0 bg-[#070a0f]" />
      <div className="app-grid fixed inset-0 opacity-40" />
      <div className="fixed inset-0 bg-[radial-gradient(circle_at_top_left,rgba(29,183,166,0.20),transparent_34%),radial-gradient(circle_at_80%_22%,rgba(241,184,75,0.12),transparent_30%),linear-gradient(115deg,rgba(13,15,20,0.94),rgba(13,15,20,0.52)_50%,rgba(10,12,16,0.82))]" />
      <div className="fixed inset-x-0 bottom-0 h-48 bg-gradient-to-t from-black/80 to-transparent" />
    </>
  );
}

function Disclaimer() {
  return (
    <section className="relative flex min-h-screen items-center justify-center px-6">
      <div className="w-full max-w-xl text-center">
        <div className="mx-auto mb-6 flex h-16 w-16 items-center justify-center rounded-full border border-unique-teal/30 bg-black/45 shadow-[0_0_60px_rgba(29,183,166,0.20)]">
          <ShieldCheck className="h-8 w-8 text-unique-teal" aria-hidden />
        </div>
        <p className="text-sm font-semibold uppercase tracking-[0.28em] text-unique-gold">Unique Roleplay</p>
        <h1 className="mt-4 text-4xl font-semibold sm:text-5xl">Hinweis</h1>
        <p className="mt-5 text-base leading-7 text-white/72">
          Unique Roleplay ist ein eigenstaendiges Community-Projekt und steht in keiner Verbindung zu Rockstar Games,
          Take-Two Interactive oder offiziellen Grand Theft Auto Online Diensten.
        </p>
        <div className="mt-9 h-2 overflow-hidden rounded-full border border-white/10 bg-black/55 shadow-inner">
          <div className="h-full rounded-full bg-gradient-to-r from-unique-teal via-[#2e6fff] to-unique-gold disclaimer-progress" />
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
                style={{ background: `conic-gradient(#f1b84b ${progress}%, rgba(255,255,255,0.12) 0)` }}
              >
                <div className="grid h-9 w-9 place-items-center rounded-full bg-[#12151b]">{level}</div>
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
  onClose
}: {
  character: CharacterInfo | null;
  hudData: HudDataPayload | null;
  uniqueCoins: number;
  supportTicketResult: { ok: boolean; message: string } | null;
  supportTickets: SupportTicket[];
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
    { id: "dashboard", label: "Dashboard", icon: <LayoutDashboard className="h-5 w-5" aria-hidden /> },
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

  return (
    <section className="fixed inset-0 z-50 overflow-hidden bg-[#090c11] text-white">
      <div className="absolute inset-0 app-grid opacity-20" />
      <div className="absolute inset-0 bg-[linear-gradient(115deg,rgba(9,12,17,0.98),rgba(17,19,24,0.92)_52%,rgba(8,10,14,0.98))]" />
      <div className="relative grid h-full grid-cols-[260px_minmax(0,1fr)]">
        <aside className="flex min-h-0 flex-col border-r border-white/10 bg-black/28 px-4 py-5">
          <div className="flex items-start justify-between gap-3 px-2">
            <div>
              <p className="text-2xl font-black leading-none">Unique<span className="text-unique-gold">RP</span></p>
              <p className="mt-2 text-xs font-bold uppercase text-white/45">M Menu</p>
            </div>
            <button type="button" className="grid h-9 w-9 place-items-center rounded-md border border-white/10 bg-white/5 text-white/65 transition hover:text-white" onClick={close}>
              <X className="h-4 w-4" aria-hidden />
            </button>
          </div>

          <div className="mt-5 rounded-md border border-white/10 bg-white/5 p-3">
            <p className="truncate text-sm font-black">{characterName}</p>
            <p className="mt-1 text-xs text-white/45">ID {characterId || "0000"}</p>
          </div>

          <nav className="mt-4 grid min-h-0 flex-1 content-start gap-1 overflow-y-auto pr-1">
            {tabs.map((item) => (
              <button
                key={item.id}
                type="button"
                className={`flex h-11 items-center gap-3 rounded-md px-3 text-left text-sm font-bold transition ${
                  tab === item.id ? "bg-unique-gold text-unique-ink" : "text-white/65 hover:bg-white/8 hover:text-white"
                }`}
                onClick={() => setTab(item.id)}
              >
                {item.icon}
                <span className="truncate">{item.label}</span>
              </button>
            ))}
          </nav>
        </aside>

        <div className="relative min-h-0 overflow-y-auto px-7 py-6">
          <MainMenuHeader tab={tabs.find((item) => item.id === tab) ?? tabs[0]} characterName={characterName} />
          {tab === "dashboard" ? <MenuDashboard character={character} hudData={hudData} uniqueCoins={coins} onlineSeconds={onlineSeconds} onSupport={() => setTab("support")} /> : null}
          {tab === "stats" ? <MenuStats character={character} hudData={hudData} uniqueCoins={coins} onlineSeconds={onlineSeconds} /> : null}
          {tab === "shop" ? <MenuPlaceholder icon={<ShoppingBag className="h-7 w-7" />} title="Shop" items={["Unique Coins", "Premium Slot", "Kosmetik", "Fahrzeug Skins"]} /> : null}
          {tab === "battlepass" ? <MenuBattlepass /> : null}
          {tab === "tasks" ? <MenuTasks /> : null}
          {tab === "property" ? <MenuPlaceholder icon={<Home className="h-7 w-7" />} title="Besitz" items={["Immobilien", "Fahrzeuge", "Lager", "Schluessel"]} /> : null}
          {tab === "finance" ? <MenuFinance character={character} hudData={hudData} uniqueCoins={coins} /> : null}
          {tab === "faction" ? <MenuFaction character={character} /> : null}
          {tab === "events" ? <MenuPlaceholder icon={<CalendarDays className="h-7 w-7" />} title="Events" items={["Aktive Events", "Anmeldungen", "Belohnungen", "Historie"]} /> : null}
          {tab === "support" ? (
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
              onSubmitReply={(ticketId) => {
                const reply = ticketReply.trim();
                if (reply.length < 2) {
                  setLocalTicketMessage({ ok: false, message: "Antwort ist zu kurz." });
                  return;
                }
                setLocalTicketMessage(null);
                emitToClient("unique:cef:replySupportTicket", { ticketId, message: reply });
                setTicketReply("");
              }}
              onSubmit={submitTicket}
            />
          ) : null}
          {tab === "settings" ? <MenuSettings /> : null}
        </div>
      </div>
    </section>
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
          <button type="button" className="flex h-12 items-center justify-center gap-2 rounded-md bg-unique-gold px-4 text-sm font-black text-unique-ink transition hover:bg-[#ffd077] disabled:cursor-wait disabled:opacity-60" disabled={pending} onClick={onSubmit}>
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
        className="mt-2 flex h-12 w-full items-center justify-between gap-3 rounded-md border border-white/12 bg-[#111722] px-4 text-left text-sm font-black text-white outline-none transition hover:border-unique-gold"
        onClick={() => setOpen((current) => !current)}
      >
        <span className="flex min-w-0 items-center gap-2">
          <span className="text-unique-gold">{selected.icon}</span>
          <span className="truncate">{selected.label}</span>
        </span>
        <ChevronDown className={`h-4 w-4 shrink-0 text-white/55 transition ${open ? "rotate-180" : ""}`} aria-hidden />
      </button>
      {open ? (
        <div className="absolute left-0 right-0 top-[76px] z-[80] max-h-80 overflow-y-auto rounded-md border border-unique-gold/45 bg-[#0d1118] p-2 shadow-2xl shadow-black">
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

function MenuSettings() {
  return (
    <MenuPanel title="Einstellungen">
      <div className="grid gap-3 md:grid-cols-2">
        <MenuToggle label="HUD anzeigen" defaultChecked />
        <MenuToggle label="Chat sichtbar" defaultChecked />
        <MenuToggle label="Benachrichtigungen" defaultChecked />
        <MenuToggle label="Minimaler Modus" />
      </div>
    </MenuPanel>
  );
}

function MenuPanel({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="rounded-md border border-white/10 bg-[#111722]/86 p-5 shadow-xl shadow-black/20">
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

function WorldHud({ data, location }: { data: HudDataPayload | null; location: HudLocationPayload }) {
  const [now, setNow] = useState(() => new Date());
  const previousMoney = useRef<{ cash: number | null; bank: number | null }>({ cash: null, bank: null });
  const [moneyDelta, setMoneyDelta] = useState({ cash: 0, bank: 0 });

  useEffect(() => {
    const timer = window.setInterval(() => setNow(new Date()), 1000);
    return () => window.clearInterval(timer);
  }, []);

  useEffect(() => {
    if (!data) {
      return;
    }

    const nextDelta = {
      cash: previousMoney.current.cash === null ? 0 : data.cash - previousMoney.current.cash,
      bank: previousMoney.current.bank === null ? 0 : data.bankBalance - previousMoney.current.bank
    };
    previousMoney.current = { cash: data.cash, bank: data.bankBalance };
    setMoneyDelta(nextDelta);

    if (nextDelta.cash !== 0 || nextDelta.bank !== 0) {
      const timer = window.setTimeout(() => setMoneyDelta({ cash: 0, bank: 0 }), 1450);
      return () => window.clearTimeout(timer);
    }
  }, [data?.cash, data?.bankBalance]);

  const playerCount = data?.playerCount ?? 0;
  const maxPlayers = Math.max(playerCount, data?.maxPlayers ?? 100);
  const tickets = Math.max(0, Number(data?.tickets ?? 0));

  return (
    <section className="pointer-events-none fixed inset-0 z-20 text-white">
      <div className="absolute right-6 top-5 flex w-[380px] flex-col items-end text-right drop-shadow-[0_2px_2px_rgba(0,0,0,.65)]">
        <HudServerHeader characterId={data?.characterId ?? 0} online={playerCount} maxOnline={maxPlayers} />

        <div className="mt-3 grid gap-1">
          <HudMoneyLine icon={<BadgeCent className="h-6 w-6" aria-hidden />} value={formatHudMoney(data?.cash ?? 0)} delta={moneyDelta.cash} />
          <HudMoneyLine icon={<Banknote className="h-5 w-5" aria-hidden />} value={formatHudMoney(data?.bankBalance ?? 0)} delta={moneyDelta.bank} muted />
        </div>
      </div>

      <div className="absolute bottom-8 left-[330px] max-w-[360px] rounded-md border-l-2 border-unique-gold bg-black/48 px-4 py-3 shadow-[0_0_24px_rgba(0,0,0,.28)] backdrop-blur-[2px]">
        <div className="flex items-center gap-2 text-[11px] font-black uppercase tracking-[0.18em] text-unique-gold">
          <MapPin className="h-4 w-4" aria-hidden />
          Standort
        </div>
        <p className="mt-2 truncate text-xl font-semibold text-white">{location.street}</p>
        <p className="mt-1 truncate text-sm text-white/55">
          {location.crossing ? `${location.crossing} / ${location.area}` : location.area}
        </p>
      </div>

      {data?.adminMode ? <AdminTicketCounter tickets={tickets} /> : null}

      <div className="absolute bottom-8 right-8 text-right drop-shadow-[0_2px_2px_rgba(0,0,0,.7)]">
        <p className="font-mono text-3xl font-black text-white">{formatClock(now)}</p>
        <p className="mt-1 font-mono text-sm font-bold uppercase tracking-[0.16em] text-white/60">{formatDate(now)}</p>
      </div>
    </section>
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
      <div className="w-full max-w-3xl overflow-hidden rounded-lg border border-red-300/15 bg-[#07090d]/82 shadow-2xl shadow-black/60">
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
      <form className="grid max-h-[92vh] w-full max-w-[760px] animate-panel grid-cols-[180px_1fr] overflow-hidden rounded-lg border border-white/10 bg-[#111318]/60 shadow-2xl shadow-black/25 backdrop-blur-sm" onSubmit={submit}>
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
            <button className="flex items-center justify-center gap-2 rounded-md bg-unique-gold px-5 py-3 text-sm font-semibold text-unique-ink transition hover:bg-[#ffd06b]">
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
          <div className="absolute right-0 top-0 h-full w-[3px] bg-unique-gold/65 shadow-[0_0_14px_rgba(241,184,75,.55)]" />
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
                      ? "bg-unique-gold text-unique-ink shadow-[0_0_18px_rgba(241,184,75,.35)]"
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

            <form className="mt-2 flex h-[46px] items-center border-y border-unique-gold/20 bg-black/42 shadow-[0_0_22px_rgba(241,184,75,.14)] backdrop-blur-[2px]" onSubmit={submit}>
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
              <button type="button" onClick={submitInput} className="mr-2 h-8 rounded bg-unique-gold px-4 text-xs font-black uppercase tracking-[0.1em] text-unique-ink transition hover:bg-[#ffd06b]">Senden</button>
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
  const [tab, setTab] = useState<"admins" | "players" | "tickets" | "commands" | "permissions">("players");
  const onlineAdmins = data.admins.filter((admin) => admin.online);
  const offlineAdmins = data.admins.filter((admin) => !admin.online);
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
    ["/setadmin <charId> <0-10>", "Adminlevel setzen"]
  ] as const;

  function close() {
    emitToClient("unique:cef:adminClose", {});
    onClose();
  }

  return (
    <section className="fixed inset-0 z-50 overflow-hidden bg-[#070a0f] text-white">
      <div className="absolute inset-0 app-grid opacity-35" />
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_14%_16%,rgba(29,183,166,0.18),transparent_30%),radial-gradient(circle_at_84%_20%,rgba(241,184,75,0.12),transparent_28%),linear-gradient(115deg,rgba(13,15,20,0.96),rgba(13,15,20,0.76)_48%,rgba(10,12,16,0.92))]" />
      <div className="pointer-events-none absolute left-0 top-0 h-20 w-20 border-l-[6px] border-t-[6px] border-unique-gold/90" />
      <div className="pointer-events-none absolute bottom-0 right-0 h-28 w-28 border-b-[6px] border-r-[6px] border-unique-teal/80" />
      <div className="pointer-events-none absolute left-[7%] top-[31%] text-6xl font-light text-white/10">x</div>
      <div className="pointer-events-none absolute right-[8%] bottom-[20%] text-7xl font-light text-unique-gold/25">x</div>
      <div className="relative mx-auto mt-6 grid h-[calc(100vh-3rem)] w-[calc(100vw-3rem)] max-w-[1720px] overflow-hidden rounded-md border border-white/10 bg-[#111318]/64 shadow-2xl shadow-black/50 backdrop-blur-sm md:grid-cols-[300px_1fr]">
        <aside className="border-r border-white/10 bg-black/20 p-5">
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="text-xs uppercase tracking-[0.22em] text-unique-gold">Administration</p>
              <h2 className="mt-2 text-2xl font-black uppercase">F3 Dashboard</h2>
              <p className="mt-1 text-sm text-white/45">Level {data.currentAdminLevel} · {data.adminMode ? "Adminmodus aktiv" : "Adminmodus aus"}</p>
            </div>
            <button className="rounded-md border border-white/10 p-2 text-white/65 hover:text-white" onClick={close}>
              <X className="h-4 w-4" aria-hidden />
            </button>
          </div>

          <div className="mt-7 grid gap-3 text-sm text-white/70">
            <AdminSummary icon={<Users className="h-4 w-4" />} label="Spieler online" value={String(data.players.length)} />
            <AdminSummary icon={<ShieldCheck className="h-4 w-4" />} label="Admins online" value={String(onlineAdmins.length)} />
            <AdminSummary icon={<Ticket className="h-4 w-4" />} label="Offene Tickets" value={String(data.tickets.length)} />
            <AdminSummary icon={<Terminal className="h-4 w-4" />} label="Befehle" value={String(data.commands.length)} />
          </div>

          <nav className="mt-7 grid gap-2">
            <AdminTab active={tab === "players"} label="Online Spieler" onClick={() => setTab("players")} />
            <AdminTab active={tab === "tickets"} label="Tickets" onClick={() => setTab("tickets")} />
            <AdminTab active={tab === "admins"} label="Admins" onClick={() => setTab("admins")} />
            <AdminTab active={tab === "commands"} label="Befehle" onClick={() => setTab("commands")} />
            {data.canManagePermissions ? <AdminTab active={tab === "permissions"} label="Berechtigungen" onClick={() => setTab("permissions")} /> : null}
          </nav>
        </aside>

        <div className="min-h-0 overflow-y-auto p-6">
          {result ? (
            <div className={`mb-4 rounded-md border px-4 py-3 text-sm font-black ${result.ok ? "border-unique-teal/35 bg-unique-teal/10 text-unique-teal" : "border-unique-danger/45 bg-unique-danger/10 text-red-100"}`}>
              {result.message}
            </div>
          ) : null}

          {tab === "players" ? (
            <div className="grid gap-4 xl:grid-cols-3">
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
            <div className="grid gap-5 xl:grid-cols-2">
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
            <AdminSection title="Befehle">
              <div className="grid gap-2 xl:grid-cols-2">
                {commandHelp.map(([command, description]) => (
                  <AdminRow key={command} label={command} value={description} />
                ))}
              </div>
            </AdminSection>
          ) : null}

          {tab === "permissions" && data.canManagePermissions ? (
            <AdminSection title="Berechtigungen">
              <div className="grid gap-2 xl:grid-cols-2">
                {data.commands.map((command) => (
                  <label key={command.command} className="flex items-center justify-between gap-3 rounded-md border border-white/10 bg-white/5 px-4 py-3">
                    <span className="font-mono text-sm text-white">{command.command}</span>
                    <select
                      className="rounded-md border border-white/10 bg-[#111318] px-3 py-2 text-sm text-white outline-none"
                      value={command.minLevel}
                      onChange={(event) => emitToClient("unique:cef:setCommandPermission", { command: command.command, minLevel: Number(event.target.value) })}
                    >
                      {Array.from({ length: 10 }, (_, index) => index + 1).map((level) => (
                        <option key={level} value={level}>Level {level}</option>
                      ))}
                    </select>
                  </label>
                ))}
              </div>
            </AdminSection>
          ) : null}
        </div>
      </div>
    </section>
  );
}

function AdminTab({ active, label, onClick }: { active: boolean; label: string; onClick: () => void }) {
  return (
    <button
      type="button"
      className={`rounded-md border px-4 py-3 text-left text-sm transition ${active ? "border-unique-gold/70 bg-unique-gold/15 text-unique-gold" : "border-white/10 bg-white/5 text-white/65 hover:text-white"}`}
      onClick={onClick}
    >
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
      className="flex h-10 items-center justify-start gap-2 rounded-md border border-white/10 bg-[#111318] px-3 text-sm font-black text-white transition hover:border-unique-gold hover:text-unique-gold disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:border-white/10 disabled:hover:text-white"
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
    <div className="relative z-30 rounded-md border border-white/10 bg-white/5 p-3">
      <span className="text-[11px] font-black uppercase text-white/35">{label}</span>
      <button
        type="button"
        className="mt-2 flex h-10 w-full items-center justify-between gap-2 rounded-md border border-white/10 bg-[#111318] px-3 text-left text-sm font-bold text-white outline-none transition hover:border-unique-gold"
        onClick={() => setOpen((current) => !current)}
      >
        <span className="flex min-w-0 items-center gap-2">
          {selected?.icon ? <span className="text-unique-gold">{selected.icon}</span> : null}
          <span className="truncate">{selected?.label ?? "-"}</span>
        </span>
        <ChevronDown className={`h-4 w-4 shrink-0 text-white/55 transition ${open ? "rotate-180" : ""}`} aria-hidden />
      </button>
      {open ? (
        <div className="absolute left-3 right-3 top-[78px] z-[90] max-h-72 overflow-y-auto rounded-md border border-unique-gold/45 bg-[#0d1118] p-2 shadow-2xl shadow-black">
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

function AdminSection({ title, className = "", children }: { title: string; className?: string; children: React.ReactNode }) {
  return (
    <section className={`rounded-md border border-white/10 bg-black/20 p-4 ${className}`}>
      <h3 className="mb-3 text-sm font-semibold uppercase tracking-[0.18em] text-unique-gold">{title}</h3>
      {children}
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
    <div className="mb-2 flex items-center justify-between gap-3 rounded-md border border-white/10 bg-white/5 px-3 py-2 text-sm">
      <span className="text-white/80">{label}</span>
      <strong className="text-white">{value}</strong>
    </div>
  );
}

function EmptyAdminText({ text }: { text: string }) {
  return <p className="rounded-md border border-white/10 bg-white/5 px-3 py-3 text-sm text-white/50">{text}</p>;
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

function getNextLevelExperience(level: number) {
  return Math.max(320, level * 320);
}

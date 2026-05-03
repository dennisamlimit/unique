import {
  BadgeCent,
  Banknote,
  BarChart3,
  Briefcase,
  Brush,
  Eye,
  Heart,
  HelpCircle,
  Lock,
  LogIn,
  MapPin,
  Palette,
  Plane,
  Phone,
  Plus,
  Scissors,
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
  const [currentCharacter, setCurrentCharacter] = useState<CharacterInfo | null>(null);
  const [mainMenuOpen, setMainMenuOpen] = useState(false);
  const [adminOpen, setAdminOpen] = useState(false);
  const [adminData, setAdminData] = useState<AdminPanelPayload>({
    admins: [],
    players: [],
    commands: [],
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
            cash: event.payload.character.cash,
            bankBalance: event.payload.character.bankBalance,
            uniqueCoins,
            onlineSeconds: 0
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
          setMainMenuOpen(true);
          return;
        }

        if (event.type === "menu:close") {
          setMainMenuOpen(false);
          return;
        }

        if (event.type === "death:show") {
          setDeathScreen(event.payload);
          setDeathScreenKey((current) => current + 1);
          setChatOpen(false);
          setAdminOpen(false);
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
          setAdminOpen(true);
          return;
        }

        if (event.type === "admin:data") {
          setAdminData(event.payload);
        }
      }
    };

    notifyReady();
    const timer = window.setTimeout(() => setScreen("auth"), 3000);

    return () => {
      window.clearTimeout(timer);
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
          {!adminOpen ? <ChatHud messages={chatMessages} open={chatOpen} deadOnly={deadChatOnly} onClose={() => setChatOpen(false)} /> : null}
          {mainMenuOpen ? <MainMenu character={currentCharacter} hudData={hudData} uniqueCoins={uniqueCoins} onClose={() => setMainMenuOpen(false)} /> : null}
          {adminOpen ? <AdminPanel data={adminData} onClose={() => setAdminOpen(false)} /> : null}
        </>
      ) : null}
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

function MainMenu({
  character,
  hudData,
  uniqueCoins,
  onClose
}: {
  character: CharacterInfo | null;
  hudData: HudDataPayload | null;
  uniqueCoins: number;
  onClose: () => void;
}) {
  const [tab, setTab] = useState<"stats" | "shop" | "ticket" | "settings" | "help">("stats");
  const tabs = [
    ["stats", "Statistik", <BarChart3 className="h-4 w-4" aria-hidden />],
    ["shop", "Shop", <ShoppingBag className="h-4 w-4" aria-hidden />],
    ["ticket", "Ticket", <Ticket className="h-4 w-4" aria-hidden />],
    ["settings", "Einstellung", <Settings className="h-4 w-4" aria-hidden />],
    ["help", "Info", <HelpCircle className="h-4 w-4" aria-hidden />]
  ] as const;

  function close() {
    emitToClient("unique:cef:mainMenuClose", {});
    onClose();
  }

  return (
    <section className="fixed inset-0 z-50 overflow-hidden bg-[#070a0f] text-white">
      <div className="absolute inset-0 app-grid opacity-35" />
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_16%_18%,rgba(29,183,166,0.18),transparent_30%),radial-gradient(circle_at_82%_18%,rgba(241,184,75,0.12),transparent_28%),linear-gradient(115deg,rgba(13,15,20,0.96),rgba(13,15,20,0.72)_48%,rgba(10,12,16,0.90))]" />
      <div className="pointer-events-none absolute left-0 top-0 h-20 w-20 border-l-[6px] border-t-[6px] border-unique-gold/90" />
      <div className="pointer-events-none absolute bottom-0 right-0 h-28 w-28 border-b-[6px] border-r-[6px] border-unique-teal/80" />
      <div className="pointer-events-none absolute left-[7%] top-[31%] text-6xl font-light text-white/10">x</div>
      <div className="pointer-events-none absolute right-[8%] bottom-[20%] text-7xl font-light text-unique-gold/25">x</div>

      <div className="relative flex h-full flex-col px-6 py-6">
        <header className="mx-auto flex w-full max-w-[1720px] items-center justify-between gap-5">
          <div className="flex items-baseline gap-4">
            <h1 className="text-3xl font-black uppercase tracking-wide text-unique-gold">Unique</h1>
            <div>
              <p className="text-sm font-semibold uppercase tracking-[0.22em] text-white/80">M Menu</p>
              <p className="text-xs text-white/40">{character ? `${character.firstName} ${character.lastName}` : "Charakter"}</p>
            </div>
          </div>

          <nav className="hidden items-center gap-2 lg:flex">
            {tabs.map(([id, label, icon]) => (
              <button
                key={id}
                type="button"
                className={`flex h-10 items-center gap-2 rounded-md border px-4 text-sm font-semibold transition ${
                  tab === id ? "border-unique-gold/70 bg-unique-gold/15 text-unique-gold" : "border-white/10 bg-white/5 text-white/60 hover:text-white"
                }`}
                onClick={() => setTab(id)}
              >
                {icon}
                {label}
              </button>
            ))}
          </nav>

          <button className="rounded-md border border-white/10 bg-white/5 p-2 text-white/65 transition hover:text-white" onClick={close}>
            <X className="h-4 w-4" aria-hidden />
          </button>
        </header>

        <div className="mx-auto mt-4 min-h-0 w-full max-w-[1720px] flex-1 overflow-y-auto">
          {tab === "stats" ? (
            <MainMenuStats character={character} hudData={hudData} uniqueCoins={hudData?.uniqueCoins ?? uniqueCoins} />
          ) : null}

          {tab === "shop" ? (
            <MainMenuPanel title="Shop" icon={<ShoppingBag className="h-5 w-5" />}>
              <MenuTile title="Unique Coins" value="Demnaechst" />
              <MenuTile title="Premium Slot" value="Vorbereitet" />
              <MenuTile title="Kosmetik" value="Vorbereitet" />
            </MainMenuPanel>
          ) : null}

          {tab === "ticket" ? (
            <MainMenuPanel title="Ticket" icon={<Ticket className="h-5 w-5" />}>
              <div className="grid gap-4 xl:grid-cols-[1fr_280px]">
                <textarea className="min-h-64 rounded-md border border-white/10 bg-black/30 p-4 text-sm text-white outline-none placeholder:text-white/35" placeholder="Tickettext" />
                <div className="grid content-start gap-3">
                  <MenuTile title="Kategorie" value="Support" />
                  <button className="rounded-md bg-unique-gold px-4 py-3 text-sm font-black text-unique-ink">Ticket vorbereiten</button>
                </div>
              </div>
            </MainMenuPanel>
          ) : null}

          {tab === "settings" ? (
            <MainMenuPanel title="Einstellung" icon={<Settings className="h-5 w-5" />}>
              <label className="flex items-center justify-between rounded-md border border-white/10 bg-white/5 px-4 py-3">
                <span>HUD anzeigen</span>
                <input type="checkbox" className="h-5 w-5 accent-unique-gold" defaultChecked />
              </label>
              <label className="flex items-center justify-between rounded-md border border-white/10 bg-white/5 px-4 py-3">
                <span>Chat sichtbar</span>
                <input type="checkbox" className="h-5 w-5 accent-unique-gold" defaultChecked />
              </label>
            </MainMenuPanel>
          ) : null}

          {tab === "help" ? (
            <MainMenuPanel title="Info" icon={<HelpCircle className="h-5 w-5" />}>
              <MenuTile title="Online Spieler" value={String(hudData?.playerCount ?? 0)} />
              <MenuTile title="Standort" value="Siehe Minimap HUD" />
              <MenuTile title="Admin" value="F3 Dashboard" />
            </MainMenuPanel>
          ) : null}
        </div>
      </div>
    </section>
  );
}

function MainMenuStats({ character, hudData, uniqueCoins }: { character: CharacterInfo | null; hudData: HudDataPayload | null; uniqueCoins: number }) {
  const [now, setNow] = useState(() => Date.now());
  const [onlineBase, setOnlineBase] = useState(() => ({
    seconds: hudData?.onlineSeconds ?? 0,
    receivedAt: Date.now()
  }));
  const characterId = hudData?.characterId ?? character?.id ?? 0;
  const level = Math.max(1, Number(character?.level ?? 1));
  const experience = Math.max(0, Number(character?.experience ?? 0));
  const nextLevelExperience = getNextLevelExperience(level);
  const progress = Math.min(100, Math.round((experience / nextLevelExperience) * 100));
  const org = character?.organization?.trim() || "Kein Unternehmen";
  const orgRank = character?.organizationRank?.trim() || "Keine";
  const married = character?.maritalStatus === "married";
  const displayedOnlineSeconds = Math.max(0, onlineBase.seconds + Math.floor((now - onlineBase.receivedAt) / 1000));

  useEffect(() => {
    const timer = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(timer);
  }, []);

  useEffect(() => {
    setOnlineBase({ seconds: hudData?.onlineSeconds ?? 0, receivedAt: Date.now() });
  }, [hudData?.onlineSeconds]);

  const sideStats = [
    ["Unique Coins", formatNumber(uniqueCoins), <BadgeCent className="h-8 w-8" aria-hidden />],
    ["Kriminelle Aktivitaeten", "Keine Eintraege", <ShieldCheck className="h-8 w-8" aria-hidden />],
    ["Strafen insgesamt", "0", <Ticket className="h-8 w-8" aria-hidden />],
    ["Krankheiten", "N/A", <Heart className="h-8 w-8" aria-hidden />],
    ["Krankheitsimmunitaet", "Nicht verfuegbar", <Sparkles className="h-8 w-8" aria-hidden />],
    ["Telefonnummer", String(100000 + characterId), <Phone className="h-8 w-8" aria-hidden />],
    ["Heute online", formatOnlineDuration(displayedOnlineSeconds), <BarChart3 className="h-8 w-8" aria-hidden />],
    ["Familienname", "-", <Users className="h-8 w-8" aria-hidden />],
    ["Position in der Familie", "-", <Star className="h-8 w-8" aria-hidden />],
    ["VIP Tage", "0", <Star className="h-8 w-8 fill-white" aria-hidden />],
    ["Ehepartner", married ? "Verheiratet" : "Nicht verheiratet", <Heart className="h-8 w-8" aria-hidden />]
  ] as const;

  const licenses = [
    "Fuehrerschein",
    "Bootsschein",
    "Luftverkehrslizenz",
    "Waffenschein",
    "Militaerische ID",
    "Anwaltslizenz",
    "Krankenversicherung"
  ] as const;

  return (
    <div className="grid min-h-full grid-cols-1 gap-6 pb-4 lg:grid-cols-[310px_minmax(0,1fr)_420px]">
      <aside className="grid content-start gap-4 pt-8">
        {sideStats.map(([label, value, icon]) => (
          <div key={label} className="grid grid-cols-[42px_1fr] items-center gap-4">
            <span className="text-white">{icon}</span>
            <span>
              <span className="block text-[11px] font-black uppercase tracking-[0.12em] text-white/35">{label}</span>
              <strong className="mt-1 block text-sm uppercase text-white">{value}</strong>
            </span>
          </div>
        ))}
      </aside>

      <section className="flex min-w-0 flex-col items-center pt-8">
        <div className="text-center">
          <p className="text-3xl font-black uppercase leading-none">
            Konto <span className="text-unique-gold">#{characterId || "0000"}</span>
          </p>
          <div className="mt-7 flex flex-wrap items-center justify-center gap-8">
            <div className="flex items-center gap-4">
              <div className="relative h-14 w-14 rounded-full" style={{ background: `conic-gradient(#f1b84b ${progress}%, rgba(255,255,255,0.10) 0)` }}>
                <div className="absolute inset-2 rounded-full bg-[#10141b]" />
              </div>
              <div className="text-left">
                <p className="text-2xl font-black uppercase text-unique-gold">Lvl {level}</p>
                <p className="mt-1 text-lg font-semibold text-white">{formatNumber(experience)} / {formatNumber(nextLevelExperience)}</p>
              </div>
            </div>
            <div className="text-left">
              <p className="text-[11px] font-black uppercase tracking-[0.14em] text-white/45">VIP Status</p>
              <p className="mt-1 flex items-center gap-2 text-xl font-black uppercase text-white">VIP inaktiv <Star className="h-6 w-6 fill-unique-gold text-unique-gold" aria-hidden /></p>
            </div>
          </div>
        </div>

        <div className="mt-9 grid w-full max-w-[760px] gap-3 md:grid-cols-2">
          <div className="min-h-40 rounded-md border border-white/10 bg-black/25 p-5">
            <div className="flex items-start justify-between gap-4 text-white/35">
              <p className="text-xs font-black uppercase tracking-[0.16em]">Unternehmen</p>
              <Briefcase className="h-7 w-7" aria-hidden />
            </div>
            <p className="mt-16 max-w-48 text-xl font-semibold uppercase text-white/50">{org}</p>
          </div>

          <div className="relative min-h-40 overflow-hidden rounded-md border border-white/10 bg-[linear-gradient(135deg,rgba(29,183,166,0.34),rgba(241,184,75,0.12)),radial-gradient(circle_at_78%_20%,rgba(255,255,255,0.22),transparent_34%)] p-5">
            <div className="absolute inset-0 app-grid opacity-20" />
            <div className="relative">
              <p className="text-xs font-black uppercase tracking-[0.16em] text-white/70">Organisation</p>
              <p className="mt-12 text-sm font-black uppercase text-white/80">{orgRank}</p>
              <h2 className="mt-2 text-2xl font-black uppercase text-white">{org}</h2>
            </div>
          </div>
        </div>

        <div className="mt-3 grid w-full max-w-[760px] gap-3 md:grid-cols-[1fr_190px]">
          <div className="relative min-h-72 overflow-hidden rounded-md border border-unique-teal/25 bg-[linear-gradient(120deg,rgba(29,183,166,0.34),rgba(17,19,24,0.72)),radial-gradient(circle_at_80%_50%,rgba(241,184,75,0.20),transparent_36%)] p-8">
            <div className="absolute inset-0 app-grid opacity-20" />
            <div className="relative">
              <h2 className="max-w-xs text-4xl font-black uppercase leading-tight text-white">Meine Faehigkeiten</h2>
              <button type="button" className="mt-24 rounded-md border border-unique-teal bg-black/30 px-5 py-2 text-xs font-black uppercase text-white transition hover:bg-unique-teal hover:text-unique-ink">
                Ansehen
              </button>
            </div>
          </div>
          <div className="grid gap-3">
            <StatsMoneyTile label="Bargeld" value={formatMoney(hudData?.cash ?? character?.cash ?? 0)} icon={<Banknote className="h-5 w-5" aria-hidden />} />
            <StatsMoneyTile label="Bank" value={formatMoney(hudData?.bankBalance ?? character?.bankBalance ?? 0)} icon={<Briefcase className="h-5 w-5" aria-hidden />} />
            <StatsMoneyTile label="Geschlecht" value={character?.appearance?.gender === "female" ? "Weiblich" : "Maennlich"} icon={<UserRound className="h-5 w-5" aria-hidden />} />
          </div>
        </div>

        <div className="mt-3 flex w-full max-w-[760px] items-center justify-between gap-5 rounded-md border border-unique-gold bg-unique-gold/10 px-7 py-4">
          <p className="text-xl font-black uppercase leading-tight text-white">Sammlerstueck<br />Karte</p>
          <Trophy className="h-12 w-12 fill-unique-gold text-unique-gold" aria-hidden />
          <p className="text-right text-sm font-black uppercase text-white">
            Insgesamt gesammelt:<br /><span className="text-2xl text-unique-gold">0 Figuren</span>
          </p>
        </div>
      </section>

      <aside className="grid content-center gap-6 pt-8">
        <section className="rounded-md border border-unique-gold/25 bg-unique-gold/10 p-5">
          <div className="flex items-center justify-between gap-5">
            <div>
              <p className="text-[11px] font-black uppercase tracking-[0.18em] text-unique-gold">Aktive Warnungen</p>
              <p className="mt-2 text-sm font-semibold text-white/60">Verwarnsystem vorbereitet</p>
            </div>
            <strong className="text-5xl font-black text-white">0</strong>
          </div>
          <div className="mt-6 rounded-md border border-white/10 bg-black/20 px-4 py-5 text-center text-sm font-bold uppercase text-white/40">
            Keine aktiven Warnungen
          </div>
        </section>

        <div className="rounded-md border border-white/10 bg-white/5 p-5">
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="text-[11px] font-black uppercase tracking-[0.18em] text-white/45">Aktive Lizenzen</p>
              <h3 className="mt-2 text-xl font-black uppercase text-white">Leer</h3>
            </div>
            <Ticket className="h-8 w-8 text-white/30" aria-hidden />
          </div>
          <div className="mt-5 grid gap-2">
            {licenses.map((label) => (
              <div key={label} className="flex items-center justify-between gap-3 rounded-md border border-dashed border-white/10 bg-black/20 px-4 py-3">
                <span className="text-sm font-black uppercase text-white/50">{label}</span>
                <span className="text-xs font-bold uppercase text-white/30">-</span>
              </div>
            ))}
          </div>
        </div>
      </aside>
    </div>
  );
}

function StatsMoneyTile({ label, value, icon }: { label: string; value: string; icon: React.ReactNode }) {
  return (
    <div className="rounded-md border border-white/10 bg-black/20 p-4">
      <p className="flex items-center gap-2 text-xs font-black uppercase tracking-[0.14em] text-white/35">{icon}{label}</p>
      <p className="mt-2 text-lg font-black text-white">{value}</p>
    </div>
  );
}

function MainMenuPanel({ title, icon, children }: { title: string; icon: React.ReactNode; children: React.ReactNode }) {
  return (
    <section className="animate-panel rounded-md border border-white/10 bg-[#111318]/64 p-6 shadow-2xl shadow-black/30 backdrop-blur-sm">
      <h3 className="mb-5 flex items-center gap-2 text-xl font-semibold text-white">
        <span className="text-unique-gold">{icon}</span>
        {title}
      </h3>
      <div className="grid gap-4">{children}</div>
    </section>
  );
}

function MenuTile({ title, value }: { title: string; value: string }) {
  return (
    <div className="rounded-md border border-white/10 bg-white/5 p-4">
      <p className="text-xs uppercase tracking-[0.16em] text-white/35">{title}</p>
      <p className="mt-2 text-xl font-semibold text-white">{value}</p>
    </div>
  );
}

function WorldHud({ data, location }: { data: HudDataPayload | null; location: HudLocationPayload }) {
  const [now, setNow] = useState(() => new Date());

  useEffect(() => {
    const timer = window.setInterval(() => setNow(new Date()), 1000);
    return () => window.clearInterval(timer);
  }, []);

  return (
    <section className="pointer-events-none fixed inset-0 z-20">
      <div className="absolute right-8 top-5 flex w-[360px] flex-col items-end text-right drop-shadow-[0_2px_2px_rgba(0,0,0,.55)]">
        <div className="flex items-start justify-end gap-3">
          <div>
            <p className="text-[34px] font-black italic leading-none text-white">
              unique<span className="text-unique-gold">rp</span>
            </p>
            <div className="mt-2 flex items-center justify-end gap-4 text-[18px] font-black text-white">
              <span><span className="text-unique-gold">ID:</span> {data?.characterId ?? 0}</span>
              <span className="flex items-center gap-1.5">
                <Users className="h-5 w-5 fill-unique-gold text-unique-gold" aria-hidden />
                {data?.playerCount ?? 0}
              </span>
            </div>
          </div>
          <div className="relative grid h-16 w-12 place-items-center bg-unique-gold text-xl font-black text-unique-ink shadow-[0_0_24px_rgba(241,184,75,.36)] after:absolute after:bottom-0 after:h-0 after:w-0 after:border-x-[24px] after:border-b-[12px] after:border-x-unique-gold after:border-b-transparent">
            1
          </div>
        </div>

        <div className="mt-28 flex flex-col items-end gap-4">
          <div className="flex items-center gap-3 text-unique-teal/95">
            <ShieldCheck className="h-9 w-9" aria-hidden />
            <span className="text-3xl font-black uppercase tracking-[0.08em]">Green</span>
            <span className="origin-center rotate-90 text-[10px] font-black uppercase tracking-[0.16em] text-unique-gold">Zone</span>
          </div>

          <div>
            <p className="text-[42px] font-black leading-none text-white">{formatMoney(data?.cash ?? 0)}</p>
            <div className="mt-4 flex items-center justify-end gap-3 text-[21px] font-black text-white/90">
              <Banknote className="h-7 w-7 text-white" aria-hidden />
              {formatMoney(data?.bankBalance ?? 0)}
            </div>
          </div>
        </div>
      </div>

      <div className="absolute bottom-8 left-[330px] max-w-[360px] rounded-md border-l-2 border-unique-gold bg-black/48 px-4 py-3 shadow-[0_0_24px_rgba(0,0,0,.28)] backdrop-blur-[2px]">
        <div className="flex items-center gap-2 text-[11px] font-black uppercase tracking-[0.18em] text-unique-gold">
          <MapPin className="h-4 w-4" aria-hidden />
          Standort
        </div>
        <p className="mt-2 truncate text-xl font-semibold text-white">{location.street}</p>
        <p className="mt-1 truncate text-sm text-white/55">
          {location.crossing ? `${location.crossing} · ${location.area}` : location.area}
        </p>
      </div>

      <div className="absolute bottom-8 right-8 text-right drop-shadow-[0_2px_2px_rgba(0,0,0,.7)]">
        <p className="font-mono text-3xl font-black text-white">{formatClock(now)}</p>
        <p className="mt-1 font-mono text-sm font-bold uppercase tracking-[0.16em] text-white/60">{formatDate(now)}</p>
      </div>
    </section>
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

function AdminPanel({ data, onClose }: { data: AdminPanelPayload; onClose: () => void }) {
  const [tab, setTab] = useState<"admins" | "players" | "commands" | "permissions">("players");
  const onlineAdmins = data.admins.filter((admin) => admin.online);
  const offlineAdmins = data.admins.filter((admin) => !admin.online);
  const commandHelp = [
    ["/admin", "Adminmodus aktivieren oder deaktivieren"],
    ["/dim [charId]", "Dimension anzeigen"],
    ["/setdim <dimension>", "Eigene Dimension setzen"],
    ["/setdim <charId> <dimension>", "Spieler in Dimension setzen"],
    ["/msg <nachricht>", "Serverweite Admin-Nachricht senden"],
    ["/veh [modell] [r g b] [kennzeichen]", "Fahrzeug spawnen"],
    ["/heal", "Dich selbst heilen"],
    ["/heal <charId>", "Spieler per Charakter-ID heilen"],
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
            <AdminSummary icon={<Terminal className="h-4 w-4" />} label="Befehle" value={String(data.commands.length)} />
          </div>

          <nav className="mt-7 grid gap-2">
            <AdminTab active={tab === "players"} label="Online Spieler" onClick={() => setTab("players")} />
            <AdminTab active={tab === "admins"} label="Admins" onClick={() => setTab("admins")} />
            <AdminTab active={tab === "commands"} label="Befehle" onClick={() => setTab("commands")} />
            {data.canManagePermissions ? <AdminTab active={tab === "permissions"} label="Berechtigungen" onClick={() => setTab("permissions")} /> : null}
          </nav>
        </aside>

        <div className="min-h-0 overflow-y-auto p-6">
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

function getNextLevelExperience(level: number) {
  return Math.max(320, level * 320);
}

/// <reference types="vite/client" />

interface Window {
  mp?: {
    trigger(eventName: string, ...args: unknown[]): void;
  };
  uniqueBridge?: {
    receive(message: UiMessage): void;
  };
}

type UiMessage =
  | { type: "auth:bootstrap"; payload: AuthBootstrap }
  | { type: "auth:error"; payload: ErrorPayload }
  | { type: "characters:error"; payload: ErrorPayload }
  | { type: "creator:start"; payload: CreatorStartPayload }
  | { type: "characters:list"; payload: CharacterListPayload }
  | { type: "spawn:options"; payload: SpawnOptionsPayload }
  | { type: "world:enter"; payload: { character: CharacterInfo; uiTheme?: string | null } }
  | { type: "hud:data"; payload: HudDataPayload }
  | { type: "hud:location"; payload: HudLocationPayload }
  | { type: "vehicle:hud"; payload: VehicleHudPayload }
  | { type: "chat:push"; payload: ChatMessage }
  | { type: "chat:open"; payload: ChatOpenPayload }
  | { type: "menu:open"; payload: Record<string, never> }
  | { type: "menu:close"; payload: Record<string, never> }
  | { type: "support:ticketResult"; payload: { ok: boolean; message: string } }
  | { type: "support:tickets"; payload: { tickets: SupportTicket[] } }
  | { type: "support:muteNotice"; payload: SupportMuteNoticePayload }
  | { type: "chat:muteNotice"; payload: ChatMuteNoticePayload }
  | { type: "admin:screen"; payload: AdminScreenNoticePayload }
  | { type: "admin:jailStatus"; payload: AdminJailStatusPayload }
  | { type: "death:show"; payload: DeathScreenPayload }
  | { type: "death:hide"; payload: Record<string, never> }
  | { type: "admin:open"; payload: Record<string, never> }
  | { type: "admin:close"; payload: Record<string, never> }
  | { type: "inventory:open"; payload: Record<string, never> }
  | { type: "inventory:close"; payload: Record<string, never> }
  | { type: "inventory:nearbyPlayers"; payload: InventoryNearbyPlayersPayload }
  | { type: "interaction:hint"; payload: { visible: boolean; target?: VehicleInteractionTarget } }
  | { type: "interaction:open"; payload: VehicleInteractionTarget }
  | { type: "interaction:close"; payload: Record<string, never> }
  | { type: "admin:data"; payload: AdminPanelPayload };

interface AuthBootstrap {
  socialClubName: string;
  socialClubId: string;
  knownEmail: string | null;
  uiTheme?: string | null;
}

interface ErrorPayload {
  message: string;
}

interface InventoryNearbyPlayersPayload {
  players: Array<{
    remoteId: number;
    name: string;
    distance: number;
  }>;
}

interface CharacterInfo {
  id: number;
  accountId: number;
  slot: number;
  firstName: string;
  lastName: string;
  level: number;
  experience: number;
  organization: string;
  organizationRank: string;
  maritalStatus: "single" | "married";
  bankBalance: number;
  cash: number;
  appearance: CharacterAppearance;
}

interface CharacterListPayload {
  characters: CharacterInfo[];
  uniqueCoins: number;
  uiTheme?: string | null;
}

interface CreatorStartPayload {
  slot: number;
  appearance: CharacterAppearance;
}

interface SpawnOptionsPayload {
  character: CharacterInfo;
  options: Array<{
    id: "server" | "last" | "faction" | "house";
    title: string;
    description: string;
    enabled: boolean;
  }>;
}

interface DeathScreenPayload {
  seconds: number;
}

interface HudDataPayload {
  characterId: number;
  playerCount: number;
  maxPlayers?: number;
  cash: number;
  bankBalance: number;
  uniqueCoins?: number;
  onlineSeconds?: number;
  adminMode?: boolean;
  tickets?: number;
}

interface HudLocationPayload {
  street: string;
  crossing: string;
  area: string;
}

interface ChatMessage {
  tone: "say" | "ooc" | "me" | "do" | "try" | "admin" | "info" | "error";
  author: string;
  text: string;
  time?: string;
}

interface ChatOpenPayload {
  dead?: boolean;
}

type VehicleInteractionActionId = "lock" | "engine" | "doors" | "trunk" | "hood" | "glovebox" | "passengers" | "keys" | "search" | "repair";

interface VehicleHudPayload {
  visible: boolean;
  speed?: number;
  fuel?: number;
  motorHealth?: number;
  engineOn?: boolean;
  cruise?: boolean;
  locked?: boolean;
}

interface VehicleInteractionTarget {
  id: number;
  type: "vehicle";
  name: string;
  subtitle?: string;
  distance: number;
  screen?: {
    x: number;
    y: number;
  } | null;
  meta?: {
    locked?: boolean;
    engineOn?: boolean;
    trunkOpen?: boolean;
    hoodOpen?: boolean;
    damaged?: boolean;
    hasKey?: boolean;
    repairReady?: boolean;
  };
}

interface SupportMuteNoticePayload {
  administrator: string;
  reason: string;
  expiresAt: string;
}

interface ChatMuteNoticePayload {
  administrator: string;
  reason: string;
  expiresAt: string;
}

interface AdminScreenNoticePayload {
  type: "amsg" | "ban" | "iban" | "jail" | "warn" | "mute";
  title: string;
  administrator: string;
  administratorId: number | null;
  targetName?: string;
  reason?: string;
  message?: string;
  duration?: string;
  expiresAt?: string;
  createdAt?: string;
}

interface AdminJailStatusPayload {
  active: boolean;
  type?: "jail" | "warn";
  administrator?: string;
  reason?: string;
  expiresAt?: string;
  durationSeconds?: number;
}

interface AdminPanelPayload {
  admins: Array<{ accountId: number; characterId: number | null; name: string; level: number; online: boolean }>;
  players: Array<{
    id: number;
    name: string;
    adminLevel: number;
    level: number;
    cash: number;
    bankBalance: number;
    uniqueCoins: number;
  }>;
  commands: Array<{ command: string; minLevel: number }>;
  logs: AdminLogEntry[];
  tickets: SupportTicket[];
  currentAdminLevel: number;
  adminMode: boolean;
  canManagePermissions: boolean;
  canViewLogs: boolean;
}

interface AdminLogEntry {
  id: number;
  adminAccountId: number | null;
  adminCharacterId: number | null;
  adminName: string;
  command: string;
  rawArgs: string;
  details: string | null;
  success: boolean;
  createdAt: string;
}

interface SupportTicket {
  id: number;
  characterId: number;
  accountId: number;
  characterName: string;
  category: "stuck" | "bug" | "player" | "account" | "shop" | "faction" | "event" | "other";
  subject: string;
  message: string;
  status: "open" | "in_progress" | "closed";
  priority: "low" | "normal" | "high" | "critical";
  assignedAdminAccountId: number | null;
  assignedAdminName: string | null;
  escalatedToLevel: number | null;
  ownerOnline?: boolean;
  createdAt: string;
  updatedAt: string;
  messages: SupportTicketMessage[];
}

interface SupportTicketMessage {
  id: number;
  ticketId: number;
  authorCharacterId: number | null;
  authorAccountId: number | null;
  authorName: string;
  authorRole: "player" | "admin" | "system";
  message: string;
  createdAt: string;
}

interface CharacterAppearance {
  gender: "male" | "female";
  blendData: number[];
  eyeColor: number;
  hair: number[];
  beard: number[];
  faceFeatures: number[];
  headOverlays: number[];
  headOverlayColors: number[];
  headOverlayOpacities: number[];
  clothing: number[];
  clothingTextures: number[];
  props: number[];
  propTextures: number[];
}

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
  | { type: "world:enter"; payload: { character: CharacterInfo } }
  | { type: "hud:data"; payload: HudDataPayload }
  | { type: "hud:location"; payload: HudLocationPayload }
  | { type: "chat:push"; payload: ChatMessage }
  | { type: "chat:open"; payload: ChatOpenPayload }
  | { type: "menu:open"; payload: Record<string, never> }
  | { type: "menu:close"; payload: Record<string, never> }
  | { type: "death:show"; payload: DeathScreenPayload }
  | { type: "death:hide"; payload: Record<string, never> }
  | { type: "admin:open"; payload: Record<string, never> }
  | { type: "admin:data"; payload: AdminPanelPayload };

interface AuthBootstrap {
  socialClubName: string;
  socialClubId: string;
  knownEmail: string | null;
}

interface ErrorPayload {
  message: string;
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
  cash: number;
  bankBalance: number;
  uniqueCoins?: number;
  onlineSeconds?: number;
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
  currentAdminLevel: number;
  adminMode: boolean;
  canManagePermissions: boolean;
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

export interface VehicleMp {
  getVariable(key: string): unknown;
  setVariable(key: string, value: unknown): void;
  bodyHealth: number;
  engine: boolean;
  locked: boolean;
}

export interface PlayerMp {
  id: number;
  name: string;
  rgscId?: string;
  socialClubId?: string;
  socialClubName?: string;
  socialClub?: string;
  serial?: string;
  position: { x: number; y: number; z: number };
  dimension?: number;
  heading?: number;
  rotation?: { x: number; y: number; z: number };
  health: number;
  armour?: number;
  armor?: number;
  vehicle?: VehicleMp | null;
  call(event: string, args?: unknown[]): void;
  setVariable(key: string, value: unknown): void;
  getVariable(key: string): unknown;
  outputChatBox(message: string): void;
}

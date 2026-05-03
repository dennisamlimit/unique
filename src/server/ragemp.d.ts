declare const mp: RageMpServer;

interface RageMpVector3 {
  x: number;
  y: number;
  z: number;
}

interface RageMpPlayer {
  id: number;
  name: string;
  socialClub?: string;
  rgscId?: string;
  dimension: number;
  health: number;
  armour: number;
  heading?: number;
  position?: RageMpVector3;
  model?: number;
  call(eventName: string, args?: unknown[]): void;
  outputChatBox(message: string): void;
  kick(reason?: string): void;
  spawn(position: RageMpVector3): void;
  putIntoVehicle?(vehicle: RageMpVehicle, seat: number): void;
}

interface RageMpVehicle {
  dimension: number;
  position?: RageMpVector3;
}

interface RageMpServer {
  Vector3: new (x: number, y: number, z: number) => RageMpVector3;
  vehicles: {
    new(model: string | number, position: RageMpVector3, options?: Record<string, unknown>): RageMpVehicle;
  };
  events: {
    add(eventName: string, handler: (...args: any[]) => void): void;
    addCommand(command: string, handler: (player: RageMpPlayer, ...args: string[]) => void): void;
  };
  players: {
    at(id: number): RageMpPlayer | undefined;
    forEach(handler: (player: RageMpPlayer) => void): void;
  };
}

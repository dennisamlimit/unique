declare const mp: {
  Vector3: new (x: number, y: number, z: number) => unknown;
  joaat: (name: string) => number;
  console: { logInfo: (message: string) => void; logWarning: (message: string) => void; logError: (message: string) => void };
  events: { add: (name: string, handler: (...args: any[]) => void) => void; addCommand: (name: string, handler: (player: any, fullText: string, ...args: any[]) => void) => void; call: (name: string, ...args: any[]) => void };
  players: { forEach: (callback: (player: any) => void) => void; at: (id: number) => any };
  vehicles: { new: (model: number, position: unknown, options?: Record<string, unknown>) => any };
};

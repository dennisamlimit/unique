// RAGE:MP Client-Side Type Declarations

declare namespace Mp {
  interface Vector3 {
    x: number;
    y: number;
    z: number;
  }

  interface Player {
    readonly id: number;
    readonly remoteId: number;
    name: string;
    position: Vector3;
    heading: number;
    health: number;
    armour: number;
    alpha: number;
    dimension: number;
    vehicle: Vehicle | null;
    handle: number;

    getVariable(key: string): unknown;
    setVariable(key: string, value: unknown): void;
    call(event: string, args?: unknown[]): void;
    isInAnyVehicle(atGetIn?: boolean): boolean;
    isInjured(): boolean;
    getPitch(): number;
    getHeading(): number;
    setConfigFlag(flag: number, value: boolean): void;
    taskMoveNetwork(task: string, blend: number, secondaryTask: boolean, dict: string, flags: number): void;
    clearSecondaryTask(): void;
    getOffsetFromGivenWorldCoords(x: number, y: number, z: number): Vector3;
  }

  interface LocalPlayer extends Player {
    lastReceivedPointing?: number;
    pointingInterval?: ReturnType<typeof setInterval>;
  }

  interface Vehicle {
    readonly remoteId: number;
    position: Vector3;
    model: number;
    handle: number;

    getHeading(): number;
    getHealth(): number;
    getNumberPlateText(): string;
  }

  interface Browser {
    active: boolean;
    execute(js: string): void;
  }

  interface Camera {
    getRot(order: number): Vector3;
  }

  interface PlayersPool {
    readonly local: LocalPlayer;
    readonly length: number;
    forEach(callback: (player: Player) => void): void;
    forEachInStreamRange(callback: (player: Player) => void): void;
    atRemoteId(id: number): Player | null;
  }

  interface VehiclesPool {
    forEach(callback: (vehicle: Vehicle) => void): void;
    forEachInStreamRange(callback: (vehicle: Vehicle) => void): void;
    toArray(): Vehicle[];
  }

  interface BrowsersPool {
    new: (url: string) => Browser;
  }

  interface CamerasPool {
    new: (type: string, pos?: Vector3, rot?: Vector3, fov?: number) => any;
  }

  interface KeysApi {
    bind(key: number, keydown: boolean, callback: () => void): void;
  }

  interface GuiCursor {
    readonly visible: boolean;
    show(visible: boolean, locked: boolean): void;
  }

  interface Gui {
    cursor: GuiCursor;
  }

  interface Graphics {
    notify(message: string): void;
    drawText(text: string, position: [number, number], options: {
      font?: number;
      color?: [number, number, number, number];
      scale?: [number, number];
      outline?: boolean;
      centre?: boolean;
    }): void;
    drawMarker(
      type: number, x: number, y: number, z: number,
      dirX: number, dirY: number, dirZ: number,
      rotX: number, rotY: number, rotZ: number,
      scaleX: number, scaleY: number, scaleZ: number,
      r: number, g: number, b: number, a: number,
      bobUpDown: boolean, faceCamera: boolean, p19: number,
      rotate: boolean, textureDict: null, textureName: null, drawOnEnts: boolean
    ): void;
    world3dToScreen2d(x: number, y: number, z: number): { x: number; y: number } | null;
    getScreenCoordFromWorldCoord(x: number, y: number, z: number): { x: number; y: number } | null;
    getScreenResolution(p0: number, p1: number): { x: number; y: number } | null;
    setEntityOverlayPassEnabled(enabled: boolean): void;
    createEntityOverlayBatch(params: Record<string, unknown>): EntityOverlayBatch | null;
  }

  interface EntityOverlayBatch {
    update(params: Record<string, unknown>): void;
    addThisFrame(entity: Vehicle | Player): void;
    removeThisFrame(entity: Vehicle | Player): void;
  }

  interface Streaming {
    requestAnimDict(dict: string): void;
    hasAnimDictLoaded(dict: string): boolean;
    removeAnimDict(dict: string): void;
  }

  interface Vehicle2 {
    getDisplayNameFromVehicleModel(model: number): string;
  }

  interface Ui {
    getLabelText(key: string): string;
    getStreetNameFromHashKey(hash: number): string;
    hideHudComponentThisFrame(component: number): void;
    isPauseMenuActive(): boolean;
  }

  interface Zone {
    getNameOfZone(x: number, y: number, z: number): string;
  }

  interface Pathfind {
    getStreetNameAtCoord(
      x: number, y: number, z: number, p3: number, p4: number
    ): { streetName: number; crossingRoad: number } | null;
  }

  interface Controls {
    disableControlAction(inputGroup: number, control: number, disable: boolean): void;
  }

  interface Cam {
    getGameplayCamRot(rotationOrder: number): Vector3;
    getGameplayCamRelativeHeading(): number;
    getGameplayCamCoord(): Vector3;
  }

  interface System {
    cos(angle: number): number;
    sin(angle: number): number;
  }

  interface Game {
    wait(ms: number): void;
    invoke(hash: string, ...args: unknown[]): unknown;
    graphics: Graphics;
    streaming: Streaming;
    vehicle: Vehicle2;
    ui: Ui;
    zone: Zone;
    pathfind: Pathfind;
    controls: Controls;
    cam: Cam;
    system: System;
  }

  interface Raycasting {
    testPointToPoint(
      origin: [number, number, number],
      target: [number, number, number],
      ignoreEntity: number,
      flags: number
    ): unknown;
  }

  interface EventsPool {
    add(event: string, callback: (...args: unknown[]) => void): void;
    call(event: string, ...args: unknown[]): void;
    callRemote(event: string, ...args: unknown[]): void;
  }

  interface MpObject {
    players: PlayersPool;
    vehicles: VehiclesPool;
    browsers: BrowsersPool;
    cameras: CamerasPool;
    keys: KeysApi;
    gui: Gui;
    game: Game;
    raycasting: Raycasting;
    events: EventsPool;
    trigger(event: string, ...args: unknown[]): void;
    Vector3: new (x: number, y: number, z: number) => Vector3;
  }
}

declare const mp: Mp.MpObject;

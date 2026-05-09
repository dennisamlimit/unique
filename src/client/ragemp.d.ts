declare const mp: RageMpClient;

interface RageMpVector3 {
  x: number;
  y: number;
  z: number;
}

interface RageMpBrowser {
  execute(code: string): void;
  destroy(): void;
}

interface RageMpVehicle {
  remoteId?: number;
  model?: number;
  position: RageMpVector3;
  getHealth?(): number;
  getVariable?(key: string): unknown;
  getSpeed?(): number;
  setEngineOn?(toggle: boolean, instantly: boolean, otherwise: boolean): void;
  setUndriveable?(toggle: boolean): void;
  setDoorsLocked?(state: number): void;
  setDoorOpen?(doorIndex: number, loose: boolean, instantly: boolean): void;
  setDoorShut?(doorIndex: number, instantly: boolean): void;
  isInAir?(): boolean;
  isUpsideDown?(): boolean;
  getRotation?(order: number): RageMpVector3;
}

interface RageMpRemotePlayer {
  remoteId?: number;
  name?: string;
  handle?: number;
  position: RageMpVector3;
  getVariable?(key: string): unknown;
}

interface RageMpEntityOverlayBatch {
  update?(params: Record<string, unknown>): void;
  addThisFrame(entity: RageMpVehicle): void;
}

interface RageMpClient {
  Vector3: new (x: number, y: number, z: number) => RageMpVector3;
  events: {
    add(eventName: string, handler: (...args: any[]) => void): void;
    addCommand(command: string, handler: (player: RageMpPlayer, ...args: string[]) => void): void;
    callRemote(eventName: string, ...args: unknown[]): void;
  };
  browsers: {
    new: (url: string) => RageMpBrowser;
  };
  players: {
    atRemoteId?(remoteId: number): RageMpRemotePlayer | null;
    toArray?(): RageMpRemotePlayer[];
    local: {
      model: number;
      handle?: number;
      heading?: number;
      vehicle?: RageMpVehicle | null;
      freezePosition(toggle: boolean): void;
      position: RageMpVector3;
      setHeading?(heading: number): void;
      setInvincible?(toggle: boolean): void;
      setVisible?(toggle: boolean, unk: boolean): void;
      setCollision?(toggle: boolean, keepPhysics: boolean): void;
      getRotation(order: number): RageMpVector3;
      setHeadBlendData(
        shapeFirstId: number,
        shapeSecondId: number,
        shapeThirdId: number,
        skinFirstId: number,
        skinSecondId: number,
        skinThirdId: number,
        shapeMix: number,
        skinMix: number,
        thirdMix: number,
        isParent: boolean
      ): void;
      setEyeColor(color: number): void;
      setComponentVariation(componentId: number, drawableId: number, textureId: number, paletteId: number): void;
      setHairColor(colorId: number, highlightColorId: number): void;
      setHeadOverlay(overlayId: number, index: number, opacity: number, firstColor: number, secondColor: number): void;
      setFaceFeature(index: number, scale: number): void;
      setPropIndex(componentId: number, drawableId: number, textureId: number, attach: boolean): void;
      clearProp(componentId: number): void;
    };
  };
  vehicles?: {
    forEach?(callback: (vehicle: RageMpVehicle) => void): void;
    forEachInStreamRange?(callback: (vehicle: RageMpVehicle) => void): void;
    toArray?(): RageMpVehicle[];
  };
  cameras: {
    new: (name: string, position: RageMpVector3, rotation: RageMpVector3, fov: number) => RageMpCamera;
  };
  game: {
    joaat(modelName: string): number;
    controls: {
      disableControlAction(inputGroup: number, control: number, disable: boolean): void;
      getDisabledControlNormal(inputGroup: number, control: number): number;
    };
    graphics: {
      notify(message: string): void;
      drawText(
        text: string,
        position: [number, number, number] | RageMpVector3,
        options: {
          font?: number;
          color?: [number, number, number, number];
          scale?: [number, number];
          outline?: boolean;
          centre?: boolean;
        }
      ): void;
      drawMarker(
        type: number,
        x: number,
        y: number,
        z: number,
        dirX: number,
        dirY: number,
        dirZ: number,
        rotX: number,
        rotY: number,
        rotZ: number,
        scaleX: number,
        scaleY: number,
        scaleZ: number,
        r: number,
        g: number,
        b: number,
        a: number,
        bobUpDown: boolean,
        faceCamera: boolean,
        p19: number,
        rotate: boolean,
        textureDict: null,
        textureName: null,
        drawOnEnts: boolean
      ): void;
      world3dToScreen2d?(x: number, y: number, z: number): unknown;
      setEntityOverlayPassEnabled?(enabled: boolean): void;
      createEntityOverlayBatch?(params: Record<string, unknown>): RageMpEntityOverlayBatch | null;
    };
    gameplay?: {
      getGroundZFor3dCoord(x: number, y: number, z: number, groundZ: number, ignoreWater: boolean): number;
    };
    player: {
      playerId?(): number;
      setModel(model: number): void;
      setRunSprintMultiplierFor?(playerId: number, multiplier: number): void;
    };
    cam: {
      renderScriptCams(toggle: boolean, ease: boolean, easeTime: number, p3: boolean, p4: boolean): void;
      getGameplayCamRot?(rotationOrder: number): RageMpVector3;
      getGameplayCamCoord?(): RageMpVector3;
    };
    network?: {
      setInSpectatorMode?(toggle: boolean, targetHandle: number): void;
    };
    ui: {
      getLabelText?(key: string): string;
      getStreetNameFromHashKey?(hash: number): string;
      displayHud(toggle: boolean): void;
      displayRadar(toggle: boolean): void;
      getFirstBlipInfoId?(blipSprite: number): number;
      doesBlipExist?(blip: number): boolean;
      getBlipInfoIdCoord?(blip: number): RageMpVector3;
    };
    vehicle?: {
      getDisplayNameFromVehicleModel?(model: number): string;
    };
    zone?: {
      getNameOfZone?(x: number, y: number, z: number): string;
    };
    pathfind?: {
      getStreetNameAtCoord?(
        x: number,
        y: number,
        z: number,
        p3: number,
        p4: number
      ): { streetName: number; crossingRoad: number } | null;
    };
  };
  gui: {
    chat: {
      show(toggle: boolean): void;
      push(message: string): void;
    };
    cursor: {
      show(show: boolean, freezeControls: boolean): void;
    };
  };
  keys: {
    bind(keyCode: number, onKeyDown: boolean, handler: () => void): void;
    isDown(keyCode: number): boolean;
  };
}

interface RageMpCamera {
  setActive(toggle: boolean): void;
  pointAtCoord(x: number, y: number, z: number): void;
  setCoord(x: number, y: number, z: number): void;
  getCoord?(): RageMpVector3;
  getRot?(order: number): RageMpVector3;
  getDirection?(): RageMpVector3;
  setRot?(x: number, y: number, z: number, order: number): void;
  setFov?(fov: number): void;
  destroy(): void;
}

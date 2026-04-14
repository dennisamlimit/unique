/// <reference path="../ragemp-client.d.ts" />

type FactionMapPoint = {
  factionId: number;
  shortName: string;
  name: string;
  colorHex: string;
  mapIconId: number;
  x: number;
  y: number;
  z: number;
  dimension: number;
};

type BlipHandle = {
  destroy?: () => void;
  setColour?: (color: number) => void;
  setColor?: (color: number) => void;
  setName?: (name: string) => void;
  color?: number;
  dimension?: number;
  name?: string;
  shortRange?: boolean;
};

const blips = new Map<number, BlipHandle>();

const BLIP_COLOR_PALETTE = [
  { index: 1, rgb: [224, 50, 50] },
  { index: 2, rgb: [114, 204, 114] },
  { index: 3, rgb: [93, 182, 229] },
  { index: 5, rgb: [240, 200, 80] },
  { index: 7, rgb: [194, 80, 80] },
  { index: 17, rgb: [245, 245, 245] },
  { index: 26, rgb: [185, 185, 185] },
  { index: 27, rgb: [120, 120, 255] },
  { index: 28, rgb: [255, 120, 120] },
  { index: 38, rgb: [0, 153, 255] },
  { index: 40, rgb: [255, 90, 90] },
  { index: 46, rgb: [145, 70, 255] },
  { index: 47, rgb: [99, 214, 104] },
  { index: 49, rgb: [255, 170, 0] },
  { index: 52, rgb: [255, 95, 145] },
  { index: 54, rgb: [90, 200, 250] },
  { index: 57, rgb: [190, 110, 255] },
  { index: 60, rgb: [255, 210, 70] },
  { index: 61, rgb: [255, 120, 0] },
  { index: 62, rgb: [100, 220, 255] },
  { index: 69, rgb: [255, 255, 90] },
  { index: 76, rgb: [0, 0, 0] },
  { index: 84, rgb: [160, 95, 55] }
];

function hexToRgb(hex: string) {
  const normalized = String(hex || "").trim().replace("#", "");
  if (!/^[0-9a-fA-F]{6}$/.test(normalized)) {
    return [255, 255, 255] as const;
  }

  return [
    Number.parseInt(normalized.slice(0, 2), 16),
    Number.parseInt(normalized.slice(2, 4), 16),
    Number.parseInt(normalized.slice(4, 6), 16)
  ] as const;
}

function mapHexToBlipColor(hex: string) {
  const [r, g, b] = hexToRgb(hex);
  let bestIndex = 0;
  let bestDistance = Number.POSITIVE_INFINITY;

  for (const entry of BLIP_COLOR_PALETTE) {
    const dr = r - entry.rgb[0];
    const dg = g - entry.rgb[1];
    const db = b - entry.rgb[2];
    const distance = (dr * dr) + (dg * dg) + (db * db);
    if (distance < bestDistance) {
      bestDistance = distance;
      bestIndex = entry.index;
    }
  }

  return bestIndex || 0;
}

function clearBlips() {
  for (const blip of blips.values()) {
    blip.destroy?.();
  }

  blips.clear();
}

function setData(rawPayload: string) {
  clearBlips();

  let points: FactionMapPoint[] = [];
  try {
    const parsed = JSON.parse(rawPayload || "[]");
    points = Array.isArray(parsed) ? parsed : [];
  } catch (error) {
    points = [];
  }

  for (const point of points) {
    const blip = (mp as any).blips?.new?.(Number(point.mapIconId || 1), new mp.Vector3(point.x, point.y, point.z), {
      name: `[${point.shortName}] ${point.name}`,
      color: mapHexToBlipColor(point.colorHex),
      shortRange: false,
      dimension: Number(point.dimension || 0),
      scale: 0.9
    }) as BlipHandle | undefined;

    if (!blip) {
      continue;
    }

    const color = mapHexToBlipColor(point.colorHex);
    blip.setColour?.(color);
    blip.setColor?.(color);
    blip.color = color;
    blip.dimension = Number(point.dimension || 0);
    blip.name = `[${point.shortName}] ${point.name}`;
    blips.set(point.factionId, blip);
  }
}

mp.events.add("client:factionMap:setData", (...args: unknown[]) => {
  const [payload] = args as [string];
  setData(payload || "[]");
});

mp.events.add("playerQuit", () => {
  clearBlips();
});

export {};

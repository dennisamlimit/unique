ALTER TABLE characters
  ALTER COLUMN appearance SET DEFAULT '{
    "gender": "male",
    "blendData": [0, 0, 0, 0, 0.5, 0.5],
    "eyeColor": 0,
    "hair": [0, 0, 0],
    "beard": [255, 0],
    "faceFeatures": [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
    "headOverlays": [-1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1],
    "headOverlayColors": [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
    "headOverlayOpacities": [1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1],
    "clothing": [0, 0, 0, 15, 0, 0, 1, 0, 15, 0, 0, 15],
    "clothingTextures": [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
    "props": [-1, -1, -1, -1, -1],
    "propTextures": [0, 0, 0, 0, 0]
  }'::jsonb;

UPDATE characters
SET appearance =
  '{
    "gender": "male",
    "blendData": [0, 0, 0, 0, 0.5, 0.5],
    "eyeColor": 0,
    "hair": [0, 0, 0],
    "beard": [255, 0],
    "faceFeatures": [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
    "headOverlays": [-1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1],
    "headOverlayColors": [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
    "headOverlayOpacities": [1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1],
    "clothing": [0, 0, 0, 15, 0, 0, 1, 0, 15, 0, 0, 15],
    "clothingTextures": [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
    "props": [-1, -1, -1, -1, -1],
    "propTextures": [0, 0, 0, 0, 0]
  }'::jsonb || appearance;

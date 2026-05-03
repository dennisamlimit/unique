ALTER TABLE characters
  ADD COLUMN IF NOT EXISTS appearance JSONB NOT NULL DEFAULT '{
    "gender": "male",
    "blendData": [0, 0, 0, 0, 0, 0],
    "eyeColor": 0,
    "hair": [0, 0, 0],
    "beard": [255, 0],
    "faceFeatures": [0, 0, 0, 0, 0, 0],
    "clothing": [15, 15, 0, 1]
  }'::jsonb;

export const config = {
  databaseUrl: process.env.DATABASE_URL ?? "postgres://unique:unique@localhost:5432/unique",
  thirdCharacterPrice: Number(process.env.UNIQUE_THIRD_CHARACTER_PRICE ?? 500),
  authDimensionOffset: 5000,
  creator: {
    x: -1037.71,
    y: -2737.89,
    z: 20.17,
    heading: 328
  },
  spawn: {
    x: -1037.71,
    y: -2737.89,
    z: 20.17,
    heading: 328
  }
};

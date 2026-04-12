export type RegisterAccountDto = {
  email: string;
  password: string;
  repeatPassword: string;
  socialClubName: string | null;
  socialClubId: string | null;
};

export type LoginAccountDto = {
  email: string;
  password: string;
  socialClubName: string | null;
  socialClubId: string | null;
};

export type CompleteCharacterDto = {
  firstName: string;
  lastName: string;
  birthDate: string | null;
  origin: string | null;
  customizationJson: string;
};

export type SavePlayerStateDto = {
  posX: number;
  posY: number;
  posZ: number;
  rotZ: number;
  dimension: number;
  health: number;
  armor: number;
  cash: number;
  bankCash: number;
};

export type CreateAccountDto = {
  email: string;
  password: string;
  socialClubName: string | null;
  socialClubId: string | null;
};

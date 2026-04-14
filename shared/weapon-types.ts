export interface WeaponComponent {
    HashKey: string;
    NameGXT: string;
    DescriptionGXT: string;
    Name: string;
    Description: string;
    ModelHashKey: string;
    IsDefault: boolean;
}

export interface WeaponTint {
    NameGXT: string;
    Name: string;
}

export interface WeaponData {
    HashKey: string;
    NameGXT: string;
    DescriptionGXT: string;
    Name: string;
    Description: string;
    Group: string;
    ModelHashKey: string;
    DefaultClipSize: number;
    AmmoType: string;
    Components: Record<string, WeaponComponent>;
    Tints: WeaponTint[];
    LiveryColors: any[];
    DLC: string;
}

export interface TorsoMapping {
    [key: string]: number;
}

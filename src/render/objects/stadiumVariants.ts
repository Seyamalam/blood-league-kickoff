export const STADIUM_VARIANT_IDS = [
  'blood-court',
  'moonlit-classic',
  'emerald-cathedral',
  'royal-amethyst',
  'frostbound-arena',
] as const;

export type StadiumVariantId = (typeof STADIUM_VARIANT_IDS)[number];
export type StadiumSelection = StadiumVariantId | 'random';
export type StadiumArchitecture = 'gothic' | 'bowl' | 'cathedral' | 'colosseum' | 'fortress';
export type StadiumWeather = 'embers' | 'drizzle' | 'fireflies' | 'arcane-sparks' | 'snow';

export interface StadiumAmbiencePreset {
  readonly weather: StadiumWeather;
  readonly particleColor: number;
  readonly particleAccent: number;
  readonly particleSize: number;
  readonly fallSpeed: number;
  readonly wind: number;
}

export interface StadiumVariant {
  readonly id: StadiumVariantId;
  readonly name: string;
  readonly architecture: StadiumArchitecture;
  readonly pitch: number;
  readonly stripe: number;
  readonly line: number;
  readonly wall: number;
  readonly accent: number;
  readonly stand: readonly [number, number];
  readonly crowd: readonly [number, number, number];
  readonly sky: number;
  readonly fog: number;
  readonly ambientSky: number;
  readonly ambientGround: number;
  readonly keyLight: number;
  readonly fillLight: number;
  readonly ambience: StadiumAmbiencePreset;
}

export const STADIUM_VARIANTS: Readonly<Record<StadiumVariantId, StadiumVariant>> = Object.freeze({
  'blood-court': variant({
    id: 'blood-court',
    name: 'Blood Court',
    architecture: 'gothic',
    pitch: 0x284238,
    stripe: 0x4a6254,
    line: 0xd0ded4,
    wall: 0x2c1d2a,
    accent: 0xb51f48,
    stand: [0x1d1d29, 0x272333],
    crowd: [0x8b3b62, 0x53314f, 0x74506b],
    sky: 0x080811,
    fog: 0x080811,
    ambientSky: 0x8298dc,
    ambientGround: 0x310d1d,
    keyLight: 0xaabfff,
    fillLight: 0xff91ad,
    ambience: {
      weather: 'embers',
      particleColor: 0xff755f,
      particleAccent: 0x8f1638,
      particleSize: 0.24,
      fallSpeed: -0.65,
      wind: 0.5,
    },
  }),
  'moonlit-classic': variant({
    id: 'moonlit-classic',
    name: 'Moonlit Classic',
    architecture: 'bowl',
    pitch: 0x17613c,
    stripe: 0x2c8955,
    line: 0xf1f3dc,
    wall: 0x18243a,
    accent: 0x56b9ff,
    stand: [0x17233b, 0x253659],
    crowd: [0x4e8fc7, 0xd4e8ff, 0x315c8c],
    sky: 0x071426,
    fog: 0x071426,
    ambientSky: 0x98cfff,
    ambientGround: 0x102a28,
    keyLight: 0xd8eaff,
    fillLight: 0x62b8ff,
    ambience: {
      weather: 'drizzle',
      particleColor: 0xb9e4ff,
      particleAccent: 0x4f91c9,
      particleSize: 0.14,
      fallSpeed: 10.5,
      wind: 1.25,
    },
  }),
  'emerald-cathedral': variant({
    id: 'emerald-cathedral',
    name: 'Emerald Cathedral',
    architecture: 'cathedral',
    pitch: 0x123d2c,
    stripe: 0x237455,
    line: 0xe5d89b,
    wall: 0x18291f,
    accent: 0xd4aa48,
    stand: [0x17241f, 0x26372e],
    crowd: [0xd4aa48, 0x356c51, 0x8c7440],
    sky: 0x06120d,
    fog: 0x091a12,
    ambientSky: 0x7cb59b,
    ambientGround: 0x221b0c,
    keyLight: 0xffe7a4,
    fillLight: 0x52d69b,
    ambience: {
      weather: 'fireflies',
      particleColor: 0xffdc70,
      particleAccent: 0x74e6a7,
      particleSize: 0.28,
      fallSpeed: -0.18,
      wind: 0.35,
    },
  }),
  'royal-amethyst': variant({
    id: 'royal-amethyst',
    name: 'Royal Amethyst',
    architecture: 'colosseum',
    pitch: 0x332957,
    stripe: 0x584585,
    line: 0xf0d8ff,
    wall: 0x241a36,
    accent: 0xe65cff,
    stand: [0x251b38, 0x3b2855],
    crowd: [0xe65cff, 0x8e5cc7, 0x554078],
    sky: 0x10071a,
    fog: 0x160a22,
    ambientSky: 0xc69aff,
    ambientGround: 0x2b0d31,
    keyLight: 0xead6ff,
    fillLight: 0xff69df,
    ambience: {
      weather: 'arcane-sparks',
      particleColor: 0xff8cff,
      particleAccent: 0x804dff,
      particleSize: 0.25,
      fallSpeed: -1.2,
      wind: 0.85,
    },
  }),
  'frostbound-arena': variant({
    id: 'frostbound-arena',
    name: 'Frostbound Arena',
    architecture: 'fortress',
    pitch: 0x315865,
    stripe: 0x477987,
    line: 0xe5fbff,
    wall: 0x263843,
    accent: 0x7de8ff,
    stand: [0x273844, 0x364f5e],
    crowd: [0x82cfdf, 0x587e96, 0xc4edf4],
    sky: 0x07131c,
    fog: 0x0b202c,
    ambientSky: 0xa8e7ff,
    ambientGround: 0x17313a,
    keyLight: 0xe3f9ff,
    fillLight: 0x76dfff,
    ambience: {
      weather: 'snow',
      particleColor: 0xf0fdff,
      particleAccent: 0xa4e9ff,
      particleSize: 0.34,
      fallSpeed: 2.4,
      wind: 1.5,
    },
  }),
});

export function isStadiumSelection(value: unknown): value is StadiumSelection {
  return value === 'random' || STADIUM_VARIANT_IDS.includes(value as StadiumVariantId);
}

export function resolveStadiumVariant(
  selection: StadiumSelection,
  randomValue = Math.random(),
): StadiumVariant {
  if (selection !== 'random') return STADIUM_VARIANTS[selection];
  const normalized = Number.isFinite(randomValue) ? Math.min(0.999_999, Math.max(0, randomValue)) : 0;
  return STADIUM_VARIANTS[STADIUM_VARIANT_IDS[Math.floor(normalized * STADIUM_VARIANT_IDS.length)]!];
}

function variant(value: StadiumVariant): StadiumVariant {
  return Object.freeze(value);
}

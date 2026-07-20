import { CHARACTER_IDS, type CharacterId } from '../game/characters';
import type { StorageLike } from './types';

export interface CustomCharacterAppearance {
  enabled: boolean;
  displayName: string;
  baseCharacterId: CharacterId;
  skin: string;
  primary: string;
  secondary: string;
  shorts: string;
  socks: string;
  boots: string;
  hair: string;
  eyes: string;
  bodyBuild: 'agile' | 'balanced' | 'powerful';
  kitPattern: 'classic' | 'sash' | 'quartered' | 'keeper';
  auraStyle: 'none' | 'crimson' | 'violet' | 'gold';
}

export type CharacterCustomizationListener = (appearance: Readonly<CustomCharacterAppearance>) => void;

const STORAGE_KEY = 'blood-league-kickoff.custom-character';
const VERSION = 1;
const HEX_COLOR = /^#[0-9a-f]{6}$/i;

export const DEFAULT_CUSTOM_CHARACTER: Readonly<CustomCharacterAppearance> = Object.freeze({
  enabled: false,
  displayName: 'Night Striker',
  baseCharacterId: 'maestro',
  skin: '#b97862',
  primary: '#e8e1c7',
  secondary: '#6f4bc6',
  shorts: '#211927',
  socks: '#e8e1c7',
  boots: '#c72f62',
  hair: '#24151d',
  eyes: '#f1e8d7',
  bodyBuild: 'balanced',
  kitPattern: 'classic',
  auraStyle: 'none',
});

export class CharacterCustomizationStore {
  private appearance: CustomCharacterAppearance;
  private readonly listeners = new Set<CharacterCustomizationListener>();

  public constructor(
    private readonly storageKey = STORAGE_KEY,
    private readonly storage: StorageLike | null = browserStorage(),
  ) {
    this.appearance = this.load();
  }

  public get value(): Readonly<CustomCharacterAppearance> {
    return { ...this.appearance };
  }

  public update(patch: Partial<CustomCharacterAppearance>): Readonly<CustomCharacterAppearance> {
    this.appearance = sanitizeCustomCharacter({ ...this.appearance, ...patch });
    this.persist();
    this.emit();
    return this.value;
  }

  public reset(): Readonly<CustomCharacterAppearance> {
    this.appearance = { ...DEFAULT_CUSTOM_CHARACTER };
    this.persist();
    this.emit();
    return this.value;
  }

  public subscribe(listener: CharacterCustomizationListener, emitCurrent = false): () => void {
    this.listeners.add(listener);
    if (emitCurrent) listener(this.value);
    return () => this.listeners.delete(listener);
  }

  private load(): CustomCharacterAppearance {
    if (!this.storage) return { ...DEFAULT_CUSTOM_CHARACTER };
    try {
      const serialized = this.storage.getItem(this.storageKey);
      if (!serialized) return { ...DEFAULT_CUSTOM_CHARACTER };
      const document: unknown = JSON.parse(serialized);
      if (!isRecord(document) || document.version !== VERSION) return { ...DEFAULT_CUSTOM_CHARACTER };
      return sanitizeCustomCharacter(document.appearance);
    } catch {
      return { ...DEFAULT_CUSTOM_CHARACTER };
    }
  }

  private persist(): void {
    if (!this.storage) return;
    try {
      this.storage.setItem(
        this.storageKey,
        JSON.stringify({ version: VERSION, appearance: this.appearance }),
      );
    } catch {
      // The current in-memory appearance remains usable when storage is unavailable.
    }
  }

  private emit(): void {
    const snapshot = this.value;
    for (const listener of this.listeners) listener(snapshot);
  }
}

export function sanitizeCustomCharacter(value: unknown): CustomCharacterAppearance {
  const source = isRecord(value) ? value : {};
  return {
    enabled: source.enabled === true,
    displayName: sanitizeName(source.displayName),
    baseCharacterId: isCharacterId(source.baseCharacterId) ? source.baseCharacterId : 'maestro',
    skin: sanitizeColor(source.skin, DEFAULT_CUSTOM_CHARACTER.skin),
    primary: sanitizeColor(source.primary, DEFAULT_CUSTOM_CHARACTER.primary),
    secondary: sanitizeColor(source.secondary, DEFAULT_CUSTOM_CHARACTER.secondary),
    shorts: sanitizeColor(source.shorts, DEFAULT_CUSTOM_CHARACTER.shorts),
    socks: sanitizeColor(source.socks, DEFAULT_CUSTOM_CHARACTER.socks),
    boots: sanitizeColor(source.boots, DEFAULT_CUSTOM_CHARACTER.boots),
    hair: sanitizeColor(source.hair, DEFAULT_CUSTOM_CHARACTER.hair),
    eyes: sanitizeColor(source.eyes, DEFAULT_CUSTOM_CHARACTER.eyes),
    bodyBuild:
      source.bodyBuild === 'agile' || source.bodyBuild === 'powerful'
        ? source.bodyBuild
        : DEFAULT_CUSTOM_CHARACTER.bodyBuild,
    kitPattern:
      source.kitPattern === 'sash' || source.kitPattern === 'quartered' || source.kitPattern === 'keeper'
        ? source.kitPattern
        : DEFAULT_CUSTOM_CHARACTER.kitPattern,
    auraStyle:
      source.auraStyle === 'crimson' || source.auraStyle === 'violet' || source.auraStyle === 'gold'
        ? source.auraStyle
        : DEFAULT_CUSTOM_CHARACTER.auraStyle,
  };
}

function sanitizeName(value: unknown): string {
  if (typeof value !== 'string') return DEFAULT_CUSTOM_CHARACTER.displayName;
  const normalized = value.replace(/\s+/g, ' ').trim().slice(0, 24);
  return normalized || DEFAULT_CUSTOM_CHARACTER.displayName;
}

function sanitizeColor(value: unknown, fallback: string): string {
  return typeof value === 'string' && HEX_COLOR.test(value) ? value.toLowerCase() : fallback;
}

function isCharacterId(value: unknown): value is CharacterId {
  return typeof value === 'string' && CHARACTER_IDS.includes(value as CharacterId);
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function browserStorage(): StorageLike | null {
  try {
    return typeof window !== 'undefined' ? window.localStorage : null;
  } catch {
    return null;
  }
}

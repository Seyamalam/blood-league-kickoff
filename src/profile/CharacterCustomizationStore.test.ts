import { describe, expect, it } from 'vitest';
import {
  CharacterCustomizationStore,
  DEFAULT_CUSTOM_CHARACTER,
  sanitizeCustomCharacter,
} from './CharacterCustomizationStore';
import type { StorageLike } from './types';

class MemoryStorage implements StorageLike {
  public readonly values = new Map<string, string>();
  getItem(key: string): string | null {
    return this.values.get(key) ?? null;
  }
  setItem(key: string, value: string): void {
    this.values.set(key, value);
  }
}

describe('custom character persistence', () => {
  it('sanitizes names, archetypes, colors, and enabled state', () => {
    expect(
      sanitizeCustomCharacter({
        enabled: true,
        displayName: '   Crimson    Comet   ',
        baseCharacterId: 'breakaway',
        skin: '#ABCDEF',
        primary: 'red',
        bodyBuild: 'powerful',
        kitPattern: 'sash',
        auraStyle: 'violet',
      }),
    ).toMatchObject({
      enabled: true,
      displayName: 'Crimson Comet',
      baseCharacterId: 'breakaway',
      skin: '#abcdef',
      primary: DEFAULT_CUSTOM_CHARACTER.primary,
      bodyBuild: 'powerful',
      kitPattern: 'sash',
      auraStyle: 'violet',
    });
  });

  it('persists a full appearance document and notifies subscribers', () => {
    const storage = new MemoryStorage();
    const store = new CharacterCustomizationStore('creator-test', storage);
    const events: string[] = [];
    store.subscribe((appearance) => events.push(appearance.displayName));
    store.update({
      enabled: true,
      displayName: 'The Eclipse',
      baseCharacterId: 'guardian',
      primary: '#111122',
      secondary: '#ff315d',
    });

    const restored = new CharacterCustomizationStore('creator-test', storage);
    expect(restored.value).toMatchObject({
      enabled: true,
      displayName: 'The Eclipse',
      baseCharacterId: 'guardian',
      primary: '#111122',
      secondary: '#ff315d',
    });
    expect(events).toEqual(['The Eclipse']);
  });
});

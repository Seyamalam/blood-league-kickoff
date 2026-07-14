import { describe, expect, it } from 'vitest';
import { locomotionClipFor } from './PlayerCharacterAsset';

describe('locomotionClipFor', () => {
  it('selects readable authored locomotion states', () => {
    expect(locomotionClipFor(0, false)).toBe('Idle_Loop');
    expect(locomotionClipFor(4, false)).toBe('Jog_Fwd_Loop');
    expect(locomotionClipFor(9, false)).toBe('Sprint_Loop');
    expect(locomotionClipFor(0, true)).toBe('Roll');
  });
});

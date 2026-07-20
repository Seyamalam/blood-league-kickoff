import { CHARACTER_DEFINITIONS, CHARACTER_IDS } from '../game/characters';
import {
  CharacterCustomizationStore,
  DEFAULT_CUSTOM_CHARACTER,
  sanitizeCustomCharacter,
  type CustomCharacterAppearance,
} from '../profile/CharacterCustomizationStore';
import { uiIcon } from './icons';
import { CharacterCodexPreview } from './CharacterCodexPreview';

export interface CharacterCreatorAudio {
  playUiOpen(): void;
  playUiClose(): void;
  playUiToggle(enabled?: boolean): void;
  playUiConfirm(): void;
  playUiSelect(): void;
}

const COLOR_FIELDS = [
  ['skin', 'Skin'],
  ['primary', 'Kit'],
  ['secondary', 'Accent'],
  ['shorts', 'Shorts'],
  ['socks', 'Socks'],
  ['boots', 'Boots'],
  ['hair', 'Hair'],
  ['eyes', 'Eyes'],
] as const;

const PRESETS: readonly Partial<CustomCharacterAppearance>[] = Object.freeze([
  {
    displayName: 'Crimson Comet',
    baseCharacterId: 'breakaway',
    skin: '#a96955',
    primary: '#f0e7d2',
    secondary: '#d91e4d',
    shorts: '#23111c',
    socks: '#f0e7d2',
    boots: '#ffcc3d',
    hair: '#371a21',
    eyes: '#fff3d2',
  },
  {
    displayName: 'Midnight Wall',
    baseCharacterId: 'guardian',
    skin: '#6f493f',
    primary: '#222738',
    secondary: '#6d7cff',
    shorts: '#11131d',
    socks: '#7985a8',
    boots: '#d8dde8',
    hair: '#14151d',
    eyes: '#8fe9ff',
  },
  {
    displayName: 'Emerald Engine',
    baseCharacterId: 'engine',
    skin: '#c58a68',
    primary: '#dce9d8',
    secondary: '#25a875',
    shorts: '#173326',
    socks: '#f0f4dc',
    boots: '#d8e239',
    hair: '#40261d',
    eyes: '#ebffe8',
  },
]);

/** Persistent original-player creator built on the shared voxel skeleton. */
export class CharacterCreatorOverlay {
  private readonly element: HTMLElement;
  private readonly panel: HTMLElement;
  private readonly preview: CharacterCodexPreview;
  private readonly status: HTMLElement;
  private readonly saveButton: HTMLButtonElement;
  private draft: CustomCharacterAppearance = { ...DEFAULT_CUSTOM_CHARACTER };
  private open = false;
  private previouslyFocused: HTMLElement | null = null;

  public constructor(
    root: HTMLElement,
    private readonly store: CharacterCustomizationStore,
    private readonly audio: CharacterCreatorAudio,
  ) {
    this.element = document.createElement('section');
    this.element.className = 'character-creator-overlay hidden';
    this.element.hidden = true;
    this.element.setAttribute('role', 'dialog');
    this.element.setAttribute('aria-modal', 'true');
    this.element.setAttribute('aria-labelledby', 'character-creator-title');
    this.element.innerHTML = `
      <div class="character-creator-panel">
        <header class="character-creator-panel__header">
          <div>
            <p>ORIGINAL VOXEL ATHLETE</p>
            <h2 id="character-creator-title">BUILD YOUR NIGHT STRIKER</h2>
          </div>
          <button type="button" class="icon-button" data-creator-action="close" aria-label="Close character creator">${uiIcon('close')}</button>
        </header>
        <div class="character-creator-panel__body">
          <section class="character-creator-stage" aria-label="Live custom character preview">
            <div class="character-creator-stage__label"><strong>LIVE KIT LAB</strong><span>DRAG TO ROTATE</span></div>
            <div class="character-creator-stage__preview"></div>
            <div class="character-creator-stage__actions">
              <button type="button" data-creator-preview="idle">IDLE</button>
              <button type="button" data-creator-preview="dribble">DRIBBLE</button>
              <button type="button" data-creator-preview="shoot">SHOOT</button>
              <button type="button" data-creator-preview="victory">VICTORY</button>
            </div>
          </section>
          <form class="character-creator-form">
            <div class="character-creator-form__intro">
              <label class="creator-enabled">
                <input type="checkbox" data-creator-field="enabled">
                <span><strong>USE CUSTOM APPEARANCE</strong><small>Gameplay traits still come from your selected Career hero.</small></span>
              </label>
              <label>PLAYER NAME<input type="text" maxlength="24" data-creator-field="displayName" autocomplete="off"></label>
              <label>BASE SILHOUETTE
                <select data-creator-field="baseCharacterId">
                  ${CHARACTER_IDS.map((id) => `<option value="${id}">${CHARACTER_DEFINITIONS[id].name} · ${CHARACTER_DEFINITIONS[id].role}</option>`).join('')}
                </select>
              </label>
              <div class="character-creator-form__triple">
                <label>BODY BUILD
                  <select data-creator-field="bodyBuild">
                    <option value="agile">Agile</option>
                    <option value="balanced">Balanced</option>
                    <option value="powerful">Powerful</option>
                  </select>
                </label>
                <label>KIT PATTERN
                  <select data-creator-field="kitPattern">
                    <option value="classic">Classic stripe</option>
                    <option value="sash">Diagonal sash</option>
                    <option value="quartered">Quartered</option>
                    <option value="keeper">Keeper cross</option>
                  </select>
                </label>
                <label>VOXEL AURA
                  <select data-creator-field="auraStyle">
                    <option value="none">None</option>
                    <option value="crimson">Crimson</option>
                    <option value="violet">Violet</option>
                    <option value="gold">Gold</option>
                  </select>
                </label>
              </div>
            </div>
            <fieldset class="character-creator-colors">
              <legend>KIT & IDENTITY COLORS</legend>
              ${COLOR_FIELDS.map(([field, label]) => `<label><span>${label}</span><input type="color" data-creator-field="${field}"></label>`).join('')}
            </fieldset>
            <div class="character-creator-presets">
              <span>QUICK IDENTITIES</span>
              ${PRESETS.map((preset, index) => `<button type="button" data-creator-preset="${index}">${preset.displayName}</button>`).join('')}
            </div>
            <div class="character-creator-tools">
              <button type="button" data-creator-action="randomize">${uiIcon('bolt')}<span>RANDOMIZE</span></button>
              <button type="button" data-creator-action="reset">${uiIcon('restart')}<span>RESET</span></button>
            </div>
            <p class="character-creator-status" aria-live="polite">Changes preview live. Save to use them in matches.</p>
          </form>
        </div>
        <footer class="character-creator-panel__footer">
          <button type="button" data-creator-action="cancel">CANCEL</button>
          <button type="button" data-creator-action="save">${uiIcon('play')}<span>SAVE PLAYER</span></button>
        </footer>
      </div>
    `;
    root.append(this.element);
    this.panel = requiredElement(this.element, '.character-creator-panel');
    this.status = requiredElement(this.element, '.character-creator-status');
    this.saveButton = requiredButton(this.element, '[data-creator-action="save"]');
    this.preview = new CharacterCodexPreview(
      requiredElement(this.element, '.character-creator-stage__preview'),
    );
    this.element.addEventListener('click', this.handleClick);
    this.element.addEventListener('input', this.handleInput);
    this.element.addEventListener('change', this.handleInput);
  }

  public get isVisible(): boolean {
    return this.open;
  }

  public show(): void {
    this.draft = { ...this.store.value };
    this.syncForm();
    this.preview.setAppearance(this.draft);
    if (this.open) return;
    this.open = true;
    this.previouslyFocused = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    this.element.hidden = false;
    this.element.classList.remove('hidden');
    this.preview.setActive(true);
    this.audio.playUiOpen();
    window.addEventListener('keydown', this.handleKeyDown, { capture: true });
    window.requestAnimationFrame(() => this.saveButton.focus());
  }

  public hide(playSound = true): void {
    if (!this.open) return;
    this.open = false;
    this.preview.setActive(false);
    this.element.classList.add('hidden');
    this.element.hidden = true;
    window.removeEventListener('keydown', this.handleKeyDown, { capture: true });
    if (playSound) this.audio.playUiClose();
    if (this.previouslyFocused?.isConnected) this.previouslyFocused.focus();
    this.previouslyFocused = null;
  }

  public dispose(): void {
    this.hide(false);
    this.preview.dispose();
    this.element.removeEventListener('click', this.handleClick);
    this.element.removeEventListener('input', this.handleInput);
    this.element.removeEventListener('change', this.handleInput);
    this.element.remove();
  }

  private readonly handleInput = (event: Event): void => {
    const target = event.target;
    if (!(target instanceof HTMLInputElement || target instanceof HTMLSelectElement)) return;
    const field = target.dataset.creatorField as keyof CustomCharacterAppearance | undefined;
    if (!field) return;
    const value =
      target instanceof HTMLInputElement && target.type === 'checkbox' ? target.checked : target.value;
    this.draft = sanitizeCustomCharacter({ ...this.draft, [field]: value });
    this.preview.setAppearance(this.draft);
    this.status.textContent = this.draft.enabled
      ? `${this.draft.displayName} is ready for a live preview.`
      : 'Preview saved as an alternate kit; enable it to use it in matches.';
    if (field === 'enabled' || field === 'baseCharacterId') this.audio.playUiToggle(this.draft.enabled);
  };

  private readonly handleClick = (event: MouseEvent): void => {
    const target = event.target instanceof Element ? event.target : null;
    if (!target) return;
    const action = target.closest<HTMLElement>('[data-creator-action]')?.dataset.creatorAction;
    if (action === 'close' || action === 'cancel') return this.hide();
    if (action === 'save') {
      this.store.update(this.draft);
      this.status.textContent = `${this.draft.displayName} saved to this device.`;
      this.audio.playUiConfirm();
      this.hide(false);
      return;
    }
    if (action === 'reset') {
      this.draft = { ...DEFAULT_CUSTOM_CHARACTER };
      this.syncForm();
      this.preview.setAppearance(this.draft);
      this.audio.playUiToggle(false);
      return;
    }
    if (action === 'randomize') {
      this.draft = randomAppearance(this.draft);
      this.syncForm();
      this.preview.setAppearance(this.draft);
      this.audio.playUiSelect();
      return;
    }
    const preset = target.closest<HTMLElement>('[data-creator-preset]')?.dataset.creatorPreset;
    if (preset !== undefined) {
      const selected = PRESETS[Number(preset)];
      if (!selected) return;
      this.draft = sanitizeCustomCharacter({ ...this.draft, ...selected, enabled: true });
      this.syncForm();
      this.preview.setAppearance(this.draft);
      this.audio.playUiSelect();
      return;
    }
    const previewState = target.closest<HTMLElement>('[data-creator-preview]')?.dataset.creatorPreview;
    if (
      previewState === 'idle' ||
      previewState === 'dribble' ||
      previewState === 'shoot' ||
      previewState === 'victory'
    ) {
      this.preview.play(previewState);
      this.audio.playUiSelect();
    }
  };

  private readonly handleKeyDown = (event: KeyboardEvent): void => {
    if (!this.open) return;
    if (event.key === 'Escape') {
      event.preventDefault();
      this.hide();
      return;
    }
    if (event.key !== 'Tab') return;
    const focusable = Array.from(
      this.panel.querySelectorAll<HTMLElement>(
        'button:not([disabled]), input:not([disabled]), select:not([disabled])',
      ),
    ).filter((element) => element.offsetParent !== null);
    if (focusable.length === 0) return;
    const first = focusable[0]!;
    const last = focusable[focusable.length - 1]!;
    if (event.shiftKey && document.activeElement === first) {
      event.preventDefault();
      last.focus();
    } else if (!event.shiftKey && document.activeElement === last) {
      event.preventDefault();
      first.focus();
    }
  };

  private syncForm(): void {
    for (const [field] of COLOR_FIELDS) {
      const input = this.element.querySelector<HTMLInputElement>(`[data-creator-field="${field}"]`);
      if (input) input.value = this.draft[field];
    }
    const name = this.element.querySelector<HTMLInputElement>('[data-creator-field="displayName"]');
    const enabled = this.element.querySelector<HTMLInputElement>('[data-creator-field="enabled"]');
    const base = this.element.querySelector<HTMLSelectElement>('[data-creator-field="baseCharacterId"]');
    const build = this.element.querySelector<HTMLSelectElement>('[data-creator-field="bodyBuild"]');
    const pattern = this.element.querySelector<HTMLSelectElement>('[data-creator-field="kitPattern"]');
    const aura = this.element.querySelector<HTMLSelectElement>('[data-creator-field="auraStyle"]');
    if (name) name.value = this.draft.displayName;
    if (enabled) enabled.checked = this.draft.enabled;
    if (base) base.value = this.draft.baseCharacterId;
    if (build) build.value = this.draft.bodyBuild;
    if (pattern) pattern.value = this.draft.kitPattern;
    if (aura) aura.value = this.draft.auraStyle;
  }
}

function randomAppearance(previous: Readonly<CustomCharacterAppearance>): CustomCharacterAppearance {
  const hue = Math.floor(Math.random() * 360);
  const accentHue = (hue + 120 + Math.floor(Math.random() * 120)) % 360;
  const baseCharacterId = CHARACTER_IDS[Math.floor(Math.random() * CHARACTER_IDS.length)] ?? 'maestro';
  return sanitizeCustomCharacter({
    ...previous,
    enabled: true,
    baseCharacterId,
    primary: hslToHex(hue, 42, 76),
    secondary: hslToHex(accentHue, 72, 50),
    shorts: hslToHex(hue, 34, 16),
    socks: hslToHex(hue, 28, 84),
    boots: hslToHex((accentHue + 40) % 360, 78, 48),
    hair: hslToHex((hue + 20) % 360, 32, 15),
    eyes: hslToHex(accentHue, 72, 82),
  });
}

export function hslToHex(hue: number, saturation: number, lightness: number): string {
  const s = saturation / 100;
  const l = lightness / 100;
  const chroma = (1 - Math.abs(2 * l - 1)) * s;
  const section = (((hue % 360) + 360) % 360) / 60;
  const x = chroma * (1 - Math.abs((section % 2) - 1));
  const [r1, g1, b1] =
    section < 1
      ? [chroma, x, 0]
      : section < 2
        ? [x, chroma, 0]
        : section < 3
          ? [0, chroma, x]
          : section < 4
            ? [0, x, chroma]
            : section < 5
              ? [x, 0, chroma]
              : [chroma, 0, x];
  const m = l - chroma / 2;
  return `#${[r1, g1, b1]
    .map((channel) =>
      Math.round((channel + m) * 255)
        .toString(16)
        .padStart(2, '0'),
    )
    .join('')}`;
}

function requiredElement(root: ParentNode, selector: string): HTMLElement {
  const element = root.querySelector<HTMLElement>(selector);
  if (!element) throw new Error(`Missing character creator element ${selector}`);
  return element;
}

function requiredButton(root: ParentNode, selector: string): HTMLButtonElement {
  const element = root.querySelector<HTMLButtonElement>(selector);
  if (!element) throw new Error(`Missing character creator button ${selector}`);
  return element;
}

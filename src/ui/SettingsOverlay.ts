import {
  type FpsLimit,
  type PlayerSettings,
  type RenderQuality,
  SettingsStore,
} from '../settings/SettingsStore';

export type SettingsChangeCallback = (settings: Readonly<PlayerSettings>) => void;

/** Persistent, keyboard-accessible player settings dialog. */
export class SettingsOverlay {
  private readonly element: HTMLElement;
  private readonly masterVolume: HTMLInputElement;
  private readonly masterVolumeValue: HTMLOutputElement;
  private readonly mouseSensitivity: HTMLInputElement;
  private readonly mouseSensitivityValue: HTMLOutputElement;
  private readonly renderQuality: HTMLSelectElement;
  private readonly renderScale: HTMLInputElement;
  private readonly renderScaleValue: HTMLOutputElement;
  private readonly fpsLimit: HTMLSelectElement;
  private readonly reducedCameraShake: HTMLInputElement;
  private readonly closeButton: HTMLButtonElement;
  private readonly unsubscribe: () => void;
  private onChange: SettingsChangeCallback | null;
  private previouslyFocused: HTMLElement | null = null;
  private open = false;

  public constructor(
    root: HTMLElement,
    private readonly store: SettingsStore,
    onChange?: SettingsChangeCallback,
  ) {
    this.onChange = onChange ?? null;
    this.element = document.createElement('section');
    this.element.className = 'settings-overlay hidden';
    this.element.hidden = true;
    this.element.setAttribute('role', 'dialog');
    this.element.setAttribute('aria-modal', 'true');
    this.element.setAttribute('aria-labelledby', 'settings-overlay-title');
    this.element.innerHTML = `
      <div class="settings-panel">
        <header class="settings-panel__header">
          <div><p>TACTICAL CONFIGURATION</p><h2 id="settings-overlay-title">SETTINGS</h2></div>
          <button type="button" class="settings-panel__close" aria-label="Close settings">×</button>
        </header>
        <div class="settings-panel__body">
          <div class="settings-field">
            <div class="settings-field__label"><label for="setting-master-volume">Master volume</label><output for="setting-master-volume"></output></div>
            <input id="setting-master-volume" type="range" min="0" max="1" step="0.01">
          </div>
          <div class="settings-field">
            <div class="settings-field__label"><label for="setting-mouse-sensitivity">Mouse sensitivity</label><output for="setting-mouse-sensitivity"></output></div>
            <input id="setting-mouse-sensitivity" type="range" min="0.25" max="2.5" step="0.05">
          </div>
          <div class="settings-field">
            <label for="setting-render-quality">Render quality</label>
            <select id="setting-render-quality">
              <option value="performance">Performance</option>
              <option value="balanced">Balanced</option>
              <option value="quality">Quality</option>
            </select>
          </div>
          <div class="settings-field">
            <div class="settings-field__label"><label for="setting-render-scale">Render scale</label><output for="setting-render-scale"></output></div>
            <input id="setting-render-scale" type="range" min="0.5" max="1.25" step="0.05">
          </div>
          <div class="settings-field">
            <label for="setting-fps-limit">Frame-rate limit</label>
            <select id="setting-fps-limit">
              <option value="60">60 FPS</option>
              <option value="120">120 FPS</option>
              <option value="unlimited">Unlimited</option>
            </select>
          </div>
          <label class="settings-toggle" for="setting-reduced-shake">
            <span><strong>Reduced camera shake</strong><small>Limits impact movement and intense screen feedback.</small></span>
            <input id="setting-reduced-shake" type="checkbox">
          </label>
        </div>
        <footer class="settings-panel__footer">Changes save automatically · Press Escape to close</footer>
      </div>
    `;

    this.masterVolume = requiredInput(this.element, '#setting-master-volume');
    this.masterVolumeValue = requiredOutput(this.element, '[for="setting-master-volume"]');
    this.mouseSensitivity = requiredInput(this.element, '#setting-mouse-sensitivity');
    this.mouseSensitivityValue = requiredOutput(this.element, '[for="setting-mouse-sensitivity"]');
    this.renderQuality = requiredSelect(this.element, '#setting-render-quality');
    this.renderScale = requiredInput(this.element, '#setting-render-scale');
    this.renderScaleValue = requiredOutput(this.element, '[for="setting-render-scale"]');
    this.fpsLimit = requiredSelect(this.element, '#setting-fps-limit');
    this.reducedCameraShake = requiredInput(this.element, '#setting-reduced-shake');
    this.closeButton = requiredButton(this.element, '.settings-panel__close');

    this.element.addEventListener('input', this.handleInput);
    this.element.addEventListener('change', this.handleInput);
    this.closeButton.addEventListener('click', this.hide);
    this.unsubscribe = this.store.subscribe((settings) => this.render(settings), true);
    root.append(this.element);
  }

  public get isVisible(): boolean {
    return this.open;
  }

  /** Opens the modal and optionally replaces the integration change callback. */
  public show(onChange?: SettingsChangeCallback): void {
    if (onChange) this.onChange = onChange;
    if (this.open) return;
    this.open = true;
    this.previouslyFocused = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    this.element.hidden = false;
    this.element.classList.remove('hidden');
    window.addEventListener('keydown', this.handleKeyDown, { capture: true });
    window.requestAnimationFrame(() => {
      if (this.open) this.closeButton.focus();
    });
  }

  public readonly hide = (): void => {
    if (!this.open) return;
    this.open = false;
    window.removeEventListener('keydown', this.handleKeyDown, { capture: true });
    this.element.classList.add('hidden');
    this.element.hidden = true;
    if (this.previouslyFocused?.isConnected) this.previouslyFocused.focus();
    this.previouslyFocused = null;
  };

  public toggle(onChange?: SettingsChangeCallback): void {
    if (this.open) this.hide();
    else this.show(onChange);
  }

  public dispose(): void {
    this.hide();
    this.unsubscribe();
    this.element.removeEventListener('input', this.handleInput);
    this.element.removeEventListener('change', this.handleInput);
    this.closeButton.removeEventListener('click', this.hide);
    this.element.remove();
  }

  private render(settings: Readonly<PlayerSettings>): void {
    this.masterVolume.value = String(settings.masterVolume);
    this.masterVolumeValue.value = `${Math.round(settings.masterVolume * 100)}%`;
    this.mouseSensitivity.value = String(settings.mouseSensitivity);
    this.mouseSensitivityValue.value = `${settings.mouseSensitivity.toFixed(2)}×`;
    this.renderQuality.value = settings.renderQuality;
    this.renderScale.value = String(settings.renderScale);
    this.renderScaleValue.value = `${Math.round(settings.renderScale * 100)}%`;
    this.fpsLimit.value = String(settings.fpsLimit);
    this.reducedCameraShake.checked = settings.reducedCameraShake;
  }

  private readonly handleInput = (event: Event): void => {
    const target = event.target;
    if (event.type === 'change' && (target === this.masterVolume || target === this.mouseSensitivity || target === this.renderScale)) {
      return;
    }
    let patch: Partial<PlayerSettings> | null = null;
    if (target === this.masterVolume) patch = { masterVolume: this.masterVolume.valueAsNumber };
    else if (target === this.mouseSensitivity) patch = { mouseSensitivity: this.mouseSensitivity.valueAsNumber };
    else if (target === this.renderQuality) patch = { renderQuality: this.renderQuality.value as RenderQuality };
    else if (target === this.renderScale) patch = { renderScale: this.renderScale.valueAsNumber };
    else if (target === this.fpsLimit) patch = { fpsLimit: parseFpsLimit(this.fpsLimit.value) };
    else if (target === this.reducedCameraShake) patch = { reducedCameraShake: this.reducedCameraShake.checked };
    if (!patch) return;
    const settings = this.store.update(patch);
    this.onChange?.(settings);
  };

  private readonly handleKeyDown = (event: KeyboardEvent): void => {
    if (!this.open) return;
    if (event.key === 'Escape') {
      event.preventDefault();
      event.stopPropagation();
      this.hide();
      return;
    }
    if (event.key !== 'Tab') return;
    const controls = [...this.element.querySelectorAll<HTMLElement>('button,input,select')]
      .filter((control) => !control.hasAttribute('disabled'));
    const first = controls[0];
    const last = controls.at(-1);
    if (!first || !last) return;
    if (event.shiftKey && document.activeElement === first) {
      event.preventDefault();
      last.focus();
    } else if (!event.shiftKey && document.activeElement === last) {
      event.preventDefault();
      first.focus();
    }
  };
}

function parseFpsLimit(value: string): FpsLimit {
  if (value === '60') return 60;
  if (value === '120') return 120;
  return 'unlimited';
}

function requiredInput(root: ParentNode, selector: string): HTMLInputElement {
  const element = root.querySelector<HTMLInputElement>(selector);
  if (!element) throw new Error(`Missing settings input ${selector}`);
  return element;
}

function requiredOutput(root: ParentNode, selector: string): HTMLOutputElement {
  const element = root.querySelector<HTMLOutputElement>(`output${selector}`);
  if (!element) throw new Error(`Missing settings output ${selector}`);
  return element;
}

function requiredSelect(root: ParentNode, selector: string): HTMLSelectElement {
  const element = root.querySelector<HTMLSelectElement>(selector);
  if (!element) throw new Error(`Missing settings select ${selector}`);
  return element;
}

function requiredButton(root: ParentNode, selector: string): HTMLButtonElement {
  const element = root.querySelector<HTMLButtonElement>(selector);
  if (!element) throw new Error(`Missing settings button ${selector}`);
  return element;
}

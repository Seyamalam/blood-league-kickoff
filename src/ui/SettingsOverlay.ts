import {
  CONTROL_ACTIONS,
  type AimAssistStrength,
  type ControlAction,
  type ColorVisionMode,
  type FpsLimit,
  type PlayerSettings,
  type RenderQuality,
  SettingsStore,
  isBindableKeyboardCode,
} from '../settings/SettingsStore';
import { uiIcon } from './icons';
import type { StadiumSelection } from '../render/objects/stadiumVariants';

export type SettingsChangeCallback = (settings: Readonly<PlayerSettings>) => void;

/** Persistent, keyboard-accessible player settings dialog. */
export class SettingsOverlay {
  private readonly element: HTMLElement;
  private readonly masterVolume: HTMLInputElement;
  private readonly masterVolumeValue: HTMLOutputElement;
  private readonly musicVolume: HTMLInputElement;
  private readonly musicVolumeValue: HTMLOutputElement;
  private readonly effectsVolume: HTMLInputElement;
  private readonly effectsVolumeValue: HTMLOutputElement;
  private readonly mouseSensitivity: HTMLInputElement;
  private readonly mouseSensitivityValue: HTMLOutputElement;
  private readonly invertVerticalLook: HTMLInputElement;
  private readonly renderQuality: HTMLSelectElement;
  private readonly stadiumSelection: HTMLSelectElement;
  private readonly renderScale: HTMLInputElement;
  private readonly renderScaleValue: HTMLOutputElement;
  private readonly fpsLimit: HTMLSelectElement;
  private readonly performanceOverlay: HTMLInputElement;
  private readonly aimAssistStrength: HTMLSelectElement;
  private readonly screenShakeIntensity: HTMLInputElement;
  private readonly screenShakeIntensityValue: HTMLOutputElement;
  private readonly reducedMotion: HTMLInputElement;
  private readonly damageNumbers: HTMLInputElement;
  private readonly reducedFlashes: HTMLInputElement;
  private readonly highContrastHud: HTMLInputElement;
  private readonly hudScale: HTMLInputElement;
  private readonly hudScaleValue: HTMLOutputElement;
  private readonly colorVisionMode: HTMLSelectElement;
  private readonly gamepadLookSensitivity: HTMLInputElement;
  private readonly gamepadLookSensitivityValue: HTMLOutputElement;
  private readonly gamepadVibration: HTMLInputElement;
  private readonly bindingButtons: Record<ControlAction, HTMLButtonElement>;
  private readonly bindingStatus: HTMLElement;
  private readonly closeButton: HTMLButtonElement;
  private readonly desktopSettings: HTMLElement;
  private readonly windowSize: HTMLSelectElement;
  private readonly fullscreenButton: HTMLButtonElement;
  private readonly unsubscribeFullscreen: (() => void) | null;
  private readonly unsubscribe: () => void;
  private onChange: SettingsChangeCallback | null;
  private previouslyFocused: HTMLElement | null = null;
  private awaitingBinding: ControlAction | null = null;
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
          <button type="button" class="settings-panel__close icon-button" aria-label="Close settings" title="Close settings">${uiIcon('close')}</button>
        </header>
        <div class="settings-panel__body">
          <div class="settings-field">
            <div class="settings-field__label"><label for="setting-master-volume">Master volume</label><output for="setting-master-volume"></output></div>
            <input id="setting-master-volume" type="range" min="0" max="1" step="0.01">
          </div>
          <div class="settings-field">
            <div class="settings-field__label"><label for="setting-music-volume">Music volume</label><output for="setting-music-volume"></output></div>
            <input id="setting-music-volume" type="range" min="0" max="1" step="0.01">
          </div>
          <div class="settings-field">
            <div class="settings-field__label"><label for="setting-effects-volume">Effects volume</label><output for="setting-effects-volume"></output></div>
            <input id="setting-effects-volume" type="range" min="0" max="1" step="0.01">
          </div>
          <div class="settings-field">
            <div class="settings-field__label"><label for="setting-mouse-sensitivity">Mouse sensitivity</label><output for="setting-mouse-sensitivity"></output></div>
            <input id="setting-mouse-sensitivity" type="range" min="0.25" max="2.5" step="0.05">
          </div>
          <label class="settings-toggle" for="setting-invert-vertical-look">
            <span><strong>Invert vertical look</strong><small>Move the mouse down to aim upward.</small></span>
            <input id="setting-invert-vertical-look" type="checkbox">
          </label>
          <div class="settings-field">
            <label for="setting-render-quality">Render quality</label>
            <select id="setting-render-quality">
              <option value="performance">Performance</option>
              <option value="balanced">Balanced</option>
              <option value="quality">Quality</option>
            </select>
          </div>
          <div class="settings-field">
            <label for="setting-stadium">Stadium design</label>
            <select id="setting-stadium">
              <option value="random">Surprise me each launch</option>
              <option value="blood-court">Blood Court</option>
              <option value="moonlit-classic">Moonlit Classic</option>
              <option value="emerald-cathedral">Emerald Cathedral</option>
              <option value="royal-amethyst">Royal Amethyst</option>
              <option value="frostbound-arena">Frostbound Arena</option>
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
          <label class="settings-toggle" for="setting-performance-overlay">
            <span><strong>Performance monitor</strong><small>Shows FPS, frame-time percentiles, GPU renderer, and estimated game GPU memory.</small></span>
            <input id="setting-performance-overlay" type="checkbox">
          </label>
          <div class="settings-field">
            <label for="setting-aim-assist">Aim assist</label>
            <select id="setting-aim-assist">
              <option value="off">Off</option>
              <option value="low">Low</option>
              <option value="high">High</option>
            </select>
          </div>
          <div class="settings-field">
            <div class="settings-field__label"><label for="setting-shake-intensity">Screen shake</label><output for="setting-shake-intensity"></output></div>
            <input id="setting-shake-intensity" type="range" min="0" max="1" step="0.05">
          </div>
          <label class="settings-toggle" for="setting-reduced-motion">
            <span><strong>Reduced motion</strong><small>Disables camera shake and non-essential interface animation.</small></span>
            <input id="setting-reduced-motion" type="checkbox">
          </label>
          <label class="settings-toggle" for="setting-damage-numbers">
            <span><strong>Damage numbers</strong><small>Shows floating combat values when presentation supports them.</small></span>
            <input id="setting-damage-numbers" type="checkbox">
          </label>
          <label class="settings-toggle" for="setting-reduced-flashes">
            <span><strong>Reduced flashes</strong><small>Replaces rapid impact flashes with steadier highlights.</small></span>
            <input id="setting-reduced-flashes" type="checkbox">
          </label>
          <label class="settings-toggle" for="setting-high-contrast-hud">
            <span><strong>High-contrast HUD</strong><small>Strengthens panel backing, borders, and critical status text.</small></span>
            <input id="setting-high-contrast-hud" type="checkbox">
          </label>
          <div class="settings-field">
            <div class="settings-field__label"><label for="setting-hud-scale">HUD scale</label><output for="setting-hud-scale"></output></div>
            <input id="setting-hud-scale" type="range" min="0.8" max="1.4" step="0.05">
          </div>
          <div class="settings-field">
            <label for="setting-color-vision">Color-vision palette</label>
            <select id="setting-color-vision">
              <option value="default">Default</option>
              <option value="deuteranopia">Deuteranopia support</option>
              <option value="protanopia">Protanopia support</option>
              <option value="tritanopia">Tritanopia support</option>
            </select>
          </div>
          <div class="settings-field">
            <div class="settings-field__label"><label for="setting-gamepad-look">Gamepad look sensitivity</label><output for="setting-gamepad-look"></output></div>
            <input id="setting-gamepad-look" type="range" min="0.4" max="2.5" step="0.05">
          </div>
          <label class="settings-toggle" for="setting-gamepad-vibration">
            <span><strong>Gamepad vibration</strong><small>Impact feedback for supported controllers.</small></span>
            <input id="setting-gamepad-vibration" type="checkbox">
          </label>
          <div class="settings-controller-map" aria-label="Standard gamepad controls">
            <strong>GAMEPAD</strong><span>Left stick move · Right stick aim · RT kick · LT recall · A dash · X ultimate · Y Focus Kick · Menu pause · View restart</span>
          </div>
          <div class="settings-controller-map" aria-label="Audio credits">
            <strong>AUDIO</strong><span>Original Huntrix soundtrack created with Gemini/Lyria · CC0 menu effects by Kenney · Procedural football and combat mix by Huntrix</span>
          </div>
          <fieldset class="settings-controls" aria-describedby="settings-binding-help settings-binding-status">
            <legend>KEYBOARD CONTROLS</legend>
            <p id="settings-binding-help">Choose a control, then press a keyboard key. Escape cancels. Mouse buttons cannot be assigned.</p>
            <div class="settings-controls__grid">
              <label>Move forward<button type="button" data-binding="moveForward"></button></label>
              <label>Move backward<button type="button" data-binding="moveBackward"></button></label>
              <label>Move left<button type="button" data-binding="moveLeft"></button></label>
              <label>Move right<button type="button" data-binding="moveRight"></button></label>
              <label>Dash<button type="button" data-binding="dash"></button></label>
              <label>Recall ball<button type="button" data-binding="recall"></button></label>
              <label>Focus Kick<button type="button" data-binding="focusKick"></button></label>
              <label>Character Ultimate<button type="button" data-binding="characterUltimate"></button></label>
              <label>Restart match<button type="button" data-binding="restart"></button></label>
            </div>
            <p id="settings-binding-status" class="settings-controls__status" aria-live="polite"></p>
          </fieldset>
          <div class="settings-desktop hidden" id="settings-desktop">
            <div class="settings-field">
              <label for="setting-window-size">Window size</label>
              <select id="setting-window-size">
                <option value="1280x720">1280 × 720</option>
                <option value="1600x900">1600 × 900</option>
                <option value="1920x1080">1920 × 1080</option>
              </select>
            </div>
            <div class="settings-desktop__actions">
              <button type="button" id="setting-fullscreen">ENTER FULLSCREEN</button>
            </div>
          </div>
        </div>
        <footer class="settings-panel__footer">Changes save automatically · Press Escape to close</footer>
      </div>
    `;

    this.masterVolume = requiredInput(this.element, '#setting-master-volume');
    this.masterVolumeValue = requiredOutput(this.element, '[for="setting-master-volume"]');
    this.musicVolume = requiredInput(this.element, '#setting-music-volume');
    this.musicVolumeValue = requiredOutput(this.element, '[for="setting-music-volume"]');
    this.effectsVolume = requiredInput(this.element, '#setting-effects-volume');
    this.effectsVolumeValue = requiredOutput(this.element, '[for="setting-effects-volume"]');
    this.mouseSensitivity = requiredInput(this.element, '#setting-mouse-sensitivity');
    this.mouseSensitivityValue = requiredOutput(this.element, '[for="setting-mouse-sensitivity"]');
    this.invertVerticalLook = requiredInput(this.element, '#setting-invert-vertical-look');
    this.renderQuality = requiredSelect(this.element, '#setting-render-quality');
    this.stadiumSelection = requiredSelect(this.element, '#setting-stadium');
    this.renderScale = requiredInput(this.element, '#setting-render-scale');
    this.renderScaleValue = requiredOutput(this.element, '[for="setting-render-scale"]');
    this.fpsLimit = requiredSelect(this.element, '#setting-fps-limit');
    this.performanceOverlay = requiredInput(this.element, '#setting-performance-overlay');
    this.aimAssistStrength = requiredSelect(this.element, '#setting-aim-assist');
    this.screenShakeIntensity = requiredInput(this.element, '#setting-shake-intensity');
    this.screenShakeIntensityValue = requiredOutput(this.element, '[for="setting-shake-intensity"]');
    this.reducedMotion = requiredInput(this.element, '#setting-reduced-motion');
    this.damageNumbers = requiredInput(this.element, '#setting-damage-numbers');
    this.reducedFlashes = requiredInput(this.element, '#setting-reduced-flashes');
    this.highContrastHud = requiredInput(this.element, '#setting-high-contrast-hud');
    this.hudScale = requiredInput(this.element, '#setting-hud-scale');
    this.hudScaleValue = requiredOutput(this.element, '[for="setting-hud-scale"]');
    this.colorVisionMode = requiredSelect(this.element, '#setting-color-vision');
    this.gamepadLookSensitivity = requiredInput(this.element, '#setting-gamepad-look');
    this.gamepadLookSensitivityValue = requiredOutput(this.element, '[for="setting-gamepad-look"]');
    this.gamepadVibration = requiredInput(this.element, '#setting-gamepad-vibration');
    this.bindingButtons = requiredBindingButtons(this.element);
    this.bindingStatus = requiredElement(this.element, '#settings-binding-status');
    this.closeButton = requiredButton(this.element, '.settings-panel__close');
    this.desktopSettings = requiredElement(this.element, '#settings-desktop');
    this.windowSize = requiredSelect(this.element, '#setting-window-size');
    this.fullscreenButton = requiredButton(this.element, '#setting-fullscreen');

    this.element.addEventListener('input', this.handleInput);
    this.element.addEventListener('change', this.handleInput);
    this.element.addEventListener('click', this.handleBindingClick);
    this.closeButton.addEventListener('click', this.hide);
    this.windowSize.addEventListener('change', this.handleWindowSize);
    this.fullscreenButton.addEventListener('click', this.handleFullscreen);
    this.unsubscribe = this.store.subscribe((settings) => this.render(settings), true);
    const desktopWindow = window.desktopRuntime?.window;
    this.desktopSettings.classList.toggle('hidden', !desktopWindow);
    this.unsubscribeFullscreen =
      desktopWindow?.onFullscreenChanged((enabled) => {
        this.renderFullscreenState(enabled);
      }) ?? null;
    if (desktopWindow) void this.refreshDesktopState();
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
    void this.refreshDesktopState();
    window.addEventListener('keydown', this.handleKeyDown, { capture: true });
    window.requestAnimationFrame(() => {
      if (this.open) this.closeButton.focus();
    });
  }

  public readonly hide = (): void => {
    if (!this.open) return;
    this.open = false;
    this.awaitingBinding = null;
    this.bindingStatus.textContent = '';
    this.render(this.store.value);
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
    this.element.removeEventListener('click', this.handleBindingClick);
    this.closeButton.removeEventListener('click', this.hide);
    this.windowSize.removeEventListener('change', this.handleWindowSize);
    this.fullscreenButton.removeEventListener('click', this.handleFullscreen);
    this.unsubscribeFullscreen?.();
    this.element.remove();
  }

  private render(settings: Readonly<PlayerSettings>): void {
    this.masterVolume.value = String(settings.masterVolume);
    this.masterVolumeValue.value = `${Math.round(settings.masterVolume * 100)}%`;
    this.musicVolume.value = String(settings.musicVolume);
    this.musicVolumeValue.value = `${Math.round(settings.musicVolume * 100)}%`;
    this.effectsVolume.value = String(settings.effectsVolume);
    this.effectsVolumeValue.value = `${Math.round(settings.effectsVolume * 100)}%`;
    this.mouseSensitivity.value = String(settings.mouseSensitivity);
    this.mouseSensitivityValue.value = `${settings.mouseSensitivity.toFixed(2)}×`;
    this.invertVerticalLook.checked = settings.invertVerticalLook;
    this.renderQuality.value = settings.renderQuality;
    this.stadiumSelection.value = settings.stadiumSelection;
    this.renderScale.value = String(settings.renderScale);
    this.renderScaleValue.value = `${Math.round(settings.renderScale * 100)}%`;
    this.fpsLimit.value = String(settings.fpsLimit);
    this.performanceOverlay.checked = settings.performanceOverlay;
    this.aimAssistStrength.value = settings.aimAssistStrength;
    this.screenShakeIntensity.value = String(settings.screenShakeIntensity);
    this.screenShakeIntensityValue.value = `${Math.round(settings.screenShakeIntensity * 100)}%`;
    this.reducedMotion.checked = settings.reducedMotion;
    this.damageNumbers.checked = settings.damageNumbers;
    this.reducedFlashes.checked = settings.reducedFlashes;
    this.highContrastHud.checked = settings.highContrastHud;
    this.hudScale.value = String(settings.hudScale);
    this.hudScaleValue.value = `${Math.round(settings.hudScale * 100)}%`;
    this.colorVisionMode.value = settings.colorVisionMode;
    this.gamepadLookSensitivity.value = String(settings.gamepadLookSensitivity);
    this.gamepadLookSensitivityValue.value = `${settings.gamepadLookSensitivity.toFixed(2)}×`;
    this.gamepadVibration.checked = settings.gamepadVibration;
    for (const action of CONTROL_ACTIONS) {
      const button = this.bindingButtons[action];
      const code = settings.keyBindings[action];
      button.textContent = this.awaitingBinding === action ? 'PRESS A KEY…' : formatKeyboardCode(code);
      button.setAttribute(
        'aria-label',
        this.awaitingBinding === action
          ? `Waiting for a new ${CONTROL_ACTION_LABELS[action]} key. Press Escape to cancel.`
          : `Rebind ${CONTROL_ACTION_LABELS[action]}. Current key ${formatKeyboardCode(code)}.`,
      );
      button.classList.toggle('is-listening', this.awaitingBinding === action);
    }
  }

  private readonly handleInput = (event: Event): void => {
    const target = event.target;
    if (
      event.type === 'change' &&
      (target === this.masterVolume ||
        target === this.musicVolume ||
        target === this.effectsVolume ||
        target === this.mouseSensitivity ||
        target === this.renderScale ||
        target === this.screenShakeIntensity ||
        target === this.hudScale ||
        target === this.gamepadLookSensitivity)
    ) {
      return;
    }
    let patch: Partial<PlayerSettings> | null = null;
    if (target === this.masterVolume) patch = { masterVolume: this.masterVolume.valueAsNumber };
    else if (target === this.musicVolume) patch = { musicVolume: this.musicVolume.valueAsNumber };
    else if (target === this.effectsVolume) patch = { effectsVolume: this.effectsVolume.valueAsNumber };
    else if (target === this.mouseSensitivity)
      patch = { mouseSensitivity: this.mouseSensitivity.valueAsNumber };
    else if (target === this.invertVerticalLook)
      patch = { invertVerticalLook: this.invertVerticalLook.checked };
    else if (target === this.renderQuality)
      patch = { renderQuality: this.renderQuality.value as RenderQuality };
    else if (target === this.stadiumSelection)
      patch = { stadiumSelection: this.stadiumSelection.value as StadiumSelection };
    else if (target === this.renderScale) patch = { renderScale: this.renderScale.valueAsNumber };
    else if (target === this.fpsLimit) patch = { fpsLimit: parseFpsLimit(this.fpsLimit.value) };
    else if (target === this.performanceOverlay)
      patch = { performanceOverlay: this.performanceOverlay.checked };
    else if (target === this.aimAssistStrength)
      patch = { aimAssistStrength: this.aimAssistStrength.value as AimAssistStrength };
    else if (target === this.screenShakeIntensity)
      patch = { screenShakeIntensity: this.screenShakeIntensity.valueAsNumber, reducedCameraShake: false };
    else if (target === this.reducedMotion) patch = { reducedMotion: this.reducedMotion.checked };
    else if (target === this.damageNumbers) patch = { damageNumbers: this.damageNumbers.checked };
    else if (target === this.reducedFlashes) patch = { reducedFlashes: this.reducedFlashes.checked };
    else if (target === this.highContrastHud) patch = { highContrastHud: this.highContrastHud.checked };
    else if (target === this.hudScale) patch = { hudScale: this.hudScale.valueAsNumber };
    else if (target === this.colorVisionMode)
      patch = { colorVisionMode: this.colorVisionMode.value as ColorVisionMode };
    else if (target === this.gamepadLookSensitivity)
      patch = { gamepadLookSensitivity: this.gamepadLookSensitivity.valueAsNumber };
    else if (target === this.gamepadVibration) patch = { gamepadVibration: this.gamepadVibration.checked };
    if (!patch) return;
    const settings = this.store.update(patch);
    this.onChange?.(settings);
  };

  private readonly handleBindingClick = (event: MouseEvent): void => {
    const target =
      event.target instanceof Element ? event.target.closest<HTMLButtonElement>('[data-binding]') : null;
    if (!target || !this.element.contains(target)) return;
    const action = target.dataset.binding;
    if (!isControlAction(action)) return;
    this.awaitingBinding = action;
    this.bindingStatus.textContent = `Press a keyboard key for ${CONTROL_ACTION_LABELS[action]}.`;
    this.render(this.store.value);
  };

  private readonly handleFullscreen = (): void => {
    const desktopWindow = window.desktopRuntime?.window;
    if (!desktopWindow) return;
    void desktopWindow
      .toggleFullscreen()
      .then((enabled) => {
        this.renderFullscreenState(enabled);
      })
      .catch(() => undefined);
  };

  private readonly handleWindowSize = (): void => {
    const desktopWindow = window.desktopRuntime?.window;
    if (!desktopWindow) return;
    const size = parseWindowSize(this.windowSize.value);
    if (!size) return;
    void desktopWindow
      .setWindowSize(size.width, size.height)
      .then((state) => {
        this.renderDesktopState(state);
      })
      .catch(() => undefined);
  };

  private async refreshDesktopState(): Promise<void> {
    const desktopWindow = window.desktopRuntime?.window;
    if (!desktopWindow) return;
    try {
      this.renderDesktopState(await desktopWindow.getState());
    } catch {
      // Window controls are optional; browser gameplay remains fully functional.
    }
  }

  private renderDesktopState(state: DesktopWindowState): void {
    const value = `${state.width}x${state.height}`;
    if ([...this.windowSize.options].some((option) => option.value === value)) {
      this.windowSize.value = value;
    }
    this.renderFullscreenState(state.isFullScreen);
  }

  private renderFullscreenState(enabled: boolean): void {
    this.fullscreenButton.textContent = enabled ? 'EXIT FULLSCREEN' : 'ENTER FULLSCREEN';
    this.windowSize.disabled = enabled;
  }

  private readonly handleKeyDown = (event: KeyboardEvent): void => {
    if (!this.open) return;
    if (this.awaitingBinding) {
      event.preventDefault();
      event.stopPropagation();
      if (event.key === 'Escape') {
        this.cancelBinding('Key assignment cancelled.');
        return;
      }
      if (event.repeat) return;
      const action = this.awaitingBinding;
      if (!isBindableKeyboardCode(event.code)) {
        this.bindingStatus.textContent = 'That key is reserved or unavailable. Choose another keyboard key.';
        return;
      }
      const current = this.store.value;
      const conflict = CONTROL_ACTIONS.find(
        (candidate) => candidate !== action && current.keyBindings[candidate] === event.code,
      );
      if (conflict) {
        this.bindingStatus.textContent = `${formatKeyboardCode(event.code)} is already assigned to ${CONTROL_ACTION_LABELS[conflict]}.`;
        return;
      }
      this.awaitingBinding = null;
      const settings = this.store.update({
        keyBindings: { ...current.keyBindings, [action]: event.code },
      });
      this.bindingStatus.textContent = `${CONTROL_ACTION_LABELS[action]} assigned to ${formatKeyboardCode(event.code)}.`;
      this.onChange?.(settings);
      this.render(settings);
      return;
    }
    if (event.key === 'Escape') {
      event.preventDefault();
      event.stopPropagation();
      this.hide();
      return;
    }
    if (event.key !== 'Tab') return;
    const controls = [...this.element.querySelectorAll<HTMLElement>('button,input,select')].filter(
      (control) => !control.hasAttribute('disabled'),
    );
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

  private cancelBinding(message: string): void {
    this.awaitingBinding = null;
    this.bindingStatus.textContent = message;
    this.render(this.store.value);
  }
}

const CONTROL_ACTION_LABELS: Readonly<Record<ControlAction, string>> = {
  moveForward: 'move forward',
  moveBackward: 'move backward',
  moveLeft: 'move left',
  moveRight: 'move right',
  dash: 'dash',
  recall: 'recall ball',
  focusKick: 'Focus Kick',
  characterUltimate: 'Character Ultimate',
  restart: 'restart match',
};

function isControlAction(value: unknown): value is ControlAction {
  return typeof value === 'string' && (CONTROL_ACTIONS as readonly string[]).includes(value);
}

function formatKeyboardCode(code: string): string {
  if (code.startsWith('Key')) return code.slice(3);
  if (code.startsWith('Digit')) return code.slice(5);
  if (code.startsWith('Arrow')) return code.slice(5).toUpperCase();
  return code.replace('Left', ' LEFT').replace('Right', ' RIGHT').replace('Numpad', 'NUM ').toUpperCase();
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

function requiredElement(root: ParentNode, selector: string): HTMLElement {
  const element = root.querySelector<HTMLElement>(selector);
  if (!element) throw new Error(`Missing settings element ${selector}`);
  return element;
}

function requiredBindingButtons(root: ParentNode): Record<ControlAction, HTMLButtonElement> {
  return Object.fromEntries(
    CONTROL_ACTIONS.map((action) => {
      const button = root.querySelector<HTMLButtonElement>(`[data-binding="${action}"]`);
      if (!button) throw new Error(`Missing binding button for ${action}`);
      return [action, button];
    }),
  ) as Record<ControlAction, HTMLButtonElement>;
}

function parseWindowSize(value: string): { width: 1280 | 1600 | 1920; height: 720 | 900 | 1080 } | null {
  if (value === '1280x720') return { width: 1280, height: 720 };
  if (value === '1600x900') return { width: 1600, height: 900 };
  if (value === '1920x1080') return { width: 1920, height: 1080 };
  return null;
}

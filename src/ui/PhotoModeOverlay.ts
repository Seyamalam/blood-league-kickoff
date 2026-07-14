import { PhotoModeController, type PhotoFilter, type PhotoModeState } from '../game/photo';
import { uiIcon } from './icons';

export interface PhotoModeCallbacks {
  onStateChange: (state: Readonly<PhotoModeState>) => void;
  onCapture: (state: Readonly<PhotoModeState>) => void | Promise<void>;
  onExit: () => void;
}

const NOOP_CALLBACKS: PhotoModeCallbacks = {
  onStateChange: () => undefined,
  onCapture: () => undefined,
  onExit: () => undefined,
};

/** Accessible DOM controls for a renderer-owned photo camera. */
export class PhotoModeOverlay {
  private readonly element: HTMLElement;
  private readonly panel: HTMLElement;
  private readonly distance: HTMLInputElement;
  private readonly fov: HTMLInputElement;
  private readonly exposure: HTMLInputElement;
  private readonly filter: HTMLSelectElement;
  private readonly hideUi: HTMLInputElement;
  private readonly captureButton: HTMLButtonElement;
  private readonly resetButton: HTMLButtonElement;
  private readonly exitButton: HTMLButtonElement;
  private callbacks: PhotoModeCallbacks;
  private unsubscribe: () => void;
  private open = false;

  public constructor(
    root: HTMLElement,
    public readonly controller = new PhotoModeController(),
    callbacks: Partial<PhotoModeCallbacks> = {},
  ) {
    this.callbacks = { ...NOOP_CALLBACKS, ...callbacks };
    this.element = document.createElement('section');
    this.element.className = 'photo-mode hidden';
    this.element.hidden = true;
    this.element.setAttribute('aria-label', 'Photo mode');
    this.element.innerHTML = `
      <div class="photo-mode__frame" aria-hidden="true"></div>
      <aside class="photo-mode__panel" aria-labelledby="photo-mode-title">
        <header><div><p>HIGHLIGHT CAMERA</p><h2 id="photo-mode-title">PHOTO MODE</h2></div><button type="button" data-action="exit" aria-label="Exit photo mode">${uiIcon('close')}</button></header>
        <div class="photo-mode__scroll">
          <p class="photo-mode__help">Arrow keys orbit · Mouse wheel zoom · H hides controls</p>
          ${rangeField('photo-distance', 'Camera distance', 2, 24, 0.25)}
          ${rangeField('photo-fov', 'Field of view', 24, 90, 1)}
          ${rangeField('photo-exposure', 'Exposure', 0.55, 1.6, 0.05)}
          <label class="photo-mode__field">Color grade<select id="photo-filter"><option value="none">Natural</option><option value="blood-moon">Blood Moon</option><option value="noir">Noir</option><option value="cold">Frost</option><option value="victory">Victory Gold</option></select></label>
          <label class="photo-mode__toggle"><span><strong>Clean capture</strong><small>Hide every HUD element except this temporary control panel.</small></span><input id="photo-hide-ui" type="checkbox"></label>
        </div>
        <footer><button type="button" data-action="reset">RESET CAMERA</button><button type="button" data-action="capture" class="photo-mode__capture">${uiIcon('camera')} CAPTURE</button></footer>
      </aside>`;
    this.panel = requiredElement(this.element, '.photo-mode__panel');
    this.distance = requiredInput(this.element, '#photo-distance');
    this.fov = requiredInput(this.element, '#photo-fov');
    this.exposure = requiredInput(this.element, '#photo-exposure');
    this.filter = requiredSelect(this.element, '#photo-filter');
    this.hideUi = requiredInput(this.element, '#photo-hide-ui');
    this.captureButton = requiredButton(this.element, '[data-action="capture"]');
    this.resetButton = requiredButton(this.element, '[data-action="reset"]');
    this.exitButton = requiredButton(this.element, '[data-action="exit"]');
    this.element.addEventListener('input', this.handleInput);
    this.captureButton.addEventListener('click', this.capture);
    this.resetButton.addEventListener('click', this.reset);
    this.exitButton.addEventListener('click', this.hide);
    this.unsubscribe = this.controller.subscribe(this.render, true);
    root.append(this.element);
  }

  public get isVisible(): boolean {
    return this.open;
  }

  public show(callbacks?: Partial<PhotoModeCallbacks>): void {
    if (callbacks) this.callbacks = { ...this.callbacks, ...callbacks };
    if (this.open) return;
    this.open = true;
    this.element.hidden = false;
    this.element.classList.remove('hidden');
    window.addEventListener('keydown', this.handleKeyDown, { capture: true });
    window.addEventListener('wheel', this.handleWheel, { passive: false });
    this.exitButton.focus();
  }

  public readonly hide = (): void => {
    if (!this.open) return;
    this.open = false;
    this.panel.classList.remove('photo-mode__panel--hidden');
    window.removeEventListener('keydown', this.handleKeyDown, { capture: true });
    window.removeEventListener('wheel', this.handleWheel);
    this.element.classList.add('hidden');
    this.element.hidden = true;
    this.callbacks.onExit();
  };

  public dispose(): void {
    this.hide();
    this.unsubscribe();
    this.element.removeEventListener('input', this.handleInput);
    this.captureButton.removeEventListener('click', this.capture);
    this.resetButton.removeEventListener('click', this.reset);
    this.exitButton.removeEventListener('click', this.hide);
    this.element.remove();
  }

  private readonly render = (state: Readonly<PhotoModeState>): void => {
    this.distance.value = String(state.distance);
    this.fov.value = String(state.fov);
    this.exposure.value = String(state.exposure);
    this.filter.value = state.filter;
    this.hideUi.checked = state.hideUi;
    this.element.dataset.filter = state.filter;
    this.callbacks.onStateChange(state);
  };

  private readonly handleInput = (event: Event): void => {
    const target = event.target;
    if (target === this.distance) this.controller.update({ distance: this.distance.valueAsNumber });
    else if (target === this.fov) this.controller.update({ fov: this.fov.valueAsNumber });
    else if (target === this.exposure) this.controller.update({ exposure: this.exposure.valueAsNumber });
    else if (target === this.filter) this.controller.update({ filter: this.filter.value as PhotoFilter });
    else if (target === this.hideUi) this.controller.update({ hideUi: this.hideUi.checked });
  };

  private readonly handleKeyDown = (event: KeyboardEvent): void => {
    if (!this.open) return;
    if (event.key === 'Escape') this.hide();
    else if (event.key.toLowerCase() === 'h') this.panel.classList.toggle('photo-mode__panel--hidden');
    else if (event.key === 'ArrowLeft') this.controller.orbit(-0.06, 0);
    else if (event.key === 'ArrowRight') this.controller.orbit(0.06, 0);
    else if (event.key === 'ArrowUp') this.controller.orbit(0, 0.04);
    else if (event.key === 'ArrowDown') this.controller.orbit(0, -0.04);
    else return;
    event.preventDefault();
    event.stopPropagation();
  };

  private readonly handleWheel = (event: WheelEvent): void => {
    event.preventDefault();
    this.controller.zoom(Math.sign(event.deltaY) * 0.5);
  };

  private readonly reset = (): void => {
    this.controller.reset();
  };
  private readonly capture = (): void => {
    void this.callbacks.onCapture(this.controller.value);
  };
}

function rangeField(id: string, label: string, min: number, max: number, step: number): string {
  return `<label class="photo-mode__field">${label}<input id="${id}" type="range" min="${min}" max="${max}" step="${step}"></label>`;
}

function requiredElement(root: ParentNode, selector: string): HTMLElement {
  const element = root.querySelector<HTMLElement>(selector);
  if (!element) throw new Error(`Missing photo mode element ${selector}`);
  return element;
}
function requiredInput(root: ParentNode, selector: string): HTMLInputElement {
  const input = root.querySelector<HTMLInputElement>(selector);
  if (!input) throw new Error(`Missing photo mode input ${selector}`);
  return input;
}
function requiredSelect(root: ParentNode, selector: string): HTMLSelectElement {
  const select = root.querySelector<HTMLSelectElement>(selector);
  if (!select) throw new Error(`Missing photo mode select ${selector}`);
  return select;
}
function requiredButton(root: ParentNode, selector: string): HTMLButtonElement {
  const button = root.querySelector<HTMLButtonElement>(selector);
  if (!button) throw new Error(`Missing photo mode button ${selector}`);
  return button;
}

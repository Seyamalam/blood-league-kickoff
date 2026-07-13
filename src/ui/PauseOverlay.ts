export interface PauseOverlayCallbacks {
  onResume: () => void;
  onSettings: () => void;
  onRestart: () => void;
  onMainMenu: () => void;
}

const NOOP_CALLBACKS: PauseOverlayCallbacks = {
  onResume: () => undefined,
  onSettings: () => undefined,
  onRestart: () => undefined,
  onMainMenu: () => undefined,
};

/** Accessible pause menu with keyboard-safe lifecycle and integration callbacks. */
export class PauseOverlay {
  private readonly element: HTMLElement;
  private readonly resumeButton: HTMLButtonElement;
  private readonly settingsButton: HTMLButtonElement;
  private readonly restartButton: HTMLButtonElement;
  private readonly menuButton: HTMLButtonElement;
  private callbacks: PauseOverlayCallbacks;
  private previouslyFocused: HTMLElement | null = null;
  private open = false;

  public constructor(root: HTMLElement, callbacks: Partial<PauseOverlayCallbacks> = {}) {
    this.callbacks = { ...NOOP_CALLBACKS, ...callbacks };
    this.element = document.createElement('section');
    this.element.className = 'pause-overlay hidden';
    this.element.hidden = true;
    this.element.setAttribute('role', 'dialog');
    this.element.setAttribute('aria-modal', 'true');
    this.element.setAttribute('aria-labelledby', 'pause-overlay-title');
    this.element.setAttribute('aria-describedby', 'pause-overlay-description');
    this.element.innerHTML = `
      <div class="pause-panel">
        <p class="pause-panel__eyebrow">MATCH SUSPENDED</p>
        <h2 id="pause-overlay-title">PAUSED</h2>
        <p id="pause-overlay-description" class="pause-panel__description">The blood moon waits for your return.</p>
        <nav class="pause-panel__actions" aria-label="Pause menu">
          <button type="button" data-action="resume">RESUME MATCH</button>
          <button type="button" data-action="settings">SETTINGS</button>
          <button type="button" data-action="restart">RESTART RUN</button>
          <button type="button" data-action="menu" class="pause-panel__secondary">MAIN MENU</button>
        </nav>
        <small>Press Escape to resume</small>
      </div>
    `;
    this.resumeButton = requiredButton(this.element, '[data-action="resume"]');
    this.settingsButton = requiredButton(this.element, '[data-action="settings"]');
    this.restartButton = requiredButton(this.element, '[data-action="restart"]');
    this.menuButton = requiredButton(this.element, '[data-action="menu"]');
    this.resumeButton.addEventListener('click', this.resume);
    this.settingsButton.addEventListener('click', this.openSettings);
    this.restartButton.addEventListener('click', this.restart);
    this.menuButton.addEventListener('click', this.mainMenu);
    root.append(this.element);
  }

  public get isVisible(): boolean {
    return this.open;
  }

  public show(callbacks?: Partial<PauseOverlayCallbacks>): void {
    if (callbacks) this.callbacks = { ...this.callbacks, ...callbacks };
    if (this.open) return;
    this.open = true;
    this.previouslyFocused = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    this.element.hidden = false;
    this.element.classList.remove('hidden');
    window.addEventListener('keydown', this.handleKeyDown, { capture: true });
    window.requestAnimationFrame(() => {
      if (this.open) this.resumeButton.focus();
    });
  }

  public hide(): void {
    if (!this.open) return;
    this.open = false;
    window.removeEventListener('keydown', this.handleKeyDown, { capture: true });
    this.element.classList.add('hidden');
    this.element.hidden = true;
    if (this.previouslyFocused?.isConnected) this.previouslyFocused.focus();
    this.previouslyFocused = null;
  }

  public toggle(callbacks?: Partial<PauseOverlayCallbacks>): void {
    if (this.open) this.resume();
    else this.show(callbacks);
  }

  public dispose(): void {
    this.hide();
    this.resumeButton.removeEventListener('click', this.resume);
    this.settingsButton.removeEventListener('click', this.openSettings);
    this.restartButton.removeEventListener('click', this.restart);
    this.menuButton.removeEventListener('click', this.mainMenu);
    this.element.remove();
  }

  private readonly resume = (): void => {
    if (!this.open) return;
    this.hide();
    this.callbacks.onResume();
  };

  private readonly openSettings = (): void => {
    if (this.open) this.callbacks.onSettings();
  };

  private readonly restart = (): void => {
    if (!this.open) return;
    this.hide();
    this.callbacks.onRestart();
  };

  private readonly mainMenu = (): void => {
    if (!this.open) return;
    this.hide();
    this.callbacks.onMainMenu();
  };

  private readonly handleKeyDown = (event: KeyboardEvent): void => {
    if (!this.open) return;
    if (event.key === 'Escape') {
      event.preventDefault();
      event.stopPropagation();
      this.resume();
      return;
    }
    if (event.key !== 'Tab') return;
    const buttons = [this.resumeButton, this.settingsButton, this.restartButton, this.menuButton];
    const first = buttons[0];
    const last = buttons.at(-1);
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

function requiredButton(root: ParentNode, selector: string): HTMLButtonElement {
  const button = root.querySelector<HTMLButtonElement>(selector);
  if (!button) throw new Error(`Missing pause button ${selector}`);
  return button;
}

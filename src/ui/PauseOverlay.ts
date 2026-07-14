import type { DamageCategory, RunTelemetrySnapshot } from '../game/stats';
import { uiIcon, type UiIconName } from './icons';

export interface PauseOverlayCallbacks {
  onResume: () => void;
  onSettings: () => void;
  onRestart: () => void;
  onMainMenu: () => void;
  getTelemetry: () => RunTelemetrySnapshot;
}

const NOOP_CALLBACKS: PauseOverlayCallbacks = {
  onResume: () => undefined,
  onSettings: () => undefined,
  onRestart: () => undefined,
  onMainMenu: () => undefined,
  getTelemetry: emptyTelemetry,
};

export interface PauseTelemetryItem {
  readonly id: string;
  readonly label: string;
  readonly value: number;
  readonly formattedValue: string;
  readonly icon: UiIconName;
  readonly share?: number;
}

export interface PauseTelemetryView {
  readonly summary: readonly PauseTelemetryItem[];
  readonly damage: readonly PauseTelemetryItem[];
  readonly actions: readonly PauseTelemetryItem[];
}

/** Accessible pause menu with keyboard-safe lifecycle and integration callbacks. */
export class PauseOverlay {
  private readonly element: HTMLElement;
  private readonly resumeButton: HTMLButtonElement;
  private readonly settingsButton: HTMLButtonElement;
  private readonly statsButton: HTMLButtonElement;
  private readonly restartButton: HTMLButtonElement;
  private readonly menuButton: HTMLButtonElement;
  private readonly pauseMenu: HTMLElement;
  private readonly statsPanel: HTMLElement;
  private readonly statsSummary: HTMLElement;
  private readonly statsDamage: HTMLElement;
  private readonly statsActions: HTMLElement;
  private readonly statsBackButton: HTMLButtonElement;
  private callbacks: PauseOverlayCallbacks;
  private previouslyFocused: HTMLElement | null = null;
  private open = false;
  private statsOpen = false;

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
        <div class="pause-panel__menu">
          <p class="pause-panel__eyebrow">MATCH SUSPENDED</p>
          <h2 id="pause-overlay-title">PAUSED</h2>
          <p id="pause-overlay-description" class="pause-panel__description">The blood moon waits for your return.</p>
          <nav class="pause-panel__actions" aria-label="Pause menu">
            <button type="button" data-action="resume">${uiIcon('resume')}<span>RESUME MATCH</span></button>
            <button type="button" data-action="stats">${uiIcon('stats')}<span>LIVE RUN STATS</span></button>
            <button type="button" data-action="settings">${uiIcon('settings')}<span>SETTINGS</span></button>
            <button type="button" data-action="restart">${uiIcon('restart')}<span>RESTART RUN</span></button>
            <button type="button" data-action="menu" class="pause-panel__secondary">${uiIcon('home')}<span>MAIN MENU</span></button>
          </nav>
          <small>Press Escape to resume</small>
        </div>
        <section class="pause-stats hidden" aria-labelledby="pause-stats-title">
          <header>
            <button type="button" data-action="stats-back" class="pause-stats__back" aria-label="Back to pause menu">${uiIcon('back')}</button>
            <div><p class="pause-panel__eyebrow">CURRENT MATCH</p><h3 id="pause-stats-title">LIVE RUN STATS</h3></div>
          </header>
          <div class="pause-stats__scroll">
            <dl class="pause-stats__summary" aria-label="Run summary"></dl>
            <h4>DAMAGE OUTPUT</h4>
            <div class="pause-stats__damage"></div>
            <h4>MATCH ACTIONS</h4>
            <dl class="pause-stats__actions"></dl>
          </div>
        </section>
      </div>
    `;
    this.pauseMenu = requiredElement(this.element, '.pause-panel__menu');
    this.statsPanel = requiredElement(this.element, '.pause-stats');
    this.statsSummary = requiredElement(this.element, '.pause-stats__summary');
    this.statsDamage = requiredElement(this.element, '.pause-stats__damage');
    this.statsActions = requiredElement(this.element, '.pause-stats__actions');
    this.resumeButton = requiredButton(this.element, '[data-action="resume"]');
    this.statsButton = requiredButton(this.element, '[data-action="stats"]');
    this.settingsButton = requiredButton(this.element, '[data-action="settings"]');
    this.restartButton = requiredButton(this.element, '[data-action="restart"]');
    this.menuButton = requiredButton(this.element, '[data-action="menu"]');
    this.statsBackButton = requiredButton(this.element, '[data-action="stats-back"]');
    this.resumeButton.addEventListener('click', this.resume);
    this.statsButton.addEventListener('click', this.showStats);
    this.statsBackButton.addEventListener('click', this.hideStats);
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
    this.setStatsOpen(false);
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
    this.setStatsOpen(false);
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
    this.statsButton.removeEventListener('click', this.showStats);
    this.statsBackButton.removeEventListener('click', this.hideStats);
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

  private readonly showStats = (): void => {
    if (!this.open) return;
    this.renderTelemetry(this.callbacks.getTelemetry());
    this.setStatsOpen(true);
    this.statsBackButton.focus();
  };

  private readonly hideStats = (): void => {
    if (!this.open || !this.statsOpen) return;
    this.setStatsOpen(false);
    this.statsButton.focus();
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
      if (this.statsOpen) this.hideStats();
      else this.resume();
      return;
    }
    if (event.key !== 'Tab') return;
    const buttons = this.statsOpen
      ? [this.statsBackButton]
      : [this.resumeButton, this.statsButton, this.settingsButton, this.restartButton, this.menuButton];
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

  private setStatsOpen(open: boolean): void {
    this.statsOpen = open;
    this.pauseMenu.classList.toggle('hidden', open);
    this.statsPanel.classList.toggle('hidden', !open);
    this.element.setAttribute('aria-labelledby', open ? 'pause-stats-title' : 'pause-overlay-title');
    if (open) this.element.removeAttribute('aria-describedby');
    else this.element.setAttribute('aria-describedby', 'pause-overlay-description');
  }

  private renderTelemetry(snapshot: Readonly<RunTelemetrySnapshot>): void {
    const view = createPauseTelemetryView(snapshot);
    this.statsSummary.replaceChildren(...view.summary.map(createStatTile));
    this.statsActions.replaceChildren(...view.actions.map(createStatTile));
    this.statsDamage.replaceChildren(...view.damage.map(createDamageRow));
  }
}

function requiredButton(root: ParentNode, selector: string): HTMLButtonElement {
  const button = root.querySelector<HTMLButtonElement>(selector);
  if (!button) throw new Error(`Missing pause button ${selector}`);
  return button;
}

function requiredElement(root: ParentNode, selector: string): HTMLElement {
  const element = root.querySelector<HTMLElement>(selector);
  if (!element) throw new Error(`Missing pause element ${selector}`);
  return element;
}

export function createPauseTelemetryView(snapshot: Readonly<RunTelemetrySnapshot>): PauseTelemetryView {
  const totalDamage = safeValue(snapshot.totalDamage);
  const damageDefinitions: ReadonlyArray<readonly [DamageCategory, string, UiIconName]> = [
    ['primary-ball', 'Ball', 'ball'],
    ['secondary-weapons', 'Weapons', 'loadout'],
    ['dash', 'Dash', 'resume'],
    ['holy-zone', 'Holy pitch', 'shield'],
    ['ultimate', 'Ultimate', 'stats'],
  ];
  const item = (id: string, label: string, value: number, icon: UiIconName): PauseTelemetryItem => {
    const safe = safeValue(value);
    return { id, label, value: safe, formattedValue: formatTelemetryValue(safe), icon };
  };
  return {
    summary: [
      item('total-damage', 'Total damage', totalDamage, 'stats'),
      item('damage-taken', 'Damage taken', snapshot.damageTaken, 'shield'),
      item('healing', 'Healing', snapshot.healing, 'heal'),
      item('damage-blocked', 'Blocked', snapshot.damageBlocked, 'shield'),
    ],
    damage: damageDefinitions.map(([id, label, icon]) => {
      const base = item(id, label, snapshot.damageByCategory[id], icon);
      return { ...base, share: totalDamage > 0 ? Math.min(1, base.value / totalDamage) : 0 };
    }),
    actions: [
      item('kicks', 'Kicks', snapshot.kicks, 'ball'),
      item('dashes', 'Dashes', snapshot.dashes, 'resume'),
      item('perfect-volleys', 'Perfect volleys', snapshot.perfectVolleys, 'trophy'),
      item('goals', 'Goals', snapshot.goals, 'trophy'),
    ],
  };
}

function createStatTile(item: PauseTelemetryItem): HTMLElement {
  const container = document.createElement('div');
  container.innerHTML = `${uiIcon(item.icon)}<dt>${item.label}</dt><dd>${item.formattedValue}</dd>`;
  return container;
}

function createDamageRow(item: PauseTelemetryItem): HTMLElement {
  const row = document.createElement('div');
  row.className = 'pause-stats__damage-row';
  row.innerHTML = `<span>${uiIcon(item.icon)}${item.label}</span><strong>${item.formattedValue}</strong><i aria-hidden="true"><b style="width:${Math.round((item.share ?? 0) * 100)}%"></b></i>`;
  return row;
}

function formatTelemetryValue(value: number): string {
  return Math.round(value).toLocaleString();
}

function safeValue(value: number): number {
  return Number.isFinite(value) ? Math.max(0, value) : 0;
}

function emptyTelemetry(): RunTelemetrySnapshot {
  return {
    damageByCategory: {
      'primary-ball': 0,
      'secondary-weapons': 0,
      dash: 0,
      'holy-zone': 0,
      ultimate: 0,
    },
    totalDamage: 0,
    healing: 0,
    damageBlocked: 0,
    damageTaken: 0,
    kicks: 0,
    dashes: 0,
    perfectVolleys: 0,
    goals: 0,
  };
}

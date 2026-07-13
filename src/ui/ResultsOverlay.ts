import type { UpgradeId } from '../game/progression';
import { UPGRADE_DEFINITIONS } from '../game/progression';
import { BUILD_METADATA } from '../build/buildMetadata';

export type GameResultOutcome = 'victory' | 'defeat';

export interface ResultUpgrade {
  upgradeId: UpgradeId;
  stacks: number;
}

export interface GameResultStats {
  outcome: GameResultOutcome;
  score: number;
  kills: number;
  goals: number;
  timeSeconds: number;
  level: number;
  upgrades: readonly ResultUpgrade[];
}

export interface ResultsOverlayCallbacks {
  onRestart: () => void;
  onMainMenu: () => void;
}

const NOOP_CALLBACKS: ResultsOverlayCallbacks = {
  onRestart: () => undefined,
  onMainMenu: () => undefined,
};

/** Final run summary for both victory and defeat outcomes. */
export class ResultsOverlay {
  private readonly element: HTMLElement;
  private readonly eyebrow: HTMLElement;
  private readonly title: HTMLElement;
  private readonly summary: HTMLElement;
  private readonly statsGrid: HTMLElement;
  private readonly upgradesList: HTMLElement;
  private readonly restartButton: HTMLButtonElement;
  private readonly menuButton: HTMLButtonElement;
  private callbacks: ResultsOverlayCallbacks;
  private previouslyFocused: HTMLElement | null = null;
  private open = false;

  public constructor(root: HTMLElement, callbacks: Partial<ResultsOverlayCallbacks> = {}) {
    this.callbacks = { ...NOOP_CALLBACKS, ...callbacks };
    this.element = document.createElement('section');
    this.element.className = 'results-overlay hidden';
    this.element.hidden = true;
    this.element.setAttribute('role', 'dialog');
    this.element.setAttribute('aria-modal', 'true');
    this.element.setAttribute('aria-labelledby', 'results-overlay-title');
    this.element.setAttribute('aria-describedby', 'results-overlay-summary');
    this.element.innerHTML = `
      <div class="results-panel">
        <header class="results-panel__header">
          <p class="results-panel__eyebrow"></p>
          <h2 id="results-overlay-title"></h2>
          <p id="results-overlay-summary" class="results-panel__summary"></p>
        </header>
        <dl class="results-stats" aria-label="Run statistics"></dl>
        <section class="results-upgrades" aria-labelledby="results-upgrades-title">
          <h3 id="results-upgrades-title">FINAL LOADOUT</h3>
          <ul></ul>
        </section>
        <div class="results-panel__actions">
          <button type="button" data-action="restart">KICK OFF AGAIN</button>
          <button type="button" data-action="menu" class="results-panel__secondary">MAIN MENU</button>
        </div>
        <p class="results-panel__build" aria-label="Build ${BUILD_METADATA.label}">${BUILD_METADATA.label}</p>
      </div>
    `;
    this.eyebrow = requiredElement(this.element, '.results-panel__eyebrow');
    this.title = requiredElement(this.element, '#results-overlay-title');
    this.summary = requiredElement(this.element, '#results-overlay-summary');
    this.statsGrid = requiredElement(this.element, '.results-stats');
    this.upgradesList = requiredElement(this.element, '.results-upgrades ul');
    this.restartButton = requiredButton(this.element, '[data-action="restart"]');
    this.menuButton = requiredButton(this.element, '[data-action="menu"]');
    this.restartButton.addEventListener('click', this.restart);
    this.menuButton.addEventListener('click', this.mainMenu);
    root.append(this.element);
  }

  public get isVisible(): boolean {
    return this.open;
  }

  public show(stats: Readonly<GameResultStats>, callbacks?: Partial<ResultsOverlayCallbacks>): void {
    if (callbacks) this.callbacks = { ...this.callbacks, ...callbacks };
    this.render(stats);
    if (this.open) return;
    this.open = true;
    this.previouslyFocused = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    this.element.hidden = false;
    this.element.classList.remove('hidden');
    window.addEventListener('keydown', this.handleKeyDown, { capture: true });
    window.requestAnimationFrame(() => {
      if (this.open) this.restartButton.focus();
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

  public reset(): void {
    this.hide();
    this.statsGrid.replaceChildren();
    this.upgradesList.replaceChildren();
    this.element.classList.remove('results-overlay--victory', 'results-overlay--defeat');
  }

  public dispose(): void {
    this.reset();
    this.restartButton.removeEventListener('click', this.restart);
    this.menuButton.removeEventListener('click', this.mainMenu);
    this.element.remove();
  }

  private render(stats: Readonly<GameResultStats>): void {
    const victory = stats.outcome === 'victory';
    this.element.classList.toggle('results-overlay--victory', victory);
    this.element.classList.toggle('results-overlay--defeat', !victory);
    this.eyebrow.textContent = victory ? 'FINAL WHISTLE · VICTORY' : 'FULL TIME · DEFEAT';
    this.title.textContent = victory ? 'THE CURSE IS BROKEN' : 'THE NIGHT CLAIMS YOU';
    this.summary.textContent = victory
      ? 'Count Goalkeeper has fallen. The stadium belongs to the living.'
      : 'The match ends here, but every new run begins with another kickoff.';

    const statEntries: ReadonlyArray<readonly [string, string]> = [
      ['Score', integer(stats.score).toLocaleString()],
      ['Kills', integer(stats.kills).toLocaleString()],
      ['Goals', integer(stats.goals).toLocaleString()],
      ['Time', formatTime(stats.timeSeconds)],
      ['Level', String(Math.max(1, integer(stats.level)))],
      [
        'Upgrades',
        String(stats.upgrades.reduce((total, upgrade) => total + Math.max(0, integer(upgrade.stacks)), 0)),
      ],
    ];
    const statNodes: HTMLElement[] = [];
    for (const [label, value] of statEntries) {
      const container = document.createElement('div');
      const term = document.createElement('dt');
      const description = document.createElement('dd');
      term.textContent = label;
      description.textContent = value;
      container.append(term, description);
      statNodes.push(container);
    }
    this.statsGrid.replaceChildren(...statNodes);

    const upgradeNodes = stats.upgrades
      .filter((upgrade) => upgrade.stacks > 0)
      .map((upgrade) => {
        const item = document.createElement('li');
        const name = document.createElement('span');
        const stacks = document.createElement('strong');
        name.textContent = UPGRADE_DEFINITIONS[upgrade.upgradeId].name;
        stacks.textContent = `×${integer(upgrade.stacks)}`;
        item.append(name, stacks);
        return item;
      });
    if (upgradeNodes.length === 0) {
      const empty = document.createElement('li');
      empty.className = 'results-upgrades__empty';
      empty.textContent = 'No upgrades collected';
      upgradeNodes.push(empty);
    }
    this.upgradesList.replaceChildren(...upgradeNodes);
  }

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
    if (!this.open || event.key !== 'Tab') return;
    if (event.shiftKey && document.activeElement === this.restartButton) {
      event.preventDefault();
      this.menuButton.focus();
    } else if (!event.shiftKey && document.activeElement === this.menuButton) {
      event.preventDefault();
      this.restartButton.focus();
    }
  };
}

function integer(value: number): number {
  return Number.isFinite(value) ? Math.max(0, Math.floor(value)) : 0;
}

function formatTime(seconds: number): string {
  const total = integer(seconds);
  const minutes = Math.floor(total / 60);
  return `${String(minutes).padStart(2, '0')}:${String(total % 60).padStart(2, '0')}`;
}

function requiredElement(root: ParentNode, selector: string): HTMLElement {
  const element = root.querySelector<HTMLElement>(selector);
  if (!element) throw new Error(`Missing results element ${selector}`);
  return element;
}

function requiredButton(root: ParentNode, selector: string): HTMLButtonElement {
  const button = root.querySelector<HTMLButtonElement>(selector);
  if (!button) throw new Error(`Missing results button ${selector}`);
  return button;
}

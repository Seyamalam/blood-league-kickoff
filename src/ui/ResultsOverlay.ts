import type { EvolutionId, UpgradeId } from '../game/progression';
import { EVOLUTION_DEFINITIONS, UPGRADE_DEFINITIONS } from '../game/progression';
import { BUILD_METADATA } from '../build/buildMetadata';
import { CHARACTER_DEFINITIONS, type CharacterId } from '../game/characters';
import type { ChallengeId } from '../profile';
import { uiIcon } from './icons';
import type { RunTelemetrySnapshot } from '../game/stats';

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
  evolutions: readonly EvolutionId[];
  characterId?: CharacterId;
  accountXpEarned?: number;
  accountLevel?: number;
  unlockedCharacterIds?: readonly CharacterId[];
  completedChallengeIds?: readonly ChallengeId[];
  masteryRewardIds?: readonly string[];
  runMode?: 'standard' | 'daily' | 'weekly' | 'custom';
  seedCode?: string;
  telemetry?: RunTelemetrySnapshot;
}

export interface ResultsOverlayCallbacks {
  onRestart: () => void;
  onMainMenu: () => void;
}

export type RunGradeLetter = 'S' | 'A' | 'B' | 'C' | 'D';

export interface RunGrade {
  letter: RunGradeLetter;
  label: string;
  score: number;
}

const NOOP_CALLBACKS: ResultsOverlayCallbacks = {
  onRestart: () => undefined,
  onMainMenu: () => undefined,
};

/** Final run summary for both victory and defeat outcomes. */
export class ResultsOverlay {
  private readonly element: HTMLElement;
  private readonly panel: HTMLElement;
  private readonly eyebrow: HTMLElement;
  private readonly title: HTMLElement;
  private readonly summary: HTMLElement;
  private readonly outcomeMark: HTMLElement;
  private readonly grade: HTMLElement;
  private readonly gradeLetter: HTMLElement;
  private readonly gradeLabel: HTMLElement;
  private readonly statsGrid: HTMLElement;
  private readonly upgradesList: HTMLElement;
  private readonly breakdown: HTMLElement;
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
          <div class="results-panel__outcome" aria-hidden="true"></div>
          <div class="results-panel__headline">
            <p class="results-panel__eyebrow"></p>
            <h2 id="results-overlay-title"></h2>
            <p id="results-overlay-summary" class="results-panel__summary"></p>
          </div>
          <div class="results-grade" role="img">
            <span>RUN GRADE</span>
            <strong></strong>
            <small></small>
          </div>
        </header>
        <dl class="results-stats" aria-label="Run statistics"></dl>
        <section class="results-upgrades" aria-labelledby="results-upgrades-title">
          <h3 id="results-upgrades-title">FINAL LOADOUT</h3>
          <ul></ul>
        </section>
        <section class="results-breakdown" aria-labelledby="results-breakdown-title">
          <h3 id="results-breakdown-title">${uiIcon('stats')} COMBAT BREAKDOWN</h3>
          <div></div>
        </section>
        <div class="results-panel__actions">
          <button type="button" data-action="restart">${uiIcon('restart')}<span>KICK OFF AGAIN</span></button>
          <button type="button" data-action="menu" class="results-panel__secondary">${uiIcon('home')}<span>MAIN MENU</span></button>
        </div>
        <p class="results-panel__build" aria-label="Build ${BUILD_METADATA.label}">${BUILD_METADATA.label}</p>
      </div>
    `;
    this.eyebrow = requiredElement(this.element, '.results-panel__eyebrow');
    this.panel = requiredElement(this.element, '.results-panel');
    this.title = requiredElement(this.element, '#results-overlay-title');
    this.summary = requiredElement(this.element, '#results-overlay-summary');
    this.outcomeMark = requiredElement(this.element, '.results-panel__outcome');
    this.grade = requiredElement(this.element, '.results-grade');
    this.gradeLetter = requiredElement(this.element, '.results-grade strong');
    this.gradeLabel = requiredElement(this.element, '.results-grade small');
    this.statsGrid = requiredElement(this.element, '.results-stats');
    this.upgradesList = requiredElement(this.element, '.results-upgrades ul');
    this.breakdown = requiredElement(this.element, '.results-breakdown > div');
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
      if (!this.open) return;
      this.element.scrollTop = 0;
      this.panel.scrollTop = 0;
      this.restartButton.focus({ preventScroll: true });
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
    this.breakdown.replaceChildren();
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
    this.outcomeMark.textContent = victory ? '✦' : '×';
    const grade = calculateRunGrade(stats);
    this.gradeLetter.textContent = grade.letter;
    this.gradeLabel.textContent = grade.label;
    this.grade.setAttribute('aria-label', `Run grade ${grade.letter}: ${grade.label}`);

    const statEntries: ReadonlyArray<readonly [string, string]> = [
      ...(stats.characterId ? ([['Character', CHARACTER_DEFINITIONS[stats.characterId].name]] as const) : []),
      ['Score', integer(stats.score).toLocaleString()],
      ['Kills', integer(stats.kills).toLocaleString()],
      ['Goals', integer(stats.goals).toLocaleString()],
      ['Time', formatTime(stats.timeSeconds)],
      ['Level', String(Math.max(1, integer(stats.level)))],
      [
        'Upgrades',
        String(stats.upgrades.reduce((total, upgrade) => total + Math.max(0, integer(upgrade.stacks)), 0)),
      ],
      ['Evolutions', String(stats.evolutions.length)],
      ...(stats.accountXpEarned !== undefined
        ? ([['Career XP', `+${integer(stats.accountXpEarned)}`]] as const)
        : []),
      ...(stats.accountLevel !== undefined
        ? ([['Career Level', String(Math.max(1, integer(stats.accountLevel)))]] as const)
        : []),
      ...(stats.runMode ? ([['Run', stats.runMode.toUpperCase()]] as const) : []),
      ...(stats.seedCode ? ([['Seed', stats.seedCode]] as const) : []),
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
    for (const evolutionId of stats.evolutions) {
      const item = document.createElement('li');
      item.className = 'results-upgrades__evolution';
      const name = document.createElement('span');
      const status = document.createElement('strong');
      name.textContent = `✦ ${EVOLUTION_DEFINITIONS[evolutionId].name}`;
      status.textContent = 'EVOLVED';
      item.append(name, status);
      upgradeNodes.push(item);
    }
    for (const characterId of stats.unlockedCharacterIds ?? []) {
      const item = document.createElement('li');
      item.className = 'results-upgrades__evolution';
      item.textContent = `NEW CHARACTER · ${CHARACTER_DEFINITIONS[characterId].name}`;
      upgradeNodes.push(item);
    }
    for (const challengeId of stats.completedChallengeIds ?? []) {
      const item = document.createElement('li');
      item.className = 'results-upgrades__evolution';
      item.textContent = `CHALLENGE COMPLETE · ${challengeId.replace(/([A-Z])/g, ' $1').toUpperCase()}`;
      upgradeNodes.push(item);
    }
    for (const rewardId of stats.masteryRewardIds ?? []) {
      const item = document.createElement('li');
      item.className = 'results-upgrades__evolution';
      item.textContent = `MASTERY UNLOCK · ${rewardId.replace(/-/g, ' ').toUpperCase()}`;
      upgradeNodes.push(item);
    }
    if (upgradeNodes.length === 0) {
      const empty = document.createElement('li');
      empty.className = 'results-upgrades__empty';
      empty.textContent = 'No upgrades collected';
      upgradeNodes.push(empty);
    }
    this.upgradesList.replaceChildren(...upgradeNodes);
    this.renderBreakdown(stats.telemetry);
  }

  private renderBreakdown(telemetry: RunTelemetrySnapshot | undefined): void {
    if (!telemetry) {
      this.breakdown.textContent = 'Combat telemetry unavailable for this run.';
      return;
    }
    const entries: ReadonlyArray<readonly [string, number]> = [
      ['Total damage', telemetry.totalDamage],
      ['Ball damage', telemetry.damageByCategory['primary-ball']],
      ['Weapon damage', telemetry.damageByCategory['secondary-weapons']],
      ['Healing', telemetry.healing],
      ['Damage blocked', telemetry.damageBlocked],
      ['Perfect volleys', telemetry.perfectVolleys],
    ];
    this.breakdown.replaceChildren(
      ...entries.map(([label, value]) => {
        const item = document.createElement('span');
        const name = document.createElement('small');
        const amount = document.createElement('strong');
        name.textContent = label;
        amount.textContent = integer(value).toLocaleString();
        item.append(name, amount);
        return item;
      }),
    );
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

/** Deterministic result grade. Victory guarantees a meaningful outcome bonus. */
export function calculateRunGrade(stats: Readonly<GameResultStats>): RunGrade {
  const upgradeStacks = stats.upgrades.reduce(
    (total, upgrade) => total + Math.max(0, integer(upgrade.stacks)),
    0,
  );
  const score = Math.round(
    (stats.outcome === 'victory' ? 35 : 0) +
      normalized(stats.score, 20_000) * 15 +
      normalized(stats.kills, 150) * 20 +
      normalized(stats.goals, 2) * 10 +
      normalized(stats.timeSeconds, 540) * 10 +
      normalized(Math.max(0, integer(stats.level) - 1), 11) * 10 +
      normalized(upgradeStacks, 15) * 5,
  );
  const boundedScore = Math.min(100, score);
  if (boundedScore >= 90) return { letter: 'S', label: 'LEGENDARY', score: boundedScore };
  if (boundedScore >= 75) return { letter: 'A', label: 'DOMINANT', score: boundedScore };
  if (boundedScore >= 55) return { letter: 'B', label: 'RESOLUTE', score: boundedScore };
  if (boundedScore >= 35) return { letter: 'C', label: 'BLOODIED', score: boundedScore };
  return { letter: 'D', label: 'FALLEN', score: boundedScore };
}

function integer(value: number): number {
  return Number.isFinite(value) ? Math.max(0, Math.floor(value)) : 0;
}

function normalized(value: number, maximum: number): number {
  return Math.min(1, integer(value) / maximum);
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

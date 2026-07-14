import { CHARACTER_DEFINITIONS } from '../game/characters';
import { dailyRunSeed, weeklyRunSeed } from '../game/runs';
import { LocalLeaderboardRepository } from '../leaderboard';
import {
  accountLevelForXp,
  CHALLENGE_DEFINITIONS,
  CHARACTER_IDS,
  CHARACTER_UNLOCK_LEVELS,
  masteryLevelForXp,
  masteryRewardsFor,
  ProfileStore,
  totalAccountXpForLevel,
  type ChallengeId,
  type CharacterId,
  type PlayerProfile,
  type RunRecord,
} from '../profile';

export type CareerCharacterSelectedCallback = (characterId: CharacterId) => void;

export interface CareerCharacterView {
  id: CharacterId;
  name: string;
  role: string;
  trait: string;
  weakness: string;
  unlocked: boolean;
  selected: boolean;
  unlockLevel: number;
  masteryXp: number;
  masteryLevel: number;
  nextMasteryReward: string | null;
  matches: number;
  wins: number;
  bestScore: number;
}

export interface CareerChallengeView {
  id: ChallengeId;
  name: string;
  value: number;
  target: number;
  completed: boolean;
}

export interface CareerViewModel {
  accountLevel: number;
  accountXp: number;
  levelXp: number;
  levelXpTarget: number;
  characters: readonly CareerCharacterView[];
  challenges: readonly CareerChallengeView[];
  recentRuns: readonly RunRecord[];
  scoreBoard: readonly RunRecord[];
  fastestVictoryBoard: readonly RunRecord[];
  dailyBoard: readonly RunRecord[];
  weeklyBoard: readonly RunRecord[];
}

/** Persistent career, mastery, challenge, history, and offline-record dialog. */
export class CareerOverlay {
  private readonly element: HTMLElement;
  private readonly closeButton: HTMLButtonElement;
  private readonly body: HTMLElement;
  private readonly accountSummary: HTMLElement;
  private readonly lifetimeSummary: HTMLElement;
  private readonly personalBests: HTMLElement;
  private readonly characterGrid: HTMLElement;
  private readonly challengeList: HTMLElement;
  private readonly recentRuns: HTMLElement;
  private readonly scoreBoard: HTMLElement;
  private readonly fastestVictoryBoard: HTMLElement;
  private readonly dailyBoard: HTMLElement;
  private readonly weeklyBoard: HTMLElement;
  private readonly repository: LocalLeaderboardRepository;
  private readonly unsubscribe: () => void;
  private previouslyFocused: HTMLElement | null = null;
  private open = false;

  public constructor(
    root: HTMLElement,
    private readonly store: ProfileStore,
    private readonly buildVersion: string,
    private onCharacterSelected: CareerCharacterSelectedCallback | null = null,
  ) {
    this.repository = new LocalLeaderboardRepository(() => this.store.value);
    this.element = document.createElement('section');
    this.element.className = 'career-overlay hidden';
    this.element.hidden = true;
    this.element.setAttribute('role', 'dialog');
    this.element.setAttribute('aria-modal', 'true');
    this.element.setAttribute('aria-labelledby', 'career-overlay-title');
    this.element.innerHTML = `
      <div class="career-panel">
        <header class="career-panel__header">
          <div>
            <p class="career-panel__eyebrow">BLOOD LEAGUE CAREER</p>
            <h2 id="career-overlay-title">PROGRESSION</h2>
          </div>
          <button type="button" class="career-panel__close" data-action="close" aria-label="Close career">×</button>
        </header>
        <div class="career-panel__body">
          <section class="career-account" aria-labelledby="career-account-title">
            <h3 id="career-account-title">ACCOUNT</h3>
            <div class="career-account__summary"></div>
            <div class="career-account__stats" aria-label="Lifetime statistics"></div>
            <div class="career-account__bests" aria-label="Personal bests"></div>
          </section>
          <section class="career-section" aria-labelledby="career-characters-title">
            <header><h3 id="career-characters-title">CHARACTERS</h3><p>Original football archetypes with distinct traits and tradeoffs.</p></header>
            <div class="career-characters"></div>
          </section>
          <section class="career-section" aria-labelledby="career-challenges-title">
            <header><h3 id="career-challenges-title">CHALLENGES</h3><p>Career objectives update after each completed run.</p></header>
            <ol class="career-challenges"></ol>
          </section>
          <section class="career-section" aria-labelledby="career-history-title">
            <header><h3 id="career-history-title">RECENT RUNS</h3><p>Latest locally saved matches.</p></header>
            <ol class="career-runs"></ol>
          </section>
          <section class="career-section career-leaderboards" aria-labelledby="career-leaderboards-title">
            <header>
              <h3 id="career-leaderboards-title">LOCAL / OFFLINE LEADERBOARDS</h3>
              <p>Personal records stored on this device for build <strong class="career-build"></strong>. These are not global online rankings.</p>
            </header>
            <div class="career-leaderboards__grid">
              <section aria-labelledby="career-score-board-title"><h4 id="career-score-board-title">LOCAL HIGH SCORE</h4><ol class="career-score-board"></ol></section>
              <section aria-labelledby="career-speed-board-title"><h4 id="career-speed-board-title">LOCAL FASTEST VICTORY</h4><ol class="career-speed-board"></ol></section>
              <section aria-labelledby="career-daily-board-title"><h4 id="career-daily-board-title">TODAY'S DAILY</h4><ol class="career-daily-board"></ol></section>
              <section aria-labelledby="career-weekly-board-title"><h4 id="career-weekly-board-title">THIS WEEK</h4><ol class="career-weekly-board"></ol></section>
            </div>
          </section>
        </div>
        <footer class="career-panel__footer">Progress saves locally · Press Escape to close</footer>
      </div>
    `;
    this.closeButton = requiredButton(this.element, '.career-panel__close');
    this.body = requiredElement(this.element, '.career-panel__body');
    this.accountSummary = requiredElement(this.element, '.career-account__summary');
    this.lifetimeSummary = requiredElement(this.element, '.career-account__stats');
    this.personalBests = requiredElement(this.element, '.career-account__bests');
    this.characterGrid = requiredElement(this.element, '.career-characters');
    this.challengeList = requiredElement(this.element, '.career-challenges');
    this.recentRuns = requiredElement(this.element, '.career-runs');
    this.scoreBoard = requiredElement(this.element, '.career-score-board');
    this.fastestVictoryBoard = requiredElement(this.element, '.career-speed-board');
    this.dailyBoard = requiredElement(this.element, '.career-daily-board');
    this.weeklyBoard = requiredElement(this.element, '.career-weekly-board');
    requiredElement(this.element, '.career-build').textContent = buildVersion;
    this.closeButton.addEventListener('click', this.hide);
    this.element.addEventListener('click', this.handleClick);
    this.unsubscribe = this.store.subscribe(() => this.refresh());
    root.append(this.element);
    this.refresh();
  }

  public get isVisible(): boolean {
    return this.open;
  }

  public show(onCharacterSelected?: CareerCharacterSelectedCallback): void {
    if (onCharacterSelected) this.onCharacterSelected = onCharacterSelected;
    this.refresh();
    if (this.open) return;
    this.open = true;
    this.body.scrollTop = 0;
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

  public refresh(): void {
    const profile = this.store.value;
    const view = createCareerViewModel(profile, this.buildVersion, this.repository);
    this.renderAccount(profile, view);
    this.renderCharacters(view.characters);
    this.renderChallenges(view.challenges);
    renderRuns(this.recentRuns, view.recentRuns, 'No completed runs saved yet.');
    renderBoard(this.scoreBoard, view.scoreBoard, 'score');
    renderBoard(this.fastestVictoryBoard, view.fastestVictoryBoard, 'fastestVictory');
    renderBoard(this.dailyBoard, view.dailyBoard, 'score');
    renderBoard(this.weeklyBoard, view.weeklyBoard, 'score');
  }

  public dispose(): void {
    this.hide();
    this.unsubscribe();
    this.closeButton.removeEventListener('click', this.hide);
    this.element.removeEventListener('click', this.handleClick);
    this.element.remove();
  }

  private renderAccount(profile: Readonly<PlayerProfile>, view: Readonly<CareerViewModel>): void {
    this.accountSummary.innerHTML = `
      <strong>LEVEL ${view.accountLevel}</strong>
      <span>${view.levelXp.toLocaleString()} / ${view.levelXpTarget.toLocaleString()} XP</span>
      <progress value="${view.levelXp}" max="${Math.max(1, view.levelXpTarget)}" aria-label="Account level progress"></progress>
    `;
    this.lifetimeSummary.innerHTML = statGrid([
      ['Matches', profile.lifetime.matchesPlayed],
      ['Wins', profile.lifetime.wins],
      ['Goals', profile.lifetime.goals],
      ['Kills', profile.lifetime.kills],
      ['Total score', profile.lifetime.totalScore],
      ['Play time', formatTime(profile.lifetime.survivalSeconds)],
    ]);
    this.personalBests.innerHTML = statGrid([
      ['Best score', profile.personalBests.score],
      ['Best kills', profile.personalBests.kills],
      ['Best goals', profile.personalBests.goals],
      ['Highest level', profile.personalBests.highestLevel],
      ['Longest run', formatTime(profile.personalBests.longestSurvivalSeconds)],
      [
        'Fastest victory',
        profile.personalBests.fastestVictorySeconds === null
          ? '—'
          : formatTime(profile.personalBests.fastestVictorySeconds),
      ],
    ]);
  }

  private renderCharacters(characters: readonly CareerCharacterView[]): void {
    this.characterGrid.replaceChildren(
      ...characters.map((character) => {
        const article = document.createElement('article');
        article.className = 'career-character';
        article.classList.toggle('career-character--locked', !character.unlocked);
        article.classList.toggle('career-character--selected', character.selected);
        article.innerHTML = `
          <header><div><small>${character.role}</small><h4>${character.name}</h4></div><span>${character.unlocked ? (character.selected ? 'SELECTED' : 'UNLOCKED') : `LEVEL ${character.unlockLevel}`}</span></header>
          <p><strong>TRAIT</strong> ${character.trait}</p>
          <p><strong>WEAKNESS</strong> ${character.weakness}</p>
          <dl><div><dt>Mastery</dt><dd>LV ${character.masteryLevel}</dd></div><div><dt>Mastery XP</dt><dd>${character.masteryXp.toLocaleString()}</dd></div><div><dt>Matches</dt><dd>${character.matches}</dd></div><div><dt>Wins</dt><dd>${character.wins}</dd></div><div><dt>Best score</dt><dd>${character.bestScore.toLocaleString()}</dd></div></dl>
          <p class="career-character__mastery"><strong>NEXT REWARD</strong> ${character.nextMasteryReward ?? 'All signature rewards unlocked'}</p>
          <button type="button" data-character-id="${character.id}" ${character.unlocked && !character.selected ? '' : 'disabled'}>${character.selected ? 'CURRENT PLAYER' : character.unlocked ? `SELECT ${character.name.toUpperCase()}` : `LOCKED · ACCOUNT LEVEL ${character.unlockLevel}`}</button>
        `;
        return article;
      }),
    );
  }

  private renderChallenges(challenges: readonly CareerChallengeView[]): void {
    this.challengeList.replaceChildren(
      ...challenges.map((challenge) => {
        const item = document.createElement('li');
        item.className = 'career-challenge';
        item.classList.toggle('career-challenge--complete', challenge.completed);
        item.innerHTML = `<span>${challenge.completed ? '✓' : '○'}</span><div><strong>${challenge.name}</strong><small>${formatMetric(challenge.value)} / ${formatMetric(challenge.target)}</small><progress value="${Math.min(challenge.value, challenge.target)}" max="${challenge.target}"></progress></div>`;
        return item;
      }),
    );
  }

  private readonly handleClick = (event: MouseEvent): void => {
    const target =
      event.target instanceof Element ? event.target.closest<HTMLButtonElement>('[data-character-id]') : null;
    if (!target || target.disabled) return;
    const characterId = target.dataset.characterId;
    if (!isCharacterId(characterId) || !this.store.selectCharacter(characterId)) return;
    this.onCharacterSelected?.(characterId);
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
    const focusable = [...this.element.querySelectorAll<HTMLButtonElement>('button:not(:disabled)')];
    const first = focusable[0];
    const last = focusable.at(-1);
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

export function createCareerViewModel(
  profile: Readonly<PlayerProfile>,
  buildVersion: string,
  repository = new LocalLeaderboardRepository(profile),
): CareerViewModel {
  const accountLevel = accountLevelForXp(profile.accountXp);
  const levelFloor = totalAccountXpForLevel(accountLevel);
  const nextLevel = totalAccountXpForLevel(accountLevel + 1);
  const daily = dailyRunSeed();
  const weekly = weeklyRunSeed();
  return {
    accountLevel,
    accountXp: profile.accountXp,
    levelXp: profile.accountXp - levelFloor,
    levelXpTarget: nextLevel - levelFloor,
    characters: CHARACTER_IDS.map((id) => {
      const definition = CHARACTER_DEFINITIONS[id];
      const mastery = profile.characterMastery[id];
      const masteryLevel = masteryLevelForXp(mastery.xp);
      const nextMasteryReward = masteryRewardsFor(id).find((reward) => reward.level > masteryLevel);
      return {
        id,
        name: definition.name,
        role: definition.role,
        trait: definition.strength,
        weakness: definition.weakness,
        unlocked: profile.unlockedCharacterIds.includes(id),
        selected: profile.selectedCharacterId === id,
        unlockLevel: CHARACTER_UNLOCK_LEVELS[id],
        masteryXp: mastery.xp,
        masteryLevel,
        nextMasteryReward: nextMasteryReward
          ? `LV ${nextMasteryReward.level} · ${nextMasteryReward.name}`
          : null,
        matches: mastery.matches,
        wins: mastery.wins,
        bestScore: mastery.bestScore,
      };
    }),
    challenges: Object.values(CHALLENGE_DEFINITIONS).map((definition) => {
      const progress = profile.challengeProgress[definition.id];
      return {
        id: definition.id,
        name: definition.name,
        value: progress.value,
        target: definition.target,
        completed: progress.completedAt !== null,
      };
    }),
    recentRuns: profile.recentRuns.map(cloneRun),
    scoreBoard: repository
      .getEntries({ category: 'score', buildVersion, limit: 10 })
      .map((entry) => cloneRun(entry.run)),
    fastestVictoryBoard: repository
      .getEntries({ category: 'fastestVictory', buildVersion, limit: 10 })
      .map((entry) => cloneRun(entry.run)),
    dailyBoard: repository
      .getEntries({
        category: 'score',
        buildVersion,
        runMode: 'daily',
        challengeKey: daily.challengeKey,
        limit: 10,
      })
      .map((entry) => cloneRun(entry.run)),
    weeklyBoard: repository
      .getEntries({
        category: 'score',
        buildVersion,
        runMode: 'weekly',
        challengeKey: weekly.challengeKey,
        limit: 10,
      })
      .map((entry) => cloneRun(entry.run)),
  };
}

function renderRuns(root: HTMLElement, runs: readonly RunRecord[], emptyMessage: string): void {
  if (runs.length === 0) {
    root.innerHTML = `<li class="career-empty">${emptyMessage}</li>`;
    return;
  }
  root.replaceChildren(
    ...runs.map((run) => {
      const item = document.createElement('li');
      item.className = `career-run career-run--${run.outcome}`;
      item.innerHTML = `<strong>${run.outcome.toUpperCase()} · ${CHARACTER_DEFINITIONS[run.characterId].name}</strong><span>${run.score.toLocaleString()} score · ${run.kills} kills · ${run.goals} goals · ${formatTime(run.timeSeconds)}</span><small>${(run.runMode ?? 'standard').toUpperCase()}${run.seedCode ? ` · SEED ${run.seedCode}` : ''} · ${run.buildVersion} · ${formatDate(run.completedAt)}</small>`;
      return item;
    }),
  );
}

function renderBoard(
  root: HTMLElement,
  runs: readonly RunRecord[],
  category: 'score' | 'fastestVictory',
): void {
  if (runs.length === 0) {
    root.innerHTML = '<li class="career-empty">No local record for this build.</li>';
    return;
  }
  root.replaceChildren(
    ...runs.map((run, index) => {
      const item = document.createElement('li');
      item.innerHTML = `<b>#${index + 1}</b><span>${CHARACTER_DEFINITIONS[run.characterId].name}</span><strong>${category === 'score' ? run.score.toLocaleString() : formatTime(run.timeSeconds)}</strong>`;
      return item;
    }),
  );
}

function statGrid(entries: ReadonlyArray<readonly [string, string | number]>): string {
  return `<dl>${entries.map(([label, value]) => `<div><dt>${label}</dt><dd>${typeof value === 'number' ? value.toLocaleString() : value}</dd></div>`).join('')}</dl>`;
}

function cloneRun(run: Readonly<RunRecord>): RunRecord {
  return { ...run, upgradeIds: [...run.upgradeIds], evolutionIds: [...run.evolutionIds] };
}

function formatMetric(value: number): string {
  return Number.isInteger(value) ? value.toLocaleString() : value.toFixed(1);
}

function formatTime(seconds: number): string {
  const total = Math.max(0, Math.floor(seconds));
  return `${String(Math.floor(total / 60)).padStart(2, '0')}:${String(total % 60).padStart(2, '0')}`;
}

function formatDate(value: string): string {
  const timestamp = Date.parse(value);
  return Number.isFinite(timestamp) ? new Date(timestamp).toLocaleDateString() : 'Unknown date';
}

function isCharacterId(value: unknown): value is CharacterId {
  return typeof value === 'string' && CHARACTER_IDS.includes(value as CharacterId);
}

function requiredElement(root: ParentNode, selector: string): HTMLElement {
  const element = root.querySelector<HTMLElement>(selector);
  if (!element) throw new Error(`Missing career element ${selector}`);
  return element;
}

function requiredButton(root: ParentNode, selector: string): HTMLButtonElement {
  const button = root.querySelector<HTMLButtonElement>(selector);
  if (!button) throw new Error(`Missing career button ${selector}`);
  return button;
}

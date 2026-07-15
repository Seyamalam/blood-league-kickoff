import { CHARACTER_DEFINITIONS, startingLoadoutFor } from '../game/characters';
import { CHARACTER_ULTIMATE_DEFINITIONS } from '../game/combat';
import {
  CURSE_DEFINITIONS,
  CURSE_IDS,
  EVOLUTION_DEFINITIONS,
  EVOLUTION_IDS,
  UPGRADE_DEFINITIONS,
  UPGRADE_IDS,
} from '../game/progression';
import { ELITE_MODIFIER_DEFINITIONS } from '../game/encounters';
import { MINIBOSS_CONFIGS } from '../game/boss';
import { CHARACTER_ULTIMATE_ICON_URLS } from '../assets/ultimateIcons';
import { CHARACTER_PORTRAIT_URLS } from '../assets/characterPortraits';
import {
  ENEMY_PORTRAIT_URLS,
  FEATURED_BOSS_PORTRAIT_URLS,
  MINIBOSS_PORTRAIT_URLS,
  RIVAL_PORTRAIT_URLS,
} from '../assets/oppositionPortraits';
import { dailyRunSeed, weeklyRunSeed } from '../game/runs';
import { RIVAL_TEAM_DEFINITIONS } from '../game/match/rivalTeams';
import { LocalLeaderboardRepository } from '../leaderboard';
import {
  accountLevelForXp,
  CHALLENGE_DEFINITIONS,
  CHARACTER_IDS,
  CHARACTER_UNLOCK_LEVELS,
  CURSE_UNLOCK_LEVELS,
  UPGRADE_UNLOCK_LEVELS,
  masteryLevelForXp,
  masteryRewardsFor,
  PROFILE_STADIUM_IDS,
  ProfileStore,
  STADIUM_COSMETICS,
  challengesForStadium,
  totalAccountXpForLevel,
  type ChallengeId,
  type CharacterId,
  type PlayerProfile,
  type RunRecord,
} from '../profile';
import { uiIcon } from './icons';
import { CURSE_ICON_URLS, EVOLUTION_ICON_URLS, UPGRADE_ICON_URLS } from './progressionIcons';
import { CharacterCodexPreview, isCodexPreviewState } from './CharacterCodexPreview';

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
  loadoutName: string;
  loadoutDescription: string;
  loadoutItems: readonly string[];
  ultimateName: string;
  ultimateDescription: string;
  ultimateIconUrl: string;
  portraitUrl: string;
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
  stadiums: readonly CareerStadiumView[];
  recentRuns: readonly RunRecord[];
  scoreBoard: readonly RunRecord[];
  fastestVictoryBoard: readonly RunRecord[];
  dailyBoard: readonly RunRecord[];
  weeklyBoard: readonly RunRecord[];
}

export interface CareerStadiumView {
  id: string;
  name: string;
  matches: number;
  wins: number;
  goals: number;
  kills: number;
  completed: number;
  target: number;
  cosmetics: readonly { id: string; name: string; unlocked: boolean; equipped: boolean }[];
}

export interface CodexEntryView {
  id: string;
  name: string;
  description: string;
  category: 'character' | 'weapon' | 'evolution' | 'enemy' | 'rival' | 'curse';
  unlocked: boolean;
  discovered: boolean;
  iconUrl: string | null;
  unlockHint: string;
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
  private readonly stadiumGrid: HTMLElement;
  private readonly codex: HTMLElement;
  private readonly characterPreview: CharacterCodexPreview;
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
          <button type="button" class="career-panel__close icon-button" data-action="close" aria-label="Close career" title="Close career">${uiIcon('close')}</button>
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
          <section class="career-section" aria-labelledby="career-stadiums-title">
            <header><h3 id="career-stadiums-title">STADIUM MASTERY</h3><p>Complete arena-specific objectives to unlock cosmetic titles, banners, goal effects, and trails.</p></header>
            <div class="career-stadiums"></div>
          </section>
          <section class="career-section career-codex" aria-labelledby="career-codex-title">
            <header><h3 id="career-codex-title">NIGHT LEAGUE CODEX</h3><p>Discover characters, armory, evolutions, opposition, and curse contracts.</p></header>
            <div class="codex-character-preview">
              <div class="codex-character-preview__status"><strong>3D KIT ROOM</strong><span>Loading shared-rig model…</span></div>
              <div class="codex-character-preview__controls" aria-label="Character model preview controls">
                <div class="codex-character-preview__characters">
                  ${CHARACTER_IDS.map((id) => `<button type="button" data-preview-character="${id}">${CHARACTER_DEFINITIONS[id].name.replace('The ', '')}</button>`).join('')}
                </div>
                <div class="codex-character-preview__animations">
                  <button type="button" data-preview-animation="idle">IDLE</button>
                  <button type="button" data-preview-animation="dribble">DRIBBLE</button>
                  <button type="button" data-preview-animation="shoot">SHOOT</button>
                  <button type="button" data-preview-animation="slideTackle">TACKLE</button>
                  <button type="button" data-preview-animation="victory">VICTORY</button>
                </div>
              </div>
            </div>
            <div class="career-codex__groups"></div>
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
    this.stadiumGrid = requiredElement(this.element, '.career-stadiums');
    this.codex = requiredElement(this.element, '.career-codex__groups');
    this.characterPreview = new CharacterCodexPreview(
      requiredElement(this.element, '.codex-character-preview'),
    );
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
    this.characterPreview.setActive(true);
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
    this.characterPreview.setActive(false);
    if (this.previouslyFocused?.isConnected) this.previouslyFocused.focus();
    this.previouslyFocused = null;
  };

  public refresh(): void {
    const profile = this.store.value;
    const view = createCareerViewModel(profile, this.buildVersion, this.repository);
    this.renderAccount(profile, view);
    this.renderCharacters(view.characters);
    this.renderChallenges(view.challenges);
    this.renderStadiums(view.stadiums);
    this.renderCodex(createCodexViewModel(profile));
    renderRuns(this.recentRuns, view.recentRuns, 'No completed runs saved yet.');
    renderBoard(this.scoreBoard, view.scoreBoard, 'score');
    renderBoard(this.fastestVictoryBoard, view.fastestVictoryBoard, 'fastestVictory');
    renderBoard(this.dailyBoard, view.dailyBoard, 'score');
    renderBoard(this.weeklyBoard, view.weeklyBoard, 'score');
  }

  public dispose(): void {
    this.hide();
    this.unsubscribe();
    this.characterPreview.dispose();
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
          <div class="career-character__portrait"><img src="${character.portraitUrl}" alt="${character.name} original character portrait"><span>${character.role}</span></div>
          <header><div><small>${character.role}</small><h4>${character.name}</h4></div><span>${character.unlocked ? (character.selected ? 'SELECTED' : 'UNLOCKED') : `LEVEL ${character.unlockLevel}`}</span></header>
          <p><strong>TRAIT</strong> ${character.trait}</p>
          <p><strong>WEAKNESS</strong> ${character.weakness}</p>
          <dl><div><dt>Mastery</dt><dd>LV ${character.masteryLevel}</dd></div><div><dt>Mastery XP</dt><dd>${character.masteryXp.toLocaleString()}</dd></div><div><dt>Matches</dt><dd>${character.matches}</dd></div><div><dt>Wins</dt><dd>${character.wins}</dd></div><div><dt>Best score</dt><dd>${character.bestScore.toLocaleString()}</dd></div></dl>
          <p class="career-character__mastery"><strong>NEXT REWARD</strong> ${character.nextMasteryReward ?? 'All signature rewards unlocked'}</p>
          <section class="career-character__identity">
            <div><strong>STARTING LOADOUT · ${character.loadoutName}</strong><small>${character.loadoutItems.join(' + ')}</small><p>${character.loadoutDescription}</p></div>
            <div class="career-character__ultimate"><img src="${character.ultimateIconUrl}" alt=""><span><strong>ULTIMATE · ${character.ultimateName}</strong><small>${character.ultimateDescription}</small></span></div>
          </section>
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

  private renderStadiums(stadiums: readonly CareerStadiumView[]): void {
    this.stadiumGrid.replaceChildren(
      ...stadiums.map((stadium) => {
        const article = document.createElement('article');
        article.className = 'career-stadium';
        article.innerHTML = `
          <header><h4>${stadium.name}</h4><strong>${stadium.completed} / ${stadium.target}</strong></header>
          <progress value="${stadium.completed}" max="${stadium.target}" aria-label="${stadium.name} mastery"></progress>
          <small>${stadium.matches} matches · ${stadium.wins} wins · ${stadium.goals} goals · ${stadium.kills} kills</small>
          <div class="career-stadium__cosmetics">${stadium.cosmetics
            .map(
              (cosmetic) =>
                `<button type="button" data-cosmetic-id="${cosmetic.id}" ${cosmetic.unlocked && !cosmetic.equipped ? '' : 'disabled'}>${cosmetic.equipped ? '✓ ' : cosmetic.unlocked ? '' : '🔒 '}${cosmetic.name}</button>`,
            )
            .join('')}</div>`;
        return article;
      }),
    );
  }

  private renderCodex(entries: readonly CodexEntryView[]): void {
    const categories: readonly CodexEntryView['category'][] = [
      'character',
      'weapon',
      'evolution',
      'enemy',
      'rival',
      'curse',
    ];
    this.codex.replaceChildren(
      ...categories.map((category, index) => {
        const categoryEntries = entries.filter((entry) => entry.category === category);
        const discovered = categoryEntries.filter((entry) => entry.discovered).length;
        const details = document.createElement('details');
        details.className = 'codex-group';
        details.open = index === 0;
        details.innerHTML = `<summary><span>${category.toUpperCase()}S</span><small>${discovered} / ${categoryEntries.length} DISCOVERED</small></summary><div class="codex-grid"></div>`;
        const grid = requiredElement(details, '.codex-grid');
        grid.replaceChildren(
          ...categoryEntries.map((entry) => {
            const article = document.createElement('article');
            article.className = `codex-entry${entry.discovered ? '' : ' codex-entry--unknown'}${entry.unlocked ? '' : ' codex-entry--locked'}`;
            const icon = entry.iconUrl
              ? `<img src="${entry.iconUrl}" alt="">`
              : `<span class="codex-entry__sigil" aria-hidden="true">${entry.discovered ? entry.name.slice(0, 1) : '?'}</span>`;
            article.innerHTML = `${icon}<div><strong>${entry.discovered ? entry.name : 'UNDISCOVERED'}</strong><p>${entry.discovered ? entry.description : entry.unlockHint}</p><small>${entry.unlocked ? (entry.discovered ? 'CODEX ENTRY' : entry.unlockHint) : entry.unlockHint}</small></div>`;
            return article;
          }),
        );
        return details;
      }),
    );
  }

  private readonly handleClick = (event: MouseEvent): void => {
    const previewCharacter =
      event.target instanceof Element
        ? event.target.closest<HTMLButtonElement>('[data-preview-character]')
        : null;
    if (previewCharacter) {
      const id = previewCharacter.dataset.previewCharacter;
      if (isCharacterId(id)) this.characterPreview.setCharacter(id);
      return;
    }
    const previewAnimation =
      event.target instanceof Element
        ? event.target.closest<HTMLButtonElement>('[data-preview-animation]')
        : null;
    if (previewAnimation) {
      const state = previewAnimation.dataset.previewAnimation;
      if (isCodexPreviewState(state)) this.characterPreview.play(state);
      return;
    }
    const cosmeticButton =
      event.target instanceof Element ? event.target.closest<HTMLButtonElement>('[data-cosmetic-id]') : null;
    if (cosmeticButton && !cosmeticButton.disabled) {
      const cosmeticId = cosmeticButton.dataset.cosmeticId;
      if (cosmeticId) this.store.equipCosmetic(cosmeticId);
      return;
    }
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

const ENEMY_CODEX = Object.freeze([
  ['bloodFan', 'Blood Fan', 'A relentless terrace thrall that swarms the ball carrier.'],
  ['winger', 'Night Winger', 'A fast flanker that attacks open lanes.'],
  ['defender', 'Crypt Defender', 'A durable marker built to absorb driven shots.'],
  ['coach', 'Blood Coach', 'Directs nearby attackers from behind the press.'],
  ['batSwarm', 'Bat Swarm', 'A small airborne pack with an erratic approach.'],
  ['bloodArcher', 'Blood Archer', 'A ranged threat that punishes stationary strikers.'],
  ['shadowRunner', 'Shadow Runner', 'A sudden sprinter that slips through formations.'],
  ['leechStriker', 'Leech Striker', 'A predatory forward that thrives at close range.'],
  ['corpseBomber', 'Corpse Bomber', 'An unstable attacker that threatens an area burst.'],
  ['corruptReferee', 'Corrupt Referee', 'Twists the rules and disrupts clean possession.'],
  ['goalkeeperBrute', 'Goalkeeper Brute', 'A massive last defender from the cursed box.'],
] as const);

export function createCodexViewModel(profile: Readonly<PlayerProfile>): readonly CodexEntryView[] {
  const accountLevel = accountLevelForXp(profile.accountXp);
  const seenUpgrades = new Set(profile.recentRuns.flatMap((run) => run.upgradeIds));
  const seenEvolutions = new Set(profile.recentRuns.flatMap((run) => run.evolutionIds));
  const hasPlayed = profile.lifetime.matchesPlayed > 0;
  const entries: CodexEntryView[] = CHARACTER_IDS.map((id) => ({
    id,
    name: CHARACTER_DEFINITIONS[id].name,
    description: `${CHARACTER_DEFINITIONS[id].role} · ${CHARACTER_DEFINITIONS[id].strength}`,
    category: 'character',
    unlocked: profile.unlockedCharacterIds.includes(id),
    discovered: profile.unlockedCharacterIds.includes(id),
    iconUrl: CHARACTER_PORTRAIT_URLS[id],
    unlockHint: `Unlock at account level ${CHARACTER_UNLOCK_LEVELS[id]}`,
  }));
  entries.push(
    ...UPGRADE_IDS.map((id) => {
      const unlocked = UPGRADE_UNLOCK_LEVELS[id] <= accountLevel;
      return {
        id,
        name: UPGRADE_DEFINITIONS[id].name,
        description: UPGRADE_DEFINITIONS[id].description,
        category: 'weapon' as const,
        unlocked,
        discovered: seenUpgrades.has(id),
        iconUrl: unlocked ? UPGRADE_ICON_URLS[id] : null,
        unlockHint: `Unlock at account level ${UPGRADE_UNLOCK_LEVELS[id]}`,
      };
    }),
    ...EVOLUTION_IDS.map((id) => ({
      id,
      name: EVOLUTION_DEFINITIONS[id].name,
      description: EVOLUTION_DEFINITIONS[id].description,
      category: 'evolution' as const,
      unlocked: true,
      discovered: seenEvolutions.has(id),
      iconUrl: seenEvolutions.has(id) ? EVOLUTION_ICON_URLS[id] : null,
      unlockHint: 'Combine its two component upgrades in one run',
    })),
    ...ENEMY_CODEX.map(([id, name, description]) => ({
      id,
      name,
      description,
      category: 'enemy' as const,
      unlocked: true,
      discovered: hasPlayed,
      iconUrl: ENEMY_PORTRAIT_URLS[id],
      unlockHint: 'Encounter this opponent during a match',
    })),
    ...Object.values(MINIBOSS_CONFIGS).map((definition) => ({
      id: definition.kind,
      name: definition.name,
      description: 'A named Blood League miniboss with a signature attack pattern.',
      category: 'enemy' as const,
      unlocked: true,
      discovered:
        profile.personalBests.longestSurvivalSeconds >= (definition.kind === 'crimsonCaptain' ? 205 : 345),
      iconUrl: MINIBOSS_PORTRAIT_URLS[definition.kind],
      unlockHint: `Survive to meet ${definition.name}`,
    })),
    {
      id: 'goal-line-blocker',
      name: 'The Goal-Line Blocker',
      description: 'A dedicated box guardian that tracks the ball and closes the real goal mouth.',
      category: 'enemy' as const,
      unlocked: true,
      discovered: profile.lifetime.goals > 0,
      iconUrl: FEATURED_BOSS_PORTRAIT_URLS.goalLineBlocker,
      unlockHint: 'Create a scoring opportunity during a match',
    },
    {
      id: 'count-goalkeeper',
      name: 'Count Goalkeeper',
      description: 'The final three-phase ruler of the Blood League goal.',
      category: 'enemy' as const,
      unlocked: true,
      discovered: profile.personalBests.longestSurvivalSeconds >= 480,
      iconUrl: FEATURED_BOSS_PORTRAIT_URLS.countGoalkeeper,
      unlockHint: 'Reach the final goalkeeper encounter',
    },
    ...Object.values(ELITE_MODIFIER_DEFINITIONS).map((definition) => ({
      id: definition.id,
      name: `${definition.name} Elite`,
      description: definition.description,
      category: 'enemy' as const,
      unlocked: true,
      discovered: hasPlayed,
      iconUrl: null,
      unlockHint: 'Encounter an elite during a match',
    })),
    ...Object.values(RIVAL_TEAM_DEFINITIONS).map((definition) => ({
      id: definition.id,
      name: definition.name,
      description: definition.identity,
      category: 'rival' as const,
      unlocked: true,
      discovered: hasPlayed,
      iconUrl: RIVAL_PORTRAIT_URLS[definition.id],
      unlockHint: `Kick off against ${definition.name}`,
    })),
    ...CURSE_IDS.map((id) => {
      const unlocked = CURSE_UNLOCK_LEVELS[id] <= accountLevel;
      return {
        id,
        name: CURSE_DEFINITIONS[id].name,
        description: `${CURSE_DEFINITIONS[id].benefit} / ${CURSE_DEFINITIONS[id].drawback}`,
        category: 'curse' as const,
        unlocked,
        discovered: unlocked,
        iconUrl: unlocked ? CURSE_ICON_URLS[id] : null,
        unlockHint: `Unlock at account level ${CURSE_UNLOCK_LEVELS[id]}`,
      };
    }),
  );
  return Object.freeze(entries);
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
      const loadout = startingLoadoutFor(id);
      const ultimate = CHARACTER_ULTIMATE_DEFINITIONS[id];
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
        loadoutName: loadout.name,
        loadoutDescription: loadout.description,
        loadoutItems: loadout.entries.map((entry) => UPGRADE_DEFINITIONS[entry.upgradeId].name),
        ultimateName: ultimate.name,
        ultimateDescription: ultimate.description,
        ultimateIconUrl: CHARACTER_ULTIMATE_ICON_URLS[ultimate.id],
        portraitUrl: CHARACTER_PORTRAIT_URLS[id],
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
    stadiums: PROFILE_STADIUM_IDS.map((id) => {
      const progress = profile.stadiumMastery[id];
      const challenges = challengesForStadium(id);
      return {
        id,
        name: stadiumName(id),
        matches: progress.matches,
        wins: progress.wins,
        goals: progress.goals,
        kills: progress.kills,
        completed: progress.completedChallengeIds.length,
        target: challenges.length,
        cosmetics: challenges.map((challenge) => {
          const cosmetic = STADIUM_COSMETICS[challenge.cosmeticId]!;
          return {
            id: cosmetic.id,
            name: cosmetic.name,
            unlocked: profile.unlockedCosmeticIds.includes(cosmetic.id),
            equipped: profile.equippedCosmetics[cosmetic.slot] === cosmetic.id,
          };
        }),
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

function stadiumName(id: (typeof PROFILE_STADIUM_IDS)[number]): string {
  return id
    .split('-')
    .map((part) => part[0]!.toUpperCase() + part.slice(1))
    .join(' ');
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
  return {
    ...run,
    upgradeIds: [...run.upgradeIds],
    evolutionIds: [...run.evolutionIds],
    challengeModifierIds: run.challengeModifierIds ? [...run.challengeModifierIds] : undefined,
  };
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

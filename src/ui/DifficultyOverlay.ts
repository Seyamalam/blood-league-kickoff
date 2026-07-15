import {
  CHALLENGE_MODIFIER_DEFINITIONS,
  CHALLENGE_MODIFIER_IDS,
  DIFFICULTY_DEFINITIONS,
  DIFFICULTY_IDS,
  createDifficultyRuleset,
  unlockedDifficultyIds,
  type ChallengeModifierId,
  type DifficultyId,
  type DifficultyRuleset,
} from '../game/runs';
import { uiIcon } from './icons';

export type DifficultySelectionCallback = (ruleset: Readonly<DifficultyRuleset>) => void;

/** Scroll-safe pre-run league tier and optional challenge-rules selector. */
export class DifficultyOverlay {
  private readonly element: HTMLElement;
  private readonly tierGrid: HTMLElement;
  private readonly modifierGrid: HTMLElement;
  private readonly summary: HTMLElement;
  private selectedDifficulty: DifficultyId = 'professional';
  private readonly selectedModifiers = new Set<ChallengeModifierId>();
  private accountLevel = 1;
  private callback: DifficultySelectionCallback | null = null;
  private previouslyFocused: HTMLElement | null = null;
  private open = false;

  public constructor(root: HTMLElement) {
    this.element = document.createElement('section');
    this.element.className = 'difficulty-overlay hidden';
    this.element.hidden = true;
    this.element.setAttribute('role', 'dialog');
    this.element.setAttribute('aria-modal', 'true');
    this.element.setAttribute('aria-labelledby', 'difficulty-overlay-title');
    this.element.innerHTML = `<div class="difficulty-panel">
      <header><div><p>LEAGUE RULES</p><h2 id="difficulty-overlay-title">CHOOSE THE PRESSURE</h2></div><button type="button" class="icon-button" data-action="close" aria-label="Close difficulty selection" title="Close difficulty selection">${uiIcon('close')}</button></header>
      <div class="difficulty-panel__body">
        <section><h3>DIFFICULTY TIER</h3><p>Higher leagues multiply career rewards as well as enemy pressure.</p><div class="difficulty-tiers"></div></section>
        <section><h3>CHALLENGE MODIFIERS</h3><p>Combine up to three optional rules for a larger reward multiplier.</p><div class="difficulty-modifiers"></div></section>
      </div>
      <footer><div class="difficulty-summary"></div><button type="button" data-action="start">${uiIcon('play')}<span>CONFIRM RULESET</span></button></footer>
    </div>`;
    this.tierGrid = requiredElement(this.element, '.difficulty-tiers');
    this.modifierGrid = requiredElement(this.element, '.difficulty-modifiers');
    this.summary = requiredElement(this.element, '.difficulty-summary');
    this.element.addEventListener('click', this.handleClick);
    root.append(this.element);
  }

  public get isVisible(): boolean {
    return this.open;
  }

  public show(accountLevel: number, callback: DifficultySelectionCallback): void {
    this.accountLevel = Number.isFinite(accountLevel) ? Math.max(1, Math.floor(accountLevel)) : 1;
    this.callback = callback;
    if (!unlockedDifficultyIds(this.accountLevel).includes(this.selectedDifficulty))
      this.selectedDifficulty = 'professional';
    this.render();
    this.open = true;
    this.previouslyFocused = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    this.element.hidden = false;
    this.element.classList.remove('hidden');
    window.addEventListener('keydown', this.handleKeyDown, { capture: true });
    window.requestAnimationFrame(() =>
      this.element.querySelector<HTMLButtonElement>('[data-action="close"]')?.focus(),
    );
  }

  public hide = (): void => {
    if (!this.open) return;
    this.open = false;
    this.element.hidden = true;
    this.element.classList.add('hidden');
    window.removeEventListener('keydown', this.handleKeyDown, { capture: true });
    if (this.previouslyFocused?.isConnected) this.previouslyFocused.focus();
    this.previouslyFocused = null;
  };

  public reset(): void {
    this.selectedDifficulty = 'professional';
    this.selectedModifiers.clear();
    this.hide();
  }

  public dispose(): void {
    this.hide();
    this.element.removeEventListener('click', this.handleClick);
    this.element.remove();
  }

  private render(): void {
    const view = createDifficultySelectionView(this.accountLevel, this.selectedDifficulty, [
      ...this.selectedModifiers,
    ]);
    this.tierGrid.replaceChildren(
      ...view.tiers.map((tier) => {
        const button = document.createElement('button');
        button.type = 'button';
        button.dataset.difficultyId = tier.id;
        button.disabled = !tier.unlocked;
        button.setAttribute('aria-pressed', String(tier.selected));
        button.innerHTML = `<strong>${tier.name}</strong><p>${tier.description}</p><small>${tier.unlocked ? `${tier.pressureLabel} · ${tier.rewardLabel}` : `UNLOCKS AT ACCOUNT LEVEL ${tier.unlockLevel}`}</small>`;
        return button;
      }),
    );
    this.modifierGrid.replaceChildren(
      ...view.modifiers.map((modifier) => {
        const button = document.createElement('button');
        button.type = 'button';
        button.dataset.modifierId = modifier.id;
        button.disabled = modifier.disabled;
        button.setAttribute('aria-pressed', String(modifier.selected));
        button.innerHTML = `<span>${modifier.selected ? '✓' : '+'}</span><div><strong>${modifier.name}</strong><p>${modifier.description}</p><small>${modifier.rewardLabel}</small></div>`;
        return button;
      }),
    );
    this.summary.innerHTML = `<strong>${view.rulesetName}</strong><span>${view.rewardLabel}</span>`;
  }

  private readonly handleClick = (event: MouseEvent): void => {
    const target = event.target instanceof Element ? event.target : null;
    if (target?.closest('[data-action="close"]')) return this.hide();
    if (target?.closest('[data-action="start"]')) {
      const ruleset = createDifficultyRuleset(this.selectedDifficulty, [...this.selectedModifiers]);
      this.hide();
      this.callback?.(ruleset);
      return;
    }
    const tier = target?.closest<HTMLButtonElement>('[data-difficulty-id]');
    if (tier && !tier.disabled) {
      this.selectedDifficulty = tier.dataset.difficultyId as DifficultyId;
      this.render();
      this.focusAfterRender(`[data-difficulty-id="${this.selectedDifficulty}"]`);
      return;
    }
    const modifier = target?.closest<HTMLButtonElement>('[data-modifier-id]');
    if (!modifier || modifier.disabled) return;
    const id = modifier.dataset.modifierId as ChallengeModifierId;
    if (this.selectedModifiers.has(id)) this.selectedModifiers.delete(id);
    else if (this.selectedModifiers.size < 3) this.selectedModifiers.add(id);
    this.render();
    this.focusAfterRender(`[data-modifier-id="${id}"]`);
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
    trapDialogFocus(this.element, event);
  };

  private focusAfterRender(selector: string): void {
    window.requestAnimationFrame(() => this.element.querySelector<HTMLButtonElement>(selector)?.focus());
  }
}

function trapDialogFocus(root: HTMLElement, event: KeyboardEvent): void {
  const focusable = [...root.querySelectorAll<HTMLButtonElement>('button:not(:disabled)')];
  const first = focusable[0];
  const last = focusable.at(-1);
  if (!first || !last) return;
  if (!(document.activeElement instanceof Element) || !root.contains(document.activeElement)) {
    event.preventDefault();
    first.focus();
    return;
  }
  if (event.shiftKey && document.activeElement === first) {
    event.preventDefault();
    last.focus();
  } else if (!event.shiftKey && document.activeElement === last) {
    event.preventDefault();
    first.focus();
  }
}

export function createDifficultySelectionView(
  accountLevel: number,
  selectedDifficulty: DifficultyId = 'professional',
  selectedModifierIds: readonly ChallengeModifierId[] = [],
) {
  const unlocked = new Set(unlockedDifficultyIds(accountLevel));
  const selectedModifiers = new Set(selectedModifierIds);
  const atCap = selectedModifiers.size >= 3;
  const ruleset = createDifficultyRuleset(selectedDifficulty, [...selectedModifiers]);
  return Object.freeze({
    tiers: DIFFICULTY_IDS.map((id) => {
      const definition = DIFFICULTY_DEFINITIONS[id];
      return Object.freeze({
        id,
        name: definition.name,
        description: definition.description,
        unlockLevel: definition.unlockAccountLevel,
        unlocked: unlocked.has(id),
        selected: id === selectedDifficulty,
        pressureLabel: `${Math.round(definition.enemyHealthMultiplier * 100)}% ENEMY VITALITY`,
        rewardLabel: `${Math.round(definition.rewardMultiplier * 100)}% REWARDS`,
      });
    }),
    modifiers: CHALLENGE_MODIFIER_IDS.map((id) => {
      const definition = CHALLENGE_MODIFIER_DEFINITIONS[id];
      const selected = selectedModifiers.has(id);
      return Object.freeze({
        id,
        name: definition.name,
        description: definition.description,
        selected,
        disabled: !selected && atCap,
        rewardLabel: `+${Math.round((definition.rewardMultiplier - 1) * 100)}% REWARDS`,
      });
    }),
    rulesetName: `${DIFFICULTY_DEFINITIONS[selectedDifficulty].name.toUpperCase()}${selectedModifiers.size ? ` + ${selectedModifiers.size} MODIFIER${selectedModifiers.size === 1 ? '' : 'S'}` : ''}`,
    rewardLabel: `${Math.round(ruleset.rewardMultiplier * 100)}% CAREER REWARDS`,
  });
}

function requiredElement(root: ParentNode, selector: string): HTMLElement {
  const element = root.querySelector<HTMLElement>(selector);
  if (!element) throw new Error(`Missing difficulty element ${selector}`);
  return element;
}

import type { ProgressionState, UpgradeId } from '../game/progression';
import { EVOLUTION_DEFINITIONS, EVOLUTION_IDS, UPGRADE_DEFINITIONS } from '../game/progression';
import { UPGRADE_ICON_URLS } from './progressionIcons';

export type UpgradeSelectionCallback = (upgradeId: UpgradeId) => void;

/**
 * Accessible modal for selecting one progression upgrade.
 *
 * `show()` supports either a callback, its returned Promise, or both. A selection
 * resolves with its ID; calling `hide()`, `reset()`, or replacing an open offer
 * resolves the outstanding Promise with `null` and does not call the callback.
 */
export class UpgradeOverlay {
  private readonly element: HTMLElement;
  private readonly choicesElement: HTMLElement;
  private readonly levelElement: HTMLElement;
  private callback: UpgradeSelectionCallback | null = null;
  private resolveSelection: ((upgradeId: UpgradeId | null) => void) | null = null;
  private offeredIds: UpgradeId[] = [];
  private previouslyFocused: HTMLElement | null = null;
  private open = false;

  public constructor(root: HTMLElement) {
    this.element = document.createElement('section');
    this.element.className = 'upgrade-overlay hidden';
    this.element.hidden = true;
    this.element.setAttribute('role', 'dialog');
    this.element.setAttribute('aria-modal', 'true');
    this.element.setAttribute('aria-labelledby', 'upgrade-overlay-title');
    this.element.setAttribute('aria-describedby', 'upgrade-overlay-description');

    const eyebrow = document.createElement('p');
    eyebrow.className = 'upgrade-overlay__eyebrow';
    eyebrow.textContent = 'BLOOD AWAKENING';

    const title = document.createElement('h2');
    title.id = 'upgrade-overlay-title';
    title.textContent = 'CHOOSE YOUR POWER';

    const description = document.createElement('p');
    description.id = 'upgrade-overlay-description';
    description.className = 'upgrade-overlay__description';
    description.textContent = 'The match is paused. Select one upgrade to continue.';

    this.levelElement = document.createElement('p');
    this.levelElement.className = 'upgrade-overlay__level';

    this.choicesElement = document.createElement('div');
    this.choicesElement.className = 'upgrade-overlay__choices';
    this.choicesElement.setAttribute('role', 'group');
    this.choicesElement.setAttribute('aria-label', 'Available upgrades');

    const hint = document.createElement('p');
    hint.className = 'upgrade-overlay__hint';
    hint.textContent = 'Press 1, 2, or 3 to choose';

    this.element.append(eyebrow, title, description, this.levelElement, this.choicesElement, hint);
    this.choicesElement.addEventListener('click', this.handleClick);
    root.append(this.element);
  }

  public get isVisible(): boolean {
    return this.open;
  }

  /** Renders a one-to-three choice offer and focuses its first card. */
  public show(
    choices: readonly UpgradeId[],
    state: Readonly<ProgressionState>,
    onSelect?: UpgradeSelectionCallback,
  ): Promise<UpgradeId | null> {
    const uniqueChoices = [...new Set(choices)];
    if (uniqueChoices.length === 0 || uniqueChoices.length > 3 || uniqueChoices.length !== choices.length) {
      throw new Error('UpgradeOverlay requires one to three unique upgrade choices.');
    }

    if (this.open) this.hide();
    this.offeredIds = uniqueChoices;
    this.callback = onSelect ?? null;
    this.previouslyFocused = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    this.levelElement.textContent = `LEVEL ${state.level} · ${state.pendingLevelUps} CHOICE${state.pendingLevelUps === 1 ? '' : 'S'} READY`;
    this.renderChoices(state);
    this.open = true;
    this.element.hidden = false;
    this.element.classList.remove('hidden');
    window.addEventListener('keydown', this.handleKeyDown, { capture: true });

    window.requestAnimationFrame(() => {
      if (!this.open) return;
      this.choicesElement.querySelector<HTMLButtonElement>('button')?.focus();
    });

    return new Promise<UpgradeId | null>((resolve) => {
      this.resolveSelection = resolve;
    });
  }

  /** Closes without selecting and resolves an outstanding `show()` with null. */
  public hide(): void {
    if (!this.open && !this.resolveSelection) return;
    this.close(null);
  }

  /** Clears the current offer and returns the overlay to its initial hidden state. */
  public reset(): void {
    this.hide();
    this.choicesElement.replaceChildren();
    this.offeredIds = [];
    this.callback = null;
  }

  /** Releases DOM/event resources. The instance must not be reused afterward. */
  public dispose(): void {
    this.reset();
    this.choicesElement.removeEventListener('click', this.handleClick);
    this.element.remove();
  }

  private renderChoices(state: Readonly<ProgressionState>): void {
    const cards = this.offeredIds.map((upgradeId, index) => {
      const presentation = getUpgradeCardPresentation(upgradeId, index, state);
      const button = document.createElement('button');
      button.type = 'button';
      button.className = 'upgrade-card';
      button.dataset.upgradeId = upgradeId;
      button.setAttribute('aria-label', presentation.ariaLabel);

      const number = document.createElement('span');
      number.className = 'upgrade-card__number';
      number.setAttribute('aria-hidden', 'true');
      number.textContent = String(index + 1);

      const icon = document.createElement('span');
      icon.className = `upgrade-card__icon upgrade-card__icon--${upgradeId}`;
      icon.setAttribute('aria-hidden', 'true');
      const iconImage = document.createElement('img');
      iconImage.src = presentation.iconUrl;
      iconImage.alt = '';
      iconImage.draggable = false;
      iconImage.decoding = 'async';
      icon.append(iconImage);

      const name = document.createElement('strong');
      name.className = 'upgrade-card__name';
      name.textContent = presentation.name;

      const description = document.createElement('span');
      description.className = 'upgrade-card__description';
      description.textContent = presentation.description;

      const stack = document.createElement('span');
      stack.className = 'upgrade-card__stack';
      stack.textContent = presentation.stackLabel;

      const evolutionHint = document.createElement('span');
      evolutionHint.className = 'upgrade-card__evolution';
      evolutionHint.textContent = presentation.evolutionHint ?? '';
      evolutionHint.hidden = presentation.evolutionHint === null;

      button.append(number, icon, name, description, evolutionHint, stack);
      return button;
    });
    this.choicesElement.dataset.choiceCount = String(cards.length);
    this.choicesElement.replaceChildren(...cards);
  }

  private readonly handleClick = (event: MouseEvent): void => {
    const target =
      event.target instanceof Element
        ? event.target.closest<HTMLButtonElement>('button[data-upgrade-id]')
        : null;
    if (!target || !this.choicesElement.contains(target)) return;
    const upgradeId = target.dataset.upgradeId as UpgradeId | undefined;
    if (upgradeId && this.offeredIds.includes(upgradeId)) this.select(upgradeId);
  };

  private readonly handleKeyDown = (event: KeyboardEvent): void => {
    if (!this.open || event.repeat) return;
    if (event.key === 'Tab') {
      this.trapFocus(event);
      return;
    }
    const choiceIndex = keyboardChoiceIndex(event);
    if (choiceIndex === null) return;
    const upgradeId = this.offeredIds[choiceIndex];
    if (!upgradeId) return;
    event.preventDefault();
    event.stopPropagation();
    this.select(upgradeId);
  };

  private trapFocus(event: KeyboardEvent): void {
    const buttons = [...this.choicesElement.querySelectorAll<HTMLButtonElement>('button')];
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
  }

  private select(upgradeId: UpgradeId): void {
    if (!this.open) return;
    const callback = this.callback;
    this.close(upgradeId);
    callback?.(upgradeId);
  }

  private close(result: UpgradeId | null): void {
    this.open = false;
    window.removeEventListener('keydown', this.handleKeyDown, { capture: true });
    this.element.classList.add('hidden');
    this.element.hidden = true;
    const resolve = this.resolveSelection;
    this.resolveSelection = null;
    this.callback = null;
    resolve?.(result);
    if (this.previouslyFocused?.isConnected) this.previouslyFocused.focus();
    this.previouslyFocused = null;
  }
}

function keyboardChoiceIndex(event: KeyboardEvent): number | null {
  if (event.key === '1' || event.code === 'Numpad1') return 0;
  if (event.key === '2' || event.code === 'Numpad2') return 1;
  if (event.key === '3' || event.code === 'Numpad3') return 2;
  return null;
}

export function getUpgradeCardPresentation(
  upgradeId: UpgradeId,
  index: number,
  state: Pick<ProgressionState, 'upgradeStacks'>,
): Readonly<{
  ariaLabel: string;
  description: string;
  iconUrl: string;
  name: string;
  stackLabel: string;
  evolutionHint: string | null;
}> {
  const definition = UPGRADE_DEFINITIONS[upgradeId];
  const currentStack = state.upgradeStacks[upgradeId];
  const nextStack = Math.min(currentStack + 1, definition.maxStacks);
  const evolution = EVOLUTION_IDS.map((evolutionId) => EVOLUTION_DEFINITIONS[evolutionId]).find((candidate) =>
    candidate.requirements.some((requirement) => requirement.upgradeId === upgradeId),
  );
  const partner = evolution?.requirements.find((requirement) => requirement.upgradeId !== upgradeId);
  const evolutionHint =
    evolution && partner
      ? `EVOLVES WITH ${UPGRADE_DEFINITIONS[partner.upgradeId].name} → ${evolution.name}`
      : null;
  return {
    ariaLabel: `${index + 1}. ${definition.name}. ${definition.description} ${
      evolutionHint ? `${evolutionHint}. ` : ''
    }Stack ${currentStack} to ${nextStack} of ${definition.maxStacks}.`,
    description: definition.description,
    iconUrl: UPGRADE_ICON_URLS[upgradeId],
    name: definition.name,
    stackLabel: `STACK ${currentStack} → ${nextStack} / ${definition.maxStacks}`,
    evolutionHint,
  };
}

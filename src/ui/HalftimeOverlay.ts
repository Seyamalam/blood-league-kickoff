import type { HalftimeChoice } from '../game/match';

export type HalftimeChoiceCallback = (choice: HalftimeChoice) => void;

interface HalftimeChoiceDefinition {
  id: HalftimeChoice;
  title: string;
  tag: string;
  description: string;
  glyph: string;
}

const CHOICES: readonly HalftimeChoiceDefinition[] = [
  {
    id: 'power',
    title: 'Power',
    tag: 'BREAK THE LINE',
    description: 'Ball damage +25% and kick force +15% for the second half.',
    glyph: '✹',
  },
  {
    id: 'pace',
    title: 'Pace',
    tag: 'OUTRUN THE NIGHT',
    description: 'Movement speed +15% and dash cooldown reduced by 20%.',
    glyph: '»',
  },
  {
    id: 'control',
    title: 'Control',
    tag: 'OWN THE BALL',
    description: 'Recall speed +25% and the perfect-volley catch window expands.',
    glyph: '◎',
  },
] as const;

/**
 * Interactive halftime decision modal.
 *
 * `show()` resolves to the selected choice, or `null` when hidden/reset before a
 * selection. The match director remains responsible for applying its timed
 * default; call `updateCountdown()` from the UI update path.
 */
export class HalftimeOverlay {
  private readonly element: HTMLElement;
  private readonly choicesElement: HTMLElement;
  private readonly countdownElement: HTMLElement;
  private readonly buttons: HTMLButtonElement[];
  private callback: HalftimeChoiceCallback | null = null;
  private resolveSelection: ((choice: HalftimeChoice | null) => void) | null = null;
  private previouslyFocused: HTMLElement | null = null;
  private open = false;

  public constructor(root: HTMLElement) {
    this.element = document.createElement('section');
    this.element.className = 'halftime-overlay hidden';
    this.element.hidden = true;
    this.element.setAttribute('role', 'dialog');
    this.element.setAttribute('aria-modal', 'true');
    this.element.setAttribute('aria-labelledby', 'halftime-overlay-title');
    this.element.setAttribute('aria-describedby', 'halftime-overlay-description');

    const eyebrow = document.createElement('p');
    eyebrow.className = 'halftime-overlay__eyebrow';
    eyebrow.textContent = 'HALFTIME · BLOOD MOON RISING';

    const title = document.createElement('h2');
    title.id = 'halftime-overlay-title';
    title.textContent = 'CHOOSE YOUR TACTIC';

    const description = document.createElement('p');
    description.id = 'halftime-overlay-description';
    description.className = 'halftime-overlay__description';
    description.textContent = 'One decision shapes the rest of the match.';

    this.countdownElement = document.createElement('p');
    this.countdownElement.className = 'halftime-overlay__countdown';
    this.countdownElement.setAttribute('role', 'timer');
    this.countdownElement.setAttribute('aria-live', 'polite');
    this.countdownElement.setAttribute('aria-atomic', 'true');

    this.choicesElement = document.createElement('div');
    this.choicesElement.className = 'halftime-overlay__choices';
    this.choicesElement.setAttribute('role', 'group');
    this.choicesElement.setAttribute('aria-label', 'Halftime tactics');
    this.buttons = CHOICES.map((definition, index) => createChoiceButton(definition, index));
    this.choicesElement.append(...this.buttons);

    const hint = document.createElement('p');
    hint.className = 'halftime-overlay__hint';
    hint.textContent = 'Press 1, 2, or 3 to choose';

    this.element.append(eyebrow, title, description, this.countdownElement, this.choicesElement, hint);
    this.choicesElement.addEventListener('click', this.handleClick);
    root.append(this.element);
    this.updateCountdown(0);
  }

  public get isVisible(): boolean {
    return this.open;
  }

  /** Opens halftime and optionally reports the selected tactic through a callback. */
  public show(countdownSeconds = 15, onSelect?: HalftimeChoiceCallback): Promise<HalftimeChoice | null> {
    if (this.open) this.hide();
    this.callback = onSelect ?? null;
    this.previouslyFocused = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    this.updateCountdown(countdownSeconds);
    this.open = true;
    this.element.hidden = false;
    this.element.classList.remove('hidden');
    window.addEventListener('keydown', this.handleKeyDown, { capture: true });
    window.requestAnimationFrame(() => {
      if (this.open) this.buttons[0]?.focus();
    });
    return new Promise<HalftimeChoice | null>((resolve) => {
      this.resolveSelection = resolve;
    });
  }

  /** Updates the visible automatic-choice timer without changing modal state. */
  public updateCountdown(secondsRemaining: number): void {
    const seconds = Number.isFinite(secondsRemaining) ? Math.max(0, secondsRemaining) : 0;
    const rounded = Math.ceil(seconds);
    this.countdownElement.textContent = rounded > 0 ? `AUTO CHOICE IN ${rounded}s` : 'AUTO CHOICE NOW';
    this.countdownElement.classList.toggle('halftime-overlay__countdown--urgent', seconds <= 3);
  }

  /** Closes without choosing and resolves an outstanding `show()` with null. */
  public hide(): void {
    if (!this.open && !this.resolveSelection) return;
    this.close(null);
  }

  public reset(): void {
    this.hide();
    this.callback = null;
    this.updateCountdown(0);
  }

  public dispose(): void {
    this.reset();
    this.choicesElement.removeEventListener('click', this.handleClick);
    this.element.remove();
  }

  private readonly handleClick = (event: MouseEvent): void => {
    const button =
      event.target instanceof Element
        ? event.target.closest<HTMLButtonElement>('button[data-halftime-choice]')
        : null;
    if (!button || !this.choicesElement.contains(button)) return;
    const choice = button.dataset.halftimeChoice as HalftimeChoice | undefined;
    if (choice && isHalftimeChoice(choice)) this.select(choice);
  };

  private readonly handleKeyDown = (event: KeyboardEvent): void => {
    if (!this.open || event.repeat) return;
    if (event.key === 'Tab') {
      this.trapFocus(event);
      return;
    }
    const index = choiceIndexForKey(event);
    if (index === null) return;
    const choice = CHOICES[index]?.id;
    if (!choice) return;
    event.preventDefault();
    event.stopPropagation();
    this.select(choice);
  };

  private trapFocus(event: KeyboardEvent): void {
    const first = this.buttons[0];
    const last = this.buttons.at(-1);
    if (!first || !last) return;
    if (event.shiftKey && document.activeElement === first) {
      event.preventDefault();
      last.focus();
    } else if (!event.shiftKey && document.activeElement === last) {
      event.preventDefault();
      first.focus();
    }
  }

  private select(choice: HalftimeChoice): void {
    if (!this.open) return;
    const callback = this.callback;
    this.close(choice);
    callback?.(choice);
  }

  private close(result: HalftimeChoice | null): void {
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

function createChoiceButton(definition: HalftimeChoiceDefinition, index: number): HTMLButtonElement {
  const button = document.createElement('button');
  button.type = 'button';
  button.className = `halftime-choice halftime-choice--${definition.id}`;
  button.dataset.halftimeChoice = definition.id;
  button.setAttribute('aria-label', `${index + 1}. ${definition.title}. ${definition.description}`);

  const number = document.createElement('span');
  number.className = 'halftime-choice__number';
  number.setAttribute('aria-hidden', 'true');
  number.textContent = String(index + 1);
  const glyph = document.createElement('span');
  glyph.className = 'halftime-choice__glyph';
  glyph.setAttribute('aria-hidden', 'true');
  glyph.textContent = definition.glyph;
  const tag = document.createElement('small');
  tag.textContent = definition.tag;
  const name = document.createElement('strong');
  name.textContent = definition.title;
  const description = document.createElement('span');
  description.className = 'halftime-choice__description';
  description.textContent = definition.description;
  button.append(number, glyph, tag, name, description);
  return button;
}

function choiceIndexForKey(event: KeyboardEvent): number | null {
  if (event.key === '1' || event.code === 'Numpad1') return 0;
  if (event.key === '2' || event.code === 'Numpad2') return 1;
  if (event.key === '3' || event.code === 'Numpad3') return 2;
  return null;
}

function isHalftimeChoice(value: string): value is HalftimeChoice {
  return value === 'power' || value === 'pace' || value === 'control';
}

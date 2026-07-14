import { CURSE_DEFINITIONS, CURSE_IDS, type CurseId } from '../game/progression';
import { CURSE_ICON_URLS } from './progressionIcons';
import { uiIcon } from './icons';
import { CURSE_UNLOCK_LEVELS } from '../profile';

export type CurseSelectionCallback = (curseIds: readonly CurseId[]) => void;

/** Scroll-safe pre-run contract selector. Players may combine up to three curses. */
export class CurseOverlay {
  private readonly element: HTMLElement;
  private readonly list: HTMLElement;
  private readonly count: HTMLElement;
  private readonly startButton: HTMLButtonElement;
  private readonly closeButton: HTMLButtonElement;
  private readonly selected = new Set<CurseId>();
  private available = new Set<CurseId>(CURSE_IDS);
  private callback: CurseSelectionCallback | null = null;
  private open = false;

  constructor(root: HTMLElement) {
    this.element = document.createElement('section');
    this.element.className = 'curse-overlay hidden';
    this.element.hidden = true;
    this.element.setAttribute('role', 'dialog');
    this.element.setAttribute('aria-modal', 'true');
    this.element.setAttribute('aria-labelledby', 'curse-overlay-title');
    this.element.innerHTML = `
      <div class="curse-panel">
        <header><div><p>OPTIONAL RUN CONTRACTS</p><h2 id="curse-overlay-title">CHOOSE YOUR CURSE</h2></div><button type="button" class="icon-button" data-action="close" aria-label="Close curse selection">${uiIcon('close')}</button></header>
        <div class="curse-panel__intro"><p>Combine up to three benefits and drawbacks. Greater danger produces a greater career reward.</p><strong>0 / 3 SELECTED</strong></div>
        <div class="curse-grid"></div>
        <footer><button type="button" data-action="start">${uiIcon('play')}<span>BEGIN CURSED RUN</span></button></footer>
      </div>`;
    this.list = requiredElement(this.element, '.curse-grid');
    this.count = requiredElement(this.element, '.curse-panel__intro strong');
    this.startButton = requiredButton(this.element, '[data-action="start"]');
    this.closeButton = requiredButton(this.element, '[data-action="close"]');
    this.render();
    this.refreshSelection();
    this.element.addEventListener('click', this.handleClick);
    root.append(this.element);
  }

  get isVisible(): boolean {
    return this.open;
  }

  show(callback: CurseSelectionCallback, availableCurseIds: readonly CurseId[] = CURSE_IDS): void {
    this.callback = callback;
    this.available = new Set(availableCurseIds);
    for (const curseId of this.selected) if (!this.available.has(curseId)) this.selected.delete(curseId);
    this.render();
    this.refreshSelection();
    this.open = true;
    this.element.hidden = false;
    this.element.classList.remove('hidden');
    window.addEventListener('keydown', this.handleKeyDown, { capture: true });
    window.requestAnimationFrame(() => this.closeButton.focus());
  }

  hide(): void {
    if (!this.open) return;
    this.open = false;
    this.element.hidden = true;
    this.element.classList.add('hidden');
    window.removeEventListener('keydown', this.handleKeyDown, { capture: true });
  }

  reset(): void {
    this.selected.clear();
    this.refreshSelection();
    this.hide();
  }

  dispose(): void {
    this.hide();
    this.element.removeEventListener('click', this.handleClick);
    this.element.remove();
  }

  private render(): void {
    this.list.replaceChildren(
      ...CURSE_IDS.map((curseId) => {
        const unlocked = this.available.has(curseId);
        const presentation = getCurseCardPresentation(curseId, this.selected, unlocked);
        const button = document.createElement('button');
        button.type = 'button';
        button.className = 'curse-card';
        button.dataset.curseId = curseId;
        button.setAttribute('aria-pressed', String(presentation.selected));
        button.setAttribute('aria-label', presentation.ariaLabel);
        button.disabled = presentation.disabled;
        button.classList.toggle('curse-card--locked', !unlocked);
        button.innerHTML = `<img src="${presentation.iconUrl}" alt=""><span><small>${unlocked ? 'CURSE CONTRACT' : `UNLOCKS AT ACCOUNT LEVEL ${CURSE_UNLOCK_LEVELS[curseId]}`}</small><strong>${presentation.name}</strong></span><p>${presentation.description}</p><dl><div><dt>BENEFIT</dt><dd>${presentation.benefit}</dd></div><div><dt>DRAWBACK</dt><dd>${presentation.drawback}</dd></div></dl><small class="curse-card__reward">${unlocked ? presentation.rewardLabel : 'LOCKED CONTRACT'}</small>`;
        return button;
      }),
    );
  }

  private refreshSelection(): void {
    for (const button of this.list.querySelectorAll<HTMLButtonElement>('[data-curse-id]')) {
      const selected = this.selected.has(button.dataset.curseId as CurseId);
      button.classList.toggle('curse-card--selected', selected);
      button.setAttribute('aria-pressed', String(selected));
      const curseId = button.dataset.curseId as CurseId;
      button.disabled = !this.available.has(curseId) || (!selected && this.selected.size >= 3);
    }
    this.count.textContent = `${this.selected.size} / 3 SELECTED`;
    this.startButton.disabled = this.selected.size === 0;
  }

  private readonly handleClick = (event: MouseEvent): void => {
    const target = event.target instanceof Element ? event.target : null;
    if (target?.closest('[data-action="close"]')) {
      this.hide();
      return;
    }
    if (target?.closest('[data-action="start"]')) {
      if (this.selected.size === 0) return;
      const selection = CURSE_IDS.filter((curseId) => this.selected.has(curseId));
      this.hide();
      this.callback?.(selection);
      return;
    }
    const card = target?.closest<HTMLButtonElement>('[data-curse-id]');
    if (!card || card.disabled) return;
    const curseId = card.dataset.curseId as CurseId;
    if (this.selected.has(curseId)) this.selected.delete(curseId);
    else if (this.selected.size < 3) this.selected.add(curseId);
    this.refreshSelection();
  };

  private readonly handleKeyDown = (event: KeyboardEvent): void => {
    if (event.key !== 'Escape') return;
    event.preventDefault();
    this.hide();
  };
}

/** Pure card model shared by rendering and tests, including the three-contract selection cap. */
export function getCurseCardPresentation(
  curseId: CurseId,
  selectedIds: ReadonlySet<CurseId> | readonly CurseId[] = [],
  unlocked = true,
): Readonly<{
  iconUrl: string;
  name: string;
  description: string;
  benefit: string;
  drawback: string;
  rewardLabel: string;
  selected: boolean;
  disabled: boolean;
  ariaLabel: string;
}> {
  const curse = CURSE_DEFINITIONS[curseId];
  const selectedSet = new Set(selectedIds);
  const selected = selectedSet.has(curseId);
  const disabled = !unlocked || (!selected && selectedSet.size >= 3);
  const rewardPercent = Math.round(((curse.directorModifiers.rewardMultiplier ?? 1) - 1) * 100);
  const rewardLabel = `+${rewardPercent}% CAREER REWARDS`;
  return Object.freeze({
    iconUrl: CURSE_ICON_URLS[curseId],
    name: curse.name,
    description: curse.description,
    benefit: curse.benefit,
    drawback: curse.drawback,
    rewardLabel,
    selected,
    disabled,
    ariaLabel: `${curse.name}. Benefit: ${curse.benefit} Drawback: ${curse.drawback} ${rewardLabel}.`,
  });
}

function requiredElement(root: ParentNode, selector: string): HTMLElement {
  const element = root.querySelector<HTMLElement>(selector);
  if (!element) throw new Error(`Missing curse overlay element ${selector}`);
  return element;
}

function requiredButton(root: ParentNode, selector: string): HTMLButtonElement {
  const button = root.querySelector<HTMLButtonElement>(selector);
  if (!button) throw new Error(`Missing curse overlay button ${selector}`);
  return button;
}

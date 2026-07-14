import type { EvolutionId, EvolutionUnlockEvent } from '../game/progression';
import { EVOLUTION_ICON_URLS } from './progressionIcons';

const DEFAULT_DURATION = 2.8;

export interface EvolutionToastView {
  readonly iconUrl: string;
  readonly name: string;
  readonly description: string;
}

/** Converts a gameplay unlock event into the complete, accessible presentation model. */
export function createEvolutionToastView(event: Readonly<EvolutionUnlockEvent>): EvolutionToastView {
  return Object.freeze({
    iconUrl: EVOLUTION_ICON_URLS[event.evolutionId],
    name: event.definition.name,
    description: event.definition.description,
  });
}

/** Pointer-transparent queued evolution announcement that remains visible above upgrade choices. */
export class EvolutionToast {
  private readonly element: HTMLElement;
  private readonly icon: HTMLImageElement;
  private readonly name: HTMLElement;
  private readonly description: HTMLElement;
  private readonly queue: EvolutionUnlockEvent[] = [];
  private age = 0;
  private active = false;
  private disposed = false;
  private currentId: EvolutionId | null = null;

  public constructor(root: HTMLElement) {
    this.element = document.createElement('section');
    this.element.className = 'evolution-toast hidden';
    this.element.hidden = true;
    this.element.setAttribute('role', 'status');
    this.element.setAttribute('aria-live', 'assertive');
    this.element.setAttribute('aria-atomic', 'true');

    this.icon = document.createElement('img');
    this.icon.className = 'evolution-toast__icon';
    this.icon.alt = '';
    this.icon.draggable = false;
    this.icon.setAttribute('aria-hidden', 'true');

    const copy = document.createElement('div');
    copy.className = 'evolution-toast__copy';

    const eyebrow = document.createElement('span');
    eyebrow.className = 'evolution-toast__eyebrow';
    eyebrow.textContent = 'EVOLUTION UNLOCKED';

    this.name = document.createElement('strong');
    this.name.className = 'evolution-toast__name';

    this.description = document.createElement('span');
    this.description.className = 'evolution-toast__description';

    copy.append(eyebrow, this.name, this.description);
    this.element.append(this.icon, copy);
    root.append(this.element);
  }

  public get isVisible(): boolean {
    return this.active;
  }

  public get currentEvolutionId(): EvolutionId | null {
    return this.currentId;
  }

  public get currentName(): string | null {
    return this.active ? this.name.textContent : null;
  }

  public enqueue(events: readonly EvolutionUnlockEvent[]): void {
    if (this.disposed || events.length === 0) return;
    this.queue.push(...events);
    if (!this.active) this.showNext();
  }

  public update(dt: number): void {
    if (!this.active || this.disposed) return;
    const step = Number.isFinite(dt) ? Math.max(0, Math.min(0.1, dt)) : 0;
    this.age += step;
    this.element.style.setProperty('--evolution-progress', String(Math.min(1, this.age / DEFAULT_DURATION)));
    if (this.age < DEFAULT_DURATION) return;
    this.hide();
    this.showNext();
  }

  public reset(): void {
    if (this.disposed) return;
    this.queue.length = 0;
    this.hide();
    this.name.textContent = '';
    this.description.textContent = '';
    this.icon.removeAttribute('src');
    this.currentId = null;
  }

  public dispose(): void {
    if (this.disposed) return;
    this.reset();
    this.element.remove();
    this.disposed = true;
  }

  private showNext(): void {
    const event = this.queue.shift();
    if (!event) return;
    const view = createEvolutionToastView(event);
    this.currentId = event.evolutionId;
    this.icon.src = view.iconUrl;
    this.name.textContent = view.name;
    this.description.textContent = view.description;
    this.age = 0;
    this.active = true;
    this.element.hidden = false;
    this.element.classList.remove('hidden');
    this.element.style.setProperty('--evolution-progress', '0');
  }

  private hide(): void {
    this.active = false;
    this.age = 0;
    this.element.classList.add('hidden');
    this.element.hidden = true;
    this.element.style.setProperty('--evolution-progress', '0');
    this.currentId = null;
  }
}

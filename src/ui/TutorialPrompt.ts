import { getActiveTutorialPrompt, type TutorialState } from '../game/tutorial';

/** Accessible, non-modal first-run lesson presentation. */
export class TutorialPrompt {
  private readonly element: HTMLElement;
  private readonly control: HTMLElement;
  private readonly title: HTMLElement;
  private readonly description: HTMLElement;
  private readonly progress: HTMLElement;
  private visiblePromptId: string | null = null;

  public constructor(root: HTMLElement) {
    this.element = document.createElement('aside');
    this.element.className = 'tutorial-prompt hidden';
    this.element.hidden = true;
    this.element.setAttribute('role', 'status');
    this.element.setAttribute('aria-live', 'polite');
    this.element.setAttribute('aria-atomic', 'true');

    this.control = document.createElement('kbd');
    this.control.className = 'tutorial-prompt__control';
    const content = document.createElement('div');
    content.className = 'tutorial-prompt__content';
    this.title = document.createElement('strong');
    this.description = document.createElement('span');
    content.append(this.title, this.description);
    this.progress = document.createElement('small');
    this.progress.className = 'tutorial-prompt__progress';
    this.element.append(this.control, content, this.progress);
    root.append(this.element);
  }

  /** Renders the earliest incomplete lesson or hides after tutorial completion. */
  public update(state: Readonly<TutorialState>): void {
    const prompt = getActiveTutorialPrompt(state);
    if (!prompt) {
      this.hide();
      return;
    }
    if (this.visiblePromptId !== prompt.id) {
      this.control.textContent = prompt.control;
      this.title.textContent = prompt.title;
      this.description.textContent = prompt.description;
      this.progress.textContent = `${prompt.stepNumber} / ${prompt.totalSteps}`;
      this.visiblePromptId = prompt.id;
    }
    this.element.hidden = false;
    this.element.classList.remove('hidden');
  }

  public hide(): void {
    this.element.classList.add('hidden');
    this.element.hidden = true;
    this.visiblePromptId = null;
  }

  public reset(): void {
    this.hide();
    this.control.textContent = '';
    this.title.textContent = '';
    this.description.textContent = '';
    this.progress.textContent = '';
  }

  public dispose(): void {
    this.element.remove();
  }
}

import type { GameState } from '../game/simulation/types';

export class Hud {
  private readonly healthFill: HTMLElement;
  private readonly healthValue: HTMLElement;
  private readonly timer: HTMLElement;
  private readonly score: HTMLElement;
  private readonly enemies: HTMLElement;
  private readonly ball: HTMLElement;
  private readonly fps: HTMLElement;
  private readonly splash: HTMLElement;
  private readonly death: HTMLElement;
  private readonly combo: HTMLElement;
  private readonly hint: HTMLElement;

  constructor(root: HTMLElement) {
    root.insertAdjacentHTML('beforeend', `
      <div class="vignette"></div>
      <div class="hud" aria-live="polite">
        <header class="topbar">
          <div class="brand"><span class="brand-kicker">BLOOD LEAGUE</span><strong>KICKOFF</strong></div>
          <div class="timer"><small>SURVIVAL</small><span id="timer">00:00</span></div>
          <div class="score"><small>SCORE</small><span id="score">000000</span></div>
        </header>
        <div class="status-panel">
          <div class="status-label"><span>VITALITY</span><span id="health-value">100</span></div>
          <div class="health-track"><div id="health-fill" class="health-fill"></div></div>
          <div class="status-row"><span><i class="dot crimson"></i><b id="enemies">0</b> HOSTILES</span><span id="ball-status">BALL READY</span></div>
        </div>
        <div class="crosshair"><span></span><span></span><span></span><span></span></div>
        <div id="combo" class="combo"></div>
        <div id="controls-hint" class="controls-hint"><b>WASD</b> MOVE <b>MOUSE</b> AIM <b>LMB</b> KICK <b>RMB / E</b> RECALL</div>
        <div class="perf"><span id="fps">-- FPS</span><span>WEBGL 2</span></div>
      </div>
      <section id="splash" class="modal splash">
        <div class="crest">BL</div>
        <p class="eyebrow">THE FINAL MATCH BEGINS</p>
        <h1>BLOOD LEAGUE<br><em>KICKOFF</em></h1>
        <p>Survive the cursed stadium. Your ball is your weapon.<br>Kick it hard. Call it home.</p>
        <button type="button" id="kickoff-button">ENTER THE PITCH</button>
        <small>Click to lock the cursor · Headphones recommended</small>
      </section>
      <section id="death" class="modal death hidden">
        <p class="eyebrow">FULL TIME</p>
        <h2>THE NIGHT<br>CLAIMS ANOTHER</h2>
        <p id="final-score"></p>
        <button type="button" id="restart-button">KICK OFF AGAIN</button>
        <small>or press R</small>
      </section>
    `);
    this.healthFill = required('health-fill');
    this.healthValue = required('health-value');
    this.timer = required('timer');
    this.score = required('score');
    this.enemies = required('enemies');
    this.ball = required('ball-status');
    this.fps = required('fps');
    this.splash = required('splash');
    this.death = required('death');
    this.combo = required('combo');
    this.hint = required('controls-hint');
  }

  get kickoffButton(): HTMLElement {
    return required('kickoff-button');
  }

  get restartButton(): HTMLElement {
    return required('restart-button');
  }

  update(state: GameState, possessed: boolean, fps: number): void {
    const health = state.player.health;
    this.healthFill.style.width = `${health}%`;
    this.healthValue.textContent = String(Math.ceil(health));
    this.timer.textContent = formatTime(state.elapsed);
    this.score.textContent = state.score.toString().padStart(6, '0');
    this.enemies.textContent = String(state.enemies.length);
    this.ball.textContent = possessed ? 'BALL READY' : 'HOLD E TO RECALL';
    this.ball.classList.toggle('warn', !possessed);
    this.fps.textContent = fps > 0 ? `${fps} FPS` : '-- FPS';
    this.combo.textContent = state.combo > 1 && state.comboTimer > 0 ? `${state.combo}× BLOOD COMBO` : '';
    this.combo.classList.toggle('visible', state.combo > 1 && state.comboTimer > 0);

    const dead = state.phase === 'dead';
    this.death.classList.toggle('hidden', !dead);
    if (dead) required('final-score').textContent = `Score ${state.score.toLocaleString()} · Survived ${formatTime(state.elapsed)}`;
  }

  start(): void {
    this.splash.classList.add('hidden');
    window.setTimeout(() => this.hint.classList.add('faded'), 6500);
  }

  reset(): void {
    this.death.classList.add('hidden');
  }
}

function required(id: string): HTMLElement {
  const element = document.getElementById(id);
  if (!element) throw new Error(`Missing UI element #${id}`);
  return element;
}

function formatTime(seconds: number): string {
  const whole = Math.max(0, Math.floor(seconds));
  return `${String(Math.floor(whole / 60)).padStart(2, '0')}:${String(whole % 60).padStart(2, '0')}`;
}

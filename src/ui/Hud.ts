import type { GameState } from '../game/simulation/types';
import type { MatchObjective } from '../game/match';
import { totalXpRequiredForLevel, type ProgressionState } from '../game/progression';
import type { BallState } from '../physics/PhysicsWorld';

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
  private readonly chargeFill: HTMLElement;
  private readonly chargeLabel: HTMLElement;
  private readonly dashStatus: HTMLElement;
  private readonly xpFill: HTMLElement;
  private readonly levelValue: HTMLElement;
  private readonly objective: HTMLElement;
  private readonly victory: HTMLElement;

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
          <div style="display:flex;justify-content:space-between;margin-top:9px;color:#aaa5ad;font-size:9px;letter-spacing:.15em"><span>KICK POWER</span><span id="charge-label">TAP / HOLD</span></div>
          <div class="health-track" style="margin-top:4px"><div id="charge-fill" class="health-fill" style="width:0%;background:linear-gradient(90deg,#d6a632,#fff0a6);box-shadow:0 0 14px rgba(255,214,90,.45);transition:none"></div></div>
          <div class="status-row"><span><i class="dot crimson"></i><b id="enemies">0</b> HOSTILES</span><span id="ball-status">BALL READY</span></div>
          <div class="status-row" style="margin-top:6px"><span>MOBILITY</span><span id="dash-status">DASH READY</span></div>
          <div style="display:flex;justify-content:space-between;margin-top:9px;color:#aaa5ad;font-size:9px;letter-spacing:.15em"><span>BLOOD LEVEL</span><span id="level-value">1</span></div>
          <div class="health-track" style="margin-top:4px"><div id="xp-fill" class="health-fill" style="width:0%;background:linear-gradient(90deg,#6f1f91,#d95eff);box-shadow:0 0 14px rgba(190,74,255,.42)"></div></div>
        </div>
        <div id="objective" class="objective">KICKOFF · BREAK THROUGH THE OPENING RUSH</div>
        <div class="crosshair"><span></span><span></span><span></span><span></span></div>
        <div id="combo" class="combo"></div>
        <div id="controls-hint" class="controls-hint"><b>WASD</b> MOVE <b>SPACE</b> DASH <b>MOUSE</b> AIM <b>HOLD LMB</b> CHARGE / KICK <b>RMB / E</b> RECALL</div>
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
      <section id="victory" class="modal death hidden">
        <p class="eyebrow">FULL TIME</p>
        <h2>THE LEAGUE<br>IS BROKEN</h2>
        <p id="victory-score"></p>
        <button type="button" id="victory-restart-button">PLAY ANOTHER MATCH</button>
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
    this.chargeFill = required('charge-fill');
    this.chargeLabel = required('charge-label');
    this.dashStatus = required('dash-status');
    this.xpFill = required('xp-fill');
    this.levelValue = required('level-value');
    this.objective = required('objective');
    this.victory = required('victory');
  }

  get kickoffButton(): HTMLElement {
    return required('kickoff-button');
  }

  get restartButton(): HTMLElement {
    return required('restart-button');
  }

  get victoryRestartButton(): HTMLElement {
    return required('victory-restart-button');
  }

  update(
    state: GameState,
    ballState: BallState,
    fps: number,
    kickCharge: number,
    progression: Readonly<ProgressionState>,
    objective: Readonly<MatchObjective>,
  ): void {
    const health = state.player.health;
    this.healthFill.style.width = `${health}%`;
    this.healthValue.textContent = String(Math.ceil(health));
    this.timer.textContent = formatTime(state.elapsed);
    this.score.textContent = state.score.toString().padStart(6, '0');
    this.enemies.textContent = String(state.enemies.length);
    this.ball.textContent = ballStatusLabel(ballState);
    this.ball.classList.toggle('warn', ballState !== 'possessed');
    const chargePercent = Math.round(Math.max(0, Math.min(1, kickCharge)) * 100);
    this.chargeFill.style.width = `${chargePercent}%`;
    this.chargeLabel.textContent = chargePercent > 0 ? `${chargePercent}%` : 'TAP / HOLD';
    const dashReady = state.player.dashCooldown <= 0;
    this.dashStatus.textContent = dashReady ? 'DASH READY' : `DASH ${state.player.dashCooldown.toFixed(1)}s`;
    this.dashStatus.classList.toggle('warn', !dashReady);
    const currentLevelXp = totalXpRequiredForLevel(progression.level);
    const nextLevelXp = totalXpRequiredForLevel(progression.level + 1);
    const xpProgress = (progression.totalBloodXp - currentLevelXp) / Math.max(1, nextLevelXp - currentLevelXp);
    this.xpFill.style.width = `${Math.max(0, Math.min(1, xpProgress)) * 100}%`;
    this.levelValue.textContent = String(progression.level);
    this.objective.textContent = `${objective.title} · ${objective.detail}`.toUpperCase();
    this.fps.textContent = fps > 0 ? `${fps} FPS` : '-- FPS';
    this.combo.textContent = state.combo > 1 && state.comboTimer > 0 ? `${state.combo}× BLOOD COMBO` : '';
    this.combo.classList.toggle('visible', state.combo > 1 && state.comboTimer > 0);

    const dead = state.phase === 'dead';
    this.death.classList.toggle('hidden', !dead);
    if (dead) required('final-score').textContent = `Score ${state.score.toLocaleString()} · Survived ${formatTime(state.elapsed)}`;
    const won = state.phase === 'won';
    this.victory.classList.toggle('hidden', !won);
    if (won) required('victory-score').textContent = `Score ${state.score.toLocaleString()} · ${state.kills} vampires defeated`;
  }

  start(): void {
    this.splash.classList.add('hidden');
    window.setTimeout(() => this.hint.classList.add('faded'), 6500);
  }

  reset(): void {
    this.death.classList.add('hidden');
    this.victory.classList.add('hidden');
  }
}

function required(id: string): HTMLElement {
  const element = document.getElementById(id);
  if (!element) throw new Error(`Missing UI element #${id}`);
  return element;
}

function ballStatusLabel(state: BallState): string {
  switch (state) {
    case 'possessed': return 'BALL READY';
    case 'recalling': return 'BALL RETURNING';
    case 'volley-window': return 'PERFECT VOLLEY!';
    case 'recovering': return 'AUTO RECOVERY';
    case 'free': return 'HOLD E TO RECALL';
  }
}

function formatTime(seconds: number): string {
  const whole = Math.max(0, Math.floor(seconds));
  return `${String(Math.floor(whole / 60)).padStart(2, '0')}:${String(whole % 60).padStart(2, '0')}`;
}

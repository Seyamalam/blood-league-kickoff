import type { GameState } from '../game/simulation/types';
import type { MatchObjective } from '../game/match';
import { MINIBOSS_CONFIGS, type CountGoalkeeperState, type MinibossState } from '../game/boss';
import { totalXpRequiredForLevel, type ProgressionState } from '../game/progression';
import type { BallState } from '../physics/PhysicsWorld';
import type { PerformanceSnapshot } from '../diagnostics/PerfMeter';
import type { FrameTimeDistribution } from '../diagnostics/RuntimeDiagnostics';
import type { GpuIdentity } from '../diagnostics/GpuMetrics';
import type { FocusKickState } from '../game/combat';
import { CHARACTER_ULTIMATE_DEFINITIONS, type CharacterUltimateState } from '../game/combat';
import { CHARACTER_ULTIMATE_ICON_URLS } from '../assets/ultimateIcons';
import type { KeyBindings } from '../settings/SettingsStore';
import { uiIcon } from './icons';

export class Hud {
  private readonly healthFill: HTMLElement;
  private readonly healthValue: HTMLElement;
  private readonly timer: HTMLElement;
  private readonly score: HTMLElement;
  private readonly enemies: HTMLElement;
  private readonly ball: HTMLElement;
  private readonly fps: HTMLElement;
  private readonly frameTime: HTMLElement;
  private readonly p95FrameTime: HTMLElement;
  private readonly p99FrameTime: HTMLElement;
  private readonly gpuName: HTMLElement;
  private readonly gpuMemory: HTMLElement;
  private readonly gpuVendor: HTMLElement;
  private readonly renderStats: HTMLElement;
  private readonly poolStats: HTMLElement;
  private readonly splash: HTMLElement;
  private readonly death: HTMLElement;
  private readonly combo: HTMLElement;
  private readonly hint: HTMLElement;
  private readonly chargeFill: HTMLElement;
  private readonly chargeLabel: HTMLElement;
  private readonly dashStatus: HTMLElement;
  private readonly focusFill: HTMLElement;
  private readonly focusStatus: HTMLElement;
  private readonly ultimateFill: HTMLElement;
  private readonly ultimateStatus: HTMLElement;
  private readonly ultimateIcon: HTMLImageElement;
  private readonly xpFill: HTMLElement;
  private readonly levelValue: HTMLElement;
  private readonly objective: HTMLElement;
  private readonly victory: HTMLElement;
  private readonly bossPanel: HTMLElement;
  private readonly bossLabel: HTMLElement;
  private readonly bossFill: HTMLElement;
  private hintFadeTimeout: number | null = null;

  constructor(root: HTMLElement) {
    root.insertAdjacentHTML(
      'beforeend',
      `
      <div class="vignette"></div>
      <div class="hud">
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
          <div class="status-row"><span><i class="dot crimson"></i><b id="enemies">0</b> HOSTILES</span><span id="ball-status" class="ball-state" data-state="possessed">POSSESSED · READY</span></div>
          <div class="status-row" style="margin-top:6px"><span>${uiIcon('bolt')} MOBILITY</span><span id="dash-status">DASH READY</span></div>
          <div style="display:flex;justify-content:space-between;margin-top:9px;color:#aaa5ad;font-size:9px;letter-spacing:.15em"><span class="hud-meter-label">${uiIcon('target')} FOCUS KICK</span><span id="focus-status">0%</span></div>
          <div class="health-track" style="margin-top:4px"><div id="focus-fill" class="health-fill" style="width:0%;background:linear-gradient(90deg,#b89526,#fff0a6);box-shadow:0 0 14px rgba(255,207,64,.4)"></div></div>
          <div class="ultimate-status-row"><span><img id="ultimate-icon" alt="">CHARACTER ULTIMATE</span><span id="ultimate-status">0%</span></div>
          <div class="health-track" style="margin-top:4px"><div id="ultimate-fill" class="health-fill ultimate-fill" style="width:0%"></div></div>
          <div style="display:flex;justify-content:space-between;margin-top:9px;color:#aaa5ad;font-size:9px;letter-spacing:.15em"><span>BLOOD LEVEL</span><span id="level-value">1</span></div>
          <div class="health-track" style="margin-top:4px"><div id="xp-fill" class="health-fill" style="width:0%;background:linear-gradient(90deg,#6f1f91,#d95eff);box-shadow:0 0 14px rgba(190,74,255,.42)"></div></div>
        </div>
        <div id="objective" class="objective" role="status" aria-live="polite" aria-atomic="true">KICKOFF · BREAK THROUGH THE OPENING RUSH</div>
        <div id="boss-panel" class="boss-panel hidden"><span id="boss-label">COUNT GOALKEEPER</span><div class="boss-track"><div id="boss-fill"></div></div></div>
        <div id="combo" class="combo"></div>
        <div id="controls-hint" class="controls-hint"><b>WASD</b> MOVE <b>SPACE</b> DASH <b>MOUSE</b> AIM <b>HOLD LMB</b> KICK <b>RMB / E</b> RECALL <b>F</b> FOCUS <b>Q</b> ULTIMATE</div>
        <aside class="perf" aria-label="Live performance monitor" aria-live="off">
          <div class="perf__title"><span>PERFORMANCE</span><span id="gpu-vendor">WEBGL</span></div>
          <div class="perf__metrics">
            <span><small>FPS</small><strong id="fps">--</strong></span>
            <span><small>FRAME</small><strong id="frame-time">-- MS</strong></span>
            <span><small>P95</small><strong id="frame-p95">-- MS</strong></span>
            <span><small>P99</small><strong id="frame-p99">-- MS</strong></span>
          </div>
          <div class="perf__gpu"><span id="gpu-name">GPU renderer unavailable</span><span id="gpu-memory">GAME GPU EST. -- MB · VRAM NOT EXPOSED</span></div>
          <div class="perf__detail"><span id="render-stats">-- DC · -- TRI</span><span id="pool-stats">--/-- POOL</span></div>
        </aside>
        <button type="button" id="settings-button" class="settings-open" aria-label="Open settings" title="Open settings">${uiIcon('settings')}<span>SETTINGS</span></button>
      </div>
      <section id="splash" class="modal splash">
        <div class="crest">BL</div>
        <p class="eyebrow">THE FINAL MATCH BEGINS</p>
        <h1>BLOOD LEAGUE<br><em>KICKOFF</em></h1>
        <p>Survive the cursed stadium. Your ball is your weapon.<br>Kick it hard. Call it home.</p>
        <button type="button" id="kickoff-button">${uiIcon('play')}<span>ENTER THE PITCH</span></button>
        <div class="title-challenge-runs" aria-label="Seeded challenge runs">
          <button type="button" id="daily-run-button" class="title-settings">${uiIcon('calendar')}<span>DAILY RUN</span></button>
          <button type="button" id="weekly-run-button" class="title-settings">${uiIcon('trophy')}<span>WEEKLY RUN</span></button>
        </div>
        <button type="button" id="cursed-run-button" class="title-settings title-cursed">${uiIcon('loadout')}<span>CURSED CONTRACT RUN</span></button>
        <button type="button" id="difficulty-run-button" class="title-settings">${uiIcon('trophy')}<span>LEAGUE DIFFICULTY</span></button>
        <div class="title-seed-run">
          <label for="custom-seed-input">SHARED SEED</label>
          <div><input id="custom-seed-input" maxlength="32" autocomplete="off" placeholder="ENTER SEED"><button type="button" id="custom-seed-button" class="title-settings">${uiIcon('seed')}<span>PLAY</span></button></div>
        </div>
        <button type="button" id="title-career-button" class="title-settings">${uiIcon('career')}<span>CAREER & CHARACTERS</span></button>
        <button type="button" id="title-settings-button" class="title-settings">${uiIcon('settings')}<span>SETTINGS</span></button>
        <button type="button" id="title-quit-button" class="title-settings title-quit">${uiIcon('power')}<span>QUIT GAME</span></button>
        <small>Click to lock the cursor · Headphones recommended</small>
      </section>
      <section id="death" class="modal death hidden">
        <p class="eyebrow">FULL TIME</p>
        <h2>THE NIGHT<br>CLAIMS ANOTHER</h2>
        <p id="final-score"></p>
        <button type="button" id="restart-button">${uiIcon('restart')}<span>KICK OFF AGAIN</span></button>
        <small>or press R</small>
      </section>
      <section id="victory" class="modal death hidden">
        <p class="eyebrow">FULL TIME</p>
        <h2>THE LEAGUE<br>IS BROKEN</h2>
        <p id="victory-score"></p>
        <button type="button" id="victory-restart-button">${uiIcon('restart')}<span>PLAY ANOTHER MATCH</span></button>
        <small>or press R</small>
      </section>
    `,
    );
    this.healthFill = required('health-fill');
    this.healthValue = required('health-value');
    this.timer = required('timer');
    this.score = required('score');
    this.enemies = required('enemies');
    this.ball = required('ball-status');
    this.fps = required('fps');
    this.frameTime = required('frame-time');
    this.p95FrameTime = required('frame-p95');
    this.p99FrameTime = required('frame-p99');
    this.gpuName = required('gpu-name');
    this.gpuMemory = required('gpu-memory');
    this.gpuVendor = required('gpu-vendor');
    this.renderStats = required('render-stats');
    this.poolStats = required('pool-stats');
    this.splash = required('splash');
    this.death = required('death');
    this.combo = required('combo');
    this.hint = required('controls-hint');
    this.chargeFill = required('charge-fill');
    this.chargeLabel = required('charge-label');
    this.dashStatus = required('dash-status');
    this.focusFill = required('focus-fill');
    this.focusStatus = required('focus-status');
    this.ultimateFill = required('ultimate-fill');
    this.ultimateStatus = required('ultimate-status');
    const ultimateIcon = required('ultimate-icon');
    if (!(ultimateIcon instanceof HTMLImageElement)) throw new Error('Ultimate icon must be an image');
    this.ultimateIcon = ultimateIcon;
    this.xpFill = required('xp-fill');
    this.levelValue = required('level-value');
    this.objective = required('objective');
    this.victory = required('victory');
    this.bossPanel = required('boss-panel');
    this.bossLabel = required('boss-label');
    this.bossFill = required('boss-fill');
    this.titleQuitButton.hidden = !window.desktopRuntime?.window;
  }

  get kickoffButton(): HTMLElement {
    return required('kickoff-button');
  }

  get restartButton(): HTMLElement {
    return required('restart-button');
  }

  get dailyRunButton(): HTMLElement {
    return required('daily-run-button');
  }

  get weeklyRunButton(): HTMLElement {
    return required('weekly-run-button');
  }

  get customSeedButton(): HTMLElement {
    return required('custom-seed-button');
  }

  get cursedRunButton(): HTMLElement {
    return required('cursed-run-button');
  }

  get difficultyRunButton(): HTMLElement {
    return required('difficulty-run-button');
  }

  get customSeedInput(): HTMLInputElement {
    const input = document.getElementById('custom-seed-input');
    if (!(input instanceof HTMLInputElement)) throw new Error('Missing custom seed input');
    return input;
  }

  get victoryRestartButton(): HTMLElement {
    return required('victory-restart-button');
  }

  get settingsButton(): HTMLElement {
    return required('settings-button');
  }

  get titleSettingsButton(): HTMLElement {
    return required('title-settings-button');
  }

  get titleCareerButton(): HTMLElement {
    return required('title-career-button');
  }

  get titleQuitButton(): HTMLElement {
    return required('title-quit-button');
  }

  update(
    state: GameState,
    ballState: BallState,
    kickCharge: number,
    progression: Readonly<ProgressionState>,
    objective: Readonly<MatchObjective>,
    boss: Readonly<CountGoalkeeperState> | null,
    miniboss: Readonly<MinibossState> | null,
    focusKick: Readonly<FocusKickState>,
    characterUltimate: Readonly<CharacterUltimateState>,
  ): void {
    const health = state.player.health;
    this.healthFill.style.width = `${healthPercent(health, state.player.maxHealth)}%`;
    this.healthValue.textContent = `${Math.ceil(Math.max(0, health))} / ${Math.ceil(Math.max(1, state.player.maxHealth))}`;
    this.timer.textContent = formatTime(state.elapsed);
    this.score.textContent = state.score.toString().padStart(6, '0');
    this.enemies.textContent = String(state.enemies.length);
    this.ball.textContent = ballStatusLabel(ballState);
    this.ball.dataset.state = ballState;
    this.ball.setAttribute('aria-label', `Ball state: ${ballStatusLabel(ballState)}`);
    this.ball.classList.toggle('warn', ballState !== 'possessed');
    const chargePercent = Math.round(Math.max(0, Math.min(1, kickCharge)) * 100);
    this.chargeFill.style.width = `${chargePercent}%`;
    this.chargeLabel.textContent = chargePercent > 0 ? `${chargePercent}%` : 'TAP / HOLD';
    const dashReady = state.player.dashCooldown <= 0;
    this.dashStatus.textContent = dashReady ? 'DASH READY' : `DASH ${state.player.dashCooldown.toFixed(1)}s`;
    this.dashStatus.classList.toggle('warn', !dashReady);
    this.dashStatus.classList.toggle('status-ready', dashReady);
    const focusPercent = Math.round(Math.max(0, Math.min(100, focusKick.charge)));
    this.focusFill.style.width = `${focusKick.phase === 'ready' ? 100 : focusPercent}%`;
    this.focusStatus.textContent =
      focusKick.phase === 'ready'
        ? 'PRESS F'
        : focusKick.phase === 'aiming'
          ? `FIRE · ${focusKick.aimTimeRemaining.toFixed(1)}s`
          : focusKick.phase === 'cooldown'
            ? `COOLDOWN ${focusKick.cooldownRemaining.toFixed(1)}s`
            : `${focusPercent}%`;
    this.focusStatus.classList.toggle('warn', focusKick.phase === 'aiming');
    this.focusStatus.classList.toggle('status-ready', focusKick.phase === 'ready');
    const ultimateDefinition = CHARACTER_ULTIMATE_DEFINITIONS[characterUltimate.characterId];
    const ultimatePercent = Math.round(
      Math.max(0, Math.min(1, characterUltimate.charge / characterUltimate.chargeRequired)) * 100,
    );
    this.ultimateFill.style.width = `${characterUltimate.activeRemaining > 0 ? 100 : ultimatePercent}%`;
    this.ultimateStatus.textContent =
      characterUltimate.activeRemaining > 0
        ? `${ultimateDefinition.name.toUpperCase()} ${characterUltimate.activeRemaining.toFixed(1)}s`
        : characterUltimate.ready
          ? `Q · ${ultimateDefinition.callout}`
          : `${ultimatePercent}%`;
    this.ultimateStatus.classList.toggle('warn', characterUltimate.ready);
    this.ultimateStatus.classList.toggle('status-ready', characterUltimate.ready);
    this.ultimateIcon.src = CHARACTER_ULTIMATE_ICON_URLS[characterUltimate.ultimateId];
    this.ultimateIcon.alt = `${ultimateDefinition.name} icon`;
    const currentLevelXp = totalXpRequiredForLevel(progression.level);
    const nextLevelXp = totalXpRequiredForLevel(progression.level + 1);
    const xpProgress =
      (progression.totalBloodXp - currentLevelXp) / Math.max(1, nextLevelXp - currentLevelXp);
    this.xpFill.style.width = `${Math.max(0, Math.min(1, xpProgress)) * 100}%`;
    this.levelValue.textContent = String(progression.level);
    const objectiveLabel = `${objective.title} · ${objective.detail}`.toUpperCase();
    if (this.objective.textContent !== objectiveLabel) this.objective.textContent = objectiveLabel;
    const activeBoss = boss && boss.phase !== 'defeated' ? boss : null;
    const activeMiniboss = miniboss && miniboss.phase !== 'defeated' ? miniboss : null;
    this.bossPanel.classList.toggle('hidden', !activeBoss && !activeMiniboss);
    if (activeBoss) {
      this.bossLabel.textContent = 'COUNT GOALKEEPER';
      this.bossFill.style.width = `${Math.max(0, activeBoss.health / activeBoss.maxHealth) * 100}%`;
    } else if (activeMiniboss) {
      this.bossLabel.textContent = MINIBOSS_CONFIGS[activeMiniboss.kind].name.toUpperCase();
      this.bossFill.style.width = `${Math.max(0, activeMiniboss.health / activeMiniboss.maxHealth) * 100}%`;
    }
    this.combo.textContent = state.combo > 1 && state.comboTimer > 0 ? `${state.combo}× BLOOD COMBO` : '';
    this.combo.classList.toggle('visible', state.combo > 1 && state.comboTimer > 0);

    const dead = state.phase === 'dead';
    this.death.classList.toggle('hidden', !dead);
    if (dead)
      required('final-score').textContent =
        `Score ${state.score.toLocaleString()} · Survived ${formatTime(state.elapsed)}`;
    const won = state.phase === 'won';
    this.victory.classList.toggle('hidden', !won);
    if (won)
      required('victory-score').textContent =
        `Score ${state.score.toLocaleString()} · ${state.kills} vampires defeated`;
  }

  updatePerformance(
    performance: Readonly<PerformanceSnapshot>,
    distribution: Readonly<FrameTimeDistribution>,
    gpu: Readonly<GpuIdentity>,
    estimatedGpuBytes: number,
  ): void {
    const fps = Math.round(performance.smoothedFps);
    this.fps.textContent = fps > 0 ? String(fps) : '--';
    this.frameTime.textContent = formatFrameTime(performance.smoothedFrameMs);
    this.p95FrameTime.textContent = formatFrameTime(distribution.p95Ms);
    this.p99FrameTime.textContent = formatFrameTime(distribution.p99Ms);
    this.gpuName.textContent = gpu.name;
    this.gpuName.title = `${gpu.vendor} · ${gpu.name}`;
    this.gpuVendor.textContent = gpu.vendor.toUpperCase();
    this.gpuMemory.textContent = `GAME GPU EST. ${formatGpuMemory(estimatedGpuBytes)} · ${gpu.memoryLabel}`;
    this.renderStats.textContent = `${performance.rendererCalls} DC · ${formatCompact(performance.rendererTriangles)} TRI`;
    this.poolStats.textContent = `${performance.pooledObjectsActive}/${performance.pooledObjectsCapacity} POOL`;
  }

  start(): void {
    this.splash.classList.add('hidden');
    if (this.hintFadeTimeout !== null) window.clearTimeout(this.hintFadeTimeout);
    this.hintFadeTimeout = window.setTimeout(() => {
      this.hintFadeTimeout = null;
      this.hint.classList.add('faded');
    }, 6500);
  }

  showMenu(): void {
    this.splash.classList.remove('hidden');
    this.death.classList.add('hidden');
    this.victory.classList.add('hidden');
  }

  reset(): void {
    this.death.classList.add('hidden');
    this.victory.classList.add('hidden');
  }

  setControlBindings(bindings: Readonly<KeyBindings>): void {
    this.hint.textContent = `${shortKey(bindings.moveForward)}/${shortKey(bindings.moveLeft)}/${shortKey(bindings.moveBackward)}/${shortKey(bindings.moveRight)} MOVE · ${shortKey(bindings.dash)} DASH · MOUSE AIM/KICK · RMB/${shortKey(bindings.recall)} RECALL · ${shortKey(bindings.focusKick)} FOCUS · ${shortKey(bindings.characterUltimate)} ULTIMATE`;
  }

  dispose(): void {
    if (this.hintFadeTimeout !== null) window.clearTimeout(this.hintFadeTimeout);
    this.hintFadeTimeout = null;
  }
}

/** Clamped HUD ratio that remains correct when passive or character bonuses change maximum health. */
export function healthPercent(health: number, maxHealth: number): number {
  const safeMaximum = Number.isFinite(maxHealth) ? Math.max(1, maxHealth) : 100;
  const safeHealth = Number.isFinite(health) ? Math.max(0, health) : 0;
  return Math.max(0, Math.min(100, (safeHealth / safeMaximum) * 100));
}

function shortKey(code: string): string {
  if (code.startsWith('Key')) return code.slice(3);
  if (code.startsWith('Digit')) return code.slice(5);
  return code.replace('Arrow', '').replace('Left', '').replace('Right', '').toUpperCase();
}

function required(id: string): HTMLElement {
  const element = document.getElementById(id);
  if (!element) throw new Error(`Missing UI element #${id}`);
  return element;
}

export function ballStatusLabel(state: BallState): string {
  switch (state) {
    case 'possessed':
      return 'POSSESSED · READY';
    case 'recalling':
      return 'RECALLING · RETURNING';
    case 'volley-window':
      return 'VOLLEY · KICK NOW!';
    case 'recovering':
      return 'RECOVERING · AUTO RETURN';
    case 'free':
      return 'FREE · HOLD E TO RECALL';
  }
}

function formatTime(seconds: number): string {
  const whole = Math.max(0, Math.floor(seconds));
  return `${String(Math.floor(whole / 60)).padStart(2, '0')}:${String(whole % 60).padStart(2, '0')}`;
}

function formatCompact(value: number): string {
  if (value < 1_000) return String(value);
  return `${(value / 1_000).toFixed(value < 10_000 ? 1 : 0)}K`;
}

function formatFrameTime(value: number): string {
  return Number.isFinite(value) && value > 0 ? `${value.toFixed(1)} MS` : '-- MS';
}

function formatGpuMemory(bytes: number): string {
  if (!Number.isFinite(bytes) || bytes <= 0) return '0 MB';
  const megabytes = bytes / (1024 * 1024);
  return `${megabytes.toFixed(megabytes >= 100 ? 0 : 1)} MB`;
}

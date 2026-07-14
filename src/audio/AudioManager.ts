import type { MatchStage } from '../game/match';

/** Options for the game's procedural audio bus. */
export interface AudioManagerOptions {
  /** Master volume in the range 0–1. The default is deliberately conservative. */
  volume?: number;
  /** Music bus volume in the range 0–1. Defaults to the current full-level mix. */
  musicVolume?: number;
  /** Gameplay effects bus volume in the range 0–1. Defaults to full level. */
  effectsVolume?: number;
  muted?: boolean;
}

/** A match stage name or normalized 0–1 music intensity. */
export type MatchMusicIntensity = MatchStage | 'menu' | 'paused' | number;

/** Escalating Count Goalkeeper combat phases supported by the boss cue. */
export type BossAudioPhase = 'bloodRush' | 'desperation' | number;

type ToneOptions = {
  frequency: number;
  endFrequency?: number;
  duration: number;
  gain: number;
  start?: number;
  type?: OscillatorType;
  detune?: number;
};

type NoiseOptions = {
  duration: number;
  gain: number;
  start?: number;
  filterFrequency?: number;
  filterEndFrequency?: number;
  filterType?: BiquadFilterType;
};

type ProceduralMusicGraph = {
  output: GainNode;
  droneGain: GainNode;
  tensionGain: GainNode;
  pulseGain: GainNode;
  pulseDepth: GainNode;
  choirGain: GainNode;
  percussionGain: GainNode;
  percussionDepth: GainNode;
  filter: BiquadFilterNode;
  pulseLfo: OscillatorNode;
  percussionLfo: OscillatorNode;
  sources: OscillatorNode[];
  nodes: AudioNode[];
};

const DEFAULT_VOLUME = 0.42;
const MAX_ACTIVE_SOURCES = 48;

/**
 * Small, asset-free sound-effects engine for Blood League: Kickoff.
 *
 * Call `unlock()` directly from the first click/tap/key event. Browsers will not
 * allow audio to start before a user gesture. Every play method is safe to call
 * before unlock or on devices without Web Audio; it simply becomes a no-op.
 *
 * Sounds are synthesized at runtime and share a compressed master bus. Call
 * `dispose()` when tearing the game down to release the AudioContext.
 */
export class AudioManager {
  private context: AudioContext | null = null;
  private masterGain: GainNode | null = null;
  private musicBusGain: GainNode | null = null;
  private effectsBusGain: GainNode | null = null;
  private noiseBuffer: AudioBuffer | null = null;
  private musicGraph: ProceduralMusicGraph | null = null;
  private readonly activeSources = new Set<AudioScheduledSourceNode>();
  private readonly lastEventTimes = new Map<string, number>();
  private volume: number;
  private musicVolume: number;
  private effectsVolume: number;
  private muted: boolean;
  private matchIntensity = 0;
  private cueVariation = 0;
  private disposed = false;

  public constructor(options: AudioManagerOptions = {}) {
    this.volume = clamp01(options.volume ?? DEFAULT_VOLUME);
    this.musicVolume = clamp01(options.musicVolume ?? 1);
    this.effectsVolume = clamp01(options.effectsVolume ?? 1);
    this.muted = options.muted ?? false;
  }

  /** True when the current browser exposes the Web Audio API. */
  public static get isSupported(): boolean {
    return typeof window !== 'undefined' && typeof window.AudioContext !== 'undefined';
  }

  /** True after a usable context has been created and resumed. */
  public get isUnlocked(): boolean {
    return this.context?.state === 'running';
  }

  /**
   * Creates/resumes audio. Invoke synchronously inside a user gesture handler.
   * Returns false instead of throwing when audio is unavailable or blocked.
   */
  public async unlock(): Promise<boolean> {
    if (this.disposed || !AudioManager.isSupported) return false;

    try {
      if (!this.context) this.createAudioGraph();
      if (!this.context) return false;
      if (this.context.state === 'suspended') await this.context.resume();
      return this.context.state === 'running';
    } catch {
      return false;
    }
  }

  /** Changes master volume without affecting the mix between individual sounds. */
  public setVolume(value: number): void {
    this.volume = clamp01(value);
    this.updateMasterGain();
  }

  public setMuted(muted: boolean): void {
    this.muted = muted;
    this.updateMasterGain();
  }

  public get currentMusicVolume(): number {
    return this.musicVolume;
  }

  public get currentEffectsVolume(): number {
    return this.effectsVolume;
  }

  /** Changes only the procedural music mix, below master volume/mute. */
  public setMusicVolume(value: number): void {
    this.musicVolume = clamp01(value);
    this.updateBusGains();
  }

  /** Changes only gameplay effects, below master volume/mute. */
  public setEffectsVolume(value: number): void {
    this.effectsVolume = clamp01(value);
    this.updateBusGains();
  }

  /** Current normalized procedural music intensity. */
  public get currentMatchIntensity(): number {
    return this.matchIntensity;
  }

  /**
   * Smoothly adjusts the procedural score for a match stage or normalized tier.
   * Safe before `unlock()`; the requested layer mix is applied when audio starts.
   */
  public setMatchIntensity(intensity: MatchMusicIntensity): void {
    this.matchIntensity = resolveMatchIntensity(intensity);
    this.updateMusicIntensity();
  }

  /** Low impact plus a metallic snap. Charge is normalized to 0–1. */
  public playKick(charge = 1): void {
    const amount = clamp01(charge);
    const now = this.now();
    if (now === null) return;

    this.tone({
      frequency: 105 + amount * 35,
      endFrequency: 46 + amount * 12,
      duration: 0.12 + amount * 0.06,
      gain: 0.16 + amount * 0.15,
      start: now,
      type: 'sine',
    });
    this.noise({
      duration: 0.035 + amount * 0.025,
      gain: 0.08 + amount * 0.1,
      start: now,
      filterFrequency: 900 + amount * 1_500,
      filterType: 'bandpass',
    });
    this.tone({
      frequency: 430 + amount * 160,
      endFrequency: 270,
      duration: 0.055,
      gain: 0.035 + amount * 0.045,
      start: now + 0.008,
      type: 'triangle',
    });
  }

  /** Bright, short first-touch accent. */
  public playVolley(): void {
    const now = this.now();
    if (now === null) return;
    this.tone({
      frequency: 240,
      endFrequency: 720,
      duration: 0.09,
      gain: 0.18,
      start: now,
      type: 'triangle',
    });
    this.tone({
      frequency: 840,
      endFrequency: 520,
      duration: 0.12,
      gain: 0.08,
      start: now + 0.025,
      type: 'sine',
    });
    this.noise({ duration: 0.035, gain: 0.1, start: now, filterFrequency: 2_600, filterType: 'highpass' });
  }

  /** Ball-on-enemy feedback. Intensity is normalized to 0–1. */
  public playHit(intensity = 0.5): void {
    const amount = clamp01(intensity);
    const now = this.now();
    if (now === null) return;
    this.noise({
      duration: 0.025 + amount * 0.05,
      gain: 0.055 + amount * 0.12,
      start: now,
      filterFrequency: 1_100 - amount * 450,
      filterType: 'lowpass',
    });
    this.tone({
      frequency: 125 + amount * 40,
      endFrequency: 72,
      duration: 0.07 + amount * 0.04,
      gain: 0.07 + amount * 0.09,
      start: now,
      type: 'square',
    });
  }

  /** Rising confirmation sting; higher combos climb in pitch but remain bounded. */
  public playKill(combo = 1): void {
    const now = this.now();
    if (now === null) return;
    const comboStep = Math.min(Math.max(0, Math.floor(combo) - 1), 12);
    const root = 210 * 2 ** (comboStep / 24);
    this.tone({
      frequency: root,
      endFrequency: root * 1.35,
      duration: 0.1,
      gain: 0.1,
      start: now,
      type: 'triangle',
    });
    this.tone({
      frequency: root * 1.5,
      endFrequency: root * 2,
      duration: 0.13,
      gain: 0.055,
      start: now + 0.035,
      type: 'sine',
    });
  }

  /** Dark, deliberately non-musical damage cue that stays below the kick volume. */
  public playPlayerHurt(): void {
    const now = this.now();
    if (now === null) return;
    this.tone({ frequency: 150, endFrequency: 58, duration: 0.28, gain: 0.2, start: now, type: 'sawtooth' });
    this.noise({
      duration: 0.16,
      gain: 0.12,
      start: now,
      filterFrequency: 760,
      filterEndFrequency: 220,
      filterType: 'lowpass',
    });
  }

  /** Airy inward sweep used when the ball starts returning to the player. */
  public playRecall(): void {
    const now = this.eventNow('recall-start', 0.12);
    if (now === null) return;
    this.noise({
      duration: 0.22,
      gain: 0.09,
      start: now,
      filterFrequency: 650,
      filterEndFrequency: 3_100,
      filterType: 'bandpass',
    });
    this.tone({
      frequency: 190,
      endFrequency: 520,
      duration: 0.2,
      gain: 0.055,
      start: now + 0.02,
      type: 'sine',
    });
  }

  /** Fast air displacement used when the striker dashes. */
  public playDash(): void {
    const now = this.eventNow('dash', 0.1);
    if (now === null) return;
    this.noise({
      duration: 0.14,
      gain: 0.11,
      start: now,
      filterFrequency: 420,
      filterEndFrequency: 3_800,
      filterType: 'bandpass',
    });
    this.tone({ frequency: 92, endFrequency: 184, duration: 0.11, gain: 0.07, start: now, type: 'triangle' });
  }

  /** Warm ascending pulse for ordinary health recovery. */
  public playHeal(): void {
    const now = this.eventNow('heal', 0.12);
    if (now === null) return;
    this.tone({ frequency: 330, endFrequency: 440, duration: 0.18, gain: 0.08, start: now, type: 'sine' });
    this.tone({
      frequency: 495,
      endFrequency: 660,
      duration: 0.2,
      gain: 0.045,
      start: now + 0.04,
      type: 'triangle',
    });
  }

  /** Dark inward pulse that distinguishes blood-steal healing from pickups. */
  public playLifeSteal(): void {
    const now = this.eventNow('life-steal', 0.18);
    if (now === null) return;
    this.noise({
      duration: 0.18,
      gain: 0.055,
      start: now,
      filterFrequency: 2_400,
      filterEndFrequency: 340,
      filterType: 'bandpass',
    });
    this.tone({ frequency: 180, endFrequency: 360, duration: 0.22, gain: 0.09, start: now, type: 'sine' });
  }

  /** Small collectible sparkle; deliberately throttled for dense shard clusters. */
  public playPickup(): void {
    const now = this.eventNow('pickup', 0.045);
    if (now === null) return;
    this.tone({ frequency: 720, endFrequency: 960, duration: 0.06, gain: 0.035, start: now, type: 'sine' });
  }

  /** Ascending three-note level confirmation. */
  public playLevelUp(): void {
    const now = this.eventNow('level-up', 0.35);
    if (now === null) return;
    [261.63, 329.63, 523.25].forEach((frequency, index) => {
      this.tone({ frequency, duration: 0.18, gain: 0.075, start: now + index * 0.075, type: 'triangle' });
    });
  }

  /** Firm UI/gameplay confirmation after choosing an upgrade. */
  public playUpgradeSelected(): void {
    const now = this.eventNow('upgrade-selected', 0.12);
    if (now === null) return;
    this.tone({
      frequency: 220,
      endFrequency: 440,
      duration: 0.14,
      gain: 0.08,
      start: now,
      type: 'triangle',
    });
    this.noise({ duration: 0.035, gain: 0.045, start: now, filterFrequency: 2_200, filterType: 'highpass' });
  }

  /** Content-unlock flourish, longer and brighter than a normal upgrade choice. */
  public playUnlock(): void {
    const now = this.eventNow('unlock', 0.5);
    if (now === null) return;
    [293.66, 369.99, 440, 587.33].forEach((frequency, index) => {
      this.tone({ frequency, duration: 0.26, gain: 0.065, start: now + index * 0.08, type: 'sine' });
    });
  }

  /** Competitive personal-record flourish with a final high accent. */
  public playNewRecord(): void {
    const now = this.eventNow('new-record', 0.6);
    if (now === null) return;
    [392, 493.88, 587.33, 783.99].forEach((frequency, index) => {
      this.tone({
        frequency,
        duration: index === 3 ? 0.38 : 0.16,
        gain: 0.07,
        start: now + index * 0.09,
        type: 'triangle',
      });
    });
    this.noise({
      duration: 0.16,
      gain: 0.05,
      start: now + 0.25,
      filterFrequency: 3_000,
      filterType: 'highpass',
    });
  }

  /** Low concrete rebound for the pitch perimeter. */
  public playWallImpact(intensity = 0.5): void {
    const amount = clamp01(intensity);
    const now = this.eventNow('wall-impact', 0.045);
    if (now === null) return;
    this.tone({
      frequency: 105 + amount * 25,
      endFrequency: 62,
      duration: 0.12,
      gain: 0.07 + amount * 0.08,
      start: now,
      type: 'triangle',
    });
    this.noise({
      duration: 0.06,
      gain: 0.055 + amount * 0.055,
      start: now,
      filterFrequency: 520,
      filterType: 'lowpass',
    });
  }

  /** Metallic side-post ring. */
  public playPostImpact(intensity = 0.7): void {
    const amount = clamp01(intensity);
    const now = this.eventNow('post-impact', 0.06);
    if (now === null) return;
    this.tone({
      frequency: 740,
      endFrequency: 610,
      duration: 0.34,
      gain: 0.07 + amount * 0.07,
      start: now,
      type: 'sine',
    });
    this.tone({
      frequency: 1_480,
      endFrequency: 1_210,
      duration: 0.22,
      gain: 0.035 + amount * 0.035,
      start: now,
      type: 'triangle',
    });
  }

  /** Heavier overhead goal-frame strike. */
  public playCrossbarImpact(intensity = 0.8): void {
    const amount = clamp01(intensity);
    const now = this.eventNow('crossbar-impact', 0.06);
    if (now === null) return;
    this.tone({
      frequency: 510,
      endFrequency: 390,
      duration: 0.42,
      gain: 0.09 + amount * 0.075,
      start: now,
      type: 'triangle',
    });
    this.noise({ duration: 0.055, gain: 0.055, start: now, filterFrequency: 1_800, filterType: 'bandpass' });
  }

  /** Soft net catch that confirms a complete goal-plane crossing. */
  public playNetImpact(): void {
    const now = this.eventNow('net-impact', 0.12);
    if (now === null) return;
    this.noise({
      duration: 0.28,
      gain: 0.08,
      start: now,
      filterFrequency: 1_300,
      filterEndFrequency: 260,
      filterType: 'lowpass',
    });
    this.tone({ frequency: 120, endFrequency: 72, duration: 0.2, gain: 0.05, start: now, type: 'sine' });
  }

  /** Clean possession snap at the end of recall. */
  public playRecallCatch(): void {
    const now = this.eventNow('recall-catch', 0.1);
    if (now === null) return;
    this.tone({
      frequency: 520,
      endFrequency: 260,
      duration: 0.08,
      gain: 0.09,
      start: now,
      type: 'triangle',
    });
    this.noise({ duration: 0.025, gain: 0.055, start: now, filterFrequency: 1_900, filterType: 'bandpass' });
  }

  /** Muffled possession sound for a goalkeeper catch. */
  public playGoalkeeperCatch(): void {
    const now = this.eventNow('goalkeeper-catch', 0.16);
    if (now === null) return;
    this.noise({ duration: 0.11, gain: 0.13, start: now, filterFrequency: 420, filterType: 'lowpass' });
    this.tone({ frequency: 96, endFrequency: 58, duration: 0.18, gain: 0.11, start: now, type: 'sine' });
  }

  /** Sharp angled rejection for a goalkeeper parry. */
  public playGoalkeeperParry(): void {
    const now = this.eventNow('goalkeeper-parry', 0.11);
    if (now === null) return;
    this.noise({ duration: 0.07, gain: 0.14, start: now, filterFrequency: 1_700, filterType: 'bandpass' });
    this.tone({ frequency: 230, endFrequency: 110, duration: 0.14, gain: 0.1, start: now, type: 'square' });
  }

  /** Cracking low-to-high cue for breaking the goalkeeper's guard. */
  public playGoalkeeperGuardBreak(): void {
    const now = this.eventNow('goalkeeper-guard-break', 0.35);
    if (now === null) return;
    this.noise({
      duration: 0.24,
      gain: 0.17,
      start: now,
      filterFrequency: 460,
      filterEndFrequency: 3_600,
      filterType: 'bandpass',
    });
    this.tone({ frequency: 82, endFrequency: 246, duration: 0.3, gain: 0.14, start: now, type: 'sawtooth' });
  }

  /** Downward collapse cue for an ordinary goalkeeper defender. */
  public playGoalkeeperDefeat(): void {
    const now = this.eventNow('goalkeeper-defeat', 0.45);
    if (now === null) return;
    [196, 146.83, 98].forEach((frequency, index) => {
      this.tone({
        frequency,
        endFrequency: frequency * 0.72,
        duration: 0.3,
        gain: 0.09,
        start: now + index * 0.1,
        type: 'sawtooth',
      });
    });
  }

  /** Referee-style opening whistle and low stadium hit. */
  public playKickoff(): void {
    const now = this.eventNow('kickoff', 0.5);
    if (now === null) return;
    this.tone({
      frequency: 1_760,
      endFrequency: 2_050,
      duration: 0.28,
      gain: 0.075,
      start: now,
      type: 'sine',
    });
    this.tone({
      frequency: 110,
      endFrequency: 74,
      duration: 0.22,
      gain: 0.1,
      start: now + 0.08,
      type: 'triangle',
    });
  }

  /** Falling whistle used when a timed scoring chance expires. */
  public playGoalMissed(): void {
    const now = this.eventNow('goal-missed', 0.5);
    if (now === null) return;
    this.tone({ frequency: 660, endFrequency: 220, duration: 0.42, gain: 0.1, start: now, type: 'triangle' });
    this.noise({
      duration: 0.22,
      gain: 0.06,
      start: now + 0.12,
      filterFrequency: 520,
      filterType: 'lowpass',
    });
  }

  /** Double-whistle cadence for the halftime break. */
  public playHalftime(): void {
    const now = this.eventNow('halftime', 0.7);
    if (now === null) return;
    for (const offset of [0, 0.24]) {
      this.tone({
        frequency: 1_420,
        endFrequency: 1_760,
        duration: 0.18,
        gain: 0.07,
        start: now + offset,
        type: 'sine',
      });
    }
  }

  /** Ominous transformation cue for the Blood Moon escalation. */
  public playBloodMoon(): void {
    const now = this.eventNow('blood-moon', 0.8);
    if (now === null) return;
    this.tone({
      frequency: 73.42,
      endFrequency: 36.71,
      duration: 0.9,
      gain: 0.16,
      start: now,
      type: 'sawtooth',
    });
    this.tone({
      frequency: 220,
      endFrequency: 110,
      duration: 0.75,
      gain: 0.07,
      start: now + 0.08,
      type: 'triangle',
    });
    this.noise({
      duration: 0.65,
      gain: 0.09,
      start: now,
      filterFrequency: 2_400,
      filterEndFrequency: 180,
      filterType: 'lowpass',
    });
  }

  /** Urgent four-beat warning before the final encounter. */
  public playFinalWave(): void {
    const now = this.eventNow('final-wave', 0.8);
    if (now === null) return;
    [0, 0.12, 0.24, 0.36].forEach((offset, index) => {
      this.tone({
        frequency: 98 * (1 + index * 0.16),
        endFrequency: 62,
        duration: 0.16,
        gain: 0.11,
        start: now + offset,
        type: 'sawtooth',
      });
    });
  }

  /** Neutral UI confirmation. */
  public playUiSelect(): void {
    const now = this.eventNow('ui-select', 0.035);
    if (now === null) return;
    this.tone({ frequency: 440, endFrequency: 620, duration: 0.055, gain: 0.04, start: now, type: 'sine' });
  }

  /** Descending UI navigation cue. */
  public playUiBack(): void {
    const now = this.eventNow('ui-back', 0.06);
    if (now === null) return;
    this.tone({
      frequency: 420,
      endFrequency: 260,
      duration: 0.075,
      gain: 0.045,
      start: now,
      type: 'triangle',
    });
  }

  /** Dissonant UI rejection without a harsh full-volume alarm. */
  public playUiError(): void {
    const now = this.eventNow('ui-error', 0.15);
    if (now === null) return;
    this.tone({ frequency: 180, endFrequency: 150, duration: 0.16, gain: 0.065, start: now, type: 'square' });
    this.tone({
      frequency: 191,
      endFrequency: 158,
      duration: 0.16,
      gain: 0.04,
      start: now,
      type: 'square',
      detune: -7,
    });
  }

  /** Short original goal fanfare, suitable for a goal or major phase transition. */
  public playGoal(): void {
    const now = this.now();
    if (now === null) return;
    const notes = [220, 293.66, 369.99, 440];
    notes.forEach((frequency, index) => {
      const start = now + index * 0.105;
      this.tone({
        frequency,
        endFrequency: frequency * 1.012,
        duration: 0.24,
        gain: 0.12,
        start,
        type: 'triangle',
      });
      this.tone({ frequency: frequency * 2, duration: 0.16, gain: 0.035, start, type: 'sine' });
    });
    this.noise({
      duration: 0.12,
      gain: 0.1,
      start: now + 0.31,
      filterFrequency: 2_000,
      filterType: 'highpass',
    });
  }

  /** Two-note transition cue. The phase number subtly varies the pitch. */
  public playPhase(phase = 0): void {
    const now = this.now();
    if (now === null) return;
    const root = 130 * 2 ** (Math.min(Math.max(0, phase), 6) / 12);
    this.tone({
      frequency: root,
      endFrequency: root * 1.5,
      duration: 0.22,
      gain: 0.1,
      start: now,
      type: 'triangle',
    });
    this.tone({
      frequency: root * 2,
      endFrequency: root * 2.5,
      duration: 0.28,
      gain: 0.09,
      start: now + 0.11,
      type: 'sine',
    });
  }

  /** Luminous transformation cue used when a weapon reaches its evolved form. */
  public playEvolutionUnlock(): void {
    const now = this.now();
    if (now === null) return;

    this.noise({
      duration: 0.48,
      gain: 0.08,
      start: now,
      filterFrequency: 420,
      filterEndFrequency: 5_600,
      filterType: 'bandpass',
    });

    const notes = [220, 277.18, 329.63, 440, 554.37];
    notes.forEach((frequency, index) => {
      const start = now + index * 0.075;
      this.tone({
        frequency,
        endFrequency: frequency * 1.015,
        duration: index === notes.length - 1 ? 0.48 : 0.2,
        gain: index === notes.length - 1 ? 0.13 : 0.075,
        start,
        type: 'triangle',
      });
      this.tone({
        frequency: frequency * 2,
        duration: 0.14,
        gain: 0.025,
        start: start + 0.012,
        type: 'sine',
      });
    });

    this.tone({
      frequency: 110,
      endFrequency: 220,
      duration: 0.56,
      gain: 0.07,
      start: now,
      type: 'sine',
    });
  }

  /** Character-signature cue: a rising blood pulse followed by a bright release. */
  public playUltimate(): void {
    const now = this.now();
    if (now === null) return;
    [110, 165, 247, 370].forEach((frequency, index) => {
      this.tone({
        frequency,
        endFrequency: frequency * 1.5,
        duration: 0.24,
        gain: 0.1 + index * 0.012,
        start: now + index * 0.055,
        type: index < 2 ? 'sawtooth' : 'triangle',
      });
    });
    this.noise({
      duration: 0.34,
      gain: 0.11,
      start: now + 0.08,
      filterFrequency: 420,
      filterEndFrequency: 5_400,
      filterType: 'bandpass',
    });
  }

  /** Short warning identity used when a named miniboss enters the pitch. */
  public playMinibossEntrance(): void {
    const now = this.now();
    if (now === null) return;
    [82.41, 123.47, 98].forEach((frequency, index) => {
      this.tone({
        frequency,
        endFrequency: frequency * 0.72,
        duration: 0.3,
        gain: 0.14,
        start: now + index * 0.12,
        type: 'sawtooth',
      });
    });
    this.noise({ duration: 0.18, gain: 0.1, start: now + 0.16, filterFrequency: 760, filterType: 'lowpass' });
  }

  /** Risk-selection sting for starting a cursed contract. */
  public playCurseAccepted(): void {
    const now = this.now();
    if (now === null) return;
    this.tone({ frequency: 330, endFrequency: 55, duration: 0.55, gain: 0.16, start: now, type: 'triangle' });
    this.noise({
      duration: 0.28,
      gain: 0.08,
      start: now + 0.04,
      filterFrequency: 1_200,
      filterType: 'bandpass',
    });
  }

  /** Ominous brass-like reveal and heartbeat used when the Count enters the pitch. */
  public playBossEntrance(): void {
    const now = this.now();
    if (now === null) return;

    this.tone({
      frequency: 92,
      endFrequency: 46,
      duration: 0.95,
      gain: 0.2,
      start: now,
      type: 'sawtooth',
    });
    this.tone({
      frequency: 138,
      endFrequency: 69,
      duration: 0.82,
      gain: 0.1,
      start: now + 0.06,
      type: 'triangle',
      detune: -9,
    });
    this.noise({
      duration: 0.62,
      gain: 0.13,
      start: now,
      filterFrequency: 1_800,
      filterEndFrequency: 180,
      filterType: 'lowpass',
    });

    for (const offset of [0.32, 0.58, 0.82]) {
      this.tone({
        frequency: 72,
        endFrequency: 38,
        duration: 0.16,
        gain: 0.17,
        start: now + offset,
        type: 'sine',
      });
    }
  }

  /** Escalating warning sting for the Count's blood-rush and desperation phases. */
  public playBossPhase(phase: BossAudioPhase = 'bloodRush'): void {
    const now = this.now();
    if (now === null) return;
    const intensity = resolveBossPhaseIntensity(phase);
    const root = 98 * 2 ** (intensity / 5);
    const spacing = 0.09 - intensity * 0.018;

    [1, 1.19, 1.5, 2].forEach((ratio, index) => {
      const start = now + index * spacing;
      this.tone({
        frequency: root * ratio,
        endFrequency: root * ratio * (1.25 + intensity * 0.2),
        duration: 0.19,
        gain: 0.085 + intensity * 0.025,
        start,
        type: index % 2 === 0 ? 'sawtooth' : 'triangle',
      });
    });
    this.noise({
      duration: 0.18 + intensity * 0.08,
      gain: 0.09 + intensity * 0.04,
      start: now + spacing * 2,
      filterFrequency: 900 + intensity * 1_200,
      filterEndFrequency: 3_200 + intensity * 1_400,
      filterType: 'bandpass',
    });
  }

  /** Full-screen transformation hit for the Count's winged second form. */
  public playBossTransformation(): void {
    const now = this.eventNow('boss-transformation', 1.2);
    if (now === null) return;
    const variation = this.nextCueVariation();
    this.tone({
      frequency: 55 * variation,
      endFrequency: 27.5,
      duration: 1.15,
      gain: 0.2,
      start: now,
      type: 'sawtooth',
    });
    this.noise({
      duration: 0.9,
      gain: 0.14,
      start: now,
      filterFrequency: 220,
      filterEndFrequency: 4_800,
      filterType: 'bandpass',
    });
    [110, 164.81, 246.94, 369.99].forEach((frequency, index) => {
      this.tone({
        frequency: frequency * variation,
        endFrequency: frequency * 0.72,
        duration: 0.42 + index * 0.05,
        gain: 0.08 + index * 0.012,
        start: now + 0.12 + index * 0.075,
        type: index < 2 ? 'square' : 'triangle',
      });
    });
  }

  /** Layered crowd swell for goals, boss reveals, and terminal presentation. */
  public playCrowdRise(intensity = 0.65): void {
    const amount = clamp01(intensity);
    const now = this.eventNow('crowd-rise', 0.35);
    if (now === null) return;
    const variation = this.nextCueVariation();
    this.noise({
      duration: 0.45 + amount * 0.75,
      gain: 0.035 + amount * 0.075,
      start: now,
      filterFrequency: 260 + amount * 220,
      filterEndFrequency: 1_500 + amount * 2_400,
      filterType: 'bandpass',
    });
    this.tone({
      frequency: (82.41 + amount * 28) * variation,
      endFrequency: (146.83 + amount * 90) * variation,
      duration: 0.5 + amount * 0.38,
      gain: 0.03 + amount * 0.035,
      start: now + 0.04,
      type: 'triangle',
    });
  }

  /** Bright impact tail paired with the existing evolution arpeggio. */
  public playEvolutionImpact(): void {
    const now = this.eventNow('evolution-impact', 0.5);
    if (now === null) return;
    const variation = this.nextCueVariation();
    this.tone({
      frequency: 65.41 * variation,
      endFrequency: 32.7,
      duration: 0.5,
      gain: 0.14,
      start: now,
      type: 'sine',
    });
    this.noise({
      duration: 0.32,
      gain: 0.09,
      start: now + 0.02,
      filterFrequency: 640,
      filterEndFrequency: 6_200,
      filterType: 'bandpass',
    });
  }

  /** Resolving final-whistle fanfare for a completed run. */
  public playVictory(): void {
    const now = this.now();
    if (now === null) return;
    const notes = [196, 233.08, 293.66, 392, 493.88];
    notes.forEach((frequency, index) => {
      const start = now + index * 0.13;
      this.tone({
        frequency,
        endFrequency: frequency * 1.01,
        duration: index === notes.length - 1 ? 0.62 : 0.3,
        gain: index === notes.length - 1 ? 0.15 : 0.1,
        start,
        type: 'triangle',
      });
      this.tone({
        frequency: frequency * 2,
        duration: 0.2,
        gain: 0.03,
        start: start + 0.015,
        type: 'sine',
      });
    });
    this.noise({
      duration: 0.42,
      gain: 0.08,
      start: now + 0.5,
      filterFrequency: 1_600,
      filterEndFrequency: 5_800,
      filterType: 'highpass',
    });
    this.playCrowdRise(1);
  }

  /** Heavy downward cadence for player death or a lost match. */
  public playDefeat(): void {
    const now = this.now();
    if (now === null) return;
    [164.81, 138.59, 116.54, 82.41].forEach((frequency, index) => {
      this.tone({
        frequency,
        endFrequency: frequency * 0.72,
        duration: index === 3 ? 0.72 : 0.28,
        gain: 0.11 + index * 0.012,
        start: now + index * 0.14,
        type: index === 3 ? 'sawtooth' : 'triangle',
      });
    });
    this.noise({
      duration: 0.75,
      gain: 0.1,
      start: now + 0.26,
      filterFrequency: 620,
      filterEndFrequency: 90,
      filterType: 'lowpass',
    });
    this.tone({
      frequency: 41.2,
      endFrequency: 24,
      duration: 1.2,
      gain: 0.08,
      start: now + 0.3,
      type: 'sine',
    });
  }

  /** Stops all effects and closes the underlying browser audio device. */
  public async dispose(): Promise<void> {
    if (this.disposed) return;
    this.disposed = true;
    for (const source of this.activeSources) {
      try {
        source.stop();
      } catch {
        // A source may already have ended between iteration and stop().
      }
    }
    this.activeSources.clear();
    this.lastEventTimes.clear();
    this.disposeMusicGraph();
    this.musicBusGain?.disconnect();
    this.effectsBusGain?.disconnect();
    const context = this.context;
    this.context = null;
    this.masterGain = null;
    this.musicBusGain = null;
    this.effectsBusGain = null;
    this.noiseBuffer = null;
    if (context && context.state !== 'closed') {
      try {
        await context.close();
      } catch {
        // Closing is best-effort during page/app teardown.
      }
    }
  }

  private createAudioGraph(): void {
    const context = new AudioContext({ latencyHint: 'interactive' });
    const master = context.createGain();
    const musicBus = context.createGain();
    const effectsBus = context.createGain();
    const compressor = context.createDynamicsCompressor();
    compressor.threshold.value = -18;
    compressor.knee.value = 18;
    compressor.ratio.value = 5;
    compressor.attack.value = 0.003;
    compressor.release.value = 0.18;
    musicBus.connect(master);
    effectsBus.connect(master);
    master.connect(compressor);
    compressor.connect(context.destination);
    this.context = context;
    this.masterGain = master;
    this.musicBusGain = musicBus;
    this.effectsBusGain = effectsBus;
    this.musicGraph = this.createMusicGraph(context, musicBus);
    this.updateMasterGain();
    this.updateBusGains();
    this.updateMusicIntensity();
  }

  private updateMasterGain(): void {
    if (!this.context || !this.masterGain) return;
    const target = this.muted ? 0 : this.volume;
    this.masterGain.gain.setTargetAtTime(target, this.context.currentTime, 0.012);
  }

  private updateBusGains(): void {
    if (!this.context) return;
    const now = this.context.currentTime;
    this.musicBusGain?.gain.setTargetAtTime(this.musicVolume, now, 0.018);
    this.effectsBusGain?.gain.setTargetAtTime(this.effectsVolume, now, 0.012);
  }

  private createMusicGraph(context: AudioContext, output: AudioNode): ProceduralMusicGraph {
    const musicOutput = context.createGain();
    const filter = context.createBiquadFilter();
    const drone = context.createOscillator();
    const droneGain = context.createGain();
    const tension = context.createOscillator();
    const tensionGain = context.createGain();
    const pulse = context.createOscillator();
    const pulseGain = context.createGain();
    const pulseLfo = context.createOscillator();
    const pulseDepth = context.createGain();
    const choir = context.createOscillator();
    const choirGain = context.createGain();
    const percussion = context.createOscillator();
    const percussionGain = context.createGain();
    const percussionLfo = context.createOscillator();
    const percussionDepth = context.createGain();

    musicOutput.gain.value = 0;
    filter.type = 'lowpass';
    filter.frequency.value = 280;
    filter.Q.value = 1.4;
    drone.type = 'sine';
    drone.frequency.value = 55;
    droneGain.gain.value = 0;
    tension.type = 'triangle';
    tension.frequency.value = 82.41;
    tension.detune.value = -6;
    tensionGain.gain.value = 0;
    pulse.type = 'sawtooth';
    pulse.frequency.value = 41.2;
    pulseGain.gain.value = 0;
    pulseLfo.type = 'sine';
    pulseLfo.frequency.value = 1.6;
    pulseDepth.gain.value = 0;
    choir.type = 'triangle';
    choir.frequency.value = 164.81;
    choir.detune.value = -11;
    choirGain.gain.value = 0;
    percussion.type = 'square';
    percussion.frequency.value = 49;
    percussionGain.gain.value = 0;
    percussionLfo.type = 'square';
    percussionLfo.frequency.value = 2;
    percussionDepth.gain.value = 0;

    drone.connect(droneGain);
    droneGain.connect(filter);
    tension.connect(tensionGain);
    tensionGain.connect(filter);
    pulse.connect(pulseGain);
    pulseGain.connect(filter);
    pulseLfo.connect(pulseDepth);
    pulseDepth.connect(pulseGain.gain);
    choir.connect(choirGain);
    choirGain.connect(filter);
    percussion.connect(percussionGain);
    percussionGain.connect(filter);
    percussionLfo.connect(percussionDepth);
    percussionDepth.connect(percussionGain.gain);
    filter.connect(musicOutput);
    musicOutput.connect(output);

    const sources = [drone, tension, pulse, pulseLfo, choir, percussion, percussionLfo];
    for (const source of sources) source.start();
    return {
      output: musicOutput,
      droneGain,
      tensionGain,
      pulseGain,
      pulseDepth,
      choirGain,
      percussionGain,
      percussionDepth,
      filter,
      pulseLfo,
      percussionLfo,
      sources,
      nodes: [
        drone,
        droneGain,
        tension,
        tensionGain,
        pulse,
        pulseGain,
        pulseLfo,
        pulseDepth,
        choir,
        choirGain,
        percussion,
        percussionGain,
        percussionLfo,
        percussionDepth,
        filter,
        musicOutput,
      ],
    };
  }

  private updateMusicIntensity(): void {
    const context = this.context;
    const music = this.musicGraph;
    if (!context || !music || context.state === 'closed') return;
    const now = context.currentTime;
    const intensity = this.matchIntensity;
    const active = intensity > 0.001 ? 1 : 0;
    rampTarget(music.output.gain, active * (0.58 + intensity * 0.12), now, 0.32);
    rampTarget(music.droneGain.gain, active * (0.018 + intensity * 0.018), now, 0.38);
    rampTarget(music.tensionGain.gain, active * Math.max(0, intensity - 0.22) * 0.027, now, 0.38);
    const pulseLevel = active * Math.max(0, intensity - 0.34) * 0.022;
    rampTarget(music.pulseGain.gain, pulseLevel, now, 0.26);
    rampTarget(music.pulseDepth.gain, pulseLevel * 0.82, now, 0.26);
    const choirLevel = active * Math.max(0, intensity - 0.48) * 0.018;
    rampTarget(music.choirGain.gain, choirLevel, now, 0.55);
    const percussionLevel = active * Math.max(0, intensity - 0.58) * 0.014;
    rampTarget(music.percussionGain.gain, percussionLevel, now, 0.18);
    rampTarget(music.percussionDepth.gain, percussionLevel * 0.92, now, 0.18);
    rampTarget(music.filter.frequency, 260 + intensity * 940, now, 0.42);
    rampTarget(music.pulseLfo.frequency, 1.55 + intensity * 2.45, now, 0.35);
    rampTarget(music.percussionLfo.frequency, 1.8 + intensity * 3.2, now, 0.24);
  }

  private disposeMusicGraph(): void {
    const music = this.musicGraph;
    this.musicGraph = null;
    if (!music) return;
    for (const source of music.sources) {
      try {
        source.stop();
      } catch {
        // A closing context may already have stopped its persistent sources.
      }
    }
    for (const node of music.nodes) node.disconnect();
  }

  private now(): number | null {
    if (this.disposed || !this.context || !this.effectsBusGain || this.context.state !== 'running')
      return null;
    return this.context.currentTime;
  }

  /**
   * Returns audio time only when this cue is outside its retrigger window.
   * Fixed-step combat can emit several contacts in one rendered frame; keeping
   * throttling here protects the shared graph without affecting simulation.
   */
  private eventNow(eventId: string, cooldown: number): number | null {
    const now = this.now();
    if (now === null) return null;
    const previous = this.lastEventTimes.get(eventId);
    if (previous !== undefined && now - previous < cooldown) return null;
    this.lastEventTimes.set(eventId, now);
    return now;
  }

  private nextCueVariation(): number {
    this.cueVariation = (this.cueVariation + 1) % 7;
    return 2 ** ((this.cueVariation - 3) / 120);
  }

  private tone(options: ToneOptions): void {
    const context = this.context;
    const output = this.effectsBusGain;
    if (!context || !output) return;
    const start = options.start ?? context.currentTime;
    const end = start + options.duration;
    const oscillator = context.createOscillator();
    const envelope = context.createGain();
    oscillator.type = options.type ?? 'sine';
    oscillator.frequency.setValueAtTime(Math.max(20, options.frequency), start);
    if (options.endFrequency !== undefined) {
      oscillator.frequency.exponentialRampToValueAtTime(Math.max(20, options.endFrequency), end);
    }
    oscillator.detune.value = options.detune ?? 0;
    applyEnvelope(envelope.gain, start, end, options.gain);
    oscillator.connect(envelope);
    envelope.connect(output);
    this.scheduleSource(oscillator, start, end, [oscillator, envelope]);
  }

  private noise(options: NoiseOptions): void {
    const context = this.context;
    const output = this.effectsBusGain;
    if (!context || !output) return;
    const start = options.start ?? context.currentTime;
    const end = start + options.duration;
    const source = context.createBufferSource();
    const filter = context.createBiquadFilter();
    const envelope = context.createGain();
    source.buffer = this.getNoiseBuffer(context);
    filter.type = options.filterType ?? 'lowpass';
    filter.Q.value = filter.type === 'bandpass' ? 1.1 : 0.7;
    filter.frequency.setValueAtTime(Math.max(30, options.filterFrequency ?? 1_200), start);
    if (options.filterEndFrequency !== undefined) {
      filter.frequency.exponentialRampToValueAtTime(Math.max(30, options.filterEndFrequency), end);
    }
    applyEnvelope(envelope.gain, start, end, options.gain);
    source.connect(filter);
    filter.connect(envelope);
    envelope.connect(output);
    this.scheduleSource(source, start, end, [source, filter, envelope]);
  }

  private getNoiseBuffer(context: AudioContext): AudioBuffer {
    if (this.noiseBuffer) return this.noiseBuffer;
    const length = Math.ceil(context.sampleRate * 0.5);
    const buffer = context.createBuffer(1, length, context.sampleRate);
    const samples = buffer.getChannelData(0);
    let previous = 0;
    for (let index = 0; index < samples.length; index += 1) {
      // A little correlation softens raw white noise and avoids harsh transients.
      previous = previous * 0.35 + (Math.random() * 2 - 1) * 0.65;
      samples[index] = previous;
    }
    this.noiseBuffer = buffer;
    return buffer;
  }

  private scheduleSource(
    source: AudioScheduledSourceNode,
    start: number,
    end: number,
    nodes: AudioNode[],
  ): void {
    if (this.activeSources.size >= MAX_ACTIVE_SOURCES) {
      const oldest = this.activeSources.values().next().value as AudioScheduledSourceNode | undefined;
      if (oldest) {
        try {
          oldest.stop();
        } catch {
          // It may already be ending; onended will remove it.
        }
      }
    }
    this.activeSources.add(source);
    source.onended = (): void => {
      this.activeSources.delete(source);
      for (const node of nodes) node.disconnect();
    };
    source.start(start);
    source.stop(end + 0.01);
  }
}

function applyEnvelope(parameter: AudioParam, start: number, end: number, peak: number): void {
  const duration = end - start;
  const attackEnd = start + Math.min(0.008, duration * 0.18);
  parameter.setValueAtTime(0.0001, start);
  parameter.exponentialRampToValueAtTime(Math.max(0.0001, peak), attackEnd);
  parameter.exponentialRampToValueAtTime(0.0001, end);
}

function clamp01(value: number): number {
  return Math.min(1, Math.max(0, Number.isFinite(value) ? value : 0));
}

function rampTarget(parameter: AudioParam, value: number, now: number, timeConstant: number): void {
  parameter.cancelScheduledValues(now);
  parameter.setTargetAtTime(value, now, timeConstant);
}

function resolveMatchIntensity(intensity: MatchMusicIntensity): number {
  if (typeof intensity === 'number') return clamp01(intensity);
  switch (intensity) {
    case 'menu':
      return 0.12;
    case 'paused':
      return 0.08;
    case 'opening':
      return 0.24;
    case 'firstHalf':
      return 0.38;
    case 'goalOpportunity':
      return 0.62;
    case 'escalation':
      return 0.55;
    case 'halftimeChoice':
      return 0.18;
    case 'bloodMoon':
      return 0.78;
    case 'finalGoal':
      return 0.9;
    case 'finalWave':
      return 1;
    case 'victory':
      return 0.14;
    case 'dead':
      return 0;
  }
}

function resolveBossPhaseIntensity(phase: BossAudioPhase): number {
  if (typeof phase === 'number') return clamp01(phase);
  return phase === 'desperation' ? 1 : 0.55;
}

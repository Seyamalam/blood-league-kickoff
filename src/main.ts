import './styles.css';
import * as THREE from 'three';
import { AudioManager } from './audio';
import { BUILD_METADATA } from './build/buildMetadata';
import { countActivePoolItems, createPerformanceCounters, PerfMeter } from './diagnostics/PerfMeter';
import {
  applyDenseWaveStressFormation,
  createDenseSecondaryStressState,
  installDenseWavePerformanceHook,
  readDenseWaveStressMode,
} from './diagnostics/DenseWaveStress';
import { PresentationFrameScheduler } from './diagnostics/PresentationFrameScheduler';
import {
  FrameTimeSampler,
  installRuntimeDiagnosticsHook,
  readRuntimeDiagnosticsMode,
} from './diagnostics/RuntimeDiagnostics';
import { estimateSceneGpuBytes, readGpuIdentity } from './diagnostics/GpuMetrics';
import {
  createQaEvolutionFixture,
  createQaTerminalFixture,
  installQaSnapshotHook,
  readQaEvolutionId,
  readQaScenario,
} from './diagnostics/QaScenario';
import { InputController } from './game/input/InputController';
import {
  COUNT_GOALKEEPER_COMBAT_TARGET_ID,
  DEFAULT_COUNT_GOALKEEPER_CONFIG,
  damageCountGoalkeeper,
  didDefeatCountGoalkeeper,
  isCountGoalkeeperDamageable,
  spawnCountGoalkeeper,
  damageMiniboss,
  MINIBOSS_CONFIGS,
  MINIBOSS_ENCOUNTER_SCHEDULE,
  spawnMiniboss,
  updateCountGoalkeeper,
  updateMiniboss,
  type CountGoalkeeperState,
  type MinibossKind,
  type MinibossState,
} from './game/boss';
import {
  activateFocusKick,
  applyFocusKickCombatAction,
  consumeFocusKickShot,
  createFocusKickState,
  getFocusKickTimeScale,
  resetFocusKick,
  SecondaryWeaponSystem,
  WeaponExpansionSystem,
  CharacterUltimateSystem,
  CombatFeedbackSystem,
  FootballArmorySystem,
  sumSecondaryBossDamage,
  resolvePlayerAim,
  stepFocusKick,
  type FocusKickCombatAction,
  type CombatTarget,
  type UltimateTarget,
  type CharacterUltimateEffects,
  type FootballArmoryTarget,
} from './game/combat';
import {
  createMatchDirectorState,
  createMatchModifierState,
  FULL_MATCH_CONFIG,
  TUTORIAL_MATCH_CONFIG,
  getMatchModifierEffects,
  getMatchObjective,
  selectRivalTeam,
  updateMatchDirector,
  updateMatchModifiers,
  type HalftimeChoice,
  type MatchStage,
} from './game/match';
import { BloodShardSystem } from './game/pickups';
import { applyStartingLoadout, CHARACTER_DEFINITIONS, type CharacterId } from './game/characters';
import {
  createDifficultyRuleset,
  createRunDescriptor,
  createRunRandomStreams,
  scaleMatchConfigForDifficulty,
  type DifficultyRuleset,
  type RunMode,
} from './game/runs';
import {
  BLOOD_XP_PER_KILL,
  calculateCurseDirectorModifiers,
  calculateModifiers,
  chooseUpgrade,
  createProgressionState,
  getUnlockedEvolutionIds,
  grantBloodXp,
  totalXpRequiredForLevel,
  UPGRADE_DEFINITIONS,
  UPGRADE_IDS,
  setActiveCurses,
  type CurseId,
  DEFAULT_UPGRADE_DRAFT_RULES,
  UpgradeDraftSession,
} from './game/progression';
import {
  createGameState,
  applyEnemySlow,
  damageEnemiesWithBall,
  damageEnemiesWithSecondary,
  resetGameState,
  resetKickoffFormation,
  spawnEliteEnemy,
  spawnGoalkeeperGuard,
  updateEnemies,
  updatePlayer,
} from './game/simulation/gameState';
import { detectOpponentGoalCrossing, OPPONENT_GOAL_LINE_Z } from './game/field';
import {
  createEnvironmentInteraction,
  createPitchEventDirectorState,
  damageEnvironmentInteraction,
  findInteractionHit,
  resetPitchEventDirector,
  spawnEnemyFormation,
  updateEliteModifiers,
  updateEnvironmentInteractions,
  updatePitchEventDirector,
  type EliteModifierBinding,
  type EnvironmentInteractionEvent,
  type EnvironmentInteractionState,
} from './game/encounters';
import { GoalComboSystem } from './game/scoring';
import {
  createTutorialRunState,
  tutorialAssistsFor,
  TutorialTracker,
  updateTutorialRun,
  type TutorialRunState,
  type TutorialSignal,
} from './game/tutorial';
import { RunTelemetry } from './game/stats';
import { PhysicsWorld } from './physics/PhysicsWorld';
import { RenderBridge } from './render/adapters/RenderBridge';
import { CameraController } from './render/app/CameraController';
import { createRenderer } from './render/app/createRenderer';
import { applyStadiumSelection, createScene } from './render/app/createScene';
import { GoalBeacon } from './render/objects/GoalBeacon';
import { CountGoalkeeperVisual } from './render/objects/CountGoalkeeperVisual';
import { BloodShardRenderer } from './render/objects/BloodShardRenderer';
import { SecondaryWeaponRenderer } from './render/objects/SecondaryWeaponRenderer';
import { AimGuide } from './render/objects/AimGuide';
import { PhaseAtmosphere } from './render/objects/PhaseAtmosphere';
import { EncounterRenderer } from './render/objects/EncounterRenderer';
import { StadiumPhaseVisual } from './render/objects/StadiumPhaseVisual';
import { StadiumAmbience } from './render/objects/StadiumAmbience';
import { ArenaBeautyPass } from './render/objects/ArenaBeautyPass';
import { SettingsStore, type PlayerSettings } from './settings/SettingsStore';
import {
  accountLevelForXp,
  contentUnlockSummary,
  masteryLevelForXp,
  masteryModifierBonusFor,
  ProfileStore,
  CharacterCustomizationStore,
  type ProfileStadiumId,
  type RunSettlement,
} from './profile';
import { Hud } from './ui/Hud';
import { CareerOverlay } from './ui/CareerOverlay';
import { CurseOverlay } from './ui/CurseOverlay';
import { EvolutionToast } from './ui/EvolutionToast';
import { HalftimeOverlay } from './ui/HalftimeOverlay';
import { MatchAnnouncement } from './ui/MatchAnnouncement';
import { PauseOverlay } from './ui/PauseOverlay';
import { ResultsOverlay } from './ui/ResultsOverlay';
import { SettingsOverlay } from './ui/SettingsOverlay';
import { TutorialPrompt } from './ui/TutorialPrompt';
import { UpgradeOverlay } from './ui/UpgradeOverlay';
import { DifficultyOverlay } from './ui/DifficultyOverlay';
import { ReplayHighlightBuffer } from './game/replay';
import { CharacterCreatorOverlay } from './ui/CharacterCreatorOverlay';

const FIXED_STEP = 1 / 60;
const MAX_FRAME_TIME = 0.1;
const MATCH_CONFIG = FULL_MATCH_CONFIG;
const TUTORIAL_STORAGE_KEY = 'blood-league-kickoff:tutorial-complete';
const NEUTRAL_ULTIMATE_EFFECTS: Readonly<CharacterUltimateEffects> = Object.freeze({
  movementSpeedMultiplier: 1,
  dashCooldownMultiplier: 1,
  ballDamageMultiplier: 1,
  eliteDamageMultiplier: 1,
  recallSpeedMultiplier: 1,
  volleyWindowBonus: 0,
  pickupRadiusMultiplier: 1,
  damageTakenMultiplier: 1,
  knockbackMultiplier: 1,
});
const MINIBOSS_TARGET_IDS: Readonly<Record<MinibossKind, number>> = Object.freeze({
  crimsonCaptain: -20_001,
  graveyardPlaymaker: -20_002,
});
const spawnDirectorInputScratch: {
  stage: MatchStage;
  stageElapsed: number;
  matchElapsed: number;
} = { stage: 'opening', stageElapsed: 0, matchElapsed: 0 };

function createRunId(): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') return crypto.randomUUID();
  return `run-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
}

async function bootstrap(): Promise<void> {
  const root = document.getElementById('app');
  if (!root) throw new Error('Missing application root');

  const settingsStore = new SettingsStore();
  const profileStore = new ProfileStore();
  const characterCustomizationStore = new CharacterCustomizationStore();
  const createUpgradeDraft = () =>
    new UpgradeDraftSession({
      ...DEFAULT_UPGRADE_DRAFT_RULES,
      allowedUpgradeIds: contentUnlockSummary(profileStore.value).upgradeIds,
    });
  let upgradeDraft = createUpgradeDraft();
  let activeDifficultyRuleset: DifficultyRuleset = createDifficultyRuleset('professional');
  let activeMatchConfig = scaleMatchConfigForDifficulty(MATCH_CONFIG, activeDifficultyRuleset);
  let selectedCharacterId: CharacterId = profileStore.value.selectedCharacterId;
  const createSelectedProgression = (characterId: CharacterId) => {
    const masteryLevel = masteryLevelForXp(profileStore.value.characterMastery[characterId].xp);
    const progressionState = createProgressionState(
      characterId,
      masteryModifierBonusFor(characterId, masteryLevel),
    );
    progressionState.upgradeStacks = applyStartingLoadout(progressionState.upgradeStacks, characterId);
    const masteryStartingBonus = contentUnlockSummary(profileStore.value).startingBonusUpgradeIds[
      characterId
    ];
    if (masteryStartingBonus) {
      progressionState.upgradeStacks[masteryStartingBonus] = Math.min(
        UPGRADE_DEFINITIONS[masteryStartingBonus].maxStacks,
        progressionState.upgradeStacks[masteryStartingBonus] + 1,
      );
    }
    progressionState.modifiers = calculateModifiers(
      progressionState.upgradeStacks,
      progressionState.evolutions,
      characterId,
      progressionState.masteryModifierBonus,
    );
    return progressionState;
  };
  let selectedRunMode: RunMode = 'standard';
  let selectedCurses: CurseId[] = [];
  let runDescriptor = createRunDescriptor({ mode: selectedRunMode, rulesetVersion: BUILD_METADATA.version });
  let runRandomStreams = createRunRandomStreams(runDescriptor);
  let activeRivalTeam = selectRivalTeam(runDescriptor.seed);
  let matchModifierState = createMatchModifierState(activeRivalTeam);
  const prepareRun = (mode: RunMode = selectedRunMode, seed?: string): void => {
    selectedRunMode = mode;
    runDescriptor = createRunDescriptor({ mode, seed, rulesetVersion: BUILD_METADATA.version });
    runRandomStreams = createRunRandomStreams(runDescriptor);
    activeRivalTeam = selectRivalTeam(runDescriptor.seed);
    matchModifierState = createMatchModifierState(activeRivalTeam);
    upgradeDraft = createUpgradeDraft();
  };
  let playerSettings = settingsStore.value;
  const renderer = createRenderer(root);
  const scene = createScene(playerSettings.stadiumSelection);
  let appliedStadiumSelection = playerSettings.stadiumSelection;
  let activeStadiumId = scene.getObjectByName('stadium-environment')?.userData.variantId as ProfileStadiumId;
  const cameraController = new CameraController();
  const combatFeedback = new CombatFeedbackSystem();
  const input = new InputController(renderer.domElement);
  const audio = new AudioManager();
  audio.setMatchIntensity('menu');
  const physics = await PhysicsWorld.create();
  const state = createGameState();
  const denseWaveStress = readDenseWaveStressMode(window.location.search, import.meta.env.DEV);
  const runtimeDiagnostics = readRuntimeDiagnosticsMode(window.location.search, import.meta.env.DEV);
  if (denseWaveStress) applyDenseWaveStressFormation(state);
  const qaScenario = readQaScenario(window.location.search, import.meta.env.DEV);
  const qaEvolutionId = readQaEvolutionId(window.location.search, import.meta.env.DEV);
  const qaEvolutionFixture = qaEvolutionId ? createQaEvolutionFixture(qaEvolutionId) : null;
  const qaTerminalFixture =
    qaScenario === 'victory' || qaScenario === 'defeat' ? createQaTerminalFixture(qaScenario) : null;
  if (qaTerminalFixture) {
    state.phase = qaTerminalFixture.gamePhase;
    state.elapsed = qaTerminalFixture.elapsed;
    state.score = qaTerminalFixture.score;
    state.kills = qaTerminalFixture.kills;
    state.player.health = qaScenario === 'victory' ? 42 : 0;
    state.enemies.length = 0;
  }
  if (
    qaScenario === 'upgrade' ||
    qaScenario === 'evolution' ||
    qaScenario === 'goal' ||
    qaScenario === 'boss'
  ) {
    state.phase = 'playing';
  }
  if (qaScenario === 'goal') {
    state.player.position.z = OPPONENT_GOAL_LINE_Z + 18;
    state.player.previousPosition = { ...state.player.position };
    physics.reset(state.player.position);
  }
  if (qaScenario === 'boss') {
    state.player.position.z = OPPONENT_GOAL_LINE_Z + 15;
    state.player.previousPosition = { ...state.player.position };
    state.player.invulnerability = 9_999;
    physics.reset(state.player.position);
  }
  const bridge = new RenderBridge(scene);
  bridge.setCharacter(selectedCharacterId);
  bridge.setCharacterCustomization(characterCustomizationStore.value);
  const aimGuide = new AimGuide(scene);
  const goalBeacon = new GoalBeacon(scene);
  const bossVisual = new CountGoalkeeperVisual(scene);
  const encounterRenderer = new EncounterRenderer(scene);
  const bloodShards = new BloodShardSystem();
  const bloodShardRenderer = new BloodShardRenderer(scene, bloodShards.state.capacity);
  const secondaryWeapons = new SecondaryWeaponSystem();
  const weaponExpansion = new WeaponExpansionSystem();
  const footballArmory = new FootballArmorySystem();
  let characterUltimate = new CharacterUltimateSystem(selectedCharacterId);
  const runTelemetry = new RunTelemetry();
  const goalCombo = new GoalComboSystem();
  let lastKickOrigin = { x: state.player.position.x, z: state.player.position.z };
  let lastKickWasVolley = false;
  let reboundsSinceKick = 0;
  let setupTouchesSinceKick = 0;
  const secondaryTargets: CombatTarget[] = [];
  const ultimateTargets: UltimateTarget[] = [];
  const armoryTargets: FootballArmoryTarget[] = [];
  const bossCombatTarget: UltimateTarget = {
    id: COUNT_GOALKEEPER_COMBAT_TARGET_ID,
    position: { x: 0, y: 0, z: 0 },
    radius: DEFAULT_COUNT_GOALKEEPER_CONFIG.radius,
    threat: 'boss',
  };
  const minibossCombatTarget: UltimateTarget = {
    id: MINIBOSS_TARGET_IDS.crimsonCaptain,
    position: { x: 0, y: 0, z: 0 },
    radius: MINIBOSS_CONFIGS.crimsonCaptain.radius,
    threat: 'boss',
  };
  const secondaryRenderState =
    denseWaveStress?.secondaryPools === 'full'
      ? createDenseSecondaryStressState()
      : secondaryWeapons.renderState;
  const secondaryRenderer = new SecondaryWeaponRenderer(scene);
  const atmosphere = new PhaseAtmosphere(scene);
  const stadiumPhaseVisual = new StadiumPhaseVisual(scene);
  const stadiumAmbience = new StadiumAmbience(scene);
  const arenaBeauty = new ArenaBeautyPass(scene);
  const hud = new Hud(root);
  hud.setTutorialRecommended(!hasCompletedTutorial());
  const careerOverlay = new CareerOverlay(root, profileStore, BUILD_METADATA.version, (characterId) => {
    selectedCharacterId = characterId;
    bridge.setCharacter(characterId);
    characterUltimate = new CharacterUltimateSystem(characterId);
    activeUltimateEffects = NEUTRAL_ULTIMATE_EFFECTS;
    if (state.phase === 'ready') {
      progression = createSelectedProgression(characterId);
      applyProgressionHealth(state.player.maxHealth);
    }
    audio.playUiSelect();
  });
  const characterCreatorOverlay = new CharacterCreatorOverlay(root, characterCustomizationStore, audio);
  const unsubscribeCharacterCustomization = characterCustomizationStore.subscribe((appearance) => {
    bridge.setCharacterCustomization(appearance);
  });
  const curseOverlay = new CurseOverlay(root);
  const difficultyOverlay = new DifficultyOverlay(root);
  const upgradeOverlay = new UpgradeOverlay(root);
  const settingsOverlay = new SettingsOverlay(root, settingsStore, (settings) => {
    playerSettings = settings;
    applyPlayerSettings(settings);
  });
  const pauseOverlay = new PauseOverlay(root);
  const replayHighlights = new ReplayHighlightBuffer();
  const resultsOverlay = new ResultsOverlay(root);
  const halftimeOverlay = new HalftimeOverlay(root);
  const announcement = new MatchAnnouncement(root);
  const evolutionToast = new EvolutionToast(root);
  const tutorialTracker = new TutorialTracker(true);
  const tutorialPrompt = new TutorialPrompt(root);
  const perf = new PerfMeter();
  const frameTimeSampler = new FrameTimeSampler();
  const gpuIdentity = readGpuIdentity(renderer);
  let frameDistribution = frameTimeSampler.snapshot();
  let estimatedGpuBytes = estimateSceneGpuBytes(scene);
  let performanceOverlayRefresh = 0;
  let gpuMemoryRefresh = 0;
  const perfCounters = createPerformanceCounters();
  const uninstallDenseWavePerformanceHook = denseWaveStress
    ? installDenseWavePerformanceHook(window, () => ({
        ...perf.snapshot,
        mode: 'dense-wave',
        frozenSimulation: true,
        renderQuality: playerSettings.renderQuality,
        renderScale: playerSettings.renderScale,
        fpsLimit: playerSettings.fpsLimit,
        viewportWidth: window.innerWidth,
        viewportHeight: window.innerHeight,
        pixelRatio: renderer.getPixelRatio(),
        secondaryPools: denseWaveStress.secondaryPools,
      }))
    : () => undefined;
  const uninstallRuntimeDiagnosticsHook = runtimeDiagnostics
    ? installRuntimeDiagnosticsHook(window, () => ({
        frameTime: frameTimeSampler.snapshot(),
        performance: perf.snapshot,
        renderer: {
          calls: renderer.info.render.calls,
          triangles: renderer.info.render.triangles,
          geometries: renderer.info.memory.geometries,
          textures: renderer.info.memory.textures,
          programs: renderer.info.programs?.length ?? 0,
          pixelRatio: renderer.getPixelRatio(),
          maxTextureSize: renderer.capabilities.maxTextureSize,
          maxSamples: renderer.capabilities.maxSamples,
          precision: renderer.capabilities.precision,
          webgl2: renderer.capabilities.isWebGL2,
        },
        viewport: {
          width: window.innerWidth,
          height: window.innerHeight,
          devicePixelRatio: window.devicePixelRatio,
        },
      }))
    : () => undefined;
  const clock = new THREE.Clock();
  const frameScheduler = new PresentationFrameScheduler();
  let accumulator = 0;
  let previousBallState = physics.ballState;
  let progression = qaEvolutionFixture?.state ?? createSelectedProgression(selectedCharacterId);
  if (qaScenario === 'upgrade') {
    progression = grantBloodXp(progression, totalXpRequiredForLevel(2)).state;
  }
  let focusKick = createFocusKickState();
  let match = qaTerminalFixture
    ? {
        ...createMatchDirectorState(),
        stage: qaTerminalFixture.matchStage,
        matchElapsed: qaTerminalFixture.elapsed,
        totalKills: qaTerminalFixture.kills,
        goalScored: qaTerminalFixture.goals > 0,
        goalsScored: qaTerminalFixture.goals,
        halftimeChoice: 'power' as const,
      }
    : qaScenario === 'goal'
      ? {
          ...createMatchDirectorState(),
          stage: 'goalOpportunity' as const,
          stageElapsed: 1,
          matchElapsed: MATCH_CONFIG.opening.deadlineMatchTime,
        }
      : qaScenario === 'boss'
        ? {
            ...createMatchDirectorState(),
            stage: 'finalWave' as const,
            stageElapsed: 12,
            matchElapsed: MATCH_CONFIG.bloodMoon.deadlineMatchTime + 35,
            goalsScored: 2,
            goalScored: true,
          }
        : createMatchDirectorState();
  let boss: CountGoalkeeperState | null =
    qaScenario === 'boss'
      ? (() => {
          const spawned = spawnCountGoalkeeper({ seed: 42417 });
          return {
            ...spawned,
            phase: 'desperation',
            action: 'telegraph',
            health: spawned.maxHealth * 0.2,
            phaseElapsed: 2,
            actionElapsed: 0.4,
          };
        })()
      : null;
  let miniboss: MinibossState | null = null;
  const spawnedMinibossKinds = new Set<MinibossKind>();
  const eliteModifierBindings: EliteModifierBinding[] = [];
  const pitchEventDirector = createPitchEventDirectorState();
  let environmentInteractions = createPitchInteractions();
  let lastEnvironmentHitId: number | null = null;
  if (qaScenario === 'goal') spawnGoalkeeperGuard(state);
  let resultsShown = false;
  let tutorialRunState: TutorialRunState = createTutorialRunState();
  let runId = createRunId();
  let pendingHalftimeChoice: HalftimeChoice | undefined;
  let halftimeDeadline = 0;
  let movementSpeedMultiplier = 1;
  let momentumSpeedMultiplier = 1;
  let momentumBoostTimer = 0;
  let kickPowerMultiplier = 1;
  let ballDamageMultiplier = 1;
  let recallSpeedMultiplier = 1;
  let volleyWindowBonus = 0;
  let fixedStepsThisFrame = 0;
  let footstepTravel = 0;
  let ultimateRequested = false;
  let activeUltimateEffects: Readonly<CharacterUltimateEffects> = NEUTRAL_ULTIMATE_EFFECTS;
  let disposed = false;
  const tutorialSignals = new Set<TutorialSignal>();
  const difficultyAdjustedEnemyIds = new Set<number>();
  atmosphere.setPhase(match.stage);
  stadiumPhaseVisual.setPhase(match.stage);

  const applyProgressionHealth = (previousMaxHealth = state.player.maxHealth): void => {
    const nextMaxHealth = Math.max(50, 100 + progression.modifiers.maxHealthBonus);
    if (nextMaxHealth > previousMaxHealth) {
      state.player.health = Math.min(nextMaxHealth, state.player.health + nextMaxHealth - previousMaxHealth);
      audio.playHeal();
    }
    state.player.maxHealth = nextMaxHealth;
    state.player.health = Math.min(state.player.health, nextMaxHealth);
  };
  applyProgressionHealth(100);

  const healPlayer = (amount: number, lifeSteal = false): void => {
    amount *= activeDifficultyRuleset.healingMultiplier;
    if (amount <= 0 || state.player.health <= 0 || state.player.health >= state.player.maxHealth) return;
    const before = state.player.health;
    state.player.health = Math.min(state.player.maxHealth, state.player.health + amount);
    if (state.player.health > before) {
      const restored = state.player.health - before;
      runTelemetry.recordHealing(restored);
      bridge.healBurst(state.player.position, Math.min(1.5, 0.55 + restored / 24));
      if (lifeSteal) audio.playLifeSteal();
      else audio.playHeal();
    }
  };

  const absorbIncomingDamage = (damage: number): number => {
    const barrier = weaponExpansion.absorbWithBloodBarrier(damage, progression.modifiers);
    if (barrier.absorbedDamage > 0) {
      runTelemetry.recordBlocked(barrier.absorbedDamage);
      audio.playWallImpact(0.9);
      bridge.volleyBurst(state.player.position, 1.15);
      input.rumble(0.42, 95);
    }
    return barrier.remainingDamage;
  };
  const damagePlayerFromEncounter = (rawDamage: number): void => {
    if (rawDamage <= 0 || state.player.invulnerability > 0) return;
    const damage = absorbIncomingDamage(
      rawDamage *
        activeDifficultyRuleset.enemyDamageMultiplier *
        progression.modifiers.damageTakenMultiplier *
        activeUltimateEffects.damageTakenMultiplier,
    );
    if (damage <= 0) return;
    state.player.health = Math.max(0, state.player.health - damage);
    state.player.invulnerability = 0.68;
    runTelemetry.recordDamageTaken(damage);
    audio.playPlayerHurt();
    bridge.hitBurst(state.player.position, Math.min(1.5, 0.55 + damage / 24));
    input.rumble(0.72, 145);
    cameraController.addImpulse(0.3);
    combatFeedback.addImpact({ kind: 'player-hit', damage });
    if (state.player.health <= 0) state.phase = 'dead';
  };
  const rewardEncounterKills = (
    kills: number,
    position: Readonly<{ x: number; y: number; z: number }>,
  ): void => {
    if (kills <= 0) return;
    bloodShards.spawnOnKill(position, kills * BLOOD_XP_PER_KILL, Math.min(9, kills * 3));
    audio.playKill(state.combo);
  };
  const damageEncounterArea = (
    position: Readonly<{ x: number; y: number; z: number }>,
    radius: number,
    damage: number,
  ): void => {
    const hits = state.enemies
      .filter(
        (enemy) =>
          Math.hypot(enemy.position.x - position.x, enemy.position.z - position.z) <= radius + enemy.radius,
      )
      .map((enemy) => ({
        targetId: enemy.id,
        damage,
        source: 'blood-bomb' as const,
        position: enemy.position,
      }));
    const result = damageEnemiesWithSecondary(
      state,
      hits,
      undefined,
      progression.modifiers.allDamageMultiplier,
      progression.modifiers.eliteDamageMultiplier,
    );
    rewardEncounterKills(result.kills, position);
    if (
      miniboss &&
      miniboss.phase !== 'defeated' &&
      Math.hypot(miniboss.position.x - position.x, miniboss.position.z - position.z) <=
        radius + MINIBOSS_CONFIGS[miniboss.kind].radius
    ) {
      const update = damageMiniboss(miniboss, { amount: damage, source: 'other' });
      miniboss = update.state;
      if (update.events.some((event) => event.type === 'defeated')) finishMiniboss();
    }
  };
  const finishMiniboss = (): void => {
    if (!miniboss) return;
    const defeatedKind = miniboss.kind;
    const defeatedPosition = miniboss.position;
    const reward =
      MINIBOSS_ENCOUNTER_SCHEDULE.find((definition) => definition.kind === defeatedKind)?.rewardShards ?? 18;
    state.score += defeatedKind === 'graveyardPlaymaker' ? 3_000 : 2_500;
    bloodShards.spawnOnKill(defeatedPosition, reward, Math.min(12, reward));
    characterUltimate.gainCharge(22);
    audio.playBossPhase('desperation');
    bridge.volleyBurst(defeatedPosition, 2);
    announcement.show('kickoff', `${MINIBOSS_CONFIGS[defeatedKind].name.toUpperCase()} DEFEATED`, 1.8);
    miniboss = null;
  };
  const applyMinibossDamage = (amount: number, source: 'ball' | 'secondary' | 'holy' | 'other'): void => {
    if (!miniboss || miniboss.phase === 'defeated' || amount <= 0) return;
    const update = damageMiniboss(miniboss, { amount, source });
    miniboss = update.state;
    const damaged = update.events.find((event) => event.type === 'damaged');
    if (damaged?.type === 'damaged') {
      bridge.hitBurst(miniboss.position, source === 'ball' ? 1.25 : 0.75);
      audio.playHit(source === 'ball' ? 1 : 0.65);
      runTelemetry.recordDamage(source === 'ball' ? 'primary-ball' : 'secondary-weapons', damaged.amount);
    }
    if (update.events.some((event) => event.type === 'defeated')) finishMiniboss();
  };
  const resolveEnvironmentEvents = (events: readonly EnvironmentInteractionEvent[]): void => {
    for (const event of events) {
      if (event.type === 'momentumBoost') {
        momentumSpeedMultiplier = Math.max(momentumSpeedMultiplier, event.speedMultiplier);
        momentumBoostTimer = Math.max(momentumBoostTimer, event.duration);
        state.player.dashCooldown = Math.max(0, state.player.dashCooldown - event.dashCooldownRefund);
        bridge.lightningBurst(event.position, 0.9);
        audio.playDash();
        input.rumble(0.24, 65);
        continue;
      }
      if (event.type === 'barrierBroken') {
        bridge.hitBurst(event.position, 1.1);
        audio.playWallImpact(0.9);
        continue;
      }
      damageEncounterArea(event.position, event.radius, event.damage);
      if (event.type === 'barrelExploded') {
        damagePlayerFromEncounter(
          Math.hypot(
            state.player.position.x - event.position.x,
            state.player.position.z - event.position.z,
          ) <= event.radius
            ? event.damage
            : 0,
        );
        bridge.volleyBurst(event.position, 1.7);
        cameraController.addImpulse(0.3);
      } else {
        bridge.frostBurst(event.position, 0.82);
      }
    }
  };
  const uninstallQaSnapshotHook = qaScenario
    ? installQaSnapshotHook(window, () => ({
        scenario: qaScenario,
        gamePhase: state.phase,
        matchStage: match.stage,
        resultsVisible: resultsOverlay.isVisible,
        resultsOutcome:
          resultsOverlay.isVisible && state.phase === 'won'
            ? 'victory'
            : resultsOverlay.isVisible && state.phase === 'dead'
              ? 'defeat'
              : null,
        upgradeVisible: upgradeOverlay.isVisible,
        evolutionVisible: evolutionToast.isVisible,
        requestedEvolutionId: qaEvolutionId,
        unlockedEvolutionIds: getUnlockedEvolutionIds(progression),
        evolutionToastId: evolutionToast.currentEvolutionId,
        evolutionToastName: evolutionToast.currentName,
        pointerLocked: input.isLocked,
      }))
    : () => undefined;

  const chargeFocusKick = (action: FocusKickCombatAction, count = 1): void => {
    for (let index = 0; index < count; index += 1) {
      focusKick = applyFocusKickCombatAction(focusKick, action);
    }
  };

  const refreshCombatTargets = (): void => {
    secondaryTargets.length = 0;
    ultimateTargets.length = 0;
    armoryTargets.length = 0;
    for (const enemy of state.enemies) {
      secondaryTargets.push(enemy);
      ultimateTargets.push({
        id: enemy.id,
        position: enemy.position,
        radius: enemy.radius,
        threat: enemy.elite ? 'elite' : 'normal',
      });
      armoryTargets.push({
        id: enemy.id,
        position: enemy.position,
        radius: enemy.radius,
        healthRatio: Math.max(0, enemy.hitPoints / Math.max(1, enemy.maxHitPoints)),
      });
    }
    if (boss && isCountGoalkeeperDamageable(boss)) {
      bossCombatTarget.position = boss.position;
      secondaryTargets.push(bossCombatTarget);
      ultimateTargets.push(bossCombatTarget);
      armoryTargets.push({
        ...bossCombatTarget,
        healthRatio: Math.max(0, boss.health / Math.max(1, boss.maxHealth)),
      });
    }
    if (miniboss && miniboss.phase !== 'defeated') {
      const config = MINIBOSS_CONFIGS[miniboss.kind];
      minibossCombatTarget.id = MINIBOSS_TARGET_IDS[miniboss.kind];
      minibossCombatTarget.position = miniboss.position;
      minibossCombatTarget.radius = config.radius;
      secondaryTargets.push(minibossCombatTarget);
      ultimateTargets.push(minibossCombatTarget);
      armoryTargets.push({
        ...minibossCombatTarget,
        healthRatio: Math.max(0, miniboss.health / Math.max(1, miniboss.maxHealth)),
      });
    }
  };

  const triggerPrimaryImpactWeapons = (targetId: number, position: CombatTarget['position']): void => {
    secondaryWeapons.triggerChainLightning(targetId, position, progression.modifiers);
    secondaryWeapons.triggerFrostBurst(position, progression.modifiers);
    secondaryWeapons.triggerMultiBall({
      origin: position,
      direction: physics.ballVelocity,
      baseDamage:
        (physics.ballSpeed > 17 ? 2 : 1) *
        progression.modifiers.ballDamageMultiplier *
        ballDamageMultiplier *
        activeDifficultyRuleset.playerDamageMultiplier,
      modifiers: progression.modifiers,
    });
    secondaryWeapons.triggerBlackHole(position, progression.modifiers);
  };

  const signalTutorial = (signal: TutorialSignal): void => {
    if (tutorialTracker.complete || tutorialSignals.has(signal)) return;
    tutorialSignals.add(signal);
    const update = tutorialTracker.signal(signal);
    tutorialPrompt.update(update.state);
    if (selectedRunMode === 'tutorial') {
      for (const assist of tutorialAssistsFor(update.completedNow)) {
        if (assist === 'prepare-ultimate') {
          characterUltimate.reset(characterUltimate.state.chargeRequired);
          announcement.show('kickoff', 'ULTIMATE READY · PRESS Q', 1.8);
          audio.playUnlock();
        } else {
          bloodShards.spawnOnKill({ ...state.player.position }, totalXpRequiredForLevel(2) + 12, 8);
          announcement.show('kickoff', 'BLOOD SHARDS RELEASED · COLLECT THEM', 1.8);
        }
      }
    }
    if (update.tutorialCompleted) {
      persistTutorialCompletion();
      hud.setTutorialRecommended(false);
    }
  };

  const offerUpgrade = (): void => {
    if (disposed) return;
    if (
      upgradeOverlay.isVisible ||
      settingsOverlay.isVisible ||
      careerOverlay.isVisible ||
      halftimeOverlay.isVisible ||
      progression.pendingLevelUps <= 0 ||
      state.phase !== 'playing'
    )
      return;
    const choices = qaEvolutionFixture
      ? [qaEvolutionFixture.finalUpgradeId]
      : upgradeDraft.roll(progression, runRandomStreams.upgrades.next);
    if (choices.length === 0) return;
    if (input.isLocked) void document.exitPointerLock();
    const draftControls = qaEvolutionFixture
      ? undefined
      : {
          resources: () => upgradeDraft.state.resources,
          onReroll: () => upgradeDraft.reroll(progression, runRandomStreams.upgrades.next),
          onBanish: (upgradeId: (typeof choices)[number]) =>
            upgradeDraft.banish(upgradeId, progression, runRandomStreams.upgrades.next),
          onSkip: () => {
            if (!upgradeDraft.skip()) return false;
            progression = { ...progression, pendingLevelUps: Math.max(0, progression.pendingLevelUps - 1) };
            if (progression.pendingLevelUps > 0) window.setTimeout(offerUpgrade, 0);
            else input.requestPointerLock();
            return true;
          },
        };
    void upgradeOverlay.show(choices, progression, undefined, draftControls).then((upgradeId) => {
      if (!upgradeId || state.phase !== 'playing') return;
      if (!qaEvolutionFixture && !upgradeDraft.accept(upgradeId)) return;
      const result = chooseUpgrade(progression, upgradeId);
      if (!result.applied) return;
      const previousMaxHealth = state.player.maxHealth;
      progression = result.state;
      applyProgressionHealth(previousMaxHealth);
      signalTutorial('upgrade-selected');
      audio.playUpgradeSelected();
      audio.playPhase(progression.level);
      if (result.evolutionEvents.length > 0) {
        audio.playEvolutionUnlock();
        audio.playEvolutionImpact();
        bridge.volleyBurst(state.player.position, 1.8);
        cameraController.volleyImpulse(1.2);
        evolutionToast.enqueue(result.evolutionEvents);
      }
      if (progression.pendingLevelUps > 0) window.setTimeout(offerUpgrade, 0);
      else input.requestPointerLock();
    });
  };

  const resize = (): void => {
    renderer.setSize(window.innerWidth, window.innerHeight);
    const qualityScale =
      playerSettings.renderQuality === 'performance'
        ? 0.82
        : playerSettings.renderQuality === 'quality'
          ? 1.12
          : 1;
    renderer.setPixelRatio(
      Math.min(window.devicePixelRatio * playerSettings.renderScale * qualityScale, 1.6),
    );
    cameraController.resize(window.innerWidth, window.innerHeight);
  };
  const applyPlayerSettings = (settings: Readonly<PlayerSettings>): void => {
    if (settings.stadiumSelection !== appliedStadiumSelection) {
      activeStadiumId = applyStadiumSelection(scene, settings.stadiumSelection);
      appliedStadiumSelection = settings.stadiumSelection;
    }
    audio.setVolume(settings.masterVolume);
    audio.setMusicVolume(settings.musicVolume);
    audio.setEffectsVolume(settings.effectsVolume);
    cameraController.setSensitivity(settings.mouseSensitivity);
    cameraController.setInvertVerticalLook(settings.invertVerticalLook);
    cameraController.setShakeIntensity(
      settings.reducedMotion
        ? 0
        : settings.reducedCameraShake
          ? Math.min(0.28, settings.screenShakeIntensity)
          : settings.screenShakeIntensity,
    );
    input.setKeyBindings(settings.keyBindings);
    input.setGamepadSettings(settings.gamepadLookSensitivity, settings.gamepadVibration);
    hud.setControlBindings(settings.keyBindings);
    bridge.setReducedFlashes(settings.reducedFlashes);
    bridge.setRenderQuality(settings.renderQuality);
    arenaBeauty.setQuality(settings.renderQuality);
    arenaBeauty.setReducedMotion(settings.reducedMotion);
    root.style.setProperty('--hud-scale', String(settings.hudScale));
    root.dataset.colorVision = settings.colorVisionMode;
    root.classList.toggle('high-contrast-hud', settings.highContrastHud);
    root.classList.toggle('reduced-flashes', settings.reducedFlashes);
    root.classList.toggle('reduced-motion', settings.reducedMotion);
    root.classList.toggle('performance-overlay-enabled', settings.performanceOverlay);
    root.dataset.damageNumbers = settings.damageNumbers ? 'visible' : 'hidden';
    renderer.shadowMap.enabled = settings.renderQuality !== 'performance';
    resize();
  };
  window.addEventListener('resize', resize);
  applyPlayerSettings(playerSettings);
  cameraController.update(state.player.position, 1);

  const begin = (): void => {
    void audio.unlock();
    if (state.phase === 'ready') state.phase = 'playing';
    audio.playKickoff();
    audio.playPhase(0);
    audio.setMatchIntensity('opening');
    replayHighlights.clear();
    replayHighlights.record({ kind: 'kickoff', matchTime: 0, label: 'Opening kickoff' });
    announcement.show(
      'kickoff',
      `${CHARACTER_DEFINITIONS[selectedCharacterId].name.toUpperCase()} VS ${activeRivalTeam.name.toUpperCase()}`,
    );
    hud.setTutorialMode(selectedRunMode === 'tutorial');
    tutorialPrompt.update(tutorialTracker.state);
    hud.start();
    input.requestPointerLock();
  };
  const prepareProgressionForRun = (): void => {
    progression = setActiveCurses(createSelectedProgression(selectedCharacterId), selectedCurses);
    applyProgressionHealth(100);
  };
  const beginChallengeRun = (mode: 'daily' | 'weekly'): void => {
    selectedCurses = [];
    activeDifficultyRuleset = createDifficultyRuleset('professional');
    activeMatchConfig = scaleMatchConfigForDifficulty(MATCH_CONFIG, activeDifficultyRuleset);
    prepareRun(mode);
    prepareProgressionForRun();
    begin();
    announcement.show('kickoff', `${mode.toUpperCase()} CHALLENGE · SEED ${runDescriptor.seedCode}`);
  };
  const beginTutorialRun = (): void => {
    selectedCurses = [];
    activeDifficultyRuleset = {
      ...createDifficultyRuleset('rookie'),
      enemyHealthMultiplier: 0.64,
      enemyDamageMultiplier: 0.36,
      spawnRateMultiplier: 0.48,
      rewardMultiplier: 0,
    };
    activeMatchConfig = TUTORIAL_MATCH_CONFIG;
    prepareRun('tutorial');
    prepareProgressionForRun();
    tutorialSignals.clear();
    tutorialTracker.reset(false);
    tutorialRunState = createTutorialRunState();
    begin();
    announcement.show('kickoff', 'GUIDED KICKOFF · FOLLOW THE COACH', 2.4);
  };
  const resetEncounterState = (): void => {
    miniboss = null;
    spawnedMinibossKinds.clear();
    eliteModifierBindings.length = 0;
    resetPitchEventDirector(pitchEventDirector);
    environmentInteractions = createPitchInteractions();
    lastEnvironmentHitId = null;
    encounterRenderer.reset();
    difficultyAdjustedEnemyIds.clear();
  };
  const restart = (): void => {
    void audio.unlock();
    resetGameState(state);
    physics.reset(state.player.position);
    bridge.reset();
    aimGuide.reset();
    goalBeacon.reset();
    bossVisual.reset();
    resetEncounterState();
    bloodShards.reset();
    bloodShardRenderer.reset();
    secondaryWeapons.reset();
    weaponExpansion.reset();
    footballArmory.reset();
    runTelemetry.reset();
    combatFeedback.reset();
    goalCombo.reset();
    secondaryRenderer.reset();
    atmosphere.reset();
    stadiumPhaseVisual.reset();
    stadiumAmbience.reset();
    announcement.reset();
    evolutionToast.reset();
    halftimeOverlay.reset();
    upgradeOverlay.reset();
    settingsOverlay.hide();
    careerOverlay.hide();
    characterCreatorOverlay.hide(false);
    curseOverlay.reset();
    pauseOverlay.hide();
    replayHighlights.clear();
    resultsOverlay.reset();
    hud.reset();
    selectedCharacterId = profileStore.value.selectedCharacterId;
    bridge.setCharacter(selectedCharacterId);
    characterUltimate = new CharacterUltimateSystem(selectedCharacterId);
    activeUltimateEffects = NEUTRAL_ULTIMATE_EFFECTS;
    prepareRun(selectedRunMode);
    prepareProgressionForRun();
    focusKick = resetFocusKick();
    match = createMatchDirectorState();
    boss = null;
    resultsShown = false;
    runId = createRunId();
    perf.reset();
    tutorialSignals.clear();
    tutorialTracker.reset(selectedRunMode !== 'tutorial');
    tutorialRunState = createTutorialRunState();
    tutorialPrompt.reset();
    pendingHalftimeChoice = undefined;
    movementSpeedMultiplier = 1;
    momentumSpeedMultiplier = 1;
    momentumBoostTimer = 0;
    kickPowerMultiplier = 1;
    ballDamageMultiplier = 1;
    recallSpeedMultiplier = 1;
    volleyWindowBonus = 0;
    state.phase = 'playing';
    previousBallState = physics.ballState;
    audio.playKickoff();
    audio.playPhase(0);
    audio.setMatchIntensity('opening');
    replayHighlights.record({ kind: 'kickoff', matchTime: 0, label: 'Restart kickoff' });
    announcement.show(
      'kickoff',
      `${CHARACTER_DEFINITIONS[selectedCharacterId].name.toUpperCase()} VS ${activeRivalTeam.name.toUpperCase()}`,
    );
    hud.setTutorialMode(selectedRunMode === 'tutorial');
    tutorialPrompt.update(tutorialTracker.state);
    input.requestPointerLock();
  };
  const kickoffButton = hud.kickoffButton;
  const tutorialRunButton = hud.tutorialRunButton;
  const dailyRunButton = hud.dailyRunButton;
  const weeklyRunButton = hud.weeklyRunButton;
  const customSeedButton = hud.customSeedButton;
  const customSeedInput = hud.customSeedInput;
  const cursedRunButton = hud.cursedRunButton;
  const difficultyRunButton = hud.difficultyRunButton;
  const restartButton = hud.restartButton;
  const victoryRestartButton = hud.victoryRestartButton;
  kickoffButton.addEventListener('click', () => {
    selectedCurses = [];
    activeDifficultyRuleset = createDifficultyRuleset('professional');
    activeMatchConfig = scaleMatchConfigForDifficulty(MATCH_CONFIG, activeDifficultyRuleset);
    prepareRun('standard');
    prepareProgressionForRun();
    begin();
  });
  tutorialRunButton.addEventListener('click', beginTutorialRun);
  dailyRunButton.addEventListener('click', () => beginChallengeRun('daily'));
  weeklyRunButton.addEventListener('click', () => beginChallengeRun('weekly'));
  const beginCustomSeedRun = (): void => {
    const seed = customSeedInput.value.trim();
    if (!seed) {
      customSeedInput.focus();
      return;
    }
    selectedCurses = [];
    activeDifficultyRuleset = createDifficultyRuleset('professional');
    activeMatchConfig = scaleMatchConfigForDifficulty(MATCH_CONFIG, activeDifficultyRuleset);
    prepareRun('custom', seed);
    prepareProgressionForRun();
    begin();
    announcement.show('kickoff', `CUSTOM RUN · SEED ${runDescriptor.seedCode}`);
  };
  customSeedButton.addEventListener('click', beginCustomSeedRun);
  customSeedInput.addEventListener('keydown', (event) => {
    if (event.key === 'Enter') beginCustomSeedRun();
  });
  cursedRunButton.addEventListener('click', () => {
    curseOverlay.show((curseIds) => {
      selectedCurses = [...curseIds];
      activeDifficultyRuleset = createDifficultyRuleset('professional');
      activeMatchConfig = scaleMatchConfigForDifficulty(MATCH_CONFIG, activeDifficultyRuleset);
      audio.playCurseAccepted();
      prepareRun('standard');
      prepareProgressionForRun();
      begin();
      announcement.show('kickoff', `${selectedCurses.length} CURSES ACCEPTED`);
    }, contentUnlockSummary(profileStore.value).curseIds);
  });
  difficultyRunButton.addEventListener('click', () => {
    difficultyOverlay.show(accountLevelForXp(profileStore.value.accountXp), (ruleset) => {
      selectedCurses = [];
      prepareRun('standard');
      activeDifficultyRuleset = { ...ruleset, modifierIds: [...ruleset.modifierIds] };
      activeMatchConfig = scaleMatchConfigForDifficulty(MATCH_CONFIG, activeDifficultyRuleset);
      prepareProgressionForRun();
      begin();
      announcement.show(
        'kickoff',
        `${activeDifficultyRuleset.difficultyId.toUpperCase()} LEAGUE · ${Math.round(activeDifficultyRuleset.rewardMultiplier * 100)}% REWARDS`,
      );
    });
  });
  restartButton.addEventListener('click', restart);
  victoryRestartButton.addEventListener('click', restart);
  const openSettings = (): void => {
    if (input.isLocked) void document.exitPointerLock();
    settingsOverlay.show();
    audio.playUiOpen();
  };
  const openCareer = (): void => {
    if (input.isLocked) void document.exitPointerLock();
    careerOverlay.show();
    audio.playUiOpen();
  };
  const openCharacterCreator = (): void => {
    void audio.unlock();
    if (input.isLocked) void document.exitPointerLock();
    characterCreatorOverlay.show();
  };
  const settingsButton = hud.settingsButton;
  const titleSettingsButton = hud.titleSettingsButton;
  const titleCareerButton = hud.titleCareerButton;
  const titleCharacterCreatorButton = hud.titleCharacterCreatorButton;
  const titleQuitButton = hud.titleQuitButton;
  settingsButton.addEventListener('click', openSettings);
  titleSettingsButton.addEventListener('click', openSettings);
  titleCareerButton.addEventListener('click', openCareer);
  titleCharacterCreatorButton.addEventListener('click', openCharacterCreator);
  const quitGame = (): void => {
    void window.desktopRuntime?.window.quit();
  };
  titleQuitButton.addEventListener('click', quitGame);
  const returnToMenu = (): void => {
    resetGameState(state);
    physics.reset(state.player.position);
    bridge.reset();
    bossVisual.reset();
    resetEncounterState();
    aimGuide.reset();
    bloodShards.reset();
    bloodShardRenderer.reset();
    secondaryWeapons.reset();
    weaponExpansion.reset();
    footballArmory.reset();
    runTelemetry.reset();
    combatFeedback.reset();
    goalCombo.reset();
    secondaryRenderer.reset();
    atmosphere.reset();
    stadiumPhaseVisual.reset();
    announcement.reset();
    evolutionToast.reset();
    halftimeOverlay.reset();
    resultsOverlay.reset();
    careerOverlay.hide();
    characterCreatorOverlay.hide(false);
    curseOverlay.reset();
    difficultyOverlay.reset();
    pauseOverlay.hide();
    replayHighlights.clear();
    state.phase = 'ready';
    selectedCharacterId = profileStore.value.selectedCharacterId;
    bridge.setCharacter(selectedCharacterId);
    characterUltimate = new CharacterUltimateSystem(selectedCharacterId);
    activeUltimateEffects = NEUTRAL_ULTIMATE_EFFECTS;
    prepareRun('standard');
    selectedCurses = [];
    activeDifficultyRuleset = createDifficultyRuleset('professional');
    activeMatchConfig = scaleMatchConfigForDifficulty(MATCH_CONFIG, activeDifficultyRuleset);
    progression = createSelectedProgression(selectedCharacterId);
    applyProgressionHealth(100);
    focusKick = resetFocusKick();
    match = createMatchDirectorState();
    boss = null;
    resultsShown = false;
    runId = createRunId();
    perf.reset();
    tutorialSignals.clear();
    tutorialTracker.reset(true);
    tutorialRunState = createTutorialRunState();
    tutorialPrompt.reset();
    audio.setMatchIntensity('menu');
    pendingHalftimeChoice = undefined;
    movementSpeedMultiplier = 1;
    momentumSpeedMultiplier = 1;
    momentumBoostTimer = 0;
    kickPowerMultiplier = 1;
    ballDamageMultiplier = 1;
    recallSpeedMultiplier = 1;
    volleyWindowBonus = 0;
    hud.showMenu();
  };
  const showPause = (): void => {
    if (
      state.phase !== 'playing' ||
      upgradeOverlay.isVisible ||
      settingsOverlay.isVisible ||
      characterCreatorOverlay.isVisible ||
      halftimeOverlay.isVisible
    )
      return;
    if (input.isLocked) void document.exitPointerLock();
    pauseOverlay.show({
      onResume: () => {
        audio.setMatchIntensity(match.stage);
        input.requestPointerLock();
      },
      onSettings: openSettings,
      getTelemetry: () => runTelemetry.snapshot(),
      onRestart: restart,
      onMainMenu: returnToMenu,
    });
    audio.playUiOpen();
    audio.setMatchIntensity('paused');
  };
  const onGlobalKeyDown = (event: KeyboardEvent): void => {
    if (event.key === 'Escape' && !pauseOverlay.isVisible) showPause();
  };
  window.addEventListener('keydown', onGlobalKeyDown);
  const onUiFocus = (event: FocusEvent): void => {
    if (event.target instanceof HTMLElement && event.target.matches('button, input, select, [tabindex]'))
      audio.playUiNavigate();
  };
  root.addEventListener('focusin', onUiFocus);
  const onFirstAudioGesture = (): void => {
    root.removeEventListener('pointerdown', onFirstAudioGesture);
    void audio.unlock();
  };
  const onUiActivation = (event: MouseEvent): void => {
    const target = event.target instanceof Element ? event.target : null;
    if (!target?.closest('button')) return;
    audio.playUiSelect();
  };
  const onUiControlChange = (event: Event): void => {
    const target = event.target;
    if (target instanceof HTMLInputElement && target.type === 'checkbox') {
      audio.playUiToggle(target.checked);
    } else if (target instanceof HTMLSelectElement) {
      audio.playUiToggle(true);
    }
  };
  root.addEventListener('pointerdown', onFirstAudioGesture);
  root.addEventListener('click', onUiActivation);
  root.addEventListener('change', onUiControlChange);
  const onFocusLoss = (): void => showPause();
  const onVisibilityChange = (): void => {
    if (document.hidden) showPause();
  };
  window.addEventListener('blur', onFocusLoss);
  document.addEventListener('visibilitychange', onVisibilityChange);
  const onCanvasClick = (): void => {
    if (state.phase === 'ready') begin();
    else if (
      state.phase === 'playing' &&
      !input.isLocked &&
      !settingsOverlay.isVisible &&
      !careerOverlay.isVisible &&
      !characterCreatorOverlay.isVisible &&
      !pauseOverlay.isVisible &&
      !halftimeOverlay.isVisible
    )
      input.requestPointerLock();
  };
  renderer.domElement.addEventListener('click', onCanvasClick);

  renderer.setAnimationLoop((time) => {
    if (!frameScheduler.shouldRender(time, playerSettings.fpsLimit)) return;
    fixedStepsThisFrame = 0;
    const frameTime = Math.min(MAX_FRAME_TIME, clock.getDelta());
    const mouse = input.consumeMouseDelta();
    if (input.consumePause()) {
      if (pauseOverlay.isVisible) pauseOverlay.toggle();
      else showPause();
    }
    cameraController.applyMouseDelta(mouse.x, mouse.y);
    focusKick = stepFocusKick(focusKick, frameTime);
    if (
      input.consumeFocusKick() &&
      state.phase === 'playing' &&
      !upgradeOverlay.isVisible &&
      !settingsOverlay.isVisible &&
      !careerOverlay.isVisible &&
      !pauseOverlay.isVisible &&
      !halftimeOverlay.isVisible
    ) {
      focusKick = activateFocusKick(focusKick);
    }
    if (
      input.consumeCharacterUltimate() &&
      state.phase === 'playing' &&
      !upgradeOverlay.isVisible &&
      !settingsOverlay.isVisible &&
      !careerOverlay.isVisible &&
      !pauseOverlay.isVisible &&
      !halftimeOverlay.isVisible
    ) {
      ultimateRequested = true;
    }
    cameraController.setFocusMode(focusKick.phase === 'aiming');
    bridge.setFirstPerson(focusKick.phase === 'aiming');

    if (
      !denseWaveStress &&
      input.consumeRestart() &&
      state.phase !== 'ready' &&
      !upgradeOverlay.isVisible &&
      !settingsOverlay.isVisible
    )
      restart();
    refreshCombatTargets();
    const playerAim = resolvePlayerAim(
      state.player.position,
      cameraController.aimDirection(),
      secondaryTargets,
      playerSettings.aimAssistStrength,
    );
    const kick = input.consumeKick();
    if (
      state.phase === 'playing' &&
      !upgradeOverlay.isVisible &&
      !settingsOverlay.isVisible &&
      !careerOverlay.isVisible &&
      !pauseOverlay.isVisible &&
      !halftimeOverlay.isVisible &&
      kick
    ) {
      const focusShot = consumeFocusKickShot(focusKick);
      const aimDirection = playerAim.direction;
      const result =
        kick.technique === 'shot'
          ? physics.kick(
              state.player.position,
              aimDirection,
              kick.charge,
              {
                ...progression.modifiers,
                kickPowerMultiplier:
                  progression.modifiers.kickPowerMultiplier *
                  kickPowerMultiplier *
                  (focusShot.empowered ? 1.75 : 1) *
                  activeUltimateEffects.ballDamageMultiplier,
              },
              kick.curve * progression.modifiers.curveStrengthMultiplier,
            )
          : physics.pass(state.player.position, aimDirection, kick.technique);
      if (result) {
        const matchModifierEffects = getMatchModifierEffects(matchModifierState, activeRivalTeam);
        if (matchModifierEffects.multiballActive) {
          secondaryWeapons.triggerMultiBall({
            origin: state.player.position,
            direction: aimDirection,
            baseDamage: 1 + result.charge,
            modifiers: {
              ...progression.modifiers,
              multiBallCount: Math.max(
                progression.modifiers.multiBallCount,
                matchModifierEffects.multiballCount,
              ),
              multiBallDamageMultiplier: Math.max(
                progression.modifiers.multiBallDamageMultiplier,
                matchModifierEffects.multiballDamageMultiplier,
              ),
            },
          });
        }
        bridge.playPlayerTechnique(
          result.perfectVolley ? 'bicycle' : result.kind,
          0.75 + result.charge * 0.75,
          physics.ballPosition,
        );
        lastKickOrigin = { x: state.player.position.x, z: state.player.position.z };
        lastKickWasVolley = result.perfectVolley;
        reboundsSinceKick = 0;
        setupTouchesSinceKick = 0;
        combatFeedback.addImpact({
          kind: 'kick',
          damage: result.charge * 20,
          direction: aimDirection,
          perfect: result.perfectVolley,
        });
        runTelemetry.recordKick();
        if (result.charge >= 0.72) {
          weaponExpansion.triggerHolyPenaltyZone(state.player.position, progression.modifiers);
          footballArmory.triggerHeader(state.player.position, aimDirection, progression.modifiers);
        }
        if (focusShot.empowered) {
          focusKick = focusShot.state;
          bridge.volleyBurst(state.player.position, 2);
          cameraController.volleyImpulse(1.4);
        }
        signalTutorial('kick-demonstrated');
        audio.playKick(result.charge);
        input.rumble(0.25 + result.charge * 0.45, 85);
        if (result.perfectVolley) {
          replayHighlights.record({
            kind: 'perfect-volley',
            matchTime: match.matchElapsed,
            label: 'Perfect bicycle volley',
            focus: physics.ballPosition,
          });
          footballArmory.triggerBicycleKick(state.player.position, aimDirection, result.charge);
          runTelemetry.recordPerfectVolley();
          audio.playVolley();
          bridge.volleyBurst(physics.ballPosition, 1 + result.charge * 0.4);
          cameraController.volleyImpulse(1 + result.charge * 0.25);
        }
      }
    }
    physics.setRecall(
      state.phase === 'playing' &&
        !upgradeOverlay.isVisible &&
        !settingsOverlay.isVisible &&
        !careerOverlay.isVisible &&
        !pauseOverlay.isVisible &&
        !halftimeOverlay.isVisible &&
        input.recall,
      {
        recallSpeedMultiplier:
          progression.modifiers.recallSpeedMultiplier *
          recallSpeedMultiplier *
          activeUltimateEffects.recallSpeedMultiplier,
      },
      volleyWindowBonus + progression.modifiers.volleyWindowBonus + activeUltimateEffects.volleyWindowBonus,
    );

    const combatTimeScale = combatFeedback.consumeHitStop(frameTime) ? 0 : 1;
    accumulator += frameTime * combatTimeScale * getFocusKickTimeScale(focusKick);
    while (accumulator >= FIXED_STEP) {
      const simulationActive =
        !denseWaveStress &&
        state.phase === 'playing' &&
        !upgradeOverlay.isVisible &&
        !settingsOverlay.isVisible &&
        !pauseOverlay.isVisible &&
        !halftimeOverlay.isVisible;
      let ultimateBossDamageThisStep = 0;
      let ultimateMinibossDamageThisStep = 0;
      if (simulationActive) {
        const healthBeforeUpdate = state.player.health;
        refreshCombatTargets();
        const ultimateStep = characterUltimate.step({
          dt: FIXED_STEP,
          playerPosition: state.player.position,
          facingDirection: playerAim.direction,
          targets: ultimateTargets,
          activate: ultimateRequested,
        });
        ultimateRequested = false;
        activeUltimateEffects = ultimateStep.effects;
        if (ultimateStep.activated) {
          audio.playUltimate();
          signalTutorial('ultimate-demonstrated');
          input.rumble(0.9, 240);
          bridge.volleyBurst(state.player.position, 2.2);
          cameraController.volleyImpulse(1.35);
        }
        healPlayer(ultimateStep.healing);
        ultimateBossDamageThisStep = ultimateStep.hits.reduce(
          (total, hit) => total + (hit.targetId === COUNT_GOALKEEPER_COMBAT_TARGET_ID ? hit.damage : 0),
          0,
        );
        if (miniboss && miniboss.phase !== 'defeated') {
          const targetId = MINIBOSS_TARGET_IDS[miniboss.kind];
          ultimateMinibossDamageThisStep = ultimateStep.hits.reduce(
            (total, hit) => total + (hit.targetId === targetId ? hit.damage : 0),
            0,
          );
        }
        const ultimateDamage = damageEnemiesWithSecondary(
          state,
          ultimateStep.hits,
          COUNT_GOALKEEPER_COMBAT_TARGET_ID,
          progression.modifiers.allDamageMultiplier,
          progression.modifiers.eliteDamageMultiplier * ultimateStep.effects.eliteDamageMultiplier,
        );
        runTelemetry.recordDamage(
          'ultimate',
          ultimateStep.hits.reduce(
            (total, hit) => total + (hit.targetId === COUNT_GOALKEEPER_COMBAT_TARGET_ID ? 0 : hit.damage),
            0,
          ),
        );
        if (ultimateDamage.kills > 0) {
          bloodShards.spawnOnKill(
            state.player.position,
            ultimateDamage.kills * BLOOD_XP_PER_KILL,
            Math.min(9, ultimateDamage.kills * 3),
          );
          audio.playKill(state.combo);
        }
        for (const event of ultimateStep.events) {
          if (event.type === 'spectral-assist') bridge.lightningBurst(event.to, 0.85);
          if (event.type === 'redline-pulse') bridge.volleyBurst(event.position, 1.05);
          if (event.type === 'meteor-header') bridge.volleyBurst(event.position, 1.8);
          if (event.type === 'last-touch-strike') bridge.hitBurst(event.position, 1.7);
          if (event.type === 'full-pitch-pulse') bridge.frostBurst(event.position, 1.25);
          if (event.type === 'clean-sheet-aegis') bridge.volleyBurst(event.position, 1.45);
          if (event.type === 'ultimate-knockback') {
            const enemy = state.enemies.find((candidate) => candidate.id === event.targetId);
            if (enemy) {
              enemy.knockbackVelocity.x += event.force.x;
              enemy.knockbackVelocity.z += event.force.z;
            }
          }
        }
        const movement = input.movement(cameraController.yaw);
        if (Math.hypot(movement.x, movement.z) > 0.2) signalTutorial('movement-demonstrated');
        if (movement.dash) signalTutorial('dash-demonstrated');
        const dashWasActive = state.player.dashTime > 0;
        momentumBoostTimer = Math.max(0, momentumBoostTimer - FIXED_STEP);
        if (momentumBoostTimer <= 0) momentumSpeedMultiplier = 1;
        updatePlayer(
          state,
          movement,
          playerAim.facingYaw,
          FIXED_STEP,
          movementSpeedMultiplier *
            momentumSpeedMultiplier *
            progression.modifiers.movementSpeedMultiplier *
            activeUltimateEffects.movementSpeedMultiplier,
          progression.modifiers.dashCooldownMultiplier * activeUltimateEffects.dashCooldownMultiplier,
        );
        const stepDistance = Math.hypot(
          state.player.position.x - state.player.previousPosition.x,
          state.player.position.z - state.player.previousPosition.z,
        );
        if (stepDistance > 0.001) {
          footstepTravel += stepDistance;
          const stride = state.player.dashTime > 0 ? 1.75 : 1.15;
          if (footstepTravel >= stride) {
            footstepTravel %= stride;
            audio.playFootstep(
              'grass',
              Math.min(1, Math.hypot(state.player.velocity.x, state.player.velocity.z) / 12),
            );
          }
        } else footstepTravel = 0;
        const dashStarted = !dashWasActive && state.player.dashTime > 0;
        if (dashStarted) {
          footballArmory.triggerSlideTackle(state.player.position, state.player.dashDirection);
          bridge.groundBurst(state.player.position, 0.9);
          runTelemetry.recordDash();
          audio.playDash();
          input.rumble(0.32, 70);
          weaponExpansion.triggerDashShockwave(state.player.position, progression.modifiers);
        }
        spawnDirectorInputScratch.stage = match.stage;
        spawnDirectorInputScratch.stageElapsed =
          match.stageElapsed *
          activeDifficultyRuleset.spawnRateMultiplier *
          activeRivalTeam.pressureMultiplier;
        spawnDirectorInputScratch.matchElapsed =
          match.matchElapsed * activeDifficultyRuleset.spawnRateMultiplier;
        updateEnemies(
          state,
          FIXED_STEP,
          spawnDirectorInputScratch,
          runRandomStreams.spawn.next,
          physics.ballPosition,
          activeDifficultyRuleset.enemyDamageMultiplier *
            activeRivalTeam.enemyDamageMultiplier *
            progression.modifiers.damageTakenMultiplier *
            activeUltimateEffects.damageTakenMultiplier,
          absorbIncomingDamage,
        );
        if (selectedRunMode === 'tutorial') {
          state.player.health = Math.max(30, state.player.health);
          state.player.invulnerability = Math.max(0.12, state.player.invulnerability);
        }
        for (const enemy of state.enemies) {
          if (difficultyAdjustedEnemyIds.has(enemy.id)) continue;
          difficultyAdjustedEnemyIds.add(enemy.id);
          const previousMaxHealth = enemy.maxHitPoints;
          enemy.maxHitPoints = Math.max(
            1,
            Math.ceil(
              enemy.maxHitPoints *
                activeDifficultyRuleset.enemyHealthMultiplier *
                activeRivalTeam.enemyHealthMultiplier,
            ),
          );
          enemy.hitPoints += enemy.maxHitPoints - previousMaxHealth;
          enemy.speed *= activeDifficultyRuleset.enemySpeedMultiplier * activeRivalTeam.enemySpeedMultiplier;
        }
        for (const event of state.enemyEvents) {
          if (event.type === 'projectileSpawned') audio.playWallImpact(0.25);
          if (event.type === 'projectileHit') bridge.hitBurst(state.player.position, 0.75);
          if (event.type === 'teleportTelegraphed') {
            const enemy = state.enemies.find((candidate) => candidate.id === event.enemyId);
            if (enemy) bridge.voidBurst(enemy.position, 0.65);
          }
          if (event.type === 'teleported') {
            bridge.voidBurst(event.from, 0.8);
            bridge.voidBurst(event.to, 0.95);
          }
          if (event.type === 'exploded') {
            bridge.volleyBurst(event.position, 1.55);
            cameraController.addImpulse(event.damage > 0 ? 0.38 : 0.18);
            audio.playHit(event.damage > 0 ? 1 : 0.6);
          }
        }
        const pitchEvent =
          selectedRunMode === 'tutorial'
            ? null
            : updatePitchEventDirector(pitchEventDirector, state, match.stage);
        if (pitchEvent) {
          eliteModifierBindings.push(...pitchEvent.eliteBindings);
          announcement.show('kickoff', pitchEvent.announcement, 1.55);
          audio.playBossPhase('bloodRush');
          bridge.voidBurst(pitchEvent.formation.enemies[0]?.position ?? state.player.position, 1.2);
        }
        if (selectedRunMode !== 'tutorial' && (!miniboss || miniboss.phase === 'defeated')) {
          const scheduledEncounter = MINIBOSS_ENCOUNTER_SCHEDULE.find(
            (definition) =>
              !spawnedMinibossKinds.has(definition.kind) &&
              definition.stage === match.stage &&
              match.matchElapsed >= definition.triggerTime,
          );
          if (scheduledEncounter) {
            miniboss = spawnMiniboss(scheduledEncounter.kind, MINIBOSS_TARGET_IDS[scheduledEncounter.kind], {
              x: scheduledEncounter.kind === 'crimsonCaptain' ? -8 : 8,
              y: 1,
              z: -18,
            });
            spawnedMinibossKinds.add(scheduledEncounter.kind);
            audio.playMinibossEntrance();
            announcement.show('kickoff', scheduledEncounter.announcement, 2.2);
            bridge.voidBurst(miniboss.position, 1.8);
          }
        }
        if (state.player.health < healthBeforeUpdate) {
          runTelemetry.recordDamageTaken(healthBeforeUpdate - state.player.health);
          const nearestTackler = state.enemies
            .filter((enemy) => enemy.hitPoints > 0)
            .sort(
              (left, right) =>
                Math.hypot(
                  left.position.x - state.player.position.x,
                  left.position.z - state.player.position.z,
                ) -
                Math.hypot(
                  right.position.x - state.player.position.x,
                  right.position.z - state.player.position.z,
                ),
            )[0];
          if (nearestTackler && physics.ballPossessed) {
            const looseX = state.player.position.x - nearestTackler.position.x;
            const looseZ = state.player.position.z - nearestTackler.position.z;
            if (physics.knockBallLoose(state.player.position, { x: looseX, y: 0, z: looseZ })) {
              announcement.show('kickoff', 'POSSESSION LOST · WIN THE BALL BACK', 1.25);
              bridge.hitBurst(physics.ballPosition, 0.75);
            }
          }
          audio.playPlayerHurt();
          bridge.hitBurst(state.player.position, 0.9);
          input.rumble(0.7, 130);
          cameraController.addImpulse(0.24);
        }
      }
      physics.syncPlayer(state.player.position);
      if (simulationActive) physics.step(state.player.position, state.player.facing, FIXED_STEP);
      if (simulationActive) {
        const matchModifierUpdate = updateMatchModifiers(
          matchModifierState,
          { dt: FIXED_STEP, stage: match.stage, ballPossessed: physics.ballPossessed },
          activeRivalTeam,
        );
        matchModifierState = matchModifierUpdate.state;
        for (const event of matchModifierUpdate.events) {
          if (event.type === 'multiballStarted') {
            announcement.show('kickoff', `BLOOD MULTIBALL · ${event.count} SHADOW BALLS`, 1.8);
          }
          if (event.type === 'possessionCompleted') {
            state.score += event.scoreReward;
            characterUltimate.gainCharge(event.ultimateCharge);
            announcement.show('kickoff', `POSSESSION WON · +${event.scoreReward}`, 1.55);
          }
        }
        const comboBeforeHit = state.combo;
        const primaryDamage = damageEnemiesWithBall(
          state,
          physics.ballPosition,
          physics.ballSpeed,
          progression.modifiers.ballDamageMultiplier *
            progression.modifiers.allDamageMultiplier *
            ballDamageMultiplier *
            activeDifficultyRuleset.playerDamageMultiplier,
          physics.ballVelocity,
          progression.modifiers.pierceCount,
          progression.modifiers.eliteDamageMultiplier,
        );
        const { hits, kills } = primaryDamage;
        characterUltimate.gainCharge(hits * 1.5 + kills * 6);
        runTelemetry.recordDamage(
          'primary-ball',
          hits *
            (physics.ballSpeed > 17 ? 2 : 1) *
            progression.modifiers.ballDamageMultiplier *
            progression.modifiers.allDamageMultiplier *
            ballDamageMultiplier *
            activeDifficultyRuleset.playerDamageMultiplier *
            activeUltimateEffects.ballDamageMultiplier,
        );
        if (primaryDamage.rebound) {
          reboundsSinceKick += 1;
          physics.applyBallRebound(primaryDamage.rebound.normal, primaryDamage.rebound.velocityMultiplier);
        }
        if (primaryDamage.blockedHits > 0) {
          audio.playGoalkeeperSave(physics.ballSpeed <= 17);
        }
        if (hits > 0) {
          chargeFocusKick('enemy-hit', hits);
          if (primaryDamage.firstHitEnemyId !== undefined) {
            triggerPrimaryImpactWeapons(primaryDamage.firstHitEnemyId, physics.ballPosition);
            weaponExpansion.triggerRicochet(
              primaryDamage.firstHitEnemyId,
              physics.ballPosition,
              progression.modifiers,
            );
          }
          const hitIntensity = Math.min(1, physics.ballSpeed / physics.maxBallSpeed);
          audio.playHit(hitIntensity);
          input.rumble(0.28 + hitIntensity * 0.34, 75);
          bridge.hitBurst(physics.ballPosition, hitIntensity);
          cameraController.hitImpulse(hitIntensity);
          combatFeedback.addImpact({
            kind: primaryDamage.blockedHits > 0 ? 'elite-hit' : 'enemy-hit',
            damage: physics.ballSpeed,
            direction: physics.ballVelocity,
          });
        }
        if (state.combo > comboBeforeHit) audio.playKill(state.combo);
        if (kills > 0) {
          chargeFocusKick('enemy-kill', kills);
          bloodShards.spawnOnKill(physics.ballPosition, kills * BLOOD_XP_PER_KILL, Math.min(9, kills * 3));
          secondaryWeapons.triggerBloodBomb(physics.ballPosition, progression.modifiers);
          healPlayer(kills * progression.modifiers.lifeStealOnPrimaryKill, true);
        }

        const bossUpdateThisStep =
          boss && boss.phase !== 'defeated'
            ? updateCountGoalkeeper(boss, {
                dt: FIXED_STEP,
                playerPosition: state.player.position,
                ballPosition: physics.ballPosition,
                ballVelocity: physics.ballVelocity,
              })
            : null;
        if (bossUpdateThisStep) boss = bossUpdateThisStep.state;
        const minibossUpdateThisStep =
          miniboss && miniboss.phase !== 'defeated'
            ? updateMiniboss(miniboss, state.player.position, FIXED_STEP)
            : null;
        if (minibossUpdateThisStep) miniboss = minibossUpdateThisStep.state;

        refreshCombatTargets();
        const secondaryStep = secondaryWeapons.step({
          dt: FIXED_STEP,
          playerPosition: state.player.position,
          ballPosition: physics.ballPosition,
          ballSpeed: physics.ballSpeed,
          ballInFlight: !physics.ballPossessed,
          ballReturning:
            physics.ballState === 'recalling' ||
            physics.ballState === 'recovering' ||
            physics.ballState === 'volley-window',
          ballDamage: physics.ballSpeed > 17 ? 2 : 1,
          modifiers: progression.modifiers,
          targets: secondaryTargets,
        });
        const expansionStep = weaponExpansion.step({
          dt: FIXED_STEP,
          playerPosition: state.player.position,
          modifiers: progression.modifiers,
          targets: secondaryTargets,
        });
        const armoryStep = footballArmory.step({
          dt: FIXED_STEP,
          playerPosition: state.player.position,
          modifiers: progression.modifiers,
          targets: armoryTargets,
        });
        const secondaryBossDamage =
          (sumSecondaryBossDamage(secondaryStep.hits, COUNT_GOALKEEPER_COMBAT_TARGET_ID) +
            sumSecondaryBossDamage(expansionStep.hits, COUNT_GOALKEEPER_COMBAT_TARGET_ID) +
            sumSecondaryBossDamage(armoryStep.hits, COUNT_GOALKEEPER_COMBAT_TARGET_ID) +
            ultimateBossDamageThisStep) *
          progression.modifiers.allDamageMultiplier *
          progression.modifiers.secondaryDamageMultiplier;
        const secondaryMinibossDamage = miniboss
          ? (sumSecondaryBossDamage(secondaryStep.hits, MINIBOSS_TARGET_IDS[miniboss.kind]) +
              sumSecondaryBossDamage(expansionStep.hits, MINIBOSS_TARGET_IDS[miniboss.kind]) +
              sumSecondaryBossDamage(armoryStep.hits, MINIBOSS_TARGET_IDS[miniboss.kind]) +
              ultimateMinibossDamageThisStep) *
            progression.modifiers.allDamageMultiplier *
            progression.modifiers.secondaryDamageMultiplier
          : 0;
        const secondaryDamage = damageEnemiesWithSecondary(
          state,
          secondaryStep.hits,
          COUNT_GOALKEEPER_COMBAT_TARGET_ID,
          progression.modifiers.allDamageMultiplier * progression.modifiers.secondaryDamageMultiplier,
          progression.modifiers.eliteDamageMultiplier * activeUltimateEffects.eliteDamageMultiplier,
        );
        const expansionDamage = damageEnemiesWithSecondary(
          state,
          expansionStep.hits,
          COUNT_GOALKEEPER_COMBAT_TARGET_ID,
          progression.modifiers.allDamageMultiplier * progression.modifiers.secondaryDamageMultiplier,
          progression.modifiers.eliteDamageMultiplier,
        );
        const armoryDamage = damageEnemiesWithSecondary(
          state,
          armoryStep.hits,
          COUNT_GOALKEEPER_COMBAT_TARGET_ID,
          progression.modifiers.allDamageMultiplier * progression.modifiers.secondaryDamageMultiplier,
          progression.modifiers.eliteDamageMultiplier,
        );
        characterUltimate.gainCharge(
          secondaryDamage.hits +
            expansionDamage.hits +
            armoryDamage.hits +
            (secondaryDamage.kills + expansionDamage.kills + armoryDamage.kills) * 4,
        );
        const secondaryTelemetryDamage = secondaryStep.hits.reduce(
          (total, hit) => total + (hit.targetId === COUNT_GOALKEEPER_COMBAT_TARGET_ID ? 0 : hit.damage),
          0,
        );
        const expansionTelemetryDamage = expansionStep.hits.reduce(
          (total, hit) => total + (hit.targetId === COUNT_GOALKEEPER_COMBAT_TARGET_ID ? 0 : hit.damage),
          0,
        );
        runTelemetry.recordDamage(
          'secondary-weapons',
          secondaryTelemetryDamage *
            progression.modifiers.allDamageMultiplier *
            progression.modifiers.secondaryDamageMultiplier,
        );
        runTelemetry.recordDamage(
          'dash',
          expansionTelemetryDamage *
            progression.modifiers.allDamageMultiplier *
            progression.modifiers.secondaryDamageMultiplier,
        );
        runTelemetry.recordDamage(
          'secondary-weapons',
          armoryStep.hits.reduce(
            (total, hit) => total + (hit.targetId === COUNT_GOALKEEPER_COMBAT_TARGET_ID ? 0 : hit.damage),
            0,
          ),
        );
        if (secondaryDamage.hits > 0) {
          chargeFocusKick('enemy-hit', secondaryDamage.hits);
          audio.playHit(0.7);
          let effectPosition = physics.ballPosition;
          for (const hit of secondaryStep.hits) {
            if (hit.targetId === COUNT_GOALKEEPER_COMBAT_TARGET_ID) continue;
            effectPosition = hit.position;
            break;
          }
          bridge.hitBurst(effectPosition, 0.8);
        }
        if (secondaryDamage.kills > 0) {
          chargeFocusKick('enemy-kill', secondaryDamage.kills);
          bloodShards.spawnOnKill(
            physics.ballPosition,
            secondaryDamage.kills * BLOOD_XP_PER_KILL,
            Math.min(9, secondaryDamage.kills * 3),
          );
          audio.playKill(state.combo);
          healPlayer(secondaryDamage.kills * progression.modifiers.lifeStealOnSecondaryKill, true);
        }
        if (expansionDamage.hits > 0) {
          chargeFocusKick('enemy-hit', expansionDamage.hits);
          audio.playHit(0.82);
        }
        if (expansionDamage.kills > 0) {
          chargeFocusKick('enemy-kill', expansionDamage.kills);
          bloodShards.spawnOnKill(
            state.player.position,
            expansionDamage.kills * BLOOD_XP_PER_KILL,
            Math.min(9, expansionDamage.kills * 3),
          );
          audio.playKill(state.combo);
          healPlayer(expansionDamage.kills * progression.modifiers.lifeStealOnSecondaryKill, true);
        }
        if (armoryDamage.kills > 0) {
          bloodShards.spawnOnKill(
            state.player.position,
            armoryDamage.kills * BLOOD_XP_PER_KILL,
            Math.min(9, armoryDamage.kills * 3),
          );
          audio.playKill(state.combo);
          healPlayer(armoryDamage.kills * progression.modifiers.lifeStealOnSecondaryKill, true);
        }
        for (const event of armoryStep.events) {
          if (event.type === 'header-fired') bridge.volleyBurst(event.position, 1.25);
          if (event.type === 'corner-strike') bridge.lightningBurst(event.position, 1.05);
          if (event.type === 'red-card') {
            bridge.hitBurst(event.position, event.executed ? 1.8 : 1.1);
            if (event.stunDuration > 0) applyEnemySlow(state, event.targetId, 0.2, event.stunDuration);
          }
          if (event.type === 'teammate-volley') bridge.volleyBurst(event.position, 0.8);
          if (event.type === 'penalty-mine-planted') bridge.frostBurst(event.position, 0.55);
          if (event.type === 'penalty-mine-detonated') bridge.volleyBurst(event.position, 1.35);
          if (event.type === 'boot-cyclone') bridge.voidBurst(event.position, 0.9);
          if (event.type === 'slide-tackle') {
            bridge.hitBurst(event.position, event.targetsHit > 0 ? 1.15 : 0.7);
            if (event.targetsHit > 0) audio.playBodyImpact(Math.min(1, 0.55 + event.targetsHit * 0.12));
            cameraController.hitImpulse(event.targetsHit > 0 ? 0.65 : 0.25);
          }
          if (event.type === 'bicycle-kick') {
            bridge.volleyBurst(event.position, event.targetsHit > 0 ? 1.75 : 1.25);
            cameraController.volleyImpulse(event.targetsHit > 0 ? 1.45 : 0.9);
          }
          if (event.type === 'header-knockback' || event.type === 'technique-knockback') {
            const enemy = state.enemies.find((candidate) => candidate.id === event.targetId);
            if (enemy) {
              enemy.knockbackVelocity.x += event.force.x;
              enemy.knockbackVelocity.z += event.force.z;
            }
          }
        }
        for (const event of expansionStep.events) {
          if (event.type === 'dash-shockwave') bridge.lightningBurst(event.position, 1.35);
          if (event.type === 'holy-zone-spawned') bridge.volleyBurst(event.position, 1.15);
          if (event.type === 'holy-zone-pulse') bridge.frostBurst(event.position, 0.7);
          if (event.type === 'ricochet-hit') bridge.lightningBurst(event.position, 0.72);
          if (event.type === 'dash-shockwave-knockback') {
            const enemy = state.enemies.find((candidate) => candidate.id === event.targetId);
            if (enemy) {
              enemy.knockbackVelocity.x += event.force.x;
              enemy.knockbackVelocity.z += event.force.z;
            }
          }
        }
        for (const event of secondaryStep.events) {
          if (event.type === 'blood-bomb-triggered') bridge.volleyBurst(event.position, 1.2);
          if (event.type === 'chain-lightning-hit') bridge.lightningBurst(event.position, 0.95);
          if (event.type === 'frost-burst-triggered') bridge.frostBurst(event.position, 1.2);
          if (event.type === 'frost-burst-hit') {
            applyEnemySlow(state, event.targetId, event.speedMultiplier, event.duration);
          }
          if (event.type === 'garlic-frost-hit') {
            applyEnemySlow(state, event.targetId, event.speedMultiplier, event.duration);
            bridge.frostBurst(event.position, 0.55);
          }
          if (event.type === 'black-hole-pulse') bridge.voidBurst(event.position, 0.75);
          if (event.type === 'black-hole-pull') {
            const enemy = state.enemies.find((candidate) => candidate.id === event.targetId);
            if (enemy) {
              enemy.knockbackVelocity.x += event.force.x * 0.12;
              enemy.knockbackVelocity.z += event.force.z * 0.12;
            }
          }
        }

        if (miniboss && minibossUpdateThisStep) {
          for (const event of minibossUpdateThisStep.events) {
            if (event.type === 'phaseChanged' && event.to === 'enraged') {
              audio.playBossPhase('bloodRush');
              bridge.voidBurst(miniboss.position, 1.35);
            }
            if (event.type === 'attackTelegraphed') {
              bridge.volleyBurst(event.target, 0.52);
              audio.playGoalkeeperParry();
            }
            if (event.type === 'chargeStarted') cameraController.addImpulse(0.18);
            if (event.type === 'contactAttack') damagePlayerFromEncounter(event.damage);
            if (event.type === 'bloodVolley') {
              bridge.voidBurst(event.origin, 1.15);
              bridge.hitBurst(event.target, 0.72);
              const distance = Math.hypot(
                state.player.position.x - event.target.x,
                state.player.position.z - event.target.z,
              );
              if (distance <= 2.3) damagePlayerFromEncounter(event.damage);
            }
            if (event.type === 'summonFormation') {
              const formation = spawnEnemyFormation(state, event.formationId, event.anchor, 1);
              eliteModifierBindings.push(...formation.eliteBindings);
              announcement.show('kickoff', 'MINIBOSS CALLS REINFORCEMENTS', 1.25);
            }
          }

          const minibossDistance = Math.hypot(
            physics.ballPosition.x - miniboss.position.x,
            physics.ballPosition.z - miniboss.position.z,
          );
          if (
            physics.ballSpeed >= 7 &&
            minibossDistance <= MINIBOSS_CONFIGS[miniboss.kind].radius + 0.58 &&
            Math.abs(physics.ballPosition.y - miniboss.position.y) < 1.7
          ) {
            applyMinibossDamage(
              (physics.ballSpeed > 20 ? 9 : 5) *
                progression.modifiers.ballDamageMultiplier *
                progression.modifiers.allDamageMultiplier *
                ballDamageMultiplier *
                activeDifficultyRuleset.playerDamageMultiplier,
              'ball',
            );
          }
          applyMinibossDamage(secondaryMinibossDamage, 'secondary');
        }

        const modifierEvents = updateEliteModifiers(eliteModifierBindings, state.enemies, FIXED_STEP);
        for (const event of modifierEvents) {
          if (event.type === 'regenerated') {
            const enemy = state.enemies.find((candidate) => candidate.id === event.enemyId);
            if (enemy) bridge.frostBurst(enemy.position, 0.38);
          } else if (event.type === 'possessionPulse') {
            for (const enemy of state.enemies) {
              if (enemy.id === event.enemyId) continue;
              if (
                Math.hypot(enemy.position.x - event.position.x, enemy.position.z - event.position.z) <=
                event.radius
              ) {
                enemy.slowSpeedMultiplier = Math.max(enemy.slowSpeedMultiplier, event.speedMultiplier);
                enemy.slowTimer = Math.max(enemy.slowTimer, 1.3);
              }
            }
            bridge.voidBurst(event.position, 0.58);
          } else {
            damageEncounterArea(event.position, event.radius, event.damage);
            const playerDistance = Math.hypot(
              state.player.position.x - event.position.x,
              state.player.position.z - event.position.z,
            );
            if (playerDistance <= event.radius) damagePlayerFromEncounter(event.damage);
            bridge.volleyBurst(event.position, 1.5);
          }
        }

        resolveEnvironmentEvents(
          updateEnvironmentInteractions(environmentInteractions, FIXED_STEP, state.player.position),
        );
        const environmentHit = findInteractionHit(environmentInteractions, physics.ballPosition, 0.42);
        if (environmentHit && physics.ballSpeed >= 7) {
          if (lastEnvironmentHitId !== environmentHit.id) {
            resolveEnvironmentEvents(
              damageEnvironmentInteraction(environmentHit, physics.ballSpeed > 17 ? 3 : 1),
            );
            if (environmentHit.kind === 'breakableBarrier' && environmentHit.active) {
              const dx = physics.ballPosition.x - environmentHit.position.x;
              const dz = physics.ballPosition.z - environmentHit.position.z;
              const length = Math.max(0.001, Math.hypot(dx, dz));
              physics.applyBallRebound({ x: dx / length, y: 0, z: dz / length }, 0.68);
              audio.playWallImpact(0.72);
            }
          }
          lastEnvironmentHitId = environmentHit.id;
        } else {
          lastEnvironmentHitId = null;
        }

        const collectedXp = bloodShards.update(
          state.player.position,
          FIXED_STEP,
          undefined,
          progression.modifiers.pickupRadiusMultiplier * activeUltimateEffects.pickupRadiusMultiplier,
        );
        if (collectedXp > 0) {
          const xpResult = grantBloodXp(progression, collectedXp);
          progression = xpResult.state;
          audio.playPickup();
          if (xpResult.levelsGained > 0) audio.playLevelUp();
          signalTutorial('xp-collected');
        }

        let bossDefeatedThisStep = false;
        if (boss && boss.phase !== 'defeated') {
          for (const event of bossUpdateThisStep?.events ?? []) {
            if (event.type === 'contactAttack' && state.player.invulnerability <= 0) {
              const incomingDamage = absorbIncomingDamage(
                event.damage *
                  activeDifficultyRuleset.enemyDamageMultiplier *
                  progression.modifiers.damageTakenMultiplier *
                  activeUltimateEffects.damageTakenMultiplier,
              );
              runTelemetry.recordDamageTaken(incomingDamage);
              state.player.health = Math.max(0, state.player.health - incomingDamage);
              state.player.invulnerability = 0.7;
              audio.playPlayerHurt();
              input.rumble(0.75, 150);
              cameraController.addImpulse(0.32);
              if (state.player.health <= 0) state.phase = 'dead';
            }
            if (event.type === 'phaseChanged') {
              replayHighlights.record({
                kind: 'boss-phase',
                matchTime: match.matchElapsed,
                label: `Count Goalkeeper · ${event.to}`,
                focus: boss.position,
              });
              if (event.to === 'bloodRush' || event.to === 'desperation') audio.playBossPhase(event.to);
              else audio.playPhase(2);
              bridge.bossBurst(boss.position, event.to === 'desperation' ? 1.65 : 1.05);
              if (event.to === 'desperation') {
                audio.playBossTransformation();
                audio.playCrowdRise(0.9);
                announcement.show('boss');
              }
            }
            if (event.type === 'summonElite') spawnEliteEnemy(state, event.archetype, event.side);
            if (event.type === 'diveTelegraphed') audio.playGoalkeeperParry();
            if (event.type === 'diveStarted') cameraController.addImpulse(0.2);
            if (event.type === 'counterattackStarted') audio.playBossPhase('bloodRush');
            if (event.type === 'counterattackReleased' && state.player.invulnerability <= 0) {
              const incomingDamage = absorbIncomingDamage(
                event.damage *
                  activeDifficultyRuleset.enemyDamageMultiplier *
                  progression.modifiers.damageTakenMultiplier *
                  activeUltimateEffects.damageTakenMultiplier,
              );
              runTelemetry.recordDamageTaken(incomingDamage);
              state.player.health = Math.max(0, state.player.health - incomingDamage);
              state.player.invulnerability = 0.7;
              if (incomingDamage > 0) {
                audio.playPlayerHurt();
                input.rumble(0.8, 170);
                cameraController.addImpulse(0.36);
              }
              if (state.player.health <= 0) state.phase = 'dead';
            }
            if (event.type === 'vulnerabilityOpened') {
              audio.playGoalkeeperGuardBreak();
              bridge.volleyBurst(boss.position, 1.35);
            }
          }

          const bossDistance = Math.hypot(
            physics.ballPosition.x - boss.position.x,
            physics.ballPosition.z - boss.position.z,
          );
          if (physics.ballSpeed >= 7 && bossDistance < 1.7 && Math.abs(physics.ballPosition.y - 1.15) < 1.8) {
            const damage = damageCountGoalkeeper(boss, {
              amount:
                (physics.ballSpeed > 20 ? 10 : 6) *
                progression.modifiers.ballDamageMultiplier *
                progression.modifiers.allDamageMultiplier *
                ballDamageMultiplier *
                activeDifficultyRuleset.playerDamageMultiplier,
              source: 'ball',
            });
            boss = damage.state;
            for (const event of damage.events) {
              if (event.type === 'shotParried') {
                audio.playGoalkeeperParry();
                bridge.hitBurst(boss.position, 1.15);
                physics.applyBallRebound(
                  { x: Math.sign(physics.ballPosition.x - boss.position.x) || 1, y: 0, z: 1 },
                  0.78,
                );
              }
              if (event.type === 'counterattackStarted') audio.playBossPhase('bloodRush');
            }
            if (damage.appliedDamage > 0) {
              runTelemetry.recordDamage('primary-ball', damage.appliedDamage);
              healPlayer(damage.appliedDamage * progression.modifiers.bossLifeStealRatio, true);
              chargeFocusKick('boss-hit');
              // The secondary system already stepped; these bounded triggers
              // intentionally resolve from the next fixed step onward.
              triggerPrimaryImpactWeapons(COUNT_GOALKEEPER_COMBAT_TARGET_ID, physics.ballPosition);
              // Blood Bomb is normally kill-triggered. Boss impacts also queue it
              // so a dedicated bomb build retains a real final-encounter payoff.
              secondaryWeapons.triggerBloodBomb(physics.ballPosition, progression.modifiers);
              bridge.hitBurst(boss.position, 1.4);
              cameraController.hitImpulse(1.25);
              combatFeedback.addImpact({
                kind: 'boss-hit',
                damage: damage.appliedDamage,
                direction: physics.ballVelocity,
              });
              audio.playHit(1);
            }
            bossDefeatedThisStep = didDefeatCountGoalkeeper(damage.events);
            if (bossDefeatedThisStep) {
              bridge.bossBurst(boss.position, 1.9);
              replayHighlights.record({
                kind: 'boss-defeated',
                matchTime: match.matchElapsed,
                label: 'Count Goalkeeper defeated',
                focus: boss.position,
              });
            }
          }

          // Primary kicks resolve first. Their short invulnerability window keeps
          // persistent damage zones from swallowing a readable, high-impact shot.
          if (boss.phase !== 'defeated' && secondaryBossDamage > 0) {
            const damage = damageCountGoalkeeper(boss, {
              amount: secondaryBossDamage,
              source: 'secondary',
            });
            boss = damage.state;
            if (damage.appliedDamage > 0) {
              runTelemetry.recordDamage('secondary-weapons', damage.appliedDamage);
              healPlayer(damage.appliedDamage * progression.modifiers.bossLifeStealRatio, true);
              chargeFocusKick('boss-hit');
              bridge.hitBurst(boss.position, 0.72);
              cameraController.hitImpulse(0.38);
              audio.playHit(0.68);
            }
            bossDefeatedThisStep ||= didDefeatCountGoalkeeper(damage.events);
          }
        }

        const ball = physics.ballPosition;
        const goalCrossing = detectOpponentGoalCrossing(physics.previousBallStepPosition, ball);
        const scored =
          (match.stage === 'goalOpportunity' || match.stage === 'finalGoal') && goalCrossing !== null;
        const goalQuality =
          scored && goalCrossing
            ? goalCombo.score({
                crossingX: goalCrossing.crossing.x,
                ballSpeed: physics.ballSpeed,
                shotDistance: Math.hypot(
                  goalCrossing.crossing.x - lastKickOrigin.x,
                  goalCrossing.crossing.z - lastKickOrigin.z,
                ),
                airborne: lastKickWasVolley,
                reboundCount: reboundsSinceKick,
                setupTouches: setupTouchesSinceKick,
                scoredAt: match.matchElapsed,
              })
            : null;
        const matchUpdate = updateMatchDirector(
          match,
          {
            dt: FIXED_STEP,
            totalKills: state.kills,
            playerDead: state.phase === 'dead',
            goalScored: scored,
            bossDefeated: bossDefeatedThisStep,
            halftimeChoice: pendingHalftimeChoice,
          },
          activeMatchConfig,
        );
        pendingHalftimeChoice = undefined;
        match = matchUpdate.state;
        for (const event of matchUpdate.events) {
          if (event.type === 'stageChanged') {
            audio.playPhase(matchUpdate.state.matchElapsed);
            audio.setMatchIntensity(event.to);
            atmosphere.setPhase(event.to);
            stadiumPhaseVisual.setPhase(event.to);
            stadiumAmbience.setPhase(event.to);
            if (event.to === 'finalWave' && !boss) {
              boss = spawnCountGoalkeeper();
              bridge.bossBurst(boss.position, 1.65);
              audio.playFinalWave();
              audio.playBossEntrance();
            }
          }
          if (event.type === 'goalScored') {
            replayHighlights.record({
              kind: 'goal',
              matchTime: match.matchElapsed,
              label: goalQuality?.label ?? 'Goal',
              focus: goalCrossing?.crossing,
              metadata: { score: goalQuality?.totalScore ?? 1_000 },
            });
            runTelemetry.recordGoal();
            characterUltimate.gainCharge(goalQuality?.ultimateCharge ?? 24);
            chargeFocusKick('goal');
            signalTutorial('goal-scored');
            state.score += goalQuality?.totalScore ?? 1_000;
            combatFeedback.addImpact({ kind: 'goal', damage: physics.ballSpeed, perfect: lastKickWasVolley });
            audio.playGoal();
            audio.playNetImpact();
            audio.playCrowdRise(0.7);
            bridge.goalBurst(physics.ballPosition, event.goal === 'final' ? 1.65 : 1.25);
            bridge.playPlayerOutcome('celebration');
            stadiumAmbience.celebrate(event.goal === 'final' ? 1.5 : 1.15);
            stadiumAmbience.burstProps(event.goal === 'final' ? 1.45 : 1);
            announcement.show(
              'goal',
              event.goal === 'final'
                ? `${goalQuality?.label ?? 'GOAL'} · THE FINAL KEEPER AWAKENS`
                : goalQuality?.label,
            );
            eliteModifierBindings.length = 0;
            resetKickoffFormation(state);
            physics.reset(state.player.position);
            bloodShards.reset();
            secondaryWeapons.reset();
            weaponExpansion.reset();
            footballArmory.reset();
          }
          if (event.type === 'goalOpportunityStarted' && event.goal === 'final') {
            announcement.show('finalGoal');
          }
          if (event.type === 'goalOpportunityStarted') {
            eliteModifierBindings.length = 0;
            resetKickoffFormation(state);
            physics.reset(state.player.position);
            spawnGoalkeeperGuard(state, event.goal === 'final');
            previousBallState = physics.ballState;
          }
          if (event.type === 'goalMissed') {
            audio.playGoalMissed();
            eliteModifierBindings.length = 0;
            resetKickoffFormation(state);
            physics.reset(state.player.position);
            previousBallState = physics.ballState;
          }
          if (event.type === 'halftimeChoiceStarted') {
            audio.playHalftime();
            announcement.show('halftime');
            halftimeDeadline = performance.now() + event.duration * 1_000;
            if (input.isLocked) void document.exitPointerLock();
            void halftimeOverlay.show(event.duration).then((choice) => {
              if (choice) pendingHalftimeChoice = choice;
            });
          }
          if (event.type === 'halftimeChoiceSelected') {
            halftimeOverlay.hide();
            if (event.choice === 'power') {
              ballDamageMultiplier = 1.25;
              kickPowerMultiplier = 1.15;
            } else if (event.choice === 'pace') {
              movementSpeedMultiplier = 1.15;
            } else {
              recallSpeedMultiplier = 1.25;
              volleyWindowBonus = 0.45;
            }
          }
          if (event.type === 'bloodMoonStarted') {
            audio.playBloodMoon();
            announcement.show('bloodMoon');
            stadiumAmbience.celebrate(0.72);
            stadiumAmbience.burstProps(0.5);
          }
          if (event.type === 'victory') {
            state.phase = 'won';
            audio.playVictory();
            bridge.goalBurst(state.player.position, 1.8);
            announcement.show('finalWhistle', 'COUNT GOALKEEPER HAS FALLEN');
            stadiumAmbience.celebrate(1.5);
            stadiumAmbience.burstProps(1.5);
          }
          if (event.type === 'timeExpired') {
            state.phase = 'dead';
            announcement.show('finalWhistle', 'THE COUNT HOLDS THE PITCH');
            stadiumAmbience.celebrate(0.28);
          }
        }
        if (selectedRunMode === 'tutorial' && tutorialRunState.outcome === 'active') {
          tutorialRunState = updateTutorialRun(tutorialRunState, FIXED_STEP, tutorialTracker.complete);
          if (tutorialRunState.outcome !== 'active') {
            state.phase = 'won';
            audio.playVictory();
            bridge.playPlayerOutcome('victory');
            bridge.goalBurst(state.player.position, 1.35);
            stadiumAmbience.celebrate(1.2);
            announcement.show(
              'finalWhistle',
              tutorialRunState.outcome === 'completed'
                ? 'TRAINING COMPLETE · READY FOR THE LEAGUE'
                : 'TRAINING WINDOW COMPLETE · REPLAY TO FINISH EVERY LESSON',
              3,
            );
          }
        }
      }
      const recallStarted =
        (physics.ballState === 'recalling' || physics.ballState === 'recovering') &&
        previousBallState !== 'recalling' &&
        previousBallState !== 'recovering';
      if (recallStarted) audio.playRecall();
      if (recallStarted) setupTouchesSinceKick += 1;
      if (recallStarted) signalTutorial('recall-demonstrated');
      if (
        physics.ballState === 'possessed' &&
        (previousBallState === 'recalling' ||
          previousBallState === 'recovering' ||
          previousBallState === 'volley-window')
      )
        audio.playRecallCatch();
      previousBallState = physics.ballState;
      accumulator -= FIXED_STEP;
      fixedStepsThisFrame += 1;
    }

    goalBeacon.setActive(match.stage === 'goalOpportunity' || match.stage === 'finalGoal');
    goalBeacon.update(frameTime);
    announcement.update(frameTime);
    evolutionToast.update(frameTime);
    atmosphere.update(frameTime);
    stadiumPhaseVisual.update(frameTime);
    stadiumAmbience.update(frameTime);
    arenaBeauty.update(frameTime);
    if (halftimeOverlay.isVisible) {
      const remaining = Math.max(0, (halftimeDeadline - performance.now()) / 1_000);
      halftimeOverlay.updateCountdown(remaining);
      if (remaining <= 0) {
        pendingHalftimeChoice = activeMatchConfig.defaultHalftimeChoice;
        halftimeOverlay.hide();
      }
    }
    offerUpgrade();

    const alpha = accumulator / FIXED_STEP;
    const renderPlayerPosition = interpolatePosition(
      state.player.previousPosition,
      state.player.position,
      alpha,
    );
    cameraController.update(renderPlayerPosition, frameTime);
    const feedbackState = combatFeedback.step(frameTime);
    cameraController.applyCombatFeedback(feedbackState);
    root.style.setProperty('--combat-pulse', feedbackState.chromaticPulse.toFixed(3));
    aimGuide.sync(
      renderPlayerPosition,
      playerAim.direction,
      state.phase === 'playing' &&
        !upgradeOverlay.isVisible &&
        !settingsOverlay.isVisible &&
        !pauseOverlay.isVisible &&
        !halftimeOverlay.isVisible,
    );
    bridge.sync(state, physics.ballRenderPosition(alpha), physics.ballSpeed, frameTime, alpha);
    encounterRenderer.sync(
      eliteModifierBindings,
      state.enemies,
      miniboss,
      environmentInteractions,
      state.elapsed,
      alpha,
    );
    bossVisual.sync(boss, alpha, frameTime);
    bossVisual.setVictoryPresentation(state.phase === 'dead');
    for (const contact of bossVisual.drainContactEvents()) bridge.bossBurst(contact.position, 0.72);
    bloodShardRenderer.sync(bloodShards.state, alpha);
    secondaryRenderer.sync(secondaryRenderState);
    hud.update(
      state,
      physics.ballState,
      input.kickCharge,
      progression,
      getMatchObjective(match, activeMatchConfig),
      boss,
      miniboss,
      focusKick,
      characterUltimate.state,
    );
    if (!resultsShown && (state.phase === 'dead' || state.phase === 'won')) {
      resultsShown = true;
      if (state.phase === 'dead') {
        replayHighlights.record({
          kind: 'player-down',
          matchTime: match.matchElapsed,
          label: 'The striker fell',
          focus: state.player.position,
        });
      }
      if (state.phase === 'dead') audio.playDefeat();
      let settlement: RunSettlement | null = null;
      if (!qaScenario && runDescriptor.mode !== 'tutorial') {
        const previousBestScore = profileStore.value.personalBests.score;
        settlement = profileStore.recordRun({
          id: runId,
          completedAt: new Date().toISOString(),
          buildVersion: BUILD_METADATA.version,
          characterId: selectedCharacterId,
          outcome: state.phase === 'won' ? 'victory' : 'defeat',
          score: state.score,
          kills: state.kills,
          goals: match.goalsScored,
          timeSeconds: state.elapsed,
          level: progression.level,
          upgradeIds: UPGRADE_IDS.filter((upgradeId) => progression.upgradeStacks[upgradeId] > 0),
          evolutionIds: getUnlockedEvolutionIds(progression),
          seed: runDescriptor.seed,
          seedCode: runDescriptor.seedCode,
          runMode: runDescriptor.mode,
          challengeKey: runDescriptor.challengeKey,
          rulesetVersion: runDescriptor.rulesetVersion,
          difficultyId: activeDifficultyRuleset.difficultyId,
          challengeModifierIds: activeDifficultyRuleset.modifierIds,
          stadiumId: activeStadiumId,
          rewardMultiplier:
            activeDifficultyRuleset.rewardMultiplier *
            calculateCurseDirectorModifiers(selectedCurses).rewardMultiplier,
        });
        if (state.score > previousBestScore) audio.playNewRecord();
        if (settlement.newlyUnlockedCharacterIds.length > 0) audio.playUnlock();
      }
      resultsOverlay.show(
        {
          outcome: state.phase === 'won' ? 'victory' : 'defeat',
          score: state.score,
          kills: state.kills,
          goals: match.goalsScored,
          timeSeconds: state.elapsed,
          level: progression.level,
          upgrades: UPGRADE_IDS.map((upgradeId) => ({
            upgradeId,
            stacks: progression.upgradeStacks[upgradeId],
          })),
          evolutions: getUnlockedEvolutionIds(progression),
          characterId: selectedCharacterId,
          accountXpEarned: settlement?.accountXpEarned,
          accountLevel: settlement?.accountLevel,
          unlockedCharacterIds: settlement?.newlyUnlockedCharacterIds,
          completedChallengeIds: settlement?.completedChallengeIds,
          masteryRewardIds: settlement?.newlyUnlockedMasteryRewardIds,
          runMode: runDescriptor.mode,
          tutorialCompleted:
            runDescriptor.mode === 'tutorial' ? tutorialRunState.outcome === 'completed' : undefined,
          seedCode: runDescriptor.seedCode,
          telemetry: runTelemetry.snapshot(),
        },
        { onRestart: restart, onMainMenu: returnToMenu },
      );
    }
    if ((state.phase === 'dead' || state.phase === 'won') && input.isLocked) void document.exitPointerLock();
    renderer.render(scene, cameraController.camera);
    perfCounters.rendererCalls = renderer.info.render.calls;
    perfCounters.rendererTriangles = renderer.info.render.triangles;
    perfCounters.enemyCount = state.enemies.length;
    perfCounters.fixedSteps = fixedStepsThisFrame;
    perfCounters.bloodShardPoolActive = bloodShards.state.activeCount;
    perfCounters.bloodShardPoolCapacity = bloodShards.state.capacity;
    perfCounters.garlicPoolActive = countActivePoolItems(secondaryRenderState.garlicZones);
    perfCounters.garlicPoolCapacity = secondaryRenderState.garlicZones.length;
    perfCounters.orbitPoolActive = countActivePoolItems(secondaryRenderState.orbitingBalls);
    perfCounters.orbitPoolCapacity = secondaryRenderState.orbitingBalls.length;
    perfCounters.ghostPassPoolActive = countActivePoolItems(secondaryRenderState.ghostPasses);
    perfCounters.ghostPassPoolCapacity = secondaryRenderState.ghostPasses.length;
    perfCounters.multiBallPoolActive = countActivePoolItems(secondaryRenderState.multiBallShots);
    perfCounters.multiBallPoolCapacity = secondaryRenderState.multiBallShots.length;
    perfCounters.blackHolePoolActive = countActivePoolItems(secondaryRenderState.blackHoleZones);
    perfCounters.blackHolePoolCapacity = secondaryRenderState.blackHoleZones.length;
    perf.update(frameTime, perfCounters);
    frameTimeSampler.record(perf.snapshot.currentFrameMs);
    if (playerSettings.performanceOverlay) {
      performanceOverlayRefresh += frameTime;
      gpuMemoryRefresh += frameTime;
      if (gpuMemoryRefresh >= 2) {
        gpuMemoryRefresh %= 2;
        estimatedGpuBytes = estimateSceneGpuBytes(scene);
      }
      if (performanceOverlayRefresh >= 0.25) {
        performanceOverlayRefresh %= 0.25;
        frameDistribution = frameTimeSampler.snapshot();
        hud.updatePerformance(perf.snapshot, frameDistribution, gpuIdentity, estimatedGpuBytes);
      }
    }
  });

  const onContextLost = (event: Event): void => {
    event.preventDefault();
    renderer.setAnimationLoop(null);
  };
  const onContextRestored = (): void => window.location.reload();
  renderer.domElement.addEventListener('webglcontextlost', onContextLost);
  renderer.domElement.addEventListener('webglcontextrestored', onContextRestored);

  if (denseWaveStress || qaScenario) hud.start();

  const dispose = (): void => {
    if (disposed) return;
    disposed = true;
    renderer.setAnimationLoop(null);
    window.removeEventListener('beforeunload', dispose);
    window.removeEventListener('resize', resize);
    window.removeEventListener('keydown', onGlobalKeyDown);
    window.removeEventListener('blur', onFocusLoss);
    document.removeEventListener('visibilitychange', onVisibilityChange);
    root.removeEventListener('focusin', onUiFocus);
    root.removeEventListener('pointerdown', onFirstAudioGesture);
    root.removeEventListener('click', onUiActivation);
    root.removeEventListener('change', onUiControlChange);
    kickoffButton.removeEventListener('click', begin);
    tutorialRunButton.removeEventListener('click', beginTutorialRun);
    restartButton.removeEventListener('click', restart);
    victoryRestartButton.removeEventListener('click', restart);
    settingsButton.removeEventListener('click', openSettings);
    titleSettingsButton.removeEventListener('click', openSettings);
    titleCareerButton.removeEventListener('click', openCareer);
    titleCharacterCreatorButton.removeEventListener('click', openCharacterCreator);
    titleQuitButton.removeEventListener('click', quitGame);
    renderer.domElement.removeEventListener('click', onCanvasClick);
    renderer.domElement.removeEventListener('webglcontextlost', onContextLost);
    renderer.domElement.removeEventListener('webglcontextrestored', onContextRestored);
    if (input.isLocked) void document.exitPointerLock();
    input.dispose();
    void audio.dispose();
    goalBeacon.dispose();
    bossVisual.dispose();
    encounterRenderer.dispose();
    bloodShardRenderer.dispose();
    secondaryRenderer.dispose();
    upgradeOverlay.dispose();
    settingsOverlay.dispose();
    pauseOverlay.dispose();
    resultsOverlay.dispose();
    careerOverlay.dispose();
    characterCreatorOverlay.dispose();
    unsubscribeCharacterCustomization();
    curseOverlay.dispose();
    difficultyOverlay.dispose();
    halftimeOverlay.dispose();
    announcement.dispose();
    evolutionToast.dispose();
    tutorialPrompt.dispose();
    hud.dispose();
    uninstallDenseWavePerformanceHook();
    uninstallRuntimeDiagnosticsHook();
    uninstallQaSnapshotHook();
    stadiumPhaseVisual.dispose();
    stadiumAmbience.dispose();
    arenaBeauty.dispose();
    atmosphere.dispose();
    bridge.dispose();
    aimGuide.dispose();
    physics.dispose();
    disposeSceneResources(scene);
    renderer.renderLists.dispose();
    renderer.dispose();
    renderer.forceContextLoss();
    renderer.domElement.remove();
    root.replaceChildren();
  };

  window.addEventListener('beforeunload', dispose, { once: true });
  const hot = (import.meta as ImportMeta & { hot?: { dispose(callback: () => void): void } }).hot;
  hot?.dispose(dispose);
}

function disposeSceneResources(scene: THREE.Scene): void {
  const geometries = new Set<THREE.BufferGeometry>();
  const materials = new Set<THREE.Material>();
  const textures = new Set<THREE.Texture>();
  scene.traverse((object) => {
    if (object instanceof THREE.Light) object.dispose();
    if (!(object instanceof THREE.Mesh || object instanceof THREE.Line || object instanceof THREE.Points))
      return;
    geometries.add(object.geometry);
    const objectMaterials = Array.isArray(object.material) ? object.material : [object.material];
    for (const material of objectMaterials) {
      materials.add(material);
      for (const value of Object.values(material)) {
        if (value instanceof THREE.Texture) textures.add(value);
      }
    }
  });
  for (const texture of textures) texture.dispose();
  for (const material of materials) material.dispose();
  for (const geometry of geometries) geometry.dispose();
  scene.clear();
}

function createPitchInteractions(): EnvironmentInteractionState[] {
  return [
    createEnvironmentInteraction(1, 'bloodBarrel', { x: -12, y: 0.62, z: -8 }),
    createEnvironmentInteraction(2, 'bloodBarrel', { x: 12, y: 0.62, z: -8 }),
    createEnvironmentInteraction(3, 'bloodBarrel', { x: -18, y: 0.62, z: 18 }),
    createEnvironmentInteraction(4, 'bloodBarrel', { x: 18, y: 0.62, z: 18 }),
    createEnvironmentInteraction(5, 'holyBeacon', { x: 0, y: 0.82, z: 13 }),
    createEnvironmentInteraction(6, 'breakableBarrier', { x: -8, y: 0.7, z: -24 }),
    createEnvironmentInteraction(7, 'breakableBarrier', { x: 8, y: 0.7, z: -24 }),
    createEnvironmentInteraction(8, 'momentumGate', { x: -20, y: 0, z: 2 }),
    createEnvironmentInteraction(9, 'momentumGate', { x: 20, y: 0, z: 2 }),
    createEnvironmentInteraction(10, 'momentumGate', { x: 0, y: 0, z: 27 }),
  ];
}

function hasCompletedTutorial(): boolean {
  try {
    return localStorage.getItem(TUTORIAL_STORAGE_KEY) === 'true';
  } catch {
    return false;
  }
}

function persistTutorialCompletion(): void {
  try {
    localStorage.setItem(TUTORIAL_STORAGE_KEY, 'true');
  } catch {
    // Storage can be disabled in privacy-restricted embeds; the run stays playable.
  }
}

function interpolatePosition(
  previous: { x: number; y: number; z: number },
  current: { x: number; y: number; z: number },
  alpha: number,
): { x: number; y: number; z: number } {
  return {
    x: THREE.MathUtils.lerp(previous.x, current.x, alpha),
    y: THREE.MathUtils.lerp(previous.y, current.y, alpha),
    z: THREE.MathUtils.lerp(previous.z, current.z, alpha),
  };
}

void bootstrap().catch((error: unknown) => {
  const message = error instanceof Error ? error.message : String(error);
  const fallback = document.createElement('main');
  fallback.className = 'boot-error';
  const title = document.createElement('h1');
  title.textContent = 'Kickoff failed';
  const details = document.createElement('p');
  details.textContent = message;
  fallback.append(title, details);
  document.body.replaceChildren(fallback);
  console.error(error);
});

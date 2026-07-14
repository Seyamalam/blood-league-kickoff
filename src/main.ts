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
  FootballArmorySystem,
  selectAimAssistTarget,
  sumSecondaryBossDamage,
  steerAimDirection,
  stepFocusKick,
  type FocusKickCombatAction,
  type CombatTarget,
  type UltimateTarget,
  type CharacterUltimateEffects,
  type FootballArmoryTarget,
} from './game/combat';
import {
  createMatchDirectorState,
  FULL_MATCH_CONFIG,
  getMatchObjective,
  updateMatchDirector,
  type HalftimeChoice,
  type MatchStage,
} from './game/match';
import { BloodShardSystem } from './game/pickups';
import { applyStartingLoadout, CHARACTER_DEFINITIONS, type CharacterId } from './game/characters';
import { createRunDescriptor, createRunRandomStreams, type RunMode } from './game/runs';
import {
  BLOOD_XP_PER_KILL,
  calculateModifiers,
  chooseUpgrade,
  createUpgradeOffer,
  createProgressionState,
  getUnlockedEvolutionIds,
  grantBloodXp,
  totalXpRequiredForLevel,
  UPGRADE_IDS,
  setActiveCurses,
  type CurseId,
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
import { evaluateGoalQuality } from './game/scoring';
import { TutorialTracker, type TutorialSignal } from './game/tutorial';
import { RunTelemetry } from './game/stats';
import { PhysicsWorld } from './physics/PhysicsWorld';
import { RenderBridge } from './render/adapters/RenderBridge';
import { CameraController } from './render/app/CameraController';
import { createRenderer } from './render/app/createRenderer';
import { createScene } from './render/app/createScene';
import { GoalBeacon } from './render/objects/GoalBeacon';
import { CountGoalkeeperVisual } from './render/objects/CountGoalkeeperVisual';
import { BloodShardRenderer } from './render/objects/BloodShardRenderer';
import { SecondaryWeaponRenderer } from './render/objects/SecondaryWeaponRenderer';
import { AimGuide } from './render/objects/AimGuide';
import { PhaseAtmosphere } from './render/objects/PhaseAtmosphere';
import { EncounterRenderer } from './render/objects/EncounterRenderer';
import { SettingsStore, type PlayerSettings } from './settings/SettingsStore';
import { masteryLevelForXp, masteryModifierBonusFor, ProfileStore, type RunSettlement } from './profile';
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
  let selectedCharacterId: CharacterId = profileStore.value.selectedCharacterId;
  const createSelectedProgression = (characterId: CharacterId) => {
    const masteryLevel = masteryLevelForXp(profileStore.value.characterMastery[characterId].xp);
    const progressionState = createProgressionState(
      characterId,
      masteryModifierBonusFor(characterId, masteryLevel),
    );
    progressionState.upgradeStacks = applyStartingLoadout(progressionState.upgradeStacks, characterId);
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
  const prepareRun = (mode: RunMode = selectedRunMode, seed?: string): void => {
    selectedRunMode = mode;
    runDescriptor = createRunDescriptor({ mode, seed, rulesetVersion: BUILD_METADATA.version });
    runRandomStreams = createRunRandomStreams(runDescriptor);
  };
  let playerSettings = settingsStore.value;
  const renderer = createRenderer(root);
  const scene = createScene();
  const cameraController = new CameraController();
  const input = new InputController(renderer.domElement);
  const audio = new AudioManager();
  audio.setMatchIntensity('menu');
  const physics = await PhysicsWorld.create();
  const state = createGameState();
  const denseWaveStress = readDenseWaveStressMode(window.location.search, import.meta.env.DEV);
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
  if (qaScenario === 'upgrade' || qaScenario === 'evolution' || qaScenario === 'goal') {
    state.phase = 'playing';
  }
  if (qaScenario === 'goal') {
    state.player.position.z = OPPONENT_GOAL_LINE_Z + 18;
    state.player.previousPosition = { ...state.player.position };
    physics.reset(state.player.position);
  }
  const bridge = new RenderBridge(scene);
  bridge.setCharacter(selectedCharacterId);
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
  const hud = new Hud(root);
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
  const curseOverlay = new CurseOverlay(root);
  const upgradeOverlay = new UpgradeOverlay(root);
  const settingsOverlay = new SettingsOverlay(root, settingsStore, (settings) => {
    playerSettings = settings;
    applyPlayerSettings(settings);
  });
  const pauseOverlay = new PauseOverlay(root);
  const resultsOverlay = new ResultsOverlay(root);
  const halftimeOverlay = new HalftimeOverlay(root);
  const announcement = new MatchAnnouncement(root);
  const evolutionToast = new EvolutionToast(root);
  const tutorialTracker = new TutorialTracker(hasCompletedTutorial());
  const tutorialPrompt = new TutorialPrompt(root);
  const perf = new PerfMeter();
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
      : createMatchDirectorState();
  let boss: CountGoalkeeperState | null = null;
  let miniboss: MinibossState | null = null;
  const spawnedMinibossKinds = new Set<MinibossKind>();
  const eliteModifierBindings: EliteModifierBinding[] = [];
  const pitchEventDirector = createPitchEventDirectorState();
  let environmentInteractions = createPitchInteractions();
  let lastEnvironmentHitId: number | null = null;
  if (qaScenario === 'goal') spawnGoalkeeperGuard(state);
  let resultsShown = false;
  let runId = createRunId();
  let pendingHalftimeChoice: HalftimeChoice | undefined;
  let halftimeDeadline = 0;
  let movementSpeedMultiplier = 1;
  let kickPowerMultiplier = 1;
  let ballDamageMultiplier = 1;
  let recallSpeedMultiplier = 1;
  let volleyWindowBonus = 0;
  let fixedStepsThisFrame = 0;
  let ultimateRequested = false;
  let activeUltimateEffects: Readonly<CharacterUltimateEffects> = NEUTRAL_ULTIMATE_EFFECTS;
  let disposed = false;
  const tutorialSignals = new Set<TutorialSignal>();

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
    if (amount <= 0 || state.player.health <= 0 || state.player.health >= state.player.maxHealth) return;
    const before = state.player.health;
    state.player.health = Math.min(state.player.maxHealth, state.player.health + amount);
    if (state.player.health > before) {
      runTelemetry.recordHealing(state.player.health - before);
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
      rawDamage * progression.modifiers.damageTakenMultiplier * activeUltimateEffects.damageTakenMultiplier,
    );
    if (damage <= 0) return;
    state.player.health = Math.max(0, state.player.health - damage);
    state.player.invulnerability = 0.68;
    runTelemetry.recordDamageTaken(damage);
    audio.playPlayerHurt();
    input.rumble(0.72, 145);
    cameraController.addImpulse(0.3);
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
        (physics.ballSpeed > 17 ? 2 : 1) * progression.modifiers.ballDamageMultiplier * ballDamageMultiplier,
      modifiers: progression.modifiers,
    });
    secondaryWeapons.triggerBlackHole(position, progression.modifiers);
  };

  const signalTutorial = (signal: TutorialSignal): void => {
    if (tutorialTracker.complete || tutorialSignals.has(signal)) return;
    tutorialSignals.add(signal);
    const update = tutorialTracker.signal(signal);
    tutorialPrompt.update(update.state);
    if (update.tutorialCompleted) persistTutorialCompletion();
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
      : createUpgradeOffer(progression, runRandomStreams.upgrades.next);
    if (choices.length === 0) return;
    if (input.isLocked) void document.exitPointerLock();
    void upgradeOverlay.show(choices, progression).then((upgradeId) => {
      if (!upgradeId || state.phase !== 'playing') return;
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
    audio.setVolume(settings.masterVolume);
    audio.setMusicVolume(settings.musicVolume);
    audio.setEffectsVolume(settings.effectsVolume);
    cameraController.setSensitivity(settings.mouseSensitivity);
    cameraController.setInvertVerticalLook(settings.invertVerticalLook);
    cameraController.setReducedShake(settings.reducedCameraShake);
    input.setKeyBindings(settings.keyBindings);
    input.setGamepadSettings(settings.gamepadLookSensitivity, settings.gamepadVibration);
    hud.setControlBindings(settings.keyBindings);
    bridge.setReducedFlashes(settings.reducedFlashes);
    root.style.setProperty('--hud-scale', String(settings.hudScale));
    root.dataset.colorVision = settings.colorVisionMode;
    root.classList.toggle('high-contrast-hud', settings.highContrastHud);
    root.classList.toggle('reduced-flashes', settings.reducedFlashes);
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
    announcement.show(
      'kickoff',
      `${CHARACTER_DEFINITIONS[selectedCharacterId].name.toUpperCase()} ENTERS THE PITCH`,
    );
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
    prepareRun(mode);
    prepareProgressionForRun();
    begin();
    announcement.show('kickoff', `${mode.toUpperCase()} CHALLENGE · SEED ${runDescriptor.seedCode}`);
  };
  const resetEncounterState = (): void => {
    miniboss = null;
    spawnedMinibossKinds.clear();
    eliteModifierBindings.length = 0;
    resetPitchEventDirector(pitchEventDirector);
    environmentInteractions = createPitchInteractions();
    lastEnvironmentHitId = null;
    encounterRenderer.reset();
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
    secondaryRenderer.reset();
    atmosphere.reset();
    announcement.reset();
    evolutionToast.reset();
    halftimeOverlay.reset();
    upgradeOverlay.reset();
    settingsOverlay.hide();
    careerOverlay.hide();
    curseOverlay.reset();
    pauseOverlay.hide();
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
    tutorialTracker.reset(hasCompletedTutorial());
    tutorialPrompt.reset();
    pendingHalftimeChoice = undefined;
    movementSpeedMultiplier = 1;
    kickPowerMultiplier = 1;
    ballDamageMultiplier = 1;
    recallSpeedMultiplier = 1;
    volleyWindowBonus = 0;
    state.phase = 'playing';
    previousBallState = physics.ballState;
    audio.playKickoff();
    audio.playPhase(0);
    audio.setMatchIntensity('opening');
    announcement.show(
      'kickoff',
      `${CHARACTER_DEFINITIONS[selectedCharacterId].name.toUpperCase()} ENTERS THE PITCH`,
    );
    tutorialPrompt.update(tutorialTracker.state);
    input.requestPointerLock();
  };
  const kickoffButton = hud.kickoffButton;
  const dailyRunButton = hud.dailyRunButton;
  const weeklyRunButton = hud.weeklyRunButton;
  const customSeedButton = hud.customSeedButton;
  const customSeedInput = hud.customSeedInput;
  const cursedRunButton = hud.cursedRunButton;
  const restartButton = hud.restartButton;
  const victoryRestartButton = hud.victoryRestartButton;
  kickoffButton.addEventListener('click', () => {
    selectedCurses = [];
    prepareRun('standard');
    prepareProgressionForRun();
    begin();
  });
  dailyRunButton.addEventListener('click', () => beginChallengeRun('daily'));
  weeklyRunButton.addEventListener('click', () => beginChallengeRun('weekly'));
  const beginCustomSeedRun = (): void => {
    const seed = customSeedInput.value.trim();
    if (!seed) {
      customSeedInput.focus();
      return;
    }
    selectedCurses = [];
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
      audio.playCurseAccepted();
      prepareRun('standard');
      prepareProgressionForRun();
      begin();
      announcement.show('kickoff', `${selectedCurses.length} CURSES ACCEPTED`);
    });
  });
  restartButton.addEventListener('click', restart);
  victoryRestartButton.addEventListener('click', restart);
  const openSettings = (): void => {
    if (input.isLocked) void document.exitPointerLock();
    settingsOverlay.show();
  };
  const openCareer = (): void => {
    if (input.isLocked) void document.exitPointerLock();
    careerOverlay.show();
    audio.playUiSelect();
  };
  const settingsButton = hud.settingsButton;
  const titleSettingsButton = hud.titleSettingsButton;
  const titleCareerButton = hud.titleCareerButton;
  const titleQuitButton = hud.titleQuitButton;
  settingsButton.addEventListener('click', openSettings);
  titleSettingsButton.addEventListener('click', openSettings);
  titleCareerButton.addEventListener('click', openCareer);
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
    secondaryRenderer.reset();
    atmosphere.reset();
    announcement.reset();
    evolutionToast.reset();
    halftimeOverlay.reset();
    resultsOverlay.reset();
    careerOverlay.hide();
    curseOverlay.reset();
    pauseOverlay.hide();
    state.phase = 'ready';
    selectedCharacterId = profileStore.value.selectedCharacterId;
    bridge.setCharacter(selectedCharacterId);
    characterUltimate = new CharacterUltimateSystem(selectedCharacterId);
    activeUltimateEffects = NEUTRAL_ULTIMATE_EFFECTS;
    prepareRun('standard');
    selectedCurses = [];
    progression = createSelectedProgression(selectedCharacterId);
    applyProgressionHealth(100);
    focusKick = resetFocusKick();
    match = createMatchDirectorState();
    boss = null;
    resultsShown = false;
    runId = createRunId();
    perf.reset();
    tutorialSignals.clear();
    tutorialTracker.reset(hasCompletedTutorial());
    tutorialPrompt.reset();
    audio.setMatchIntensity('menu');
    pendingHalftimeChoice = undefined;
    movementSpeedMultiplier = 1;
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
    audio.setMatchIntensity('paused');
  };
  const onGlobalKeyDown = (event: KeyboardEvent): void => {
    if (event.key === 'Escape' && !pauseOverlay.isVisible) showPause();
  };
  window.addEventListener('keydown', onGlobalKeyDown);
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
      const rawAim = cameraController.aimDirection();
      refreshCombatTargets();
      const aimTarget = selectAimAssistTarget(
        state.player.position,
        rawAim,
        secondaryTargets,
        playerSettings.aimAssistStrength,
      );
      const assistedHorizontal = aimTarget
        ? steerAimDirection(rawAim, aimTarget.direction, playerSettings.aimAssistStrength)
        : { x: rawAim.x, z: rawAim.z };
      const horizontalScale = Math.sqrt(Math.max(0, 1 - rawAim.y * rawAim.y));
      const focusShot = consumeFocusKickShot(focusKick);
      const result = physics.kick(
        state.player.position,
        {
          x: assistedHorizontal.x * horizontalScale,
          y: rawAim.y,
          z: assistedHorizontal.z * horizontalScale,
        },
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
      );
      if (result) {
        runTelemetry.recordKick();
        if (result.charge >= 0.72) {
          weaponExpansion.triggerHolyPenaltyZone(state.player.position, progression.modifiers);
          footballArmory.triggerHeader(state.player.position, rawAim, progression.modifiers);
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

    accumulator += frameTime * getFocusKickTimeScale(focusKick);
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
        const aim = cameraController.aimDirection();
        const ultimateStep = characterUltimate.step({
          dt: FIXED_STEP,
          playerPosition: state.player.position,
          facingDirection: aim,
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
        updatePlayer(
          state,
          movement,
          cameraController.yaw,
          FIXED_STEP,
          movementSpeedMultiplier *
            progression.modifiers.movementSpeedMultiplier *
            activeUltimateEffects.movementSpeedMultiplier,
          progression.modifiers.dashCooldownMultiplier * activeUltimateEffects.dashCooldownMultiplier,
        );
        const dashStarted = !dashWasActive && state.player.dashTime > 0;
        if (dashStarted) {
          runTelemetry.recordDash();
          audio.playDash();
          input.rumble(0.32, 70);
          weaponExpansion.triggerDashShockwave(state.player.position, progression.modifiers);
        }
        spawnDirectorInputScratch.stage = match.stage;
        spawnDirectorInputScratch.stageElapsed = match.stageElapsed;
        spawnDirectorInputScratch.matchElapsed = match.matchElapsed;
        updateEnemies(
          state,
          FIXED_STEP,
          spawnDirectorInputScratch,
          runRandomStreams.spawn.next,
          physics.ballPosition,
          progression.modifiers.damageTakenMultiplier * activeUltimateEffects.damageTakenMultiplier,
          absorbIncomingDamage,
        );
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
        const pitchEvent = updatePitchEventDirector(pitchEventDirector, state, match.stage);
        if (pitchEvent) {
          eliteModifierBindings.push(...pitchEvent.eliteBindings);
          announcement.show('kickoff', pitchEvent.announcement, 1.55);
          audio.playBossPhase('bloodRush');
          bridge.voidBurst(pitchEvent.formation.enemies[0]?.position ?? state.player.position, 1.2);
        }
        if (!miniboss || miniboss.phase === 'defeated') {
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
          audio.playPlayerHurt();
          input.rumble(0.7, 130);
          cameraController.addImpulse(0.24);
        }
      }
      physics.syncPlayer(state.player.position);
      if (simulationActive) physics.step(state.player.position, state.player.facing, FIXED_STEP);
      if (simulationActive) {
        const comboBeforeHit = state.combo;
        const primaryDamage = damageEnemiesWithBall(
          state,
          physics.ballPosition,
          physics.ballSpeed,
          progression.modifiers.ballDamageMultiplier *
            progression.modifiers.allDamageMultiplier *
            ballDamageMultiplier,
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
            activeUltimateEffects.ballDamageMultiplier,
        );
        if (primaryDamage.rebound) {
          physics.applyBallRebound(primaryDamage.rebound.normal, primaryDamage.rebound.velocityMultiplier);
        }
        if (primaryDamage.blockedHits > 0) {
          if (physics.ballSpeed > 17) audio.playGoalkeeperParry();
          else audio.playGoalkeeperCatch();
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
          if (event.type === 'header-knockback') {
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
                ballDamageMultiplier,
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

        resolveEnvironmentEvents(updateEnvironmentInteractions(environmentInteractions, FIXED_STEP));
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
              if (event.to === 'bloodRush' || event.to === 'desperation') audio.playBossPhase(event.to);
              else audio.playPhase(2);
            }
            if (event.type === 'summonElite') spawnEliteEnemy(state, event.archetype, event.side);
            if (event.type === 'diveTelegraphed') audio.playGoalkeeperParry();
            if (event.type === 'diveStarted') cameraController.addImpulse(0.2);
            if (event.type === 'counterattackStarted') audio.playBossPhase('bloodRush');
            if (event.type === 'counterattackReleased' && state.player.invulnerability <= 0) {
              const incomingDamage = absorbIncomingDamage(
                event.damage *
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
                ballDamageMultiplier,
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
              audio.playHit(1);
            }
            bossDefeatedThisStep = didDefeatCountGoalkeeper(damage.events);
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
          scored && goalCrossing ? evaluateGoalQuality(goalCrossing.crossing.x, physics.ballSpeed) : null;
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
          MATCH_CONFIG,
        );
        pendingHalftimeChoice = undefined;
        match = matchUpdate.state;
        for (const event of matchUpdate.events) {
          if (event.type === 'stageChanged') {
            audio.playPhase(matchUpdate.state.matchElapsed);
            audio.setMatchIntensity(event.to);
            atmosphere.setPhase(event.to);
            if (event.to === 'finalWave' && !boss) {
              boss = spawnCountGoalkeeper();
              audio.playFinalWave();
              audio.playBossEntrance();
            }
          }
          if (event.type === 'goalScored') {
            runTelemetry.recordGoal();
            characterUltimate.gainCharge(goalQuality?.ultimateCharge ?? 24);
            chargeFocusKick('goal');
            signalTutorial('goal-scored');
            state.score += goalQuality?.score ?? 1_000;
            audio.playGoal();
            audio.playNetImpact();
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
          }
          if (event.type === 'victory') {
            state.phase = 'won';
            audio.playVictory();
            announcement.show('finalWhistle', 'COUNT GOALKEEPER HAS FALLEN');
          }
          if (event.type === 'timeExpired') {
            state.phase = 'dead';
            announcement.show('finalWhistle', 'THE COUNT HOLDS THE PITCH');
          }
        }
      }
      const recallStarted =
        (physics.ballState === 'recalling' || physics.ballState === 'recovering') &&
        previousBallState !== 'recalling' &&
        previousBallState !== 'recovering';
      if (recallStarted) audio.playRecall();
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
    if (halftimeOverlay.isVisible) {
      const remaining = Math.max(0, (halftimeDeadline - performance.now()) / 1_000);
      halftimeOverlay.updateCountdown(remaining);
      if (remaining <= 0) {
        pendingHalftimeChoice = MATCH_CONFIG.defaultHalftimeChoice;
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
    aimGuide.sync(
      renderPlayerPosition,
      cameraController.aimDirection(),
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
    bossVisual.sync(boss, alpha);
    bloodShardRenderer.sync(bloodShards.state, alpha);
    secondaryRenderer.sync(secondaryRenderState);
    hud.update(
      state,
      physics.ballState,
      perf.snapshot,
      input.kickCharge,
      progression,
      getMatchObjective(match, MATCH_CONFIG),
      boss,
      focusKick,
      characterUltimate.state,
    );
    if (!resultsShown && (state.phase === 'dead' || state.phase === 'won')) {
      resultsShown = true;
      if (state.phase === 'dead') audio.playDefeat();
      let settlement: RunSettlement | null = null;
      if (!qaScenario) {
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
    kickoffButton.removeEventListener('click', begin);
    restartButton.removeEventListener('click', restart);
    victoryRestartButton.removeEventListener('click', restart);
    settingsButton.removeEventListener('click', openSettings);
    titleSettingsButton.removeEventListener('click', openSettings);
    titleCareerButton.removeEventListener('click', openCareer);
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
    curseOverlay.dispose();
    halftimeOverlay.dispose();
    announcement.dispose();
    evolutionToast.dispose();
    tutorialPrompt.dispose();
    hud.dispose();
    uninstallDenseWavePerformanceHook();
    uninstallQaSnapshotHook();
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

import './styles.css';
import * as THREE from 'three';
import { AudioManager } from './audio';
import { countActivePoolItems, createPerformanceCounters, PerfMeter } from './diagnostics/PerfMeter';
import { InputController } from './game/input/InputController';
import {
  damageCountGoalkeeper,
  spawnCountGoalkeeper,
  updateCountGoalkeeper,
  type CountGoalkeeperState,
} from './game/boss';
import { SecondaryWeaponSystem } from './game/combat';
import {
  createMatchDirectorState,
  FULL_MATCH_CONFIG,
  getMatchObjective,
  updateMatchDirector,
  type HalftimeChoice,
} from './game/match';
import { BloodShardSystem } from './game/pickups';
import {
  chooseUpgrade,
  createProgressionState,
  getUpgradeAvailability,
  grantBloodXp,
  UPGRADE_IDS,
  type UpgradeId,
} from './game/progression';
import {
  createGameState,
  damageEnemiesWithBall,
  damageEnemiesWithSecondary,
  resetGameState,
  resetKickoffFormation,
  spawnEliteEnemy,
  updateEnemies,
  updatePlayer,
} from './game/simulation/gameState';
import { TutorialTracker, type TutorialSignal } from './game/tutorial';
import { PhysicsWorld } from './physics/PhysicsWorld';
import { RenderBridge } from './render/adapters/RenderBridge';
import { CameraController } from './render/app/CameraController';
import { createRenderer } from './render/app/createRenderer';
import { createScene } from './render/app/createScene';
import { GoalBeacon } from './render/objects/GoalBeacon';
import { CountGoalkeeperVisual } from './render/objects/CountGoalkeeperVisual';
import { BloodShardRenderer } from './render/objects/BloodShardRenderer';
import { SecondaryWeaponRenderer } from './render/objects/SecondaryWeaponRenderer';
import { PhaseAtmosphere } from './render/objects/PhaseAtmosphere';
import { SettingsStore, type PlayerSettings } from './settings/SettingsStore';
import { Hud } from './ui/Hud';
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
const PLAYABLE_UPGRADES = [
  'silverBall',
  'powerKick',
  'rapidRecall',
  'piercingStuds',
  'garlicTrail',
  'orbitingSpectralBall',
  'bloodBomb',
  'ghostPass',
] as const satisfies readonly UpgradeId[];

async function bootstrap(): Promise<void> {
  const root = document.getElementById('app');
  if (!root) throw new Error('Missing application root');

  const settingsStore = new SettingsStore();
  let playerSettings = settingsStore.value;
  const renderer = createRenderer(root);
  const scene = createScene();
  const cameraController = new CameraController();
  const input = new InputController(renderer.domElement);
  const audio = new AudioManager();
  audio.setMatchIntensity('menu');
  const physics = await PhysicsWorld.create();
  const state = createGameState();
  const bridge = new RenderBridge(scene);
  const goalBeacon = new GoalBeacon(scene);
  const bossVisual = new CountGoalkeeperVisual(scene);
  const bloodShards = new BloodShardSystem();
  const bloodShardRenderer = new BloodShardRenderer(scene, bloodShards.state.capacity);
  const secondaryWeapons = new SecondaryWeaponSystem();
  const secondaryRenderer = new SecondaryWeaponRenderer(scene);
  const atmosphere = new PhaseAtmosphere(scene);
  const hud = new Hud(root);
  const upgradeOverlay = new UpgradeOverlay(root);
  const settingsOverlay = new SettingsOverlay(root, settingsStore, (settings) => {
    playerSettings = settings;
    applyPlayerSettings(settings);
  });
  const pauseOverlay = new PauseOverlay(root);
  const resultsOverlay = new ResultsOverlay(root);
  const halftimeOverlay = new HalftimeOverlay(root);
  const announcement = new MatchAnnouncement(root);
  const tutorialTracker = new TutorialTracker(hasCompletedTutorial());
  const tutorialPrompt = new TutorialPrompt(root);
  const perf = new PerfMeter();
  const perfCounters = createPerformanceCounters();
  const clock = new THREE.Clock();
  let accumulator = 0;
  let previousBallState = physics.ballState;
  let progression = createProgressionState();
  let match = createMatchDirectorState();
  let goalLatched = false;
  let boss: CountGoalkeeperState | null = null;
  let lastRenderedAt = 0;
  let resultsShown = false;
  let pendingHalftimeChoice: HalftimeChoice | undefined;
  let halftimeDeadline = 0;
  let movementSpeedMultiplier = 1;
  let kickPowerMultiplier = 1;
  let ballDamageMultiplier = 1;
  let recallSpeedMultiplier = 1;
  let volleyWindowBonus = 0;
  let fixedStepsThisFrame = 0;
  const tutorialSignals = new Set<TutorialSignal>();

  const signalTutorial = (signal: TutorialSignal): void => {
    if (tutorialTracker.complete || tutorialSignals.has(signal)) return;
    tutorialSignals.add(signal);
    const update = tutorialTracker.signal(signal);
    tutorialPrompt.update(update.state);
    if (update.tutorialCompleted) persistTutorialCompletion();
  };

  const offerUpgrade = (): void => {
    if (
      upgradeOverlay.isVisible ||
      settingsOverlay.isVisible ||
      halftimeOverlay.isVisible ||
      progression.pendingLevelUps <= 0 ||
      state.phase !== 'playing'
    )
      return;
    const choices = PLAYABLE_UPGRADES.filter(
      (upgradeId) => getUpgradeAvailability(progression, upgradeId).available,
    );
    if (choices.length === 0) return;
    if (input.isLocked) void document.exitPointerLock();
    void upgradeOverlay.show(choices, progression).then((upgradeId) => {
      if (!upgradeId || state.phase !== 'playing') return;
      const result = chooseUpgrade(progression, upgradeId);
      if (!result.applied) return;
      progression = result.state;
      signalTutorial('upgrade-selected');
      audio.playPhase(progression.level);
      if (result.evolutionEvents.length > 0) {
        audio.playGoal();
        bridge.volleyBurst(state.player.position, 1.8);
        cameraController.volleyImpulse(1.2);
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
    cameraController.setReducedShake(settings.reducedCameraShake);
    renderer.shadowMap.enabled = settings.renderQuality !== 'performance';
    resize();
  };
  window.addEventListener('resize', resize);
  applyPlayerSettings(playerSettings);
  cameraController.update(state.player.position, 1);

  const begin = (): void => {
    void audio.unlock();
    if (state.phase === 'ready') state.phase = 'playing';
    audio.playPhase(0);
    audio.setMatchIntensity('opening');
    announcement.show('kickoff');
    tutorialPrompt.update(tutorialTracker.state);
    hud.start();
    input.requestPointerLock();
  };
  const restart = (): void => {
    void audio.unlock();
    resetGameState(state);
    physics.reset(state.player.position);
    bridge.reset();
    goalBeacon.reset();
    bossVisual.reset();
    bloodShards.reset();
    bloodShardRenderer.reset();
    secondaryWeapons.reset();
    secondaryRenderer.reset();
    atmosphere.reset();
    announcement.reset();
    halftimeOverlay.reset();
    upgradeOverlay.reset();
    settingsOverlay.hide();
    pauseOverlay.hide();
    resultsOverlay.reset();
    hud.reset();
    progression = createProgressionState();
    match = createMatchDirectorState();
    goalLatched = false;
    boss = null;
    resultsShown = false;
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
    audio.playPhase(0);
    audio.setMatchIntensity('opening');
    announcement.show('kickoff');
    tutorialPrompt.update(tutorialTracker.state);
    input.requestPointerLock();
  };
  hud.kickoffButton.addEventListener('click', begin);
  hud.restartButton.addEventListener('click', restart);
  hud.victoryRestartButton.addEventListener('click', restart);
  const openSettings = (): void => {
    if (input.isLocked) void document.exitPointerLock();
    settingsOverlay.show();
  };
  hud.settingsButton.addEventListener('click', openSettings);
  hud.titleSettingsButton.addEventListener('click', openSettings);
  const returnToMenu = (): void => {
    resetGameState(state);
    physics.reset(state.player.position);
    bridge.reset();
    bloodShards.reset();
    bloodShardRenderer.reset();
    secondaryWeapons.reset();
    secondaryRenderer.reset();
    atmosphere.reset();
    announcement.reset();
    halftimeOverlay.reset();
    resultsOverlay.reset();
    pauseOverlay.hide();
    state.phase = 'ready';
    progression = createProgressionState();
    match = createMatchDirectorState();
    boss = null;
    resultsShown = false;
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
  renderer.domElement.addEventListener('click', () => {
    if (state.phase === 'ready') begin();
    else if (
      state.phase === 'playing' &&
      !input.isLocked &&
      !settingsOverlay.isVisible &&
      !pauseOverlay.isVisible &&
      !halftimeOverlay.isVisible
    )
      input.requestPointerLock();
  });

  renderer.setAnimationLoop((time) => {
    const frameInterval = playerSettings.fpsLimit === 'unlimited' ? 0 : 1_000 / playerSettings.fpsLimit;
    if (frameInterval > 0 && time - lastRenderedAt < frameInterval - 0.25) return;
    lastRenderedAt = time;
    fixedStepsThisFrame = 0;
    const frameTime = Math.min(MAX_FRAME_TIME, clock.getDelta());
    const mouse = input.consumeMouseDelta();
    cameraController.applyMouseDelta(mouse.x, mouse.y);

    if (
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
      !pauseOverlay.isVisible &&
      !halftimeOverlay.isVisible &&
      kick
    ) {
      const result = physics.kick(
        state.player.position,
        cameraController.aimDirection(),
        kick.charge,
        {
          ...progression.modifiers,
          kickPowerMultiplier: progression.modifiers.kickPowerMultiplier * kickPowerMultiplier,
        },
        kick.curve,
      );
      if (result) {
        signalTutorial('kick-demonstrated');
        audio.playKick(result.charge);
        if (result.perfectVolley) {
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
        !pauseOverlay.isVisible &&
        !halftimeOverlay.isVisible &&
        input.recall,
      {
        recallSpeedMultiplier: progression.modifiers.recallSpeedMultiplier * recallSpeedMultiplier,
      },
      volleyWindowBonus,
    );

    accumulator += frameTime;
    while (accumulator >= FIXED_STEP) {
      const simulationActive =
        state.phase === 'playing' &&
        !upgradeOverlay.isVisible &&
        !settingsOverlay.isVisible &&
        !pauseOverlay.isVisible &&
        !halftimeOverlay.isVisible;
      if (simulationActive) {
        const healthBeforeUpdate = state.player.health;
        const movement = input.movement(cameraController.yaw);
        if (Math.hypot(movement.x, movement.z) > 0.2) signalTutorial('movement-demonstrated');
        if (movement.dash) signalTutorial('dash-demonstrated');
        updatePlayer(state, movement, cameraController.yaw, FIXED_STEP, movementSpeedMultiplier);
        updateEnemies(state, FIXED_STEP);
        if (state.player.health < healthBeforeUpdate) {
          audio.playPlayerHurt();
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
          progression.modifiers.ballDamageMultiplier * ballDamageMultiplier,
          physics.ballVelocity,
          progression.modifiers.pierceCount,
        );
        const { hits, kills } = primaryDamage;
        if (primaryDamage.rebound) {
          physics.applyBallRebound(primaryDamage.rebound.normal, primaryDamage.rebound.velocityMultiplier);
        }
        if (hits > 0) {
          const hitIntensity = Math.min(1, physics.ballSpeed / physics.maxBallSpeed);
          audio.playHit(hitIntensity);
          bridge.hitBurst(physics.ballPosition, hitIntensity);
          cameraController.hitImpulse(hitIntensity);
        }
        if (state.combo > comboBeforeHit) audio.playKill(state.combo);
        if (kills > 0) {
          bloodShards.spawnOnKill(physics.ballPosition, kills * 10, Math.min(9, kills * 3));
          secondaryWeapons.triggerBloodBomb(physics.ballPosition, progression.modifiers);
        }

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
          targets: state.enemies,
        });
        const secondaryDamage = damageEnemiesWithSecondary(state, secondaryStep.hits);
        if (secondaryDamage.hits > 0) {
          audio.playHit(0.7);
          const effectPosition = secondaryStep.hits[0]?.position ?? physics.ballPosition;
          bridge.hitBurst(effectPosition, 0.8);
        }
        if (secondaryDamage.kills > 0) {
          bloodShards.spawnOnKill(
            physics.ballPosition,
            secondaryDamage.kills * 10,
            Math.min(9, secondaryDamage.kills * 3),
          );
          audio.playKill(state.combo);
        }
        for (const event of secondaryStep.events) {
          if (event.type === 'blood-bomb-triggered') bridge.volleyBurst(event.position, 1.2);
        }

        const collectedXp = bloodShards.update(state.player.position, FIXED_STEP);
        if (collectedXp > 0) {
          progression = grantBloodXp(progression, collectedXp).state;
          signalTutorial('xp-collected');
        }

        let bossDefeatedThisStep = false;
        if (boss && boss.phase !== 'defeated') {
          const bossUpdate = updateCountGoalkeeper(boss, {
            dt: FIXED_STEP,
            playerPosition: state.player.position,
          });
          boss = bossUpdate.state;
          for (const event of bossUpdate.events) {
            if (event.type === 'contactAttack' && state.player.invulnerability <= 0) {
              state.player.health = Math.max(0, state.player.health - event.damage);
              state.player.invulnerability = 0.7;
              audio.playPlayerHurt();
              cameraController.addImpulse(0.32);
              if (state.player.health <= 0) state.phase = 'dead';
            }
            if (event.type === 'phaseChanged') audio.playPhase(event.to === 'desperation' ? 3 : 2);
            if (event.type === 'summonElite') spawnEliteEnemy(state, event.archetype, event.side);
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
                ballDamageMultiplier,
              source: 'ball',
            });
            boss = damage.state;
            if (damage.appliedDamage > 0) {
              bridge.hitBurst(boss.position, 1.4);
              cameraController.hitImpulse(1.25);
              audio.playHit(1);
            }
            bossDefeatedThisStep = damage.events.some((event) => event.type === 'defeated');
          }
        }

        const ball = physics.ballPosition;
        const insideGoal = ball.z < -14 && Math.abs(ball.x) < 2.55 && ball.y < 3.2;
        const scored =
          (match.stage === 'goalOpportunity' || match.stage === 'finalGoal') && insideGoal && !goalLatched;
        goalLatched = insideGoal;
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
            if (event.to === 'finalWave' && !boss) boss = spawnCountGoalkeeper();
          }
          if (event.type === 'goalScored') {
            signalTutorial('goal-scored');
            state.score += 1_000;
            audio.playGoal();
            announcement.show('goal', event.goal === 'final' ? 'THE FINAL KEEPER AWAKENS' : undefined);
            resetKickoffFormation(state);
            physics.reset(state.player.position);
            bloodShards.reset();
            secondaryWeapons.reset();
          }
          if (event.type === 'goalOpportunityStarted' && event.goal === 'final') {
            announcement.show('finalGoal');
          }
          if (event.type === 'halftimeChoiceStarted') {
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
            announcement.show('bloodMoon');
          }
          if (event.type === 'victory') {
            state.phase = 'won';
            audio.playGoal();
            announcement.show('finalWhistle', 'COUNT GOALKEEPER HAS FALLEN');
          }
        }
      }
      const recallStarted =
        (physics.ballState === 'recalling' || physics.ballState === 'recovering') &&
        previousBallState !== 'recalling' &&
        previousBallState !== 'recovering';
      if (recallStarted) audio.playRecall();
      if (recallStarted) signalTutorial('recall-demonstrated');
      previousBallState = physics.ballState;
      accumulator -= FIXED_STEP;
      fixedStepsThisFrame += 1;
    }

    goalBeacon.setActive(match.stage === 'goalOpportunity' || match.stage === 'finalGoal');
    goalBeacon.update(frameTime);
    announcement.update(frameTime);
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
    bridge.sync(state, physics.ballRenderPosition(alpha), physics.ballSpeed, frameTime, alpha);
    bossVisual.sync(boss, alpha);
    bloodShardRenderer.sync(bloodShards.state, alpha);
    secondaryRenderer.sync(secondaryWeapons.renderState);
    hud.update(
      state,
      physics.ballState,
      perf.snapshot,
      input.kickCharge,
      progression,
      getMatchObjective(match, MATCH_CONFIG),
      boss,
    );
    if (!resultsShown && (state.phase === 'dead' || state.phase === 'won')) {
      resultsShown = true;
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
    perfCounters.garlicPoolActive = countActivePoolItems(secondaryWeapons.renderState.garlicZones);
    perfCounters.garlicPoolCapacity = secondaryWeapons.renderState.garlicZones.length;
    perfCounters.orbitPoolActive = countActivePoolItems(secondaryWeapons.renderState.orbitingBalls);
    perfCounters.orbitPoolCapacity = secondaryWeapons.renderState.orbitingBalls.length;
    perfCounters.ghostPassPoolActive = countActivePoolItems(secondaryWeapons.renderState.ghostPasses);
    perfCounters.ghostPassPoolCapacity = secondaryWeapons.renderState.ghostPasses.length;
    perf.update(frameTime, perfCounters);
  });

  renderer.domElement.addEventListener('webglcontextlost', (event) => {
    event.preventDefault();
    renderer.setAnimationLoop(null);
  });
  renderer.domElement.addEventListener('webglcontextrestored', () => window.location.reload());
  window.addEventListener(
    'beforeunload',
    () => {
      input.dispose();
      window.removeEventListener('keydown', onGlobalKeyDown);
      window.removeEventListener('blur', onFocusLoss);
      document.removeEventListener('visibilitychange', onVisibilityChange);
      void audio.dispose();
      goalBeacon.dispose();
      bossVisual.dispose();
      bloodShardRenderer.dispose();
      secondaryRenderer.dispose();
      upgradeOverlay.dispose();
      settingsOverlay.dispose();
      pauseOverlay.dispose();
      resultsOverlay.dispose();
      halftimeOverlay.dispose();
      announcement.dispose();
      tutorialPrompt.dispose();
      atmosphere.dispose();
      bridge.dispose();
    },
    { once: true },
  );
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

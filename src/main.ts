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
import {
  activateFocusKick,
  applyFocusKickCombatAction,
  consumeFocusKickShot,
  createFocusKickState,
  getFocusKickTimeScale,
  resetFocusKick,
  SecondaryWeaponSystem,
  selectAimAssistTarget,
  steerAimDirection,
  stepFocusKick,
  type FocusKickCombatAction,
} from './game/combat';
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
  applyEnemySlow,
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
  'stormStuds',
  'frostCleats',
  'spectralVolley',
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
  let focusKick = createFocusKickState();
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
  let disposed = false;
  const tutorialSignals = new Set<TutorialSignal>();

  const chargeFocusKick = (action: FocusKickCombatAction, count = 1): void => {
    for (let index = 0; index < count; index += 1) {
      focusKick = applyFocusKickCombatAction(focusKick, action);
    }
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
        audio.playEvolutionUnlock();
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
    input.setKeyBindings(settings.keyBindings);
    hud.setControlBindings(settings.keyBindings);
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
    focusKick = resetFocusKick();
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
  const kickoffButton = hud.kickoffButton;
  const restartButton = hud.restartButton;
  const victoryRestartButton = hud.victoryRestartButton;
  kickoffButton.addEventListener('click', begin);
  restartButton.addEventListener('click', restart);
  victoryRestartButton.addEventListener('click', restart);
  const openSettings = (): void => {
    if (input.isLocked) void document.exitPointerLock();
    settingsOverlay.show();
  };
  const settingsButton = hud.settingsButton;
  const titleSettingsButton = hud.titleSettingsButton;
  settingsButton.addEventListener('click', openSettings);
  titleSettingsButton.addEventListener('click', openSettings);
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
    focusKick = resetFocusKick();
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
  const onCanvasClick = (): void => {
    if (state.phase === 'ready') begin();
    else if (
      state.phase === 'playing' &&
      !input.isLocked &&
      !settingsOverlay.isVisible &&
      !pauseOverlay.isVisible &&
      !halftimeOverlay.isVisible
    )
      input.requestPointerLock();
  };
  renderer.domElement.addEventListener('click', onCanvasClick);

  renderer.setAnimationLoop((time) => {
    const frameInterval = playerSettings.fpsLimit === 'unlimited' ? 0 : 1_000 / playerSettings.fpsLimit;
    if (frameInterval > 0 && time - lastRenderedAt < frameInterval - 0.25) return;
    lastRenderedAt = time;
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
      !pauseOverlay.isVisible &&
      !halftimeOverlay.isVisible
    ) {
      focusKick = activateFocusKick(focusKick);
    }
    cameraController.setFocusMode(focusKick.phase === 'aiming');
    bridge.setFirstPerson(focusKick.phase === 'aiming');

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
      const rawAim = cameraController.aimDirection();
      const aimTarget = selectAimAssistTarget(
        state.player.position,
        rawAim,
        [
          ...state.enemies,
          ...(boss && boss.phase !== 'defeated' ? [{ id: -1, position: boss.position }] : []),
        ],
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
            (focusShot.empowered ? 1.75 : 1),
        },
        kick.curve,
      );
      if (result) {
        if (focusShot.empowered) {
          focusKick = focusShot.state;
          bridge.volleyBurst(state.player.position, 2);
          cameraController.volleyImpulse(1.4);
        }
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

    accumulator += frameTime * getFocusKickTimeScale(focusKick);
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
          chargeFocusKick('enemy-hit', hits);
          if (primaryDamage.firstHitEnemyId !== undefined) {
            secondaryWeapons.triggerChainLightning(
              primaryDamage.firstHitEnemyId,
              physics.ballPosition,
              progression.modifiers,
            );
          }
          secondaryWeapons.triggerFrostBurst(physics.ballPosition, progression.modifiers);
          secondaryWeapons.triggerMultiBall({
            origin: physics.ballPosition,
            direction: physics.ballVelocity,
            baseDamage:
              (physics.ballSpeed > 17 ? 2 : 1) *
              progression.modifiers.ballDamageMultiplier *
              ballDamageMultiplier,
            modifiers: progression.modifiers,
          });
          const hitIntensity = Math.min(1, physics.ballSpeed / physics.maxBallSpeed);
          audio.playHit(hitIntensity);
          bridge.hitBurst(physics.ballPosition, hitIntensity);
          cameraController.hitImpulse(hitIntensity);
        }
        if (state.combo > comboBeforeHit) audio.playKill(state.combo);
        if (kills > 0) {
          chargeFocusKick('enemy-kill', kills);
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
          chargeFocusKick('enemy-hit', secondaryDamage.hits);
          audio.playHit(0.7);
          const effectPosition = secondaryStep.hits[0]?.position ?? physics.ballPosition;
          bridge.hitBurst(effectPosition, 0.8);
        }
        if (secondaryDamage.kills > 0) {
          chargeFocusKick('enemy-kill', secondaryDamage.kills);
          bloodShards.spawnOnKill(
            physics.ballPosition,
            secondaryDamage.kills * 10,
            Math.min(9, secondaryDamage.kills * 3),
          );
          audio.playKill(state.combo);
        }
        for (const event of secondaryStep.events) {
          if (event.type === 'blood-bomb-triggered') bridge.volleyBurst(event.position, 1.2);
          if (event.type === 'chain-lightning-hit') bridge.lightningBurst(event.position, 0.95);
          if (event.type === 'frost-burst-triggered') bridge.frostBurst(event.position, 1.2);
          if (event.type === 'frost-burst-hit') {
            applyEnemySlow(state, event.targetId, event.speedMultiplier, event.duration);
          }
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
            if (event.type === 'phaseChanged') {
              if (event.to === 'bloodRush' || event.to === 'desperation') audio.playBossPhase(event.to);
              else audio.playPhase(2);
            }
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
              chargeFocusKick('boss-hit');
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
            if (event.to === 'finalWave' && !boss) {
              boss = spawnCountGoalkeeper();
              audio.playBossEntrance();
            }
          }
          if (event.type === 'goalScored') {
            chargeFocusKick('goal');
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
            audio.playVictory();
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
      focusKick,
    );
    if (!resultsShown && (state.phase === 'dead' || state.phase === 'won')) {
      resultsShown = true;
      if (state.phase === 'dead') audio.playDefeat();
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

  const onContextLost = (event: Event): void => {
    event.preventDefault();
    renderer.setAnimationLoop(null);
  };
  const onContextRestored = (): void => window.location.reload();
  renderer.domElement.addEventListener('webglcontextlost', onContextLost);
  renderer.domElement.addEventListener('webglcontextrestored', onContextRestored);

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
    renderer.domElement.removeEventListener('click', onCanvasClick);
    renderer.domElement.removeEventListener('webglcontextlost', onContextLost);
    renderer.domElement.removeEventListener('webglcontextrestored', onContextRestored);
    if (input.isLocked) void document.exitPointerLock();
    input.dispose();
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
    hud.dispose();
    atmosphere.dispose();
    bridge.dispose();
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

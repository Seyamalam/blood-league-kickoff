import './styles.css';
import * as THREE from 'three';
import { AudioManager } from './audio';
import { PerfMeter } from './diagnostics/PerfMeter';
import { InputController } from './game/input/InputController';
import { createMatchDirectorState, getMatchObjective, updateMatchDirector } from './game/match';
import {
  chooseUpgrade,
  createProgressionState,
  getUpgradeAvailability,
  grantBloodXp,
  type UpgradeId,
} from './game/progression';
import { createGameState, damageEnemiesWithBall, resetGameState, updateEnemies, updatePlayer } from './game/simulation/gameState';
import { PhysicsWorld } from './physics/PhysicsWorld';
import { RenderBridge } from './render/adapters/RenderBridge';
import { CameraController } from './render/app/CameraController';
import { createRenderer } from './render/app/createRenderer';
import { createScene } from './render/app/createScene';
import { GoalBeacon } from './render/objects/GoalBeacon';
import { Hud } from './ui/Hud';
import { UpgradeOverlay } from './ui/UpgradeOverlay';

const FIXED_STEP = 1 / 60;
const MAX_FRAME_TIME = 0.1;
const PLAYABLE_UPGRADES = ['silverBall', 'powerKick', 'rapidRecall'] as const satisfies readonly UpgradeId[];

async function bootstrap(): Promise<void> {
  const root = document.getElementById('app');
  if (!root) throw new Error('Missing application root');

  const renderer = createRenderer(root);
  const scene = createScene();
  const cameraController = new CameraController();
  const input = new InputController(renderer.domElement);
  const audio = new AudioManager();
  const physics = await PhysicsWorld.create();
  const state = createGameState();
  const bridge = new RenderBridge(scene);
  const goalBeacon = new GoalBeacon(scene);
  const hud = new Hud(root);
  const upgradeOverlay = new UpgradeOverlay(root);
  const perf = new PerfMeter();
  const clock = new THREE.Clock();
  let accumulator = 0;
  let previousBallState = physics.ballState;
  let progression = createProgressionState();
  let match = createMatchDirectorState();
  let goalLatched = false;

  const offerUpgrade = (): void => {
    if (upgradeOverlay.isVisible || progression.pendingLevelUps <= 0 || state.phase !== 'playing') return;
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
      audio.playPhase(progression.level);
      if (progression.pendingLevelUps > 0) window.setTimeout(offerUpgrade, 0);
      else input.requestPointerLock();
    });
  };

  const resize = (): void => {
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.6));
    cameraController.resize(window.innerWidth, window.innerHeight);
  };
  window.addEventListener('resize', resize);
  resize();
  cameraController.update(state.player.position, 1);

  const begin = (): void => {
    void audio.unlock();
    if (state.phase === 'ready') state.phase = 'playing';
    audio.playPhase(0);
    hud.start();
    input.requestPointerLock();
  };
  const restart = (): void => {
    void audio.unlock();
    resetGameState(state);
    physics.reset(state.player.position);
    bridge.reset();
    goalBeacon.reset();
    upgradeOverlay.reset();
    hud.reset();
    progression = createProgressionState();
    match = createMatchDirectorState();
    goalLatched = false;
    state.phase = 'playing';
    previousBallState = physics.ballState;
    audio.playPhase(0);
    input.requestPointerLock();
  };
  hud.kickoffButton.addEventListener('click', begin);
  hud.restartButton.addEventListener('click', restart);
  hud.victoryRestartButton.addEventListener('click', restart);
  renderer.domElement.addEventListener('click', () => {
    if (state.phase === 'ready') begin();
    else if (state.phase === 'playing' && !input.isLocked) input.requestPointerLock();
  });

  renderer.setAnimationLoop(() => {
    const frameTime = Math.min(MAX_FRAME_TIME, clock.getDelta());
    const mouse = input.consumeMouseDelta();
    cameraController.applyMouseDelta(mouse.x, mouse.y);

    if (input.consumeRestart() && state.phase !== 'ready' && !upgradeOverlay.isVisible) restart();
    const kick = input.consumeKick();
    if (state.phase === 'playing' && !upgradeOverlay.isVisible && kick) {
      const result = physics.kick(
        state.player.position,
        cameraController.aimDirection(),
        kick.charge,
        progression.modifiers,
      );
      if (result) {
        audio.playKick(result.charge);
        if (result.perfectVolley) audio.playVolley();
      }
    }
    physics.setRecall(state.phase === 'playing' && !upgradeOverlay.isVisible && input.recall, progression.modifiers);

    accumulator += frameTime;
    while (accumulator >= FIXED_STEP) {
      const simulationActive = state.phase === 'playing' && !upgradeOverlay.isVisible;
      if (simulationActive) {
        const healthBeforeUpdate = state.player.health;
        updatePlayer(state, input.movement(cameraController.yaw), cameraController.yaw, FIXED_STEP);
        updateEnemies(state, FIXED_STEP);
        if (state.player.health < healthBeforeUpdate) audio.playPlayerHurt();
      }
      physics.syncPlayer(state.player.position);
      if (simulationActive) physics.step(state.player.position, state.player.facing, FIXED_STEP);
      if (simulationActive) {
        const comboBeforeHit = state.combo;
        const { hits, kills } = damageEnemiesWithBall(
          state,
          physics.ballPosition,
          physics.ballSpeed,
          progression.modifiers.ballDamageMultiplier,
        );
        if (hits > 0) audio.playHit(Math.min(1, physics.ballSpeed / physics.maxBallSpeed));
        if (state.combo > comboBeforeHit) audio.playKill(state.combo);
        if (kills > 0) progression = grantBloodXp(progression, kills * 10).state;

        const ball = physics.ballPosition;
        const insideGoal = ball.z < -14 && Math.abs(ball.x) < 2.55 && ball.y < 3.2;
        const scored = match.stage === 'goalOpportunity' && insideGoal && !goalLatched;
        goalLatched = insideGoal;
        const matchUpdate = updateMatchDirector(match, {
          dt: FIXED_STEP,
          totalKills: state.kills,
          playerDead: state.phase === 'dead',
          goalScored: scored,
        });
        match = matchUpdate.state;
        for (const event of matchUpdate.events) {
          if (event.type === 'stageChanged') audio.playPhase(matchUpdate.state.matchElapsed);
          if (event.type === 'goalScored') {
            state.score += 1_000;
            audio.playGoal();
            physics.reset(state.player.position);
          }
          if (event.type === 'victory') {
            state.phase = 'won';
            audio.playGoal();
          }
        }
      }
      const recallStarted =
        (physics.ballState === 'recalling' || physics.ballState === 'recovering')
        && previousBallState !== 'recalling'
        && previousBallState !== 'recovering';
      if (recallStarted) audio.playRecall();
      previousBallState = physics.ballState;
      accumulator -= FIXED_STEP;
    }

    goalBeacon.setActive(match.stage === 'goalOpportunity');
    goalBeacon.update(frameTime);
    offerUpgrade();

    const alpha = accumulator / FIXED_STEP;
    const renderPlayerPosition = interpolatePosition(
      state.player.previousPosition,
      state.player.position,
      alpha,
    );
    cameraController.update(renderPlayerPosition, frameTime);
    bridge.sync(state, physics.ballRenderPosition(alpha), physics.ballSpeed, frameTime, alpha);
    hud.update(
      state,
      physics.ballState,
      perf.update(frameTime),
      input.kickCharge,
      progression,
      getMatchObjective(match),
    );
    if ((state.phase === 'dead' || state.phase === 'won') && input.isLocked) void document.exitPointerLock();
    renderer.render(scene, cameraController.camera);
  });

  renderer.domElement.addEventListener('webglcontextlost', (event) => {
    event.preventDefault();
    renderer.setAnimationLoop(null);
  });
  renderer.domElement.addEventListener('webglcontextrestored', () => window.location.reload());
  window.addEventListener('beforeunload', () => {
    input.dispose();
    void audio.dispose();
    goalBeacon.dispose();
    upgradeOverlay.dispose();
  }, { once: true });
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

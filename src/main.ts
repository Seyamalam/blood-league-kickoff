import './styles.css';
import * as THREE from 'three';
import { AudioManager } from './audio';
import { PerfMeter } from './diagnostics/PerfMeter';
import { InputController } from './game/input/InputController';
import { createGameState, damageEnemiesWithBall, resetGameState, updateEnemies, updatePlayer } from './game/simulation/gameState';
import { PhysicsWorld } from './physics/PhysicsWorld';
import { RenderBridge } from './render/adapters/RenderBridge';
import { CameraController } from './render/app/CameraController';
import { createRenderer } from './render/app/createRenderer';
import { createScene } from './render/app/createScene';
import { Hud } from './ui/Hud';

const FIXED_STEP = 1 / 60;
const MAX_FRAME_TIME = 0.1;

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
  const hud = new Hud(root);
  const perf = new PerfMeter();
  const clock = new THREE.Clock();
  let accumulator = 0;
  let previousBallState = physics.ballState;

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
    hud.reset();
    state.phase = 'playing';
    previousBallState = physics.ballState;
    audio.playPhase(0);
    input.requestPointerLock();
  };
  hud.kickoffButton.addEventListener('click', begin);
  hud.restartButton.addEventListener('click', restart);
  renderer.domElement.addEventListener('click', () => {
    if (state.phase === 'ready') begin();
    else if (state.phase === 'playing' && !input.isLocked) input.requestPointerLock();
  });

  renderer.setAnimationLoop(() => {
    const frameTime = Math.min(MAX_FRAME_TIME, clock.getDelta());
    const mouse = input.consumeMouseDelta();
    cameraController.applyMouseDelta(mouse.x, mouse.y);

    if (input.consumeRestart() && state.phase !== 'ready') restart();
    const kick = input.consumeKick();
    if (state.phase === 'playing' && kick) {
      const result = physics.kick(state.player.position, cameraController.aimDirection(), kick.charge);
      if (result) {
        audio.playKick(result.charge);
        if (result.perfectVolley) audio.playVolley();
      }
    }
    physics.setRecall(state.phase === 'playing' && input.recall);

    accumulator += frameTime;
    while (accumulator >= FIXED_STEP) {
      if (state.phase === 'playing') {
        const healthBeforeUpdate = state.player.health;
        updatePlayer(state, input.movement(cameraController.yaw), cameraController.yaw, FIXED_STEP);
        updateEnemies(state, FIXED_STEP);
        if (state.player.health < healthBeforeUpdate) audio.playPlayerHurt();
      }
      physics.syncPlayer(state.player.position);
      physics.step(state.player.position, state.player.facing, FIXED_STEP);
      if (state.phase === 'playing') {
        const comboBeforeHit = state.combo;
        const hits = damageEnemiesWithBall(state, physics.ballPosition, physics.ballSpeed);
        if (hits > 0) audio.playHit(Math.min(1, physics.ballSpeed / physics.maxBallSpeed));
        if (state.combo > comboBeforeHit) audio.playKill(state.combo);
      }
      const recallStarted =
        (physics.ballState === 'recalling' || physics.ballState === 'recovering')
        && previousBallState !== 'recalling'
        && previousBallState !== 'recovering';
      if (recallStarted) audio.playRecall();
      previousBallState = physics.ballState;
      accumulator -= FIXED_STEP;
    }

    const alpha = accumulator / FIXED_STEP;
    const renderPlayerPosition = interpolatePosition(
      state.player.previousPosition,
      state.player.position,
      alpha,
    );
    cameraController.update(renderPlayerPosition, frameTime);
    bridge.sync(state, physics.ballRenderPosition(alpha), physics.ballSpeed, frameTime, alpha);
    hud.update(state, physics.ballState, perf.update(frameTime), input.kickCharge);
    if (state.phase === 'dead' && input.isLocked) void document.exitPointerLock();
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

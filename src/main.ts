import './styles.css';
import * as THREE from 'three';
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
  const physics = await PhysicsWorld.create();
  const state = createGameState();
  const bridge = new RenderBridge(scene);
  const hud = new Hud(root);
  const perf = new PerfMeter();
  const clock = new THREE.Clock();
  let accumulator = 0;

  const resize = (): void => {
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.6));
    cameraController.resize(window.innerWidth, window.innerHeight);
  };
  window.addEventListener('resize', resize);
  resize();
  cameraController.update(state.player.position, 1);

  const begin = (): void => {
    if (state.phase === 'ready') state.phase = 'playing';
    hud.start();
    input.requestPointerLock();
  };
  const restart = (): void => {
    resetGameState(state);
    physics.reset(state.player.position);
    bridge.reset();
    hud.reset();
    state.phase = 'playing';
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
    if (state.phase === 'playing' && input.consumeKick()) {
      physics.kick(state.player.position, cameraController.aimDirection());
    } else {
      input.consumeKick();
    }
    physics.setRecall(state.phase === 'playing' && input.recall);

    accumulator += frameTime;
    while (accumulator >= FIXED_STEP) {
      if (state.phase === 'playing') {
        updatePlayer(state, input.movement(cameraController.yaw), cameraController.yaw, FIXED_STEP);
        updateEnemies(state, FIXED_STEP);
      }
      physics.syncPlayer(state.player.position);
      physics.step(state.player.position, state.player.facing, FIXED_STEP);
      if (state.phase === 'playing') {
        damageEnemiesWithBall(state, physics.ballPosition, physics.ballSpeed);
      }
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
    hud.update(state, physics.ballPossessed, perf.update(frameTime));
    if (state.phase === 'dead' && input.isLocked) void document.exitPointerLock();
    renderer.render(scene, cameraController.camera);
  });

  renderer.domElement.addEventListener('webglcontextlost', (event) => {
    event.preventDefault();
    renderer.setAnimationLoop(null);
  });
  renderer.domElement.addEventListener('webglcontextrestored', () => window.location.reload());
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

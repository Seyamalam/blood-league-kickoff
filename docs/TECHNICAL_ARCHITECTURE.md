# Blood League: Kickoff — Technical Architecture

## Goals

- One TypeScript gameplay codebase for static web and Electron desktop builds
- Fixed-step, testable simulation independent of monitor refresh
- GPU-efficient repeated visuals and lightweight enemy crowds
- Predictable ball combat with physics-assisted collision, not uncontrolled simulation
- Fast failure recovery, explicit cleanup ownership, and no runtime AI dependency

## Stack

| Layer | Choice | Responsibility |
| --- | --- | --- |
| Tooling | Vite + TypeScript | Development, bundling, type safety |
| Rendering | Three.js / WebGL 2 | Scene, camera, models, lighting, VFX |
| Physics | `@dimforge/rapier3d-compat` | Fixed-step world, important bodies, queries/events |
| UI | HTML/CSS | Menus, HUD, upgrade cards, settings |
| Desktop | Electron | Self-contained GPU-accelerated Windows application |
| Packaging | electron-builder | Portable Windows executable |
| Automation | GitHub Actions | Checks and authoritative Windows artifacts |

## Current Source Baseline

The foundation contains a playable single-page loop: input, player/enemy simulation, Rapier ball physics, render synchronization, a third-person camera, primitive stadium/actors, HUD, performance readout, and Electron packaging. Enemy spawn positions and elite rolls currently use `Math.random()`, so runs are intentionally not deterministic or replay-synchronized. These are scaffolding boundaries, not frozen APIs.

## Runtime Flow

```text
Input events -> InputController snapshot
                     |
Three.js setAnimationLoop v
Accumulator -> 60 Hz simulation steps -> interpolated world render -> HUD update
                  |              |
             PhysicsWorld    mutable GameState
                  |              |
                  +------> RenderBridge + camera + HUD
```

Three's `setAnimationLoop` drives presentation. Frame delta is clamped to 100 ms after stalls/focus changes. An accumulator advances the player, enemies, and Rapier world at 60 Hz. The player, enemies, and ball retain previous/current positions and are interpolated for rendering; the camera then follows the interpolated player with exponential smoothing. HUD values read current simulation state rather than interpolated values. There is no networking, rollback, replay, or deterministic lockstep layer.

## Ownership Boundaries

- **Current `main.ts`:** bootstrap, resize, pointer-lock start/restart events, fixed-step accumulator, interpolation, HUD updates, and rendering.
- **InputController:** DOM listeners and action snapshot; gameplay never reads raw DOM events.
- **Current `gameState.ts`:** authoritative player/enemy data, movement, random spawning, contact damage, ball-hit tests, death, score, and combo.
- **Current `PhysicsWorld`:** Rapier initialization, static arena, kinematic player body, dynamic ball, kick/recall, fixed stepping, interpolation positions, and recovery fail-safes.
- **Current `CameraController`:** mouse orbit, pitch limits, aim vector, and smoothed follow.
- **Current `RenderBridge`:** primitive player/ball/enemy visuals synchronized from simulation; it creates/disposes enemy groups as IDs appear/disappear.
- **Current `Hud`:** kickoff/death overlays plus health, timer, score, enemy, ball, combo, and FPS views.
- **Planned modules:** dedicated app lifecycle/disposal, ball/player controllers, spawn/match/upgrade directors, pools/instancing, audio, quality, and settings.

## Physics Policy

Rapier currently owns the static arena colliders, a synchronized kinematic player body, and the dynamic ball. Ordinary enemies are lightweight planar state and ball hits use direct distance checks; enemies do not have Rapier bodies. A spatial grid and crowd separation remain planned for larger populations.

The current ball tracks possessed, kicked, and recall behavior through `PhysicsWorld` flags rather than the full planned state machine. Rapier provides CCD and material restitution for rebounds. Code applies recall impulses and automatically recalls or resets stalled, overdue, out-of-bounds, or non-finite balls. Explicit speed clamping, curve control, volley/disabled states, collision groups, goal triggers, and pickup queries remain planned.

## Rendering Policy

- Prefer `InstancedMesh` for large repeated enemy/prop families.
- Share geometry, textures, and materials; atlas variants where useful.
- Avoid material creation and temporary vectors in frame loops.
- Clamp device pixel ratio through quality settings.
- Limit shadow casters, transparent layers, dynamic lights, and post-processing.
- Use distance bands for animation/update rate and simple crowd silhouettes.
- Pool short-lived effects and hide/reuse instances instead of allocating them.

The renderer requests `powerPreference: "high-performance"`, but diagnostics must report the actual GPU path/fallback. Hardware acceleration is expected, never assumed without testing.

## Data and Events

Game definitions are typed immutable objects or JSON validated at load time. Runtime mutable state remains separate. Stable identifiers connect upgrades, enemies, waves, sounds, and assets.

High-frequency interactions should use reusable event queues/ring buffers rather than general DOM events or per-hit object allocation. Examples: damage, death, pickup, kick, rebound, volley, goal, level-up, and phase changes.

## UI Boundary

The Three.js canvas owns the world. HTML/CSS owns menus, HUD, upgrade choices, prompts, and settings. UI receives a minimal view model and sends typed commands. Pausing/upgrade selection must suspend authoritative gameplay time while allowing UI animation.

## Electron Security and Packaging

- Load only packaged local content in production.
- Enable context isolation.
- Disable Node integration in the renderer.
- Expose only narrow typed preload functions when platform features are required.
- Block unexpected navigation/window creation.
- Do not load remote scripts or depend on a network connection.
- Keep browser behavior as the portability baseline.

The Windows GitHub Actions definition installs from the lockfile, builds Vite output (including TypeScript compilation), packages Electron portable/ZIP artifacts, creates checksums, and uploads workflow artifacts. Tags are configured to publish those assets. The workflow and actual Windows artifacts still require verification, and release candidates must run on a real Windows machine.

## Performance Targets

| Target | Budget/acceptance |
| --- | --- |
| Guaranteed | Stable 60 FPS during densest required wave on reference system |
| High refresh | Stable 120 FPS on capable system/performance preset |
| Simulation | 60 fixed steps/sec initially; measured before changing |
| Enemy cap | Start at 80 performance / 120 balanced |
| Recovery | No unrecoverable ball or invalid run state |

The debug overlay should expose render FPS/frame time, fixed-step time, enemy count, draw calls, triangles, pool usage, physics time, and quality preset. Optimize measured bottlenecks, not guesses.

## Test Strategy

- Unit-test pure ball state transitions, upgrade prerequisites, match phases, and fixed-step calculations.
- Introduce a seeded random source only if reproducible balance tests or replays become a real requirement.
- Add simulation checks for out-of-bounds recovery and fixed-step invariants.
- Smoke-test production web output and packaged Electron output.
- Test focus loss, resize, pause, low frame rate, high refresh, and clean first launch.
- Profile development and production separately; dev-server results are not acceptance evidence.

## Near-Term Implementation Order

1. Playtest the production web build and Electron shell; fix control/feel blockers.
2. Add explicit cleanup/disposal and verify resize/focus/context-loss behavior.
3. Tune kick, rebound, recall, damage, and ball recovery through Gate A playtests.
4. Add charge, volley, controlled speed limits, feedback, and deliberate knockback.
5. Verify the Windows workflow artifact on real Windows hardware.
6. Only then expand enemies, progression, and match flow.

# Blood League: Kickoff — Technical Architecture

## Goals

- One TypeScript gameplay codebase for static web and Electron desktop builds
- Fixed-step, testable simulation independent of monitor refresh
- GPU-efficient repeated visuals and lightweight enemy crowds
- Predictable ball combat with physics-assisted collision, not uncontrolled simulation
- Fast failure recovery, deterministic cleanup, and no runtime AI dependency

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

The foundation currently contains early modules for input, simulation state/types, Rapier world setup, renderer creation, and camera control. These are scaffolding boundaries, not frozen APIs. New code should converge on the ownership below instead of creating competing loops or global state.

## Runtime Flow

```text
Input events -> InputController snapshot
                     |
requestAnimationFrame v
Accumulator -> fixed simulation steps -> interpolated render -> HUD update
                  |              |
             RapierWorld    GameState/events
                  |              |
                  +------> Renderer/pools/audio
```

`requestAnimationFrame` controls presentation only. Elapsed time is clamped after focus loss. An accumulator advances zero or more fixed simulation steps; rendering interpolates between previous/current transforms. UI and audio consume state/events without mutating core simulation.

## Ownership Boundaries

- **App:** lifecycle, scene switching, focus, resize, pause, and disposal.
- **GameLoop:** clock, accumulator, fixed updates, interpolation, and diagnostics.
- **InputController:** DOM listeners and action snapshot; gameplay never reads raw DOM events.
- **GameState:** authoritative run state and entity data.
- **PhysicsWorld:** Rapier initialization, bodies, colliders, steps, queries, and event draining.
- **PlayerController:** movement intent, dash, facing, damage, and animation signals.
- **CameraController:** orbit, pitch/yaw limits, collision, interpolation, and shake.
- **BallController:** explicit state machine, kick/recall/volley, recovery, and damage metadata.
- **EnemySimulation:** movement/attacks in lightweight data, with spatial queries.
- **EnemyRenderer:** instanced/pool visuals synchronized from simulation.
- **MatchDirector:** time phases, goals, kickoffs, boss, win, and loss.
- **UpgradeSystem:** definitions, offers, stacks, prerequisites, evolutions, and derived stats.
- **AudioManager/UI:** consume events and state; no gameplay authority.

## Physics Policy

Rapier should own the arena, player collision, ball collision/query support, and exceptional important bodies. Ordinary crowd enemies should not each receive a full dynamic rigid body. Use a spatial hash/grid, planar movement, simple radius separation, and targeted collision queries.

The ball uses an explicit state machine. Physics collision normals inform rebounds, while code clamps speed, corrects tunneling, applies aim/recall steering, and recovers invalid states. Collision groups distinguish arena, player, ball, enemy hurt regions, goal triggers, and pickups.

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

The Windows GitHub Actions runner installs from the lockfile, runs checks, builds Vite output, packages Electron, and uploads checksummed artifacts. Release candidates must run on a real Windows machine.

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

- Unit-test pure ball state transitions, upgrade prerequisites, match phases, and deterministic calculations.
- Add simulation checks for out-of-bounds recovery and fixed-step invariants.
- Smoke-test production web output and packaged Electron output.
- Test focus loss, resize, pause, low frame rate, high refresh, and clean first launch.
- Profile development and production separately; dev-server results are not acceptance evidence.

## Near-Term Implementation Order

1. Make clean install, type-check, and production build pass.
2. Verify renderer, camera, input, Rapier, and disposal in one boot path.
3. Add graybox stadium and player controller.
4. Add ball states, kick, rebound, recall, and recovery.
5. Add one basic enemy and damage/death/restart.
6. Verify web and Electron builds before content expansion.

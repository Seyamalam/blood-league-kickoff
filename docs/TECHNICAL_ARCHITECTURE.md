# Blood League: Kickoff — Technical Architecture

## Goals

- One TypeScript gameplay codebase for static web and Electron desktop builds
- Fixed-step, testable simulation independent of monitor refresh
- GPU-efficient repeated visuals and lightweight enemy crowds
- Predictable ball combat with physics-assisted collision, not uncontrolled simulation
- Fast failure recovery, explicit cleanup ownership, and no runtime AI dependency

## Stack

| Layer      | Choice                      | Responsibility                                     |
| ---------- | --------------------------- | -------------------------------------------------- |
| Tooling    | Vite + TypeScript           | Development, bundling, type safety                 |
| Rendering  | Three.js / WebGL 2          | Scene, camera, models, lighting, VFX               |
| Physics    | `@dimforge/rapier3d-compat` | Fixed-step world, important bodies, queries/events |
| UI         | HTML/CSS                    | Menus, HUD, upgrade cards, settings                |
| Desktop    | Electron                    | Self-contained GPU-accelerated desktop application |
| Packaging  | electron-builder            | Desktop artifacts; Windows remains final-only      |
| Automation | GitHub Actions              | Web verification and manual final Windows builds   |

## Current Source Baseline

The current game contains the complete nine-minute run: eight ordinary enemy archetypes, elite modifiers, twelve upgrades, five evolutions, four target weapon paths, halftime tactics, escalating match phases, Focus Kick, the Count Goalkeeper boss, and terminal results. It shares one runtime across browser and Electron. The Spawn Director is a pure, data-driven phase boundary with injectable randomness for deterministic composition tests. Live spawn positions, upgrades, and elite rolls still use `Math.random()`, so full runs are intentionally not replay-synchronized.

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

The 60/120 FPS presentation caps use an ideal-deadline scheduler with a bounded early margin for RAF timestamp
jitter. Deadlines advance from the ideal timeline rather than the last rendered callback, preventing a slightly
early 120 Hz callback from turning a 60 FPS cap into a periodic three-refresh frame. Unlimited mode renders every
callback, and changing limits resets the schedule immediately.

## Ownership Boundaries

- **`main.ts`:** bootstrap, lifecycle/disposal, pointer-lock and menu events, fixed-step accumulator, match/combat orchestration, audio hooks, interpolation, HUD updates, and rendering.
- **`InputController`:** DOM listeners, persistent rebindable actions, and input snapshots; gameplay never reads raw DOM events.
- **`gameState.ts`:** authoritative player/enemy data, archetype behavior, spawn-request application, crowd queries, damage, death, score, and combo.
- **`game/spawn`:** immutable per-stage population/cadence/roster definitions plus allocation-free fixed-step profile resolution and weighted selection.
- **`PhysicsWorld`:** Rapier arena/player/ball bodies, charge, curve, recall, volley, speed control, fixed stepping, interpolation, and recovery fail-safes.
- **Match, progression, combat, boss, and pickup modules:** typed definitions plus isolated mutable systems for the full run.
- **`CameraController` and `RenderBridge`:** third-person/Focus cameras and synchronized pooled/shared-resource presentation. Enemy visuals retain typed part references from spawn to removal, so per-frame poses never search the scene tree.
- **UI modules:** title, HUD, tutorial, pause, settings, halftime, upgrades, results, accessibility, and diagnostics.
- **`AudioManager` and `SettingsStore`:** procedural effects/music and persistent schema-migrated player settings.

## Physics Policy

Rapier owns the static arena colliders, a synchronized kinematic player body, and the dynamic ball. Ordinary enemies remain lightweight planar state without individual rigid bodies. Ball/enemy hits and crowd separation use reusable spatial queries and typed-array storage so crowd cost stays bounded.

The ball exposes possessed, free, recalling, volley-window, and recovering states. Rapier provides CCD and material restitution for rebounds; game code owns charge, curve, aim assistance, Focus Kick, damage, recall impulses, speed limits, and recovery. Stalled, overdue, out-of-bounds, or non-finite balls automatically recall or reset. Match code owns goal detection and kickoff transitions, while pickup and secondary-weapon systems use their own lightweight queries and pools.

Count Goalkeeper joins the generic secondary target list through a reserved negative ID only after its entrance. The runtime reuses one target array and one boss target record, separates that ID before ordinary enemy reward accounting, caps accumulated secondary damage at 12 raw points per fixed step, and applies the boss's 0.4 secondary multiplier. Boss kicks queue the normal impact-triggered weapon paths plus Blood Bomb. Primary and secondary damage use independent short cooldowns and primary resolves first, preserving kick impact without starving automatic builds; slow and pull events intentionally ignore the boss target. A secondary defeat is forwarded to the match director in the same fixed step.

## Rendering Policy

- Prefer `InstancedMesh` for large repeated enemy/prop families.
- Share geometry, textures, and materials; atlas variants where useful.
- Avoid material creation and temporary vectors in frame loops.
- Clamp device pixel ratio through quality settings.
- Limit shadow casters, transparent layers, dynamic lights, and post-processing.
- Use distance bands for animation/update rate and simple crowd silhouettes.
- Pool short-lived effects and hide/reuse instances instead of allocating them.

Secondary weapon presentation uses five fixed `InstancedMesh` batches with capacities 24/3/8/6/4. Active simulation records are packed into reusable instance matrices each frame; the three ball-like families share one sphere geometry. All 45 visible objects therefore contribute at most five draw calls. Black-hole rotation derives from fixed-step zone age rather than render cadence, so 60 and 120 FPS produce the same animation speed.

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

The preload exposes only fixed, validated desktop operations: read window state, select one of three safe content sizes, enter or leave fullscreen, subscribe to fullscreen changes, and quit. It never exposes `ipcRenderer` or a generic channel invocation to game code. Main-process handlers reject requests unless they originate from the trusted active game window and its local production or configured development URL.

The Windows GitHub Actions definition is intentionally manual-only during gameplay development. When invoked for the content-complete candidate, it installs from the lockfile, builds Vite output, packages Electron portable/ZIP artifacts, creates checksums, and uploads workflow artifacts. The workflow and actual Windows artifacts still require verification, and release candidates must run on a real Windows machine.

## Performance Targets

| Target       | Budget/acceptance                                              |
| ------------ | -------------------------------------------------------------- |
| Guaranteed   | Stable 60 FPS during densest required wave on reference system |
| High refresh | Stable 120 FPS on capable system/performance preset            |
| Simulation   | 60 fixed steps/sec initially; measured before changing         |
| Enemy cap    | 72 ordinary enemies; change only after production profiling    |
| Recovery     | No unrecoverable ball or invalid run state                     |

The live debug overlay exposes render FPS/frame time, enemy count, draw calls, triangles, fixed-step count, and aggregate shard/secondary-pool occupancy. The development stress snapshot additionally records viewport, pixel ratio, render scale, quality preset, and frame-rate cap. Physics and fixed-step duration require isolated profiling rather than being claimed as live counters. Optimize measured bottlenecks, not guesses.

During local development, open `http://localhost:5173/?stress=72` to boot directly into a frozen,
deterministic mixed-archetype crowd. Normal and production builds ignore this query. Profiling automation can
call `window.__bloodLeaguePerfSnapshot()` to receive a fresh frozen copy of the current frame, renderer, pool,
viewport, and quality counters. Use a production build for final acceptance measurements; this development mode
exists to make comparisons repeatable before capturing the corresponding production trace.

Append `&secondary=full` to activate all 45 persistent secondary-weapon instances while keeping the 72-enemy simulation frozen. Compare it with the empty-pool route under identical viewport/settings to isolate draw calls, triangles, transparency, and GPU presentation cost without changing combat simulation.

## Test Strategy

- Unit-test pure ball state transitions, upgrade prerequisites, match phases, and fixed-step calculations.
- Inject deterministic random sources into Spawn Director tests; introduce a run-wide seed only if replayable full-run balance failures become a real requirement.
- Add simulation checks for out-of-bounds recovery and fixed-step invariants.
- Smoke-test production web output and packaged Electron output.
- Test focus loss, resize, pause, low frame rate, high refresh, and clean first launch.
- Profile development and production separately; dev-server results are not acceptance evidence.

## Remaining Implementation Order

1. Run full human playtests on macOS/browser and fix control, onboarding, balance, and readability blockers.
2. Profile production web and Electron builds during the densest wave; prove the 60 FPS baseline before tuning measured bottlenecks.
3. Finish key art, icons, visible model/material polish, credits, and final screenshots.
4. Execute the focused gameplay QA matrix and retest release-blocking fixes from clean web/macOS builds.
5. Freeze the content-complete web/macOS candidate and prepare the submission materials.
6. Only after the game is finished, invoke and verify Windows packaging on real Windows hardware.

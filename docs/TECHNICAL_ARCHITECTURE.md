# Blood League: Kickoff — Technical Architecture

## Goals

- One TypeScript gameplay codebase for static web and Electron desktop builds
- Fixed-step, testable simulation independent of monitor refresh
- GPU-efficient repeated visuals and lightweight enemy crowds
- Predictable ball combat with physics-assisted collision, not uncontrolled simulation
- Fast failure recovery, explicit cleanup ownership, and no runtime AI dependency

## Stack

| Layer      | Choice                      | Responsibility                                      |
| ---------- | --------------------------- | --------------------------------------------------- |
| Tooling    | Vite + TypeScript           | Development, bundling, type safety                  |
| Rendering  | Three.js / WebGL 2          | Scene, camera, models, lighting, VFX                |
| Physics    | `@dimforge/rapier3d-compat` | Fixed-step world, important bodies, queries/events  |
| UI         | HTML/CSS                    | Menus, HUD, upgrade cards, settings                 |
| Desktop    | Electron                    | Self-contained GPU-accelerated desktop application  |
| Packaging  | electron-builder            | Desktop artifacts; Windows remains final-only       |
| Automation | GitHub Actions + Butler     | Verification, itch.io web deploys, native packaging |

## Current Source Baseline

The current game contains the complete nine-minute run: eleven ordinary enemy archetypes, elite modifiers, fifteen weapon upgrades, five live passives, seven evolutions, six persistent selectable characters, halftime tactics, escalating match phases, Focus Kick, the special goal blocker, the multi-action Count Goalkeeper boss, and terminal results. The field layer shares a 68×105 definition across rendering, collision, enemy bounds, and swept whole-ball scoring. Persistent profiles, 20-level mastery, exact-build offline rankings, terminal settlement, Career UI, and the expanded procedural audio core are connected to the shared browser/Electron runtime. Each run has a descriptor and independent seeded streams for spawning, upgrades, events, loot, boss logic, and cosmetics; daily and weekly challenge keys are reproducible within the same ruleset version. No globally verified leaderboard is claimed.

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
- **`enemyIntelligence.ts`:** pure deterministic squad blackboard and movement intentions. Defenders screen supports, fast roles flank, and coach-led units encircle; simulation remains authoritative for positions, attacks, damage, and collision.
- **`game/spawn`:** immutable per-stage population/cadence/roster definitions plus allocation-free fixed-step profile resolution and weighted selection.
- **`PhysicsWorld`:** Rapier arena/player/ball bodies, charge, curve, recall, volley, speed control, fixed stepping, interpolation, and recovery fail-safes.
- **`game/field`:** canonical 68×105 pitch/goal dimensions and swept whole-ball crossing logic shared by simulation and presentation.
- **Match, progression, combat, boss, and pickup modules:** typed definitions plus isolated mutable systems for the full run; progression distinguishes weapon/passive offers and computes bounded passive/character modifiers.
- **`game/characters`:** six immutable original football-style archetypes with strengths, weaknesses, starting affinities, modifier deltas, and visual palettes; no real-player identity or likeness data.
- **`profile`:** schema-validated account XP, unlocks, mastery, ten challenges, lifetime statistics, personal bests, twenty-run history, and duplicate-run settlement guards.
- **`leaderboard`:** local/offline score and fastest-victory queries over profile history, partitioned by exact build version and optional character.
- **`CameraController`, `AimGuide`, and `RenderBridge`:** conventional/invertible third-person/Focus camera input, a reusable long red world-space aim line, and synchronized pooled/shared-resource presentation. Enemy visuals retain typed part references from spawn to removal, so per-frame poses never search the scene tree.
- **`CharacterAnimationController`:** render-only priority arbitration, crossfades, mixer completion handling, deterministic recovery fallback, and explicitly named additive overlays. It never gates gameplay or applies root motion to simulation.
- **`WebAuthoredFootballClips` and contact presentation:** fifteen in-place quaternion clip definitions target the validated shared skeleton in the browser. Technique contact markers delay only VFX/audio presentation to the visible foot/head frame; simulation and ball response remain immediate.
- **`CharacterCodexPreview`:** an on-demand secondary WebGL renderer loads the same shipping GLB, variants, and motion contract inside Career, suspending its animation loop whenever the overlay is closed.
- **UI modules:** title, HUD, tutorial, pause, settings, halftime, upgrades, results, accessibility, and diagnostics.
- **`AudioManager` and `SettingsStore`:** procedural effects/music and persistent schema-migrated player settings. Audio retains the 48-source cap, adds per-event retrigger protection, exposes football/goalkeeper/progression/match/UI cues, and blends drone/tension/pulse/choir/percussion-style layers without external samples.

## Physics Policy

Rapier owns the static arena colliders, a synchronized kinematic player body, and the dynamic ball. Ordinary enemies remain lightweight planar state without individual rigid bodies. Ball/enemy hits and crowd separation use reusable spatial queries and typed-array storage so crowd cost stays bounded.

The ball exposes possessed, free, recalling, volley-window, and recovering states. Rapier provides CCD and material restitution for rebounds; game code owns charge, curve, aim assistance, Focus Kick, damage, recall impulses, speed limits, and recovery. Stalled, overdue, out-of-bounds, or non-finite balls automatically recall or reset. Goal posts and crossbars are physical colliders. Match scoring sweeps the previous/current ball centers across the goal plane, offsets the crossing by ball radius, and accepts only a complete crossing between the inner post bounds and under the crossbar. Match code owns the resulting kickoff transitions, while pickup and secondary-weapon systems use their own lightweight queries and pools.

The special goalkeeper blocker is explicit enemy state attached to the scoring opportunity rather than an invisible scoring exception. It intercepts the ball in front of the physical goal while the same whole-ball goal predicate remains authoritative.

Count Goalkeeper joins the generic secondary target list through a reserved negative ID only after its entrance. The runtime reuses one target array and one boss target record, separates that ID before ordinary enemy reward accounting, caps accumulated secondary damage at 12 raw points per fixed step, and applies the boss's 0.4 secondary multiplier. Boss kicks queue the normal impact-triggered weapon paths plus Blood Bomb. Primary and secondary damage use independent short cooldowns and primary resolves first, preserving kick impact without starving automatic builds; slow and pull events intentionally ignore the boss target. A secondary defeat is forwarded to the match director in the same fixed step.

## Rendering Policy

- Prefer `InstancedMesh` for large repeated enemy/prop families.
- Share geometry, textures, and materials; atlas variants where useful.
- Avoid material creation and temporary vectors in frame loops.
- Clamp device pixel ratio through quality settings.
- Limit shadow casters, transparent layers, dynamic lights, and post-processing.
- Use distance bands for animation/update rate and simple crowd silhouettes.
- Pool short-lived effects and hide/reuse instances instead of allocating them.
- Keep the aim guide to one persistent world-space object updated in place; never recreate its geometry or material per frame.

Ordinary-enemy presentation uses three distance bands without changing simulation state. A nearest-only pool clones the audited Quaternius skinned GLB through `SkeletonUtils` and shares seven clips from the animation library; quality presets cap that pool at 8, 12, or 16 characters. Every archetype adds its own tint and equipment identity. Rounded articulated characters remain the asynchronous-loading and compatibility fallback, while merged mid/far silhouettes and throttled pose updates bound crowd cost. Bat Swarm retains a dedicated creature silhouette rather than entering the humanoid pool.

Character variants retain one 65-joint skeleton. Runtime-owned jersey, collar, sleeve, shorts, sock, boot, hair, and role-equipment pieces mount to stable joints, so six distinct kits and body proportions do not duplicate or reskin the source mesh. The generated Codex portraits are UI-only and never substitute for world models.

Combat and stadium response use fixed-capacity pools for impact bursts, surface marks, slide trails, weather splashes, crowd reactions, and net deformation. Character readability lights are local and bounded. Goal nets and ball squash/stretch are presentation-only and cannot alter scoring or physics authority.

Secondary weapon presentation uses five fixed `InstancedMesh` batches with capacities 24/3/8/6/4. Active simulation records are packed into reusable instance matrices each frame; the three ball-like families share one sphere geometry. All 45 visible objects therefore contribute at most five draw calls. Black-hole rotation derives from fixed-step zone age rather than render cadence, so 60 and 120 FPS produce the same animation speed.

The renderer requests `powerPreference: "high-performance"`, but diagnostics must report the actual GPU path/fallback. Hardware acceleration is expected, never assumed without testing.

## Data and Events

Game definitions are typed immutable objects or JSON validated at load time. Runtime mutable state remains separate. Stable identifiers connect upgrades, enemies, waves, sounds, and assets.

Persistent profile state is separate from transient run progression and ordinary settings. Its versioned document validates stored values, caps recent history at twenty runs, keeps a longer bounded processed-run ID list to prevent double settlement, and falls back safely when browser storage is unavailable or malformed. Local leaderboard queries read this profile rather than maintaining a competing source of truth; exact build-version partitions prevent balance-incompatible runs from mixing.

High-frequency interactions should use reusable event queues/ring buffers rather than general DOM events or per-hit object allocation. Examples: damage, death, pickup, kick, rebound, volley, goal, level-up, and phase changes.

## UI Boundary

The Three.js canvas owns the world, including the red aim guide. HTML/CSS owns menus, HUD, upgrade choices, prompts, settings, Career, and results; the former DOM crosshair is removed. UI receives a minimal view model and sends typed commands. Pausing/upgrade selection must suspend authoritative gameplay time while allowing UI animation. Vertical inversion is schema-migrated persistent state with `false` as the conventional default. Desktop Quit is bound only from the title screen; Settings retains window size/fullscreen but no Quit action. Character selection, profile/mastery/challenge/history, run-settlement feedback, and explicitly labeled local leaderboards are exposed through independent store-backed views.

## Electron Security and Packaging

- Load only packaged local content in production.
- Enable context isolation.
- Disable Node integration in the renderer.
- Expose only narrow typed preload functions when platform features are required.
- Block unexpected navigation/window creation.
- Do not load remote scripts or depend on a network connection.
- Keep browser behavior as the portability baseline.

The current leaderboard is intentionally local/offline. A future remote service would treat browser and Electron clients as untrusted, keep all private keys server-side, validate version/category/seed and duplicate run IDs, rate-limit submissions, and add only its exact HTTPS API origin to the content-security policy. Client-side signatures cannot establish trust because their secrets are extractable. Daily/weekly verification also requires run-wide deterministic random streams before submission is enabled.

The preload exposes only fixed, validated desktop operations: read window state, select one of three safe content sizes, enter or leave fullscreen, subscribe to fullscreen changes, and quit. It never exposes `ipcRenderer` or a generic channel invocation to game code. Main-process handlers reject requests unless they originate from the trusted active game window and its local production or configured development URL.

Routine version tags run the verified web/macOS prerelease workflow. The cross-platform GitHub Actions definition is intentionally manual-only and confirmation-gated during gameplay development. Only after the game is complete may it build Windows portable/ZIP and Linux AppImage/ZIP outputs (plus the companion web/macOS artifacts), create checksums, and upload workflow artifacts. Windows/Linux release candidates still require real target-machine verification.

## Performance Targets

| Target       | Budget/acceptance                                              |
| ------------ | -------------------------------------------------------------- |
| Guaranteed   | Stable 60 FPS during densest required wave on reference system |
| High refresh | Stable 120 FPS on capable system/performance preset            |
| Simulation   | 60 fixed steps/sec initially; measured before changing         |
| Enemy cap    | 72 ordinary enemies; change only after production profiling    |
| Recovery     | No unrecoverable ball or invalid run state                     |

The live debug overlay exposes render FPS/frame time, enemy count, draw calls, triangles, fixed-step count, and aggregate shard/secondary-pool occupancy. The development stress snapshot additionally records viewport, pixel ratio, render scale, quality preset, and frame-rate cap. Physics and fixed-step duration require isolated profiling rather than being claimed as live counters. Optimize measured bottlenecks, not guesses.

The opt-in development route `?diagnostics=1` also installs `window.__bloodLeagueDiagnostics()`. Its bounded,
allocation-free recorder reports p50/p95/p99 frame times and 60/120 FPS budget misses; snapshots add renderer
resource counts, GPU limits, and viewport data. The hook and rig-debug route cannot activate in production.

During local development, open `http://localhost:5173/?stress=72` to boot directly into a frozen,
deterministic mixed-archetype crowd. Normal and production builds ignore this query. Profiling automation can
call `window.__bloodLeaguePerfSnapshot()` to receive a fresh frozen copy of the current frame, renderer, pool,
viewport, and quality counters. Use a production build for final acceptance measurements; this development mode
exists to make comparisons repeatable before capturing the corresponding production trace.

Append `&secondary=full` to activate all 45 persistent secondary-weapon instances while keeping the 72-enemy simulation frozen. Compare it with the empty-pool route under identical viewport/settings to isolate draw calls, triangles, transparency, and GPU presentation cost without changing combat simulation.

## Test Strategy

- Unit-test pure ball state transitions, upgrade/passive prerequisites, character modifiers, profile settlement/migration, challenge/mastery progression, local leaderboard partitioning/ties, audio cue safety, match phases, and fixed-step calculations.
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

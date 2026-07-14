# Blood League: Kickoff — Production Plan

## 1. Objective

Create a polished third-person 3D horde-survival roguelite in which football is the combat system and each kickoff advances the run. Submit stable web and desktop builds, a public GitHub repository, itch.io page, and clear gameplay pitch within the IUT 12th ICT Fest 2026 GameJam deadline.

## 2. Product Decision

- **Runtime:** Browser-native Three.js game packaged unchanged inside Electron
- **Language/tooling:** TypeScript and Vite
- **Physics:** Rapier WASM for the player, ball, arena, and important dynamic interactions
- **View:** Third-person, over-the-shoulder camera
- **Special camera:** Brief first-person Focus Kick ultimate only
- **Platforms:** Web and macOS throughout alpha development; Windows x64 and Linux x64 only after the game is finished
- **Session:** 8–10 minutes guaranteed; up to 12 minutes only after the scope gates pass
- **Art direction:** Stylized low-poly gothic stadium, moonlit blue environment, crimson vampire effects, and gold holy weapons

This code-first stack lets the team iterate, test, profile, and build without a proprietary editor. Electron provides a self-contained desktop game while WebGL 2 uses the player's GPU. Actual 120 FPS depends on hardware and quality settings; stable 60 FPS is the guaranteed baseline.

## 3. Player Fantasy and Verbs

The player is the last human striker in a supernatural match. The verbs are move, aim, kick, charge, curve, recall, volley, dash, score, and choose upgrades. The kick must feel satisfying before secondary weapons or additional enemies are approved.

## 4. Run Structure

| Time       | Phase           | Purpose                                          |
| ---------- | --------------- | ------------------------------------------------ |
| 0:00       | Opening Kickoff | Teach movement, kicking, recall, and collection  |
| 0:00–3:00  | First Half      | Introduce basic crowds, flankers, and upgrades   |
| 3:00       | First Goal      | Score; enemy tier and stadium state change       |
| 3:00–5:00  | Escalation      | Add shields, ranged pressure, and evolutions     |
| 5:00       | Halftime        | Major choice and a brief pacing reset            |
| 5:00–8:00  | Blood Moon      | Denser waves, elites, and dangerous combinations |
| 8:00       | Final Goal      | Summon Count Goalkeeper                          |
| 8:00–10:00 | Final Match     | Boss encounter, victory, or defeat               |

Timings and balance values live in data files and remain easy to shorten during playtests.

## 5. Combat Design

### Ball state model

1. **Possessed:** attached at the player's dribble point and ready to kick.
2. **Charging:** kick power increases while input is held.
3. **Launched:** damages enemies and rebounds from arena surfaces.
4. **Returning:** steers toward the player after recall or timeout.
5. **Volley window:** a timed kick near the player increases damage and speed.
6. **Disabled:** temporarily caught, blocked, or controlled by a boss mechanic.

Rapier provides collision queries and important rigid-body interactions. Game code owns ball state, aim assistance, recall steering, damage, recovery, and velocity limits so combat remains predictable. A fail-safe returns an inaccessible ball after a short timeout.

The playable field uses a shared 68×105 regulation-proportioned definition across simulation, collision, scoring, and rendering. Each goal has physical posts and a crossbar. Scoring uses a swept previous-to-current ball path and the whole ball must pass beyond the goal line between the inside post planes and below the crossbar; touching or only partially crossing does not score.

### Guaranteed upgrades

- Silver Ball
- Power Kick
- Rapid Recall
- Piercing Studs
- Garlic Trail
- Orbiting Spectral Ball
- Blood Bomb
- Ghost Pass

Implemented target path:

- Storm Studs chain lightning
- Frost Cleats impact bursts and timed slow
- Spectral Volley bounded multiball fan
- Void Goal pooled damage-and-pull zones

Complete evolution roster:

- Silver Ball + Piercing Studs → **Moon Breaker**
- Blood Bomb + Power Kick → **Crimson Meteor**
- Garlic Trail + Frost Cleats → **Grave-Frost Wake**
- Orbiting Spectral Ball + Storm Studs → **Storm Halo**
- Ghost Pass + Void Goal → **Phantom Singularity**

Passive foundations:

- **Iron Heart:** maximum-health growth with same-stack recovery
- **Blood Magnet:** wider Blood XP attraction
- **Killer Instinct:** bounded all-source damage growth
- **Blood Drinker:** capped primary/secondary kill healing and boss-damage life steal

The passive definitions, modifier calculations, mixed offers, four original icons, main-loop application, healing feedback, and tests are implemented. Full-run balance remains in progress.

### Original character roster

| Character     | Role                | Strength                       | Weakness                 |
| ------------- | ------------------- | ------------------------------ | ------------------------ |
| The Maestro   | Technical Playmaker | Curve, recall, perfect volleys | Lower kick power         |
| The Breakaway | Explosive Runner    | Movement and dash frequency    | Lower maximum health     |
| The Tower     | Power Striker       | Health, power, and knockback   | Slower movement          |
| The Finisher  | Penalty-Box Hunter  | Direct damage to elite threats | Weaker secondary weapons |
| The Engine    | Relentless Runner   | Pickup range and movement      | Lower starting damage    |
| The Guardian  | Defensive Anchor    | Damage resistance              | Lower kick power         |

These are original gameplay archetypes, not representations of real footballers. Typed immutable definitions, safe modifier bounds, persistent selection, unlock/profile presentation, and live-run startup are implemented; original models/portraits remain future polish.

Target paths include lightning, frost, black hole, multiball, holy zones, dash shockwaves, and goalkeeper shields.

## 6. Enemy Roster

| Guaranteed enemy | Gameplay role                                      |
| ---------------- | -------------------------------------------------- |
| Blood Fan        | Basic crowd pressure and readable fodder           |
| Vampire Winger   | Fast flanker that punishes standing still          |
| Undead Defender  | Blocks frontal shots and rewards curves/rebounds   |
| Blood Coach      | Buffs nearby enemies and becomes a priority target |

Target enemies are Bat Swarms, Leech Strikers, Corrupt Referees, Goalkeeper Brutes, the special scoring-goal goalkeeper blocker, and the multi-phase Count Goalkeeper. Visual variants reuse behavior, geometry, materials, and animation wherever possible.

## 7. Technical Architecture

### Current layout

```text
.
├── .gitignore
├── .github/workflows/build-windows.yml
├── electron/
│   ├── main.cjs
│   └── preload.cjs
├── src/
│   ├── diagnostics/PerfMeter.ts
│   ├── audio/
│   │   ├── AudioManager.ts
│   │   └── index.ts
│   ├── game/
│   │   ├── characters/
│   │   │   ├── characterDefinitions.ts
│   │   │   └── types.ts
│   │   ├── boss/
│   │   │   ├── countGoalkeeper.ts
│   │   │   ├── finalElite.ts
│   │   │   └── types.ts
│   │   ├── input/InputController.ts
│   │   ├── match/
│   │   │   ├── config.ts
│   │   │   ├── matchDirector.ts
│   │   │   └── types.ts
│   │   ├── progression/
│   │   │   ├── progression.ts
│   │   │   ├── types.ts
│   │   │   └── upgradeDefinitions.ts
│   │   ├── pickups/BloodShardSystem.ts
│   │   ├── combat/SecondaryWeaponSystem.ts
│   │   ├── spawn/
│   │   │   ├── config.ts
│   │   │   ├── spawnDirector.ts
│   │   │   └── types.ts
│   │   ├── simulation/
│   │       ├── EnemySpatialGrid.ts
│   │       ├── gameState.ts
│   │       ├── gameState.test.ts
│   │       └── types.ts
│   │   └── tutorial/
│   │       ├── tutorialTracker.ts
│   │       └── types.ts
│   ├── physics/PhysicsWorld.ts
│   ├── render/
│   │   ├── adapters/RenderBridge.ts
│   │   ├── app/
│   │   │   ├── CameraController.ts
│   │   │   ├── createRenderer.ts
│   │   │   └── createScene.ts
│   │   └── objects/
│   │       ├── createStadium.ts
│   │       ├── CountGoalkeeperVisual.ts
│   │       ├── GoalBeacon.ts
│   │       └── PhaseAtmosphere.ts
│   ├── settings/SettingsStore.ts
│   ├── profile/
│   │   ├── ProfileStore.ts
│   │   ├── challenges.ts
│   │   ├── profileProgression.ts
│   │   └── types.ts
│   ├── leaderboard/
│   │   ├── LocalLeaderboardRepository.ts
│   │   └── types.ts
│   ├── ui/
│   │   ├── Hud.ts
│   │   ├── HalftimeOverlay.ts
│   │   ├── MatchAnnouncement.ts
│   │   ├── PauseOverlay.ts
│   │   ├── ResultsOverlay.ts
│   │   ├── SettingsOverlay.ts
│   │   ├── TutorialPrompt.ts
│   │   └── UpgradeOverlay.ts
│   ├── main.ts
│   └── styles.css
├── electron-builder.yml
├── index.html
├── package-lock.json
├── package.json
├── tsconfig.app.json
├── tsconfig.json
├── tsconfig.node.json
└── vite.config.ts
```

Asset directories, automated tests, data definitions, and specialized gameplay modules will be added when their milestone needs them; empty aspirational folders are not required.

### Current runtime boundaries

- `main.ts`: bootstrap, events, fixed-step accumulator, interpolation, combat-audio hooks, restart, and frame rendering
- `AudioManager`: asset-free effects, event cooldown protection, football/goalkeeper/progression/match/UI cues, smoothly blended drone/tension/pulse/choir/percussion layers, gesture unlock, volume/mute, polyphony limits, and cleanup
- `MatchDirector`: pure, data-configurable stage transitions, objectives, goal opportunity, and run outcomes
- `SpawnDirector`: immutable phase-specific population/cadence/roster budgets with allocation-free fixed-step resolution and deterministic weighted-selection tests
- `progression`: immutable blood XP, level thresholds, upgrade offers/stacks, and recomputed combat modifiers
- `characters`: six immutable original football-style archetypes with safe strengths, weaknesses, affinities, modifier bonuses, and visual palettes
- `profile`: schema-validated local account XP, unlocks, mastery, ten challenges, statistics, personal bests, duplicate-safe run settlement, and twenty-run history
- `leaderboard`: local/offline score and fastest-victory ranking over profile history, isolated by exact build version and optional character
- `BloodShardSystem`: fixed-cap deterministic shard bursts, magnet movement, collection, and XP preservation
- `SecondaryWeaponSystem`: bounded garlic, orbit, bomb, ghost, chain, frost, multiball, and black-hole combat plus generic evolution hooks
- `SecondaryWeaponRenderer`: five fixed instanced batches sharing three geometries and five semantic materials
- `UpgradeOverlay`: accessible mouse/keyboard three-choice level-up dialog
- `HalftimeOverlay`: timed Power/Pace/Control decision with mouse and keyboard support
- `MatchAnnouncement` / `PhaseAtmosphere`: pooled match-state presentation and stadium color/fog transitions
- `TutorialTracker` / `TutorialPrompt`: persistent first-run lessons driven by demonstrated gameplay signals
- `PerfMeter`: stable live snapshots for cadence, renderer work, fixed steps, enemies, and pool occupancy
- `GoalBeacon`: lightweight animated world-space marker for the active opponent goal
- `field`: shared 68×105 pitch, physical-goal, and whole-ball scoring constants/queries
- `AimGuide`: reusable long red world-space line driven by the current camera aim
- `boss`: deterministic Count Goalkeeper and final-elite encounter simulation with typed events
- `CountGoalkeeperVisual`: interpolated multi-phase boss presentation
- `SettingsStore` / `SettingsOverlay`: validated persistent player preferences and accessible configuration UI
- `desktopRuntime`: fixed-channel Electron IPC for window state, safe size presets, fullscreen, and explicit quit
- `InputController`: keyboard/mouse state, pointer lock, charged-kick edges, recall, and dash input
- `gameState.ts`: player simulation, eight director-selected archetypes, elite variants, kickoff resets, crowd separation, special attacks, damage, death, combo, and score
- `EnemySpatialGrid`: reusable typed-array neighborhood queries for crowd separation and Coach auras
- `PhysicsWorld`: Rapier arena/player/ball bodies, charged/curved kicks, perfect volley, halftime-modified recall, speed limiting, stepping, and ball recovery
- `RenderBridge`: interpolated player/enemy/ball presentation, shared archetype visuals, elite/shield/telegraph cues, and primitive visual lifecycles
- `CameraController`: third-person orbit aim, arena-boundary collision, camera smoothing, sensitivity, conventional/inverted vertical look, and restrained impact feedback
- `Hud`: kickoff/death overlays and live combat/performance readouts
- `PauseOverlay` / `ResultsOverlay`: focus-safe interruption controls and terminal run summaries
- `electron/main.cjs` and `preload.cjs`: secured desktop shell

### Target module boundaries

- `App`: boot, disposal, resize, focus, pause, and scene transitions
- `GameLoop`: fixed-step simulation with interpolated rendering
- `InputManager`: keyboard/mouse state and configurable actions
- `PlayerController`: camera-relative movement, dash, facing, and health
- `CameraRig`: third-person orbit, collision handling, shake, and Focus Kick transition
- `BallController`: explicit ball state and trajectory control
- `RapierWorld`: physics initialization, fixed stepping, queries, and collision events
- `EnemySimulation`: lightweight crowd state separate from rendering
- `EnemyRenderer`: instanced or pooled visuals with distance/update LOD
- `SpawnDirector`: phase-driven population and pacing
- `UpgradeSystem`: offers, stacks, prerequisites, and evolutions
- `ProfileUI`: character selection, progression, mastery, challenges, personal bests, and recent-run history
- `LeaderboardUI`: explicitly local/offline build-specific rankings; remote competition is out of scope until deterministic runs and a server-side trust boundary exist
- `MatchDirector`: clock, goals, kickoffs, halftime, boss, win, and loss
- `PoolManager`: VFX, pickups, projectiles, UI numbers, and non-instanced enemies
- `AudioManager`: Web Audio buses, spatial effects, music layers, and persistence
- `QualityManager`: render scale, shadows, effects, population, and frame-rate choices

Data definitions must be plain typed objects/JSON where practical. Rendering, simulation, UI, and configuration stay decoupled so large crowds do not require one physics body or DOM element per enemy.

### Desktop packaging

Electron loads only the local production build. The desktop shell uses a restricted preload boundary, context isolation, no Node integration in renderer code, fullscreen/window settings, and hardware acceleration. The game must also remain playable as a normal static web build.

`electron-builder` produces native desktop packages. Routine alpha tags build and publish only verified web and macOS artifacts. Windows x64 and Linux x64 use a separate confirmation-gated manual workflow only after macOS/web gameplay is complete; each final candidate must still be smoke-tested on its target operating system before submission.

## 8. Performance Plan

### Budgets

- 120 FPS frame budget: **8.33 ms**
- 60 FPS frame budget: **16.67 ms**
- Fixed simulation: initially 60 Hz, accumulated independently of render refresh
- Current ordinary-enemy cap: 72 across presets; change only after production profiling
- WebGL 2 with `powerPreference: "high-performance"`

### Required practices

- Use instancing for repeated enemies, crowd silhouettes, and simple repeated props.
- Keep ordinary crowd enemies in lightweight arrays/typed data; avoid individual dynamic Rapier bodies.
- Use simple spatial hashing for crowd separation and nearby-hit queries.
- Pool frequently created effects, pickups, projectiles, and UI feedback.
- Stagger enemy decisions and animation updates across frames.
- Reuse geometry/materials; limit transparent overdraw, particles, shadows, and real-time lights.
- Clamp device pixel ratio/render scale through quality presets.
- Avoid per-frame object allocation in hot loops.
- Profile both browser and packaged desktop builds; development-server FPS is not acceptance evidence.

### Acceptance

The guaranteed build must maintain stable 60 FPS on the documented reference machine during the densest required wave. 120 FPS support passes only when a capable 120 Hz Windows system sustains stable frame pacing on the performance preset. It is a supported option, not a promise for all hardware.

## 9. Art and Audio

Image generation may provide original key art, menus, upgrade icons, portraits, stadium banners, decals, loading art, and promotional graphics. Generated raster art does not replace production-ready rigged 3D models. Gameplay models should use licensed low-poly assets, shared rigs, authored primitives, or procedural geometry.

Every external or generated asset must immediately receive a source, author/tool, license, and modification record in the credits documentation.

Audio priority is kick impact, ball flight/recall, player danger, goalkeeper responses, enemy hit/death, goal/kickoff stingers, upgrade/evolution/profile cues, then phase-layered music. The implemented procedural core includes football-frame impacts, dash/heal/life-steal, progression, match-transition, goalkeeper, outcome, and UI cues with retrigger protection, plus drone, tension, pulse, choir, and percussion-style layers. Runtime/UI event wiring and mix acceptance remain in progress. Strong sound and restrained camera/impact feedback outrank decorative content.

## 10. UI and Accessibility

Persistent HUD: health, blood XP/level, clock/phase, ball state, ultimate charge, current objective, and boss health when relevant.

Modal surfaces: upgrade selection, halftime choice, pause/settings, and results. Required settings are master/music/effects volume, mouse sensitivity, persisted vertical-look inversion, resolution/fullscreen in desktop, quality preset, and 60/120/unlimited frame-rate choice. Desktop Quit belongs only on the title screen. Target options include shake strength, aim assist, rebinding, and color-independent indicators.

## 11. Build and Release Strategy

### Outputs

- Static web production build (`dist/`) for itch.io
- Portable Windows `.exe` and ZIP packaged by Electron Builder
- macOS Intel/Apple-silicon DMG and ZIP packages
- Linux x64 AppImage and ZIP packages

### Continuous integration

Development and gameplay validation run locally on macOS and in the browser. Version tags trigger verified macOS packaging plus a static web archive, combine checksums, and attach those outputs to the matching GitHub prerelease. Windows and Linux packaging is final-only and runs through an explicit manual confirmation after the game is complete. Release metadata must state controls, included content, known issues, test status, and commit SHA.

Normal pushes and pull requests run a pinned Linux verification job using `npm ci`, Prettier, ESLint, Vitest, strict TypeScript, and the production Vite build. A separate least-privilege workflow repeats the full verification on `main`, installs and validates the official itch.io Butler binary, and pushes `dist/` to the `html5` channel using the encrypted `BUTLER_API_KEY` repository secret. Manual dispatch is restricted to the canonical repository's `main` branch, and the secret is exposed only to the final Butler upload step; pull requests cannot deploy. macOS packaging runs for version tags; Windows/Linux packaging runs only through the explicit final-platform manual dispatch.

### Commit and documentation policy

- Commit small coherent changes; never mix unrelated refactors, assets, and features.
- Push after verified feature slices and at least at the end of each active work block.
- Update README progress, controls, architecture notes, credits, and known issues as behavior changes.
- At every major playable milestone: verify, commit, push, tag, publish a GitHub Release, and test its downloaded artifact.
- Never rewrite or erase jam development history.
- Stop all repository changes before the July 20 freeze.

Planned tags: `v0.1.0` foundation, `v0.2.0` combat prototype, `v0.3.0` vertical slice, `v0.5.0` complete run, `v0.8.0` content complete, `v0.9.0` release candidate, and `v1.0.0` frozen submission.

## 12. Production Schedule

### July 14 — Foundation and feel

- Scaffold Three.js, TypeScript, Vite, Rapier, lint/type checks, and Electron.
- Add browser and desktop development commands.
- Graybox a stadium and implement player, camera, ball, one enemy, damage, death, and restart.
- Build and playtest the web and Electron versions locally on macOS; keep Windows packaging dormant.

**Gate A:** Do not expand scope unless kicking, rebounding, recalling, and defeating enemies are fun in a build.

### July 15 — Vertical slice

- Add pools/instancing, Spawn Director, blood XP, upgrade selection, HUD, audio, and first goal.
- Ship a three-minute match release.

**Gate B:** A new player must understand and complete the loop without developer help.

### July 16 — Required content

- Implement four guaranteed enemies, eight upgrades, two evolutions, and data-driven waves.

### July 17 — Complete run

- Implement match phases, halftime, final goal, boss/fallback, win, loss, and results.

**Gate C:** Freeze guaranteed features. Target work may not destabilize a shippable build.

### July 18 — Presentation

- Replace critical placeholders; add icons, key art, banners, VFX, audio, menus, tutorials, and settings.
- Add Focus Kick only if required content is stable.

### July 19 — Performance and balance

- Profile web and Electron builds, tune budgets/difficulty, run external playtests, and cut weak target features.

### July 20 — Submission and freeze

- Fix release blockers only, generate final web/Windows artifacts, test downloaded uploads, tag `v1.0.0`, submit early, and freeze the repository by **11:59 PM Asia/Dhaka**.

### July 21 — Pitch

- Edit and submit the gameplay/theme pitch by **11:59 PM Asia/Dhaka** without modifying the frozen game or repository.

## 13. Scope Gates and Fallbacks

- If ball combat is not fun by Gate A, simplify curve/physics and prioritize reliable kick–recall–volley control.
- If crowds miss 60 FPS, reduce population and improve density through instanced visuals, speed, formation, audio, and spawn pacing.
- If the boss is unstable, ship a authored final elite wave using proven behaviors.
- If Windows CI fails, preserve the web submission while repairing the desktop artifact; never endanger both outputs.
- If target features threaten the deadline, cut them immediately. A polished guaranteed build outranks breadth.

## 14. Current State

As of July 14, 2026, the complete nine-minute run is implemented through goals, halftime tactics, Blood Moon escalation, the multi-action Count Goalkeeper boss, and terminal results. The current work includes the shared 68×105 field, physical goal frames, swept whole-ball scoring, a special goalkeeper blocker, a long red aim line, and conventional/invertible vertical look. Fifteen weapon paths, five live passives, seven evolutions, six persistent selectable characters, 20-level mastery perks/rewards, seeded standard/daily/weekly runs, challenges/history, four local exact-build ranking categories, expanded procedural music/SFX, eleven ordinary enemy archetypes plus elites, Focus Kick, physical XP shards, onboarding, gamepad controls, accessibility settings, diagnostics, aim assistance, rebinding, persistent settings, and a phase-aware Spawn Director are active. Web/macOS prerelease automation covers active development; Windows/Linux remain manual final-only. Pointer-lock combat feel, full-run balance, final audio mix, and downloaded Windows/Linux smoke tests still require human validation.

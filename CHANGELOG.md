# Changelog

Notable project changes are recorded here. Versions follow semantic milestone numbering during the jam.

## Unreleased

- Rebuilt the stadium readability layer with brighter pitch landmarks, low boards plus collision-matched upper fencing, spatially deep goals and nets, arena rails, tiered stands, and two-ended instanced crowds.
- Simplified the scoring beacon into a goal-aligned halo, arrow, beam, and shadow-free light so it highlights the authored goal instead of drawing a second offset frame.
- Added semantic render regression coverage for stadium landmarks, goal structure, instanced crowd resources, arena lighting, and the goal-beacon lifecycle.
- Replaced nine recursive scene-tree lookups per enemy per frame with typed visual references captured once at spawn.
- Added state-driven Winger, Defender, Coach, Bat Swarm, Leech, Referee, and Goalkeeper Brute poses while preserving ground-space telegraphs and locked attack facing.
- Merged Bat Swarm ears and Corrupt Referee stripes into shared geometry so every ordinary archetype stays within the five-visible-mesh budget; the 72-enemy scene dropped from 188 to 178 draw calls.
- Replaced the continuous time-only enemy formula with a data-driven Spawn Director: every combat stage now owns its ramping population cap, cadence, and weighted roster, while goals, halftime, victory, and death stop ordinary spawns.
- Added deterministic Spawn Director, non-combat rest-stage, and enemy visual/resource coverage; the complete suite now contains 135 passing tests.

## v0.8.0-alpha.4 — 2026-07-14

- Disabled electron-builder's implicit tag publishing so native runner jobs hand completed artifacts to the explicit, least-privilege release publisher.
- Updated checkout and Node setup actions to their Node 24-compatible major versions.

## v0.8.0-alpha.3 — 2026-07-14

- Added native GitHub Actions release builds for Windows x64, macOS Intel/Apple silicon, Linux x64, and the static web game, with a combined SHA-256 manifest.
- Added the confirmed Huntrix roster and registration code `04-42417` to public submission documentation while keeping private registration fields out of the repository.
- Replaced the player placeholder with a distinctive low-poly vampire-league striker and added lifecycle coverage for its shared render resources.
- Reduced kill XP from 10 to 2 to keep the full run near its intended wall-clock duration, with deterministic phase-by-phase progression checks.
- Added exhaustive bounded-pool coverage for every secondary weapon family.
- Fixed the final-wave deadline granting victory while Count Goalkeeper was still alive; only defeating the boss now wins the match.

## v0.8.0-alpha.2 — 2026-07-14

- Added original generated key art, an optimized title background, an itch.io cover candidate, and a complete prompt/derivation record.
- Added fourteen original SVG upgrade/evolution icons, accessible icon-backed upgrade cards, and queued evolution-unlock presentation.
- Fixed later level-ups potentially passing more than three choices to the upgrade modal by using the tested randomized offer sampler.
- Added development-only upgrade, evolution, victory, and defeat QA routes that exercise the real integrated overlays while remaining unavailable in production.
- Improved arena, enemy, and player readability with measured palette, fill-light, and tone-mapping adjustments without adding another shadow pass.
- Added a deterministic 72-enemy profiling route, corrected capped frame pacing, and recorded the first Metal-backed macOS baseline.
- Refreshed seven 1280×720 title, gameplay, settings, pause, upgrade, evolution, and victory screenshots.

## v0.8.0-alpha.1 — 2026-07-14

- Added fast, fragile Bat Swarms with deterministic weaving behavior and a distinct animated airborne silhouette.
- Added Leech Strikers with contact-range latching, pulsed health drain, self-healing, recovery windows, and a shape-based drain tell.
- Added Corrupt Referees with ranged whistle telegraphs, standoff movement, retreat behavior, and a shape-based pulse tell.
- Added Goalkeeper Brutes that catch ordinary shots and require power-speed breakthroughs, with oversized gloves and a catch-ring tell.
- Added persisted Off/Low/High aim assist and connected it to nearby on-reticle enemies and the active boss.
- Added procedural Count entrance/phase cues plus distinct victory and defeat sequences.
- Added a dedicated procedural evolution-unlock cue and build version/optional commit metadata to results.
- Injected the validated Git commit SHA into production builds so results identify the exact revision.
- Added a combat-charged first-person Focus Kick with real-time slow aiming, one empowered shot, HUD state, and cooldown.
- Locked the low-poly gothic palette, silhouettes, lighting, VFX grammar, accessibility rules, and performance budgets.
- Added selectable Storm Studs with bounded deterministic chain-lightning hops and cyan impact feedback.
- Added selectable Frost Cleats with bounded deterministic impact bursts, timed enemy slowing, and ice feedback.
- Added selectable Spectral Volley with a reusable six-shot pool, deterministic fan spread, and visible duplicate balls.
- Added selectable Void Goal with pooled gravity zones, capped deterministic pulses, damage, pull, and visible vortex rings.
- Added patterned/glyph ball-state indicators and geometric special-attack markers that do not depend on color.
- Added schema-v4 persistent keyboard rebinding with migration, conflict rejection, safe capture, and live HUD labels.
- Added outcome-specific results hierarchy, reduced-motion-safe animation, and an accessible deterministic S–D run grade.
- Added idempotent shutdown/HMR cleanup across listeners, UI, WebGL resources, shared enemy assets, and Rapier WASM.
- Split production output into small app, Three.js, and offline Rapier/WASM chunks with relative desktop-safe loading.
- Staggered expensive far ordinary-enemy decisions while preserving per-tick movement, collision, timers, and special AI.
- Added an accurate submission asset inventory with screenshot hashes, ownership/tool/license fields, and freeze checks.
- Downloaded v0.7.1, corrected its portable checksum path, and verified both the checksum and ZIP contents.

## v0.7.1 — 2026-07-14

- Split audio into independently persisted master, music, and effects controls with v1-to-v2 migration.
- Added secure Electron IPC and in-game controls for safe window sizes, fullscreen/windowed mode, and Quit.
- Added deterministic full-match deadline/outcome coverage and dense 72/257-enemy stress tests.
- Added pinned Node/npm metadata, ESLint, Prettier, clean-install verification, and a push/PR CI workflow.
- Applied a repository-wide mechanical formatting baseline.

## v0.7.0 — 2026-07-14

- Replaced full-crowd separation and Coach scans with a reusable typed-array spatial grid.
- Added phase-reactive procedural music with smoothly blended drone, tension, and pulse layers.
- Added recovery regression tests for walls, corners, stalls, bounds, recall, catches, resets, and curves.
- Fixed vertical bouncing preventing stall recovery and caught balls retaining velocity for one frame.

## v0.6.0 — 2026-07-14

- Added a persistent six-step first-run tutorial driven by demonstrated gameplay actions.
- Added restrained mouse-intent kick curve and arena-boundary camera collision.
- Added live frame-time, render-work, fixed-step, enemy, and pool diagnostics.
- Applied the Power halftime damage bonus consistently to Count Goalkeeper.

## v0.5.0 — 2026-07-14

- Migrated the production plan from Unity to Three.js, TypeScript, Vite, Rapier, and Electron.
- Added the initial web/desktop project scaffold, Windows workflow, and expanded game, architecture, release, and asset-credit documentation.
- Implemented an early playable stadium scaffold with movement/camera controls, ball kick/rebound/recall, basic vampire combat, death/restart, HUD, fixed-step interpolation, and ball recovery fail-safes.
- Added a secured Electron shell, electron-builder portable/ZIP targets, and a tagged Windows GitHub Actions release workflow; Windows artifacts remain unverified.
- Verified local TypeScript checking and the production web build.
- Browser-smoke-tested the styled kickoff, timed spawning, death, and restart flows; booted the production Electron shell locally on macOS.
- Deferred Windows packaging to a manual-only final submission task so active development can focus on completing and polishing gameplay on macOS/browser.
- Added release-to-fire charged kicks, explicit ball states, a 36-unit speed cap, automatic recovery, and perfect-return volleys.
- Added Blood Fan, Winger, Defender, and Coach archetypes with escalating spawn weights, crowd separation, distinct shared visuals, and a Coach speed aura.
- Added original procedural audio feedback for kicks, volleys, recalls, hits, kills, and player damage.
- Re-verified the production web build, live browser kickoff flow, and macOS Electron boot after the combat update.
- Added a directional dash with cooldown, HUD state, and a short invulnerability window.
- Added a typed blood-XP and upgrade core covering all eight guaranteed upgrade definitions; Silver Ball, Power Kick, and Rapid Recall now affect live combat.
- Added an accessible three-card level-up overlay with mouse and keyboard selection.
- Added a data-configurable match director, live objectives, animated goal opportunity, final wave, and victory flow for a three-minute vertical slice.
- Added repository screenshots for the title, live gameplay, and persistent settings surfaces and embedded them in the README.
- Added a speed-reactive ball trail, pooled impact/volley particles, and bounded camera feedback.
- Added persistent audio, sensitivity, quality, render-scale, frame-rate, and reduced-shake settings for browser and macOS.
- Added the Count Goalkeeper final encounter with deterministic phases, charges, contact damage, boss health HUD, visuals, and boss-defeat victory integration.
- Added Vitest coverage for progression, match, boss, pickups, and secondary weapons.
- Replaced direct kill XP with pooled physical blood shards that bounce, magnetize, collect, and preserve rewards at capacity.
- Activated all eight guaranteed upgrade choices, including Garlic Trail, orbiting spectral balls, Blood Bomb, Ghost Pass, and shield-piercing studs.
- Added Defender frontal blocks/rebounds, vulnerable rear shots, velocity knockback, and telegraphed Winger lunges.
- Added automatic Moon Breaker and Crimson Meteor evolution unlocks with live combined modifiers.
- Expanded the match director through escalation, halftime, Blood Moon, final goal, boss wave, and terminal outcomes.
- Added accessible pause and results overlays with restart, settings, menu navigation, run statistics, and loadout summaries.
- Activated the complete nine-minute match configuration.
- Added a timed halftime overlay with Power, Pace, and Control second-half tactics.
- Added goal formation resets, kickoff/goal/phase announcements, and stage-reactive stadium atmosphere.
- Added focus-loss pause protection and Count Goalkeeper elite Winger/Defender summons.
- Added readable elite markers, Defender shield flashes, and Winger lunge telegraphs.
- Expanded simulation coverage to 22 passing tests.

## v0.0.0 — 2026-07-14

- Established the Blood League: Kickoff concept, scope, production plan, and ordered task list.
- Initialized the jam repository with documentation baseline commit `7d6b7e9`.

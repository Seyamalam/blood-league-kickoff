# Changelog

Notable project changes are recorded here. Versions follow semantic milestone numbering during the jam.

## v0.10.0-alpha.1 — 2026-07-14

- Expanded the pitch from 105×68 to 136×88 while keeping goals, physics walls, camera limits, spawns, formations, bosses, and scoring on shared field constants.
- Added Blood Court, Moonlit Classic, Emerald Cathedral, Royal Amethyst, and Frostbound Arena with distinct palettes, skies, fog, lighting, crowds, and architecture plus a persisted random option.
- Added three reusable Momentum Gates, a touchline-spanning Wide Overload Blood Moon formation, and authored event spacing.
- Rebuilt the striker as a detailed 36-part original humanoid with articulated locomotion, six character identities, bounded shared resources, and a documented production GLB replacement contract.
- Captured and visually verified the expanded production stadium at 1280×720; all five stadiums were exercised through live Settings switching.
- Added two always-available football combat verbs: dashing now performs a forward slide tackle, while successful volleys unleash a charge-scaled bicycle-kick impact lane with dedicated knockback and presentation feedback.
- Integrated and optimized Quaternius's CC0 Universal Base Character and compatible animation library as the live skinned player, retaining the original procedural humanoid as a load-safe fallback and preserving exact licenses and hashes.
- Added five stadium-specific weather identities, reactive crowd waves, event surges, animated flags and banners, pulsing rails, and shadow-free floodlight structures.
- Added four seeded rival vampire clubs with distinct bounded enemy identities, timed Blood Multiball windows, and possession objectives that reward score and ultimate charge.
- Added twenty stadium-mastery challenges, persistent cosmetic-only title/banner/goal-effect/trail rewards, equip controls in Career, and architecture-specific reactive props that progressively fracture during match events.
- Added ambientCG's CC0 Grass 007 PBR maps as repeated, palette-tinted pitch detail with an audited source, bundled license, and exact provenance.

## v0.9.0-rc.1 — 2026-07-14

- Added weighted Common/Rare/Epic/Legendary upgrade drafting with two rerolls, one banish, one skip, owned-stack context, evolution partners, and build previews.
- Added account-level weapon and curse unlocks, mastery-level-five bonuses, a full Career Codex, four difficulty leagues, and five stackable risk/reward modifiers.
- Added long-shot, volley, rebound, setup-touch, placement, and goal-streak scoring with stronger hit-stop, camera, FOV, roll, and chromatic combat feedback.
- Added deterministic nine-minute balance simulation across all six characters, representative builds, curses, elite modifiers, minibosses, and every Count Goalkeeper phase; simulated character power spread is bounded to 35%.
- Gave all six characters distinct procedural accessories and locomotion, transformed Count Goalkeeper into a winged desperation form, and added animated Blood Moon stadium geometry and lighting.
- Strengthened match announcements, cinematic letterboxing/vignettes, crowd response, evolution impact, boss transformation, and outcome-tail audio.
- Added safe edge-triggered standard-gamepad pause/restart controls and retained conventional/inverted vertical camera settings.
- Added deterministic upgrade/boss QA routes, fixed hidden evolution-toast leakage on the title screen, refreshed five 1280×720 release-candidate captures, and recorded a 15-second production gameplay trailer.
- Added original Windows/macOS/Linux application icons and bumped desktop package metadata for the release-candidate line.

## v0.8.0-alpha.8 — 2026-07-14

- Gave all six original characters fixed starting loadouts and distinct charge-based signature ultimates with authored icons, HUD feedback, rebindable keyboard/gamepad input, audio/VFX responses, and onboarding.
- Added Header Cannon, Corner Storm, Red Card, Spectral Teammate, Penalty Mine, and Boot Cyclone plus Royal Header, Tempest Set Piece, Phantom Formation, and Referee's Reckoning evolutions.
- Added six optional cursed contracts, custom-seed runs, and deterministic curse pressure/reward modifiers.
- Added five elite modifiers, five authored formations, timed pitch events, Blood Barrel/Holy Beacon/Barrier interactions, and two pre-final minibosses.
- Added placement/speed-based goal-quality rewards, eighteen persistent achievements, and detailed damage/action telemetry in both pause and results.
- Expanded procedural audio with signature-ultimate, cursed-contract, and miniboss cues.
- Added consistent inline action icons and corrected short-viewport scrolling for title, pause, results, settings, Career, upgrade, halftime, and curse overlays.
- Expanded automated coverage beyond 320 tests and added production-browser responsive visual QA.

## v0.8.0-alpha.7 — 2026-07-14

- Added Dash Shockwave, Consecrated Pitch, Ricochet Ball, and Blood Barrier, plus Thunderclap Rush and Sacred Aegis evolutions with authored icons, bounded pools, boss routing, and tests.
- Added Blood Archer projectiles, Shadow Runner teleports, and Corpse Bomber fuse explosions with distinct silhouettes, telegraphs, combat events, and spawn weights.
- Expanded Count Goalkeeper with dive telegraphs, parries, counterattacks, and vulnerability windows.
- Added deterministic run descriptors and isolated random streams, selectable daily/weekly challenges, saved seed metadata, and current-challenge local leaderboards.
- Expanded character mastery to 20 levels with rewards and two live gameplay perks per character; added character-specific kit palettes and mastery reward presentation.
- Added standard-gamepad movement, aiming, kicking, recall, dash, focus, restart, and vibration support.
- Added reduced-flash, high-contrast HUD, HUD-scale, color-vision, gamepad sensitivity, and vibration settings with safe migration.
- Expanded the suite to 253 passing tests and visually smoke-tested the production title, Career, and daily-run gameplay states.

## v0.8.0-alpha.6 — 2026-07-14

- Added four live passive upgrades—Iron Heart, Blood Magnet, Killer Instinct, and Blood Drinker—with mixed offers, bounded modifiers, health/life-steal feedback, tests, and four original SVG icons.
- Added six immutable original football-style characters—The Maestro, The Breakaway, The Tower, The Finisher, The Engine, and The Guardian—with persistent selection, unlock presentation, distinct live-run traits, and safe modifier tests. No real-player names, likenesses, clubs, or kits are used.
- Added a schema-validated persistent local profile foundation for account XP, character unlocks/mastery, ten challenges, lifetime statistics, personal bests, duplicate-safe settlement, and bounded recent-run history.
- Added local/offline score and fastest-victory ranking over profile history, isolated by exact build version and optional character. No remote or verified-online leaderboard is claimed.
- Added the production Career overlay and README capture for character selection, mastery, challenges, run history, personal bests, and local records.
- Expanded the asset-free procedural audio core with protected football-frame, goalkeeper, movement/healing, progression, match-transition, outcome, and UI cues plus adaptive choir and percussion-style layers; authoritative runtime/UI wiring and final mix validation remain in progress.

## v0.8.0-alpha.5 — 2026-07-14

- Rebuilt play around a shared 68×105 regulation-proportioned pitch, physical goal posts/crossbar, and swept whole-ball scoring that rejects partial crossings and high/wide shots while preventing fast-ball tunneling.
- Added a special goalkeeper blocker to the active scoring end, with dedicated state, presentation, and interception coverage.
- Replaced the fixed HUD crosshair with a long red world-space aim line that follows the live camera direction.
- Corrected vertical mouse look to the conventional default and added a persisted inversion setting with safe schema migration.
- Moved desktop Quit out of Settings and onto the title screen only; browser builds do not show the control.
- Added a tag-triggered verified web/macOS prerelease workflow. Windows and Linux builds are now explicit, confirmation-gated, manual final-only outputs after the game is complete.
- Refreshed gameplay and settings captures and added the goalkeeper screenshot to the public documentation and hashed asset inventory.
- Prepared the `v0.8.0-alpha.5` web/macOS prerelease with versioned documentation and release notes.
- Added one-command local and automatic `main`-branch itch.io HTML5 deployment through the official Butler CLI, with the API key kept in ignored local configuration and GitHub's encrypted secret store.
- Made every secondary weapon and evolution damage Count Goalkeeper through a reserved boss target, a 12-raw-damage fixed-step cap, and a 0.4 boss multiplier without awarding ordinary kills, combo, score, or Blood XP.
- Gave boss kicks the normal impact-weapon triggers plus Blood Bomb, separated primary/secondary hit cooldowns to prevent either path starving the other, kept boss crowd control immune, removed per-kick target-array allocation, and covered secondary defeat-to-victory forwarding in the same fixed step; the suite now contains 171 passing tests.
- Replaced 45 individual secondary-weapon meshes with five fixed `InstancedMesh` batches sharing three geometries; all full pools now add exactly five draw calls instead of as many as 45.
- Made black-hole rotation fixed-step-age-driven, added semantic renderer capacity/matrix/resource-lifecycle tests, and added a deterministic full-pool WebGL stress route with a 1600×900 capture.
- Completed pool diagnostics for multiball and black-hole objects, correcting aggregate visible pool capacity from 195 to 205; the suite now contains 162 passing tests.
- Completed the five-evolution roster with Grave-Frost Wake, Storm Halo, and Phantom Singularity, adding freezing garlic trails, chain-lightning orbiters, and ghost-triggered gravity wells through existing bounded combat pools.
- Added three original evolution icons, visible and accessible evolution-partner hints on upgrade cards, evolution entries in final results, and deterministic development fixtures for every evolution.
- Added data-contract, exact-boundary, idempotency, all-build, progression-to-combat, and UI coverage for the complete evolution graph.
- Rebuilt the stadium readability layer with brighter pitch landmarks, low boards plus collision-matched upper fencing, spatially deep goals and nets, arena rails, tiered stands, and two-ended instanced crowds.
- Simplified the scoring beacon into a goal-aligned halo, arrow, beam, and shadow-free light so it highlights the authored goal instead of drawing a second offset frame.
- Added semantic render regression coverage for stadium landmarks, goal structure, instanced crowd resources, arena lighting, and the goal-beacon lifecycle.
- Replaced nine recursive scene-tree lookups per enemy per frame with typed visual references captured once at spawn.
- Added state-driven Winger, Defender, Coach, Bat Swarm, Leech, Referee, and Goalkeeper Brute poses while preserving ground-space telegraphs and locked attack facing.
- Merged Bat Swarm ears and Corrupt Referee stripes into shared geometry so every ordinary archetype stays within the five-visible-mesh budget; the 72-enemy scene dropped from 188 to 178 draw calls.
- Replaced the continuous time-only enemy formula with a data-driven Spawn Director: every combat stage now owns its ramping population cap, cadence, and weighted roster, while goals, halftime, victory, and death stop ordinary spawns.
- Added deterministic Spawn Director, non-combat rest-stage, enemy visual/resource, and complete evolution-graph coverage; the complete suite now contains 158 passing tests.

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

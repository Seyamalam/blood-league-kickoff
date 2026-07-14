# Blood League: Kickoff — TODO

Complete tasks in milestone order. `P0` is required, `P1` is target scope, and `P2` is optional polish. A later milestone must not weaken an earlier gate.

## Current setup

- [x] `P0` Select the Blood League concept and third-person direction.
- [x] `P0` Select Three.js + TypeScript + Vite + Rapier + Electron.
- [x] `P0` Initialize the empty Git repository.
- [x] `P0` Configure the `Seyamalam/blood-league-kickoff` GitHub remote.
- [x] `P0` Commit the initial documentation baseline.
- [ ] `P0` Confirm the remote repository is public while signed out.
- [x] `P0` Confirm final team name and member names: Huntrix — Touhidul Alam Seyam and MD. Abtahee Kabir.
- [ ] `P0` Confirm every member has read the rulebook and freeze rule.
- [ ] `P0` Record exact start evidence and current jam deadlines.

## Milestone 0 — Project foundation (`v0.1.0`)

- [x] `P0` Scaffold Vite and strict TypeScript without overwriting jam documentation.
- [x] `P0` Install Three.js, Rapier, Electron, and electron-builder dependencies.
- [x] `P0` Add type-check, dev, production-build, desktop, and packaging scripts.
- [x] `P0` Add lint, formatting, and unit-test tooling/scripts.
- [x] `P0` Add `.gitignore` for Node, builds, Electron outputs, logs, and local files.
- [x] `P0` Create the current source layout documented in `Plan.md`.
- [x] `P0` Initialize Rapier WASM and step it through a fixed-timestep game loop.
- [x] `P0` Create the high-performance WebGL renderer with resize and capped pixel ratio.
- [x] `P0` Add complete renderer/listener/resource disposal for shutdown and hot reload.
- [x] `P0` Add a kickoff/boot surface and visible bootstrap error fallback.
- [x] `P0` Add the Electron main/preload shell with secure renderer defaults.
- [x] `P0` Run type-check and the production web build locally.
- [x] `P0` Boot the production Electron desktop build locally.
- [x] `P0` Add GitHub Actions clean install, formatting, lint, tests, type-check, and web-build coverage.
- [x] `P0` Add Vitest and initial progression, pickup, combat, match, and boss tests.
- [x] `P0` Add electron-builder portable/ZIP configuration and a Windows runner workflow.
- [x] `P0` Keep Windows packaging manual-only until the game is content-complete.
- [x] `P0` Update README current progress and exact commands.
- [x] `P0` Commit and push the verified foundation runtime and packaging.
- [x] `P0` Record `v0.1.0` as superseded by the first playable `v0.2.0` release; do not create a misleading retroactive artifact.

## Milestone A — Combat feel (`v0.2.0`)

- [x] `P0` Graybox the stadium, rebound walls, center circle, goals, stands, and banners.
- [x] `P0` Implement third-person camera-relative movement.
- [x] `P0` Implement pointer-lock mouse orbit and pitch limits.
- [x] `P0` Implement arena-boundary camera collision and configurable sensitivity.
- [x] `P0` Implement dash, cooldown, and brief invulnerability.
- [x] `P0` Implement the runtime ball states: possessed, free/launched, recalling, volley window, and recovering/disabled.
- [x] `P0` Implement aim indicator and charged kick.
- [x] `P0` Implement Rapier wall/floor rebounds with CCD.
- [x] `P0` Add explicit ball speed limits and tune controlled rebound behavior.
- [x] `P0` Implement optional kick curve.
- [x] `P0` Implement manual and automatic recall.
- [x] `P0` Implement perfect-volley timing and feedback.
- [x] `P0` Add stalled, timeout, invalid-number, and out-of-bounds ball recovery.
- [x] `P0` Implement one basic vampire that spawns, approaches, and damages the player.
- [x] `P0` Implement ball hits, enemy damage/death, player damage/death, score/combo, and restart.
- [x] `P0` Add deliberate enemy/ball hit knockback.
- [x] `P0` Add placeholder kick, hit, recall, damage, and death audio.
- [x] `P0` Add restrained camera feedback, ball trail, and pooled impacts; evaluate hit pause during playtest.
- [x] `P0` Automate wall, corner, out-of-bounds, stall, recall, catch, reset, and curve recovery; retain goal/death cases for full-flow playtests.
- [x] `P0` Add an FPS/enemy-count development readout in the HUD.
- [x] `P0` Expand diagnostics with frame time, draw calls, triangles, fixed steps, enemies, and pool counts; isolate physics timing during profiling.
- [x] `P0` Produce and test browser and desktop builds.
- [x] `P0` Update README/game docs with implemented controls and known issues.
- [x] `P0` Commit and push coherent combat slices during implementation.
- [x] `P0` Tag `v0.2.0` and publish/test the combat prototype release.

### Gate A

- [ ] Kicking, rebounding, recalling, curving, and volleying feel satisfying without upgrades.
- [ ] The ball cannot become permanently inaccessible.
- [ ] Five enemies can be defeated in a repeatable graybox encounter.
- [ ] Web and packaged desktop builds run outside the dev server.

## Milestone B — Vertical slice (`v0.3.0`)

- [ ] `P0` Implement reusable pools for effects, shards, projectiles, and UI feedback.
- [ ] `P0` Implement instanced/pool-friendly enemy rendering separated from simulation.
- [x] `P0` Implement crowd separation with reusable typed-array spatial queries.
- [x] `P0` Implement Spawn Director with configurable phases and population budgets.
- [x] `P0` Implement pooled physical blood shard collection and XP levels.
- [x] `P0` Calibrate kill XP for a bounded full-match upgrade cadence and cover phase checkpoints.
- [x] `P0` Implement three-choice upgrade selection.
- [x] `P0` Implement health, XP, clock, objective, and ball-state HUD.
- [x] `P0` Implement first goal opening, scoring, reset, and new kickoff.
- [x] `P0` Create a three-minute mini-run with a clear win state.
- [x] `P0` Add tutorial prompts that clear after demonstrated actions.
- [x] `P0` Persist audio, sensitivity, and quality settings.
- [ ] `P0` Conduct at least one external playtest.
- [x] `P0` Update README/game docs and release notes.
- [x] `P0` Commit and push each verified system slice.
- [x] `P0` Tag `v0.3.0` and publish the verified web snapshot; Windows remains final-only.

### Gate B

- [ ] A new player understands movement, kick, recall, upgrades, and scoring without help.
- [ ] The mini-run has no progression blocker.
- [ ] The guaranteed reference machine maintains a stable 60 FPS baseline.

## Milestone C — Guaranteed content (`v0.5.0`)

### Enemies

- [x] `P0` Blood Fan crowd behavior and visual variant.
- [x] `P0` Vampire Winger chase, readable telegraph, lunge, and recovery behavior.
- [x] `P0` Undead Defender frontal shield, rebound response, and rear-shot weakness.
- [x] `P0` Blood Coach buff and priority indicator.
- [x] `P0` Typed/data-driven enemy archetypes.
- [x] `P0` Elite modifiers that reuse proven behaviors.

### Upgrades

- [x] `P0` Silver Ball.
- [x] `P0` Power Kick.
- [x] `P0` Rapid Recall.
- [x] `P0` Piercing Studs.
- [x] `P0` Garlic Trail.
- [x] `P0` Orbiting Spectral Ball.
- [x] `P0` Blood Bomb.
- [x] `P0` Ghost Pass.
- [x] `P0` Moon Breaker evolution.
- [x] `P0` Crimson Meteor evolution.
- [x] `P1` Grave-Frost Wake evolution.
- [x] `P1` Storm Halo evolution.
- [x] `P1` Phantom Singularity evolution.
- [x] `P0` Upgrade stacks, prerequisites, duplicate limits, and valid randomized offers.

### Complete run

- [x] `P0` Opening Kickoff phase.
- [x] `P0` First Goal transition in the prototype match director.
- [x] `P0` Halftime major choice.
- [x] `P0` Blood Moon phase in the full match director.
- [x] `P0` Final-wave transition and prototype victory condition.
- [x] `P0` Count Goalkeeper simulation, visual, boss HUD, damage phases, and stable final-elite fallback foundation.
- [x] `P0` Victory and defeat sequences.
- [x] `P0` Results with time, kills, goals, level, upgrades, and evolutions.
- [ ] `P0` Balance the full run to 8–10 minutes.
- [x] `P0` Update all public documentation to match actual content.
- [x] `P0` Commit/push the completed guaranteed-run implementation.
- [x] `P0` Tag `v0.5.0`, publish and smoke-test the web snapshot; Windows remains intentionally final-only.

### Gate C — Guaranteed feature freeze

- [ ] The run works from main menu to results.
- [ ] All guaranteed enemies, upgrades, goals, and outcomes function.
- [ ] Pause, resume, restart, settings, fullscreen, and quit work where applicable.
- [ ] The game can ship if every remaining `P1`/`P2` task is deleted.

## Presentation and target content (`v0.8.0`)

- [x] `P0` Lock the low-poly gothic visual palette.
- [x] `P0` Generate original key art, itch cover, and menu background.
- [x] `P0` Create readable original upgrade/evolution icons.
- [ ] `P0` Create or source licensed character and enemy models.
- [x] `P0` Record every current external/generated asset source, author/tool, license, and change.
- [ ] `P0` Replace critical placeholder models/materials.
- [x] `P0` Add stadium banners, goals, crowd silhouettes, and match-stage atmosphere changes; decals remain polish.
- [x] `P0` Add final kick, hit, recall, goal, evolution, boss, win, and loss audio.
- [x] `P0` Add phase-based procedural music intensity.
- [x] `P1` Add first-person Focus Kick ultimate.
- [x] `P1` Add Bat Swarm.
- [x] `P1` Add Leech Striker.
- [x] `P1` Add Corrupt Referee.
- [x] `P1` Add Goalkeeper Brute.
- [x] `P1` Add the lightning path.
- [x] `P1` Add the frost path.
- [x] `P1` Add the multiball path.
- [x] `P1` Add the black-hole path.
- [x] `P1` Add remaining evolution combinations.
- [ ] `P2` Add uniform/material variants and stadium transformations.
- [x] `P2` Add expanded victory presentation.
- [ ] `P0` Update screenshots, feature list, credits, controls, and known issues.
- [ ] `P0` Commit/push verified content batches.
- [ ] `P0` Tag `v0.8.0`, publish artifacts, and test the downloaded release.

## UI, settings, and accessibility

- [x] `P0` Main menu and start flow.
- [x] `P0` Pause menu and focus-loss pause behavior.
- [x] `P0` Results, restart, and return-to-menu flow.
- [x] `P0` Persistent independent master, music, and effects volume controls.
- [x] `P0` Mouse sensitivity.
- [x] `P0` Quality presets and render-scale control.
- [x] `P0` Desktop window-size, fullscreen/windowed, and quit behavior verified on macOS.
- [x] `P0` 60, 120, and unlimited frame-rate options where supported.
- [x] `P1` Reduced camera-shake option.
- [x] `P1` Aim-assist strength.
- [x] `P1` Rebindable controls.
- [x] `P1` Color-independent enemy/ball-state indicators.

## Performance

- [x] `P0` Select and document the reference machine/browser/GPU.
- [x] `P0` Track FPS, frame time, draw calls, triangles, enemies, fixed steps, and pools; add isolated physics timing during profiling.
- [ ] `P0` Confirm no recurring allocation/GC spikes during steady combat.
- [x] `P0` Keep ordinary crowd enemies out of full rigid-body simulation.
- [x] `P0` Stagger far ordinary enemy decision/separation updates without reducing movement fidelity.
- [x] `P0` Use instancing for blood shards and secondary weapons and shared geometry/materials for enemy visuals.
- [x] `P0` Verify all 45 secondary instances add no more than five WebGL draw calls.
- [ ] `P0` Add distance/update LOD and simple collision/query shapes.
- [ ] `P0` Profile CPU and GPU in production web and Electron builds.
- [ ] `P0` Maintain stable 60 FPS in the densest guaranteed wave.
- [ ] `P1` Maintain stable 120 FPS on capable hardware in performance mode.
- [ ] `P1` Tune population, shadows, render scale, and VFX per quality preset.
- [ ] `P1` Test frame pacing on 60 and 120 Hz Windows displays if available.

## CI, packaging, and releases

- [x] `P0` Pin the Node/package-manager version used by local and CI builds.
- [x] `P0` Make clean installs reproducible from the lockfile.
- [x] `P0` Run format/lint/tests/type-check/web build on pushes to main and pull requests.
- [x] `P0` Produce the portable `.exe` on a Windows GitHub Actions runner.
- [x] `P0` Add tag-triggered native Windows, macOS, Linux, and web release packaging with checksums.
- [x] `P0` Keep Electron renderer isolated from Node and remote network content.
- [ ] `P0` Confirm hardware acceleration/GPU diagnostics in the Windows build.
- [x] `P0` Include commit SHA/version in the results metadata.
- [x] `P0` Attach checksums and concise notes to milestone releases.
- [x] `P0` Download and smoke-test each major release artifact.

## Testing

- [ ] `P0` Test fresh browser cache and first desktop launch.
- [x] `P0` Test Chrome/Chromium web build and production Electron shell on macOS.
- [ ] `P0` Test 1080p and one lower resolution/aspect ratio.
- [ ] `P0` Test ball recovery from walls, corners, goals, death, pause, and boss control.
- [x] `P0` Test secondary simulation/render pool capacity, packing, reset, exhaustion, and disposal behavior.
- [ ] `P0` Test remaining population-cap and UI/VFX pool exhaustion behavior.
- [ ] `P0` Test every upgrade/evolution alone and in combinations.
- [ ] `P0` Test every enemy alone and in mixed waves.
- [ ] `P0` Test pause/focus loss during combat and upgrade selection.
- [x] `P0` Test audio settings persistence after reload and legacy schema migration.
- [ ] `P0` Run at least three complete external playtests.
- [ ] `P0` Classify bugs as release-blocking, major, or cosmetic.
- [ ] `P0` Retest every release-blocking fix from a clean production build.

## Release candidate (`v0.9.0`)

- [ ] `P0` Stop feature work.
- [ ] `P0` Resolve release blockers and cut unstable target features.
- [ ] `P0` Complete credits, licenses, controls, known issues, and asset inventory.
- [ ] `P0` Verify README and itch.io description exactly match the build.
- [x] `P0` Generate web, Windows, macOS, and Linux release artifacts in CI (`v0.8.0-alpha.4`).
- [ ] `P0` Test downloaded artifacts on clean target systems and a fresh browser.
- [ ] `P0` Tag/publish `v0.9.0` with checksums and test notes.

## Submission and freeze (`v1.0.0`)

- [x] `P0` Choose final game and team names.
- [ ] `P0` Add the confirmed public roster, controls, repository, tools, assets, and credits to itch.io (README roster is complete).
- [ ] `P0` Upload both builds before the safety buffer.
- [ ] `P0` Download and test the exact itch.io uploads.
- [ ] `P0` Confirm the itch.io page is public and in the jam submission list.
- [ ] `P0` Confirm GitHub is accessible while signed out.
- [ ] `P0` Add accurate known issues and workarounds.
- [ ] `P0` Tag the exact submitted revision as `v1.0.0`.
- [ ] `P0` Publish the final GitHub Release with matching artifacts/checksums.
- [ ] `P0` Freeze game and repository changes before **July 20, 2026 at 11:59 PM Asia/Dhaka**.
- [ ] `P0` Capture clean footage before the freeze.
- [ ] `P0` Edit the pitch around gameplay, mechanics, and theme adaptation.
- [ ] `P0` Title the video with `IUT_ICT_FEST_2026`.
- [ ] `P0` Add `#IUT_ICT_FEST_2026_GAMEJAM` to the description.
- [ ] `P0` Upload the pitch before **July 21, 2026 at 11:59 PM Asia/Dhaka**.
- [ ] `P0` Add the video to the itch.io Gameplay Video / Trailer field without modifying the frozen repository.

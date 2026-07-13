# Blood League: Kickoff - TODO

Complete tasks from top to bottom. `P0` is required for submission, `P1` is the target build, and `P2` is optional polish. Do not begin a later milestone before its gate passes.

## Immediate setup

- [ ] `P0` Confirm final team name and member names.
- [ ] `P0` Confirm every member has read the rulebook and repository-freeze requirement.
- [ ] `P0` Initialize this directory as the new Git repository.
- [ ] `P0` Create the public GitHub repository and push the documentation-only initial commit.
- [ ] `P0` Record the exact jam start time and preserve evidence that the repository began empty.
- [ ] `P0` Install or confirm Unity 6 with Windows Build Support.
- [ ] `P0` Create a new URP project in the repository's `Game/` subfolder.
- [ ] `P0` Add a Unity-appropriate `.gitignore` before importing large assets.
- [ ] `P0` Install Input System and Cinemachine.
- [ ] `P0` Configure Unity MCP and prove it can read the console and manipulate a test GameObject.
- [ ] `P0` Verify the project opens after cloning into a clean directory.
- [ ] `P0` Produce an empty Windows build and run it outside the Editor.

## Milestone A - Combat feel

- [ ] `P0` Create the `_Game` folder structure defined in `Plan.md`.
- [ ] `P0` Create `Bootstrap`, `MainMenu`, `Stadium`, and `Results` scenes.
- [ ] `P0` Graybox a small stadium with walls and one goal.
- [ ] `P0` Implement third-person movement and camera-relative facing.
- [ ] `P0` Implement mouse camera control and sensitivity setting.
- [ ] `P0` Implement dash with cooldown and invulnerability decision.
- [ ] `P0` Implement the ball state machine.
- [ ] `P0` Implement aim preview and charged kick.
- [ ] `P0` Implement controlled rebounds.
- [ ] `P0` Implement manual and automatic ball recall.
- [ ] `P0` Implement the perfect-volley timing window.
- [ ] `P0` Implement one basic enemy that approaches and damages the player.
- [ ] `P0` Implement damage, enemy death, player death, and restart.
- [ ] `P0` Add temporary kick, hit, death, and recall sounds.
- [ ] `P0` Add restrained hit-stop, screen shake, trail, and impact VFX.
- [ ] `P0` Test ball recovery from every wall and corner.
- [ ] `P0` Create and play a Windows build.

### Gate A

- [ ] Kicking, rebounding, recalling, and volleying are satisfying without upgrades.
- [ ] The ball cannot become permanently inaccessible.
- [ ] Five enemies can be defeated in a repeatable graybox encounter.
- [ ] A complete build runs outside Unity.

## Milestone B - Vertical slice

- [ ] `P0` Implement reusable object pools.
- [ ] `P0` Pool enemies, blood shards, impact VFX, and damage numbers.
- [ ] `P0` Implement Spawn Director with configurable phases.
- [ ] `P0` Implement blood XP collection and level progression.
- [ ] `P0` Implement three-choice upgrade selection.
- [ ] `P0` Implement health, XP, clock, objective, and ball-state HUD.
- [ ] `P0` Implement the first goal opening and scoring flow.
- [ ] `P0` Reset to the center and trigger a new kickoff after scoring.
- [ ] `P0` Create a three-minute mini-run with a clear win state.
- [ ] `P0` Add tutorial prompts that disappear after demonstrated actions.
- [ ] `P0` Conduct one external playtest.

### Gate B

- [ ] A new player understands movement, kick, recall, upgrades, and scoring without verbal instruction.
- [ ] The three-minute loop has no progression blocker.
- [ ] The standalone build maintains the initial 60 FPS baseline.

## Milestone C - Guaranteed content

### Enemies

- [ ] `P0` Blood Fan behavior and visual variant.
- [ ] `P0` Vampire Winger behavior and telegraph.
- [ ] `P0` Undead Defender shield and rebound weakness.
- [ ] `P0` Blood Coach buff behavior and priority indicator.
- [ ] `P0` Data-driven enemy archetype definitions.
- [ ] `P0` Elite modifiers using existing enemy behaviors.

### Upgrades

- [ ] `P0` Silver Ball.
- [ ] `P0` Power Kick.
- [ ] `P0` Rapid Recall.
- [ ] `P0` Piercing Studs.
- [ ] `P0` Garlic Trail.
- [ ] `P0` Orbiting Spectral Ball.
- [ ] `P0` Blood Bomb.
- [ ] `P0` Ghost Pass.
- [ ] `P0` Moon Breaker evolution.
- [ ] `P0` Crimson Meteor evolution.
- [ ] `P0` Upgrade stacking, prerequisites, and duplicate limits.

### Complete run

- [ ] `P0` Opening Kickoff phase.
- [ ] `P0` First Goal transition.
- [ ] `P0` Halftime major upgrade choice.
- [ ] `P0` Blood Moon phase.
- [ ] `P0` Final Goal transition.
- [ ] `P0` Count Goalkeeper or fallback final elite-wave encounter.
- [ ] `P0` Victory sequence.
- [ ] `P0` Defeat sequence.
- [ ] `P0` Results screen with run time, kills, goals, and upgrades.
- [ ] `P0` Complete 8-10 minute balancing pass.

### Gate C - Feature freeze

- [ ] The full run is playable from menu to results.
- [ ] All guaranteed enemies and upgrades function.
- [ ] Win, loss, pause, resume, restart, and quit work.
- [ ] The required game can ship if all remaining `P1` and `P2` work is deleted.

## Presentation and target content

- [ ] `P0` Lock the low-poly gothic visual palette.
- [ ] `P0` Generate original key art and menu background.
- [ ] `P0` Generate readable upgrade icons.
- [ ] `P0` Create or source licensed character and enemy models.
- [ ] `P0` Record every external asset URL, author, and license immediately.
- [ ] `P0` Replace critical placeholder models and materials.
- [ ] `P0` Add stadium banners, decals, goals, and crowd silhouettes.
- [ ] `P0` Add phase-based lighting and music intensity.
- [ ] `P0` Add final kick, hit, goal, evolution, boss, win, and loss audio.
- [ ] `P1` Add first-person Focus Kick ultimate.
- [ ] `P1` Add Bat Swarm.
- [ ] `P1` Add Leech Striker.
- [ ] `P1` Add Corrupt Referee.
- [ ] `P1` Add Goalkeeper Brute.
- [ ] `P1` Add lightning upgrade path.
- [ ] `P1` Add frost upgrade path.
- [ ] `P1` Add multiball upgrade path.
- [ ] `P1` Add black-hole upgrade path.
- [ ] `P1` Add remaining evolution combinations.
- [ ] `P2` Add enemy material and uniform variants.
- [ ] `P2` Add stadium transformation variants.
- [ ] `P2` Add additional victory presentation.

## UI, settings, and accessibility

- [ ] `P0` Main menu.
- [ ] `P0` Pause menu.
- [ ] `P0` Results and restart flow.
- [ ] `P0` Master, music, and effects volume controls.
- [ ] `P0` Mouse sensitivity control.
- [ ] `P0` Resolution, fullscreen, and quality controls.
- [ ] `P0` 60, 120, and unlimited frame-rate options.
- [ ] `P1` Camera shake strength control.
- [ ] `P1` Aim-assist strength control.
- [ ] `P1` Rebindable controls.
- [ ] `P1` Color-independent enemy and ball-state indicators.

## Performance

- [ ] `P0` Select and document the reference test machine.
- [ ] `P0` Add a development-only FPS, frame-time, active-enemy, and pool overlay.
- [ ] `P0` Confirm no recurring managed allocation occurs during steady combat.
- [ ] `P0` Stagger enemy decisions across frames.
- [ ] `P0` Configure shared materials and GPU instancing.
- [ ] `P0` Configure simple collision layers and remove unnecessary callbacks.
- [ ] `P0` Configure animation-distance and update-rate LOD.
- [ ] `P0` Profile CPU and GPU in a standalone development build.
- [ ] `P0` Maintain stable 60 FPS in the densest guaranteed wave.
- [ ] `P1` Maintain stable 120 FPS in performance mode on capable hardware.
- [ ] `P1` Add population and VFX budgets per quality preset.
- [ ] `P1` Test frame pacing on both 60 and 120 Hz displays if available.

## Testing

- [ ] `P0` Test fresh install and first launch.
- [ ] `P0` Test 1080p and one lower resolution.
- [ ] `P0` Test ball recovery from walls, corners, goals, death, and boss possession.
- [ ] `P0` Test pool exhaustion behavior.
- [ ] `P0` Test every upgrade individually.
- [ ] `P0` Test every evolution requirement.
- [ ] `P0` Test every enemy alone and in mixed waves.
- [ ] `P0` Test pause during combat and upgrade selection.
- [ ] `P0` Test settings persistence after restart.
- [ ] `P0` Run at least three full external playtests.
- [ ] `P0` Record and triage bugs by release-blocking, major, and cosmetic severity.
- [ ] `P0` Retest every release-blocking fix in a clean build.

## Submission

- [ ] `P0` Choose final game and team names.
- [ ] `P0` Add team members, engine, controls, GitHub link, and credits to README and itch.io.
- [ ] `P0` Prepare Windows ZIP with no unnecessary development files.
- [ ] `P0` Upload the final build before the deadline buffer.
- [ ] `P0` Download the uploaded file and test it on a clean machine.
- [ ] `P0` Confirm the itch.io page is public and appears in the jam submission list.
- [ ] `P0` Confirm the public GitHub repository is accessible while signed out.
- [ ] `P0` Add known issues and workarounds to the itch.io page.
- [ ] `P0` Tag the submitted source revision.
- [ ] `P0` Freeze project and repository changes before July 20 at 11:59 PM.
- [ ] `P0` Capture clean gameplay footage before freeze.
- [ ] `P0` Edit the pitch around gameplay, mechanics, and theme adaptation.
- [ ] `P0` Title the video with `IUT_ICT_FEST_2026`.
- [ ] `P0` Add `#IUT_ICT_FEST_2026_GAMEJAM` to the description.
- [ ] `P0` Upload the pitch before July 21 at 11:59 PM.
- [ ] `P0` Add the video link to the itch.io Gameplay Video / Trailer field.

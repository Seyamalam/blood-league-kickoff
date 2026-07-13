# Blood League: Kickoff - Production Plan

## 1. Objective

Create a polished third-person 3D horde-survival roguelite in which football is the combat system and each kickoff advances the run. Submit a stable Windows build, public GitHub repository, itch.io page, and clear gameplay pitch within the IUT 12th ICT Fest 2026 GameJam deadline.

## 2. Product Decision

### Chosen direction

- **Engine:** Unity 6 with URP
- **View:** Third-person, over-the-shoulder camera
- **Special camera:** Brief first-person Focus Kick ultimate only
- **Platform:** Windows first; WebGL only if it becomes nearly free to support
- **Session:** 8-10 minutes for the guaranteed build, up to 12 minutes for the target build
- **Art direction:** Stylized low-poly gothic stadium with moonlit blue environments, crimson vampire effects, and gold holy weapons

### Why third-person

Football combat requires awareness of the player, ball, enemies, rebound surfaces, and goals at the same time. Third-person preserves this spatial information. A temporary first-person ultimate creates spectacle without doubling the normal control and camera workload.

## 3. Player Fantasy and Verbs

The player is the last human striker in a supernatural match. The primary verbs are:

- Move
- Aim
- Kick
- Charge
- Curve
- Recall
- Volley
- Dash
- Score
- Choose upgrades

The kick must feel satisfying before any secondary weapon or additional enemy is approved.

## 4. Run Structure

| Time | Phase | Purpose |
| --- | --- | --- |
| 0:00 | Opening Kickoff | Teach movement, kicking, recall, and collection |
| 0:00-3:00 | First Half | Introduce basic crowds, flankers, and first upgrades |
| 3:00 | First Goal | Player scores; enemy tier and stadium state change |
| 3:00-5:00 | Escalation | Add shields, ranged pressure, and upgrade evolution |
| 5:00 | Halftime | Major upgrade choice and a brief pacing reset |
| 5:00-8:00 | Blood Moon | Denser waves, elites, and more dangerous combinations |
| 8:00 | Final Goal | Summon Count Goalkeeper |
| 8:00-10:00 | Final Match | Boss encounter, victory, or defeat |

The exact timings remain configurable data and will be shortened if playtests reveal downtime.

## 5. Combat Design

### Ball state model

The ball moves through explicit states:

1. **Possessed:** attached to the player's dribble point and ready to kick.
2. **Charging:** kick power increases while the input is held.
3. **Launched:** damages enemies and interacts with rebound surfaces.
4. **Returning:** travels toward the player after recall or timeout.
5. **Volley window:** a timed input near the player increases damage and speed.
6. **Disabled:** temporarily caught, blocked, or controlled by a boss mechanic.

Ball movement must remain predictable. Use Rigidbody collision only where it improves feel; keep aim assistance, recall, damage, and state transitions under game-code control.

### Initial weapons and upgrades

The guaranteed build contains:

- Silver Ball
- Power Kick
- Rapid Recall
- Piercing Studs
- Garlic Trail
- Orbiting Spectral Ball
- Blood Bomb
- Ghost Pass

Initial evolutions:

- Silver Ball + Piercing Studs = **Moon Breaker**
- Blood Bomb + Power Kick = **Crimson Meteor**

The target build may add lightning, frost, black-hole, multiball, holy-zone, dash-shockwave, and goalkeeper-shield paths.

## 6. Enemies

### Guaranteed behaviors

| Enemy | Gameplay role |
| --- | --- |
| Blood Fan | Basic crowd pressure and readable fodder |
| Vampire Winger | Fast flanker that punishes standing still |
| Undead Defender | Blocks frontal ball hits and rewards rebounds |
| Blood Coach | Buffs nearby enemies and becomes a priority target |

### Target behaviors

- Bat swarm: airborne movement and ground-hazard immunity
- Leech Striker: telegraphed dash attack
- Corrupt Referee: temporary upgrade suppression or area denial
- Goalkeeper Brute: catches and returns the ball
- Count Goalkeeper: final multi-phase boss

Visual variants should reuse behavior code, rigs, animations, and materials wherever possible.

## 7. Technical Architecture

### Proposed project layout

```text
Game/
  Assets/
    _Game/
      Art/
      Audio/
      Data/
      Materials/
      Prefabs/
      Scenes/
      Scripts/
        Ball/
        Combat/
        Core/
        Enemies/
        Player/
        Pooling/
        Progression/
        Spawning/
        UI/
      Settings/
      UI/
```

### Scene boundaries

- `Bootstrap`: persistent services, settings, save data, and scene loading
- `MainMenu`: start, settings, credits, and quit
- `Stadium`: gameplay arena and match flow
- `Results`: run statistics, victory or defeat, and restart

### Core systems

- `GameFlowController`: run state and match phases
- `PlayerMotor`: movement, dash, facing, and animation signals
- `PlayerCombat`: input-to-kick commands and cooldowns
- `BallController`: ball state machine and trajectory
- `DamageSystem`: damage requests, critical hits, and status effects
- `EnemyController`: shared movement and attack boundary
- `EnemyArchetype`: data-driven enemy configuration
- `SpawnDirector`: time- and phase-based spawning
- `PoolService`: enemies, pickups, projectiles, VFX, and UI numbers
- `UpgradeSystem`: offers, stacking, prerequisites, and evolutions
- `GoalController`: goal opportunities and kickoff transitions
- `PerformanceManager`: quality presets and population budgets

Use ScriptableObjects for weapons, upgrades, enemies, waves, and match phases. Avoid putting game rules directly inside animation events or scene-only objects.

## 8. Performance Plan

### Budgets

- 120 FPS frame budget: **8.33 ms**
- 60 FPS frame budget: **16.67 ms**
- Physics simulation: 60 Hz with interpolation for render smoothness
- Initial active-enemy cap: 80 on performance mode, 120 on balanced mode
- Stretch cap: increase only after standalone profiling

### Required practices

- Pool all frequently spawned objects.
- Do not add one Rigidbody, NavMeshAgent, or unique material per crowd enemy without profiling evidence.
- Stagger enemy decision updates across frames.
- Use shared materials, GPU instancing, simple collision shapes, and animation LOD.
- Limit real-time lights, particles, transparent overdraw, and shadow distance.
- Provide 60, 120, and unlimited frame-rate options where supported.
- Profile development builds on the target Windows hardware; Editor FPS is not acceptance evidence.

### Performance acceptance

Define a reference laptop before optimization. The guaranteed build must maintain a stable 60 FPS on that machine during the densest required wave. The 120 FPS mode is considered supported when frame pacing remains stable on capable 120 Hz hardware at the performance preset.

## 9. Art and Audio Pipeline

### AI-generated raster assets

Image generation can provide original:

- Key art and itch.io cover
- Menu backgrounds
- Upgrade and evolution icons
- Enemy portraits
- Stadium banners and decals
- Loading screens
- YouTube thumbnail and pitch graphics

Generated raster images are not a replacement for rigged 3D characters. Gameplay characters should use licensed reusable humanoid rigs, simple low-poly models, or purpose-built primitives. Every external asset and license must be recorded immediately in an asset-credit file.

### Audio priorities

1. Kick impact variations
2. Ball flight and recall cues
3. Enemy damage and death feedback
4. Goal and kickoff stingers
5. Upgrade selection and evolution cues
6. Music with phase-based intensity layers

Strong sound and restrained hit-stop are higher priority than additional decorative models.

## 10. UI Surface

Persistent HUD:

- Health
- Blood XP and level
- Match clock and current phase
- Ball state / recall availability
- Ultimate charge
- Current objective

Modal surfaces:

- Upgrade choice
- Halftime major choice
- Pause/settings
- Results and run statistics

Upgrade text must remain readable at 1080p. Include volume controls, mouse sensitivity, camera shake strength, and aim-assist strength if time permits.

## 11. Production Schedule

### July 14 - Foundation and feel

- Initialize the required empty public repository.
- Create the Unity 6 URP project in `Game/` and make the first project commit.
- Configure input, third-person movement, camera, and graybox stadium.
- Implement one ball, one enemy, damage, death, and restart.
- Produce a Windows build.

**Gate A:** Do not expand scope unless kicking, rebounding, recalling, and defeating enemies are fun in a build.

### July 15 - Vertical slice

- Add pooling, Spawn Director, XP drops, level-up choice, HUD, and audio feedback.
- Run a three-minute match with one upgrade and one goal.

**Gate B:** A new player must understand and complete the loop without developer help.

### July 16 - Required content

- Implement four guaranteed enemy behaviors.
- Implement the guaranteed upgrade set and two evolutions.
- Add data-driven wave and balance configuration.

### July 17 - Complete run

- Implement match phases, halftime, final goal, boss, win, and loss.
- Finish the entire 8-10 minute run with placeholder art.

**Gate C:** Feature freeze the guaranteed submission. Only target-scope items may be added without destabilizing it.

### July 18 - Presentation

- Replace critical placeholders.
- Add generated icons, key art, banners, VFX, music, menus, tutorial, and settings.
- Add first-person Focus Kick only if all required content is stable.

### July 19 - Performance and balance

- Profile standalone builds.
- Remove allocations and pooling failures.
- Tune difficulty, upgrade offers, population caps, and quality presets.
- Run external playtests and resolve blocking feedback.

### July 20 - Submission

- Fix only release-blocking bugs.
- Build and test the final clean Windows package.
- Upload early, download it again, and test the downloaded copy.
- Complete the itch.io page and verify public visibility and jam listing.
- Tag the release and freeze all project/repository changes before 11:59 PM.

### July 21 - Pitch

- Edit and upload the gameplay pitch.
- Use the required title and hashtag.
- Add the YouTube link to the itch.io page without changing the frozen project files.

## 12. Verification Plan

Every milestone build must test:

- Clean launch on a machine without the Unity Editor
- Keyboard and mouse input
- Pause, resume, restart, win, and loss flows
- Upgrade choices and evolution conditions
- Ball recovery from walls, goals, corners, and boss possession
- Enemy and pickup pool exhaustion behavior
- Frame pacing during the densest wave
- 16:9 at 1080p and at least one lower resolution
- Audio and sensitivity settings persistence

Keep a short known-issues list. A recoverable visual bug may ship; a ball that becomes permanently inaccessible may not.

## 13. Risks and Responses

| Risk | Response |
| --- | --- |
| Ball physics feels random | Use controlled launch/recall states, aim assistance, and predictable rebound rules |
| Crowd performance collapses | Pool objects, reduce active cap, stagger AI, simplify animation and collision |
| Too much content | Protect the guaranteed scope and cut target items in listed order |
| Art pipeline consumes development time | Use one coherent low-poly kit and spend generated art on UI/presentation |
| Unity MCP becomes unstable | Continue through normal Unity project files and editor workflows |
| Boss is unfinished | Convert the strongest elite into a timed final wave with a clear health bar |
| Submission build fails | Produce and test Windows builds from Day 1 onward |

## 14. Cut Order

If the schedule slips, cut features in this order:

1. Meta-progression
2. Additional playable characters
3. Optional first-person camera outside Focus Kick
4. Extra stadium transformations
5. Target-only weapons and evolutions
6. Target-only enemy behaviors
7. First-person Focus Kick
8. Additional visual variants

Never cut the core kick/recall loop, complete run, boss or final challenge, settings, build verification, or pitch preparation.

## 15. Definition of Done

The project is ready to submit when:

- A new player can launch, understand, play, win or lose, and restart without assistance.
- Football mechanics are required for combat and progression.
- The game contains a complete beginning, escalation, and ending.
- The guaranteed content is present and balanced.
- No known bug can permanently lose the ball or block progression.
- The standalone build meets the 60 FPS baseline on the reference machine.
- The uploaded itch.io build has been downloaded and retested.
- Repository, credits, submission metadata, and pitch capture are ready before freeze.

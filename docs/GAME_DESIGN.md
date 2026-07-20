# Blood League: Kickoff — Game Design

## High Concept

The final human striker survives a cursed football match against vampire hordes. The enchanted ball is both weapon and objective: the player kicks it through crowds, recalls it, redirects rebounds, and scores to begin increasingly dangerous kickoff phases.

| Design fact          | Decision                                                                                                  |
| -------------------- | --------------------------------------------------------------------------------------------------------- |
| Genre                | Third-person action horde-survival roguelite                                                              |
| Session target       | 8–10 minutes                                                                                              |
| Theme interpretation | A literal match kickoff, every goal causing another kickoff, and each run beginning a new chain of events |

## Player Experience

The intended rhythm is aim → charge → kick → reposition → recall/volley → collect → upgrade → score. The player should feel clever for reading angles and timing returns, powerful when the ball tears through a crowd, and exposed while it is far away.

The game is not a football simulation. No passing rules, fouls, offside, or team tactics are required. Football supplies the combat language and match structure.

## Design Pillars

1. **One excellent ball:** kick, curve, rebound, recall, and volley remain central throughout the run.
2. **Risk travels with the ball:** a powerful distant shot creates a recovery and positioning decision.
3. **Kickoffs escalate:** scoring advances the clock, horde, arena mood, and available upgrades.
4. **Readable spectacle:** threats and ball state remain clear under crowd pressure.
5. **Buildable ambition:** every target feature can be removed without breaking the guaranteed run.

## Controls and Camera

| Action              | Default                |
| ------------------- | ---------------------- |
| Move                | `WASD`                 |
| Orbit/aim           | Mouse                  |
| Charge/release kick | Left mouse             |
| Ground pass         | Middle mouse           |
| Lob pass            | `Shift` + middle mouse |
| Recall              | Right mouse            |
| Dash                | `Space`                |
| Focus Kick          | `F`                    |
| Pause               | `Esc`                  |

Normal play uses a third-person orbit camera with camera-relative movement. Aim direction should be readable on the pitch. The optional Focus Kick briefly enters first person/time dilation, fires one precise shot, then restores third person automatically.

Vertical mouse movement follows the conventional default: moving down aims down. Players may persistently invert vertical look in Settings. A long red world-space line replaces the fixed screen crosshair so direction is anchored to the player and pitch rather than the display center.

While charging, deliberate sideways mouse movement adds a restrained curve to the kick. The bend fades quickly, respects the normal speed cap, and ends immediately when recall begins.

## Ball Rules

- **Possessed:** ball stays at the dribble point and cannot deal contact damage.
- **Charging:** hold increases power to a readable cap; early playtests decide charge duration.
- **Launched:** ball deals damage based on speed, kick power, upgrades, pierce count, and volley chain.
- **Rebound:** arena impacts preserve readable energy and provide a short damage bonus when intentionally banked.
- **Returning:** recall steers toward the player and can damage enemies at reduced or upgradeable power.
- **Volley:** kicking during the return window relaunches immediately with bonus speed/damage and stronger feedback.
- **Recovery:** timeout, out-of-bounds, zero-speed, and invalid-state checks always restore the ball.

The aim preview may communicate direction and charge but should not solve every rebound. Aim assistance must favor intended nearby targets without visibly hijacking shots.

### Field and scoring rules

- The playable pitch uses shared 68×105 regulation proportions across simulation, rendering, collision, and tests.
- Goal posts and crossbar are physical collision geometry, not decorative scoring markers.
- A goal requires the whole ball to cross the goal line between the inner post planes and below the crossbar.
- Scoring sweeps the previous-to-current ball path so a fast shot cannot tunnel through the scoring plane.
- Partial crossings, post/crossbar contacts, and shots outside the opening do not score.

## Player Rules

- Movement remains responsive while aiming.
- Dash breaks crowd pressure but cannot replace normal movement.
- Contact attacks require readable damage cooldown/invulnerability feedback.
- Health is finite; recovery is an upgrade/drop balance lever, not guaranteed passive regeneration.
- Death ends the run and shows useful statistics before restart.

### Original character archetypes

The roster expresses recognizable football play styles without using a real player's name, likeness, club, kit, celebration, biography, or branding.

| Character     | Identity            | Strength                        | Meaningful weakness      |
| ------------- | ------------------- | ------------------------------- | ------------------------ |
| The Maestro   | Technical Playmaker | Curve, recall, perfect volleys  | Lower raw kick power     |
| The Breakaway | Explosive Runner    | Movement and frequent dashes    | Lower maximum health     |
| The Tower     | Power Striker       | Health, kick force, knockback   | Slower movement          |
| The Finisher  | Penalty-Box Hunter  | Direct elite-threat damage      | Weaker secondary weapons |
| The Engine    | Relentless Runner   | Pickup range and pitch coverage | Lower starting damage    |
| The Guardian  | Defensive Anchor    | Damage resistance               | Lower kick power         |

Definitions, affinities, safe modifiers, selection, unlock presentation, and selected-character run startup are implemented and test covered. One original articulated voxel skeleton now drives all six hero silhouettes and the live Career preview; code-driven poses cover locomotion, football techniques, reactions, and outcomes without changing simulation state.

## Enemies

| Enemy              | Behavior                         | Counterplay                                                                                            |
| ------------------ | -------------------------------- | ------------------------------------------------------------------------------------------------------ |
| Blood Fan          | Direct crowd pressure            | Any clean kick; use for satisfying chains                                                              |
| Vampire Winger     | Fast flank and committed lunge   | Reposition, intercept, or recall through it                                                            |
| Undead Defender    | Frontal shield                   | Curve, rebound, attack side/back, or special upgrade                                                   |
| Blood Coach        | Buffs nearby enemies             | Prioritize at range and create a lane to it                                                            |
| Bat Swarm          | Fast airborne weaving pressure   | Track its lateral rhythm; one clean hit destroys it                                                    |
| Leech Striker      | Latches, drains, and self-heals  | Break contact during drain, then punish its recovery                                                   |
| Corrupt Referee    | Ranged telegraphed whistle       | Close distance or dodge beyond its disruption radius                                                   |
| Goalkeeper Brute   | Catches ordinary ball shots      | Charge above power-shot speed to break its catch                                                       |
| Goalkeeper blocker | Protects the active scoring goal | Move or overpower the dedicated blocker before completing the whole-ball crossing                      |
| Count Goalkeeper   | Final ball-control boss          | Land primary kicks while the full build adds capped damage; crowd-control effects do not move the boss |

Target enemies add airborne pressure, dashes, area denial, and ball interception only after the guaranteed roster is stable.

## Progression

Enemies drop blood shards preserving 2 total Blood XP per kill. The full-match kill checkpoints target roughly 1, 5, 8, 13, and 16 earned upgrade choices, keeping builds distinct without flooding the run with paused menus. Crossing an XP threshold pauses play and offers three upgrades. Offers must be understandable in seconds: name, icon, one-line effect, current/new value, and evolution hint where relevant.

Guaranteed upgrades:

| Upgrade                | Function                                      |
| ---------------------- | --------------------------------------------- |
| Silver Ball            | Baseline ball damage path                     |
| Power Kick             | Charge power, speed, and knockback            |
| Rapid Recall           | Recall speed/cooldown improvements            |
| Piercing Studs         | Additional enemy penetrations                 |
| Garlic Trail           | Damage trail along the ball path              |
| Orbiting Spectral Ball | Automatic close-range protection              |
| Blood Bomb             | Defeated enemies or ball impacts explode      |
| Ghost Pass             | Spectral teammate redirects/duplicates a shot |
| Dash Shockwave         | Dashes erupt into a damaging knockback ring   |
| Consecrated Pitch      | Charged kicks leave a burning penalty zone    |
| Ricochet Ball          | Primary impacts chain into nearby enemies     |

Passive foundations:

| Passive         | Function                                                           |
| --------------- | ------------------------------------------------------------------ |
| Iron Heart      | Raises maximum health; a new stack also restores the gained health |
| Blood Magnet    | Expands Blood XP attraction range                                  |
| Killer Instinct | Raises damage from every source within a bounded multiplier        |
| Blood Drinker   | Adds capped healing from primary/secondary kills and boss damage   |
| Blood Barrier   | Absorbs incoming hits and recharges during combat                  |

When both categories are available, a multi-card offer includes at least one weapon and one passive. Definitions, calculations, bounds, icons, live-combat application, healing feedback, and tests are implemented; final UI polish and balance acceptance remain in progress.

Evolutions unlock automatically when both components are owned. Component availability gates provide the level threshold, while every relevant upgrade card names its partner and result.

| Evolution           | Components                           | Evolved behavior                                      |
| ------------------- | ------------------------------------ | ----------------------------------------------------- |
| Moon Breaker        | Silver Ball + Piercing Studs         | Greater primary-ball damage and penetration           |
| Crimson Meteor      | Blood Bomb + Power Kick              | Larger blood eruptions and stronger, faster kicks     |
| Grave-Frost Wake    | Garlic Trail + Frost Cleats          | Garlic zones damage and slow enemies                  |
| Storm Halo          | Orbiting Spectral Ball + Storm Studs | Fresh orb collisions launch bounded lightning chains  |
| Phantom Singularity | Ghost Pass + Void Goal               | Each ghost opens one pooled gravity well on first hit |
| Thunderclap Rush    | Dash Shockwave + Storm Studs         | Wider, stronger, storm-charged dash eruptions         |
| Sacred Aegis        | Consecrated Pitch + Blood Barrier    | Stronger holy zones and faster barrier recovery       |
| Royal Header        | Header Cannon + Silver Ball          | Charged headers create a devastating shock ring       |
| Tempest Set Piece   | Corner Storm + Penalty Mine          | Corner strikes seed stronger explosive penalty mines  |
| Phantom Formation   | Spectral Teammate + Spectral Volley  | Adds a striker and accelerates the spectral attack    |
| Referee's Reckoning | Red Card + Boot Cyclone              | Executions trigger stronger boot cyclones             |

## Persistent Progression and Rankings

Run upgrades reset at kickoff; the local profile persists replay goals without turning the standard leaderboard into a permanent-stat advantage contest. The implemented data/store foundation includes account XP and level, 20-level per-character mastery rewards/perks, character/weapon/curse unlock levels, eighteen achievements, deterministic standard/daily/weekly run metadata, lifetime statistics, personal bests, duplicate-safe run settlement, and the twenty most recent runs. The Career Codex records discovery and unlock state across characters, weapons, evolutions, enemies, elite affixes, and curses.

Level-up offers use weighted Common/Rare/Epic/Legendary rarity, always preserve weapon/passive offer diversity when possible, and provide two rerolls, one banish, and one skip per run. Cards show current stacks, relevant evolution recipes, and a preview of what the selection changes.

Rookie, Professional, Champion, and Nightmare leagues scale encounter pressure and career rewards. Players may combine up to three optional modifiers—Extra Time, Dry Veins, Elite League, One Touch, and Blood Rush—for additional risk and reward.

Local/offline rankings expose highest score and fastest victory. They are partitioned by exact build version and may be filtered by character so balance changes and archetypes are not mixed unfairly. The Career screen presents profile, challenge, mastery, run history, character selection, and these device-local tables. They are not global, server-verified, or cheat-proof.

Daily/weekly or remote rankings require one run-wide deterministic seed, versioned random streams, and a server-side validation boundary. No private key or organizer/player contact information may be embedded in browser or Electron builds.

## Match Flow

First-time onboarding is a selectable **Guided Kickoff** rather than a forced interruption. It runs for at most three minutes on a deterministic, reward-free training ruleset. Seven contextual lessons teach movement, aiming, kicking, recall, dashing, Focus Kick, and collecting Blood XP. Safety assists prevent an unlucky death, prepare the ultimate when its lesson begins, and seed progression shards for the final lesson. Completion is stored locally, but training remains replayable from the title screen.

1. Opening Kickoff teaches movement, kick, recall, and collection.
2. First Half introduces crowd pressure and early upgrades.
3. First Goal recenters play and escalates enemies/stadium state.
4. Halftime offers one high-impact choice and a brief rest.
5. Blood Moon combines enemies at higher density.
6. Final Goal summons Count Goalkeeper or the stable elite-wave fallback.
7. Victory/defeat flows to results and a one-action restart.

Match timings live in data. If a section contains downtime, shorten it rather than filling it with weak content.

Ordinary enemy pressure is also authored by match stage. Opening, First Half, Escalation, Blood Moon, and Final Wave each define a ramping population cap, spawn cadence, and weighted roster. Goal opportunities, halftime, and terminal stages stop ordinary spawning so their objective or decision remains readable. Archetypes still unlock by absolute match time, preventing a fast stage transition from introducing late threats before the player has learned the early roster.

The current halftime tactics are **Power** (+25% ball damage and +15% kick force), **Pace** (+15% movement and 20% faster dash recovery), and **Control** (+25% recall speed and a wider perfect-volley catch window). If the choice timer expires, the configured default is applied automatically.

Scoring clears the active crowd, recenters the striker and ball, preserves health/XP/score, and presents a new kickoff. Match-stage announcements plus smoothly blended fog, accent lighting, and embers make the transition readable without blocking control.

Every secondary damage source can hit Count Goalkeeper once its entrance ends. Successful boss kicks trigger the same impact weapons as ordinary hits plus Blood Bomb, so specialized builds do not depend on a nearby minion. Secondary damage is reduced to 40% and capped at 12 raw damage per fixed step so automatic and evolved builds remain useful without erasing the kick-focused climax. Primary and secondary hits have independent short cooldowns, with primary contact resolved first for readable impact. Secondary slows and pulls remain boss-immune, and boss damage never awards ordinary enemy score, combo, kills, or Blood XP.

During scoring opportunities, the special goalkeeper blocker is separate from Count Goalkeeper and ordinary crowd roles. It protects the physical goal opening without changing the match director's whole-ball scoring requirement.

## HUD and Arena Presentation

The shipping match HUD uses one compact bottom-left status cluster, one small top-right time/score capsule, and a contextual objective prompt. Health, barrier, ball charge, Focus Kick, dash, and XP remain visible without framing the entire screen in permanent panels. Long-form controls fade after kickoff, while the tutorial coach card advances only when the player performs the requested action. Settings can expose optional performance telemetry without adding it to the default play view.

The arena presentation layers deterministic stars, a Blood Moon, stadium-accent pitch edging, restrained quality-scaled light shafts, fog, embers, and stage lighting around the readable football field. Reduced-motion and quality settings disable decorative movement or expensive accents while preserving gameplay silhouettes and aim readability.

## Feedback Priorities

1. Kick input and contact sound
2. Ball trail and direction readability
3. Enemy hit flash/knockback/death response
4. Volley timing cue and payoff
5. Goal/kickoff transition
6. Evolution and boss presentation

The audio foundation includes kick/volley/combat feedback plus distinct wall, post, crossbar, net, recall-catch, dash, heal, life-steal, pickup, level, upgrade, unlock, personal-record, goalkeeper, kickoff, missed-goal, halftime, Blood Moon, final-wave, outcome, and UI cues. Retrigger windows protect the shared graph during dense events. Three original offline tracks cover menu, match, and boss states; CC0 Kenney samples reinforce menu interactions; procedural layers remain available for responsive event feedback and fallback. No runtime network request or generative service is required.

Camera shake, hit pause, chromatic effects, and particles must be restrained and scalable. Ball, threats, goal, and upgrade text must remain readable at 1080p and lower quality settings.

## Current Prototype Acceptance

Before expanding content, the prototype must prove:

- camera-relative movement and mouse aiming feel predictable;
- kick charge and ball speed are readable;
- wall rebounds produce useful intentional shots;
- recall never strands the ball;
- a returning perfect volley is understandable without explanation;
- five basic enemies can be defeated repeatedly; and
- the loop remains smooth in web and desktop production builds.

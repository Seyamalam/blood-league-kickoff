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

| Action              | Default     |
| ------------------- | ----------- |
| Move                | `WASD`      |
| Orbit/aim           | Mouse       |
| Charge/release kick | Left mouse  |
| Recall              | Right mouse |
| Dash                | `Space`     |
| Focus Kick          | `F`         |
| Pause               | `Esc`       |

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

Evolutions unlock automatically when both components are owned. Component availability gates provide the level threshold, while every relevant upgrade card names its partner and result.

| Evolution           | Components                           | Evolved behavior                                      |
| ------------------- | ------------------------------------ | ----------------------------------------------------- |
| Moon Breaker        | Silver Ball + Piercing Studs         | Greater primary-ball damage and penetration           |
| Crimson Meteor      | Blood Bomb + Power Kick              | Larger blood eruptions and stronger, faster kicks     |
| Grave-Frost Wake    | Garlic Trail + Frost Cleats          | Garlic zones damage and slow enemies                  |
| Storm Halo          | Orbiting Spectral Ball + Storm Studs | Fresh orb collisions launch bounded lightning chains  |
| Phantom Singularity | Ghost Pass + Void Goal               | Each ghost opens one pooled gravity well on first hit |

## Match Flow

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

## Feedback Priorities

1. Kick input and contact sound
2. Ball trail and direction readability
3. Enemy hit flash/knockback/death response
4. Volley timing cue and payoff
5. Goal/kickoff transition
6. Evolution and boss presentation

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

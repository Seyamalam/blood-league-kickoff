# Blood League: Kickoff

> A third-person football-combat horde-survival roguelite created for the IUT 12th ICT Fest 2026 GameJam.

**Status:** Pre-production  
**Theme:** Kickoff  
**Primary platform:** Windows  
**Engine:** Unity 6, Universal Render Pipeline (URP)  
**Input:** Keyboard and mouse

## The Game

The opening kickoff of a cursed football match awakens a stadium full of vampires. The last human striker must survive the match using an enchanted football, supernatural boots, and spectral teammates.

The ball is more than a projectile: it is the player's main weapon, defensive tool, positional risk, and key to advancing the match. Every goal begins another kickoff, mutates the enemy horde, and pushes the player toward a final confrontation with Count Goalkeeper.

## Design Pillars

1. **The ball is the combat system.** Kicking, curving, rebounding, recalling, and volleying must remain useful throughout a run.
2. **Every kickoff changes the match.** Goals advance phases, introduce enemy mutations, and transform the stadium.
3. **Readable spectacle.** Large enemy crowds, strong impact effects, and clear threats without visual noise.
4. **Short, replayable runs.** A complete run should take approximately 10 minutes.
5. **Performance is a feature.** The Windows build should support 60 and 120 Hz displays with scalable enemy and effects budgets.

## Core Loop

1. Move through the stadium and control space.
2. Kick the ball through vampire crowds.
3. Recall, redirect, or volley the returning ball.
4. Collect blood shards and choose one of three upgrades.
5. Score when the enemy goal opens.
6. Begin a more dangerous kickoff phase.
7. Defeat the final goalkeeper or fall and begin a new run.

## Planned Controls

| Action | Input |
| --- | --- |
| Move | `WASD` |
| Aim / camera | Mouse |
| Kick / charged kick | Left mouse button |
| Recall ball | Right mouse button |
| Dash | `Space` |
| Focus Kick ultimate | `Q` |
| Pause | `Esc` |

Controls may change during playtesting.

## Scope

### Guaranteed submission

- One playable striker
- One stadium arena
- One complete 8-10 minute run
- Ball kick, rebound, recall, and perfect-volley mechanics
- Four normal enemy behaviors
- Six upgrades and two evolved upgrades
- One final boss
- Menus, settings, tutorial prompts, win, and loss states
- A tested Windows build

### Target submission

- Eight enemy behaviors with visual variants
- Twelve weapons or upgrades
- Five evolved combinations
- Three match phases and a halftime choice
- First-person Focus Kick sequence
- Performance, balanced, and quality presets
- Additional VFX, music layers, and accessibility options

Anything beyond the guaranteed submission is optional until the vertical slice is approved.

## Technology

- Unity 6
- Universal Render Pipeline
- C#
- Unity Input System
- Cinemachine
- Unity MCP / AI Assistant for editor automation where stable
- Git and GitHub for required development history

The game must never depend on an AI service or MCP connection at runtime.

## Development

The Unity project has not been scaffolded yet. Development starts by creating a new Unity 6 URP project in `Game/` inside this repository and proving the complete player-ball-enemy interaction before producing content.

See [Plan.md](Plan.md) for the production and technical plan and [TODO.md](TODO.md) for the ordered task list.

## Jam Requirements

- The repository must begin empty and remain public for verification.
- The submitted game must be a Windows or web build requiring no additional software.
- No project changes or repository commits are allowed after **July 20, 2026 at 11:59 PM (Asia/Dhaka)**.
- The pitch video is due **July 21, 2026 at 11:59 PM (Asia/Dhaka)**.
- All reused assets must be licensed and credited.

Refer to [RuleBook for GameJam_IUT_12th_ICT_Fest.md](RuleBook%20for%20GameJam_IUT_12th_ICT_Fest.md) for the complete rules.

## Credits

Team name, members, third-party assets, tools, and licenses will be added before submission.

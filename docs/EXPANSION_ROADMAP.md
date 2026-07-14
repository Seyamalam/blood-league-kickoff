# Blood League: Kickoff — Post-RC Expansion Roadmap

The larger field and stadium-variety pass creates room for deeper systems. These additions are ordered by player value, dependency, and production risk.

## Character and animation

1. Generate an original riggable hero with a documented AI 3D task, license, prompt, and source output.
2. Retopologize and optimize the hero into a web-safe GLB with one shared skeleton and material atlas.
3. Add authored idle, run, strafe, dash, kick, volley, hurt, ultimate, victory, and defeat clips.
4. Give every character a distinct head, hair, kit layer, boots, and silhouette attachment on the shared rig.
5. Add enemy GLB families and LODs while keeping instanced/procedural fallbacks for dense waves.

## Stadiums and match identity

6. Give each stadium unique hazards, bonuses, encounter weights, crowd chants, and weather.
7. Add day/night, rain, fog, snow, eclipse, and Blood Moon transitions during a run.
8. Add tunnels, locker-room introductions, team walkouts, and skippable boss entrances.
9. Add destructible boards, collapsing barriers, moving floodlights, banners, and reactive crowds.
10. Add stadium mastery challenges, trophies, and cosmetic unlocks without permanent combat power creep.

## Football-combat depth

11. Add ground passes, lob passes, bicycle kicks, headers, tackles, sliding saves, and wall passes.
12. Add AI spectral teammates with formation commands, one-twos, assists, and build synergies.
13. Add rival vampire teams with distinct formations, kits, captains, and stadium invasions.
14. Add multi-ball events, moving goals, penalty shootouts, sudden-death overtime, and possession objectives.
15. Add elemental pitch zones—frost, storm, holy grass, blood mud, and void turf—that alter ball behavior.

## Progression and replayability

16. Add stadium-specific weapons, evolutions, curses, bosses, Codex pages, and achievement chains.
17. Add a branching campaign map with rival clubs, transfer choices, injuries, sponsors, and cup finals.
18. Add ghost replays and asynchronous local challenge ghosts before attempting verified online competition.
19. Add cosmetic kit, boot, trail, goal-explosion, banner, and stadium-theme unlocks.
20. Add a replay/photo mode with free camera, slow motion, match highlights, and exportable clips.

## AI-generated 3D production boundary

A genuine AI-generated model requires an authenticated external generator and may consume paid credits. The recommended path is image/multiview-to-model, rigging, and GLB export, followed by Blender cleanup and glTF validation. Do not place API keys in browser or Electron code. Do not merge generated output until topology, rig, animations, texture rights, likeness risk, scale, pivots, collision, memory, and fallback behavior pass the contract in `CHARACTER_ASSET_PIPELINE.md`.

# Blood League: Kickoff — Asset Inventory

This is the submission-facing inventory of player-visible and player-audible assets currently in the repository. `ASSET_CREDITS.md` remains the authoritative license ledger; this file tracks what must be reviewed, captured, or frozen for a release.

Inventory status as of 2026-07-14:

- All current gameplay visuals are generated at runtime from authored TypeScript, Three.js primitives, materials, lights, and particles.
- All current music and sound effects are synthesized at runtime with the Web Audio API.
- The repository contains fourteen authored SVG progression icons, three authored JPEG screenshots, one generated key-art master, and two optimized key-art derivatives.
- No imported 3D model, recorded audio, bundled font, or third-party player-facing asset is currently present.

## Field Definitions

- **Source** identifies the code or repository file that produces the asset.
- **Tool** identifies the creation/runtime tool, not merely the application used to view it.
- **License/ownership** records redistribution status. “Project-created” means original repository work; final team-name and event-submission ownership wording must be confirmed before release.
- **Changes/current state** records transformations and whether the listed source is final or still live-generated.

## Runtime-Generated Visual Assets

These assets do not exist as standalone image or model files. Their geometry and appearance are authored in code and created in memory at runtime.

| Category                               | Source                                                                                                    | Tool                                                         | License/ownership                                | Changes/current state                                                                                                                                                                                                     |
| -------------------------------------- | --------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------ | ------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Player striker and football            | `src/render/adapters/RenderBridge.ts`                                                                     | TypeScript, Three.js primitive geometry/materials            | Project-created code; Three.js runtime under MIT | Capsule/box striker and faceted icosahedron ball; colors, scale, emissive energy, spin, and visibility are authored in code                                                                                               |
| Standard enemy roster                  | `src/render/adapters/RenderBridge.ts`                                                                     | TypeScript, Three.js primitive geometry/materials            | Project-created code; Three.js runtime under MIT | Blood Fan, Winger, Defender, Coach, Bat Swarm, Leech Striker, Corrupt Referee, and Goalkeeper Brute are assembled from shared low-poly primitives; no external meshes or textures                                         |
| Enemy state markers                    | `src/render/adapters/RenderBridge.ts`                                                                     | TypeScript, Three.js                                         | Project-created code                             | Elite rings, threat markers, shield/catch flashes, drain/whistle rings, wing motion, and telegraph scaling are procedural and state-driven                                                                                |
| Count Goalkeeper boss                  | `src/render/objects/CountGoalkeeperVisual.ts`                                                             | TypeScript, Three.js primitive geometry/materials            | Project-created code; Three.js runtime under MIT | Capsule body, shoulder armor, crown, eyes, and phase emissive intensity; no imported model                                                                                                                                |
| Stadium and pitch                      | `src/render/objects/createStadium.ts`                                                                     | TypeScript, Three.js primitive geometry/materials            | Project-created code; Three.js runtime under MIT | Pitch, stripes, boundary lines, center circle, walls, two goals, stands, and banners are generated from planes, lines, boxes, and cylinders                                                                               |
| Goal opportunity beacon                | `src/render/objects/GoalBeacon.ts`                                                                        | TypeScript, Three.js geometry, material, and light animation | Project-created code                             | Goal frame, halo, arrow, beam, pulse, and point light generated at runtime                                                                                                                                                |
| Blood XP shards                        | `src/render/objects/BloodShardRenderer.ts`                                                                | TypeScript, Three.js instanced mesh                          | Project-created code                             | Pooled octahedron shards with authored blood/emissive material; no texture                                                                                                                                                |
| Secondary weapon visuals               | `src/render/objects/SecondaryWeaponRenderer.ts`                                                           | TypeScript, Three.js pooled primitive meshes                 | Project-created code                             | Garlic zones, orbiting spectral balls, ghost passes, and multi-ball shots use shared cylinder/sphere geometry; Blood Bomb and chain-lightning feedback currently reuse procedural combat effects rather than external art |
| Ball trail and combat bursts           | `src/render/adapters/RenderBridge.ts`                                                                     | TypeScript, Three.js dynamic buffers/points                  | Project-created code                             | Sixteen-point ball trail and four pooled fourteen-point hit/volley bursts; positions and colors update at runtime                                                                                                         |
| Phase atmosphere                       | `src/render/objects/PhaseAtmosphere.ts`                                                                   | TypeScript, Three.js fog, point light, and dynamic points    | Project-created code                             | Phase-dependent background, fog, accent light, and 56 ember points; no skybox, LUT, or texture                                                                                                                            |
| Scene lighting and camera presentation | `src/render/app/createScene.ts`, `src/render/app/createRenderer.ts`, `src/render/app/CameraController.ts` | TypeScript, Three.js/WebGL                                   | Project-created code; Three.js runtime under MIT | Moon, hemisphere, blood light, fog, tone mapping, camera movement, FOV impulse, and optional reduced shake are runtime settings rather than baked assets                                                                  |

## Authored Interface Assets

| Category                                                                      | Source                                | Tool                                   | License/ownership                         | Changes/current state                                                                                                                                                                 |
| ----------------------------------------------------------------------------- | ------------------------------------- | -------------------------------------- | ----------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| HUD, title screen, pause, halftime, upgrades, tutorial, settings, and results | `src/ui/`, `src/styles.css`           | TypeScript, HTML DOM, CSS              | Project-created code                      | Layout, typography, gradients, borders, icons/glyphs, animation, and reduced-motion behavior are authored directly; the title screen composites the generated key art recorded below  |
| Upgrade and evolution icons                                                   | `src/assets/progression/**/*.svg`     | Authored SVG/XML                       | Project-created original vector art       | Twelve upgrade and two evolution icons use the locked bone/semantic palette, transparent backgrounds, and distinct silhouettes; Vite imports and inlines them for offline runtime use |
| BL favicon                                                                    | Inline SVG data URL in `index.html`   | Authored SVG path and CSS color values | Project-created code                      | Embedded at build time; not stored as a separate image file                                                                                                                           |
| Typography                                                                    | CSS system stacks in `src/styles.css` | Host operating-system fonts            | No font file redistributed by the project | Uses fallbacks including Impact/Haettenschweiler/Arial; appearance can vary by platform and must be checked on the target macOS build                                                 |

## Procedural Audio Assets

There are no `.wav`, `.mp3`, `.ogg`, MIDI, impulse-response, or sample-library files in the repository.

| Category                  | Source                      | Tool                                                              | License/ownership    | Changes/current state                                                                          |
| ------------------------- | --------------------------- | ----------------------------------------------------------------- | -------------------- | ---------------------------------------------------------------------------------------------- |
| Adaptive match score      | `src/audio/AudioManager.ts` | TypeScript, browser Web Audio oscillators/filters/gain/LFO        | Project-created code | Continuous drone, tension, and pulse layers respond to match intensity; synthesized at runtime |
| Core combat cues          | `src/audio/AudioManager.ts` | Web Audio oscillators, generated noise buffer, envelopes, filters | Project-created code | Kick, volley, hit, kill, player hurt, recall, goal, and phase cues; no samples                 |
| Progression and boss cues | `src/audio/AudioManager.ts` | Web Audio procedural synthesis                                    | Project-created code | Evolution unlock, boss entrance, blood-rush/desperation phase cues; no samples                 |
| Match outcome cues        | `src/audio/AudioManager.ts` | Web Audio procedural synthesis                                    | Project-created code | Victory fanfare and defeat cadence; no samples                                                 |

The generated noise buffer is computed during runtime and is not an authored or downloaded recording.

## Repository Screenshots

All current screenshots are direct captures of the running game and therefore depict the runtime visuals and authored interface listed above. The refreshed title capture includes the generated key-art background recorded in the asset register; the gameplay and settings captures contain no generated or third-party raster imagery.

| Path                                | Source                           | Tool                                                      | License/ownership                                                        | Changes/current state                                                                                                                      |
| ----------------------------------- | -------------------------------- | --------------------------------------------------------- | ------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------ |
| `docs/screenshots/title-screen.jpg` | Running local game title screen  | Headless Chrome 149 capture; FFmpeg JPEG export, 1280×720 | Project-created capture compositing the generated key art recorded below | README title image refreshed after key-art integration; SHA-256 `e089848c8cfa42b909fe6d315174ca4cbb1285d57cfd56bd0d9a842501303f31`         |
| `docs/screenshots/gameplay.jpg`     | Running local third-person match | Local browser capture; JPEG, 1280×720                     | Project-created capture                                                  | README gameplay image; repository file is the source of record; SHA-256 `22b326334e4b11a46f88b4c09e81d91d939db94936a8943c60b01c7813cb06d4` |
| `docs/screenshots/settings.jpg`     | Running local settings overlay   | Local browser capture; JPEG, 1280×720                     | Project-created capture                                                  | README settings image; repository file is the source of record; SHA-256 `f8208da807fa9b6bafb45e1ec9a8b306798319c570e81bc8f009b58b6b72aeb0` |

The capture method is recorded at the level verified by the repository history. If a release capture is cropped, color-corrected, composited, or exported through another tool, record that change and tool here before submission.

## Generated Raster and Imported Asset Register

| Asset class                                           | Current files                                                                                                                | Source/tool/license/change record                                                                                                                                                  |
| ----------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| AI-generated raster images                            | `docs/art/source/blood-league-key-art-master.png`; `src/assets/key-art/menu-background.jpg`; `docs/marketing/itch-cover.jpg` | OpenAI built-in image generation, 2026-07-14; full prompt and derivation record in `docs/art/KEY_ART_PROMPT.md`; original plus FFmpeg JPEG runtime and centered cover derivatives. |
| Hand-authored raster images other than screenshots    | _None_                                                                                                                       | Record source artwork and export transformations when added.                                                                                                                       |
| External textures or sprites                          | _None_                                                                                                                       | Record original author, direct source URL, exact license, attribution, and all modifications when added.                                                                           |
| Imported 3D models (`.glb`, `.gltf`, or source scene) | _None_                                                                                                                       | Record modeling source, author/tool, license, cleanup, scale, collision, and export settings when added.                                                                           |
| Recorded or generated audio files                     | _None_                                                                                                                       | Procedural Web Audio code is listed above; any future rendered file needs generator/recording source and editing history.                                                          |
| Bundled font files                                    | _None_                                                                                                                       | Record foundry, source URL, license file, subset/conversion, and uses when added.                                                                                                  |
| Third-party logos or character art                    | _None_                                                                                                                       | Do not add without documented permission compatible with redistribution.                                                                                                           |

## Asset Freeze Checklist

- [ ] Confirm the final creator/team names and ownership wording in both this inventory and `ASSET_CREDITS.md`.
- [ ] Freeze from a clean, tagged commit and record the commit SHA used for the submission build.
- [ ] Search the repository and final package for every image, model, audio, font, video, shader, and data asset; reconcile every result with this inventory.
- [ ] Refresh title, gameplay, settings, and results screenshots after the final UI/visual pass; remove obsolete captures.
- [ ] Record dimensions, export tool, material edits, and SHA-256 for every final screenshot or promotional image.
- [ ] For every future generated raster asset, preserve the generator/model, prompt or brief, date, source output, and human-edit record.
- [ ] For every third-party asset, verify the author, direct source URL, exact license version, modification permission, redistribution permission, and required attribution text.
- [ ] Confirm no unlicensed trademark, team crest, player likeness, font, sample, texture, or model appears in the build or store images.
- [ ] Confirm all runtime visuals and audio work offline and do not fetch undeclared assets or services.
- [ ] Verify the production web build and final macOS build use the same frozen asset set.
- [ ] Check screenshots at their publication size for readable UI, correct controls, no debug overlays unless intentional, and no personal data.
- [ ] Optimize final raster assets without replacing source-of-record files or losing attribution metadata.
- [ ] Bundle dependency notices/licenses when required and make the README, in-game credits, itch.io page, `ASSET_CREDITS.md`, and this inventory agree.
- [ ] Have a second team member sign off on the final inventory before upload.

# Blood League: Kickoff — Asset Inventory

This is the submission-facing inventory of player-visible and player-audible assets currently in the repository. `ASSET_CREDITS.md` remains the authoritative license ledger; this file tracks what must be reviewed, captured, or frozen for a release.

Inventory status as of 2026-07-14:

- All current gameplay visuals are generated at runtime from authored TypeScript, Three.js primitives, materials, lights, and particles.
- All current music and sound effects are synthesized at runtime with the Web Audio API.
- The repository contains fourteen authored SVG progression icons, seven authored JPEG screenshots, one generated key-art master, and two optimized key-art derivatives.
- No imported 3D model, recorded audio, bundled font, or third-party player-facing asset is currently present.

## Field Definitions

- **Source** identifies the code or repository file that produces the asset.
- **Tool** identifies the creation/runtime tool, not merely the application used to view it.
- **License/ownership** records redistribution status. “Project-created” means original work created for this repository by Huntrix.
- **Changes/current state** records transformations and whether the listed source is final or still live-generated.

## Runtime-Generated Visual Assets

These assets do not exist as standalone image or model files. Their geometry and appearance are authored in code and created in memory at runtime.

| Category                               | Source                                                                                                    | Tool                                                         | License/ownership                                | Changes/current state                                                                                                                                                                                                     |
| -------------------------------------- | --------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------ | ------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Player striker and football            | `src/render/adapters/RenderBridge.ts`                                                                     | TypeScript, Three.js primitive geometry/materials            | Project-created code; Three.js runtime under MIT | Capsule/box striker and faceted icosahedron ball; colors, scale, emissive energy, spin, and visibility are authored in code                                                                                               |
| Standard enemy roster                  | `src/render/adapters/RenderBridge.ts`                                                                     | TypeScript, Three.js primitive geometry/materials            | Project-created code; Three.js runtime under MIT | Blood Fan, Winger, Defender, Coach, Bat Swarm, Leech Striker, Corrupt Referee, and Goalkeeper Brute are assembled from shared low-poly primitives; no external meshes or textures                                         |
| Enemy state markers                    | `src/render/adapters/RenderBridge.ts`                                                                     | TypeScript, Three.js                                         | Project-created code                             | Elite rings, threat markers, shield/catch flashes, drain/whistle rings, wing motion, and telegraph scaling are procedural and state-driven                                                                                |
| Count Goalkeeper boss                  | `src/render/objects/CountGoalkeeperVisual.ts`                                                             | TypeScript, Three.js primitive geometry/materials            | Project-created code; Three.js runtime under MIT | Capsule body, shoulder armor, crown, eyes, and phase emissive intensity; no imported model                                                                                                                                |
| Stadium and pitch                      | `src/render/objects/createStadium.ts`                                                                     | TypeScript, Three.js primitive geometry/materials            | Project-created code; Three.js runtime under MIT | Pitch stripes and guides, low rebound boards, collision-matched upper fencing, light rails, deep goal frames/nets, tiered stands, banners, and two-ended instanced crowds are generated at runtime                        |
| Goal opportunity beacon                | `src/render/objects/GoalBeacon.ts`                                                                        | TypeScript, Three.js geometry, material, and light animation | Project-created code                             | Goal-aligned halo, arrow, beam, pulse, and shadow-free point light generated at runtime; the permanent frame comes from the stadium                                                                                       |
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

All current screenshots are direct 1280×720 Chrome 149 captures: five from revision `dcf620b`, the alpha.2 results capture from `fb8e5bf`, and the gameplay capture from the Unreleased arena-readability pass. They were exported from PNG to JPEG with FFmpeg (`-q:v 2`). The title capture includes the generated key-art background recorded in the asset register; the remaining captures contain no generated or third-party raster imagery.

| Path                                   | Source                                                            | License/ownership                                                        | Changes/current state                                                                                        |
| -------------------------------------- | ----------------------------------------------------------------- | ------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------ |
| `docs/screenshots/title-screen.jpg`    | Title screen                                                      | Project-created capture compositing the generated key art recorded below | SHA-256 `186de4295ea89232c5cfe3c1a0ff708fbe4f02dbd3cc459ed762551d9447d7a8`                                   |
| `docs/screenshots/gameplay.jpg`        | DEV-only deterministic 72-enemy readability and performance scene | Project-created capture                                                  | SHA-256 `f287772fe8def3dad56173193b80cd23fb8cbcebe4920de2fa721bf33fcf7fe5`                                   |
| `docs/screenshots/settings.jpg`        | Expanded settings and control rebinding overlay                   | Project-created capture                                                  | SHA-256 `f3b619e30e35dc8f272ec84c4f73fd310f3d0b5c3d8ab7fda878fdd0d9a67a5f`                                   |
| `docs/screenshots/pause.jpg`           | Focus-loss pause overlay during a live match                      | Project-created capture                                                  | SHA-256 `ef5184f198071dd6d32175f16d798d958a08b5c1db596e213c3f9d9b7c07b758`                                   |
| `docs/screenshots/upgrade.jpg`         | DEV-only deterministic upgrade route using the real overlay       | Project-created capture                                                  | SHA-256 `460cf74b129d9897e468c33537c7745775dc9361223a063f4980f7188c98a47c`                                   |
| `docs/screenshots/evolution.jpg`       | DEV-only live Moon Breaker unlock through `chooseUpgrade`         | Project-created capture                                                  | SHA-256 `42e8a17aead82b408a3b6d47ffef38626becbca699569ad474abcff3e2742187`                                   |
| `docs/screenshots/results-victory.jpg` | DEV-only deterministic victory route using the real results flow  | Project-created capture                                                  | Shows `v0.8.0-alpha.2 · fb8e5bf`; SHA-256 `7133bcd013338d74f74c958afa42cabf4baefa5ff68f4811290bd17df2cec509` |

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

- [x] Confirm the final creator/team names and ownership wording in both this inventory and `ASSET_CREDITS.md`.
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

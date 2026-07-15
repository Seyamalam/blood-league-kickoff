# Blood League: Kickoff — Asset Credits

This is the authoritative asset and license ledger. The submission-facing file inventory and freeze status live in `ASSET_INVENTORY.md`. Record an asset **before or when it enters the repository**, not at submission time. Do not use an asset if redistribution/modification rights are unclear.

## Project-Created Assets

| Asset/path                                | Creator | Tool                                   | Date              | Notes                                                                                                                                  |
| ----------------------------------------- | ------- | -------------------------------------- | ----------------- | -------------------------------------------------------------------------------------------------------------------------------------- |
| Game design and source code               | Huntrix | Codex and local development tools      | 2026-07-14 onward | Team roster: Touhidul Alam Seyam and MD. Abtahee Kabir; AI assistance is not required at runtime                                       |
| Procedural visuals, UI, and audio systems | Huntrix | TypeScript, Three.js, CSS, Web Audio   | 2026-07-14 onward | Generated at runtime from project source; no external media files                                                                      |
| Procedural player fallback                | Huntrix | TypeScript and Three.js                | 2026-07-14        | Original runtime-authored fallback retained for failed/offline GLB loading; no real-player likeness or club identity                   |
| `src/assets/**/*.svg`                     | Huntrix | Authored SVG/XML with Codex assistance | 2026-07-14        | Forty-nine original icons: twenty-one weapons, five passives, eleven evolutions, six curses, and six ultimates; no external source art |
| `docs/screenshots/*.{jpg,png}`            | Huntrix | Chromium capture and FFmpeg            | 2026-07-14 onward | Direct game captures at documented historical/current dimensions; title captures composite the generated key art recorded below        |
| `docs/media/gameplay-trailer-rc.webm`     | Huntrix | Chromium production capture            | 2026-07-14        | 15-second 1280×720 VP8 capture of the frozen production WebGL build; no post-production edits                                          |
| `build/icon.*`                            | Huntrix | Authored SVG; macOS/FFmpeg conversion  | 2026-07-14        | Original BL football crest and derived 1024px PNG, ICNS, and 256px ICO desktop-package assets                                          |

## AI-Generated Assets

| Asset/path                                        | Generator/model                         | Prompt/brief record                      | Date       | Human modifications                                                   | Notes                                                                                                     |
| ------------------------------------------------- | --------------------------------------- | ---------------------------------------- | ---------- | --------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------- |
| `docs/art/source/blood-league-key-art-master.png` | OpenAI built-in image generation        | `docs/art/KEY_ART_PROMPT.md`             | 2026-07-14 | None; preserved source output                                         | Original project key art; generated without logos, typography, or third-party likenesses                  |
| `src/assets/key-art/menu-background.jpg`          | Derived from the source above           | `docs/art/KEY_ART_PROMPT.md`             | 2026-07-14 | JPEG export at 1536×1024 with FFmpeg; no crop or semantic edit        | Optimized runtime title background                                                                        |
| `docs/marketing/itch-cover.jpg`                   | Derived from the source above           | `docs/art/KEY_ART_PROMPT.md`             | 2026-07-14 | Center crop to 1290×1024, resized to 630×500, JPEG export with FFmpeg | README and itch.io cover candidate                                                                        |
| `docs/art/source/*-portrait-atlas-master.png`     | OpenAI built-in image generation        | `docs/art/PORTRAIT_GENERATION_RECORD.md` | 2026-07-15 | None; four source outputs preserved unchanged                         | Original heroes, enemies, rivals, and bosses; no real-player likenesses, commercial clubs, logos, or text |
| `src/assets/portraits/**/*.png`                   | Derived from the portrait atlases above | `docs/art/PORTRAIT_GENERATION_RECORD.md` | 2026-07-15 | Fixed-grid FFmpeg crops only; no paint-over or semantic edit          | Twenty-five offline runtime Codex portraits                                                               |

Store enough prompt/brief information to reproduce or explain each generated asset. Record edits such as paint-over, cropping, texture conversion, typography, and compositing. Never imply a generated image is a licensed third-party logo or character.

## Third-Party Visual Assets

| Asset/path                                                        | Title                                                               | Author     | Source URL                                                                                                                                                | License                                         | Modifications                                                                                                                                                                                                                                                                                                                                                                       |
| ----------------------------------------------------------------- | ------------------------------------------------------------------- | ---------- | --------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `public/assets/vendor/quaternius/night-striker.glb`               | Universal Base Characters — free Standard `Superhero_Male_FullBody` | Quaternius | [Official pack](https://quaternius.com/packs/universalbasecharacters.html) / [itch.io download](https://quaternius.itch.io/universal-base-characters)     | CC0 1.0; included `LICENSE-BASE-CHARACTERS.txt` | Downloaded 2026-07-14; converted from glTF+PNG to embedded GLB; deduplicated, pruned, losslessly resampled, and textures resized to 1024 with source PNG encoding retained for broad WebGL compatibility. Source ZIP SHA-256 `fdbf1804c90dfc1ea03e992bff7da2dfd1a79318e13270a660180f9308455f40`; output SHA-256 `a466828c67a4acc9b2413212ce6d9cde235e3aed9b675680c14fd9673858f118`. |
| `public/assets/vendor/quaternius/universal-animation-library.glb` | Universal Animation Library — free Standard, no-root-motion edition | Quaternius | [Official pack](https://quaternius.com/packs/universalanimationlibrary.html) / [itch.io download](https://quaternius.itch.io/universal-animation-library) | CC0 1.0; included `LICENSE-ANIMATIONS.txt`      | Downloaded 2026-07-14; deduplicated, pruned, sparse-optimized and losslessly resampled from the official GLB. Runtime uses idle, jog, sprint, roll and punch clips while preserving the audited library. Source ZIP SHA-256 `cc73fc4e495b82958207316596317a3f40b9fa38065bde1027937452da537724`; output SHA-256 `4c748767741a3e495d89667b9a218b690ba9810b9517a12e960780e3ca72c4e9`.  |
| `public/assets/vendor/ambientcg/grass007/*.jpg`                   | Grass 007 1K-JPG PBR maps                                           | ambientCG  | [Asset page](https://ambientcg.com/view?id=Grass007) / [license](https://docs.ambientcg.com/license/)                                                     | CC0 1.0; bundled `LICENSE.txt`                  | Downloaded 2026-07-14; retained the 1K Color, OpenGL Normal, and Roughness maps; repeated and palette-tinted at runtime. Source ZIP SHA-256 `04f1a487e1f0f2c24896e494a3bf6be317c15d781aeae67230cf16175e8e4b91`.                                                                                                                                                                     |

## Third-Party Audio

| Asset/path       | Title | Author | Source URL | License | Modifications |
| ---------------- | ----- | ------ | ---------- | ------- | ------------- |
| _None added yet_ |       |        |            |         |               |

## Fonts

| Asset/path       | Font/foundry | Source URL | License | Use |
| ---------------- | ------------ | ---------- | ------- | --- |
| _None added yet_ |              |            |         |     |

## Runtime Libraries and Tools

Exact versions are tracked by `package.json` and the lockfile. Verify transitive notices during release packaging.

| Package/tool                         | Purpose                   | License/source                          |
| ------------------------------------ | ------------------------- | --------------------------------------- |
| Three.js                             | WebGL 3D rendering        | MIT — package repository/license        |
| Rapier (`@dimforge/rapier3d-compat`) | WASM physics              | Apache-2.0 — package repository/license |
| TypeScript                           | Language/tooling          | Apache-2.0 — package repository/license |
| Vite                                 | Development/build tooling | MIT — package repository/license        |
| Electron                             | Desktop runtime           | MIT — package repository/license        |
| electron-builder                     | Desktop packaging         | MIT — package repository/license        |

## Release Credit Checklist

- [ ] Every file under player-facing asset folders has an entry or belongs to a clearly documented original batch.
- [ ] Source URL and author are preserved for every external asset.
- [ ] License permits the intended redistribution and modification.
- [ ] Required attribution text is included exactly where the license demands.
- [ ] AI-generated asset records name the generator and human modifications.
- [ ] Unused assets are removed from the final package.
- [ ] Runtime dependency notices/licenses are bundled if required.
- [ ] README, in-game credits, itch.io credits, and this inventory agree.

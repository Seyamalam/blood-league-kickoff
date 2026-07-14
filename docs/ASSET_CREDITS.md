# Blood League: Kickoff — Asset Credits

This is the authoritative asset and license ledger. The submission-facing file inventory and freeze status live in `ASSET_INVENTORY.md`. Record an asset **before or when it enters the repository**, not at submission time. Do not use an asset if redistribution/modification rights are unclear.

## Project-Created Assets

| Asset/path                                | Creator | Tool                                   | Date              | Notes                                                                                                                                   |
| ----------------------------------------- | ------- | -------------------------------------- | ----------------- | --------------------------------------------------------------------------------------------------------------------------------------- |
| Game design and source code               | Huntrix | Codex and local development tools      | 2026-07-14 onward | Team roster: Touhidul Alam Seyam and MD. Abtahee Kabir; AI assistance is not required at runtime                                        |
| Procedural visuals, UI, and audio systems | Huntrix | TypeScript, Three.js, CSS, Web Audio   | 2026-07-14 onward | Generated at runtime from project source; no external media files                                                                       |
| `src/assets/**/*.svg`                     | Huntrix | Authored SVG/XML with Codex assistance | 2026-07-14        | Forty-nine original icons: twenty-one weapons, five passives, eleven evolutions, six curses, and six ultimates; no external source art  |
| `docs/screenshots/*.jpg`                  | Huntrix | Chromium capture and FFmpeg            | 2026-07-14        | Fifteen direct game captures at documented historical/current dimensions; title captures composite the generated key art recorded below |

## AI-Generated Assets

| Asset/path                                        | Generator/model                  | Prompt/brief record          | Date       | Human modifications                                                   | Notes                                                                                    |
| ------------------------------------------------- | -------------------------------- | ---------------------------- | ---------- | --------------------------------------------------------------------- | ---------------------------------------------------------------------------------------- |
| `docs/art/source/blood-league-key-art-master.png` | OpenAI built-in image generation | `docs/art/KEY_ART_PROMPT.md` | 2026-07-14 | None; preserved source output                                         | Original project key art; generated without logos, typography, or third-party likenesses |
| `src/assets/key-art/menu-background.jpg`          | Derived from the source above    | `docs/art/KEY_ART_PROMPT.md` | 2026-07-14 | JPEG export at 1536×1024 with FFmpeg; no crop or semantic edit        | Optimized runtime title background                                                       |
| `docs/marketing/itch-cover.jpg`                   | Derived from the source above    | `docs/art/KEY_ART_PROMPT.md` | 2026-07-14 | Center crop to 1290×1024, resized to 630×500, JPEG export with FFmpeg | README and itch.io cover candidate                                                       |

Store enough prompt/brief information to reproduce or explain each generated asset. Record edits such as paint-over, cropping, texture conversion, typography, and compositing. Never imply a generated image is a licensed third-party logo or character.

## Third-Party Visual Assets

| Asset/path       | Title | Author | Source URL | License | Modifications |
| ---------------- | ----- | ------ | ---------- | ------- | ------------- |
| _None added yet_ |       |        |            |         |               |

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

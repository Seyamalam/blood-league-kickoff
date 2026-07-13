# Blood League: Kickoff — Asset Credits

This is the authoritative asset and license ledger. The submission-facing file inventory and freeze status live in `ASSET_INVENTORY.md`. Record an asset **before or when it enters the repository**, not at submission time. Do not use an asset if redistribution/modification rights are unclear.

## Project-Created Assets

| Asset/path                                | Creator              | Tool                                 | Date              | Notes                                                                               |
| ----------------------------------------- | -------------------- | ------------------------------------ | ----------------- | ----------------------------------------------------------------------------------- |
| Game design and source code               | Team (names pending) | Codex and local development tools    | 2026-07-14 onward | AI assistance must not be required at runtime                                       |
| Procedural visuals, UI, and audio systems | Team (names pending) | TypeScript, Three.js, CSS, Web Audio | 2026-07-14 onward | Generated at runtime from project source; no external media files                   |
| `docs/screenshots/*.jpg`                  | Team (names pending) | Local browser capture                | 2026-07-14        | Three 1280×720 captures of the running game; no third-party or AI-generated imagery |

## AI-Generated Assets

| Asset/path       | Generator/model | Prompt/brief record | Date | Human modifications | Notes |
| ---------------- | --------------- | ------------------- | ---- | ------------------- | ----- |
| _None added yet_ |                 |                     |      |                     |       |

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

# Asset Sources and License Intake Policy

Last reviewed: **2026-07-14**

This document is a research shortlist, not proof that an asset is already in the game. No asset listed below may enter the repository until its exact download, author, source page, license text, and modifications are recorded in `ASSET_CREDITS.md`. Prefer CC0 assets for the jam build; attribution is still encouraged even when it is not legally required.

## Source audit

| Source                                                               | What its current official terms say                                                                                                                                                                                                          | Project policy                                                                                                                                                                                                                       |
| -------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| [Kenney](https://www.kenney.nl/support)                              | Assets on Kenney asset pages are CC0, including commercial use. Attribution is optional; do not use Kenney's logo.                                                                                                                           | **Preferred.** Confirm the individual asset page says CC0 and retain the included license file.                                                                                                                                      |
| [Quaternius](https://quaternius.com/faq.html)                        | Quaternius says all models are CC0, may be modified, and need no attribution for commercial, educational, or personal projects.                                                                                                              | **Preferred.** Download only the clearly marked free portion of a pack; paid/source-tier access and the asset license are separate questions. Preserve the pack page and included license.                                           |
| [ambientCG](https://ambientcg.com/)                                  | The library describes its textures, HDRIs, and models as CC0, usable commercially without attribution.                                                                                                                                       | **Preferred.** Use game-sized maps, normally 1K or 2K, rather than shipping every source map and resolution.                                                                                                                         |
| [Poly Haven](https://polyhaven.com/license)                          | Its downloadable HDRIs, textures, and models are CC0; commercial use, modification, and redistribution are allowed without attribution. The website's logos, thumbnails, text, and metadata are not part of that grant.                      | **Preferred.** Download the actual asset, not a website thumbnail. Record the named contributor and credit voluntarily.                                                                                                              |
| [OpenGameArt](https://opengameart.org/content/faq)                   | Licenses vary per upload: CC0, CC BY, CC BY-SA, OGA-BY, and GNU licenses can occur. Its FAQ warns that attribution, change notices, share-alike, and DRM considerations depend on the chosen license.                                        | **Per-item review required.** Prefer CC0 or OGA-BY. Avoid GPL and share-alike assets for this project unless compatibility is reviewed deliberately. Copy the uploader's exact attribution notice.                                   |
| [itch.io game assets](https://itch.io/game-assets/free)              | itch.io is a marketplace/host, not a single asset license. “Free” describes price, not reuse rights; creators retain ownership and set their own terms.                                                                                      | **Per-item review required.** Reject packs without a clear license document. Archive the exact store page and version because creators can update listings.                                                                          |
| [Sketchfab](https://sketchfab.com/licenses)                          | Downloadable assets can use different Creative Commons or marketplace licenses. Editorial assets are unsuitable for ordinary commercial/promotional use, and trademark, likeness, architecture, and standalone-file restrictions can remain. | **High scrutiny.** Prefer creator-authored CC0 models with no brands or recognizable people. Never assume “downloadable” means unrestricted. Do not expose source models as standalone downloads.                                    |
| [Mixamo](https://helpx.adobe.com/creative-cloud/faq/mixamo-faq.html) | Adobe says Mixamo characters and animations may be used royalty-free in personal, commercial, and nonprofit video games. Access requires an Adobe ID; its auto-rigger/animation library is for bipedal humanoids.                            | **Useful tool, controlled intake.** Record the Adobe account/download date and source character rights. Do not redistribute Mixamo animations as a reusable animation pack. A Mixamo rig does not cure an unlicensed source model.   |
| [Pixabay Music](https://pixabay.com/service/license-summary/)        | Content can be used free, modified, and used without attribution, but cannot be distributed standalone. Logos, recognizable people, other third-party rights, and misleading uses remain concerns. Music can also produce Content ID claims. | **Per-track review required.** Keep the track page, creator, download certificate or screenshot, and original filename. Embed audio in the game; do not distribute a music-only pack. Prefer tracks with no Content ID registration. |
| [Freesound](https://freesound.org/help/faq/)                         | Each sound is CC0, CC BY, or CC BY-NC. CC BY requires attribution; CC BY-NC cannot be used commercially. Freesound also warns that user uploads can occasionally contain material an uploader did not own.                                   | **Use CC0 first, CC BY second; prohibit CC BY-NC.** Record the sound ID, uploader, exact license version, upload date, and any edits. Avoid recognizable music, speech, trademarks, or suspicious samples.                           |
| [Google Fonts](https://developers.google.com/fonts)                  | Google Fonts states that its families use open-source licenses and may be used commercially or noncommercially. The exact license is attached to each font family.                                                                           | **Per-family review required.** Prefer SIL Open Font License families. Bundle the font's license file and do not use a font name as project branding if its reserved-name terms prohibit that.                                       |
| [Game-icons.net](https://game-icons.net/faq.html)                    | Most icons are CC BY and require author credit; some are public domain. The site recommends an accessible in-game credits menu for video games.                                                                                              | **Safe with attribution discipline.** Record the individual icon and author, not merely “Game-icons.net.” Preserve the SVG license metadata and note recolors or edits.                                                              |

## Recommended first intake

These candidates have direct official pages that currently identify them as CC0. They fit the game without relying on commercial-player likenesses, football-club branding, or copied media.

| Priority | Candidate                                                                                  | Author/source | Current license and fit                                                                                                                                           | Intake caveats                                                                                                                                                                                                                                   |
| -------- | ------------------------------------------------------------------------------------------ | ------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| 1        | [Universal Base Characters](https://quaternius.com/packs/universalbasecharacters.html)     | Quaternius    | CC0; six optimized humanoid bases, humanoid rigs, hairstyles, and glTF/FBX formats. Strong replacement foundation for the procedural player and humanoid enemies. | The page distinguishes a free 60–70% download from paid/source tiers. Import only files actually included in the free download, record its version, and create original football/vampire clothing rather than implying a real player's likeness. |
| 2        | [Universal Animation Library](https://quaternius.com/packs/universalanimationlibrary.html) | Quaternius    | CC0; 120+ humanoid locomotion, combat, emote, and death animations, with GLB available. Useful for running, damage, defeat, celebration, and enemy movement.      | Test retargeting and root motion before adopting broadly. Import only selected clips and compress/rename them; do not ship an unnecessary full library.                                                                                          |
| 3        | [Grass 007](https://ambientcg.com/view?id=Grass007)                                        | ambientCG     | CC0; tileable lawn/moss PBR maps suitable as a source for richer pitch surfaces and color variants.                                                               | Start with 1K JPG maps and benchmark. Bake or omit displacement for WebGL; compress normal/roughness maps and prevent texture repetition with shader variation.                                                                                  |
| 4        | [UI Audio](https://kenney.nl/assets/ui-audio)                                              | Kenney        | CC0; 50 button, switch, and click sounds suitable for menu navigation, upgrades, purchases, and settings feedback.                                                | Curate a small coherent subset, normalize loudness, convert to the runtime format, and still credit Kenney voluntarily.                                                                                                                          |
| 5        | [Particle Pack](https://www.kenney.nl/assets/particle-pack)                                | Kenney        | CC0; 80 particle/VFX textures suitable for goals, critical hits, blood-safe stylized impacts, pickups, weather, and stadium celebrations.                         | Recolor and atlas only selected sprites. Avoid uncontrolled overdraw and verify that intense flashes obey the game's accessibility settings.                                                                                                     |

Poly Haven is also a safe source for later stadium concrete, brick, metal, and HDRI work, but its high-resolution originals need deliberate optimization before browser shipping. A specific Poly Haven asset should be selected only after the stadium art direction and texture budget are frozen.

## Intake gate

Before downloading or committing any third-party asset:

1. Open the exact asset page and confirm the creator, title, license, and permitted commercial use.
2. Check for trademarks, real-player likenesses, recognizable voices, copyrighted melodies, and other third-party material that the platform license may not cover.
3. Save the original download unchanged in a source-of-record location and retain its included license/readme.
4. Record the direct URL, creator, license/version, download date, original filename, file hash, and planned use in `ASSET_CREDITS.md`.
5. Record every conversion: edits, retargeting, decimation, texture resizing, compression, recoloring, cropping, and format changes.
6. Import only runtime files that the game actually uses. Do not expose marketplace source packages or standalone reusable assets in public release archives.
7. Add required credit to the in-game credits screen, repository ledger, itch.io page, and release notices before publishing.
8. Re-run visual, performance, and build checks on Web and macOS. Windows remains a final-stage target.

## Manifest record template

Copy this structure into the authoritative ledger or a future machine-readable manifest for each imported item:

```yaml
id: unique-project-id
title: Exact asset title
creator: Exact creator or uploader name
source_url: https://direct-asset-page.example
downloaded_at: YYYY-MM-DD
source_version: Exact pack or asset version, if shown
original_filename: original-file.zip
source_sha256: full-lowercase-sha256
license_id: CC0-1.0
license_url: https://creativecommons.org/publicdomain/zero/1.0/
required_attribution: null
commercial_use_confirmed: true
modification_allowed: true
redistribution_notes: Runtime derivative only; do not ship source pack
third_party_rights_review: No visible trademarks, copied characters, or recognizable people
project_files:
  - public/assets/example.glb
modifications:
  - Converted from FBX to GLB
  - Removed unused clips
  - Resized textures to 1024px
reviewed_by: Team member name
reviewed_at: YYYY-MM-DD
```

This is an engineering intake policy, not legal advice. If an asset's provenance or license is ambiguous, do not use it.

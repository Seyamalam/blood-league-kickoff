# Key Art Generation Record

## Source

- Date: 2026-07-14
- Generator: OpenAI built-in image generation
- Mode: built-in image generation; the exact hosted model identifier was not exposed by the tool
- Source output: `docs/art/source/blood-league-key-art-master.png`
- Source dimensions: 1536×1024
- Source SHA-256: `289021caba47213d798e44fd5ec70dc9ccc9e70078e16f7a5f2176186b716580`

## Prompt

> Use case: stylized-concept
>
> Asset type: landscape key art master for the Blood League: Kickoff game title screen, README hero, and itch.io cover crop
>
> Primary request: Create original cinematic key art for a low-poly gothic football survivor game under a blood moon. A pale undead striker with one unmistakably oversized crimson kicking boot has just kicked a bright faceted bone-white football through a rushing vampire horde toward an armored crowned goalkeeper at the far goal. The kick is the spark that starts the supernatural match.
>
> Scene/backdrop: cursed football stadium at night, readable dark green pitch and white field markings converging toward a gothic goal, crowd silhouettes and restrained crimson banners, huge blood moon behind the goal, cool moonlit fog and sparse embers
>
> Subject: striker in the lower-left foreground, glowing ball and clean trajectory crossing the lower-center, distinct vampire silhouettes flanking the corridor (winged runner, shield defender, bat swarm, square goalkeeper brute), Count Goalkeeper centered at the distant goal with crown and wide armored shoulders
>
> Style/medium: polished low-poly 3D illustration, chunky readable silhouettes, visibly faceted matte materials, graphic game key art, dramatic but not photorealistic
>
> Composition/framing: wide 3:2 landscape; strong depth; keep the center and upper-middle relatively uncluttered for the existing HTML title and buttons; keep all essential subjects inside a centered 4:3 crop and a centered square crop; no subject cut off
>
> Lighting/mood: cool `#AABFFF` moon key, deep `#080811` night, restrained `#D62D58` and `#FF315D` energy accents, `#F4F1E9` player and ball anchor, gold `#FFCF40` only on the elite goalkeeper/crown; thrilling kickoff moment, ominous but energetic
>
> Color palette: `#080811`, `#111119`, `#17101F`, `#821733`, `#A7193B`, `#D62D58`, `#FF315D`, `#F4F1E9`, `#E8E2CC`, `#AABFFF`, `#18261F`, `#26372E`, `#FFCF40`
>
> Materials/textures: broad faceted value blocks, matte low-poly geometry, subtle metal only on crown/goal armor, no micro-textures
>
> Constraints: no typography, no title, no logo, no letters, no watermark, no detailed gore, no photorealism, no depth-of-field blur, no motion blur, no real-world club branding; preserve a readable bright ball and kick trajectory; characters must remain distinguishable by shape rather than color alone
>
> Avoid: generic soccer poster look, realistic human anatomy, clutter over the center title-safe area, tiny indistinct enemies, blue daytime sky, excessive bloom, lens flare

## Human Processing

The generated composition was accepted without semantic edits or paint-over.

- Runtime menu derivative: FFmpeg JPEG export at 1536×1024, quality setting `-q:v 3`; SHA-256 `e4413e9d22f0dd7840ad326793b1df07aa3fb765e09f32b41816e753d6b0dfb0`.
- Itch/README derivative: centered crop from 1536×1024 to 1290×1024 (`x=123`, `y=0`), Lanczos resize to 630×500, FFmpeg JPEG export at `-q:v 2`; SHA-256 `5dc7d0e0f3418d0da2c2a149403e10a876cbef7e9d382be4ba1dd1c2b0ce1547`.

The source output remains the record of origin. The runtime and marketing derivatives must not be described as hand-painted or as third-party licensed art.

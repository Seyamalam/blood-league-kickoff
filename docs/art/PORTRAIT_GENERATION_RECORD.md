# Blood League Portrait Generation Record

This record covers the original portrait atlases created for the Career Codex. All four were generated with OpenAI built-in image generation in text-to-image mode on 2026-07-15. The images are presentation art only; no AI service runs in the game.

## Shared direction

- Original low-poly gothic football-horror illustration with a dark stadium background, crimson/violet/gold accents, readable head-and-shoulders silhouettes, and consistent dramatic rim lighting.
- No real football-player likeness, commercial club kit, crest, sponsor, logo, protected character, or legible text.
- Each subject must remain recognizable at a small circular-card crop.

## Atlas briefs

### Six playable heroes

Create a clean 3×2 character portrait sheet for six original football-horror heroes: The Maestro, The Breakaway, The Tower, The Finisher, The Engine, and The Guardian. Give each a unique face, hair, body proportion, original kit palette, boots/equipment cues, and silhouette while keeping one coherent Blood League art direction.

Source: `docs/art/source/character-portrait-atlas-master.png` (1536×1024, SHA-256 `23b38a2035457d3e3f95297252fdeae9ab017b2335407a64d65bfca9750531ab`).

### Eleven ordinary enemies

Create a clean 4×3 portrait sheet for Blood Fan, Night Winger, Crypt Defender, Blood Coach, Bat Swarm, Leech Striker, Corrupt Referee, Blood Archer, Shadow Runner, Corpse Bomber, and Goalkeeper Brute, leaving the final cell empty. Make every role identifiable without relying only on color through head shape, posture, equipment, and supernatural anatomy.

Source: `docs/art/source/enemy-portrait-atlas-master.png` (1448×1086, SHA-256 `f9b7695fd4639a7f0d17edd5c856302ac6994b3b5e29df4a908df92b867300fa`).

### Four rival captains

Create a clean 2×2 portrait sheet for the original rival clubs Nightwing Athletic, Iron Coven FC, Velvet Fangs, and Graveyard United. Portray an original captain for each club with distinct supernatural football identity and no real club trade dress.

Source: `docs/art/source/rival-portrait-atlas-master.png` (1254×1254, SHA-256 `94d3069ab720a7225c8e08602585ea78ad0762f5b2913f639dbff29c418617ee`).

### Named bosses and goalkeepers

Create a clean 2×2 portrait sheet for The Crimson Captain, The Graveyard Playmaker, the special Goal-Line Blocker, and Count Goalkeeper. Increase visual rank across the sheet through armor, gloves, crowns, masks, and supernatural effects while keeping the same original football-horror universe.

Source: `docs/art/source/boss-portrait-atlas-master.png` (1254×1254, SHA-256 `721a5f0e01813aab97e574974c91cfed8e54f6f8c9ee6c25974753678d560d6a`).

## Human processing

The source outputs are preserved unchanged. FFmpeg crop filters split the four fixed grids into 25 runtime PNG portraits under `src/assets/portraits/`; there was no paint-over, semantic edit, compositing, typography, or external source material.

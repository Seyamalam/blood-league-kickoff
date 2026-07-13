# Visual Direction

## North Star

Blood League: Kickoff is **low-poly gothic football under a blood moon**. The pitch must remain readable like a sports game while the silhouettes, lighting, and effects sell a fast vampire-survivor power fantasy. Geometry is chunky and deliberate, materials are mostly matte, and saturated color is reserved for gameplay information.

This document locks the shipping visual language. New art should extend these rules rather than introduce a second style.

## Canonical Palette

Use these exact sRGB hex values as source tokens. Close variants already in the game may remain, but new work should start from this table.

| Token        | Hex       | Current role                             |
| ------------ | --------- | ---------------------------------------- |
| `night-950`  | `#080811` | Scene background, opening fog            |
| `night-900`  | `#111119` | Concrete and deep structure              |
| `plum-900`   | `#17101F` | Bat bodies, near-black costumes          |
| `plum-800`   | `#32132F` | Blood Fan cloak                          |
| `violet-800` | `#35184D` | Defender body                            |
| `violet-600` | `#74426E` | Defender shield                          |
| `blood-800`  | `#821733` | Stadium banners                          |
| `blood-700`  | `#A7193B` | Player boot, strong crimson surface      |
| `blood-600`  | `#D62D58` | Blood shards and primary UI accent       |
| `blood-500`  | `#FF315D` | Hits, ball energy, boss eyes, urgent VFX |
| `blood-400`  | `#FF174F` | Vampire eyes and Blood Moon light        |
| `bone-100`   | `#F4F1E9` | Primary UI text                          |
| `bone-200`   | `#E8E2CC` | Ball surface                             |
| `bone-300`   | `#D9D5C8` | Player body                              |
| `pale-400`   | `#B9A6AE` | Vampire skin                             |
| `gold-500`   | `#FFCF40` | Elite markers, drain danger, objectives  |
| `gold-400`   | `#FFD66B` | Goals, rewards, celebratory bursts       |
| `moon-300`   | `#AABFFF` | Directional moonlight                    |
| `moon-500`   | `#7084C7` | Hemisphere sky light                     |
| `frost-300`  | `#A7DFFF` | Secondary weapon trail                   |
| `heal-400`   | `#7FE0A2` | Recovery and beneficial zones            |
| `pitch-900`  | `#18261F` | Main turf                                |
| `pitch-700`  | `#26372E` | Turf stripe                              |
| `pitch-line` | `#8CA697` | Pitch markings                           |

### Semantic Color Rules

- Crimson means player power, vampiric threat, damage, or urgency. It is not neutral decoration.
- Gold means elite status, goal opportunity, reward, or a high-priority telegraph.
- Frost blue means secondary magic or a non-vampiric projectile.
- Green means recovery or safety only.
- Bone white is the player, ball, and primary text anchor. Keep those subjects brighter than nearby enemies.
- Do not communicate state through hue alone. Pair it with silhouette, animation, iconography, scale, or a ring/pulse.

## Shape Language and Silhouettes

All characters should read at gameplay camera distance before surface detail is visible. Prefer five or fewer primary masses per ordinary enemy and strong asymmetry only when it communicates behavior.

| Subject          | Locked silhouette                                          | Gameplay read                                                             |
| ---------------- | ---------------------------------------------------------- | ------------------------------------------------------------------------- |
| Player           | Upright pale capsule plus oversized crimson boot           | Mobile striker; boot establishes facing and kick intent                   |
| Ball             | Bright faceted icosahedron                                 | Smallest critical target; never visually merged with bone-colored scenery |
| Blood Fan        | Narrow seven-sided cone and pale head                      | Basic pursuer; simple vertical arrow shape                                |
| Winger           | Slim capsule with two wide triangular wings                | Fast lateral attacker; width reads speed class                            |
| Defender         | Broad rectangular torso and forward shield slab            | Heavy blocker; shield must break the front contour                        |
| Coach            | Tapered cylinder with a wide ground aura                   | Support unit; aura shows influence radius independently of body color     |
| Bat Swarm        | Low compact body, triangular wings, pointed ears           | Small aerial rush; wingbeat and height distinguish it from ground units   |
| Leech Striker    | Forward-leaning capsule, circular mouth, ground drain ring | Close-range drain threat; circular mouth faces the player                 |
| Elite            | Base silhouette at `1.18x` scale plus gold overhead ring   | Stronger variant; never rely on a recolor alone                           |
| Count Goalkeeper | Tall capsule, wide armored shoulders, five-point crown     | Boss; crown and shoulder bar remain visible in every phase                |

New enemy concepts must pass a black-fill silhouette test at 96 px tall. If two archetypes look alike in black fill, revise their proportions before adding materials.

## Geometry and Materials

- Use visibly faceted primitives and low-poly authored meshes. Avoid smooth, realistic anatomy.
- Ordinary enemies: no more than 1,500 visible triangles and five rendered mesh parts at highest gameplay LOD.
- Bosses: no more than 8,000 visible triangles and eight rendered mesh parts.
- Props: 50–2,000 triangles according to screen size; stadium dressing should reuse a small modular kit.
- Reuse geometries and materials across instances. Never create a unique material per enemy instance.
- Default characters to `MeshStandardMaterial`, roughness `0.5–0.85`, metalness `0–0.2`.
- Reserve metalness up to `0.75` for armor, shields, goal hardware, and the Count's crown/shoulders.
- Reserve emissive or unlit materials for eyes, critical telegraphs, pickups, and short VFX. Large emissive body surfaces dilute the hierarchy.
- Use flat base colors with no photorealistic dirt. If textures are introduced, use one compact shared atlas and broad painted value blocks; no micro-detail or text.
- Keep transparent surfaces sparse, `depthWrite: false`, and visually soft. Avoid layered alpha planes.

## Lighting and Atmosphere

The base rig is locked to a cool moon key, dim hemisphere fill, and one crimson stadium accent:

- Background and opening fog: `night-950`; exponential fog density `0.018`.
- Moon: `moon-300`, intensity `3.2`, from high camera-left; one `2048x2048` soft shadow map.
- Hemisphere: `moon-500` over deep burgundy `#1D0811`, intensity `1.15`.
- Blood light: `#C51F4D`, intensity `22`, range `36`, behind the opponent side.
- Renderer: sRGB output, ACES filmic tone mapping, exposure `1.05`, pixel ratio capped at `1.6`.

Match phases may shift background, fog, and the single atmosphere accent, but must preserve the bone player/ball anchor. Blood Moon and final wave can reach `blood-400`; victory shifts to `#FFDC78`; defeat falls toward `#040407` with a muted `#68112C` accent.

Constraints:

- Add no permanent real-time light without profiling it in a 72-enemy stress run.
- Only the moon casts a scene-wide shadow. New point lights do not cast shadows.
- Fog may increase tension but must not hide the ball, nearest threat, goal beacon, or boss telegraph.
- Avoid full-screen bloom, chromatic aberration, motion blur, or camera effects that smear the ball trajectory.

## VFX Grammar

- Hit: `blood-500`, radial and brief; current budget is 14 points per burst in a pool of four.
- Goal/reward: `gold-400`, expanding/upward motion.
- Elite/objective: `gold-500`, stable ring plus a measured pulse.
- Secondary weapon: `frost-300`, thin trail or halo.
- Recovery: `heal-400`, slow outward motion; never reuse the damage burst shape.
- Ball trail: maximum 16 points. It must indicate direction without obscuring the ball.
- Atmosphere: maximum 56 shared ember points; use opacity and phase color rather than spawning new systems.
- Telegraphs must begin with a shape/scale change at least 180 ms before impact. Flash alone is insufficient.
- Additive effects should occupy less than 15% of the screen during normal combat and clear within 600 ms unless they mark a persistent zone.
- Screen shake, if added, must be optional, capped at 6 px equivalent translation, and never applied continuously.

## UI and Accessibility

- Primary text is `bone-100` on `night-950`; muted text uses the existing gray family only when it remains legible.
- Normal text must meet WCAG contrast `4.5:1`; large text and essential non-text indicators must meet `3:1`.
- Use crimson for focus/selection only with a border, underline, scale, or icon. Keyboard focus keeps the gold outline (`#F8D777`).
- Minimum body copy is 16 CSS px at 1280×720; critical HUD numbers are at least 20 CSS px.
- Critical warnings persist long enough to be read and must not depend on rapid flashing. No element may flash more than three times per second.
- Keep the center reticle-to-ball corridor and the lower forward pitch clear of decorative UI.
- Color-blind-safe redundancy is mandatory: elite = ring and scale; shielded = visible slab; drain = mouth and ground ring; boss phase = pose/animation and intensity.
- Provide settings for screen shake and high-contrast telegraphs before adding strong camera or post-processing effects.

## Performance Budgets

The primary target is a stable macOS build with a 120 Hz presentation path; 60 fps is the minimum supported floor. Measure during a full 72-enemy final-wave stress scene at 1600×900.

| Metric                          | 120 Hz target |                      Hard ceiling |
| ------------------------------- | ------------: | --------------------------------: |
| Total frame time                |    `≤ 8.0 ms` |                         `16.6 ms` |
| GPU render time                 |    `≤ 6.5 ms` |                           `13 ms` |
| Draw calls                      |       `≤ 300` |                             `400` |
| Visible triangles               |   `≤ 250,000` |                         `350,000` |
| Texture memory added by art     |     `≤ 64 MB` |                           `96 MB` |
| Individual texture edge         |   `≤ 1024 px` | `2048 px` for a shared atlas only |
| Simultaneous particle points    |       `≤ 128` |                             `256` |
| Permanent shadow-casting lights |           `1` |                               `1` |

New assets must not allocate geometry, materials, textures, or lights every frame. Pool transient effects, share immutable resources, dispose replaced GPU resources, and prefer instancing when repeated mesh parts push the draw-call target.

## Asset-Generation Guidance

Generated raster art is for concept exploration, title art, UI illustrations, or texture references. It is not a drop-in replacement for optimized gameplay geometry. Gameplay models should be rebuilt as clean low-poly meshes with validated scale, pivot, materials, silhouette, and triangle count.

Every generation request should include:

- “low-poly gothic football horror,” “chunky readable silhouette,” and “faceted matte materials”;
- the exact palette tokens needed for the subject;
- a plain `night-950` or transparent background;
- neutral orthographic or three-quarter view with the entire subject visible;
- no typography, logos, watermark, photorealism, gore detail, depth of field, motion blur, or busy scenery;
- one subject and one clear action/read per image.

### Character Concept Prompt Template

> Full-body concept of **[subject]** for a low-poly gothic football survivor game, chunky readable silhouette, faceted matte materials, **[locked silhouette description]**, colors limited to **[exact hex tokens]**, neutral three-quarter gameplay view plus small front and side silhouette callouts, plain `#080811` background, studio readability lighting, no text, no logo, no watermark, no photorealism, no detailed gore, no motion blur, no depth of field.

### VFX Concept Prompt Template

> Sprite-sheet concept for **[gameplay event]**, low-poly gothic energy shapes, color limited to **[semantic token]**, eight clearly separated frames on transparent background, strong shape progression from anticipation to impact to decay, readable at 64 px, no environment, no characters, no text, no bloom haze outside the frame, no watermark.

### UI Illustration Prompt Template

> Minimal gothic football icon for **[ability/state]**, bold geometric silhouette, bone-white `#F4F1E9` and **[one semantic accent]** on transparent background, centered, even padding, readable at 32 px, flat vector-like facets, no text, no gradients, no drop shadow, no watermark.

Before production, review concepts in grayscale, at intended HUD/gameplay size, and beside the existing player, ball, and all enemy silhouettes. Reject any asset that requires color or fine detail to explain its gameplay role.

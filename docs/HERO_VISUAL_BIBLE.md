# Blood League Hero Visual Bible

## Original identity

**Working name:** Rook Vesper

**Callsign:** The Night Striker

**Role:** Last human captain of Huntrix
**Design rule:** Entirely original. Do not reference a real player, existing club, commercial kit, recognizable sponsor, trademarked crest, or protected celebration.

Rook is a lean, athletic supernatural-football survivor rather than a conventional armored hero. The silhouette must read from the game camera at 8–18 metres: swept hair, one raised shoulder guard, a split coat-tail sash, luminous left forearm wraps, and high asymmetric boots. His equipment looks rebuilt from a destroyed stadium—stitched performance fabric, cracked carbon guards, silver goal-net cords, and restrained blood-rune light.

## Turnaround sheet specification

Create one neutral A-pose character at identical scale in four orthographic views:

1. **Front:** feet shoulder-width apart, hands relaxed, face level, all kit seams and equipment readable.
2. **Left profile:** straight lens, no perspective distortion, arms slightly separated from torso.
3. **Back:** spine seam, number glyph, sash attachment, heel construction, and shoulder silhouette visible.
4. **Three-quarter:** presentation view only; the first three views remain the modeling authority.

Use a flat neutral charcoal background, even studio lighting, no cast shadow crossing the silhouette, no ball obscuring the legs, no text over the body, and no dramatic pose.

## Face and hair direction

- Original angular face with a strong brow, narrow nose bridge, slightly tired eyes, and a small healed diagonal cut through the right eyebrow.
- Warm medium-brown skin; believable pores and subtle match wear without celebrity resemblance.
- Dark near-black hair swept backward into five large readable clumps, undercut at the sides.
- No beard; faint jaw stubble is acceptable.
- Eyes remain human until ultimate activation, when the irises shift to desaturated crimson.
- Expression is focused and defiant, never snarling by default.

## Kit design

- Short-sleeved fitted jersey with a high broken collar.
- Asymmetric right shoulder guard made from cracked matte carbon.
- Left forearm wrapped in pale goal-net cord with thin emissive blood runes.
- Tapered shorts over compression leggings; no real-world stripe placement.
- Split sash fixed behind the left hip, kept short enough for stable skinning.
- High football boots with a silver toe cage, crimson heel, and six oversized stylized studs.
- Original Huntrix crest: a simple crescent fang surrounding a kickoff dot. It must not resemble a real club crest.
- Back glyph uses the fictional rune `XI`, not a real player's number/name treatment.

## Master palette

| Token         | Hex       | Use                                                        |
| ------------- | --------- | ---------------------------------------------------------- |
| Night cloth   | `#11131A` | Jersey, leggings, gloves                                   |
| Dried crimson | `#8E1738` | Main kit panels, heel, sash underside                      |
| Fresh blood   | `#E8335A` | Small emissive gameplay accents                            |
| Moon silver   | `#C7CED8` | Guards, boot cage, crest                                   |
| Bone cloth    | `#E2D8C5` | Wraps and readable trim                                    |
| Deep violet   | `#3B285F` | Secondary supernatural material                            |
| Skin base     | `#9A6247` | Authoring reference; texture must retain natural variation |

Emissive coverage must stay below 8% of the visible surface so the body silhouette remains readable under Blood Moon lighting.

## Runtime mesh and material contract

The production character uses one shared humanoid skeleton and the following replaceable mesh partitions:

- `Body_Base`
- `Head_Base`
- `Hair_Main`
- `Kit_Jersey`
- `Kit_Shorts`
- `Kit_Leggings`
- `Boots_L`
- `Boots_R`
- `Accessory_Shoulder_R`
- `Accessory_Forearm_L`
- `Accessory_Sash`
- `Eyes`

Target no more than four simultaneously visible materials: skin, kit, equipment, and eyes/emissive. Prefer one 2048² atlas for the hero and 1024² atlases for variants. Use metallic-roughness PBR; no baked scene lighting.

## Modeling and web budgets

| Budget                       |       Hero LOD0 | Hero LOD1 | Crowd/preview LOD2 |
| ---------------------------- | --------------: | --------: | -----------------: |
| Triangles                    |        ≤ 38,000 |  ≤ 18,000 |            ≤ 6,000 |
| Materials                    |             ≤ 4 |       ≤ 3 |                ≤ 2 |
| Bones influencing one vertex |             ≤ 4 |       ≤ 4 |                ≤ 4 |
| Texture memory               | ≤ 32 MB decoded |   ≤ 16 MB |             ≤ 8 MB |
| GLB transfer size            |          ≤ 8 MB |    ≤ 4 MB |             ≤ 2 MB |

Model in metres, Y-up, forward along negative Z, origin centered between the feet, soles at Y=0, unapplied object scale prohibited, and no negative scale in the exported hierarchy.

## Shared rig contract

- Required deformation chain: root, pelvis, three-spine chain, neck, head, clavicles, upper/lower arms, hands, upper/lower legs, feet, and toes.
- Optional twist bones: upper/lower arms and thighs.
- Required sockets: `socket_head`, `socket_back`, `socket_hand_l`, `socket_hand_r`, `socket_hip_l`, `socket_hip_r`, and `socket_boot_fx`.
- Root motion is authored but stripped or disabled for normal gameplay locomotion; simulation remains authoritative.
- Facial minimum: jaw plus left/right eyelid or four blend shapes (`blink_l`, `blink_r`, `hurt`, `victory`).
- Accessories must either be skinned to the shared rig or parented to documented sockets. Separate variant skeletons are forbidden.

## Animation authoring list

Required semantic clips:

- idle, dribble, sprint
- strafe left/right
- ground pass and lob pass
- charged shot and quick shot
- header
- slide tackle
- bicycle kick
- light and heavy damage
- knockdown and get-up
- ultimate activation
- goal celebration
- victory and defeat

Every clip must state whether it is looping, its expected duration, contact frame, recover frame, and whether root motion is retained. Missing authored clips may use documented temporary aliases, but aliases must never be presented as final authored animation.

## Six shared-rig variants

| Character | Body and silhouette            | Head/hair               | Kit and equipment                                     |
| --------- | ------------------------------ | ----------------------- | ----------------------------------------------------- |
| Maestro   | Lean, relaxed shoulders        | Swept layered hair      | Bone/violet kit, long left wrist wrap, slim boots     |
| Breakaway | Compact sprinter, forward lean | Short aerodynamic crest | Silver/blue panels, calf fins, light boots            |
| Tower     | Broad chest and heavier limbs  | Close crop              | Black/gold reinforced shoulder plates and power boots |
| Finisher  | Balanced striker proportions   | Sharp side part         | Crimson/bone target glyph and silver toe cage         |
| Engine    | Wiry endurance build           | Tied-back top knot      | Green/silver utility belt and shard canisters         |
| Guardian  | Tall defensive frame           | Hood or tight braids    | Slate armor panels, forearm shield, reinforced heel   |

Body proportion differences must be mesh-level or safe non-uniform child-mesh scaling. Never scale individual skeleton bones differently per character because all animation clips share one skeleton.

## Provenance gate

Before replacing the current CC0 fallback, record:

- generator/service or human author;
- source task URL or project file;
- final prompt and reference images;
- commercial-use and redistribution terms captured on the creation date;
- confirmation that no celebrity, real player, club kit, or protected character was requested;
- cleanup/retopology/rigging author and tools;
- source and optimized hashes;
- glTF validation report;
- in-game screenshots at gameplay distance;
- fallback behavior when the GLB cannot load.

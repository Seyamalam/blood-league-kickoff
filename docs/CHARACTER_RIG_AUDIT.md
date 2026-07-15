# Character Rig and Animation Audit

Audit date: 2026-07-14
Gate: `npm run assets:character:validate`

## Result

The current Quaternius character and animation library **pass the runtime shipping gate** and use an identical 65-joint skeleton. They are safe as a licensed visual baseline and fallback-compatible rig. They are not yet the final original six-character art set.

| Measurement            |         Current character |        Shipping gate |       Production target | Result                   |
| ---------------------- | ------------------------: | -------------------: | ----------------------: | ------------------------ |
| GLB transfer           |           6,465,208 bytes |      6,800,000 bytes |         2,500,000 bytes | Pass gate; optimize next |
| Triangles              |                    14,318 |               15,000 |                  15,000 | Pass                     |
| Materials              |                         3 |                    4 |      shared named slots | Pass                     |
| Embedded textures      |                         7 |                    8 |            KTX2 atlases | Pass gate; optimize next |
| Largest texture        |                 1024×1024 |            1024×1024 |               1024×1024 | Pass                     |
| Estimated texture VRAM |          28,661,082 bytes |     32,000,000 bytes |        12,000,000 bytes | Pass gate; optimize next |
| Height                 |                  1.8196 m |                1.9 m |     character-dependent | Pass                     |
| Skin                   |     `Armature`, 65 joints | exact manifest match |  shared by all variants | Pass                     |
| Animation library      | 2,714,756 bytes, 43 clips |      3,000,000 bytes | selected football clips | Pass gate                |

Character SHA-256: `a466828c67a4acc9b2413212ce6d9cde235e3aed9b675680c14fd9673858f118`
Animation SHA-256: `4c748767741a3e495d89667b9a218b690ba9810b9517a12e960780e3ca72c4e9`

## Skeleton contract

The canonical joint list and order live in `src/render/assets/character-asset-manifest.json`. The character mesh and animation library must both match it exactly. Important sockets are:

- Head equipment: `Head`
- Hand equipment: `hand_l`, `hand_r`
- Boots and foot effects: `foot_l`, `foot_r`
- Scene/skin root: `Armature`

The GLB root transform is identity. Mesh bounds put the feet at `Y=-0.0095`, inside the 2 cm tolerance. The source faces `+Z`; runtime applies a π-radian yaw to align it with gameplay `-Z`. Simulation—not animation—owns world translation, collision, and root motion.

All six variants must preserve this skeleton, joint order, bind pose, identity root, and animation library. Heads, hair, body meshes, boots, kits, and separate socketed accessories may vary. The manifest defines distinct profiles for Maestro, Breakaway, Tower, Finisher, Engine, and Guardian without using real-player likenesses.

## Animation coverage

The library provides 43 technically compatible clips. Current runtime requirements—idle, jog, sprint, roll, and cross-punch—are present. Six of 17 production slots are immediately usable:

- Usable: idle, jog, sprint, damage, celebration, defeat
- Placeholder motion: shoot, slide tackle, bicycle kick, knockdown, victory
- Missing authored motion: dribble, left/right strafe, ground pass, lob pass, heading

The placeholders are honest compatibility mappings, not claims that a roll is a finished bicycle kick or that a punch is a football shot. The final animation pass should export dedicated in-place clips on the same skeleton.

## Visual-production gate

For every new hero or variant GLB:

1. Preserve source `.blend` or reproducible generation records outside the runtime bundle.
2. Record creator/tool, prompts if generated, date, license, likeness review, modifications, and source hash.
3. Apply transforms, use meter units, keep the feet on `Y=0`, and export one identity-rooted glTF 2.0 GLB without cameras or lights.
4. Use the exact 65-joint names/order and bind pose. Keep accessories as separate socketed meshes.
5. Inspect and validate before optimization:

   ```sh
   npm run assets:gltf:inspect -- input.glb
   npm run assets:gltf:validate -- input.glb
   ```

6. Work on a copy, then apply deliberate cleanup. Never overwrite the source export:

   ```sh
   npm run assets:gltf:optimize -- input.glb --meshopt --ktx2
   ```

7. Review the candidate under `artifacts/asset-candidates/`, deliberately replace the manifest asset, and run:

   ```sh
   npm run assets:character:validate
   npm test -- src/render/assets/characterAssetManifest.test.ts
   ```

8. Visually verify skin deformation, foot sliding, hand/boot sockets, shadowing, animation transitions, material colorways, first-person visibility, and context recovery in the production build.

## Next rigging work

1. Create the original hero turnaround and neutral A/T-pose with proportions suitable for the existing bind pose.
2. Model one base body and modular head, hair, kit, boots, and accessories for the six variants.
3. Skin the base mesh to the canonical 65-joint armature and test extreme kick, crouch, shoulder, and bicycle poses.
4. Reduce texture memory first. KTX2 is the highest-impact current optimization; six duplicated PNG sets would be unacceptable.
5. Author dedicated football clips in dependency order: dribble and strafes, passes and shoot, heading and slide, bicycle kick, knockdown, victory.
6. Add one distant LOD near 45% of LOD0 triangles only after the hero silhouette is approved.

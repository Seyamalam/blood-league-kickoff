# Character 3D Asset Pipeline

## Current shipping character

The shipping player is an original articulated voxel athlete authored entirely in TypeScript and Three.js. `VoxelHumanoid.ts` builds the shared joint hierarchy, block anatomy, face, kit, boots, and attachment sockets from cached box geometry. `VoxelPlayerVariants.ts` adds six animation-safe identity silhouettes, while `VoxelAnimationController.ts` supplies deterministic locomotion, football techniques, reactions, outcomes, and enemy-compatible actions.

The runtime character is project-created, is not presented as a real footballer or club identity, and does not copy Minecraft textures, proportions, characters, or branding. It uses an original block-football palette and equipment vocabulary specific to Blood League.

Character creation is synchronous and requires no network/model load, animation retargeting, skinning, or DCC application. Simulation remains authoritative for position, facing, collision, damage, and ball contact. The render rig only owns local joint presentation.

## Current voxel workflow

1. Adjust shared anatomy and sockets in `VoxelHumanoid.ts`.
2. Keep pivot groups at anatomical attachment points; meshes remain children offset from those pivots.
3. Add character-specific block equipment in `VoxelPlayerVariants.ts` and mount moving pieces to rig joints.
4. Add or tune semantic poses in `VoxelAnimationController.ts` without translating the world-space root.
5. Preserve `FootballAnimationContract.ts` contact/recovery metadata so presentation never delays gameplay.
6. Run the focused rig, animation, variant, player, enemy, and RenderBridge tests.
7. Run a production WebGL playtest and inspect the Career Codex preview before publishing.

## Optional audited GLB route

The previously integrated Quaternius files remain checked in with a reproducible Node-based shipping gate, but the player, Career preview, and ordinary enemies do not load them. Run `npm run assets:character:validate` when changing those reference assets or evaluating a future GLB replacement. The gate combines the Khronos glTF Validator with the repository's skeleton, animation, and resource-budget contract.

The pinned browser-asset commands are:

```sh
# Validate or inspect both canonical character assets.
npm run assets:gltf:validate
npm run assets:gltf:inspect

# Validate or inspect any downloaded GLB before it enters public/assets.
npm run assets:gltf:validate -- path/to/download.glb
npm run assets:gltf:inspect -- path/to/download.glb

# Create an uncompressed conservative candidate under artifacts/asset-candidates/.
npm run assets:gltf:optimize -- path/to/input.glb

# Explicit compression experiments; runtime decoder support must be added before shipping these.
npm run assets:gltf:optimize -- path/to/input.glb --meshopt
npm run assets:gltf:optimize -- path/to/input.glb --meshopt --ktx2
```

Optimization never writes to a canonical runtime path. It disables topology- and hierarchy-changing defaults for rig safety, writes a disposable candidate, and validates that result against the glTF specification. Promotion into `public/assets` remains a deliberate reviewed step followed by the character shipping gate and visual playtest.

The production route is:

1. Create an original neutral character in Blender with meter units, local `-Z` gameplay-forward, feet on `Y=0`, and origin centered between the boots.
2. Use the exact 65-joint armature, joint order, bind pose, and lowercase source names recorded in `src/render/assets/character-asset-manifest.json`; do not substitute a generic humanoid naming convention.
3. Author the fifteen semantic football states recorded in `FootballAnimationContract.ts`. Root motion stays disabled because simulation owns world position.
4. Use an original kit, face, hair, and proportions. Do not reproduce a real player, national team, or club identity.
5. Export glTF 2.0 as one `.glb`, with applied transforms, skinning, animations, tangents only when required, and no cameras or lights.
6. Run glTF validation and glTF Transform `inspect`, then use deliberate `prune`, `dedup`, texture compression, and Meshopt optimization on a copy. Do not add Draco and Meshopt simultaneously.
7. Keep the highest LOD below 18,000 triangles, four materials, a 1024px shared color atlas, 2.5 MB compressed transfer, and 12 MB estimated GPU memory. Add a 45% LOD for distant play if profiling warrants it.
8. Verify every clip, shadow, colorway, first-person hide/show transition, field lighting condition, and WebGL context recovery in the actual game.

## Runtime contract for a future GLB

- Canonical machine-readable contract: `src/render/assets/character-asset-manifest.json`
- Audited reference character: `public/assets/vendor/quaternius/night-striker.glb`
- Audited reference animations: `public/assets/vendor/quaternius/universal-animation-library.glb`
- Required runtime clips: `Idle_Loop`, `Jog_Fwd_Loop`, `Sprint_Loop`, `Roll`, `Punch_Cross`
- Scene root: `Armature`; exact 65-joint names and socket mappings are defined by the manifest.
- Character colorways must use shared material slots rather than six duplicated models.
- Collision remains simulation-owned; imported render meshes never become authoritative colliders.
- Any future loading must be asynchronous and swap only after validation. The current voxel humanoid remains visible until a valid model is ready.
- A load or validation failure must log once, retain the voxel character, and never block kickoff.

The detailed measured baseline, football-animation gap matrix, six-variant compatibility rules, and reproducible commands are recorded in `CHARACTER_RIG_AUDIT.md`.

## Browser-only animation presentation

`VoxelAnimationController.ts` keeps animation decisions in the render layer. It applies deterministic local joint poses and priority locks so locomotion cannot cancel techniques, damage, knockdowns, or terminal poses. One-shots recover on bounded presentation timers; gameplay timing and movement remain simulation-owned.

The current voxel controller deliberately rejects imported additive clip names. New overlays should be authored as explicit bounded joint offsets rather than full-body animation layers that could double-transform the character.

Rig inspection is available without Blender in a development build by opening `/?rigDebug=1`. Code-driven tools can instead construct `PlayerCharacterAsset` with `{ showSkeleton: true }`, or call `setRigDiagnosticsEnabled(true)`. This creates render-only joint bounds; it is disabled by default and is never part of production simulation or collision.

## Provenance gate

Before adding a GLB, record its creator, generator or DCC tool, creation date, source file, complete license, modifications, prompts when generation was used, and any training/likeness restrictions in `ASSET_CREDITS.md`. Preserve the `.blend` source or a reproducible generation record outside the runtime package. Never label an asset “AI-generated” unless a specific generation tool actually produced it and the record is complete.

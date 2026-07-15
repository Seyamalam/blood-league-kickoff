# Character 3D Asset Pipeline

## Current shipping character

The preferred runtime player is now the CC0 Quaternius Universal Base Characters superhero-male mesh paired with the compatible CC0 Universal Animation Library. `PlayerCharacterAsset.ts` asynchronously loads the optimized skinned GLBs, plays idle/jog/sprint/roll/technique clips, and never owns gameplay position or collision.

This imported character is **not AI-generated** and is not presented as a real footballer or club identity. Its author, source downloads, included licenses, transformations, and hashes are recorded in `ASSET_CREDITS.md`.

The original 36-part procedural model remains the safe fallback. It protects startup and keeps the game playable if a GLB fails validation or loading.

## Audited tool route

The repository's runtime supports Three.js `GLTFLoader`, and the checked-in GLBs now have a reproducible Node-based shipping gate. Run `npm run assets:character:validate` after every character or animation change. That gate now combines the Khronos glTF Validator's structural checks with the project's skeleton, animation, and resource-budget contract. Blender is still required for topology, weight painting, bind-pose, and authored-animation changes, but inspection, validation, and conservative optimization run entirely from Node.js.

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
- Current character: `public/assets/vendor/quaternius/night-striker.glb`
- Current animations: `public/assets/vendor/quaternius/universal-animation-library.glb`
- Required runtime clips: `Idle_Loop`, `Jog_Fwd_Loop`, `Sprint_Loop`, `Roll`, `Punch_Cross`
- Scene root: `Armature`; exact 65-joint names and socket mappings are defined by the manifest.
- Character colorways must use shared material slots rather than six duplicated models.
- Collision remains simulation-owned; imported render meshes never become authoritative colliders.
- Loading must be asynchronous and swap only after validation. The current procedural humanoid remains visible until a valid model is ready.
- A load or validation failure must log once, retain the fallback, and never block kickoff.

The detailed measured baseline, football-animation gap matrix, six-variant compatibility rules, and reproducible commands are recorded in `CHARACTER_RIG_AUDIT.md`.

## Provenance gate

Before adding a GLB, record its creator, generator or DCC tool, creation date, source file, complete license, modifications, prompts when generation was used, and any training/likeness restrictions in `ASSET_CREDITS.md`. Preserve the `.blend` source or a reproducible generation record outside the runtime package. Never label an asset “AI-generated” unless a specific generation tool actually produced it and the record is complete.

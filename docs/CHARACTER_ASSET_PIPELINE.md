# Character 3D Asset Pipeline

## Current shipping character

The preferred runtime player is now the CC0 Quaternius Universal Base Characters superhero-male mesh paired with the compatible CC0 Universal Animation Library. `PlayerCharacterAsset.ts` asynchronously loads the optimized skinned GLBs, plays idle/jog/sprint/roll/technique clips, and never owns gameplay position or collision.

This imported character is **not AI-generated** and is not presented as a real footballer or club identity. Its author, source downloads, included licenses, transformations, and hashes are recorded in `ASSET_CREDITS.md`.

The original 36-part procedural model remains the safe fallback. It protects startup and keeps the game playable if a GLB fails validation or loading.

## Audited tool route

The repository's runtime already supports Three.js `GLTFLoader`, but this development machine does not currently provide Blender or the glTF Transform CLI. Those tools must be installed before claiming an authored, rigged, optimized GLB has shipped.

The production route is:

1. Create an original neutral character in Blender with meter units, local `-Z` gameplay-forward, feet on `Y=0`, and origin centered between the boots.
2. Use one humanoid armature and stable bone names: `Root`, `Hips`, `Spine`, `Chest`, `Neck`, `Head`, paired upper/lower arms and legs, hands, and feet.
3. Author looping `Idle` and `Run` clips plus one-shot `Kick`, `Dash`, `Hit`, `Victory`, and `Defeat` clips. Root motion stays disabled because simulation owns world position.
4. Use an original kit, face, hair, and proportions. Do not reproduce a real player, national team, or club identity.
5. Export glTF 2.0 as one `.glb`, with applied transforms, skinning, animations, tangents only when required, and no cameras or lights.
6. Run glTF Validator and glTF Transform `inspect`, `prune`, `dedup`, and Meshopt optimization. Do not add Draco and Meshopt simultaneously.
7. Keep the highest LOD below 18,000 triangles, four materials, a 1024px shared color atlas, 2.5 MB compressed transfer, and 12 MB estimated GPU memory. Add a 45% LOD for distant play if profiling warrants it.
8. Verify every clip, shadow, colorway, first-person hide/show transition, field lighting condition, and WebGL context recovery in the actual game.

## Runtime contract for a future GLB

- File: `public/assets/characters/night-striker.glb`
- Required clips: `Idle`, `Run`, `Kick`
- Optional clips: `Dash`, `Hit`, `Victory`, `Defeat`
- Required named nodes: `CharacterRoot`, `Armature`, `Head`, `Boot_L`, `Boot_R`
- Character colorways must use shared material slots rather than six duplicated models.
- Collision remains simulation-owned; imported render meshes never become authoritative colliders.
- Loading must be asynchronous and swap only after validation. The current procedural humanoid remains visible until a valid model is ready.
- A load or validation failure must log once, retain the fallback, and never block kickoff.

## Provenance gate

Before adding a GLB, record its creator, generator or DCC tool, creation date, source file, complete license, modifications, prompts when generation was used, and any training/likeness restrictions in `ASSET_CREDITS.md`. Preserve the `.blend` source or a reproducible generation record outside the runtime package. Never label an asset “AI-generated” unless a specific generation tool actually produced it and the record is complete.

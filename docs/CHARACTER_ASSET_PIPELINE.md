# Character 3D Asset Pipeline

## Current shipping character

The player is an original, project-created stylized humanoid assembled at runtime in `RenderBridge.ts`. It now has a readable head and face, hair, ears, hands, jersey collar and badge, cuffs, shorts, socks, articulated limbs, a layered hero boot, sole, and studs. Shared geometry and materials keep the model bounded and disposable, while named body parts drive idle, run, and kick motion.

This character is **not an AI-generated 3D model** and is not based on a real footballer, club kit, or third-party likeness. No imported model file is currently shipped.

The procedural model is the safe fallback while a final authored GLB is produced and approved. It protects offline startup, avoids an undeclared network dependency, and keeps the game playable if a future model fails validation.

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

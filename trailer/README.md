# Pitch Video Workspace

This directory is the local handoff point for pitch-video footage and rendered exports.

## Input

Place the player's recording at:

`trailer/input/gameplay-master.mp4`

Optional narration and additional pickup footage:

- `trailer/input/narration.wav`
- `trailer/input/gameplay-pickups.mp4`

The prepared ElevenLabs narration uses the free default voice **Brian — Deep, Resonant and Comforting** with Eleven Multilingual v2. Its eight downloaded sections live locally under `trailer/input/voice-segments/`. Run `npm run trailer:elevenlabs-voice` to rebuild the synchronized 3:55 narration track.

## Output

Final renders go to `trailer/output/`. Raw footage and renders are ignored by Git.

The editorial structure, approved narration and upload copy live in `docs/trailer/`.

Run `npm run trailer:previs` to create a 3:55 timing preview from the prepared cards, current showcase stills, guide narration and menu soundtrack. This is a pacing reference; the final edit replaces the still-image sections with selected moments from the player's recording.

# Pitch Video Workspace

This directory is the local handoff point for pitch-video footage and rendered exports.

## Input

Place the player's recording at:

`trailer/input/gameplay-master.mp4`

Optional narration and additional pickup footage:

- `trailer/input/narration.wav`
- `trailer/input/gameplay-pickups.mp4`

## Output

Final renders go to `trailer/output/`. Raw footage and renders are ignored by Git.

The editorial structure, approved narration and upload copy live in `docs/trailer/`.

Run `npm run trailer:previs` to create a 3:55 timing preview from the prepared cards, current showcase stills, guide narration and menu soundtrack. This is a pacing reference; the final edit replaces the still-image sections with selected moments from the player's recording.

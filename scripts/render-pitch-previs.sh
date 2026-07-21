#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
VOICE="$ROOT_DIR/trailer/input/narration-guide-timed.wav"
OUTPUT="$ROOT_DIR/trailer/output/Blood-League-Kickoff-Pitch-PREVIS.mp4"

if [[ ! -f "$VOICE" ]]; then
  "$ROOT_DIR/scripts/build-pitch-guide-voice.sh"
fi

mkdir -p "$(dirname "$OUTPUT")"

ffmpeg -y -hide_banner -loglevel warning \
  -loop 1 -t 14 -i "$ROOT_DIR/docs/trailer/cards/opening-card.png" \
  -loop 1 -t 22 -i "$ROOT_DIR/docs/screenshots/showcase-01-title-v0181.jpg" \
  -loop 1 -t 46 -i "$ROOT_DIR/docs/screenshots/showcase-02-gameplay-v0181.jpg" \
  -loop 1 -t 40 -i "$ROOT_DIR/docs/screenshots/showcase-04-guided-kickoff-v0181.jpg" \
  -loop 1 -t 36 -i "$ROOT_DIR/docs/screenshots/showcase-06-count-goalkeeper-v0181.jpg" \
  -loop 1 -t 37 -i "$ROOT_DIR/docs/screenshots/showcase-03-character-creator-v0181.jpg" \
  -loop 1 -t 27 -i "$ROOT_DIR/docs/screenshots/showcase-05-career-roster-v0181.jpg" \
  -loop 1 -t 13 -i "$ROOT_DIR/docs/trailer/cards/closing-card.png" \
  -i "$VOICE" \
  -stream_loop -1 -i "$ROOT_DIR/public/assets/audio/music/blood-league-menu.mp3" \
  -filter_complex "
    [0:v]scale=1280:720:force_original_aspect_ratio=increase,crop=1280:720,setsar=1,fade=t=out:st=13.4:d=0.6[v0];
    [1:v]scale=1280:720:force_original_aspect_ratio=increase,crop=1280:720,setsar=1,fade=t=in:d=0.6,fade=t=out:st=21.4:d=0.6[v1];
    [2:v]scale=1280:720:force_original_aspect_ratio=increase,crop=1280:720,setsar=1,fade=t=in:d=0.6,fade=t=out:st=45.4:d=0.6[v2];
    [3:v]scale=1280:720:force_original_aspect_ratio=increase,crop=1280:720,setsar=1,fade=t=in:d=0.6,fade=t=out:st=39.4:d=0.6[v3];
    [4:v]scale=1280:720:force_original_aspect_ratio=increase,crop=1280:720,setsar=1,fade=t=in:d=0.6,fade=t=out:st=35.4:d=0.6[v4];
    [5:v]scale=1280:720:force_original_aspect_ratio=increase,crop=1280:720,setsar=1,fade=t=in:d=0.6,fade=t=out:st=36.4:d=0.6[v5];
    [6:v]scale=1280:720:force_original_aspect_ratio=increase,crop=1280:720,setsar=1,fade=t=in:d=0.6,fade=t=out:st=26.4:d=0.6[v6];
    [7:v]scale=1280:720:force_original_aspect_ratio=increase,crop=1280:720,setsar=1,fade=t=in:d=0.6[v7];
    [v0][v1][v2][v3][v4][v5][v6][v7]concat=n=8:v=1:a=0,fps=30,format=yuv420p[video];
    [8:a]volume=1.0[voice];
    [9:a]volume=0.10,atrim=duration=235[music];
    [music][voice]amix=inputs=2:duration=first:dropout_transition=0[audio]
  " \
  -map '[video]' -map '[audio]' \
  -c:v libx264 -preset veryfast -crf 21 \
  -c:a aac -b:a 192k \
  -movflags +faststart -t 235 "$OUTPUT"

printf 'Created %s\n' "$OUTPUT"

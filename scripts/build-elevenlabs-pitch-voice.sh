#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
SEGMENT_DIR="$ROOT_DIR/trailer/input/voice-segments"
OUTPUT="$ROOT_DIR/trailer/input/narration-elevenlabs-brian-timed.wav"

for index in {1..8}; do
  file="$SEGMENT_DIR/$(printf '%02d' "$index").mp3"
  if [[ ! -f "$file" ]]; then
    printf 'Missing ElevenLabs segment: %s\n' "$file" >&2
    exit 1
  fi
done

# Slots follow the approved 3:55 editorial structure. Short pre-roll pauses
# let important visuals establish before each narration section begins.
ffmpeg -y -hide_banner -loglevel error \
  -i "$SEGMENT_DIR/01.mp3" \
  -i "$SEGMENT_DIR/02.mp3" \
  -i "$SEGMENT_DIR/03.mp3" \
  -i "$SEGMENT_DIR/04.mp3" \
  -i "$SEGMENT_DIR/05.mp3" \
  -i "$SEGMENT_DIR/06.mp3" \
  -i "$SEGMENT_DIR/07.mp3" \
  -i "$SEGMENT_DIR/08.mp3" \
  -filter_complex "
    [0:a]aresample=48000,adelay=3000|3000,apad=whole_dur=14,atrim=duration=14[a0];
    [1:a]aresample=48000,adelay=2000|2000,apad=whole_dur=22,atrim=duration=22[a1];
    [2:a]aresample=48000,adelay=3000|3000,apad=whole_dur=46,atrim=duration=46[a2];
    [3:a]aresample=48000,adelay=3000|3000,apad=whole_dur=40,atrim=duration=40[a3];
    [4:a]aresample=48000,adelay=3000|3000,apad=whole_dur=36,atrim=duration=36[a4];
    [5:a]aresample=48000,adelay=2000|2000,apad=whole_dur=37,atrim=duration=37[a5];
    [6:a]aresample=48000,adelay=2000|2000,apad=whole_dur=27,atrim=duration=27[a6];
    [7:a]aresample=48000,adelay=2000|2000,apad=whole_dur=13,atrim=duration=13[a7];
    [a0][a1][a2][a3][a4][a5][a6][a7]concat=n=8:v=0:a=1[out]
  " \
  -map '[out]' -ar 48000 -ac 2 "$OUTPUT"

duration="$(ffprobe -v error -show_entries format=duration -of default=noprint_wrappers=1:nokey=1 "$OUTPUT")"
printf 'Created %s (%0.2f seconds)\n' "$OUTPUT" "$duration"

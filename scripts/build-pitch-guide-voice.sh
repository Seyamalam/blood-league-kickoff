#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
SOURCE="$ROOT_DIR/docs/trailer/narration.txt"
WORK_DIR="$ROOT_DIR/trailer/output/.voice-guide"
OUTPUT="$ROOT_DIR/trailer/input/narration-guide-timed.wav"

# Each target matches the eight editorial sections in PITCH_VIDEO_PLAN.md.
TARGETS=(14 22 46 40 36 37 27 13)

rm -rf "$WORK_DIR"
mkdir -p "$WORK_DIR" "$(dirname "$OUTPUT")"

for index in "${!TARGETS[@]}"; do
  paragraph=$((index + 1))
  target="${TARGETS[$index]}"
  raw="$WORK_DIR/segment-$paragraph.aiff"
  timed="$WORK_DIR/segment-$paragraph.wav"

  awk -v paragraph="$paragraph" 'BEGIN { RS="" } NR == paragraph { print }' "$SOURCE" \
    | say -v Daniel -r 150 -o "$raw"

  ffmpeg -y -hide_banner -loglevel error \
    -i "$raw" \
    -af "apad=whole_dur=${target},atrim=duration=${target}" \
    -ar 48000 -ac 2 "$timed"
done

ffmpeg -y -hide_banner -loglevel error \
  -i "$WORK_DIR/segment-1.wav" \
  -i "$WORK_DIR/segment-2.wav" \
  -i "$WORK_DIR/segment-3.wav" \
  -i "$WORK_DIR/segment-4.wav" \
  -i "$WORK_DIR/segment-5.wav" \
  -i "$WORK_DIR/segment-6.wav" \
  -i "$WORK_DIR/segment-7.wav" \
  -i "$WORK_DIR/segment-8.wav" \
  -filter_complex '[0:a][1:a][2:a][3:a][4:a][5:a][6:a][7:a]concat=n=8:v=0:a=1[out]' \
  -map '[out]' "$OUTPUT"

duration="$(ffprobe -v error -show_entries format=duration -of default=noprint_wrappers=1:nokey=1 "$OUTPUT")"
printf 'Created %s (%0.2f seconds)\n' "$OUTPUT" "$duration"

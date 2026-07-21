#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
CARD_DIR="$ROOT_DIR/docs/trailer/cards"

if ! command -v rsvg-convert >/dev/null 2>&1; then
  printf 'rsvg-convert is required. Install librsvg with Homebrew.\n' >&2
  exit 1
fi

rsvg-convert -w 1920 -h 1080 "$CARD_DIR/opening-card.svg" -o "$CARD_DIR/opening-card.png"
rsvg-convert -w 1920 -h 1080 "$CARD_DIR/closing-card.svg" -o "$CARD_DIR/closing-card.png"

printf 'Rendered 1920x1080 pitch cards in %s\n' "$CARD_DIR"

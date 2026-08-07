#!/usr/bin/env bash
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
EXT_DIR="$ROOT/domdoc"
DIST_DIR="$ROOT/dist"

VERSION=$(grep '"version"' "$EXT_DIR/manifest.json" | head -1 | sed 's/.*"\([0-9.]*\)".*/\1/')
ZIP_NAME="domdoc-v${VERSION}.zip"

mkdir -p "$DIST_DIR"
rm -f "$DIST_DIR/$ZIP_NAME"

cd "$EXT_DIR"
zip -r "$DIST_DIR/$ZIP_NAME" . \
  -x "*.DS_Store" \
  -x "__MACOSX/*"

echo "✓ Created $DIST_DIR/$ZIP_NAME"
echo "  Upload this file to the Chrome Web Store Developer Dashboard"

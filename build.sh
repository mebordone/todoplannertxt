#!/bin/bash
#
# Build script for Todo.txt MailExtension (webext).
# Produces todotxt_<version>_<yyyymmdd>.xpi

set -e

function show_help {
  echo "usage: build.sh [-d | -h]"
  echo "Options:"
  echo "  -d    Enable debug mode (show debug messages in console) [NOT FOR PRODUCTION]"
  echo "  -h    Show this help"
}

DEV=
while getopts "dh" opt; do
  case $opt in
    d)
      echo "Building add-on with DEBUG enabled!"
      DEV=1
      ;;
    h)
      show_help
      exit 0
      ;;
    \?)
      show_help
      exit 1
      ;;
  esac
done

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$SCRIPT_DIR"

if [ ! -f manifest.json ]; then
  echo "[ERROR] manifest.json not found. Run build.sh from the webext directory."
  exit 1
fi

VERSION=$(sed -n 's/.*"version": *"\([^"]*\)".*/\1/p' manifest.json)
if [ -z "$VERSION" ]; then
  echo "[ERROR] Could not read version from manifest.json"
  exit 1
fi
BUILD_DATE=$(date +%Y%m%d)
BUILD_TIME=$(date +%H%M%S)
DIST_DIR="dist"
FILE="todotxt_${VERSION}_${BUILD_DATE}_${BUILD_TIME}.xpi"
echo "Building version [$VERSION] on [$BUILD_DATE $BUILD_TIME]"

mkdir -p "$DIST_DIR"

# Remove previous builds for this version (any previous timestamp)
for f in "$DIST_DIR"/todotxt_"${VERSION}"_*_*.xpi; do
  [ -f "$f" ] && rm -f "$f" && echo "Removed old build: $f"
done

# Debug mode: enable only for -d (source stays debugMode: false by default)
if [ -n "$DEV" ]; then
  cp modules/logger.js modules/logger.js.bak
  sed -i 's/debugMode: *false/debugMode: true/' modules/logger.js
fi

zip -qr "$DIST_DIR/$FILE" \
  manifest.json \
  background.js \
  background/ \
  options/ \
  popup/ \
  tab/ \
  modules/ \
  lib/ \
  experiments/ \
  _locales/ \
  icons/

[ -f modules/logger.js.bak ] && mv modules/logger.js.bak modules/logger.js

echo "Finished build [$DIST_DIR/$FILE]"

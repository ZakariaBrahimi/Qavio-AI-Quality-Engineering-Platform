#!/usr/bin/env bash
set -euo pipefail

cd "$(dirname "$0")/.."

echo "Removing node_modules, dist, .next, and .turbo across the monorepo..."
find . \
  -name node_modules -o \
  -name dist -o \
  -name .next -o \
  -name .turbo \
  | grep -v "^\./node_modules" \
  | xargs -I {} rm -rf {}

echo "Done."

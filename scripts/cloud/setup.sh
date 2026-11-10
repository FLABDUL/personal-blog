#!/usr/bin/env bash
set -euo pipefail
cd "$(dirname "$0")/../.."
if [[ "$(node -p 'process.versions.node.split(".")[0]')" != 24 ]]; then
  echo 'Use Node.js 24 for this repository.' >&2
  exit 1
fi
npm ci --no-audit --no-fund
echo 'Cloud dependencies ready. Run bash scripts/cloud/verify.sh.'

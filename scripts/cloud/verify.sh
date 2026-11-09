#!/usr/bin/env bash
set -euo pipefail
cd "$(dirname "$0")/../.."
export VERCEL_ENV=preview
export SMOKE_ENV=preview
npm run cv:generate
npm run cv:check
npm run test:cv
npm run test:music
npm run build
echo 'Preview build ready. Serve with npm run serve -- --host 0.0.0.0 --port 9000.'
echo 'For browser verification: npx playwright install chromium && npm run test:smoke.'

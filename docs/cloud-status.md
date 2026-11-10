# Cloud setup verification — 9 November 2026

Source baseline: `14e06cd` on `main`.
Setup branch: `codex/cloud-mobile-setup-2026-11-09`.

Verified in the attached Linux Cloud workspace with Node.js 24.22.1:

- Clean `npm ci` completed.
- `bash scripts/cloud/verify.sh` exited successfully: CV generation/check,
  14 CV tests, 23 Music tests and a clean Gatsby preview build.
- 13 existing Chromium checks passed: eleven primary routes, navigation to a
  published article, and Music navigation/privacy on an emulated mobile viewport.
- The build logged the existing Node `punycode` deprecation warning while
  completing with exit code zero.

No application content or website behavior was changed. No live API credential
was required. PDF compilation, authenticated live integrations, native phone
testing and account-level environment publication were not performed.

## Reusable environment settings

- Repository: `https://github.com/FLABDUL/personal-blog.git`.
- Branch while reviewing setup: `codex/cloud-mobile-setup-2026-11-09`.
- Runtime: Node.js 24 with npm; Linux.
- Setup command from repository root: `bash scripts/cloud/setup.sh`.
- Verification: `bash scripts/cloud/verify.sh`.
- Optional browser install: `npx playwright install chromium`.
- Preview server: `npm run serve -- --host 0.0.0.0 --port 9000`.
- Secrets: none for the initial content/build workflow.
- Package/browser downloads require npm and Playwright CDN access. Use the
  environment's approved dependency network presets where available.

Save the reusable environment in product settings. This repository preparation
does not create a ChatGPT Project, move chats or save account-level settings.
For a fresh session, select this setup branch until the changes are merged.

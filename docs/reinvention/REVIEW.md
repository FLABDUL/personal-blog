# Reviewing Collected Works

This is an isolated design experiment, based on production revision df581f093488c90fe6e79f3a5d8cd00c5befb48c. The main checkout and its unfinished Windows Observability Lab work were preserved.

## What changed

| Section    | Treatment and behaviour                                                                                                                                                                                       |
| ---------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| About      | Large editorial opening, existing portrait, painting detail, six-entry chapter index and the original biography.                                                                                              |
| Blog       | A warm journal with one leading article and a ruled, readable index. Existing post URLs, categories, external destinations and full articles remain.                                                          |
| Projects   | Ink-blue engineering portfolio with alternating large media and descriptive rows. Existing project evidence, demos, source links and case studies remain.                                                     |
| Experience | Sage career ledger, clear chronology, quiet rules, readable evidence and retained jump navigation, contact links and printing. CV source records are unchanged.                                               |
| Studio     | A complete dark exhibition of nine published paintings, varied scale and pacing, responsive artwork and keyboard/touch close viewing with next/previous controls.                                             |
| Bookshelf  | All 26 current books in an honest face-out library. Search, category filters, cover/index views, book details, deep links and browser history support. No invented spines or edition dimensions.              |
| Music      | Teal listening-room setting around the existing authored atlas. Accessible control labels, a clearer small-screen centre, and preserved map, filters, track details, pause controls and Spotify destinations. |

The shared masthead, m/h monogram, Georgia display type, sans-serif reading text, monospace captions, numbered entries and restrained motion connect these settings. No new external fonts, visual framework or animation dependency.

## Focused alternatives

- /review/ — clearly labelled review hub, linked from every preview page.
- /review/about-table/ — complete specimen-table About alternative, with six clickable objects and the same factual biography.
- /review/studio-daylight/ — complete daylight salon alternative, with all nine works and the same accessible lightbox.

Prefer the integrated editorial About for immediate clarity. The specimen table is an intentional alternative for a more exploratory introduction. Prefer the dark Studio for individual encounters; consider the daylight version if quickly comparing the collection matters more.

## Content and image provenance

All source artwork, portrait, project screenshots and book covers already existed in this repository. Optimised derivatives in static/design were generated from those public files with scripts/design/prepare-assets.js. Regenerate with node scripts/design/prepare-assets.js. The paintings retain their composition and attribution.

Only published Studio manifest entries were adopted from the unfinished foundation worktree. No private photo intake, draft metadata, application material or new personal experience was imported. The build removes two legacy draft-candidate files, fox.jpg and pottery.jpg, from generated public output while preserving their source files. The published-only manifest and output exclusions have regression checks.

The bookshelf incorporates interaction ideas from the unfinished September worktree but preserves the newer production dataset. Front covers remain recognisable front covers.

## Removing the experiment

Set config/design-review.json enabled to false and perform a clean build. This removes the review routes and ribbon together. VERCEL_ENV=production also suppresses them automatically; this is a safeguard, not authorisation to deploy. For permanent cleanup, remove src/pages/review and the review/specimen/salon CSS after the preferred designs are settled. No content migration is required.

Before any later release, run npm run clean, npm run build, npm run cv:check, npm run test:cv, npm run test:music and npm run test:smoke. Decide separately whether to integrate the main checkout's unpublished work.

## Verification approach

Playwright checks routes and existing interactions, all seven sections at 320/768px, ten candidate/review routes at 390/1440px, real pointer and keyboard controls, emulated touch, native dialogs, focus return, history, reduced motion, skip navigation and unpublished-output exclusions. Axe scans those ten routes at two sizes and both detail dialogs. These are automated checks, not a substitute for assistive-technology and real-device review.

Screenshots and performance evidence remain local in output/reinvention. API fallbacks are deliberately stubbed in local browser tests; deployment API checks must be reported separately.

Use a clean build and restart gatsby serve before final browser checks. During this run, Gatsby's incremental output retained HTML referencing an older CSS hash despite generating a new stylesheet. test:smoke:local now cleans first to prevent this stale-output failure from recurring.

Accessibility checks exposed repeated mismatches between visible text and explicit ARIA labels. The added axe suite is the focused workflow improvement: keep it in the normal smoke run so future labels and colour changes are checked automatically.

## Recommendation

Keep the integrated identity, editorial About, unboxed Blog/Projects/Experience, and Studio close viewing. Review the dark-versus-daylight Studio choice. Discard simulated book spines and additional decorative room metaphors unless real assets or a clear interaction need justify them.

The next action is to compare About and Studio through the protected review hub, then decide which direction should proceed to a separate release review. This branch does not authorise a production flip.

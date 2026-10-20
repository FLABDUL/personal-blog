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

Hakim selected the integrated editorial About and exhibition Studio on 20 October. The specimen table and salon are retained as clearly labelled, unselected references until experiment cleanup.

## Selected-direction refinement

The masthead now has explicit Light and Dark buttons. Before a preference is chosen, each section keeps its authored palette. A choice follows the reader between routes and persists in local browser storage. A small inline head script applies a saved choice before hydration; unavailable storage does not stop the controls working for the current visit. Theme rules apply only on screen, preserving the light print layout. The Music atlas now follows the selected theme throughout: sage chart paper and dark ink in Light, deep green with warm brass in Dark. Spotify artwork retains its original colours.

The Music follow-up replaces the heavy outer box with a fine rule, simpler region controls and a lightly framed chart. Ninety-six fixed decorative points and eight slow twinkles sit behind the existing interactive map. The decoration is hidden from assistive technology and cannot capture pointer or keyboard input. Twinkles share the map's pause state and are static with reduced motion; forced-colour mode removes them. No new controls or data claims were added.

Five new AI-generated directions are available at `/review/logos/`: Courtyard Grid, Hibiscus Imprint, Blue Vine, Petal Portal and Night Garden. These replace both rejected rounds and explore geometry, botanical illustration, a vine wordmark, abstract petals and illuminated ornament. Only E uses the confirmed Arabic name حكيم without a prefix. LOGOS-ART.md records exact prompts, assets, cultural references and the remaining small-size and lettering work. The current masthead remains installed pending a choice.

Budget V2 and Backtest Library now use a continuous editorial study layout: large serif introductions, numbered section links, connected architecture steps, open evidence rows and visible limitations. Evidence images retain their original files, captions and full-size links, with intrinsic dimensions and lazy loading. All engineering claims and result values are preserved. The obsolete shared card stylesheet was removed.

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

Stop gatsby serve before rebuilding, then start it again for final browser checks. A running server can hold Gatsby's cache open on Windows. During this run, Gatsby's incremental output retained HTML referencing an older CSS hash despite generating a new stylesheet, both locally and on Vercel. The build script now runs gatsby clean before gatsby build, so local checks and deployments receive consistent generated output.

Accessibility checks exposed repeated mismatches between visible text and explicit ARIA labels. The added axe suite is the focused workflow improvement: keep it in the normal smoke run so future labels and colour changes are checked automatically.

The theme follow-up extends this coverage to fourteen routes, including a technical article with code blocks, in both themes at mobile and desktop sizes. Keep this article coverage in the smoke run: it caught an existing keyboard-inaccessible scroll region that index-page scans could not detect. Code now wraps without changing article content.

Deployment smoke runs have BASE_URL but no local build output. Keep output checks dual-mode: inspect files after a local build, and request the actual deployed HTML, stylesheet and excluded asset URLs in deployment mode. Both modes have been exercised. Do not hide a missing deployed asset or authentication failure by skipping the assertion.

## Recommendation

Keep the integrated identity, selected editorial About and exhibition Studio, unboxed sections and engineering studies. Light Studio uses the selected exhibition composition; it does not switch to the unselected salon concept. Discard simulated book spines and additional decorative room metaphors unless real assets or a clear interaction need justify them.

The next action is for Hakim to choose among the revised logo directions. Change model intelligence before requesting the later separate release review; that review has not started. This branch does not authorise a production flip.

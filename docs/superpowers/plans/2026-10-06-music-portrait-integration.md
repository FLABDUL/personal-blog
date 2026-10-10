# Music Portrait Integration Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add the approved Music Portrait and its case study as native Gatsby routes on Made by Hakim, progressively enriched by a secure cached Spotify catalogue.

**Architecture:** Gatsby bundles a validated authored portrait and renders the complete interactive map without network data. A same-site Vercel API progressively supplies a schema-validated Spotify catalogue snapshot refreshed by an authorised daily cron and stored in private Vercel Blob storage; failures leave the authored portrait intact.

**Tech Stack:** Gatsby 5, React 19, CommonJS JavaScript, CSS Modules, JSON Schema/Ajv 6, Vercel Functions, Vercel Blob, Node's built-in test runner and Playwright.

**Spec:** `docs/superpowers/specs/2026-10-06-music-portrait-integration-design.md`

## Global Constraints

- Begin execution with `superpowers:using-git-worktrees` and create an isolated worktree from the then-current remote default branch.
- Read the specification and the nearest `AGENTS.md` before implementation; preserve unrelated user changes.
- Use British English for public copy.
- Keep `content/music/portrait.json` in `draft` during local implementation. `GATSBY_MUSIC_DRAFT_PREVIEW=1` may expose it locally; changing it to `published` requires separate explicit publication approval.
- Preserve the approved ten artists, thirty tracks, three tracks per artist, personal stories, prominence scores, chapter relationships and Aukai multi-region treatment.
- Do not add Spotify login, playback, recommendations, search, playlists, visitor analytics or calculated listening-rank claims.
- Never place Spotify credentials in source, fixtures, logs, browser bundles, plan output or user-facing messages.
- The previously disclosed client secret must be rotated before any preview or deployment; implementation may proceed locally with fallbacks without handling the replacement secret.
- Keep the standalone Next.js prototype unchanged as the visual and behavioural reference.
- Do not commit, push, create a pull request, deploy, publish, message externally or delete anything without separate explicit approval.
- The commit step in every task is approval-gated. If approval is absent, stop after verification and leave the reviewed changes uncommitted.

## Review Focus

- A draft manifest in a production build must show the curation fallback rather than expose draft personal content; Task 1 pins this in loader tests.
- A missing, expired or malformed Blob snapshot must never partially enrich the portrait or replace the last valid snapshot; Tasks 3 and 4 pin these cases.
- A failed remote artist or album image must retain a selectable labelled node using its local fallback; Tasks 5 and 6 pin this in browser coverage.
- Rapid artist/track selection and the two-stage Escape path must restore the correct selection, motion and keyboard focus; Task 6 pins this interaction sequence.
- Seven navigation links and the portrait must remain usable at 390px without page-level horizontal overflow; Tasks 8 and 9 pin this on mobile.

---

## File Structure

### Authored content and validation

- `content/music/portrait.json` — canonical public personal portrait, initially draft.
- `content/music/schema.json` — structural JSON Schema.
- `scripts/music/portrait.js` — semantic validation and draft/published loading.
- `scripts/music/validate.js` — build-time command.
- `tests/music/portrait-content.test.js` — validator and loader tests.

### Pure portrait domain

- `src/lib/music/portrait.js` — catalogue-independent view model construction.
- `src/lib/music/layout.js` — deterministic orbit, planet, moon and distant-track coordinates.
- `tests/music/portrait-model.test.js` — pure domain and layout tests.

### Spotify server boundary

- `api/_spotify/catalogue.js` — catalogue validation, mapping and public-field projection.
- `api/_spotify/client.js` — app-token acquisition and bounded Spotify requests.
- `api/_spotify/store.js` — private Blob snapshot store.
- `api/_spotify/refresh.js` — all-or-nothing refresh orchestration.
- `api/spotify-catalogue.js` — public read-only catalogue handler.
- `api/spotify-refresh.js` — cron-authorised refresh handler.
- `tests/music/spotify-catalogue.test.js` — schema and projection tests.
- `tests/music/spotify-refresh.test.js` — token, refresh, persistence and handler tests.
- `vercel.json` — daily refresh schedule.

### Gatsby experience

- `src/pages/music.js` — route, metadata and authored portrait shell.
- `src/components/music/useSpotifyCatalogue.js` — progressive catalogue fetch state.
- `src/components/music/MusicPortrait.js` — selection, focus, visibility and motion controller.
- `src/components/music/LivingAtlas.js` — chart composition and region spotlights.
- `src/components/music/OrbitLayer.js` — orbit and local moon composition.
- `src/components/music/ArtistPlanet.js` — selectable artist node.
- `src/components/music/TrackNode.js` — selectable moon/distant-track node.
- `src/components/music/PlanetArtwork.js` — resilient remote artwork with fallback.
- `src/components/music/MusicDetails.js` — selected personal context and explicit Spotify action.
- `src/components/music/SpotifyAttribution.js` — compact provider attribution.
- `src/components/music/MusicPortrait.module.css` — locally scoped chart visual system and motion.
- `static/music/hakim-profile.jpg` and `static/music/spotify-mark.svg` — reviewed public assets.
- `tests/smoke/music.spec.js` — route and interaction coverage.

### Case study and site integration

- `src/pages/music/case-study.js` — approved engineering narrative.
- `src/components/music/MusicCaseStudy.module.css` — scoped case-study treatment.
- `src/pages/privacy.js` — catalogue/privacy disclosure.
- `src/components/Navbar.js` and `src/components/Footer.js` — Music and privacy navigation.
- `tests/smoke/site.spec.js` — route, navigation and image coverage.

---

### Task 1: Authored Portrait Contract

**Files:**

- Create: `content/music/portrait.json`
- Create: `content/music/schema.json`
- Create: `scripts/music/portrait.js`
- Create: `scripts/music/validate.js`
- Create: `tests/music/portrait-content.test.js`
- Modify: `package.json`

**Interfaces:**

- Produces: `validateMusicPortrait(value) -> { valid: boolean, errors: string[] }`
- Produces: `loadMusicPortrait({ allowDraft?: boolean }) -> object | null`
- Produces: `collectSpotifyCatalogueIds(portrait) -> { artistIds: string[], trackIds: string[] }`

- [ ] **Step 1: Write failing content-contract tests**

Use `node:test` to assert that the approved fixture has ten unique artists, thirty unique tracks, exactly three tracks per artist, only 22-character Spotify IDs, prominence values from 1 to 5, and Aukai membership in both `in_rotation` and `creative_fuel`. Assert that duplicate IDs and orphan tracks fail with path-specific messages. Assert `loadMusicPortrait({ allowDraft: false })` returns `null` for draft content while `{ allowDraft: true }` returns it.

- [ ] **Step 2: Run the focused tests and confirm failure**

Run: `node --test tests/music/portrait-content.test.js`
Expected: FAIL because the validator and manifest do not exist.

- [ ] **Step 3: Add the schema, semantic validator and approved draft manifest**

Port the reviewed content from the reference implementation without changing names, stories, IDs, prominence or relationships. Use Ajv for structure and explicit JavaScript checks for cross-record rules. `scripts/music/validate.js` must exit non-zero on errors and print no credential-bearing values.

- [ ] **Step 4: Wire validation into repository commands**

Add `music:validate` and `test:music` scripts. Append `npm run music:validate` to `predevelop` and `prebuild` without removing CV or Bookshelf validation.

- [ ] **Step 5: Verify the contract**

Run: `node --test tests/music/portrait-content.test.js`
Run: `npm run music:validate`
Expected: both PASS; validator reports ten artists and thirty tracks without exposing full records.

- [ ] **Step 6: Approval-gated commit**

If explicit commit approval exists: `git add content/music scripts/music tests/music/portrait-content.test.js package.json package-lock.json && git commit -m "feat: add validated music portrait content"`.

### Task 2: Deterministic Portrait Model and Layout

**Files:**

- Create: `src/lib/music/portrait.js`
- Create: `src/lib/music/layout.js`
- Create: `tests/music/portrait-model.test.js`

**Interfaces:**

- Consumes: `loadMusicPortrait`, `collectSpotifyCatalogueIds` from Task 1.
- Produces: `buildMusicPortraitModel(portrait, catalogue) -> { chapters, planets, tracks, relationships, catalogueAvailable }`
- Produces: `computeAtlasLayout(model) -> { centre, orbits, planets, relationships }`
- Produces: `computeMoonLayout(planet, tracks) -> Array<{ trackId, angle, radius }>`
- Produces: `computeDistantTrackLayout(model) -> Array<{ trackId, x, y }>`

- [ ] **Step 1: Write failing model and layout tests**

Assert one planet per artist, Aukai represented once with two chapter affinities, larger radii for prominence 4 than 3, canonical Spotify links only from validated catalogue data, exactly three moon positions for a selected artist, deterministic results across repeated calls, and all normalised coordinates within the map bounds.

- [ ] **Step 2: Run the focused tests and confirm failure**

Run: `node --test tests/music/portrait-model.test.js`
Expected: FAIL because the model and layout modules do not exist.

- [ ] **Step 3: Port the pure reference logic into CommonJS JavaScript**

Remove Next.js aliases and TypeScript-only syntax. Preserve the reference constants, unique-artist rule, multi-region marker, orbit speeds, planet-size contrast and moon/distant-track geometry.

- [ ] **Step 4: Verify the pure domain**

Run: `node --test tests/music/portrait-model.test.js`
Expected: PASS with deterministic layouts and no duplicate Aukai planet.

- [ ] **Step 5: Approval-gated commit**

If explicitly approved: `git add src/lib/music tests/music/portrait-model.test.js && git commit -m "feat: add music portrait model and layout"`.

### Task 3: Spotify Catalogue Contract

**Files:**

- Create: `api/_spotify/catalogue.js`
- Create: `tests/music/spotify-catalogue.test.js`

**Interfaces:**

- Consumes: artist and track IDs collected in Task 1.
- Produces: `spotifyEntityUrl(kind, id) -> string`
- Produces: `validateCatalogueSnapshot(value, { now?: number, allowExpired?: boolean }) -> object`
- Produces: `mapSpotifyCatalogue({ artists, tracks, generatedAt }) -> snapshot`
- Produces: `toPublicCatalogue(snapshot) -> publicSnapshot`

- [ ] **Step 1: Write failing catalogue tests**

Assert strict 22-character IDs, canonical entity URLs, record-key/ID equality, no more than twenty artists or thirty tracks, canonical millisecond timestamps, exactly seven days between generation and expiry, rejection of expired snapshots by default, and removal of unexpected/private fields from the public projection.

- [ ] **Step 2: Run the focused tests and confirm failure**

Run: `node --test tests/music/spotify-catalogue.test.js`
Expected: FAIL because the catalogue module does not exist.

- [ ] **Step 3: Implement the minimal strict catalogue contract**

Use plain JavaScript validation consistent with the authored validator; do not add a second schema library. Preserve Spotify attribution as `{ provider: "Spotify", providerUrl: "https://www.spotify.com/" }`.

- [ ] **Step 4: Verify valid, malformed and expired snapshots**

Run: `node --test tests/music/spotify-catalogue.test.js`
Expected: PASS.

- [ ] **Step 5: Approval-gated commit**

If explicitly approved: `git add api/_spotify/catalogue.js tests/music/spotify-catalogue.test.js && git commit -m "feat: define Spotify catalogue contract"`.

### Task 4: Secure Catalogue Refresh and Vercel API

**Files:**

- Create: `api/_spotify/client.js`
- Create: `api/_spotify/store.js`
- Create: `api/_spotify/refresh.js`
- Create: `api/spotify-catalogue.js`
- Create: `api/spotify-refresh.js`
- Create: `tests/music/spotify-refresh.test.js`
- Create: `vercel.json`
- Modify: `package.json`
- Modify: `package-lock.json`

**Interfaces:**

- Consumes: catalogue contract from Task 3 and IDs from `content/music/portrait.json`.
- Produces: `getSpotifyAppToken({ clientId, clientSecret, fetchImpl }) -> Promise<string>`
- Produces: `createSpotifyGateway({ accessToken, fetchImpl }) -> { getArtist(id), getTrack(id) }`
- Produces: `createBlobCatalogueStore(blobClient) -> { read(), write(snapshot), clear() }`
- Produces: `refreshSpotifyCatalogue(deps) -> Promise<{ status: "updated", generatedAt, expiresAt }>`
- Produces: Vercel handlers at `/api/spotify-catalogue` and `/api/spotify-refresh`.

- [ ] **Step 1: Write failing server-boundary tests**

Assert POST-form token acquisition, an eight-second abort boundary, maximum four concurrent catalogue requests, requested-ID/returned-ID equality, all-or-nothing store writes, retention of the previous snapshot after any request or validation failure, GET-only public reads, `503 { status: "unavailable" }` for absent/expired data, and `401` for a missing or incorrect cron bearer token.

- [ ] **Step 2: Run the focused tests and confirm failure**

Run: `node --test tests/music/spotify-refresh.test.js`
Expected: FAIL because the modules and handlers do not exist.

- [ ] **Step 3: Port the server logic and add Blob storage**

Add `@vercel/blob` at the version resolved during implementation. Use the private pathname `spotify-catalogue/current.json`; validate before every read and write; write with overwrite enabled only after complete candidate validation. Read `SPOTIFY_CLIENT_ID`, `SPOTIFY_CLIENT_SECRET`, `CRON_SECRET`, `BLOB_READ_WRITE_TOKEN` or Vercel OIDC/Blob variables only inside server files.

- [ ] **Step 4: Add the daily schedule**

Create `vercel.json` with `/api/spotify-refresh` at `0 6 * * *`. Do not invoke it or configure external environment settings in this task.

- [ ] **Step 5: Verify the API boundary**

Run: `node --test tests/music/spotify-catalogue.test.js tests/music/spotify-refresh.test.js`
Run: `npm audit --omit=dev`
Expected: tests PASS; audit introduces no unresolved high/critical issue attributable to the new dependency.

- [ ] **Step 6: Approval-gated commit**

If explicitly approved: `git add api tests/music/spotify-*.test.js vercel.json package.json package-lock.json && git commit -m "feat: add secure Spotify catalogue refresh"`.

### Task 5: Native Gatsby Music Page and Static Visual System

**Files:**

- Create: `src/pages/music.js`
- Create: `src/components/music/useSpotifyCatalogue.js`
- Create: `src/components/music/MusicPortrait.js`
- Create: `src/components/music/LivingAtlas.js`
- Create: `src/components/music/OrbitLayer.js`
- Create: `src/components/music/ArtistPlanet.js`
- Create: `src/components/music/TrackNode.js`
- Create: `src/components/music/PlanetArtwork.js`
- Create: `src/components/music/MusicDetails.js`
- Create: `src/components/music/SpotifyAttribution.js`
- Create: `src/components/music/MusicPortrait.module.css`
- Create: `static/music/hakim-profile.jpg`
- Create: `static/music/spotify-mark.svg`
- Create: `tests/smoke/music.spec.js`

**Interfaces:**

- Consumes: `buildMusicPortraitModel`, layout functions and `loadMusicPortrait` from Tasks 1-2.
- Produces: `<MusicPortrait portrait={object} />` with progressive catalogue enrichment.
- Produces: `useSpotifyCatalogue(url) -> { status: "loading"|"available"|"unavailable", catalogue: object|null }`.

- [ ] **Step 1: Add failing static-page smoke coverage**

Stub `/api/spotify-catalogue` with `503` and assert `/music/` still exposes the `Music Portrait` heading, ten labelled artist controls, the home-star image, three in-map chapter controls, an unavailable catalogue status, Spotify attribution and no separate artist/list/filter section. Assert the page width does not exceed the viewport at 390×844.

- [ ] **Step 2: Build and run the focused browser test to confirm failure**

Run: `$env:GATSBY_MUSIC_DRAFT_PREVIEW='1'; npm run build; npx playwright test tests/smoke/music.spec.js --grep "authored portrait"`
Expected: FAIL because `/music/` does not exist.

- [ ] **Step 3: Port the static portrait and scoped styles**

Use `Layout wide` and `Seo`. Replace Next.js imports and image components with Gatsby-compatible markup. Preserve the approved antique-chart palette, orbit geometry, size contrast, chapter labels, home-star treatment and map-integrated attribution. Import only the reviewed profile and Spotify mark assets.

- [ ] **Step 4: Add progressive catalogue loading and image fallback**

Fetch the same-site endpoint after hydration. Apply a catalogue only after full validation. `PlanetArtwork` must replace a failed remote image with its labelled decorative fallback while keeping the surrounding button operable.

- [ ] **Step 5: Verify the resilient static page**

Run the Step 2 command again.
Expected: PASS with the catalogue unavailable and no page-level horizontal overflow.

- [ ] **Step 6: Approval-gated commit**

If explicitly approved: `git add src/pages/music.js src/components/music src/lib/music static/music tests/smoke/music.spec.js && git commit -m "feat: add native Music Portrait page"`.

### Task 6: Motion, Selection and Accessible Interaction

**Files:**

- Modify: `src/components/music/MusicPortrait.js`
- Modify: `src/components/music/LivingAtlas.js`
- Modify: `src/components/music/OrbitLayer.js`
- Modify: `src/components/music/ArtistPlanet.js`
- Modify: `src/components/music/TrackNode.js`
- Modify: `src/components/music/MusicDetails.js`
- Modify: `src/components/music/MusicPortrait.module.css`
- Modify: `tests/smoke/music.spec.js`

**Interfaces:**

- Consumes: static portrait component tree from Task 5.
- Produces: selection union `null | { kind: "artist", nodeKey, artistId } | { kind: "track", nodeKey, trackId } | { kind: "relationship", relationshipId }`.
- Produces: portrait state attributes `data-selection`, `data-all-paused`, `data-reduced-motion`, `data-page-visible` for deterministic browser assertions.

- [ ] **Step 1: Add failing interaction tests**

Assert that selecting Aukai yields one selected planet and exactly three rotating moons; the main map reports paused; selecting `Slow Sun` pauses local moons; first Escape restores Aukai and focus; second Escape clears selection and resumes motion. Assert planet/moon controls do not carry Spotify destinations, while the detail action has the canonical URL. Add rapid Aukai→Tom Day selection, chapter spotlight, hidden-document and reduced-motion cases.

- [ ] **Step 2: Run the focused tests and confirm failure**

Run: `npx playwright test tests/smoke/music.spec.js --grep "selection|motion|spotlight|reduced"`
Expected: FAIL because the interaction controller is incomplete.

- [ ] **Step 3: Implement selection, focus and motion state**

Port the approved controller behaviour: pause all orbital bands for any selection; animate selected-artist moons on an 18-second linear loop; pause moons for track selection; use Page Visibility and `matchMedia`; return focus without scrolling; make empty chart space reset selection without swallowing node events.

- [ ] **Step 4: Verify accessible interaction**

Run the Step 2 command again.
Expected: PASS, including one Aukai planet, three moons and the two-stage Escape flow.

- [ ] **Step 5: Approval-gated commit**

If explicitly approved: `git add src/components/music tests/smoke/music.spec.js && git commit -m "feat: add accessible portrait interactions"`.

### Task 7: Native Music Case Study

**Files:**

- Create: `src/pages/music/case-study.js`
- Create: `src/components/music/MusicCaseStudy.module.css`
- Modify: `src/pages/music.js`
- Modify: `tests/smoke/music.spec.js`

**Interfaces:**

- Consumes: approved case-study copy and diagrams from the reference implementation.
- Produces: `/music/case-study/` and two-way links between the case study and portrait.

- [ ] **Step 1: Add failing case-study tests**

Assert the primary heading, objective, interaction-model section, authored-versus-Spotify boundary, data-flow section, resilience/accessibility evidence, limitations and `Explore the portrait` link. Assert the portrait exposes `How this was made` and that neither page claims calculated top listening.

- [ ] **Step 2: Run the focused test and confirm failure**

Run: `npx playwright test tests/smoke/music.spec.js --grep "case study"`
Expected: FAIL because the route does not exist.

- [ ] **Step 3: Port the approved case study into the Gatsby layout**

Use `Layout wide`, `Seo`, semantic headings and HTML/CSS diagrams. Replace Next.js links with Gatsby `Link`. Preserve the approved chart character while prioritising readable evidence and British-English copy.

- [ ] **Step 4: Verify both routes and links**

Run the Step 2 command again.
Expected: PASS with same-tab internal navigation in both directions.

- [ ] **Step 5: Approval-gated commit**

If explicitly approved: `git add src/pages/music src/components/music/MusicCaseStudy.module.css tests/smoke/music.spec.js && git commit -m "feat: add Music Portrait case study"`.

### Task 8: Navigation, Privacy and Whole-Site Integration

**Files:**

- Modify: `src/components/Navbar.js`
- Modify: `src/components/Footer.js`
- Create: `src/pages/privacy.js`
- Modify: `tests/smoke/site.spec.js`
- Modify: `tests/smoke/music.spec.js`

**Interfaces:**

- Consumes: Gatsby routes from Tasks 5 and 7.
- Produces: primary `Music` link between Bookshelf and Studio and a footer privacy destination.

- [ ] **Step 1: Add failing whole-site tests**

Add `/music/`, `/music/case-study/` and `/privacy/` to route coverage. Assert exact navigation order, active Music state, footer privacy link and disclosure that Spotify supplies public catalogue details without connecting visitor accounts. At 390px, assert all seven navigation links are reachable and `document.documentElement.scrollWidth <= window.innerWidth`.

- [ ] **Step 2: Run focused tests and confirm failure**

Run: `npx playwright test tests/smoke/site.spec.js tests/smoke/music.spec.js --grep "navigation|privacy|renders"`
Expected: FAIL for the missing links and privacy route.

- [ ] **Step 3: Implement the smallest site-shell changes**

Insert Music between Bookshelf and Studio. Add a restrained privacy link to the footer without redesigning it. Create a concise privacy page covering public catalogue metadata, no visitor Spotify connection and no Music-specific analytics.

- [ ] **Step 4: Verify site integration**

Run the Step 2 command again.
Expected: PASS on desktop and 390px mobile without horizontal overflow.

- [ ] **Step 5: Approval-gated commit**

If explicitly approved: `git add src/components/Navbar.js src/components/Footer.js src/pages/privacy.js tests/smoke && git commit -m "feat: integrate Music into portfolio navigation"`.

### Task 9: Full Verification and Review Handoff

**Files:**

- Modify only if verification exposes a defect in files already owned by Tasks 1-8.

**Interfaces:**

- Consumes: the complete native integration.
- Produces: verified local preview and an evidence-based completion report.

- [ ] **Step 1: Run content and unit verification**

Run: `npm run cv:validate`
Run: `npm run books:validate`
Run: `npm run music:validate`
Run: `npm run test:music`
Expected: all PASS.

- [ ] **Step 2: Run production and browser verification**

Run: `$env:GATSBY_MUSIC_DRAFT_PREVIEW='1'; npm run build`
Run: `$env:GATSBY_MUSIC_DRAFT_PREVIEW='1'; npm run test:smoke:local`
Expected: production build PASS; all Playwright tests PASS.

- [ ] **Step 3: Inspect approved viewports and failure states**

Inspect `/music/` and `/music/case-study/` at 1440×900 and 390×844. Verify map hierarchy, readable labels, one Aukai planet, visible size contrast, three moons, no direct node navigation, explicit Spotify actions, case-study reading order and no page overflow. Repeat `/music/` with catalogue `503`, failed artwork and reduced motion.

- [ ] **Step 4: Scan candidate files for secrets and unrelated changes**

Use a targeted tracked/untracked diff and credential-pattern scan without printing values. Expected: no Spotify credential value, `.env` file, private Blob token or unrelated modification is a commit candidate.

- [ ] **Step 5: Request final code review**

Invoke `superpowers:requesting-code-review` for the complete worktree. Resolve only verified in-scope findings, then rerun affected checks and `superpowers:verification-before-completion`.

- [ ] **Step 6: Present the local preview for Hakim's review**

Open `/music/` and `/music/case-study/` locally. Report milestone status, exact verification results and anything unverified. Do not publish or create a remote preview.

- [ ] **Step 7: Approval-gated final commit**

If and only if explicit commit approval has been granted and earlier task commits were intentionally deferred, commit the complete reviewed diff with a user-approved message. Otherwise leave the work uncommitted.

---

## Execution Notes

- The implementation plan is intentionally one integrated sequence: the authored contract and pure model define interfaces consumed by both the browser and server boundaries, while final interaction tests require all of them.
- If Gatsby/Vercel cannot support the approved private Blob or cron behaviour as specified, stop and amend the design; do not silently substitute a public static snapshot or cross-origin standalone API.
- Environment-variable configuration, Vercel project changes, remote preview creation and publication remain outside local implementation authority.

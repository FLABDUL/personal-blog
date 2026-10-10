# Music Portrait integration design

**Status:** Approved in conversation; awaiting review of this written specification
**Date:** 6 October 2026
**Primary repository:** `C:\Users\hakim\dev\projects\personal-blog`
**Reference implementation:** `C:\Users\hakim\.codex\worktrees\living-atlas\Spotify`

## Objective

Add Music as a native third creative facet of Made by Hakim alongside Bookshelf and Studio. The integration will preserve the approved interactive old-map solar-system experience, show the personal stories behind Hakim's listening, and provide a credible frontend and Spotify API case study for creative-development roles.

The primary experience is a personal portrait rather than a generic music dashboard. Authored meaning remains the source of truth; Spotify supplies catalogue metadata, artwork and outbound destinations.

## Success criteria

- The primary navigation places `Music` between `Bookshelf` and `Studio`.
- A native Gatsby page is available locally at `/music/` and contains the complete interactive portrait.
- A native Gatsby case study is available locally at `/music/case-study/`.
- The ten approved artists, thirty approved tracks, personal stories, prominence scores and chapter relationships remain intact.
- The portrait renders from authored data before catalogue enrichment and remains useful when Spotify or cached catalogue data is unavailable.
- Artist planets orbit at distinct speeds; selecting one pauses the main system and reveals three rotating song moons.
- Planet and moon selection stays on the site. Opening Spotify is a separate, deliberate action in the selected-information panel.
- Region names act as filters inside the map; no duplicate filter toolbar or catalogue list is introduced.
- The experience is responsive, keyboard-accessible and compatible with reduced-motion preferences.
- Spotify credentials never enter browser code, tracked files, logs or rendered HTML.
- Content validation, focused automated tests, the production Gatsby build and desktop/mobile browser checks pass.
- Nothing is committed, pushed, preview-deployed or published without separate explicit approval.

## Non-goals

The first native integration will not include:

- visitor Spotify login, OAuth or access to visitors' listening data;
- claims that the selected tracks are calculated top-listening results;
- in-browser audio playback, previews or the Web Playback SDK;
- playlist creation, recommendations, search or account management;
- a separate artist list, track list, filter toolbar or Spotify results panel;
- analytics or tracking specific to Music Portrait interactions;
- a redesign of Bookshelf, Studio or the rest of Made by Hakim;
- deletion of the standalone Next.js reference implementation;
- deployment, publication or external sharing.

## Repository and working-copy boundaries

### Made by Hakim

The Gatsby repository becomes the public implementation and owns:

- the `/music/` and `/music/case-study/` routes;
- the navigation and privacy-page additions;
- the authored public music manifest and its validator;
- the browser-side portrait components and visual styles;
- the Vercel catalogue and protected refresh functions;
- public fallback assets, Spotify attribution and automated tests.

The current local checkout is behind `origin/main`. Implementation must begin in an isolated worktree based on the then-current remote default branch, not by layering feature work onto that stale checkout. Existing user changes and unrelated files remain untouched.

### Standalone Spotify prototype

The Next.js application remains an unchanged behavioural and visual reference until native integration has passed acceptance. Code is ported deliberately rather than copied wholesale: Next.js routing, server-component, image and API conventions are replaced with the Gatsby and Vercel patterns already used by the primary site.

No deletion, archival or deployment change to the standalone project is part of this specification.

## Information architecture

### Navigation

The primary navigation order becomes:

```text
About · Experience · Projects · Blog · Bookshelf · Music · Studio
```

`Music` points to `/music/` and uses the site's existing active-link behaviour. The existing wrapping navigation remains acceptable on narrow screens, subject to browser verification.

### Routes

- `/music/` is the live interactive portrait and uses the site's wide layout.
- `/music/case-study/` explains the concept, interaction decisions, data flow, resilience, accessibility and verification.
- The portrait contains a restrained `How this was made` link to the case study.
- The case study contains a return link to the live portrait.

Music is not duplicated as a separate Projects catalogue record in the first integration. Its navigation presence and internal case-study link provide the intended path without competing entries.

## Authored content model

`content/music/portrait.json` is the canonical public record for the personal layer. It contains only reviewed, publishable information:

- the three approved chapters: Inner waters, Familiar seas and Outer reaches;
- ten selected artists and their stable Spotify artist IDs;
- thirty selected tracks and their stable Spotify track IDs;
- three selected tracks per artist;
- authored prominence scores controlling relative planet size;
- personal artist stories supplied by Hakim;
- chapter affinities and relationship stories, including Aukai's approved multi-region treatment;
- publication status and schema version.

The manifest does not contain credentials, access tokens, private listening history or claims derived from data Spotify does not expose. The selected songs are described as Hakim's chosen songs for the portrait, not an API-calculated ranking.

A JSON Schema and Node validator will follow the existing content-validation pattern. Validation will reject malformed records, unsupported chapters, duplicate stable IDs, missing artist-track relationships, incorrect track counts, invalid prominence values and incomplete published content. It will run before local development and production builds.

## Frontend architecture

The browser implementation is split into small units under `src/components/music/`:

- a page-level portrait controller for selection, motion and catalogue state;
- a map component for the home star, regions, orbit layers and distant tracks;
- planet, moon and artwork components with clear input contracts;
- a selected-information panel containing personal context and explicit Spotify actions;
- a compact Spotify attribution component;
- pure layout and model-building modules that can be tested without a browser.

The port uses JavaScript and the repository's existing React conventions. A new component library, application-wide theme or framework migration is not introduced.

The authored manifest is bundled with the Gatsby page so the meaningful experience is immediately available. After hydration, the page requests `/api/spotify-catalogue`. Valid catalogue data enriches the model with public names, images, album artwork and canonical Spotify URLs without changing the authored relationships or prominence.

## Portrait interaction model

The portrait opens with Hakim's image as the central home star. Artists occupy chapter-defined orbital bands and move at distinct speeds. Authored prominence creates visibly different planet sizes, so favourites are legible without reading a rank.

The approved interactions are:

1. Selecting a chapter name spotlights that region from inside the map.
2. Selecting an artist pauses the main orbital system and reveals that artist's three song moons.
3. Song moons rotate around the selected artist on an approximately 18-second cycle.
4. Selecting a moon pauses the local moon motion and presents the track detail.
5. Selecting empty map space or pressing Escape closes the current selection and resumes the appropriate motion.
6. Pressing Escape from a selected track returns to its artist before a second dismissal returns to the full map.
7. Spotify is opened only through a labelled action in the selected-information panel.

The interface contains no floating Spotify buttons attached to every node. Existing distant-song stars remain part of the map and may be selected using the same detail pattern.

When the document is hidden, non-essential animation pauses. When `prefers-reduced-motion: reduce` is active, the portrait is static while all selection, filtering and outbound-link behaviour remains available.

## Visual and responsive treatment

The Music section retains its approved antique-chart identity: deep blue-green space, warm gold linework, parchment-like typography accents, orbital paths and map-grid texture. These styles are locally scoped so they do not alter the rest of Made by Hakim.

On wide screens, the map is the dominant surface, with chapter controls embedded on the left and selected information integrated into the frame. The page avoids secondary lists and repeated controls.

On narrow screens, the map becomes a focused portrait viewport and the selected-information panel, guide, attribution and case-study link follow beneath it in reading order. The page itself must not scroll horizontally. Labels remain legible, tap targets meet the project's accessibility expectations and essential actions do not rely on hover.

## Spotify catalogue data flow

```text
Reviewed artist and track IDs
        |
        v
Protected scheduled Vercel refresh
        |
        v
Spotify client-credentials token
        |
        v
Spotify artist and track catalogue responses
        |
        v
Schema validation and snapshot construction
        |
        v
Private Vercel Blob snapshot
        |
        v
/api/spotify-catalogue
        |
        v
Progressive browser enrichment
```

The scheduled refresh endpoint accepts only authorised Vercel cron requests. It obtains an app token with the client-credentials flow, requests only the reviewed artists and tracks, validates every response and writes a new snapshot only after the whole candidate snapshot passes validation. A failed refresh leaves the last valid snapshot intact.

The public catalogue endpoint returns only the whitelisted presentation fields required by the portrait, plus snapshot timing. It does not return credentials, token responses, storage identifiers or internal diagnostics. Responses use appropriate cache and origin controls for the same-site consumer.

The existing validated snapshot and refresh design from the reference application is retained unless implementation discovery identifies a Gatsby/Vercel incompatibility. Any such incompatibility is an architectural change and requires an explicit design amendment rather than an improvised fallback.

## Failure handling

Authored content is the durable layer. Catalogue enrichment is optional.

- If the catalogue endpoint is unavailable, the authored planets, labels and personal stories render with local fallback artwork.
- If a catalogue snapshot is absent, expired or malformed, it is not partially applied.
- If an individual remote image fails, its local visual fallback replaces it without removing the node.
- Spotify actions are rendered only for validated destinations.
- The availability message remains concise and does not expose internal errors.
- Server-side logs use generic failure descriptions and never include credentials or full token responses.
- A failed scheduled refresh never deletes or overwrites the last valid snapshot.

## Security, privacy and attribution

The integration processes public catalogue metadata only. It introduces no visitor account connection, listening-history access, audio playback or Music-specific analytics.

The previously disclosed Spotify client secret must be rotated before any preview or deployment. The replacement secret is entered directly into ignored local environment configuration and Vercel's environment settings. It must never be copied into this repository, a specification, a test fixture, a command transcript or user-facing output.

The public repository may contain the Spotify client ID only if the implementation genuinely requires it to be public; the preferred design treats both client ID and client secret as server-side environment settings.

The privacy page will state that Spotify supplies public catalogue details and artwork and that visitors are not connected to Spotify through this experience. Spotify attribution remains integrated into the map frame and outbound destinations use Spotify's canonical URLs.

## Case-study page

`/music/case-study/` ports the approved standalone case study into the Made by Hakim layout while retaining the chart-inspired visual language. Its narrative order is:

1. The objective: represent a person through meaningful music rather than rankings alone.
2. The interaction model: home star, orbital chapters, artist planets, rotating song moons and distant tracks.
3. The authored-versus-supplied content boundary.
4. The refresh, validation, snapshot and progressive-enrichment data flow.
5. Resilience and accessibility decisions.
6. Verification evidence and explicitly bounded limitations.
7. A return to the live portrait.

Claims remain evidence-based. The page does not describe the curated tracks as measured listening rankings, imply access to private account history or present the prototype as a production-scale Spotify service.

## Migration sequence

The implementation will proceed in reversible layers:

1. Establish an up-to-date isolated Made by Hakim worktree and copy no credentials.
2. Add the authored manifest, schema and validator.
3. Port pure model and layout logic with focused tests.
4. Port the portrait components and locally scoped styles using authored fallbacks.
5. Add the `/music/` route and navigation entry.
6. Port the case study and add the two-way route links.
7. Add the Vercel catalogue, refresh and storage boundary.
8. Add the privacy disclosure and Spotify attribution.
9. Complete automated, responsive and failure-state verification.

The standalone application remains available throughout for behavioural comparison. Nothing in this sequence authorises removal or modification of that reference.

## Verification

### Content and unit checks

- Validate the published music manifest and all referenced local assets.
- Test duplicate, missing and malformed manifest records.
- Test artist prominence, chapter placement, multi-region handling and moon/distant-track layout.
- Test valid, expired, absent and malformed catalogue snapshots.
- Test that failed refreshes retain the previous valid snapshot.
- Test that public API responses contain only allowed fields.

### Component and interaction checks

- Artist selection pauses the main system and reveals exactly three moons.
- Moon movement continues at the approved speed until a track is selected.
- Track selection and the two-stage Escape path behave consistently.
- Region spotlights operate from controls inside the map.
- Planet and moon selection never navigates directly to Spotify.
- The explicit selected-information action opens the correct Spotify destination.
- Keyboard focus is visible and returns appropriately after dismissal.
- Reduced-motion and hidden-document states suppress non-essential animation.

### Site and browser checks

- Run the existing CV and Bookshelf validation so unrelated content contracts remain intact.
- Run the production Gatsby build and confirm both new routes are generated.
- Extend Playwright smoke coverage for navigation, portrait loading and case-study links.
- Inspect representative desktop and mobile viewports for label collisions, target sizes, reading order and page overflow.
- Exercise missing catalogue, failed image and stale snapshot states in a local preview.
- Compare the integrated portrait and case study against the approved standalone reference.
- Scan tracked and untracked candidate files for Spotify credentials before any commit decision.

## Completion and approval gates

Implementation is complete when the native routes work locally, the approved interactions and visual hierarchy are preserved, catalogue failure leaves a complete authored experience, all relevant checks pass and Hakim has reviewed the integrated local preview.

Completion does not authorise a commit, push, pull request, Vercel preview, deployment, publication, external message or deletion of the standalone application. Each action requires separate explicit approval.

## Implementation boundary

After this written specification is reviewed and approved, the next Superpowers step is a detailed implementation plan. Product code, package changes, content migration and API migration begin only after that plan exists and its execution method is selected. Implementation will use test-driven development for new behaviour and verification-before-completion before any success claim.

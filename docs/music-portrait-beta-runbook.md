# Music Portrait friends-beta operator runbook

This is an operator checklist, not a record of live configuration. Local tests use synthetic providers and storage. No live OAuth, Blob, Vercel preview, publication, invitation or deletion rehearsal has been completed. See the Task 14 report for exact local evidence and review status. External actions require separate explicit authority.

## Architecture and admission

`/music/` remains Hakim's authored Portrait 1. The beta flows from an invitation at `/music/create/` through the auth-start and callback APIs, Spotify PKCE consent with only `user-top-read`, a signed owner cookie and the private studio. Owner mutations require the current session, exact configured Origin and session-bound CSRF token. Owner and OAuth cookies are HttpOnly, Secure, SameSite=Lax, host-only, and expire after seven days.

The refresh service exchanges the encrypted refresh credential, fetches artists and tracks for all three Spotify time windows (six successful top-list requests), generates a deterministic private draft and projects a strict public snapshot. It selects up to 16 automatic artists plus known pins, with at most 20 planets and three personally evidenced track moons per planet. Sparse evidence stays sparse. Ranked evidence, credentials and editing state remain private. Public notes are intentional snapshot content.

Private Blob storage holds owners, evidence, saved overrides, drafts, immutable snapshot versions, hashed publication pointers/indices, leases, permanent deletion markers and anonymous spent-invite guards. Public `/music/galaxy/<CAPABILITY>/` anonymously fetches only the allowlisted snapshot from `/api/music-portrait-public`. It reuses the Portrait 1 renderer. No concrete listener/capability page is generated at build time.

Capacity is five active bound accounts total: Hakim and at most four friends. Paused and reconnect-required accounts still count. Creating an invite does not reserve capacity; callback rechecks the count under the global admission lease and rejects duplicate Spotify accounts. This relies on Blob atomic create-if-absent and sufficiently fresh owner listing, which remain live prerequisites.

## Environment configuration — operator steps, not completed

Derivation: `api/_music-beta/http.js`, `security.js`, `spotify-user.js`, the cron handler, installed `@vercel/blob` SDK and `scripts/music/prepare-preview-catalogue.js`. Keep server credentials out of every `GATSBY_` variable, source file, browser bundle, command argument, report and screenshot. Use separate preview and production secret values and separate private Blob stores. The shared `music-beta/` prefix does not itself isolate environments.

| Name                                    | Purpose and expected format                                                                                                                                                                                    | Scope                                                                                                                           |
| --------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------- |
| `MUSIC_PORTRAIT_SITE_ORIGIN`            | Exact HTTPS origin, for example `https://<PREVIEW_HOST>` or `https://<PRODUCTION_HOST>`; no trailing slash, path, user information, query or fragment. Used for redirect and Origin checks.                    | Required server configuration; distinct per environment.                                                                        |
| `SPOTIFY_CLIENT_ID`                     | Spotify dashboard client identifier; pass the exact issued string. Gateway accepts non-blank, well-formed text up to 65,536 characters without CR/LF, rather than validating a provider-specific fixed length. | Required server configuration; use an isolated preview app where available. Also used by the existing public catalogue refresh. |
| `SPOTIFY_CLIENT_SECRET`                 | Exact issued client secret, subject to the same text boundary; never a browser value. Rotate any previously disclosed credential before live use.                                                              | Required server secret; separate preview/production.                                                                            |
| `MUSIC_PORTRAIT_TOKEN_KEY`              | Independently random 32 bytes encoded as canonical unpadded base64url (43 characters). AES-256-GCM protects refresh credentials and OAuth transactions. Runtime currently uses key version 1.                  | Required server secret; separate preview/production.                                                                            |
| `MUSIC_PORTRAIT_SESSION_KEY`            | A different independently random 32-byte canonical base64url value (43 characters). Signs sessions, binds CSRF and derives versioned share capabilities with separate HMAC domains.                            | Required server secret; stable while live sessions/shares need recovery.                                                        |
| `BLOB_READ_WRITE_TOKEN`                 | Exact private-store credential issued by Vercel; SDK-defined opaque format, no app-defined length.                                                                                                             | Explicit Blob authentication mode; separate stores/tokens per environment.                                                      |
| `BLOB_STORE_ID` and `VERCEL_OIDC_TOKEN` | Alternative installed-SDK authentication mode: target store identifier and platform-issued short-lived OIDC token. Do not assume OIDC availability or read/list/write permissions without rehearsal.           | Alternative to explicit Blob token; target only that environment's store. Platform manages the token on supported deployments.  |
| `CRON_SECRET`                           | Non-empty opaque server secret; handler requires exact `Authorization: Bearer <CRON_SECRET>`. App imposes no fixed length; use a strong random value.                                                          | Required for authorised cron execution, including the existing daily catalogue cron. Separate preview/production.               |

`MUSIC_PORTRAIT_LOG_KEY` is reserved but unused: current code reads no such variable and does not implement keyed log identifiers. Setting it does not redact platform logs.

Optional local verification/build controls are `CI=1`, `GATSBY_TELEMETRY_DISABLED=1`, `GATSBY_FEEDBACK_DISABLED=1`, and `GATSBY_CPU_COUNT=2`; apply only to the build process. `GATSBY_MUSIC_DRAFT_PREVIEW=1` and `SPOTIFY_LOCAL_CATALOGUE_PATH=<LOCAL_CATALOGUE_PATH>` belong to the older authored draft preview, not beta authentication. Keep that public catalogue projection separate from private beta evidence. Production builds leave draft preview disabled. Playwright optionally reads `BASE_URL` and `VERCEL_AUTOMATION_BYPASS_SECRET`; a bypass is not a beta credential and must never be saved in artefacts. This rehearsal uses neither live bypass values nor live owner data.

### Spotify dashboard and HTTPS origin

Before an authorised rehearsal, allowlist only the intended Spotify test users in the dashboard, including Hakim. Dashboard admission is separate from the app's five-owner count. Verify current Spotify account/development-mode eligibility and limits with the operator's app; local fixtures prove none of these external settings.

Register each exact callback, without a trailing slash:

```text
https://<PREVIEW_HOST>/api/music-portrait-auth-callback
https://<PRODUCTION_HOST>/api/music-portrait-auth-callback
```

The host must match that deployment's `MUSIC_PORTRAIT_SITE_ORIGIN`. Request Host/forwarded-host headers do not choose the callback. Use a stable preview hostname that can be registered exactly. Verify Vercel deep-link/function routing and any preview protection across Spotify's return journey. Never point a rehearsal at production storage or production credentials.

### Invitation command and handling

Only after explicit authority, inject the selected environment through an approved secret mechanism into a private shell and run the supported command:

```powershell
npm run music:invite -- "<NON_SENSITIVE_FRIEND_LABEL>"
```

Standalone Node scripts do not automatically load `.env.local`. This command writes a real private invite and prints its raw capability URL once to standard output (plus npm's command banner). Do not run it in captured logs, CI, shared terminals or a recorded session. Do not paste its output into Git, screenshots or this runbook. Deliver it only through a separately authorised private channel. The label is validated, not persisted. The invite expires after seven days and is single use; only its hash/expiry and eventual anonymous spent guard persist.

Outstanding invites can compete for the final place. Failure after consumption may spend an invite without returning a session, and successful owner creation followed by response loss can bind the account without browser access. Do not retry by deleting spent guards or tombstones. Existing accounts cannot sign in again through another invite. Returning-owner sign-in and reconnect are currently unimplemented, so session expiry, lost cookies and revoked credentials need an agreed recovery/product decision before widening the pilot.

## Preview rehearsal — all live steps unverified

Use an isolated preview owner/store, preserve read-only evidence without secrets, and stop if a prerequisite fails. A migrated Hakim preview needs an explicit migration plan: no automatic migration of authored content, old beta indices or live credentials is supplied here.

1. Connect through the authorised one-use invitation and Spotify consent. Confirm the exact redirect, narrow scope, secure cookies and query removal; confirm rejected/expired/replayed invites do not admit an account or disclose details.
2. Generate a private portrait. Check real three-window evidence, sparse outcomes, home-star identity, canonical Spotify attribution/links and private-store access. The first generation uses the manual refresh allowance.
3. Personalise pins, automatic/manual regions and notes; save, reload and check complete-map/dormant-choice preservation. Saving changes the private draft immediately. Review every saved note before sharing.
4. Publish only with specific publication authority. View the resulting unlisted URL in a fresh anonymous browser. Verify no owner cookie/API request/control, no capability in metadata, noindex/nofollow, no-referrer, and `Cache-Control: no-store` on the API. Check actual CDN behaviour as well as source headers.
5. Refresh on an eligible UTC date. Once shared, manual/scheduled refresh and link regeneration publish saved choices and notes. Verify last-success timestamps, retained pins, bounded arrivals and the previous public snapshot during an injected transient failure. Never force failures by exposing tokens or raw provider data.
6. Pause and confirm scheduled exclusion while the last shared snapshot stays readable. Manual refresh remains available, once per UTC calendar day including unsuccessful attempts. Resume explicitly and review the next scheduled publication consequence.
7. Regenerate the link with separate authority. Confirm the new saved portrait is published, the old link becomes generic not-found and a prepared-but-uncommitted link is unreadable. Test actual deployed deep links and no-store delivery.
8. Delete only the disposable rehearsal owner's data with explicit deletion authority. Confirm the acknowledgement, cookie expiry, all old links not-found and physical removal of owner/evidence/overrides/draft/snapshot/index records. Separately inspect the retained deletion marker and anonymous spent guard. Exercise controlled cleanup failure and operator retry before a live friend pilot.

Inspect desktop/mobile keyboard order, focus after successful/failed pending actions and later focus moves, Escape, reduced motion, artwork/catalogue failure, selected-song fallback and one explicit player. Test physical touch, assistive technology and Firefox/Safari separately. Local intercepted players do not establish audio, Spotify accounts, cookies or keyboard events inside the cross-origin player.

## Refresh and operational states

`vercel.json` schedules `/api/music-portrait-refresh-cron/` at `0 7 * * 1` (Monday 07:00 UTC). The existing public catalogue cron stays `/api/spotify-refresh/` at `0 6 * * *` (daily 06:00 UTC). The beta processes at most two owners concurrently and rechecks eligibility within each lease. Actual preview cron execution must be tested explicitly; configuration alone is not an execution record.

Due status follows the most recent Monday boundary using committed public/private snapshot timestamps. Paused, deleted and reconnect-required owners are excluded. Manual attempts reserve the UTC date before provider work, including failure; an owner may manually refresh while paused. Repeating within that UTC date returns 429, concurrent work may return busy/conflict.

Transient timeout/unavailable/rate-limit operations get at most three attempts; successful operations are retained. Ordinary waits are one then two seconds; valid Retry-After is honoured, and cooldowns beyond 30 seconds defer as `retry_pending`. There is no extra retry scheduler. Token rejection or top-list 401 marks `reconnect_required`; the UI truthfully states reconnect is unavailable. Other failures retain the last good portrait. A committed snapshot stays authoritative even when later owner bookkeeping or lease release fails. A newer private draft may coexist with an older public snapshot after a failed publication.

## Unpublication, deletion and recovery

The studio has no standalone unpublish control/API. Pause does not revoke a share. Rotation invalidates an old link while publishing a replacement. The current owner-facing way to unpublish without a replacement is confirmed deletion, which also removes app-held data. A trusted operator can use the existing store's `revokeShare` in a separately authorised recovery procedure, but no ready-made revocation CLI exists; do not invent a command or weaken guards.

Deletion waits up to 30 seconds for the owner lease, then reauthorises before writing the permanent tombstone and removing data. It rejects nested deletion. Partial failure reports no success and does not clear the cookie. The tombstone hides surviving public pointers and rejects late writes. It also prevents ordinary owner-session lookup, so further physical cleanup may require an authorised operator retry of `deleteOwnerData` against the exact owner/store. There is no supplied recovery CLI or automatic account recreation. Never delete a tombstone to make sign-in work.

Application deletion does not remove the Spotify dashboard allowlist entry or revoke Spotify-side access; the operator/user must separately handle those actions. It cannot remove viewer copies. A pointer deletion followed by index cleanup failure can leave an inert hashed index until republish or owner deletion; public visibility is already revoked. Immutable failed-publication candidates remain private until owner deletion.

Preserve the last good snapshot during incidents. Pause owners through authorised current sessions, or separately authorise disabling the weekly cron through platform/project configuration and deployment. There is no implemented global pause environment flag. Rolling back application deployment does not restore deleted records, rewind Blob writes or recover lost keys. There is no tested backup/restore or data migration procedure; do not promise one.

Blob leases depend on distributed atomic non-overwriting writes and read/list freshness. They have no expiry/takeover/fencing. Crash, ambiguous acknowledgement or failed release can orphan an owner or global admission lease. Before any separately authorised manual recovery, stop/quiesce all writers, identify the exact environment/lease and confirm no holder can resume. Never delete a lease on a timer while a writer may still run. Live guarantees and controlled failure/recovery remain gates, not locally established facts.

## Share keys, privacy and logs

Shares are 256-bit capability links: anyone holding/receiving one can view; noindex is not access control. The store persists hashes and a share version, not raw capabilities. Rotation commits the new authoritative index before old-pointer cleanup, invalidating the old link after success even if that cleanup fails.

Keep the session key stable. Changing it invalidates sessions/CSRF and changes derived owner link recovery; existing raw links may still resolve by stored hash until explicitly rotated/revoked. Key replacement alone is not a reliable share revocation procedure. Rehearse an explicit key/link migration before changing it. Runtime token decryption currently supplies only version 1, so blindly replacing the token key loses access to encrypted refresh credentials and in-flight OAuth state. No token re-encryption/key-ring migration tooling is supplied.

Application diagnostics use fixed operation/category labels or aggregate counts. Do not log raw access/refresh tokens, cookies, OAuth codes/state, invitations, share capabilities, Blob contents, top-item payloads, private evidence or owner notes. Review platform access logs, traces, error reporting, analytics, CDN behaviour and support tooling before a real invitation: capability paths/query strings and OAuth callback queries can leak outside application logs. A reserved log-key name provides no protection. Keep local/browser artefacts ignored and synthetic; inspect redacted/count-only scans rather than printing matches.

## Local commands and staged release gates

The verified command set is:

```powershell
npm run cv:check
npm run books:validate
npm run music:validate
npm run test:music
npm run clean
# Set CI=1, GATSBY_TELEMETRY_DISABLED=1, GATSBY_FEEDBACK_DISABLED=1,
# GATSBY_CPU_COUNT=2 for this build process only.
npm run build
# Restore the previous environment before browser checks.
npm run test:smoke
git diff --check
```

Use the installed Prettier in check mode on the exact changed-file manifest, including untracked candidate files. This repository's full smoke command covers the whole site, beyond music; report total passes/failures and intentional skips. Known bookshelf-cover/deprecation warnings are not hidden. Gatsby serve is the supported static server (`npm run serve -- --host 127.0.0.1 --port 9000`); it does not execute Vercel Functions. Local API fixtures prove contracts, not real deployment routing/storage.

Advance only through explicit gates: reviewed local candidate/runbook → authorised isolated preview configuration/deployment → migrated Hakim preview and lifecycle approval → separately authorised production release → separately authorised one-friend pilot → remaining three friends → two successful weekly cycles plus a controlled failure/recovery exercise. No step grants authority for the next. Returning-owner recovery and storage/logging prerequisites need an explicit resolution or accepted restriction before live expansion.

Recommended next action: obtain explicit authority for the reviewed branch commit and isolated preview deployment with preview-only environment values; production release and invitations stay separately gated.

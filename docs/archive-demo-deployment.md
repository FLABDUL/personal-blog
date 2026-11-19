# Archived interactive demos — deployment and rollback runbook

## Goals and boundaries

The original Period Place and Residue Lens production services were retired in November 2026. Their **independent static archive demos** may be published, but the retired databases, authentication, API, payment, data-refresh and moderation services must stay disabled.

| Demo | GitHub source | Static build | Canonical domain | Default Pages URL |
| --- | --- | --- | --- | --- |
| Period Place | [period-place](https://github.com/FLABDUL/period-place) | `demo/` (HTML, JavaScript, CSS and local vendor files) | `periodplace.org` | https://flabdul.github.io/period-place/ |
| Residue Lens | [residue-lens](https://github.com/FLABDUL/residue-lens) | `demo/dist/` (Vite + React, frozen data) | `residuelens.com` | https://flabdul.github.io/residue-lens/ |

Both are `noindex` and display archive disclosures. Period Place data is fictional, submitted reports are in page memory only, and Residue Lens data is frozen (not a current shopping or health service).

## Cutover checkpoint — 19 November 2026

- Both standalone GitHub Pages deployments and their local/live Playwright suites passed.
- DNS records on both apex hosts now have all four GitHub Pages IPv4 addresses; `www` CNAME targets `flabdul.github.io`. The original Google-verification TXT and CAA records remain. Registration and nameservers are unchanged on Vercel.
- Verified through a GitHub-hosted DNS/HTTP diagnostic: the correct demo HTML responds with 200 at the branded hostnames **only with TLS verification disabled**. This is not a launch-ready state.
- Authenticated GitHub Pages API reports both `cname` entries set correctly, `https_enforced: false`, and `https_certificate: null`. Do not merge the portfolio PR or advertise the branded HTTPS URLs until a correctly issued certificate is present on both apex and `www`.
- Vercel's DNS record-update API rejected changes to its ALIAS type; the previous apex ALIAS entries were displaced to inactive `legacy-vercel-apex` DNS names. The Residue Lens import added duplicate CAA entries and a wildcard CNAME; the legacy wildcard ALIAS was isolated at `legacy-vercel-wildcard`. These stale legacy records require a later DNS clean-up via the Vercel dashboard/CLI once the migration is stable; do not remove unrelated records.
- A quiet hourly conditional check, **Archive Demo HTTPS Watch**, was created for both public URLs. The release remains manual and gated. All unrelated portfolio and Strava production routing stays unchanged.

## Release gates

1. Both GitHub Pages repositories set **Settings → Pages → Source: GitHub Actions**.
2. Their `Publish ... archive demo` workflows report success for verify, deploy and **live browser smoke** (tests against the Pages URL, not merely local files).
3. In each repository's **Settings → Pages → Custom domain**, set the apex domain above and save. A DNS check may initially fail until DNS cutover; this is not permission to advertise the URL as working.
4. Validate browser coverage, mobile layout, accessibility, source attributions and the absence of backend POSTs.
5. Change Vercel DNS for each apex from its previous Vercel ALIAS target to GitHub Pages. GitHub's documented apex A records are:
   - `185.199.108.153`
   - `185.199.109.153`
   - `185.199.110.153`
   - `185.199.111.153`
6. Add `www` CNAME pointing to `flabdul.github.io` (no repository path). Verify `www` redirects to the chosen apex and that certificates are issued. Enforce HTTPS in GitHub Pages after issuance.
7. Preserve any unrelated Google verification TXT, CAA, existing service subdomain records and registrar settings. Do not recreate or reactivate former application services. Avoid changing `madebyhakim.com`, `www.madebyhakim.com` or `strava.madebyhakim.com`.
8. Only after both domains pass HTTPS and browser smoke, merge the portfolio integration PR, confirm production Vercel deployment, links and redirects.

## Portfolio integration

The portfolio project cards and case studies point to the two canonical URLs. Old embedded demo URLs in `personal-blog` redirect to the standalone hosts **only after the cutover**. Embedded demo files remain in the repository as local regression fixtures and emergency rollback assets.

## Rollback

If either domain fails, restore its apex DNS to the *verified, recorded* previous Vercel ALIAS target and remove the newly added GitHub A/CNAME records, leaving unrelated DNS intact. Keep or restore the older portfolio-host redirect and original embedded demo. If the portfolio integration was already merged, revert its link and redirect commit and deploy the prior known-good portfolio build.

Record before/after DNS values and actual responses (apex, www, HTTPS, assets, interactive flow). Do not assume a green build alone means a public hostname works.

## Source and hosting guidance

- https://docs.github.com/en/pages/configuring-a-custom-domain-for-your-github-pages-site/managing-a-custom-domain-for-your-github-pages-site
- https://docs.github.com/en/pages/getting-started-with-github-pages/configuring-a-publishing-source-for-your-github-pages-site

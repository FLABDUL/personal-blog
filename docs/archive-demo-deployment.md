# Archived interactive demos — deployment and rollback runbook

## Goals and boundaries

The original Period Place and Residue Lens production services were retired in November 2026. Their **independent static archive demos** may be published, but the retired databases, authentication, API, payment, data-refresh and moderation services must stay disabled.

| Demo | GitHub source | Static build | Canonical domain | Default Pages URL |
| --- | --- | --- | --- | --- |
| Period Place | [period-place](https://github.com/FLABDUL/period-place) | `demo/` (HTML, JavaScript, CSS and local vendor files) | `periodplace.org` | https://flabdul.github.io/period-place/ |
| Residue Lens | [residue-lens](https://github.com/FLABDUL/residue-lens) | `demo/dist/` (Vite + React, frozen data) | `residuelens.com` | https://flabdul.github.io/residue-lens/ |

Both are `noindex` and display archive disclosures. Period Place data is fictional, submitted reports are in page memory only, and Residue Lens data is frozen (not a current shopping or health service).

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

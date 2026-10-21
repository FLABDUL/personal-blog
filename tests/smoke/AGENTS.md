# Smoke-test conventions

- These tests run both after a local build and against a deployed `BASE_URL`. A deployment-only runner has no `public/` directory: use the Playwright `request` fixture to inspect deployed HTML and assets, retaining the configured authentication headers.
- Before programmatic focus and keyboard activation of a JavaScript-dependent control, assert that it is enabled. `locator.focus()` does not wait for hydration. Do not replace readiness checks with fixed sleeps or extra retries.
- Controls requiring JavaScript should remain disabled until their handlers are ready. Keep the delayed-script tests for theme and print controls to exercise this loading boundary.
- Report locally stubbed API checks separately from live deployment checks. Never weaken Preview protection to make a test pass.
- Image-loading sweeps that scroll images must select visible images. Theme and responsive variants can deliberately hide their counterparts; verify those variants by activating each theme/viewport in a dedicated check, rather than trying to scroll hidden elements.
- Set `SMOKE_ENV=preview` or `SMOKE_ENV=production` explicitly when testing a deployed `BASE_URL`. Use the deployment environment name; Vercel's GitHub `production_environment` boolean has been false even for Production. Local checks may inherit `VERCEL_ENV` from the build command.
- Keep shared-route tests in both modes. Preview checks require real 200 responses; production checks must verify review routes, page data, artwork and navigation are absent. Never count a styled 404 as a passing page check.
- Check contrast on actual keyboard-focused controls in both themes; an unfocused Axe scan does not cover authored focus outlines.

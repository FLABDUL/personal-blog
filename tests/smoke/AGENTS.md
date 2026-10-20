# Smoke-test conventions

- These tests run both after a local build and against a deployed `BASE_URL`. A deployment-only runner has no `public/` directory: use the Playwright `request` fixture to inspect deployed HTML and assets, retaining the configured authentication headers.
- Before programmatic focus and keyboard activation of a JavaScript-dependent control, assert that it is enabled. `locator.focus()` does not wait for hydration. Do not replace readiness checks with fixed sleeps or extra retries.
- Controls requiring JavaScript should remain disabled until their handlers are ready. Keep the delayed-script tests for theme and print controls to exercise this loading boundary.
- Report locally stubbed API checks separately from live deployment checks. Never weaken Preview protection to make a test pass.

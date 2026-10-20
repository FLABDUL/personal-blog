const { test, expect } = require("@playwright/test")
const AxeBuilder = require("@axe-core/playwright").default

test.beforeEach(async ({ page }) => {
  const leetcode = require("../../content/leetcode.json")
  await page.route("**/api/leetcode", route =>
    route.fulfill({
      json: {
        username: leetcode.username,
        profileUrl: leetcode.profileUrl,
        ...leetcode.fallback,
        source: "fallback",
        updatedAt: null,
      },
    }),
  )
  await page.route("**/api/spotify-catalogue", route =>
    route.fulfill({ json: { status: "unavailable" } }),
  )
  await page.emulateMedia({ reducedMotion: "reduce" })
})

const routes = [
  "/",
  "/blog/",
  "/projects/",
  "/experience/",
  "/studio/",
  "/bookshelf/",
  "/music/",
  "/review/",
  "/review/about-table/",
  "/review/studio-daylight/",
]
for (const width of [390, 1440]) {
  for (const route of routes) {
    test(`${route} has no detected WCAG A/AA violations at ${width}px`, async ({
      page,
    }) => {
      await page.setViewportSize({ width, height: 900 })
      await page.goto(route)
      const scan = await new AxeBuilder({ page })
        .withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa", "wcag22aa"])
        .analyze()
      expect(
        scan.violations.map(item => ({
          id: item.id,
          impact: item.impact,
          nodes: item.nodes.map(node => ({
            target: node.target,
            summary: node.failureSummary,
          })),
        })),
      ).toEqual([])
    })
  }
}
for (const [route, trigger] of [
  ["/studio/", "View inferno"],
  ["/bookshelf/", "Dune Frank Herbert Other"],
]) {
  test(`${route} detail dialog has no detected WCAG A/AA violations`, async ({
    page,
  }) => {
    await page.goto(route)
    await page.getByRole("button", { name: trigger, exact: true }).click()
    await expect(page.getByRole("dialog")).toBeVisible()
    const scan = await new AxeBuilder({ page })
      .withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa", "wcag22aa"])
      .analyze()
    expect(
      scan.violations.map(item => ({
        id: item.id,
        nodes: item.nodes.map(node => node.target),
      })),
    ).toEqual([])
  })
}

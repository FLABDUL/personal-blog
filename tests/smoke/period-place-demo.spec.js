const { test, expect } = require("@playwright/test")

test("Period Place demo filters, explains evidence and simulates moderation", async ({
  page,
  request,
}) => {
  const posts = []
  page.on("request", request => {
    const url = new URL(request.url())
    // Vercel injects preview-toolbar authentication independently of this demo.
    const previewLogin = process.env.SMOKE_ENV?.toLowerCase() === "preview" && url.origin === "https://vercel.live" && url.pathname === "/login/validate"
    if (request.method() === "POST" && !previewLogin) posts.push(request.url())
  })
  await page.goto("/demos/period-place/")
  const css = await request.get('/demos/period-place/demo.css')
  expect(css.status()).toBe(200)
  expect(css.headers()['content-type']).toContain('text/css')
  const search = page.getByLabel("Place, venue or product")
  await expect(search).toBeEnabled()
  await expect(page.locator("#count")).toHaveText("4 matching sample venues")
  await page.getByRole("button", { name: "Reusable pads", exact: true }).click()
  await expect(page.locator("#count")).toHaveText("2 matching sample venues")
  await search.fill("Riverside")
  await expect(page.locator("#count")).toHaveText("0 matching sample venues")
  await page.getByRole("button", { name: "Clear search and filters" }).click()
  await page
    .getByRole("button", { name: "Show Meadow Community Hub on map" })
    .click()
  await expect(page.locator("#detail")).toContainText(
    "individual venue has not been checked",
  )
  await page
    .getByRole("button", { name: "Simulate submitting a report" })
    .click()
  await expect(page.locator("#report-status")).toContainText(
    "pending moderator review",
  )
  await expect(page.locator("#report-status")).toContainText(
    "Nothing was sent or saved",
  )
  expect(posts).toEqual([])
  await page.setViewportSize({ width: 390, height: 844 })
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true)
  await page.screenshot({
    path: "test-results/period-place-demo-mobile.png",
    fullPage: true,
  })
})

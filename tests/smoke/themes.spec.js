const { test, expect } = require("@playwright/test")
const AxeBuilder = require("@axe-core/playwright").default
const fs = require("node:fs")
const path = require("node:path")

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

for (const theme of ["light", "dark"]) {
  for (const width of [390, 1440]) {
    for (const route of [
      "/",
      "/blog/",
      "/projects/",
      "/experience/",
      "/bookshelf/",
      "/studio/",
      "/music/",
      "/projects/budget-v2/",
      "/projects/backtest-library/",
      "/review/",
      "/review/about-table/",
      "/review/studio-daylight/",
      "/music/case-study/",
      "/blog/how-i-built-this-blog/",
    ]) {
      test(`${theme} ${route} is readable and fits ${width}px`, async ({
        page,
      }) => {
        await page.setViewportSize({ width, height: 900 })
        await page.addInitScript(
          value => localStorage.setItem("madebyhakim-theme", value),
          theme,
        )
        await page.goto(route)
        await expect(
          page.getByRole("button", {
            name: theme === "light" ? "Light" : "Dark",
            exact: true,
          }),
        ).toHaveAttribute("aria-pressed", "true")
        const scan = await new AxeBuilder({ page })
          .withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa", "wcag22aa"])
          .analyze()
        expect(
          scan.violations.map(item => ({
            id: item.id,
            nodes: item.nodes.map(node => ({
              target: node.target,
              summary: node.failureSummary,
            })),
          })),
        ).toEqual([])
        expect(
          await page.evaluate(
            () => document.documentElement.scrollWidth <= innerWidth,
          ),
        ).toBe(true)
        if (
          [
            "/",
            "/studio/",
            "/projects/budget-v2/",
            "/projects/backtest-library/",
          ].includes(route)
        ) {
          for (const img of await page.locator("main img").all()) {
            await img.scrollIntoViewIfNeeded()
            await expect
              .poll(() =>
                img.evaluate(el => el.complete && el.naturalWidth > 0),
              )
              .toBe(true)
          }
          await page.locator(".masthead").scrollIntoViewIfNeeded()
          const file = path.resolve(
            "output/reinvention",
            `theme-${theme}-${route.replaceAll("/", "-")}-${width}`,
          )
          fs.mkdirSync(path.dirname(file), { recursive: true })
          await page.screenshot({ path: `${file}.png`, fullPage: true })
          await page.screenshot({ path: `${file}-viewport.png` })
        }
      })
    }
  }
}

test("theme choice works by keyboard, follows navigation and survives reload", async ({
  page,
}) => {
  await page.goto("/")
  const dark = page.getByRole("button", { name: "Dark", exact: true })
  await dark.focus()
  await page.keyboard.press("Enter")
  await expect(dark).toHaveAttribute("aria-pressed", "true")
  await page
    .getByRole("navigation", { name: "Primary navigation" })
    .getByRole("link", { name: "Bookshelf" })
    .click()
  await expect(page.locator("html")).toHaveAttribute("data-theme", "dark")
  await page.reload()
  await expect(
    page.getByRole("button", { name: "Dark", exact: true }),
  ).toHaveAttribute("aria-pressed", "true")
  await page.getByRole("button", { name: "Light", exact: true }).click()
  await page
    .getByRole("navigation", { name: "Primary navigation" })
    .getByRole("link", { name: "Studio" })
    .click()
  await expect(page.locator("html")).toHaveAttribute("data-theme", "light")
  await expect(
    page.getByRole("button", { name: "Light", exact: true }),
  ).toHaveAttribute("aria-pressed", "true")
})

for (const theme of ["light", "dark"]) {
  for (const [route, trigger] of [
    ["/studio/", "View inferno"],
    ["/bookshelf/", "Dune Frank Herbert Other"],
  ]) {
    test(`${theme} ${route} detail dialog remains readable`, async ({
      page,
    }) => {
      await page.addInitScript(
        value => localStorage.setItem("madebyhakim-theme", value),
        theme,
      )
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
}

test("disabled storage does not prevent theme controls or navigation", async ({
  page,
}) => {
  await page.addInitScript(() =>
    Object.defineProperty(window, "localStorage", {
      get() {
        throw new Error("Storage disabled")
      },
    }),
  )
  const errors = []
  page.on("pageerror", error => errors.push(error.message))
  await page.goto("/")
  await page.getByRole("button", { name: "Dark", exact: true }).click()
  await page
    .getByRole("navigation", { name: "Primary navigation" })
    .getByRole("link", { name: "Studio" })
    .click()
  await expect(page.locator("html")).toHaveAttribute("data-theme", "dark")
  await page.getByRole("button", { name: "Light", exact: true }).click()
  await expect(page.locator("html")).toHaveAttribute("data-theme", "light")
  expect(errors).toEqual([])
})

test("stored theme is applied before hydration and print stays light", async ({
  page,
}) => {
  await page.addInitScript(() =>
    localStorage.setItem("madebyhakim-theme", "dark"),
  )
  await page.route("**/*.js", route => route.abort())
  await page.goto("/experience/")
  await expect(page.locator("html")).toHaveAttribute("data-theme", "dark")
  await page.emulateMedia({ media: "print" })
  await expect(page.locator(".site-shell")).toHaveCSS(
    "background-color",
    "rgb(255, 255, 255)",
  )
})

for (const route of ["/projects/budget-v2/", "/projects/backtest-library/"]) {
  test(`${route} study index reaches the evidence and boundaries at 320px`, async ({
    page,
  }) => {
    await page.setViewportSize({ width: 320, height: 844 })
    await page.goto(route)
    await page
      .getByRole("navigation", { name: "In this study" })
      .getByRole("link", { name: /The evidence/ })
      .click()
    await expect(
      page.locator(".engineering-study__evidence-item").first(),
    ).toBeInViewport()
    await page
      .getByRole("navigation", { name: "In this study" })
      .getByRole("link", { name: /The boundaries/ })
      .click()
    await expect(
      page.getByRole("heading", { name: "What this does not claim" }),
    ).toBeInViewport()
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ),
    ).toBe(true)
  })
}

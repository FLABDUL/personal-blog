const { test, expect } = require("@playwright/test")
const AxeBuilder = require("@axe-core/playwright").default
const fs = require("node:fs")
const path = require("node:path")
const { reviewEnabled, reviewPaths } = require("./helpers/environment")

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
      ...(reviewEnabled ? reviewPaths : []),
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
        const response = await page.goto(route)
        expect(response.status(), route).toBe(200)
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
            "/music/",
            "/review/logos/",
            "/projects/budget-v2/",
            "/projects/backtest-library/",
          ].includes(route)
        ) {
          for (const img of await page.locator("main img:visible").all()) {
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

for (const theme of ["light", "dark"]) {
  test(`${theme} keyboard focus stays visible on collection controls`, async ({
    page,
  }) => {
    await page.addInitScript(
      value => localStorage.setItem("madebyhakim-theme", value),
      theme,
    )
    for (const [route, selector] of [
      ["/bookshelf/", ".bookshelf-filter"],
      ["/blog/", ".blog-card"],
      ["/blog/how-i-built-this-blog/", ".blog-post__back"],
      [
        "/projects/",
        ".project-button, .project-card__media, .project-card h2 a",
      ],
    ]) {
      await page.goto(route)
      await expect(
        page.getByRole("button", { name: "Light", exact: true }),
      ).toBeEnabled()
      await page.keyboard.press("Tab")
      for (const control of await page.locator(selector).all()) {
        await expect(control).toBeEnabled()
        await control.focus()
        await expect(control).toBeFocused()
        const focus = await control.evaluate(element => {
          const rgba = value => {
            const channels = value.match(/[\d.]+/g).map(Number)
            return [...channels.slice(0, 3), channels[3] ?? 1]
          }
          const over = (foreground, background) =>
            foreground
              .slice(0, 3)
              .map(
                (channel, index) =>
                  channel * foreground[3] +
                  background[index] * (1 - foreground[3]),
              )
          const luminance = colour =>
            colour
              .map(channel => {
                const value = channel / 255
                return value <= 0.04045
                  ? value / 12.92
                  : ((value + 0.055) / 1.055) ** 2.4
              })
              .reduce(
                (sum, value, index) =>
                  sum + value * [0.2126, 0.7152, 0.0722][index],
                0,
              )
          const ancestors = []
          for (
            let parent = element.parentElement;
            parent;
            parent = parent.parentElement
          ) {
            ancestors.unshift(parent)
          }
          const background = ancestors.reduce(
            (colour, parent) =>
              over(rgba(getComputedStyle(parent).backgroundColor), colour),
            [255, 255, 255],
          )
          const style = getComputedStyle(element)
          const light = [
            luminance(background),
            luminance(over(rgba(style.outlineColor), background)),
          ]
          return {
            visible:
              element.matches(":focus-visible") &&
              style.outlineStyle !== "none",
            width: parseFloat(style.outlineWidth),
            contrast: (Math.max(...light) + 0.05) / (Math.min(...light) + 0.05),
          }
        })
        expect(focus.visible, `${route} ${selector}`).toBe(true)
        expect(focus.width).toBeGreaterThanOrEqual(2)
        expect(focus.contrast, `${route} ${selector}`).toBeGreaterThanOrEqual(3)
      }
      if (route === "/bookshelf/") {
        await page.screenshot({
          path: `output/reinvention/release-fixes/focus-${theme}.png`,
        })
      }
    }
  })
}

test("theme choice works by keyboard, follows navigation and survives reload", async ({
  page,
}) => {
  await page.goto("/")
  const dark = page.getByRole("button", { name: "Dark", exact: true })
  await expect(dark).toBeEnabled()
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

for (const [route, label] of [
  ["/", "Dark"],
  ["/experience/", "Print / Save as PDF"],
]) {
  test(`${label} waits for JavaScript before accepting input`, async ({
    page,
  }) => {
    let releaseScripts
    const scriptsReady = new Promise(resolve => {
      releaseScripts = resolve
    })
    await page.addInitScript(() => {
      window.print = () => {
        window.__printRequested = true
      }
    })
    await page.route("**/*.js", async route => {
      await scriptsReady
      await route.continue()
    })
    try {
      await page.goto(route, { waitUntil: "commit" })
      const control = page.getByRole("button", { name: label, exact: true })
      await expect(control).toBeVisible()
      await expect(control).toBeDisabled()
      releaseScripts()
      await expect(control).toBeEnabled()
      await control.click()
      if (label === "Dark") {
        await expect(page.locator("html")).toHaveAttribute("data-theme", "dark")
      } else {
        await expect
          .poll(() => page.evaluate(() => window.__printRequested))
          .toBe(true)
      }
    } finally {
      releaseScripts()
    }
  })
}

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

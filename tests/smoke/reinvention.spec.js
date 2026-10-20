const { test, expect } = require("@playwright/test")
const fs = require("node:fs")
const path = require("node:path")
const books = require("../../content/books.json")
const studio = require("../../content/studio/items.json")

test.beforeEach(async ({ page }) => {
  if (!process.env.BASE_URL) {
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
  }
})

for (const width of [390, 1440]) {
  for (const route of [
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
  ]) {
    test(`${route} fits ${width}px and exposes navigation`, async ({
      page,
    }) => {
      await page.setViewportSize({ width, height: 960 })
      await page.goto(route)
      await expect(page.getByRole("heading", { level: 1 })).toHaveCount(1)
      await expect(
        page
          .getByRole("navigation", { name: "Primary navigation" })
          .getByRole("link"),
      ).toHaveCount(7)
      const overflow = await page.evaluate(() =>
        [...document.querySelectorAll("main *")]
          .filter(el => {
            const r = el.getBoundingClientRect()
            const style = getComputedStyle(el)
            return (
              r.width > 0 &&
              style.position !== "fixed" &&
              (r.right > innerWidth + 2 || r.left < -2)
            )
          })
          .map(el => el.className?.baseVal || el.className)
          .slice(0, 10),
      )
      expect(overflow).toEqual([])
      const destination = path.resolve(
        "output/reinvention",
        `${route.replaceAll("/", "-") || "home"}-${width}.png`,
      )
      fs.mkdirSync(path.dirname(destination), { recursive: true })
      for (const img of await page.locator("main img").all()) {
        await img.scrollIntoViewIfNeeded()
        await expect
          .poll(() => img.evaluate(el => el.complete && el.naturalWidth > 0))
          .toBeTruthy()
      }
      await page.locator("header.masthead").scrollIntoViewIfNeeded()
      await page.screenshot({ path: destination, fullPage: true })
      await page.screenshot({
        path: destination.replace(".png", "-viewport.png"),
      })
    })
  }
}

test("bookshelf searches, filters, switches view and restores keyboard focus", async ({
  page,
}) => {
  await page.goto("/bookshelf/")
  await expect(page.locator(".library-book")).toHaveCount(books.length)
  await page.getByRole("searchbox", { name: "Find a book" }).fill("Clean")
  await expect(page.locator(".library-book")).toHaveCount(2)
  await page.getByRole("button", { name: "Index", exact: true }).click()
  await expect(page.locator(".library-books")).toHaveClass(/--index/)
  const book = page.getByRole("button", {
    name: /^Clean Code Robert C. Martin/,
  })
  await book.focus()
  await page.keyboard.press("Enter")
  const dialog = page.getByRole("dialog", { name: "Clean Code", exact: true })
  await expect(dialog).toBeVisible()
  await expect(
    page.getByRole("button", { name: "Close details", exact: true }),
  ).toBeFocused()
  await page.keyboard.press("Tab")
  await expect(
    page.getByRole("button", { name: "Close details", exact: true }),
  ).toBeFocused()
  await page.keyboard.press("Escape")
  await expect(dialog).toHaveCount(0)
  await expect(book).toBeFocused()
  await page.getByRole("searchbox").fill("no such book 123")
  await expect(
    page.getByRole("heading", { name: "No books found." }),
  ).toBeVisible()
  await page.getByRole("button", { name: "Show all books" }).click()
  await page
    .getByRole("button", { name: "Software Engineering", exact: true })
    .click()
  await expect(page.locator(".library-book")).toHaveCount(4)
})

test("book hashes open a real detail view and browser Back closes it", async ({
  page,
}) => {
  await page.goto("/bookshelf/#dune")
  await expect(
    page.getByRole("dialog", { name: "Dune", exact: true }),
  ).toBeVisible()
  await page.keyboard.press("Escape")
  await expect(page).toHaveURL(/\/bookshelf\/$/)
  await page.getByRole("button", { name: /^Maus Art Spiegelman/ }).click()
  await expect(page).toHaveURL(/#maus$/)
  await page.goBack()
  await expect(page.getByRole("dialog")).toHaveCount(0)
})

test("closing a book does not leave an empty history entry", async ({
  page,
}) => {
  await page.goto("/blog/")
  await page
    .getByRole("navigation", { name: "Primary navigation" })
    .getByRole("link", { name: "Bookshelf", exact: true })
    .click()
  await page.getByRole("button", { name: /^Dune Frank Herbert/ }).click()
  await page.getByRole("button", { name: "Close details" }).click()
  await expect(page).toHaveURL(/\/bookshelf\/$/)
  await page.goBack()
  await expect(page).toHaveURL(/\/blog\/$/)
})

test("touch controls open and close both collections", async ({
  browser,
  baseURL,
}) => {
  const context = await browser.newContext({
    viewport: { width: 390, height: 844 },
    hasTouch: true,
    isMobile: true,
    baseURL,
  })
  const page = await context.newPage()
  for (const [route, label] of [
    ["/bookshelf/", /^Dune Frank Herbert/],
    ["/studio/", "View inferno"],
  ]) {
    await page.goto(route)
    await page.getByRole("button", { name: label }).tap()
    await expect(page.getByRole("dialog")).toBeVisible()
    await page.getByRole("button", { name: "Close details" }).tap()
    await expect(page.getByRole("dialog")).toHaveCount(0)
  }
  await context.close()
})

for (const width of [320, 768]) {
  test(`main sections reflow at ${width}px`, async ({ page }) => {
    await page.setViewportSize({ width, height: 900 })
    for (const route of [
      "/",
      "/blog/",
      "/projects/",
      "/experience/",
      "/studio/",
      "/bookshelf/",
      "/music/",
    ]) {
      await page.goto(route)
      expect(
        await page.evaluate(
          () => document.documentElement.scrollWidth <= innerWidth + 1,
        ),
        route,
      ).toBe(true)
    }
  })
}

for (const route of ["/studio/", "/review/studio-daylight/"]) {
  test(`${route} shows only published art and provides a keyboard lightbox`, async ({
    page,
  }) => {
    await page.goto(route)
    await expect(page.locator(".art-button")).toHaveCount(9)
    await expect(page.locator("main")).not.toContainText(
      /Pottery Practice|Sunset over Dune/,
    )
    const work = page.getByRole("button", { name: "View inferno", exact: true })
    await work.focus()
    await page.keyboard.press("Enter")
    await expect(page.getByRole("dialog", { name: "inferno" })).toBeVisible()
    await page.getByRole("button", { name: "Next painting" }).click()
    await expect(
      page
        .getByRole("dialog", { name: "pulse", exact: true })
        .getByRole("heading", { name: "pulse", exact: true }),
    ).toBeVisible()
    await page.keyboard.press("ArrowLeft")
    await expect(page.getByRole("dialog", { name: "inferno" })).toBeVisible()
    await page.keyboard.press("Escape")
    await expect(work).toBeFocused()
  })
}

test("reduced motion and skip navigation remain useful", async ({ page }) => {
  await page.emulateMedia({ reducedMotion: "reduce" })
  await page.goto("/")
  await page.keyboard.press("Tab")
  await expect(
    page.getByRole("link", { name: "Skip to content" }),
  ).toBeFocused()
  await page.keyboard.press("Enter")
  await expect(page.locator("main")).toBeFocused()
  await expect(page.locator(".home-intro__type")).toHaveCSS(
    "animation-name",
    "none",
  )
  await expect(page.locator(".home-art-note")).toHaveCSS(
    "transition-duration",
    "0s",
  )
})

for (const viewport of [
  { width: 1280, height: 720 },
  { width: 390, height: 844 },
]) {
  test(`Studio controls fit a ${viewport.width}x${viewport.height} dialog`, async ({
    page,
  }) => {
    await page.setViewportSize(viewport)
    await page.goto("/studio/")
    await page
      .getByRole("button", { name: "View inferno", exact: true })
      .click()
    const dialog = page.getByRole("dialog")
    const controls = dialog.getByRole("button", { name: "Next painting" })
    await expect(controls).toBeInViewport({ ratio: 1 })
    await expect(
      dialog.getByRole("heading", { name: "inferno" }),
    ).toBeInViewport({ ratio: 1 })
    await page.screenshot({
      path: `output/reinvention/studio-dialog-${viewport.width}.png`,
    })
  })
}

test("Experience retains its print action and readable print styling", async ({
  page,
}) => {
  await page.addInitScript(() => {
    window.print = () => {
      window.__printRequested = true
    }
  })
  await page.goto("/experience/")
  await page.getByRole("button", { name: "Print / Save as PDF" }).click()
  await expect
    .poll(() => page.evaluate(() => window.__printRequested))
    .toBe(true)
  await page.emulateMedia({ media: "print" })
  await expect(page.locator(".masthead")).toBeHidden()
  await expect(page.locator(".review-ribbon")).toBeHidden()
  await expect(page.getByRole("heading", { level: 1 })).toBeVisible()
  await page.screenshot({ path: "output/reinvention/experience-print.png" })
})

test("review pages are labelled, clickable and noindexed", async ({ page }) => {
  await page.goto("/review/")
  await expect(page.locator('meta[name="robots"]')).toHaveAttribute(
    "content",
    "noindex",
  )
  await page.getByRole("link", { name: /Try the alternative About/ }).click()
  await expect(page).toHaveURL(/\/review\/about-table\/$/)
  await page.getByRole("link", { name: "← Back to design review" }).click()
  await page.getByRole("link", { name: /Visit the alternative Studio/ }).click()
  await expect(page).toHaveURL(/\/review\/studio-daylight\/$/)
})

test("built output excludes draft art and contains only published Studio metadata", async ({
  request,
}) => {
  expect(studio.items.every(item => item.status === "published")).toBe(true)
  for (const name of ["fox.jpg", "pottery.jpg"]) {
    if (process.env.BASE_URL) {
      const response = await request.get(`/art/${name}`)
      expect(response.status()).toBe(404)
    } else {
      expect(fs.existsSync(path.resolve("public/art", name))).toBe(false)
    }
  }
  let page
  if (process.env.BASE_URL) {
    const response = await request.get("/studio/")
    expect(response.status()).toBe(200)
    page = await response.text()
  } else {
    page = fs.readFileSync("public/studio/index.html", "utf8")
  }
  expect(page).toContain("View inferno")
  expect(page).not.toMatch(
    /Pottery Practice|Sunset over Dune|fox\.jpg|pottery\.jpg/,
  )
})

test("generated pages reference one current shared stylesheet", async ({
  request,
}) => {
  if (process.env.BASE_URL) {
    const routes = [
      "/",
      "/blog/",
      "/projects/",
      "/experience/",
      "/studio/",
      "/bookshelf/",
      "/music/",
      "/projects/budget-v2/",
      "/projects/backtest-library/",
    ]
    const styles = await Promise.all(
      routes.map(async route => {
        const response = await request.get(route)
        expect(response.status(), route).toBe(200)
        const html = await response.text()
        const stylesheet = html.match(/styles\.[a-z0-9]+\.css/)?.[0]
        expect(stylesheet, route).toBeTruthy()
        return stylesheet
      }),
    )
    expect(new Set(styles).size).toBe(1)
    const response = await request.get(`/${styles[0]}`)
    expect(response.status()).toBe(200)
    expect(response.headers()["content-type"]).toContain("text/css")
    return
  }
  const output = path.resolve("public")
  const styles = fs
    .readdirSync(output)
    .filter(name => /^styles\..+\.css$/.test(name))
  expect(styles).toHaveLength(1)
  const pages = fs
    .readdirSync(output, { recursive: true })
    .filter(name => name.endsWith("index.html"))
  expect(pages.length).toBeGreaterThan(10)
  for (const name of pages) {
    const html = fs.readFileSync(path.join(output, name), "utf8")
    expect(html.match(/styles\.[a-z0-9]+\.css/)?.[0], name).toBe(styles[0])
  }
})

test("production and disabled-review guards remove experiment routes", () => {
  const { onCreatePage } = require("../../gatsby-node")
  const previous = process.env.VERCEL_ENV
  const review = require("../../config/design-review.json")
  const wasEnabled = review.enabled
  const deleted = []
  const actions = { deletePage: page => deleted.push(page.path) }
  try {
    process.env.VERCEL_ENV = "production"
    onCreatePage({ page: { path: "/review/" }, actions })
    onCreatePage({ page: { path: "/" }, actions })
    process.env.VERCEL_ENV = "preview"
    review.enabled = false
    onCreatePage({ page: { path: "/review/about-table/" }, actions })
    expect(deleted).toEqual(["/review/", "/review/about-table/"])
  } finally {
    review.enabled = wasEnabled
    if (previous === undefined) delete process.env.VERCEL_ENV
    else process.env.VERCEL_ENV = previous
  }
})

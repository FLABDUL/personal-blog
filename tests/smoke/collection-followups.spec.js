const { test, expect } = require("@playwright/test")
const fs = require("node:fs")
const path = require("node:path")
const React = require("react")
const { renderToStaticMarkup } = require("react-dom/server")
const { transformFileSync } = require("@babel/core")
const Ajv = require("ajv")
const AxeBuilder = require("@axe-core/playwright").default
const books = require("../../content/books.json")

test("an omitted book cover remains valid and renders title and author in both views", () => {
  const book = { ...books.find(item => item.id === "dune") }
  delete book.cover
  const validate = new Ajv().compile(require("../../content/books.schema.json"))
  expect(validate([book])).toBe(true)
  const { code } = transformFileSync(
    path.resolve("src/components/BookCover.js"),
    {
      babelrc: false,
      configFile: false,
      plugins: [
        "@babel/plugin-transform-react-jsx",
        "@babel/plugin-transform-modules-commonjs",
      ],
    },
  )
  const component = { exports: {} }
  // Compile only the local component, without a Gatsby build or a public test route.
  new Function("require", "module", "exports", code)(
    require,
    component,
    component.exports,
  )
  for (const detail of [false, true]) {
    const html = renderToStaticMarkup(
      React.createElement(component.exports.default, { book, detail }),
    )
    expect(html).not.toContain("<img")
    expect(html).toContain("Cover unavailable")
    expect(html).toContain(book.title)
    expect(html).toContain(book.author)
  }
})

for (const theme of ["light", "dark"]) {
  for (const width of [390, 1440]) {
    test(`unavailable book cover stays usable in ${theme} at ${width}px`, async ({
      page,
    }) => {
      await page.setViewportSize({ width, height: 900 })
      const book = books.find(item => item.id === "dune")
      await page.route(`**${book.cover}`, route =>
        route.fulfill({ status: 404, body: "Not found" }),
      )
      await page.goto("/bookshelf/")
      await page
        .getByRole("button", {
          name: theme === "light" ? "Light" : "Dark",
          exact: true,
        })
        .click()
      const opener = page.getByRole("button", { name: /^Dune Frank Herbert/ })
      await opener.scrollIntoViewIfNeeded()
      await expect(opener.locator(".book-cover-fallback")).toContainText("Dune")
      await expect(opener.locator(".book-cover-fallback")).toContainText(
        "Frank Herbert",
      )
      await expect(opener.locator("img")).toHaveCount(0)
      await opener.focus()
      await page.keyboard.press("Enter")
      const dialog = page.getByRole("dialog", { name: "Dune", exact: true })
      await expect(dialog.locator(".book-cover-fallback")).toContainText(
        "Cover unavailable",
      )
      await expect(
        dialog.getByRole("heading", { name: "Dune", exact: true }),
      ).toBeVisible()
      await expect(dialog.locator("img")).toHaveCount(0)
      const scan = await new AxeBuilder({ page })
        .withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa", "wcag22aa"])
        .analyze()
      expect(
        scan.violations.map(item => ({
          id: item.id,
          nodes: item.nodes.map(node => node.target),
        })),
      ).toEqual([])
      expect(
        await dialog.evaluate(el => el.scrollWidth <= el.clientWidth + 1),
      ).toBe(true)
      fs.mkdirSync("output/reinvention/followups", { recursive: true })
      await page.screenshot({
        path: `output/reinvention/followups/book-fallback-${theme}-${width}.png`,
      })
      await page.keyboard.press("Escape")
      await expect(opener).toBeFocused()
      await page.screenshot({
        path: `output/reinvention/followups/book-shelf-${theme}-${width}.png`,
      })
      await page.getByRole("button", { name: "Index", exact: true }).click()
      await expect(opener).toBeVisible()
      await opener.click()
      await expect(
        page.getByRole("dialog", { name: "Dune", exact: true }),
      ).toBeVisible()
    })
  }
}

test.describe("Studio image delivery", () => {
  test.use({ viewport: { width: 412, height: 823 }, deviceScaleFactor: 1.75 })
  test("mobile gallery uses lighter artwork while the viewer retains detail", async ({
    page,
    request,
  }) => {
    await page.goto("/studio/")
    const opener = page.getByRole("button", {
      name: "View inferno",
      exact: true,
    })
    const image = opener.locator("img")
    await expect
      .poll(() =>
        image.evaluate(
          el => el.complete && el.naturalWidth > 0 && el.currentSrc,
        ),
      )
      .toMatch(/inferno-720\.avif$/)
    const asset = await request.get(await image.evaluate(el => el.currentSrc))
    expect(asset.status()).toBe(200)
    expect((await asset.body()).length).toBeLessThan(100_000)
    const fallback = await request.get("/design/art/inferno-720.webp")
    expect(fallback.status()).toBe(200)
    await opener.click()
    const detail = page.getByRole("dialog").locator("img")
    await expect
      .poll(() => detail.evaluate(el => el.complete && el.naturalWidth))
      .toBe(1000)
    await expect(detail).toHaveAttribute("src", "/design/art/inferno.webp")
    await expect(detail).not.toHaveAttribute("srcset")
  })
})

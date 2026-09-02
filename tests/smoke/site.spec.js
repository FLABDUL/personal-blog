const { test, expect } = require("@playwright/test")

const routes = [
  { path: "/", heading: "About Me" },
  { path: "/blog/", heading: "Blog" },
  { path: "/bookshelf/", heading: "Bookshelf" },
  { path: "/studio/", heading: "Studio" },
]

function monitorPage(page) {
  const errors = []

  page.on("pageerror", error => errors.push(error.message))
  page.on("console", message => {
    if (message.type() === "error") errors.push(message.text())
  })

  return errors
}

for (const route of routes) {
  test(`${route.path} renders its primary content`, async ({ page }) => {
    const errors = monitorPage(page)
    const response = await page.goto(route.path, {
      waitUntil: "domcontentloaded",
    })

    expect(response?.ok()).toBeTruthy()
    await expect(
      page.getByRole("heading", { level: 1, name: route.heading })
    ).toBeVisible()
    await expect(page.locator("body")).not.toBeEmpty()
    await expect(page.locator("#gatsby-error-overlay")).toHaveCount(0)
    expect(errors).toEqual([])
  })
}

test("primary navigation and a published article work", async ({ page }) => {
  const errors = monitorPage(page)
  await page.goto("/blog/", { waitUntil: "domcontentloaded" })

  const navigation = page.getByRole("navigation", {
    name: "Primary navigation",
  })
  for (const label of [
    "About",
    "Experience",
    "Projects",
    "Blog",
    "Bookshelf",
    "Studio",
  ]) {
    await expect(
      navigation.getByRole("link", { name: label, exact: true })
    ).toBeVisible()
  }

  await page.getByRole("link", { name: /The Walk I Keep Missing/i }).click()
  await expect(page).toHaveURL(/\/blog\/the-walk-i-keep-missing\/?$/)
  await expect(
    page.getByRole("heading", { level: 1, name: "The Walk I Keep Missing" })
  ).toBeVisible()
  expect(errors).toEqual([])
})

test("visible site images load successfully", async ({ page }) => {
  const errors = monitorPage(page)

  for (const path of ["/", "/bookshelf/", "/studio/"]) {
    await page.goto(path, { waitUntil: "domcontentloaded" })
    const images = page.locator("img")

    for (let index = 0; index < (await images.count()); index += 1) {
      const image = images.nth(index)
      await image.scrollIntoViewIfNeeded()
      await expect
        .poll(() =>
          image.evaluate(
            element => element.complete && element.naturalWidth > 0
          )
        )
        .toBeTruthy()
    }
  }

  expect(errors).toEqual([])
})

test("the custom not-found page remains useful", async ({ page }) => {
  const errors = monitorPage(page)
  await page.goto("/404/", { waitUntil: "domcontentloaded" })

  await expect(
    page.getByRole("heading", { level: 1, name: "Page not found" })
  ).toBeVisible()
  await expect(
    page.getByRole("link", { name: "Return to the homepage" })
  ).toBeVisible()
  expect(errors).toEqual([])
})

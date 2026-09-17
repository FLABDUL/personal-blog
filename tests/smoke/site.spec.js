const { test, expect } = require("@playwright/test")

test.beforeEach(async ({ page }) => {
  if (!process.env.BASE_URL) {
    await page.route("**/api/leetcode", route =>
      route.fulfill({ status: 204 }),
    )
  }
})

const routes = [
  { path: "/", heading: "About Me" },
  { path: "/experience/", heading: "Abdul Hakim Norazman" },
  { path: "/projects/", heading: "Projects built to be explored." },
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
      page.getByRole("heading", { level: 1, name: route.heading }),
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
      navigation.getByRole("link", { name: label, exact: true }),
    ).toBeVisible()
  }

  await page.getByRole("link", { name: /The Walk I Keep Missing/i }).click()
  await expect(page).toHaveURL(/\/blog\/the-walk-i-keep-missing\/?$/)
  await expect(
    page.getByRole("heading", { level: 1, name: "The Walk I Keep Missing" }),
  ).toBeVisible()
  expect(errors).toEqual([])
})

test("live products lead the project collection and remain curated on Experience", async ({
  page,
}) => {
  const errors = monitorPage(page)

  await page.goto("/projects/", { waitUntil: "domcontentloaded" })

  const projectCards = page.locator(".projects-grid .project-card")
  await expect(projectCards).toHaveCount(7)
  await expect(
    projectCards.nth(0).getByRole("heading", { level: 4 }),
  ).toHaveText("Residue Lens")
  await expect(
    projectCards.nth(1).getByRole("heading", { level: 4 }),
  ).toHaveText("Period Place")

  const residueLensCard = projectCards.filter({ hasText: "Residue Lens" })
  await expect(
    residueLensCard.getByRole("link", {
      name: "Visit product",
      exact: true,
    }),
  ).toHaveAttribute("href", "https://residuelens.com/")

  const periodPlaceCard = projectCards.filter({ hasText: "Period Place" })
  await expect(
    periodPlaceCard.getByRole("link", {
      name: "Visit product",
      exact: true,
    }),
  ).toHaveAttribute("href", "https://periodplace.org/")

  await expect(
    page.getByText("live products & demos", { exact: true }),
  ).toBeVisible()

  await page.goto("/experience/", { waitUntil: "domcontentloaded" })

  const selectedProjectGroup = page
    .locator(".cv-work__group")
    .filter({ hasText: "Selected personal projects" })
  const selectedProjects = selectedProjectGroup.locator(".project-card")

  await expect(selectedProjects).toHaveCount(3)
  await expect(selectedProjects).toContainText([
    "Residue Lens",
    "Period Place",
    "Computational Geometry CAD Filter",
  ])
  await expect(selectedProjectGroup).not.toContainText("Dependency Agent")
  await expect(selectedProjectGroup).not.toContainText("Pulse Energy Dashboard")
  expect(errors).toEqual([])
})

test("visible site images load successfully", async ({ page }) => {
  const errors = monitorPage(page)

  for (const path of ["/", "/projects/", "/bookshelf/", "/studio/"]) {
    await page.goto(path, { waitUntil: "domcontentloaded" })
    const images = page.locator("img")

    for (let index = 0; index < (await images.count()); index += 1) {
      const image = images.nth(index)
      await image.scrollIntoViewIfNeeded()
      await expect
        .poll(() =>
          image.evaluate(
            element => element.complete && element.naturalWidth > 0,
          ),
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
    page.getByRole("heading", { level: 1, name: "Page not found" }),
  ).toBeVisible()
  await expect(
    page.getByRole("link", { name: "Return to the homepage" }),
  ).toBeVisible()
  expect(errors).toEqual([])
})

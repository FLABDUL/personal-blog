const { test, expect } = require("@playwright/test")
const leetcodeProfile = require("../../content/leetcode.json")

const leetcodeFallback = {
  username: leetcodeProfile.username,
  profileUrl: leetcodeProfile.profileUrl,
  ...leetcodeProfile.fallback,
  source: "fallback",
  updatedAt: null,
}

test.beforeEach(async ({ page }) => {
  if (!process.env.BASE_URL) {
    await page.route("**/api/leetcode", route =>
      route.fulfill({ status: 200, json: leetcodeFallback }),
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
  {
    path: "/projects/budget-v2/",
    heading: "Building a trustworthy personal-finance data pipeline",
  },
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
  await expect(projectCards).toHaveCount(8)
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

  await expect(selectedProjects).toHaveCount(4)
  await expect(selectedProjects).toContainText([
    "Residue Lens",
    "Period Place",
    "Budget V2",
    "Computational Geometry CAD Filter",
  ])
  await expect(selectedProjectGroup).not.toContainText("Dependency Agent")
  await expect(selectedProjectGroup).not.toContainText("Pulse Energy Dashboard")
  expect(errors).toEqual([])
})

test("visible site images load successfully", async ({ page }) => {
  const errors = monitorPage(page)

  for (const path of [
    "/",
    "/bookshelf/",
    "/studio/",
    "/projects/",
    "/projects/budget-v2/",
  ]) {
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

test("Budget V2 is linked as an internal case study", async ({ page }) => {
  const errors = monitorPage(page)
  await page.goto("/projects/", { waitUntil: "domcontentloaded" })

  const card = page.getByRole("article").filter({ hasText: "Budget V2" })
  const link = card.getByRole("link", { name: "Read case study", exact: true })
  await expect(link).toHaveAttribute("href", "/projects/budget-v2/")
  await expect(link).not.toHaveAttribute("target", "_blank")
  expect(errors).toEqual([])
})

test("Budget V2 discloses synthetic evidence and shows the full workflow", async ({
  page,
}) => {
  const errors = monitorPage(page)
  await page.goto("/projects/budget-v2/", { waitUntil: "domcontentloaded" })

  await expect(
    page.getByText("Entirely synthetic demonstration", { exact: true })
  ).toBeVisible()
  await expect(page.getByRole("figure")).toHaveCount(4)
  for (const heading of [
    "Preserve evidence before interpreting it",
    "Automate only what can be decided safely",
    "Reconcile transfers without guessing",
    "Generate interfaces from the ledger",
  ]) {
    await expect(page.getByRole("heading", { name: heading })).toBeVisible()
  }
  await expect(
    page.getByRole("link", { name: "View experience" })
  ).toHaveAttribute("href", "/experience/")
  await expect(
    page.getByRole("link", { name: "Connect on LinkedIn" })
  ).toBeVisible()
  expect(errors).toEqual([])
})

test("Budget V2 exposes full-size evidence links on mobile", async ({ page }) => {
  const errors = monitorPage(page)
  await page.setViewportSize({ width: 390, height: 844 })
  await page.goto("/projects/budget-v2/", { waitUntil: "domcontentloaded" })

  for (const [title, href] of [
    [
      "Preserve evidence before interpreting it",
      "/projects/budget-v2/activity.webp",
    ],
    [
      "Automate only what can be decided safely",
      "/projects/budget-v2/review.webp",
    ],
    [
      "Reconcile transfers without guessing",
      "/projects/budget-v2/transfers.webp",
    ],
    [
      "Generate interfaces from the ledger",
      "/projects/budget-v2/dashboard.webp",
    ],
  ]) {
    const link = page.getByRole("link", {
      name: `Open full-size evidence: ${title}`,
    })
    await expect(link).toBeVisible()
    await expect(link).toHaveAttribute("href", href)
    await expect(link).toHaveAttribute("target", "_blank")
    await expect(link).toHaveAttribute("rel", "noreferrer")
  }

  expect(errors).toEqual([])
})

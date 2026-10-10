const { test, expect } = require("@playwright/test")
const portrait = require("../../content/music/portrait.json")

const AUKAI_SPOTIFY_ID = portrait.artists.aukai.spotifyArtistId
const AUKAI_TRACKS = Object.values(portrait.tracks).filter(
  track => track.placement.artistId === "aukai",
)

function catalogueWithAukai() {
  const generatedAt = new Date().toISOString()
  const expiresAt = new Date(
    Date.parse(generatedAt) + 7 * 24 * 60 * 60 * 1000,
  ).toISOString()
  return {
    schemaVersion: 1,
    generatedAt,
    expiresAt,
    artists: {
      [AUKAI_SPOTIFY_ID]: {
        id: AUKAI_SPOTIFY_ID,
        name: "Aukai",
        spotifyUrl: `https://open.spotify.com/artist/${AUKAI_SPOTIFY_ID}`,
      },
    },
    tracks: Object.fromEntries(
      AUKAI_TRACKS.map(track => [
        track.spotifyTrackId,
        {
          id: track.spotifyTrackId,
          name: track.name,
          spotifyUrl: `https://open.spotify.com/track/${track.spotifyTrackId}`,
          artists: [
            {
              id: AUKAI_SPOTIFY_ID,
              name: "Aukai",
              spotifyUrl: `https://open.spotify.com/artist/${AUKAI_SPOTIFY_ID}`,
            },
          ],
        },
      ]),
    ),
    attribution: {
      provider: "Spotify",
      providerUrl: "https://www.spotify.com/",
    },
  }
}

function monitorPage(page) {
  const errors = []
  page.on("pageerror", error => errors.push(error.message))
  page.on("console", message => {
    if (message.type() === "error") errors.push(message.text())
  })
  return errors
}

test.beforeEach(async ({ page }) => {
  await page.route("**/api/spotify-catalogue", route =>
    route.fulfill({ status: 200, json: { status: "unavailable" } }),
  )
  await page.route("**/music/catalogue-preview.json", route =>
    route.fulfill({ status: 200, json: { status: "unavailable" } }),
  )
})

test("draft preview uses a local catalogue when the server API is unavailable", async ({
  page,
}) => {
  const catalogue = catalogueWithAukai()
  catalogue.artists[AUKAI_SPOTIFY_ID].imageUrl =
    "https://images.example.test/aukai.jpg"
  catalogue.tracks[AUKAI_TRACKS[0].spotifyTrackId].imageUrl =
    "https://images.example.test/slow-sun.jpg"

  await page.unroute("**/music/catalogue-preview.json")
  await page.route("**/music/catalogue-preview.json", route =>
    route.fulfill({ status: 200, json: catalogue }),
  )
  await page.route("https://images.example.test/**", route =>
    route.fulfill({
      status: 200,
      contentType: "image/svg+xml",
      body: '<svg xmlns="http://www.w3.org/2000/svg" width="64" height="64"><rect width="64" height="64" fill="#f4b942"/></svg>',
    }),
  )

  await page.goto("/music/")
  const portraitRoot = page.getByRole("region", {
    name: "Interactive music portrait",
  })
  await expect(portraitRoot).toHaveAttribute(
    "data-catalogue-status",
    "available",
  )
  await expect(page.locator('[data-artist-id="aukai"] image')).toHaveAttribute(
    "href",
    "https://images.example.test/aukai.jpg",
  )

  await page
    .getByRole("button", { name: /^Explore Aukai/ })
    .dispatchEvent("click")
  await expect(
    page.getByRole("group", { name: "Songs orbiting Aukai" }).locator("image"),
  ).toHaveCount(1)
})

test("authored portrait remains complete without Spotify catalogue data", async ({
  page,
}) => {
  const errors = monitorPage(page)
  await page.setViewportSize({ width: 390, height: 844 })
  await page.goto("/music/", { waitUntil: "domcontentloaded" })

  await expect(
    page.getByRole("heading", { level: 1, name: "Music Portrait" }),
  ).toBeVisible()
  await expect(
    page.getByRole("img", { name: "Abdul Hakim Norazman" }),
  ).toBeVisible()
  await expect(page.getByRole("button", { name: /^Explore / })).toHaveCount(10)
  for (const region of ["Inner waters", "Familiar seas", "Outer reaches"]) {
    await expect(
      page.getByRole("button", { name: `Spotlight ${region}` }),
    ).toBeVisible()
  }
  await expect(
    page.getByText(
      "Catalogue details are unavailable; the authored map remains complete.",
    ),
  ).toBeVisible()
  await expect(
    page.getByText("Catalogue details and artwork from Spotify."),
  ).toBeVisible()
  await expect(page.locator('[data-testid="artist-list"]')).toHaveCount(0)
  await expect(page.locator('[data-testid="filter-toolbar"]')).toHaveCount(0)
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= window.innerWidth,
    ),
  ).toBe(true)
  expect(errors).toEqual([])
})

test("the map keeps its region explanations in the guide", async ({ page }) => {
  await page.goto("/music/")
  const atlas = page.getByRole("group", { name: "Living Atlas music map" })

  for (const [region, meaning] of [
    ["Inner waters", "Music in my life right now."],
    ["Familiar seas", "Music connected to memory."],
    ["Outer reaches", "Music that fuels creativity."],
  ]) {
    await expect(atlas.getByText(meaning, { exact: true })).toHaveCount(0)
    await expect(
      page.getByRole("button", {
        name: `Spotlight ${region}`,
        exact: true,
      }),
    ).toBeVisible()
  }

  await page.getByText("How to read this map", { exact: true }).click()
  for (const meaning of [
    "Music in my life right now.",
    "Music connected to memory.",
    "Music that fuels creativity.",
  ]) {
    await expect(page.getByText(meaning, { exact: true })).toBeVisible()
  }
})

test("selection pauses the atlas and gives Aukai three orbiting song moons", async ({
  page,
}) => {
  await page.unroute("**/api/spotify-catalogue")
  await page.route("**/api/spotify-catalogue", route =>
    route.fulfill({ status: 200, json: catalogueWithAukai() }),
  )
  await page.goto("/music/")

  const portraitRoot = page.getByRole("region", {
    name: "Interactive music portrait",
  })
  await expect(portraitRoot).toHaveAttribute(
    "data-catalogue-status",
    "available",
  )
  const aukai = page.getByRole("button", { name: /^Explore Aukai/ })
  await aukai.focus()
  await expect(aukai).toBeFocused()
  await aukai.dispatchEvent("click")

  await expect(portraitRoot).toHaveAttribute("data-selection", "artist")
  await expect(portraitRoot).toHaveAttribute("data-all-paused", "true")
  await expect(aukai).toHaveAttribute("aria-pressed", "true")
  await expect(
    page.getByRole("group", { name: "Songs orbiting Aukai" }),
  ).toHaveCount(1)
  await expect(page.getByRole("button", { name: /^Track / })).toHaveCount(3)
  await expect(aukai.locator("a")).toHaveCount(0)

  const slowSun = page.getByRole("button", { name: /^Track Slow Sun/ })
  await slowSun.focus()
  await slowSun.dispatchEvent("click")
  await expect(portraitRoot).toHaveAttribute("data-selection", "track")
  await expect(
    page.getByRole("group", { name: "Songs orbiting Aukai" }),
  ).toHaveAttribute("data-paused", "true")
  await expect(slowSun.locator("a")).toHaveCount(0)
  await expect(
    page.getByRole("link", { name: "Open Slow Sun in Spotify" }),
  ).toHaveAttribute(
    "href",
    `https://open.spotify.com/track/${portrait.tracks["aukai-slow-sun"].spotifyTrackId}`,
  )

  await page.keyboard.press("Escape")
  await expect(portraitRoot).toHaveAttribute("data-selection", "artist")
  await expect(aukai).toBeFocused()
  await page.keyboard.press("Escape")
  await expect(portraitRoot).toHaveAttribute("data-selection", "none")
  await expect(portraitRoot).toHaveAttribute("data-all-paused", "false")
})

test("selection changes rapidly and chapter spotlight stays inside the chart", async ({
  page,
}) => {
  await page.goto("/music/")
  const portraitRoot = page.getByRole("region", {
    name: "Interactive music portrait",
  })
  await expect(portraitRoot).toHaveAttribute(
    "data-catalogue-status",
    "unavailable",
  )
  const aukai = page.getByRole("button", { name: /^Explore Aukai/ })
  await aukai.focus()
  await aukai.dispatchEvent("click")
  const tomDay = page.getByRole("button", { name: /^Explore Tom Day/ })
  await tomDay.focus()
  await tomDay.dispatchEvent("click")

  await expect(
    page.locator('[aria-pressed="true"][data-node-selector]'),
  ).toHaveCount(1)
  await expect(
    page.getByRole("heading", { level: 2, name: "Tom Day" }),
  ).toBeVisible()

  const spotlight = page.getByRole("button", {
    name: "Spotlight Outer reaches",
  })
  await spotlight.click({ force: true })
  await expect(spotlight).toHaveAttribute("aria-pressed", "true")
  await expect(
    page.locator('[data-orbit-chapter="creative_fuel"]'),
  ).toHaveAttribute("data-spotlighted", "true")
  await expect(
    page.locator('[data-orbit-chapter="in_rotation"]'),
  ).toHaveAttribute("data-quiet", "true")
})

test("motion pauses for reduced motion and a hidden document", async ({
  page,
}) => {
  await page.emulateMedia({ reducedMotion: "reduce" })
  await page.goto("/music/")
  const portraitRoot = page.getByRole("region", {
    name: "Interactive music portrait",
  })
  await expect(portraitRoot).toHaveAttribute("data-reduced-motion", "true")
  await expect(portraitRoot).toHaveAttribute("data-all-paused", "true")

  await page.emulateMedia({ reducedMotion: "no-preference" })
  await expect(portraitRoot).toHaveAttribute("data-reduced-motion", "false")
  await page.evaluate(() => {
    Object.defineProperty(document, "visibilityState", {
      configurable: true,
      value: "hidden",
    })
    document.dispatchEvent(new Event("visibilitychange"))
  })
  await expect(portraitRoot).toHaveAttribute("data-page-visible", "false")
  await expect(portraitRoot).toHaveAttribute("data-all-paused", "true")
})

test("failed catalogue artwork falls back without weakening the authored portrait", async ({
  page,
}) => {
  const catalogue = catalogueWithAukai()
  catalogue.artists[AUKAI_SPOTIFY_ID].imageUrl = "https://art.invalid/aukai.jpg"
  await page.unroute("**/api/spotify-catalogue")
  await page.route("**/api/spotify-catalogue", route =>
    route.fulfill({ status: 200, json: catalogue }),
  )
  await page.route("https://art.invalid/**", route =>
    route.fulfill({ status: 404, body: "" }),
  )

  await page.goto("/music/")
  const portraitRoot = page.getByRole("region", {
    name: "Interactive music portrait",
  })
  await expect(portraitRoot).toHaveAttribute(
    "data-catalogue-status",
    "available",
  )
  await expect(
    page.locator('[data-artist-id="aukai"] [data-artwork-fallback="true"]'),
  ).toBeVisible()
  await expect(
    page.getByRole("button", { name: /^Explore Aukai/ }),
  ).toBeVisible()
})

test("case study explains the creative and technical decisions without claiming listening rankings", async ({
  page,
}) => {
  await page.goto("/music/case-study/")

  await expect(
    page.getByRole("heading", {
      level: 1,
      name: "Turning listening into a living atlas",
    }),
  ).toBeVisible()
  await expect(
    page.getByRole("heading", { level: 2, name: "The challenge" }),
  ).toBeVisible()
  await expect(
    page.getByRole("heading", { level: 2, name: "Designing the interaction" }),
  ).toBeVisible()
  await expect(
    page.getByRole("heading", { level: 2, name: "How the data moves" }),
  ).toBeVisible()
  await expect(
    page.getByText("Authored manifest", { exact: true }),
  ).toBeVisible()
  await expect(
    page.getByText("Validated snapshot", { exact: true }),
  ).toBeVisible()
  await expect(
    page.getByRole("heading", {
      level: 2,
      name: "Accessibility and verification",
    }),
  ).toBeVisible()
  await expect(
    page.getByRole("heading", { level: 2, name: "Limitations and next steps" }),
  ).toBeVisible()
  await expect(
    page.getByRole("link", { name: "Explore the portrait" }).first(),
  ).toHaveAttribute("href", "/music/")
  await expect(
    page.getByText(/top listening|calculated top|most listened/i),
  ).toHaveCount(0)

  await page.goto("/music/")
  await expect(
    page.getByRole("link", { name: "How this was made" }),
  ).toHaveAttribute("href", "/music/case-study/")
  await expect(
    page.getByText(/top listening|calculated top|most listened/i),
  ).toHaveCount(0)
})

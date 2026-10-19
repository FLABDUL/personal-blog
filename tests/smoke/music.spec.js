const { test, expect } = require("@playwright/test")
const portrait = require("../../content/music/portrait.json")
const { makePublicSnapshot } = require("../music/fixtures/music-beta")
const webpack = require("webpack")
const path = require("node:path")
const fs = require("node:fs/promises")
const os = require("node:os")

let snapshotBundle
let snapshotBuildDirectory

async function buildSnapshotFixture() {
  snapshotBuildDirectory = await fs.mkdtemp(
    path.join(os.tmpdir(), "music-snapshot-test-"),
  )
  const component = path
    .resolve(__dirname, "../../src/components/music/MusicPortrait.js")
    .replaceAll("\\", "/")
  const embedComponent = path
    .resolve(__dirname, "../../src/components/music/SpotifyEmbed.js")
    .replaceAll("\\", "/")
  const globalStyles = path
    .resolve(__dirname, "../../src/styles/global.css")
    .replaceAll("\\", "/")
  const compiler = webpack({
    mode: "development",
    devtool: false,
    context: path.resolve(__dirname, "../.."),
    entry: `data:text/javascript,import React from "react"; import {createRoot} from "react-dom/client"; import {flushSync} from "react-dom"; import "${globalStyles}"; import MusicPortrait from "${component}"; import SpotifyEmbed from "${embedComponent}"; const root=createRoot(document.getElementById("fixture")); window.renderMusicPortrait=props=>root.render(React.createElement(MusicPortrait,props)); window.renderMusicPortraitSync=(props,strict)=>flushSync(()=>root.render(strict?React.createElement(React.StrictMode,null,React.createElement(MusicPortrait,props)):React.createElement(MusicPortrait,props))); window.renderSpotifyEmbed=track=>root.render(React.createElement(SpotifyEmbed,{track}));`,
    output: { path: snapshotBuildDirectory, filename: "snapshot.js" },
    module: {
      rules: [
        {
          test: /\.js$/,
          exclude: /node_modules/,
          use: {
            loader: require.resolve("babel-loader"),
            options: {
              babelrc: false,
              configFile: false,
              presets: [require.resolve("@babel/preset-react")],
            },
          },
        },
        {
          test: /\.module\.css$/,
          use: [
            // Both installed loaders need named exports for Gatsby's namespace imports.
            {
              loader: require.resolve("style-loader"),
              options: { modules: { namedExport: true } },
            },
            {
              loader: require.resolve("css-loader"),
              options: {
                modules: {
                  namedExport: true,
                  exportLocalsConvention: "camelCaseOnly",
                },
              },
            },
          ],
        },
        {
          test: /\.css$/,
          exclude: /\.module\.css$/,
          use: [
            require.resolve("style-loader"),
            {
              loader: require.resolve("css-loader"),
              options: { modules: false },
            },
          ],
        },
      ],
    },
    plugins: [
      new webpack.DefinePlugin({
        "process.env.GATSBY_MUSIC_DRAFT_PREVIEW": JSON.stringify("0"),
      }),
    ],
  })
  try {
    await new Promise((resolve, reject) =>
      compiler.run((error, stats) => {
        if (error || stats.hasErrors())
          reject(
            error || new Error(stats.toString({ all: false, errors: true })),
          )
        else resolve()
      }),
    )
    snapshotBundle = await fs.readFile(
      path.join(snapshotBuildDirectory, "snapshot.js"),
      "utf8",
    )
  } finally {
    await new Promise((resolve, reject) =>
      compiler.close(error => (error ? reject(error) : resolve())),
    )
  }
}

async function mountSnapshot(page, snapshot, extraProps = {}) {
  await page.route("**/music/snapshot-test/", route =>
    route.fulfill({
      contentType: "text/html",
      body: '<!doctype html><html><head><meta name="viewport" content="width=device-width,initial-scale=1"></head><body><div class="site-shell"><main class="site-main site-main--wide"><div id="fixture"></div></main></div></body></html>',
    }),
  )
  await page.goto("/music/snapshot-test/")
  await page.addScriptTag({ content: snapshotBundle })
  await page.evaluate(props => window.renderMusicPortrait(props), {
    snapshot,
    ...extraProps,
  })
}

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
  // Provider frames/artwork stay local: tests verify construction, never playback.
  await page.route("https://open.spotify.com/embed/**", route =>
    route.fulfill({
      contentType: "text/html",
      body: "<p>Local Spotify fixture</p>",
    }),
  )
  await page.route("https://i.scdn.co/**", route =>
    route.fulfill({ status: 404, body: "" }),
  )
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
  let previewRequested = false
  const catalogue = catalogueWithAukai()
  catalogue.artists[AUKAI_SPOTIFY_ID].imageUrl =
    "https://images.example.test/aukai.jpg"
  catalogue.tracks[AUKAI_TRACKS[0].spotifyTrackId].imageUrl =
    "https://images.example.test/slow-sun.jpg"

  await page.unroute("**/music/catalogue-preview.json")
  await page.route("**/music/catalogue-preview.json", route => {
    previewRequested = true
    return route.fulfill({ status: 200, json: catalogue })
  })
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
    /^(?:available|unavailable)$/,
  )
  test.skip(
    !previewRequested,
    "The production bundle intentionally omits the draft-preview fallback",
  )
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
  await expect(
    page.getByText("HAKIM · HOME STAR", { exact: true }),
  ).toBeVisible()
  await expect(
    page.getByRole("img", { name: "Abdul Hakim Norazman" }).locator("image"),
  ).toHaveAttribute("href", "/profile.jpg")
  await expect(page.getByRole("button", { name: /^Explore / })).toHaveCount(10)
  await expect(page.locator("iframe, [data-shooting-stars]")).toHaveCount(0)
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
  await expect(
    page.getByText("Planet size shows authored prominence from 1 to 5.", {
      exact: true,
    }),
  ).toBeVisible()
  await expect(
    page.getByRole("button", { name: /^Explore Aukai/ }),
  ).toHaveAccessibleName(/authored prominence/)
})

test("desktop atlas controls and attribution stay outside the solar system", async ({
  page,
}) => {
  await page.setViewportSize({ width: 1280, height: 900 })
  await page.goto("/music/")

  const map = page.getByRole("group", { name: "Living Atlas music map" })
  const mapBox = await map.boundingBox()
  expect(mapBox).not.toBeNull()

  const surroundingItems = [
    page.getByRole("group", { name: "Music map regions" }),
    page.locator("details").filter({ hasText: "How to read this map" }),
    page.getByLabel("Spotify catalogue attribution"),
  ]
  for (const item of surroundingItems) {
    const box = await item.boundingBox()
    expect(box).not.toBeNull()
    const overlaps = !(
      box.x + box.width <= mapBox.x ||
      box.x >= mapBox.x + mapBox.width ||
      box.y + box.height <= mapBox.y ||
      box.y >= mapBox.y + mapBox.height
    )
    expect(overlaps).toBe(false)
  }
})

test("mobile atlas chrome stacks without covering the solar system", async ({
  page,
}) => {
  await page.setViewportSize({ width: 390, height: 844 })
  await page.goto("/music/")

  const mapBox = await page
    .getByRole("group", { name: "Living Atlas music map" })
    .boundingBox()
  expect(mapBox).not.toBeNull()

  for (const item of [
    page.getByRole("group", { name: "Music map regions" }),
    page.locator("details").filter({ hasText: "How to read this map" }),
    page.getByLabel("Spotify catalogue attribution"),
  ]) {
    const box = await item.boundingBox()
    expect(box).not.toBeNull()
    const overlaps = !(
      box.x + box.width <= mapBox.x ||
      box.x >= mapBox.x + mapBox.width ||
      box.y + box.height <= mapBox.y ||
      box.y >= mapBox.y + mapBox.height
    )
    expect(overlaps).toBe(false)
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
  await expect(page.locator("iframe")).toHaveCount(0)
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
  await expect(page.locator("iframe")).toHaveCount(1)
  await expect(page.locator("iframe")).toHaveAttribute(
    "src",
    `https://open.spotify.com/embed/track/${portrait.tracks["aukai-slow-sun"].spotifyTrackId}`,
  )
  await expect(
    page.getByRole("link", { name: "Open Slow Sun in Spotify" }),
  ).toHaveAttribute(
    "href",
    `https://open.spotify.com/track/${portrait.tracks["aukai-slow-sun"].spotifyTrackId}`,
  )

  await page.keyboard.press("Escape")
  await expect(portraitRoot).toHaveAttribute("data-selection", "artist")
  await expect(page.locator("iframe")).toHaveCount(0)
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

test.describe("snapshot renderer", () => {
  test.beforeAll(buildSnapshotFixture)
  test.afterAll(async () => {
    if (snapshotBuildDirectory)
      await fs.rm(snapshotBuildDirectory, { recursive: true, force: true })
  })

  test("explicit playback swaps one frame and preserves fallback text when artwork and embed fail", async ({
    page,
  }) => {
    await page.setViewportSize({ width: 390, height: 844 })
    await page.emulateMedia({ reducedMotion: "reduce" })
    const snapshot = makePublicSnapshot({ planetCount: 4 })
    const planet = snapshot.planets[3]
    planet.name = "Aukai"
    planet.imageUrl = "https://i.scdn.co/image/missingartist"
    planet.moons[0].name = "Slow Sun"
    planet.moons[0].id = "3NsZZpRmWNGvE0WmCuZPAu"
    planet.moons[0].spotifyUrl = `https://open.spotify.com/track/${planet.moons[0].id}`
    planet.moons[0].imageUrl = "https://i.scdn.co/image/missingtrack"
    const requests = []
    await page.route("https://open.spotify.com/embed/**", route => {
      requests.push(route.request().url())
      return route.abort()
    })
    await mountSnapshot(page, snapshot)
    await expect(page.locator("iframe")).toHaveCount(0)
    const artist = page.getByRole("button", { name: /^Explore Aukai,/ })
    await artist.focus()
    await page.keyboard.press("Enter")
    await expect(page.getByRole("button", { name: /^Track / })).toHaveCount(3)
    await expect(page.locator("iframe")).toHaveCount(0)
    await page.getByRole("button", { name: /^Track Slow Sun/ }).focus()
    await page.keyboard.press("Enter")
    const region = page.getByRole("region", { name: "Selected music details" })
    const frame = region.locator("iframe")
    await expect(frame).toHaveCount(1)
    await expect(frame).toHaveAttribute(
      "src",
      "https://open.spotify.com/embed/track/3NsZZpRmWNGvE0WmCuZPAu",
    )
    await expect(frame).toHaveAttribute(
      "title",
      "Spotify player for Slow Sun by Aukai",
    )
    await expect(frame).toHaveAttribute(
      "allow",
      "autoplay; clipboard-write; encrypted-media; fullscreen; picture-in-picture",
    )
    await expect(
      region.getByRole("heading", { name: "Slow Sun", exact: true }),
    ).toBeVisible()
    await expect(region.getByText("By Aukai.", { exact: true })).toBeVisible()
    await expect(
      region.getByRole("link", { name: "Open Slow Sun in Spotify" }),
    ).toHaveAttribute("href", planet.moons[0].spotifyUrl)
    await expect(artist.locator('[data-artwork-fallback="true"]')).toBeVisible()
    await expect(
      page
        .getByRole("button", { name: /^Track Slow Sun/ })
        .locator('[data-artwork-fallback="true"]'),
    ).toBeVisible()
    await page.screenshot({
      path: test.info().outputPath("selected-track-390-fallback.png"),
      fullPage: true,
    })
    await frame.evaluate(node => {
      node.dataset.samePlayer = "true"
    })
    await page
      .getByRole("button", {
        name: new RegExp(`^Track ${planet.moons[1].name}`),
      })
      .focus()
    await page.keyboard.press("Enter")
    await expect(frame).toHaveAttribute(
      "src",
      `https://open.spotify.com/embed/track/${planet.moons[1].id}`,
    )
    await expect(frame).toHaveAttribute("data-same-player", "true")
    await expect(page.locator("iframe")).toHaveCount(1)
    expect(requests.length).toBeGreaterThan(0)
    expect(requests.every(url => !/[?&]autoplay(?:=|&|$)/i.test(url))).toBe(
      true,
    )
    await expect(
      page.getByRole("region", { name: "Interactive music portrait" }),
    ).toHaveAttribute("data-all-paused", "true")
    await page.keyboard.press("Escape")
    await expect(page.locator("iframe")).toHaveCount(0)
    await expect(artist).toBeFocused()
    await page.keyboard.press("Escape")
    await expect(
      page.getByRole("region", { name: "Interactive music portrait" }),
    ).toHaveAttribute("data-all-paused", "true")
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ),
    ).toBe(true)
  })

  test("finite arrivals are decorative, complete once per snapshot in the tab and allow a new snapshot", async ({
    page,
  }) => {
    await page.emulateMedia({ reducedMotion: "no-preference" })
    const snapshot = makePublicSnapshot({ planetCount: 4 })
    await page.clock.setFixedTime(new Date(snapshot.generatedAt))
    await mountSnapshot(page, snapshot)
    const stars = page.locator("[data-shooting-stars]")
    await expect(stars).toHaveCount(1)
    await expect(stars).toHaveAttribute("aria-hidden", "true")
    await expect(stars.locator("[data-arrival-track]")).toHaveCount(3)
    expect(
      await stars.evaluate(node => getComputedStyle(node).pointerEvents),
    ).toBe("none")
    expect(
      await stars
        .locator("[data-arrival-track]")
        .first()
        .evaluate(node => getComputedStyle(node).animationIterationCount),
    ).toBe("1")
    await page.getByRole("button", { name: "Spotlight Inner waters" }).click()
    await expect(
      page.getByRole("button", { name: "Spotlight Inner waters" }),
    ).toHaveAttribute("aria-pressed", "true")
    await expect(stars).toHaveCount(0)
    expect(
      await page.evaluate(() =>
        sessionStorage.getItem("music-portrait-seen-snapshot"),
      ),
    ).toBe(snapshot.snapshotId)
    await mountSnapshot(page, snapshot)
    await expect(page.getByRole("button", { name: /^Explore / })).toHaveCount(4)
    await expect(stars).toHaveCount(0, { timeout: 300 })
    const next = { ...snapshot, snapshotId: "snapshot-fixture-2" }
    await page.evaluate(
      snapshot => window.renderMusicPortrait({ snapshot }),
      next,
    )
    await expect(stars).toHaveCount(1)
    await expect(stars).toHaveCount(0)
    await page.evaluate(
      snapshot => window.renderMusicPortrait({ snapshot }),
      structuredClone(next),
    )
    await expect(stars).toHaveCount(0, { timeout: 300 })
  })

  for (const strict of [false, true])
    for (const deniedStorage of [false, true])
      test(`interrupted A to B to A to B never replays arrivals with ${strict ? "StrictMode" : "ordinary effects"} and ${deniedStorage ? "denied" : "available"} storage`, async ({
        page,
      }) => {
        if (deniedStorage)
          await page.addInitScript(() =>
            Object.defineProperty(window, "sessionStorage", {
              configurable: true,
              get() {
                throw new Error("Storage denied")
              },
            }),
          )
        await page.emulateMedia({ reducedMotion: "no-preference" })
        const snapshot = makePublicSnapshot({ planetCount: 4 })
        delete snapshot.owner.imageUrl
        await page.clock.setFixedTime(new Date(snapshot.generatedAt))
        const warmup = {
          ...snapshot,
          snapshotId: "snapshot-warmup",
          planets: [],
        }
        await mountSnapshot(page, warmup)
        const observed = await page.evaluate(
          async ({ snapshot, strict }) => {
            const render = props =>
              window.renderMusicPortraitSync(props, strict)
            const layers = []
            const starts = []
            const seenLayers = new WeakSet()
            let stage
            const observer = new MutationObserver(records => {
              for (const record of records)
                for (const node of record.addedNodes) {
                  if (!(node instanceof Element)) continue
                  const addedLayers = node.matches("[data-shooting-stars]")
                    ? [node]
                    : node.querySelectorAll("[data-shooting-stars]")
                  for (const layer of addedLayers) {
                    if (seenLayers.has(layer)) continue
                    seenLayers.add(layer)
                    layers.push(stage)
                  }
                }
            })
            const onStart = event => {
              if (event.target.matches("[data-arrival-track]"))
                starts.push(stage)
            }
            observer.observe(document.getElementById("fixture"), {
              childList: true,
              subtree: true,
            })
            document.addEventListener("animationstart", onStart)
            const settle = () =>
              new Promise(resolve =>
                requestAnimationFrame(() => requestAnimationFrame(resolve)),
              )
            const show = async (id, label) => {
              stage = label
              render({ snapshot: { ...snapshot, snapshotId: id } })
              await settle()
            }
            try {
              const beginning = performance.now()
              await show("snapshot-A", "first A")
              const firstA = document.querySelector("[data-shooting-stars]")
              await show("snapshot-A", "same A")
              const preservesA =
                firstA !== null &&
                document.querySelector("[data-shooting-stars]") === firstA
              await show("snapshot-B", "first B")
              const firstB = document.querySelector("[data-shooting-stars]")
              await show("snapshot-B", "same B")
              const preservesB =
                firstB !== null &&
                document.querySelector("[data-shooting-stars]") === firstB
              await show("snapshot-A", "second A")
              await show("snapshot-B", "second B")
              const transitionDuration = performance.now() - beginning
              // Observe the whole interval; a momentary zero could miss a later replay.
              const observationStart = performance.now()
              await new Promise(resolve => setTimeout(resolve, 500))
              return {
                layers,
                starts,
                preservesA,
                preservesB,
                transitionDuration,
                observationDuration: performance.now() - observationStart,
                remaining: document.querySelectorAll("[data-shooting-stars]")
                  .length,
              }
            } finally {
              observer.disconnect()
              document.removeEventListener("animationstart", onStart)
            }
          },
          { snapshot, strict },
        )
        expect(observed.transitionDuration).toBeLessThan(1300)
        expect(observed.observationDuration).toBeGreaterThanOrEqual(500)
        expect(observed.preservesA).toBe(true)
        expect(observed.preservesB).toBe(true)
        expect(observed.layers).toEqual(["first A", "first B"])
        expect(
          observed.starts.filter(
            stage => stage === "second A" || stage === "second B",
          ),
        ).toEqual([])
        expect(observed.remaining).toBe(0)
      })

  test("reduced motion suppresses arrivals while playback and core controls remain available", async ({
    page,
  }) => {
    await page.emulateMedia({ reducedMotion: "reduce" })
    const snapshot = makePublicSnapshot({ planetCount: 4 })
    await page.clock.setFixedTime(new Date(snapshot.generatedAt))
    await mountSnapshot(page, snapshot)
    await expect(page.locator("[data-shooting-stars]")).toHaveCount(0)
    const artist = page.getByRole("button", { name: /^Explore Artist 4,/ })
    await artist.focus()
    await page.keyboard.press("Enter")
    await page
      .getByRole("button", { name: /^Track / })
      .first()
      .focus()
    await page.keyboard.press("Enter")
    await expect(page.locator("iframe")).toHaveCount(1)
    await expect(
      page.getByRole("button", { name: "Reset music map" }),
    ).toBeVisible()
    await expect(
      page.getByRole("group", { name: "Music map regions" }),
    ).toBeVisible()
  })

  for (const storageFailure of ["access", "write"])
    test(`blocked session storage ${storageFailure} does not crash or repeat arrivals on rerender or source changes`, async ({
      page,
    }) => {
      await page.addInitScript(storageFailure => {
        if (storageFailure === "write") {
          Storage.prototype.setItem = () => {
            throw new Error("Storage full")
          }
          return
        }
        Object.defineProperty(window, "sessionStorage", {
          configurable: true,
          get() {
            throw new Error("Storage denied")
          },
        })
      }, storageFailure)
      const snapshot = makePublicSnapshot({ planetCount: 4 })
      delete snapshot.owner.imageUrl
      await page.clock.setFixedTime(new Date(snapshot.generatedAt))
      const errors = monitorPage(page)
      await mountSnapshot(page, snapshot)
      await expect(page.locator("[data-shooting-stars]")).toHaveCount(1)
      await expect(page.locator("[data-shooting-stars]")).toHaveCount(0)
      await page.evaluate(
        snapshot => window.renderMusicPortrait({ snapshot }),
        structuredClone(snapshot),
      )
      await expect(page.locator("[data-shooting-stars]")).toHaveCount(0)
      await page.evaluate(
        portrait => window.renderMusicPortrait({ portrait }),
        portrait,
      )
      await expect(page.getByRole("button", { name: /^Explore / })).toHaveCount(
        10,
      )
      await expect(page.locator("[data-shooting-stars]")).toHaveCount(0)
      await page.evaluate(
        snapshot => window.renderMusicPortrait({ snapshot }),
        snapshot,
      )
      await expect(page.getByRole("button", { name: /^Explore / })).toHaveCount(
        4,
      )
      await expect(page.locator("[data-shooting-stars]")).toHaveCount(0)
      await page.locator('[data-source="snapshot"]').evaluate(node => {
        node.dataset.remountMarker = "true"
      })
      await page.evaluate(
        snapshot => window.renderMusicPortrait({ snapshot, key: "remounted" }),
        snapshot,
      )
      await expect(page.locator("[data-remount-marker]")).toHaveCount(0)
      await expect(page.locator("[data-shooting-stars]")).toHaveCount(0, {
        timeout: 300,
      })
      expect(errors).toEqual([])
    })

  test("the embed rejects invalid IDs and non-canonical destinations and can use a canonical ID alone", async ({
    page,
  }) => {
    const snapshot = makePublicSnapshot({ planetCount: 0 })
    delete snapshot.owner.imageUrl
    await mountSnapshot(page, snapshot)
    const id = "3NsZZpRmWNGvE0WmCuZPAu"
    for (const track of [
      { id: "bad/id", name: "Invalid" },
      {
        id,
        name: "Invalid",
        spotifyUrl: `https://open.spotify.com/track/${id}?autoplay=1`,
      },
      { id, name: "Invalid", spotifyUrl: "https://example.test/track" },
      {
        id,
        name: "Invalid",
        spotifyUrl: `https://open.spotify.com/track/${"a".repeat(22)}`,
      },
      { id, spotifyTrackId: "bad", name: "Invalid" },
      null,
    ]) {
      await page.evaluate(track => window.renderSpotifyEmbed(track), track)
      await expect(page.locator("iframe")).toHaveCount(0)
      await expect(page.locator("a")).toHaveCount(0)
    }
    await page.evaluate(track => window.renderSpotifyEmbed(track), {
      spotifyTrackId: id,
      name: "Slow Sun",
      artists: [{ name: "Aukai" }],
    })
    await expect(page.locator("iframe")).toHaveCount(1)
    await expect(page.locator("iframe")).toHaveAttribute(
      "src",
      `https://open.spotify.com/embed/track/${id}`,
    )
    await expect(
      page.getByRole("link", { name: "Open Slow Sun in Spotify" }),
    ).toHaveAttribute("href", `https://open.spotify.com/track/${id}`)
  })

  test("changing to reduced motion removes an active arrival without replaying it", async ({
    page,
  }) => {
    await page.emulateMedia({ reducedMotion: "no-preference" })
    const snapshot = makePublicSnapshot({ planetCount: 4 })
    await page.clock.setFixedTime(new Date(snapshot.generatedAt))
    await mountSnapshot(page, snapshot)
    await expect(page.locator("[data-shooting-stars]")).toHaveCount(1)
    await page.emulateMedia({ reducedMotion: "reduce" })
    await expect(page.locator("[data-shooting-stars]")).toHaveCount(0)
    await page.emulateMedia({ reducedMotion: "no-preference" })
    await expect(page.locator("[data-shooting-stars]")).toHaveCount(0)
    await expect(page.getByRole("button", { name: /^Explore / })).toHaveCount(4)
  })

  for (const width of [320, 390])
    for (const reducedMotion of ["reduce", "no-preference"]) {
      test(`compact Artist 8 moons stay visible and correctly selectable at ${width}px with ${reducedMotion}`, async ({
        page,
      }) => {
        await page.setViewportSize({ width, height: 844 })
        await page.emulateMedia({ reducedMotion })
        const snapshot = makePublicSnapshot({ planetCount: 20 })
        delete snapshot.owner.imageUrl
        snapshot.planets[7].size = 5
        await mountSnapshot(page, snapshot)
        const root = page.getByRole("region", {
          name: "Interactive music portrait",
        })
        await expect(root).toHaveAttribute("data-dense-layout", "true")
        await page
          .getByRole("button", { name: /^Explore Artist 8,/ })
          .locator("[data-planet-body]")
          .click()
        const map = page.getByRole("group", { name: "Living Atlas music map" })
        const mapBox = await map.boundingBox()
        for (const track of snapshot.planets[7].moons) {
          const button = page.getByRole("button", {
            name: new RegExp(`^Track ${track.name}(?: by|$)`),
          })
          const body = button.locator("circle").last()
          await expect(body).toBeVisible()
          const bounds = await body.boundingBox()
          expect(bounds.x).toBeGreaterThanOrEqual(mapBox.x)
          expect(bounds.y).toBeGreaterThanOrEqual(mapBox.y)
          expect(bounds.x + bounds.width).toBeLessThanOrEqual(
            mapBox.x + mapBox.width,
          )
          expect(bounds.y + bounds.height).toBeLessThanOrEqual(
            mapBox.y + mapBox.height,
          )
          await body.click({ timeout: 5000 })
          await expect(
            page.getByRole("heading", { name: track.name, exact: true }),
          ).toBeVisible()
          const caption = await button.locator("text").last().boundingBox()
          expect(caption.x).toBeGreaterThanOrEqual(mapBox.x)
          expect(caption.y).toBeGreaterThanOrEqual(mapBox.y)
          expect(caption.x + caption.width).toBeLessThanOrEqual(
            mapBox.x + mapBox.width,
          )
          expect(caption.y + caption.height).toBeLessThanOrEqual(
            mapBox.y + mapBox.height,
          )
          const target = await button.locator("[data-hit-target]").boundingBox()
          expect(target.width).toBeGreaterThanOrEqual(44)
          expect(target.height).toBeGreaterThanOrEqual(44)
          expect(target.x).toBeGreaterThanOrEqual(mapBox.x)
          expect(target.y).toBeGreaterThanOrEqual(mapBox.y)
          expect(target.x + target.width).toBeLessThanOrEqual(
            mapBox.x + mapBox.width,
          )
          expect(target.y + target.height).toBeLessThanOrEqual(
            mapBox.y + mapBox.height,
          )
          await page.keyboard.press("Escape")
          await page.mouse.click(
            target.x + target.width / 2 + 22,
            target.y + target.height / 2,
          )
          await expect(
            page.getByRole("heading", { name: track.name, exact: true }),
          ).toBeVisible()
          await page.keyboard.press("Escape")
        }
        const system = page.getByRole("group", {
          name: "Songs orbiting Artist 8",
        })
        expect(
          await system.evaluate(node => getComputedStyle(node).animationName),
        ).toBe("none")
        await page.screenshot({
          path: test
            .info()
            .outputPath(`compact-moons-${width}-${reducedMotion}.png`),
          fullPage: true,
        })
        await page.setViewportSize({ width: 1280, height: 900 })
        await page.emulateMedia({ reducedMotion: "no-preference" })
        await expect(system).toHaveAttribute("data-bounded", "false")
        await page.mouse.move(0, 0)
        await expect
          .poll(() =>
            system.evaluate(node => getComputedStyle(node).animationName),
          )
          .not.toBe("none")
      })
    }

  for (const interaction of ["focus", "hover", "focus and hover"]) {
    test(`authored ${interaction} pause survives catalogue enrichment and clears when its target leaves`, async ({
      page,
    }) => {
      let release
      await page.unroute("**/api/spotify-catalogue")
      await page.route(
        "**/api/spotify-catalogue",
        route =>
          new Promise(resolve => {
            release = async () => {
              await route.fulfill({ status: 200, json: catalogueWithAukai() })
              resolve()
            }
          }),
      )
      const snapshot = makePublicSnapshot()
      delete snapshot.owner.imageUrl
      await mountSnapshot(page, snapshot)
      await page.evaluate(
        portrait => window.renderMusicPortrait({ portrait }),
        portrait,
      )
      const artist = page.getByRole("button", { name: /^Explore Aukai,/ })
      const orbit = page.locator('[data-orbit-chapter="in_rotation"]')
      if (interaction.includes("focus")) await artist.focus()
      if (interaction.includes("hover")) {
        await page
          .getByRole("group", { name: "Living Atlas music map" })
          .evaluate(node =>
            node
              .getAnimations({ subtree: true })
              .forEach(animation => animation.pause()),
          )
        const hovered =
          interaction === "hover"
            ? artist
            : page.getByRole("button", { name: /^Explore Marlon Funaki,/ })
        await hovered.locator("[data-planet-body]").hover()
      }
      const extraOrbit = page.locator('[data-orbit-chapter="creative_fuel"]')
      const root = page.getByRole("region", {
        name: "Interactive music portrait",
      })
      await expect(root).toHaveAttribute("data-selection", "none")
      await expect(root).toHaveAttribute("data-all-paused", "false")
      await expect(orbit).toHaveAttribute("data-paused", "true")
      if (interaction === "focus and hover")
        await expect(extraOrbit).toHaveAttribute("data-paused", "true")
      await expect.poll(() => typeof release).toBe("function")
      await release()
      await expect(root).toHaveAttribute("data-catalogue-status", "available")
      await expect(orbit).toHaveAttribute("data-paused", "true")
      if (interaction === "focus and hover")
        await expect(extraOrbit).toHaveAttribute("data-paused", "true")
      if (interaction.includes("focus"))
        await page.getByRole("button", { name: "Reset music map" }).focus()
      if (interaction.includes("hover")) await page.mouse.move(0, 0)
      await expect(orbit).toHaveAttribute("data-paused", "false")
      if (interaction === "focus and hover")
        await expect(extraOrbit).toHaveAttribute("data-paused", "false")
    })
  }

  for (const [distribution, width] of [
    ["single", 390],
    ["mixed", 390],
    ["single", 320],
  ]) {
    test(`dense ${distribution} region snapshot keeps every mobile body and target selectable at ${width}px`, async ({
      page,
    }) => {
      await page.setViewportSize({ width, height: 844 })
      await page.emulateMedia({ reducedMotion: "reduce" })
      const snapshot = makePublicSnapshot({ planetCount: 20 })
      delete snapshot.owner.imageUrl
      snapshot.planets.forEach((p, i) => {
        p.size = 1
        p.region =
          distribution === "single" || i < 12
            ? "inner_waters"
            : i < 18
              ? "familiar_seas"
              : "outer_reaches"
        p.moons = []
      })
      await mountSnapshot(page, snapshot)
      await expect(page.getByRole("button", { name: /^Explore / })).toHaveCount(
        20,
      )
      await expect(
        page.getByRole("region", { name: "Interactive music portrait" }),
      ).toHaveAttribute("data-dense-layout", "true")
      for (const planet of snapshot.planets) {
        const selector = page.getByRole("button", {
          name: new RegExp(`^Explore ${planet.name},`),
        })
        await selector.locator("[data-planet-body]").click({ timeout: 5000 })
        await expect(
          page.getByRole("heading", { name: planet.name, exact: true }),
        ).toBeVisible()
        const target = await selector.locator("[data-hit-target]").boundingBox()
        expect(target.width).toBeGreaterThanOrEqual(44)
        expect(target.height).toBeGreaterThanOrEqual(44)
        await page.keyboard.press("Escape")
        await page.mouse.click(
          target.x + target.width / 2 + 22,
          target.y + target.height / 2,
        )
        await expect(
          page.getByRole("heading", { name: planet.name, exact: true }),
        ).toBeVisible()
        await page.keyboard.press("Escape")
      }
      const filter = page.getByRole("button", {
        name: "Spotlight Inner waters",
      })
      await filter.click()
      for (const planet of snapshot.planets)
        await expect(
          page.getByRole("button", {
            name: new RegExp(`^Explore ${planet.name},`),
          }),
        ).toHaveAttribute(
          "data-region-spotlighted",
          String(planet.region === "inner_waters"),
        )
      await filter.click()
      const root = page.getByRole("region", {
        name: "Interactive music portrait",
      })
      const motion = page.locator("[data-orbit-chapter] > g").first()
      await page.emulateMedia({ reducedMotion: "no-preference" })
      expect(
        await motion.evaluate(node => getComputedStyle(node).animationName),
      ).toBe("none")
      await page.setViewportSize({ width: 1280, height: 900 })
      await expect(root).toHaveAttribute("data-dense-layout", "false")
      await expect
        .poll(() =>
          motion.evaluate(node => getComputedStyle(node).animationName),
        )
        .not.toBe("none")
      await page.setViewportSize({ width, height: 844 })
      await expect(root).toHaveAttribute("data-dense-layout", "true")
      await page.screenshot({
        path: test
          .info()
          .outputPath(`dense-${distribution}-${width}-mobile.png`),
        fullPage: true,
      })
    })
  }

  test("snapshot fixture inherits the production shell font, spacing and global styles", async ({
    page,
  }) => {
    const snapshot = makePublicSnapshot()
    delete snapshot.owner.imageUrl
    await mountSnapshot(page, snapshot)
    const root = page.getByRole("region", {
      name: "Interactive music portrait",
    })
    await expect(root).toBeVisible()
    const inherited = await root.evaluate(node => {
      const s = getComputedStyle(node)
      return {
        font: s.fontFamily,
        lineHeight: s.lineHeight,
        fontSize: s.fontSize,
        shell: !!node.closest(".site-shell .site-main--wide"),
      }
    })
    expect(inherited.font).toBe("Arial, sans-serif")
    expect(
      parseFloat(inherited.lineHeight) / parseFloat(inherited.fontSize),
    ).toBeCloseTo(1.6)
    expect(inherited.shell).toBe(true)
  })

  test("selected artists survive a region move and clear on removal with live focus", async ({
    page,
  }) => {
    await page.emulateMedia({ reducedMotion: "no-preference" })
    const snapshot = makePublicSnapshot()
    delete snapshot.owner.imageUrl
    await mountSnapshot(page, snapshot)
    const artist = page.getByRole("button", { name: /^Explore Artist 2,/ })
    await artist.focus()
    await page.keyboard.press("Enter")
    const moved = structuredClone(snapshot)
    moved.planets[1].region = "outer_reaches"
    await page.evaluate(
      snapshot => window.renderMusicPortrait({ snapshot }),
      moved,
    )
    await expect(
      page.getByRole("heading", { name: "Artist 2", exact: true }),
    ).toBeVisible()
    await expect(artist).toBeFocused()
    await expect(artist).toHaveAttribute("aria-pressed", "true")
    await expect(artist.locator("..")).toHaveAttribute(
      "data-node-key",
      /creative_fuel/,
    )
    moved.planets.splice(1, 1)
    await page.evaluate(
      snapshot => window.renderMusicPortrait({ snapshot }),
      moved,
    )
    const root = page.getByRole("region", {
      name: "Interactive music portrait",
    })
    await expect(root).toHaveAttribute("data-selection", "none")
    await expect(root).toHaveAttribute("data-all-paused", "false")
    await expect(
      page.getByRole("button", { name: "Reset music map" }),
    ).toBeFocused()
  })

  test("selected moons follow their artist's region and fall back to the artist when removed", async ({
    page,
  }) => {
    const snapshot = makePublicSnapshot()
    delete snapshot.owner.imageUrl
    await mountSnapshot(page, snapshot)
    const artist = page.getByRole("button", { name: /^Explore Artist 2,/ })
    await artist.focus()
    await page.keyboard.press("Enter")
    const moon = page.getByRole("button", { name: /^Track Track 4/ })
    await moon.focus()
    await page.keyboard.press("Enter")
    const moved = structuredClone(snapshot)
    moved.planets[1].region = "outer_reaches"
    await page.evaluate(
      snapshot => window.renderMusicPortrait({ snapshot }),
      moved,
    )
    const root = page.getByRole("region", {
      name: "Interactive music portrait",
    })
    await expect(root).toHaveAttribute("data-selection", "track")
    await expect(
      page.getByRole("heading", { name: "Track 4", exact: true }),
    ).toBeVisible()
    await page.keyboard.press("Escape")
    await expect(artist).toBeFocused()
    await moon.focus()
    await page.keyboard.press("Enter")
    await expect(root).toHaveAttribute("data-selection", "track")
    moved.planets[1].moons = []
    await page.evaluate(
      snapshot => window.renderMusicPortrait({ snapshot }),
      moved,
    )
    await expect(root).toHaveAttribute("data-selection", "artist")
    await expect(
      page.getByRole("heading", { name: "Artist 2", exact: true }),
    ).toBeVisible()
    await expect(artist).toBeFocused()
    moved.planets[1].moons = structuredClone(snapshot.planets[1].moons)
    await page.evaluate(
      snapshot => window.renderMusicPortrait({ snapshot }),
      moved,
    )
    await moon.focus()
    await page.keyboard.press("Enter")
    moved.planets.splice(1, 1)
    await page.evaluate(
      snapshot => window.renderMusicPortrait({ snapshot }),
      moved,
    )
    await expect(root).toHaveAttribute("data-selection", "none")
    await expect(root).toHaveAttribute("data-all-paused", "false")
    await expect(
      page.getByRole("button", { name: "Reset music map" }),
    ).toBeFocused()
  })

  for (const kind of ["artist", "moon"]) {
    test(`selected ${kind} clears on a source transition and focus reaches the current map`, async ({
      page,
    }) => {
      const snapshot = makePublicSnapshot()
      delete snapshot.owner.imageUrl
      await mountSnapshot(page, snapshot)
      const artist = page.getByRole("button", { name: /^Explore Artist 2,/ })
      await artist.focus()
      await page.keyboard.press("Enter")
      if (kind === "moon") {
        await page.getByRole("button", { name: /^Track Track 4/ }).focus()
        await page.keyboard.press("Enter")
      }
      await page.evaluate(
        portrait => window.renderMusicPortrait({ portrait }),
        portrait,
      )
      const root = page.getByRole("region", {
        name: "Interactive music portrait",
      })
      await expect(root).toHaveAttribute("data-selection", "none")
      await expect(root).toHaveAttribute("data-all-paused", "false")
      await expect(
        page.getByRole("button", { name: "Reset music map" }),
      ).toBeFocused()
    })
  }

  test("authored catalogue enrichment preserves a valid selected artist and focus", async ({
    page,
  }) => {
    let release
    await page.unroute("**/api/spotify-catalogue")
    await page.route(
      "**/api/spotify-catalogue",
      route =>
        new Promise(resolve => {
          release = async () => {
            await route.fulfill({ status: 200, json: catalogueWithAukai() })
            resolve()
          }
        }),
    )
    const snapshot = makePublicSnapshot()
    delete snapshot.owner.imageUrl
    await mountSnapshot(page, snapshot)
    await page.evaluate(
      portrait => window.renderMusicPortrait({ portrait }),
      portrait,
    )
    const artist = page.getByRole("button", { name: /^Explore Aukai,/ })
    await artist.focus()
    await page.keyboard.press("Enter")
    await expect.poll(() => typeof release).toBe("function")
    await release()
    const root = page.getByRole("region", {
      name: "Interactive music portrait",
    })
    await expect(root).toHaveAttribute("data-catalogue-status", "available")
    await expect(root).toHaveAttribute("data-selection", "artist")
    await expect(artist).toHaveAttribute("aria-pressed", "true")
    await expect(artist).toBeFocused()
  })

  test("shared moons render the selected planet's metadata after input order changes", async ({
    page,
  }) => {
    const snapshot = makePublicSnapshot({ planetCount: 2 })
    delete snapshot.owner.imageUrl
    const shared = snapshot.planets[1].moons[0]
    shared.artistIds = snapshot.planets.map(p => p.id)
    snapshot.planets[0].moons = [
      {
        ...shared,
        name: "Earlier collaboration",
        introducedAt: "2026-10-10T08:00:00.000Z",
      },
    ]
    await mountSnapshot(page, snapshot)
    const artist = page.getByRole("button", { name: /^Explore Artist 1,/ })
    await artist.focus()
    await page.keyboard.press("Enter")
    const moon = page.getByRole("button", {
      name: /^Track Earlier collaboration/,
    })
    await expect(moon).toBeVisible()
    await moon.focus()
    await page.keyboard.press("Enter")
    await expect(
      page.getByRole("heading", { name: "Earlier collaboration", exact: true }),
    ).toBeVisible()
    snapshot.planets.reverse()
    await page.evaluate(
      snapshot => window.renderMusicPortrait({ snapshot }),
      snapshot,
    )
    await expect(
      page.getByRole("heading", { name: "Earlier collaboration", exact: true }),
    ).toBeVisible()
  })

  test("switching between snapshot and authored sources keeps catalogue requests and hooks stable", async ({
    page,
  }) => {
    const errors = monitorPage(page)
    let catalogueRequests = 0
    page.on("request", request => {
      if (request.url().includes("/api/spotify-catalogue")) catalogueRequests++
    })
    const snapshot = makePublicSnapshot({ planetCount: 20 })
    delete snapshot.owner.imageUrl
    await mountSnapshot(page, snapshot)
    await expect(page.getByRole("button", { name: /^Explore / })).toHaveCount(
      20,
    )
    expect(catalogueRequests).toBe(0)
    await page.evaluate(
      portrait => window.renderMusicPortrait({ portrait }),
      portrait,
    )
    await expect(page.getByRole("button", { name: /^Explore / })).toHaveCount(
      10,
    )
    await expect(
      page.getByRole("region", { name: "Interactive music portrait" }),
    ).toHaveAttribute("data-catalogue-status", "unavailable")
    expect(catalogueRequests).toBe(1)
    await page.evaluate(
      snapshot => window.renderMusicPortrait({ snapshot }),
      snapshot,
    )
    await expect(page.getByRole("button", { name: /^Explore / })).toHaveCount(
      20,
    )
    await expect(page.getByRole("img", { name: "Fixture owner" })).toBeVisible()
    expect(catalogueRequests).toBe(1)
    expect(errors).toEqual([])
  })

  test("twenty snapshot artists work on mobile with owner initials, keyboard selection and separate chrome", async ({
    page,
  }) => {
    const errors = monitorPage(page)
    let catalogueRequests = 0
    page.on("request", request => {
      if (
        request.url().includes("spotify-catalogue") ||
        request.url().includes("catalogue-preview")
      )
        catalogueRequests++
    })
    await page.setViewportSize({ width: 390, height: 844 })
    await page.emulateMedia({ reducedMotion: "reduce" })
    const snapshot = makePublicSnapshot({ planetCount: 20 })
    delete snapshot.owner.imageUrl
    await mountSnapshot(page, snapshot)
    const root = page.getByRole("region", {
      name: "Interactive music portrait",
    })
    expect(
      await root
        .locator(":scope > div")
        .evaluate(node => getComputedStyle(node).display),
    ).toBe("grid")
    await expect(page.getByRole("button", { name: /^Explore / })).toHaveCount(
      20,
    )
    const home = page.getByRole("img", { name: "Fixture owner" })
    await expect(home.locator('[data-artwork-fallback="true"]')).toHaveText(
      "FO",
    )
    await expect(
      page.getByText("FIXTURE OWNER · HOME STAR", { exact: true }),
    ).toBeVisible()
    await expect(root).toHaveAttribute("data-catalogue-status", "available")
    const first = page.getByRole("button", { name: /^Explore Artist 1,/ })
    const last = page.getByRole("button", { name: /^Explore Artist 20,/ })
    const targetBox = await first.locator("[data-hit-target]").boundingBox()
    expect(targetBox.width).toBeGreaterThanOrEqual(44)
    expect(targetBox.height).toBeGreaterThanOrEqual(44)
    await first.locator("[data-planet-body]").click()
    await expect(
      page.getByRole("heading", { name: "Artist 1", exact: true }),
    ).toBeVisible()
    await page.keyboard.press("Escape")
    await last.locator("[data-planet-body]").click()
    await expect(
      page.getByRole("heading", { name: "Artist 20", exact: true }),
    ).toBeVisible()
    await page.keyboard.press("Escape")
    await expect(first.locator('[data-artwork-fallback="true"]')).toHaveText(
      "A1",
    )
    await first.focus()
    await page.keyboard.press("Enter")
    await expect(
      page.getByRole("heading", { name: "Artist 1", exact: true }),
    ).toBeVisible()
    await expect(page.getByRole("button", { name: /^Track / })).toHaveCount(0)
    await expect(
      page.getByText("This artist has a place in Fixture owner's music map.", {
        exact: true,
      }),
    ).toBeVisible()
    await page.keyboard.press("Escape")
    await expect(first).toBeFocused()
    await expect(root).toHaveAttribute("data-selection", "none")
    await last.focus()
    await page.keyboard.press("Space")
    await expect(
      page.getByRole("heading", { name: "Artist 20", exact: true }),
    ).toBeVisible()
    await expect(page.getByRole("button", { name: /^Track / })).toHaveCount(3)
    const track = page.getByRole("button", { name: /^Track / }).first()
    await track.focus()
    await page.keyboard.press("Enter")
    await expect(root).toHaveAttribute("data-selection", "track")
    await expect(
      page.getByRole("link", { name: /^Open Track / }),
    ).toHaveAttribute("href", snapshot.planets[19].moons[0].spotifyUrl)
    await page.keyboard.press("Escape")
    await expect(root).toHaveAttribute("data-selection", "artist")
    await expect(last).toBeFocused()
    await page.keyboard.press("Escape")
    await expect(root).toHaveAttribute("data-selection", "none")
    const map = page.getByRole("group", { name: "Living Atlas music map" })
    const mapBox = await map.boundingBox()
    for (const item of [
      page.getByRole("group", { name: "Music map regions" }),
      page.locator("details"),
      page.getByLabel("Spotify catalogue attribution"),
    ]) {
      const box = await item.boundingBox()
      expect(
        box.y + box.height <= mapBox.y || box.y >= mapBox.y + mapBox.height,
      ).toBe(true)
    }
    await page.getByText("How to read this map", { exact: true }).click()
    await expect(
      page.getByText(
        "Automatic regions interpret listening evidence; saved owner choices can override their placement. Select a region name to bring it forward.",
        { exact: true },
      ),
    ).toBeVisible()
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= window.innerWidth,
      ),
    ).toBe(true)
    expect(catalogueRequests).toBe(0)
    expect(errors).toEqual([])
    await page.screenshot({
      path: test.info().outputPath("snapshot-mobile.png"),
      fullPage: true,
    })
  })

  test("snapshot artwork failures preserve accessible names and owner overrides", async ({
    page,
  }) => {
    const snapshot = makePublicSnapshot()
    snapshot.planets[0].imageUrl = "https://i.scdn.co/image/missingartist"
    await page.route("https://i.scdn.co/**", route =>
      route.fulfill({ status: 404, body: "" }),
    )
    await mountSnapshot(page, snapshot, {
      ownerIdentity: {
        displayName: "Guest listener",
        initials: "GL",
        imageUrl: "https://i.scdn.co/image/missingowner",
      },
    })
    await expect(
      page
        .getByRole("img", { name: "Guest listener" })
        .locator('[data-artwork-fallback="true"]'),
    ).toHaveText("GL")
    await expect(
      page
        .getByRole("button", { name: /^Explore Artist 1,/ })
        .locator('[data-artwork-fallback="true"]'),
    ).toHaveText("A1")
    await expect(
      page.getByText("GUEST LISTENER · HOME STAR", { exact: true }),
    ).toBeVisible()
  })
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

test("privacy distinguishes the authored portrait and the closed owner beta", async ({
  page,
}) => {
  await page.goto("/privacy/")
  const copy = await page.getByRole("main").innerText()
  for (const disclosure of [
    /authored.*public catalogue/is,
    /does not read a visitor.s listening history/i,
    /user-top-read/,
    /encrypted refresh token/i,
    /ranked evidence.*draft.*choices/is,
    /weekly.*manual/is,
    /session.*CSRF/is,
    /five.*Hakim.*four friends/is,
    /high-entropy.*unlisted.*anyone with the link/is,
    /no login.*noindex/is,
    /regenerat.*old link/is,
    /public projection/i,
    /saving.*private.*publish.*manual.*scheduled.*regenerat/is,
    /select.*song.*embed.*no autoplay/is,
    /Spotify.s own.*privacy/is,
    /last good.*provider failures/is,
    /deletion.*unpublish.*app-held/is,
    /cleanup.*manual recovery/is,
    /deletion marker/i,
    /Dashboard.*allowlist.*Spotify-side access/is,
    /returning-owner.*reconnection.*not currently supported/is,
  ])
    expect(copy).toMatch(disclosure)
  expect(copy).not.toMatch(
    /does not connect a visitor.s Spotify account|read anyone.s listening history/i,
  )
  await expect(page.getByRole("heading", { level: 1 })).toHaveCount(1)
  for (const width of [1280, 390, 320]) {
    await page.setViewportSize({ width, height: 844 })
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ),
    ).toBe(true)
    await page.screenshot({
      path: test.info().outputPath(`privacy-${width}.png`),
      fullPage: true,
    })
  }
})

test("case study explains snapshot beta limits and has unique section targets", async ({
  page,
}) => {
  await page.goto("/music/case-study/")
  const copy = await page.getByRole("main").innerText()
  for (const disclosure of [
    /deterministic.*snapshot/is,
    /Inner waters.*Familiar seas.*Outer reaches/is,
    /16.20.*artists/is,
    /shared renderer.*Portrait 1/is,
    /invite-only.*OAuth/is,
    /private studio.*complete.*saved choices/is,
    /unlisted capability link.*weekly/is,
    /selected.song.*embed/is,
    /finite.*shooting stars.*reduced.motion/is,
    /encrypted.*server/is,
    /public allowlist.*noindex.*generic not-found/is,
    /deletion.*last.good/is,
    /top-item windows.*per-artist play counts.*top-three/is,
    /staged preview.*friend pilot/is,
  ])
    expect(copy).toMatch(disclosure)
  expect(copy).not.toMatch(
    /most listened|exact top songs|live ranking|No Spotify user account is connected|does not calculate rankings, stream audio/i,
  )
  const ids = await page
    .locator("[id]")
    .evaluateAll(nodes => nodes.map(node => node.id))
  expect(new Set(ids).size).toBe(ids.length)
  for (const width of [1280, 390, 320]) {
    await page.setViewportSize({ width, height: 844 })
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ),
    ).toBe(true)
    await page.screenshot({
      path: test.info().outputPath(`case-study-${width}.png`),
      fullPage: true,
    })
  }
})

for (const width of [1280, 390, 320])
  test(`authored whole-page landmarks and keyboard remain usable at ${width}px`, async ({
    page,
  }) => {
    await page.setViewportSize({ width, height: 844 })
    await page.emulateMedia({ reducedMotion: "reduce", forcedColors: "active" })
    await page.goto("/music/")
    await expect(page.getByRole("heading", { level: 1 })).toHaveCount(1)
    await expect(page.getByRole("main")).toHaveCount(1)
    await expect(page.getByRole("navigation")).toHaveCount(1)
    await expect(page.getByRole("contentinfo")).toHaveCount(1)
    const map = page.getByRole("region", { name: "Interactive music portrait" })
    await expect(map).toHaveAttribute("data-reduced-motion", "true")
    await expect(map).toHaveAttribute("data-all-paused", "true")
    const region = page.getByRole("button", { name: "Spotlight Inner waters" })
    await region.focus()
    await page.keyboard.press("Space")
    await expect(region).toHaveAttribute("aria-pressed", "true")
    expect(
      await region.evaluate(node => getComputedStyle(node).outlineStyle),
    ).not.toBe("none")
    await page.keyboard.press("Tab")
    await expect(
      page.getByRole("button", { name: "Spotlight Familiar seas" }),
    ).toBeFocused()
    const artist = page.getByRole("button", { name: /^Explore Aukai/ })
    await artist.focus()
    await page.keyboard.press("Enter")
    const song = page.getByRole("button", { name: /^Track / }).first()
    await song.focus()
    await page.keyboard.press("Enter")
    const details = page.getByRole("region", { name: "Selected music details" })
    const link = details.getByRole("link", { name: /^Open / })
    await link.focus()
    await expect(link).toHaveAttribute(
      "href",
      /^https:\/\/open.spotify.com\/track\/[A-Za-z0-9]{22}$/,
    )
    await expect(page.locator("iframe")).toHaveCount(1)
    const chart = await page
      .getByRole("group", { name: "Living Atlas music map" })
      .boundingBox()
    const detailBox = await details.boundingBox()
    expect(detailBox.y).toBeGreaterThanOrEqual(chart.y + chart.height)
    const attribution = await page
      .getByLabel("Spotify catalogue attribution")
      .boundingBox()
    expect(attribution.y).toBeGreaterThanOrEqual(detailBox.y + detailBox.height)
    await page.keyboard.press("Escape")
    await expect(artist).toBeFocused()
    await page.keyboard.press("Escape")
    await expect(artist).toBeFocused()
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ),
    ).toBe(true)
  })

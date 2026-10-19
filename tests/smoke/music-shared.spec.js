const { test, expect } = require("@playwright/test")
const webpack = require("webpack")
const path = require("node:path")
const fs = require("node:fs/promises")
const os = require("node:os")
const { makePublicSnapshot } = require("../music/fixtures/music-beta")

const capability = Buffer.alloc(32, 11).toString("base64url")
const otherCapability = Buffer.alloc(32, 12).toString("base64url")
const sharedPath = token => `/music/galaxy/${token}/`
let directory
let bundle

test.beforeAll(async () => {
  directory = await fs.mkdtemp(path.join(os.tmpdir(), "music-shared-test-"))
  const source = file =>
    path.resolve(__dirname, "../..", file).replaceAll("\\", "/")
  const compiler = webpack({
    mode: "development",
    devtool: false,
    context: source("."),
    entry: `data:text/javascript,import React from "react";import {createRoot} from "react-dom/client";import {flushSync} from "react-dom";import "${source("src/styles/global.css")}";import Page,{Head} from "${source("src/pages/music/galaxy.js")}";const root=createRoot(document.getElementById("fixture"));window.renderShared=pathname=>flushSync(()=>root.render(React.createElement(React.Fragment,null,React.createElement(Head),React.createElement(Page,{location:{pathname}}))));window.unmountShared=()=>root.unmount();window.renderShared(window.location.pathname);`,
    output: { path: directory, filename: "shared.js" },
    plugins: [
      new webpack.DefinePlugin({
        "process.env.GATSBY_MUSIC_DRAFT_PREVIEW": JSON.stringify("0"),
      }),
      new webpack.NormalModuleReplacementPlugin(
        /^gatsby$/,
        `data:text/javascript,import React from "react";export const Link=({to,activeClassName,...props})=>React.createElement("a",{...props,href:to});export const graphql=()=>null;export const useStaticQuery=()=>({site:{siteMetadata:{author:"Abdul Hakim Norazman",description:"Fixture",siteUrl:"https://www.madebyhakim.com"}}});`,
      ),
    ],
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
  })
  try {
    await new Promise((resolve, reject) =>
      compiler.run((error, stats) =>
        error || stats.hasErrors()
          ? reject(
              error || new Error(stats.toString({ all: false, errors: true })),
            )
          : resolve(),
      ),
    )
    bundle = await fs.readFile(path.join(directory, "shared.js"), "utf8")
  } finally {
    await new Promise(resolve => compiler.close(resolve))
  }
})
test.afterAll(async () => {
  if (directory) await fs.rm(directory, { recursive: true, force: true })
})

function snapshot(extra = {}) {
  const value = makePublicSnapshot({ planetCount: 4, ...extra })
  delete value.owner.imageUrl
  return value
}

async function mount(
  page,
  {
    pathname = sharedPath(capability),
    respond = () => ({ json: snapshot() }),
    built = false,
  } = {},
) {
  const requests = []
  const errors = []
  page.on("pageerror", error => errors.push(error.message))
  page.on("console", message => {
    if (
      message.type() === "error" &&
      !message.text().startsWith("Failed to load resource")
    )
      errors.push(message.text())
  })
  await page.route("**/*", async route => {
    const request = route.request()
    const url = new URL(request.url())
    if (url.pathname.startsWith("/api/")) {
      requests.push({
        path: url.pathname,
        query: [...url.searchParams],
        method: request.method(),
        headers: request.headers(),
        body: request.postData(),
      })
      return route.fulfill(await respond(requests.at(-1)))
    }
    if (url.origin === "https://open.spotify.com")
      return route.fulfill({
        contentType: "text/html",
        body: "<p>Local player</p>",
      })
    if (url.origin === "https://i.scdn.co")
      return route.fulfill({ status: 200, body: "", contentType: "text/plain" })
    if (url.pathname === "/music/spotify-mark.svg")
      return route.fulfill({
        contentType: "image/svg+xml",
        path: path.resolve(__dirname, "../../static/music/spotify-mark.svg"),
      })
    if (!built && request.isNavigationRequest())
      return route.fulfill({
        contentType: "text/html",
        body: '<!doctype html><html><head><meta name="viewport" content="width=device-width,initial-scale=1"></head><body><div id="fixture"></div></body></html>',
      })
    if (built) return route.continue()
    return route.fulfill({ status: 200, body: "", contentType: "text/plain" })
  })
  await page.goto(pathname)
  if (!built) await page.addScriptTag({ content: bundle })
  return { requests, errors }
}

test("valid public link loads without cookies, renders the accepted map and explicit player", async ({
  page,
  context,
}) => {
  await context.addCookies([
    {
      name: "owner-session-sentinel",
      value: "private",
      domain: "127.0.0.1",
      path: "/",
    },
  ])
  await page.addInitScript(() => {
    const original = window.fetch
    window.publicOptions = []
    window.fetch = (url, options) => {
      window.publicOptions.push(options)
      return original(url, options)
    }
  })
  const { requests, errors } = await mount(page)
  await expect(page.getByRole("heading", { level: 1 })).toHaveText(
    "Fixture owner’s Music Portrait",
  )
  await expect(page.locator("time")).toHaveAttribute(
    "datetime",
    "2026-10-17T08:00:00.000Z",
  )
  await expect(page.getByText(/Last successful update/)).toBeVisible()
  await expect(
    page.getByRole("button", { name: /^Explore Artist/ }),
  ).toHaveCount(4)
  await expect(page.locator("iframe")).toHaveCount(0)
  const artist = page.getByRole("button", { name: /^Explore Artist 2[,. ]/ })
  await artist.focus()
  await page.keyboard.press("Enter")
  const song = page.getByRole("button", { name: /^Track Track/ }).first()
  await song.focus()
  await page.keyboard.press("Enter")
  await expect(page.locator("iframe")).toHaveCount(1)
  await expect(page.locator("iframe")).toHaveAttribute(
    "src",
    /^https:\/\/open.spotify.com\/embed\/track\/[A-Za-z0-9]{22}$/,
  )
  await page.keyboard.press("Escape")
  await expect(page.locator("iframe")).toHaveCount(0)
  expect(requests).toHaveLength(1)
  expect(requests[0]).toMatchObject({
    path: "/api/music-portrait-public",
    query: [["capability", capability]],
    method: "GET",
    body: null,
  })
  expect(requests[0].headers.cookie).toBeUndefined()
  expect(requests[0].headers.referer).toBeUndefined()
  expect(requests[0].headers["x-csrf-token"]).toBeUndefined()
  expect(await page.evaluate(() => window.publicOptions[0])).toMatchObject({
    credentials: "omit",
    cache: "no-store",
    referrerPolicy: "no-referrer",
  })
  await expect(page.locator("input, textarea, select")).toHaveCount(0)
  await expect(
    page.getByRole("button", {
      name: /publish|regenerate|refresh|delete|pause scheduled|save choices/i,
    }),
  ).toHaveCount(0)
  expect(await page.locator("body").innerHTML()).not.toContain(capability)
  expect(errors).toEqual([])
})

test("shared guide and artist names describe evidence and saved region choices", async ({
  page,
}) => {
  await page.setViewportSize({ width: 320, height: 844 })
  await mount(page)
  await page.getByText("How to read this map", { exact: true }).click()
  const guide = page
    .locator("details")
    .filter({ hasText: "How to read this map" })
  const copy = await guide.innerText()
  expect(copy).toMatch(/size.*listening evidence.*1 to 5/is)
  expect(copy).toMatch(
    /automatic regions.*listening evidence.*saved owner choices.*override/is,
  )
  expect(copy).not.toMatch(
    /authored prominence|memory|creativity|fuels creativity/i,
  )
  expect(copy).toContain(
    "Automatic placement favours short-term listening evidence.",
  )
  expect(copy).toContain(
    "Automatic placement groups artists ranked in both medium- and long-term artist windows.",
  )
  expect(copy).toContain(
    "Automatic placement holds the remaining evidenced artists.",
  )
  await expect(
    page.getByRole("button", { name: /^Explore Artist 1,/ }),
  ).toHaveAccessibleName(/listening evidence size 1 out of 5/)
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true)
  await page.screenshot({
    path: test.info().outputPath("shared-guide-320.png"),
    fullPage: true,
  })
})

for (const pathname of [
  "/music/galaxy/",
  "/music/galaxy/invalid/",
  `${sharedPath(capability)}extra/`,
  sharedPath(`${capability.slice(0, -1)}B`),
])
  test(`invalid local path ${pathname.length} has normal not-found and no API request`, async ({
    page,
  }) => {
    const { requests } = await mount(page, { pathname })
    await expect(
      page.getByRole("heading", { name: "Page not found" }),
    ).toBeVisible()
    await expect(
      page.getByText(
        "That page does not exist, or it may have moved as the site has evolved.",
      ),
    ).toBeVisible()
    expect(requests).toEqual([])
    expect(await page.locator("body").innerHTML()).not.toContain(capability)
  })

test("all API not-found bodies have exactly the site's normal not-found presentation", async ({
  page,
}) => {
  let copy
  for (const reason of ["unknown", "revoked", "old", "prepared", "deleted"]) {
    await page.unrouteAll()
    await mount(page, {
      respond: () => ({
        status: 404,
        json: { error: `PRIVATE_SENTINEL ${reason}` },
      }),
    })
    await expect(
      page.getByRole("heading", { name: "Page not found" }),
    ).toBeVisible()
    const current = await page.locator("main").innerText()
    if (copy) expect(current).toBe(copy)
    copy = current
    expect(current).not.toContain("PRIVATE_SENTINEL")
  }
})

for (const failure of [
  "503",
  "invalid-json",
  "private-field",
  "invalid-snapshot",
])
  test(`${failure} is generic unavailable and can retry without showing response details`, async ({
    page,
  }) => {
    let attempt = 0
    const value = snapshot()
    const { requests } = await mount(page, {
      respond: () => {
        if (attempt++) return { json: value }
        if (failure === "503")
          return { status: 503, json: { error: "PRIVATE_SENTINEL" } }
        if (failure === "invalid-json")
          return { contentType: "application/json", body: "PRIVATE_SENTINEL" }
        if (failure === "private-field")
          return { json: { ...value, shareHash: "PRIVATE_SENTINEL" } }
        return { json: { ...value, planets: null } }
      },
    })
    await expect(page.getByRole("status")).toHaveText(
      "This portrait is currently unavailable. Please try again.",
    )
    await expect(page.locator('[data-source="snapshot"]')).toHaveCount(0)
    expect(await page.locator("main").innerText()).not.toContain(
      "PRIVATE_SENTINEL",
    )
    await page.getByRole("button", { name: "Try again" }).click()
    await expect(page.locator('[data-source="snapshot"]')).toBeVisible()
    expect(requests).toHaveLength(2)
  })

test("obsolete and unmounted requests abort; late fetch and JSON results cannot replace the current portrait", async ({
  page,
}) => {
  await page.addInitScript(() => {
    const original = window.fetch
    window.deferred = []
    window.fetch = (url, options) => {
      if (!String(url).startsWith("/api/music-portrait-public"))
        return original(url, options)
      const entry = { aborted: false }
      options.signal.addEventListener("abort", () => {
        entry.aborted = true
      })
      window.deferred.push(entry)
      return new Promise(resolve => {
        entry.resolve = value =>
          resolve({
            status: 200,
            json: () =>
              new Promise(done => {
                entry.json = () => done(value)
              }),
          })
      })
    }
  })
  const { errors } = await mount(page)
  await expect(page.getByRole("status")).toContainText("Loading")
  await page.evaluate(
    value => window.deferred[0].resolve(value),
    snapshot({ owner: { displayName: "Old owner", initials: "OO" } }),
  )
  await expect
    .poll(() => page.evaluate(() => Boolean(window.deferred[0].json)))
    .toBe(true)
  await page.evaluate(
    pathname => window.renderShared(pathname),
    sharedPath(otherCapability),
  )
  expect(await page.evaluate(() => window.deferred[0].aborted)).toBe(true)
  await page.evaluate(
    value => window.deferred[1].resolve(value),
    snapshot({ owner: { displayName: "Current owner", initials: "CO" } }),
  )
  await expect
    .poll(() => page.evaluate(() => Boolean(window.deferred[1].json)))
    .toBe(true)
  await page.evaluate(() => {
    window.deferred[1].json()
    window.deferred[0].json()
  })
  await expect(page.getByRole("heading", { level: 1 })).toHaveText(
    "Current owner’s Music Portrait",
  )
  await page.evaluate(
    pathname => window.renderShared(pathname),
    sharedPath(capability),
  )
  await expect(page.locator('[data-source="snapshot"]')).toHaveCount(0)
  await page.evaluate(() => window.unmountShared())
  expect(await page.evaluate(() => window.deferred[2].aborted)).toBe(true)
  await page.evaluate(value => window.deferred[2].resolve(value), snapshot())
  await expect(page.locator('[data-source="snapshot"]')).toHaveCount(0)
  expect(errors).toEqual([])
})

for (const width of [1280, 390, 320])
  test(`shared page preserves keyboard, separate chrome and reduced motion at ${width}px`, async ({
    page,
  }) => {
    await page.setViewportSize({ width, height: 844 })
    await page.emulateMedia({ reducedMotion: "reduce" })
    const { errors } = await mount(page)
    await expect(page.getByRole("heading", { level: 1 })).toHaveCount(1)
    await expect(page.getByRole("main")).toHaveCount(1)
    await expect(page.getByRole("navigation")).toHaveCount(1)
    await expect(page.getByRole("contentinfo")).toHaveCount(1)
    const map = page.getByRole("region", { name: "Interactive music portrait" })
    await expect(map).toHaveAttribute("data-reduced-motion", "true")
    await expect(page.locator(".site-main")).toHaveCSS(
      "font-family",
      "Arial, sans-serif",
    )
    await expect(page.locator(".site-main")).toHaveCSS(
      "color",
      "rgb(238, 238, 238)",
    )
    await expect(page.locator("[data-shooting-stars]")).toHaveCount(0)
    const labels = await page
      .getByRole("group", { name: "Music map regions" })
      .evaluate(group =>
        [...group.querySelectorAll("button")].map(button => {
          const box = button.getBoundingClientRect()
          const text = document.createRange()
          text.selectNodeContents(button)
          const lines = [...text.getClientRects()]
          const style = getComputedStyle(button)
          const canvas = document.createElement("canvas").getContext("2d")
          canvas.font = style.font
          return {
            name: button.textContent,
            wordWidth: Math.max(
              ...button.textContent
                .split(/\s+/)
                .map(word => canvas.measureText(word).width),
            ),
            availableWidth:
              button.clientWidth -
              parseFloat(style.paddingLeft) -
              parseFloat(style.paddingRight),
            contained:
              lines.length <= 2 &&
              lines.every(
                line => line.left >= box.left && line.right <= box.right,
              ),
          }
        }),
      )
    for (const label of labels) {
      expect(label.wordWidth, label.name).toBeLessThanOrEqual(
        label.availableWidth,
      )
      expect(label.contained, label.name).toBe(true)
    }
    const chart = await page
      .getByRole("group", { name: "Living Atlas music map" })
      .boundingBox()
    for (const item of [
      page.getByRole("group", { name: "Music map regions" }),
      page.locator("details").filter({ hasText: "How to read this map" }),
      page.getByLabel("Spotify catalogue attribution"),
    ]) {
      const box = await item.boundingBox()
      expect(
        box.x + box.width <= chart.x ||
          box.x >= chart.x + chart.width ||
          box.y + box.height <= chart.y ||
          box.y >= chart.y + chart.height,
      ).toBe(true)
    }
    await expect(page.locator('meta[name="robots"]')).toHaveAttribute(
      "content",
      "noindex, nofollow",
    )
    await expect(page.locator('meta[name="referrer"]')).toHaveAttribute(
      "content",
      "no-referrer",
    )
    const artist = page.getByRole("button", { name: /^Explore Artist 2[,. ]/ })
    await artist.focus()
    await page.keyboard.press("Enter")
    await expect(
      page.getByRole("group", { name: "Songs orbiting Artist 2" }),
    ).toBeVisible()
    const song = page.getByRole("button", { name: /^Track Track/ }).first()
    await song.focus()
    await page.keyboard.press("Space")
    await expect(page.locator("iframe")).toHaveCount(1)
    await page.keyboard.press("Escape")
    await page.keyboard.press("Escape")
    await expect(artist).toBeFocused()
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ),
    ).toBe(true)
    expect(await page.locator("head").innerHTML()).not.toContain(capability)
    expect(errors).toEqual([])
    await page.evaluate(() => window.scrollTo(0, 0))
    await expect.poll(() => page.evaluate(() => window.scrollY)).toBe(0)
    await expect(page.getByRole("heading", { level: 1 })).toBeInViewport()
    await expect(page.locator(".site-nav")).toHaveCSS(
      "transform",
      "matrix(1, 0, 0, 1, 0, 0)",
    )
    await page.screenshot({
      path: test.info().outputPath(`shared-${width}.png`),
      fullPage: true,
    })
  })

test("shared fallback keeps credits, canonical links and focus outside the map", async ({
  page,
}) => {
  await page.emulateMedia({ reducedMotion: "reduce", forcedColors: "active" })
  const { errors } = await mount(page)
  await page.route("https://open.spotify.com/embed/**", route =>
    route.fulfill({ status: 503, body: "Player unavailable" }),
  )
  const region = page.getByRole("button", { name: "Spotlight Inner waters" })
  await region.focus()
  await page.keyboard.press("Space")
  await expect(region).toHaveCSS("outline-style", "solid")
  const artist = page.getByRole("button", { name: /^Explore Artist 2[,. ]/ })
  await artist.focus()
  await page.keyboard.press("Enter")
  await expect(artist.locator('[data-artwork-fallback="true"]')).toHaveText(
    "A2",
  )
  const song = page.getByRole("button", { name: /^Track Track/ }).first()
  await song.focus()
  await page.keyboard.press("Enter")
  const details = page.getByRole("region", { name: "Selected music details" })
  await expect(details.getByText(/^By Artist/)).toBeVisible()
  const link = details.getByRole("link", { name: /^Open Track/ })
  await link.focus()
  await expect(link).toHaveAttribute(
    "href",
    /^https:\/\/open.spotify.com\/track\/[A-Za-z0-9]{22}$/,
  )
  await page.keyboard.press("Escape")
  await expect(artist).toBeFocused()
  const navLink = page.getByRole("navigation").getByRole("link").first()
  await navLink.focus()
  await page.keyboard.press("Escape")
  await expect(navLink).toBeFocused()
  await expect(page.locator('[data-selection="artist"]')).toHaveCount(1)
  const copy = await page.getByRole("main").innerText()
  expect(copy).not.toMatch(
    /csrfToken|refreshToken|ranked evidence|overrides|private studio|save choices/i,
  )
  expect(await page.locator("body").innerHTML()).not.toContain(capability)
  expect(errors).toEqual([])
})

for (const field of ["credential", "ranked evidence", "saved choices"])
  test(`shared viewer rejects nested private ${field} without disclosure`, async ({
    page,
  }) => {
    const value = snapshot()
    if (field === "credential") value.owner.refreshToken = "PRIVATE_SENTINEL"
    else if (field === "ranked evidence")
      value.planets[0].ranks = { short_term: "PRIVATE_SENTINEL" }
    else value.planets[0].overrides = { note: "PRIVATE_SENTINEL" }
    await mount(page, { respond: () => ({ json: value }) })
    await expect(page.getByRole("status")).toHaveText(
      "This portrait is currently unavailable. Please try again.",
    )
    await expect(page.getByRole("status")).toHaveCount(1)
    await expect(page.getByRole("heading", { level: 1 })).toHaveCount(1)
    await expect(page.locator('[data-source="snapshot"]')).toHaveCount(0)
    expect(await page.getByRole("main").innerText()).not.toMatch(
      /PRIVATE_SENTINEL|refreshToken|short_term|overrides/,
    )
    expect(await page.locator("body").innerHTML()).not.toContain(capability)
  })

test("shared snapshots retain finite decorative arrivals without an automatic player", async ({
  page,
}) => {
  await page.clock.setFixedTime(new Date("2026-10-18T08:00:00.000Z"))
  await page.emulateMedia({ reducedMotion: "no-preference" })
  const { errors } = await mount(page)
  const layer = page.locator("[data-shooting-stars]")
  await expect(layer).toHaveCount(1)
  await expect(layer).toHaveAttribute("aria-hidden", "true")
  await expect(layer).toHaveAttribute("pointer-events", "none")
  await expect(page.locator("[data-arrival-track]")).toHaveCount(3)
  await expect(page.locator("iframe")).toHaveCount(0)
  await expect(layer).toHaveCount(0, { timeout: 4000 })
  await page.evaluate(
    pathname => window.renderShared(pathname),
    sharedPath(capability),
  )
  await expect(layer).toHaveCount(0)
  expect(errors).toEqual([])
})

test("built client-only route hydrates with safe metadata and no concrete generated share URLs", async ({
  page,
}) => {
  const { requests, errors } = await mount(page, { built: true })
  await expect(page.getByRole("heading", { level: 1 })).toHaveText(
    "Fixture owner’s Music Portrait",
  )
  await expect(page.locator('[data-source="snapshot"]')).toBeVisible()
  await expect(page.locator('meta[name="robots"]')).toHaveAttribute(
    "content",
    "noindex, nofollow",
  )
  await expect(page.locator('meta[name="referrer"]')).toHaveAttribute(
    "content",
    "no-referrer",
  )
  expect(requests).toHaveLength(1)
  await expect(page.locator('nav a[href*="galaxy"]')).toHaveCount(0)
  const routeData = JSON.parse(
    await fs.readFile(
      path.resolve(
        __dirname,
        "../../public/page-data/music/galaxy/page-data.json",
      ),
      "utf8",
    ),
  )
  expect(routeData.matchPath).toBe("/music/galaxy/*")
  expect(JSON.stringify(routeData)).not.toContain(capability)
  const generated = await fs.readFile(
    path.resolve(__dirname, "../../public/music/galaxy/index.html"),
    "utf8",
  )
  expect(generated).not.toContain(capability)
  expect(generated).not.toContain("Fixture owner")
  expect(generated).toContain("noindex, nofollow")
  const staticFiles = await fs.readdir(path.resolve(__dirname, "../../public"))
  for (const filename of staticFiles.filter(name =>
    /sitemap.*\.xml$|robots\.txt$/.test(name),
  )) {
    const body = await fs.readFile(
      path.resolve(__dirname, "../../public", filename),
      "utf8",
    )
    expect(body).not.toContain("/music/galaxy")
    expect(body).not.toContain(capability)
  }
  expect(errors).toEqual([])
  await page.screenshot({
    path: test.info().outputPath("shared-built.png"),
    fullPage: true,
  })
})

test("built unknown and invalid links retain the ordinary site 404 without extra API calls", async ({
  page,
}) => {
  const { requests, errors } = await mount(page, {
    built: true,
    respond: () => ({ status: 404, json: { error: "PRIVATE_SENTINEL" } }),
  })
  await expect(
    page.getByRole("heading", { name: "Page not found" }),
  ).toBeVisible()
  const missing = await page.locator("main").innerText()
  await page.goto("/404/")
  await expect(
    page.getByRole("heading", { name: "Page not found" }),
  ).toBeVisible()
  expect(await page.locator("main").innerText()).toBe(missing)
  await page.goto("/music/galaxy/invalid/")
  await expect(
    page.getByRole("heading", { name: "Page not found" }),
  ).toBeVisible()
  expect(await page.locator("main").innerText()).toBe(missing)
  expect(requests).toHaveLength(1)
  expect(errors).toEqual([])
})

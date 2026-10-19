const { test, expect } = require("@playwright/test")
const webpack = require("webpack")
const path = require("node:path")
const fs = require("node:fs/promises")
const os = require("node:os")
const { makePublicSnapshot, artistId } = require("../music/fixtures/music-beta")

let bundle
let directory
const sharedUrl = `https://madebyhakim.com/music/galaxy/${"a".repeat(43)}/`
const rotatedUrl = sharedUrl.replace("a".repeat(43), "b".repeat(43))
function projection(extra = {}) {
  const draft = makePublicSnapshot({ planetCount: 3 })
  return {
    owner: {
      ...draft.owner,
      paused: false,
      reconnectRequired: false,
      published: false,
      lastSuccessfulUpdateAt: draft.lastSuccessfulUpdateAt,
      lastManualRefreshAt: null,
      overrides: {
        [artistId(0)]: { pinned: false, note: "Saved note" },
        [artistId(1)]: { pinned: true },
        [artistId(99)]: {
          pinned: false,
          region: "outer_reaches",
          note: "Dormant",
        },
      },
    },
    draft,
    publicUrl: null,
    csrfToken: "c".repeat(43),
    refreshStatus: { status: "idle", message: "Your portrait is ready." },
    ...extra,
  }
}

test.beforeAll(async () => {
  directory = await fs.mkdtemp(path.join(os.tmpdir(), "music-owner-test-"))
  const component = path
    .resolve(__dirname, "../../src/components/music/MusicPortraitStudio.js")
    .replaceAll("\\", "/")
  const globalStyles = path
    .resolve(__dirname, "../../src/styles/global.css")
    .replaceAll("\\", "/")
  const compiler = webpack({
    mode: "development",
    devtool: false,
    context: path.resolve(__dirname, "../.."),
    entry: `data:text/javascript,import React from "react";import {createRoot} from "react-dom/client";import "${globalStyles}";import Studio from "${component}";const root=createRoot(document.getElementById("fixture"));window.mountStudio=()=>root.render(React.createElement(Studio));window.unmountStudio=()=>root.unmount();window.mountStudio();`,
    output: { path: directory, filename: "studio.js" },
    plugins: [
      new webpack.DefinePlugin({
        "process.env.GATSBY_MUSIC_DRAFT_PREVIEW": JSON.stringify("0"),
      }),
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
    bundle = await fs.readFile(path.join(directory, "studio.js"), "utf8")
  } finally {
    await new Promise(resolve => compiler.close(resolve))
  }
})
test.afterAll(async () => {
  if (directory) await fs.rm(directory, { recursive: true, force: true })
})

async function mount(
  page,
  { state = projection(), status = 200, mutate, query = "", load } = {},
) {
  const errors = []
  const requests = []
  page.on("pageerror", error => errors.push(error.message))
  page.on("console", message => {
    if (message.type() === "error") errors.push(message.text())
  })
  await page.route("**/*", async route => {
    const request = route.request()
    const url = new URL(request.url())
    if (url.pathname === "/music/create/")
      return route.fulfill({
        contentType: "text/html",
        body: '<!doctype html><html><head><meta name="viewport" content="width=device-width,initial-scale=1"></head><body><div class="site-shell"><main class="site-main site-main--wide"><div id="fixture"></div></main></div></body></html>',
      })
    if (url.pathname === "/music/spotify-mark.svg")
      return route.fulfill({
        contentType: "image/svg+xml",
        path: path.resolve(__dirname, "../../static/music/spotify-mark.svg"),
      })
    if (url.pathname.startsWith("/api/music-portrait-")) {
      requests.push({
        path: url.pathname,
        method: request.method(),
        headers: request.headers(),
        body: request.postDataJSON(),
      })
      if (request.method() === "GET" && load) return route.fulfill(await load())
      if (request.method() === "GET")
        return route.fulfill({
          status,
          json:
            status === 200
              ? state
              : { error: "INTERNAL_SENTINEL provider details" },
        })
      const result = await mutate?.(requests.at(-1), requests)
      return route.fulfill(result || { json: state })
    }
    return route.fulfill({ status: 200, contentType: "text/plain", body: "" })
  })
  await page.goto(`/music/create/${query}`)
  await page.addScriptTag({ content: bundle })
  return { requests, errors }
}

test("no session has one action and a valid invite starts only the local auth route", async ({
  page,
}) => {
  await mount(page, { status: 401, query: `?invite=${"i".repeat(43)}` })
  const action = page.getByRole("link", { name: "Connect Spotify" })
  await expect(action).toHaveAttribute(
    "href",
    `/api/music-portrait-auth-start?invite=${"i".repeat(43)}`,
  )
  await expect(page.getByRole("button")).toHaveCount(0)
  await page.route("**/api/music-portrait-auth-start?*", route =>
    route.fulfill({ contentType: "text/html", body: "Local auth start" }),
  )
  await action.click()
  await expect(page.getByText("Local auth start")).toBeVisible()
})

for (const status of [400, 401, 409, 503])
  test(`safe unauthenticated ${status} has one primary action`, async ({
    page,
  }) => {
    await mount(page, { status })
    await expect(page.getByRole("button", { name: "Try again" })).toBeVisible()
    await expect(page.getByRole("button")).toHaveCount(1)
    await expect(
      page.getByText("INTERNAL_SENTINEL", { exact: false }),
    ).toHaveCount(0)
    await expect(page.getByRole("heading", { level: 1 })).toHaveCount(1)
  })

test("saved controls reload from overrides and save a complete map with absent automatic region", async ({
  page,
}) => {
  const state = projection()
  const { requests } = await mount(page, {
    state,
    mutate: request => {
      state.owner.overrides = request.body.overrides
      state.csrfToken = "d".repeat(43)
      return { json: state }
    },
  })
  await expect(page.locator('[data-source="snapshot"]')).toBeVisible()
  await expect(page.getByLabel("Note for Artist 1")).toHaveValue("Saved note")
  await expect(page.getByLabel("Pin Artist 2")).toBeChecked()
  await expect(page.getByLabel("Region for Artist 1")).toHaveValue("")
  await expect(page.getByLabel("Note for Artist 1")).toHaveAttribute(
    "maxlength",
    "500",
  )
  await page.getByLabel("Note for Artist 1").fill("Edited note")
  await page.getByRole("button", { name: "Save choices" }).click()
  await expect(page.getByRole("status")).toContainText("Choices saved")
  const saved = requests[1]
  expect(saved.method).toBe("PATCH")
  expect(saved.headers["x-csrf-token"]).toBe("c".repeat(43))
  expect(saved.headers["content-type"]).toBe("application/json")
  expect(saved.body).toEqual({
    overrides: {
      ...projection().owner.overrides,
      [artistId(0)]: { pinned: false, note: "Edited note" },
    },
  })
  await page.getByLabel("Pin Artist 1").check()
  await page.getByLabel("Region for Artist 1").selectOption("inner_waters")
  await page.getByRole("button", { name: "Save choices" }).click()
  await expect(page.getByRole("status")).toContainText("Choices saved")
  expect(requests[2].headers["x-csrf-token"]).toBe("d".repeat(43))
  expect(requests[2].body.overrides[artistId(0)]).toEqual({
    pinned: true,
    region: "inner_waters",
    note: "Edited note",
  })
  await page.getByLabel("Region for Artist 1").selectOption("")
  await page.getByLabel("Pin Artist 1").uncheck()
  await page.getByRole("button", { name: "Save choices" }).click()
  await expect(page.getByRole("status")).toContainText("Choices saved")
  expect(requests[3].body.overrides[artistId(0)]).toEqual({
    pinned: false,
    note: "Edited note",
  })
  await page.reload()
  await page.addScriptTag({ content: bundle })
  await expect(page.getByLabel("Note for Artist 1")).toHaveValue("Edited note")
})

test("failed save retains local edits; pending save disables controls and deduplicates clicks", async ({
  page,
}) => {
  let release
  const pending = new Promise(resolve => {
    release = resolve
  })
  const { requests } = await mount(page, {
    mutate: async () => {
      await pending
      return { status: 503, json: { error: "INTERNAL_SENTINEL" } }
    },
  })
  await page.getByLabel("Note for Artist 1").fill("Keep this edit")
  const save = page.getByRole("button", { name: "Save choices" })
  await save.click()
  await expect(save).toBeDisabled()
  await expect(page.getByLabel("Note for Artist 1")).toBeDisabled()
  await save.evaluate(button => {
    button.click()
    button.click()
  })
  expect(requests.filter(r => r.method === "PATCH")).toHaveLength(1)
  release()
  await expect(page.getByRole("status")).toContainText("could not")
  await expect(page.getByLabel("Note for Artist 1")).toHaveValue(
    "Keep this edit",
  )
  await expect(page.locator('[data-source="snapshot"]')).toBeVisible()
  await expect(
    page.getByText("INTERNAL_SENTINEL", { exact: false }),
  ).toHaveCount(0)
})

test("an unrelated scheduling response preserves unsaved choices", async ({
  page,
}) => {
  await mount(page, {
    mutate: request => ({
      json: projection({
        owner: { ...projection().owner, paused: request.body.paused },
      }),
    }),
  })
  await page.getByLabel("Note for Artist 1").fill("Still editing")
  await page.getByRole("button", { name: "Pause scheduled updates" }).click()
  await expect(
    page.getByRole("button", { name: "Resume scheduled updates" }),
  ).toBeVisible()
  await expect(page.getByLabel("Note for Artist 1")).toHaveValue(
    "Still editing",
  )
})

test("only explicit confirmed clear-all submits an empty replacement", async ({
  page,
}) => {
  const { requests } = await mount(page, {
    mutate: request => ({
      json: projection({
        owner: { ...projection().owner, overrides: request.body.overrides },
      }),
    }),
  })
  page.once("dialog", dialog => dialog.dismiss())
  await page.getByRole("button", { name: "Clear all choices" }).click()
  await expect(page.getByLabel("Note for Artist 1")).toHaveValue("Saved note")
  page.once("dialog", dialog => dialog.accept())
  await page.getByRole("button", { name: "Clear all choices" }).click()
  expect(requests).toHaveLength(1)
  await expect(page.getByLabel("Note for Artist 1")).toHaveValue("")
  await page.getByRole("button", { name: "Save choices" }).click()
  await expect(page.getByRole("status")).toContainText("Choices saved")
  expect(requests[1].body).toEqual({ overrides: {} })
})

test("malformed mutation and deletion acknowledgements retain the current view", async ({
  page,
}) => {
  const { requests } = await mount(page, {
    mutate: request => ({
      json:
        request.method === "DELETE"
          ? { deleted: true, storageId: "INTERNAL_SENTINEL" }
          : { ...projection(), csrfToken: null },
    }),
  })
  await page.getByLabel("Note for Artist 1").fill("Keep draft choices")
  await page.getByRole("button", { name: "Save choices" }).click()
  await expect(page.getByRole("status")).toContainText("could not")
  await expect(page.getByLabel("Note for Artist 1")).toHaveValue(
    "Keep draft choices",
  )
  page.once("dialog", dialog => dialog.accept())
  await page.getByRole("button", { name: "Delete portrait and data" }).click()
  await expect.poll(() => requests.length).toBe(3)
  await expect(page.getByRole("status")).toContainText("could not")
  await expect(page.locator('[data-source="snapshot"]')).toBeVisible()
})

test("a refresh response cannot erase an existing draft with null", async ({
  page,
}) => {
  await mount(page, {
    mutate: () => ({
      json: projection({
        draft: null,
        refreshStatus: { status: "failed", message: "Last good remains" },
      }),
    }),
  })
  await expect(page.locator('[data-source="snapshot"]')).toBeVisible()
  await page.getByRole("button", { name: "Refresh portrait" }).click()
  await expect(page.getByRole("status")).toContainText("could not")
  await expect(page.locator('[data-source="snapshot"]')).toBeVisible()
})

test("publish, repeat publish, copy fallback and confirmed regeneration preserve one link", async ({
  page,
}) => {
  let current = projection()
  const { requests } = await mount(page, {
    mutate: request => {
      current = {
        ...current,
        owner: { ...current.owner, published: true },
        publicUrl: request.path.endsWith("link")
          ? rotatedUrl
          : current.publicUrl || sharedUrl,
      }
      return { json: current }
    },
  })
  await page.evaluate(() =>
    Object.defineProperty(navigator, "clipboard", {
      configurable: true,
      value: {
        writeText: async () => {
          throw new Error("blocked")
        },
      },
    }),
  )
  await page
    .getByRole("button", { name: "Publish portrait", exact: true })
    .click()
  await expect(
    page.getByRole("link", { name: "Open shared portrait" }),
  ).toHaveAttribute("href", sharedUrl)
  await page.getByRole("button", { name: "Copy link" }).click()
  await expect(page.getByRole("status")).toContainText("select and copy")
  await expect(page.getByLabel("Unlisted portrait URL")).toHaveValue(sharedUrl)
  await page.evaluate(() =>
    Object.defineProperty(navigator, "clipboard", {
      configurable: true,
      value: {
        writeText: async text => {
          window.copied = text
        },
      },
    }),
  )
  await page.getByRole("button", { name: "Copy link" }).click()
  await expect(page.getByRole("status")).toContainText("Link copied")
  expect(await page.evaluate(() => window.copied)).toBe(sharedUrl)
  await page.getByRole("button", { name: "Update shared portrait" }).click()
  await expect(page.getByRole("status")).toContainText(
    "Shared portrait updated",
  )
  page.once("dialog", dialog => dialog.dismiss())
  await page.getByRole("button", { name: "Regenerate link" }).click()
  expect(requests.filter(r => r.path.endsWith("link"))).toHaveLength(0)
  page.once("dialog", async dialog => {
    expect(dialog.message()).toContain("old link stops working")
    await dialog.accept()
  })
  await page.getByRole("button", { name: "Regenerate link" }).click()
  await expect(
    page.getByRole("link", { name: "Open shared portrait" }),
  ).toHaveAttribute("href", rotatedUrl)
  await expect(
    page.getByRole("link", { name: "Open shared portrait" }),
  ).toHaveCount(1)
  expect(
    requests
      .slice(1)
      .every(
        r =>
          r.method === "POST" &&
          JSON.stringify(r.body) === "{}" &&
          r.headers["x-csrf-token"] === "c".repeat(43),
      ),
  ).toBe(true)
})

test("pause and resume keep the shared URL; manual refresh retains the last good map", async ({
  page,
}) => {
  let state = projection({ publicUrl: sharedUrl })
  state.owner.published = true
  const { requests } = await mount(page, {
    state,
    mutate: request => {
      if (request.method === "PATCH")
        state = {
          ...state,
          owner: { ...state.owner, paused: request.body.paused },
        }
      else
        state = {
          ...state,
          refreshStatus: {
            status: "updated",
            message: "Your shared portrait has been updated.",
          },
        }
      return { json: state }
    },
  })
  await page.getByRole("button", { name: "Pause scheduled updates" }).click()
  await expect(
    page.getByRole("button", { name: "Resume scheduled updates" }),
  ).toBeVisible()
  await expect(
    page.getByRole("link", { name: "Open shared portrait" }),
  ).toHaveAttribute("href", sharedUrl)
  await page.getByRole("button", { name: "Resume scheduled updates" }).click()
  await page.getByRole("button", { name: "Refresh portrait" }).click()
  await expect(page.getByRole("status")).toContainText("updated")
  expect(requests.slice(1).map(r => [r.method, r.body])).toEqual([
    ["PATCH", { paused: true }],
    ["PATCH", { paused: false }],
    ["POST", {}],
  ])
})

for (const outcome of [
  "daily",
  "busy",
  "reconnect_required",
  "failed",
  "retry_pending",
])
  test(`manual refresh ${outcome} keeps last good portrait`, async ({
    page,
  }) => {
    const { requests } = await mount(page, {
      mutate: () =>
        outcome === "daily" || outcome === "busy"
          ? {
              status: outcome === "daily" ? 429 : 409,
              json: { error: "INTERNAL_SENTINEL" },
            }
          : {
              json: projection({
                refreshStatus: {
                  status: outcome,
                  message: "INTERNAL_SENTINEL",
                },
                ...(outcome === "reconnect_required"
                  ? {
                      owner: { ...projection().owner, reconnectRequired: true },
                    }
                  : {}),
              }),
            },
    })
    await page.getByRole("button", { name: "Refresh portrait" }).click()
    await expect(page.getByRole("status")).toContainText(
      outcome === "daily"
        ? "once per UTC"
        : outcome === "busy"
          ? "in progress"
          : outcome === "reconnect_required"
            ? "Reconnect"
            : outcome === "failed"
              ? "last portrait"
              : "temporarily busy",
    )
    await expect(page.locator('[data-source="snapshot"]')).toBeVisible()
    await expect(
      page.getByText("INTERNAL_SENTINEL", { exact: false }),
    ).toHaveCount(0)
    expect(requests[1].body).toEqual({})
  })

test("empty draft can explicitly generate; loading never invents a map", async ({
  page,
}) => {
  await mount(page, {
    state: projection({ draft: null }),
    mutate: () => ({ json: projection() }),
  })
  await expect(page.locator('[data-source="snapshot"]')).toHaveCount(0)
  await page.getByRole("button", { name: "Generate portrait" }).click()
  await expect(page.locator('[data-source="snapshot"]')).toBeVisible()
})

test("delete cancellation and failure retain state; only successful DELETE clears it", async ({
  page,
}) => {
  let succeed = false
  const { requests } = await mount(page, {
    mutate: () =>
      succeed
        ? { json: { deleted: true } }
        : { status: 503, json: { error: "INTERNAL_SENTINEL" } },
  })
  const button = page.getByRole("button", { name: "Delete portrait and data" })
  page.once("dialog", dialog => dialog.dismiss())
  await button.click()
  expect(requests).toHaveLength(1)
  page.once("dialog", dialog => dialog.accept())
  await button.click()
  await expect(page.getByRole("status")).toContainText("could not")
  await expect(page.locator('[data-source="snapshot"]')).toBeVisible()
  succeed = true
  page.once("dialog", async dialog => {
    expect(dialog.message()).toContain("unpublish")
    await dialog.accept()
  })
  await button.click()
  await expect(page.getByRole("status")).toContainText(
    "unpublished and deleted",
  )
  await expect(page.locator('[data-source="snapshot"]')).toHaveCount(0)
  expect(requests[2].method).toBe("DELETE")
  expect(requests[2].body).toEqual({})
})

for (const invalid of ["privateField", "url", "draft", "missing", "owner"])
  test(`untrusted ${invalid} projection fails closed`, async ({ page }) => {
    const state = projection()
    if (invalid === "privateField")
      state.owner.spotifyUserId = "INTERNAL_SENTINEL"
    if (invalid === "url") {
      state.publicUrl = "https://evil.example/music/galaxy/x/"
      state.owner.published = true
    }
    if (invalid === "draft")
      state.draft.planets[0].spotifyUrl = "javascript:alert(1)"
    if (invalid === "missing") delete state.csrfToken
    if (invalid === "owner") delete state.owner.paused
    await mount(page, { state })
    await expect(page.getByRole("button", { name: "Try again" })).toBeVisible()
    await expect(page.locator('[data-source="snapshot"]')).toHaveCount(0)
    await expect(
      page.getByText("INTERNAL_SENTINEL", { exact: false }),
    ).toHaveCount(0)
  })

test("unmount aborts obsolete owner load without rendering its late response", async ({
  page,
}) => {
  await page.addInitScript(() => {
    const original = window.fetch
    window.aborted = false
    window.fetch = (...args) => {
      args[1]?.signal?.addEventListener("abort", () => {
        window.aborted = true
      })
      return original(...args)
    }
  })
  let release
  const pending = new Promise(resolve => {
    release = resolve
  })
  await mount(page, {
    load: async () => {
      await pending
      return { json: projection() }
    },
  })
  await expect
    .poll(() =>
      page.evaluate(() => document.body.textContent.includes("Loading")),
    )
    .toBe(true)
  await page.evaluate(() => window.unmountStudio())
  expect(await page.evaluate(() => window.aborted)).toBe(true)
  release()
  await expect(page.locator('[data-source="snapshot"]')).toHaveCount(0)
})

for (const width of [1280, 390, 320])
  test(`stable controls, keyboard order and reduced motion at ${width}px`, async ({
    page,
  }) => {
    await page.setViewportSize({ width, height: 844 })
    await page.emulateMedia({ reducedMotion: "reduce" })
    const { errors } = await mount(page)
    await expect(page.getByRole("heading", { level: 1 })).toHaveCount(1)
    await expect(page.getByRole("main")).toHaveCount(1)
    await expect(page.getByRole("status")).toHaveCount(1)
    await expect(page.getByRole("alert")).toHaveCount(0)
    const map = page.getByRole("region", { name: "Interactive music portrait" })
    await expect(page.locator(".site-main")).toHaveCSS(
      "color",
      "rgb(238, 238, 238)",
    )
    await expect(page.locator(".site-main")).toHaveCSS(
      "font-family",
      "Arial, sans-serif",
    )
    const panel = page.getByRole("region", { name: "Portrait controls" })
    await expect(map).toHaveAttribute("data-reduced-motion", "true")
    const mapBox = await map.boundingBox()
    const panelBox = await panel.boundingBox()
    expect(panelBox.y).toBeGreaterThanOrEqual(mapBox.y + mapBox.height)
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ),
    ).toBe(true)
    await expect(
      page.locator("svg input, svg select, svg textarea"),
    ).toHaveCount(0)
    await page.getByLabel("Pin Artist 1").focus()
    await page.keyboard.press("Tab")
    await expect(page.getByLabel("Region for Artist 1")).toBeFocused()
    await page.keyboard.press("Tab")
    await expect(page.getByLabel("Note for Artist 1")).toBeFocused()
    expect(errors).toEqual([])
    await page.screenshot({
      path: test.info().outputPath(`owner-${width}.png`),
      fullPage: true,
    })
  })

test("owner error announces once without moving keyboard focus from Save", async ({
  page,
}) => {
  await mount(page, {
    mutate: () => ({ status: 503, json: { error: "PRIVATE_SENTINEL" } }),
  })
  await page.getByLabel("Note for Artist 1").fill("Keep my note")
  const save = page.getByRole("button", { name: "Save choices", exact: true })
  await save.focus()
  await page.keyboard.press("Enter")
  await expect(page.getByRole("status")).toContainText("could not")
  await expect(save).toBeFocused()
  await expect(page.getByRole("status")).toHaveAttribute("aria-live", "polite")
  await expect(page.getByRole("status")).toHaveAttribute("aria-atomic", "true")
  await expect(page.getByLabel("Note for Artist 1")).toHaveValue("Keep my note")
  expect(await page.getByRole("main").innerText()).not.toContain(
    "PRIVATE_SENTINEL",
  )
})

test("a pending owner save respects a later keyboard focus move", async ({
  page,
}) => {
  let finish
  await mount(page, {
    mutate: () =>
      new Promise(resolve => {
        finish = resolve
      }),
  })
  const save = page.getByRole("button", { name: "Save choices", exact: true })
  await save.focus()
  await page.keyboard.press("Enter")
  await expect(save).toBeDisabled()
  const region = page.getByRole("button", { name: "Spotlight Inner waters" })
  await region.focus()
  finish({ status: 503, json: { error: "PRIVATE_SENTINEL" } })
  await expect(page.getByRole("status")).toContainText("could not")
  await expect(region).toBeFocused()
})

test("built private page hydrates the safe owner view with noindex and no-referrer", async ({
  page,
  baseURL,
}) => {
  const errors = []
  page.on("pageerror", error => errors.push(error.message))
  page.on("console", message => {
    if (message.type() === "error") errors.push(message.text())
  })
  await page.route("**/*", route => {
    const url = new URL(route.request().url())
    if (url.pathname === "/api/music-portrait-owner")
      return route.fulfill({ json: projection() })
    if (
      url.pathname.startsWith("/api/") ||
      url.origin !== new URL(baseURL).origin
    )
      return route.fulfill({ status: 200, body: "", contentType: "text/plain" })
    return route.continue()
  })
  await page.setViewportSize({ width: 390, height: 844 })
  await page.goto("/music/create/")
  await expect(
    page.getByRole("heading", { level: 1, name: "Your Music Portrait" }),
  ).toHaveCount(1)
  await expect(page.locator('[data-source="snapshot"]')).toBeVisible()
  await expect(page.locator('meta[name="robots"]')).toHaveAttribute(
    "content",
    "noindex",
  )
  await expect(page.locator('meta[name="referrer"]')).toHaveAttribute(
    "content",
    "no-referrer",
  )
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true)
  expect(errors).toEqual([])
  await page.screenshot({
    path: test.info().outputPath("owner-built-390.png"),
    fullPage: true,
  })
})

test.describe("review regressions", () => {
  test("saved private notes disclose every shared publication boundary", async ({
    page,
  }) => {
    let state = projection({ publicUrl: sharedUrl })
    state.owner.published = true
    state.owner.paused = true
    state.owner.overrides[artistId(0)].note = "Previously shared note"
    state.draft.planets[0].note = "Previously shared note"
    let publishedNote = "Previously shared note"
    const { requests } = await mount(page, {
      state,
      mutate: request => {
        if (request.body.overrides) {
          state.owner.overrides = request.body.overrides
          state.draft.planets[0].note = request.body.overrides[artistId(0)].note
        } else if (request.method === "PATCH")
          state.owner.paused = request.body.paused
        else {
          publishedNote = state.draft.planets[0].note
          if (request.path.endsWith("link")) state.publicUrl = rotatedUrl
        }
        return { json: state }
      },
    })
    await page.getByLabel("Note for Artist 1").fill("Saved private note")
    await page.getByRole("button", { name: "Save choices" }).click()
    await expect(page.getByRole("status")).toContainText(
      "refreshes and link regeneration can publish",
    )
    expect(publishedNote).toBe("Previously shared note")
    await expect(page.locator("#studio-save-help")).toContainText(
      "manual refresh, scheduled updates and link regeneration",
    )
    await expect(
      page.getByRole("region", { name: "Share", exact: true }),
    ).toContainText("saved choices and notes")
    await expect(
      page.getByRole("region", { name: "Evolve", exact: true }),
    ).toContainText(
      "Resuming includes saved choices and notes in the next scheduled update",
    )
    await expect(
      page.getByRole("region", { name: "Evolve", exact: true }),
    ).toContainText(
      "Manual refresh updates your shared portrait with saved choices and notes",
    )
    await page.getByRole("button", { name: "Resume scheduled updates" }).click()
    await expect(page.getByRole("status")).toContainText(
      "next scheduled update",
    )
    expect(publishedNote).toBe("Previously shared note")
    await page.getByRole("button", { name: "Refresh portrait" }).click()
    await expect(page.getByRole("status")).not.toContainText("Please wait")
    expect(publishedNote).toBe("Saved private note")
    await page.getByLabel("Note for Artist 1").fill("New saved draft note")
    await page.getByRole("button", { name: "Save choices" }).click()
    await expect(page.getByRole("status")).toContainText("Choices saved")
    expect(publishedNote).toBe("Saved private note")
    page.once("dialog", async dialog => {
      expect(dialog.message()).toContain(
        "publishes your current saved portrait, including saved choices and notes",
      )
      await dialog.accept()
    })
    await page.getByRole("button", { name: "Regenerate link" }).click()
    await expect(
      page.getByRole("link", { name: "Open shared portrait" }),
    ).toHaveAttribute("href", rotatedUrl)
    expect(publishedNote).toBe("New saved draft note")
    expect(requests.at(-1).path).toBe("/api/music-portrait-link")
  })

  for (const outcome of [
    "unpublished publish",
    "unchanged rotation",
    "unpublished rotation",
  ])
    test(`rejects contradictory ${outcome} acknowledgement`, async ({
      page,
    }) => {
      const published = outcome !== "unpublished publish"
      const state = projection({ publicUrl: published ? sharedUrl : null })
      state.owner.published = published
      await mount(page, {
        state,
        mutate: () => ({
          json: outcome === "unpublished rotation" ? projection() : state,
        }),
      })
      await page.getByLabel("Note for Artist 1").fill("Keep local choices")
      if (published) page.once("dialog", dialog => dialog.accept())
      await page
        .getByRole("button", {
          name: published ? "Regenerate link" : "Publish portrait",
          exact: true,
        })
        .click()
      await expect(page.getByRole("status")).toContainText("could not")
      await expect(page.getByLabel("Note for Artist 1")).toHaveValue(
        "Keep local choices",
      )
      await expect(page.locator('[data-source="snapshot"]')).toBeVisible()
      if (published)
        await expect(page.getByLabel("Unlisted portrait URL")).toHaveValue(
          sharedUrl,
        )
      else await expect(page.getByLabel("Unlisted portrait URL")).toHaveCount(0)
    })

  test("initial generation and failed first generation never claim an existing portrait", async ({
    page,
  }) => {
    const state = projection({ draft: null })
    state.owner.lastSuccessfulUpdateAt = null
    await mount(page, {
      state,
      mutate: () => ({
        json: {
          ...state,
          refreshStatus: { status: "failed", message: "ignored" },
        },
      }),
    })
    await expect(
      page.getByRole("button", { name: "Generate portrait" }),
    ).toBeVisible()
    const initialCopy = await page.getByRole("status").textContent()
    await page.getByRole("button", { name: "Generate portrait" }).click()
    await expect(page.getByRole("status")).toContainText(
      "No portrait has been generated yet",
    )
    expect(initialCopy).toContain("Generate your first portrait")
    await expect(
      page.getByRole("region", { name: "Evolve", exact: true }),
    ).not.toContainText("last portrait")
    await expect(page.locator('[data-source="snapshot"]')).toHaveCount(0)
  })

  for (const status of [401, 403])
    test(`existing session ${status} has neutral recovery copy`, async ({
      page,
    }) => {
      await mount(page, {
        mutate: () => ({ status, json: { error: "ignored" } }),
      })
      await page.getByRole("button", { name: "Refresh portrait" }).click()
      await expect(page.getByRole("status")).toContainText(
        "Returning-owner access is not currently supported",
      )
      await expect(page.getByRole("status")).not.toContainText("invitation")
      await expect(page.locator('[data-source="snapshot"]')).toBeVisible()
    })

  for (const action of ["rotation", "deletion"])
    for (const settle of ["resolve", "reject"])
      test(`stale clipboard ${settle} after ${action} cannot change lifecycle status or focus`, async ({
        page,
      }) => {
        const state = projection({ publicUrl: sharedUrl })
        state.owner.published = true
        await mount(page, {
          state,
          mutate: request => ({
            json:
              request.method === "DELETE"
                ? { deleted: true }
                : { ...state, publicUrl: rotatedUrl },
          }),
        })
        await page.evaluate(() => {
          window.copyCalls = 0
          Object.defineProperty(navigator, "clipboard", {
            configurable: true,
            value: {
              writeText: () => {
                window.copyCalls++
                return new Promise((resolve, reject) => {
                  window.settleCopy = outcome =>
                    outcome === "resolve"
                      ? resolve()
                      : reject(new Error("denied"))
                })
              },
            },
          })
        })
        const copy = page.getByRole("button", {
          name: "Copy link",
          exact: true,
        })
        await copy.click()
        expect(await page.evaluate(() => window.copyCalls)).toBe(1)
        page.once("dialog", dialog => dialog.accept())
        await page
          .getByRole("button", {
            name:
              action === "rotation"
                ? "Regenerate link"
                : "Delete portrait and data",
            exact: true,
          })
          .click()
        const expected =
          action === "rotation" ? "New link ready" : "unpublished and deleted"
        await expect(page.getByRole("status")).toContainText(expected)
        await page.evaluate(() => {
          window.focusedBeforeClipboard = document.activeElement
        })
        await page.evaluate(outcome => window.settleCopy(outcome), settle)
        await page.evaluate(
          () =>
            new Promise(resolve =>
              requestAnimationFrame(() => requestAnimationFrame(resolve)),
            ),
        )
        await expect(page.getByRole("status")).toContainText(expected)
        expect(
          await page.evaluate(
            () => document.activeElement === window.focusedBeforeClipboard,
          ),
        ).toBe(true)
      })

  test("duplicate pending clipboard writes are suppressed", async ({
    page,
  }) => {
    const state = projection({ publicUrl: sharedUrl })
    state.owner.published = true
    await mount(page, { state })
    await page.evaluate(() => {
      window.copyCalls = 0
      Object.defineProperty(navigator, "clipboard", {
        configurable: true,
        value: {
          writeText: () => {
            window.copyCalls++
            return new Promise(() => {})
          },
        },
      })
    })
    const copy = page.getByRole("button", { name: "Copy link", exact: true })
    await copy.click()
    await copy.evaluate(button => {
      button.click()
      button.click()
    })
    expect(await page.evaluate(() => window.copyCalls)).toBe(1)
    await expect(copy).toBeDisabled()
  })

  test("pending clipboard result is inert after unmount", async ({ page }) => {
    const state = projection({ publicUrl: sharedUrl })
    state.owner.published = true
    const { errors } = await mount(page, { state })
    await page.evaluate(() =>
      Object.defineProperty(navigator, "clipboard", {
        configurable: true,
        value: {
          writeText: () =>
            new Promise(resolve => {
              window.finishCopy = resolve
            }),
        },
      }),
    )
    await page.getByRole("button", { name: "Copy link", exact: true }).click()
    await page.evaluate(() => {
      window.unmountStudio()
      window.finishCopy()
    })
    await page.evaluate(
      () =>
        new Promise(resolve =>
          requestAnimationFrame(() => requestAnimationFrame(resolve)),
        ),
    )
    await expect(page.getByRole("status")).toHaveCount(0)
    expect(errors).toEqual([])
  })

  test("Escape in an owner note leaves selected map and form focus intact", async ({
    page,
  }) => {
    await page.emulateMedia({ reducedMotion: "reduce" })
    await mount(page)
    const map = page.getByRole("region", { name: "Interactive music portrait" })
    await page.getByRole("button", { name: /^Explore Artist 1,/ }).focus()
    await page.keyboard.press("Enter")
    await expect(map).toHaveAttribute("data-selection", "artist")
    const note = page.getByLabel("Note for Artist 1")
    await note.focus()
    const prevented = await note.evaluate(
      element =>
        !element.dispatchEvent(
          new KeyboardEvent("keydown", {
            key: "Escape",
            bubbles: true,
            cancelable: true,
          }),
        ),
    )
    expect(prevented).toBe(false)
    await note.press("Escape")
    await expect(note).toBeFocused()
    await expect(map).toHaveAttribute("data-selection", "artist")
    await page.getByRole("button", { name: /^Explore Artist 1,/ }).focus()
    await page.keyboard.press("Escape")
    await expect(map).toHaveAttribute("data-selection", "none")
  })
})

test.describe("Task 13 review regressions", () => {
  for (const focus of ["Save", "spotlight", "form"])
    test(`successful region save preserves ${focus} focus with a selected artist`, async ({
      page,
    }) => {
      let finish
      let saved
      const state = projection({ publicUrl: sharedUrl })
      state.owner.published = true
      const { errors } = await mount(page, {
        state,
        mutate: request => {
          saved = structuredClone(state)
          saved.owner.overrides = request.body.overrides
          saved.draft.planets[0].region = "outer_reaches"
          return new Promise(resolve => {
            finish = () => resolve({ json: saved })
          })
        },
      })
      const artist = page.getByRole("button", { name: /^Explore Artist 1,/ })
      await artist.focus()
      await page.keyboard.press("Enter")
      await page.getByLabel("Region for Artist 1").selectOption("outer_reaches")
      const save = page.getByRole("button", {
        name: "Save choices",
        exact: true,
      })
      await save.focus()
      await page.keyboard.press("Enter")
      await expect(save).toBeDisabled()
      await expect.poll(() => typeof finish).toBe("function")
      const target =
        focus === "Save"
          ? save
          : focus === "spotlight"
            ? page.getByRole("button", { name: "Spotlight Inner waters" })
            : page.getByRole("textbox", { name: "Unlisted portrait URL" })
      if (focus !== "Save") await target.focus()
      finish()
      await expect(page.getByRole("status")).toContainText("Choices saved")
      await expect(artist).toHaveAttribute("aria-pressed", "true")
      await expect(artist.locator("..")).toHaveAttribute(
        "data-node-key",
        /creative_fuel/,
      )
      await expect(target).toBeFocused()
      expect(errors).toEqual([])
    })

  for (const laterFocus of [false, true])
    test(`deferred successful Copy ${laterFocus ? "respects later focus" : "restores its button"}`, async ({
      page,
    }) => {
      const state = projection({ publicUrl: sharedUrl })
      state.owner.published = true
      await mount(page, { state })
      await page.evaluate(() =>
        Object.defineProperty(navigator, "clipboard", {
          configurable: true,
          value: {
            writeText: () =>
              new Promise(resolve => {
                window.finishCopy = resolve
              }),
          },
        }),
      )
      const copy = page.getByRole("button", { name: "Copy link", exact: true })
      await copy.focus()
      await page.keyboard.press("Enter")
      await expect(copy).toBeDisabled()
      const note = page.getByLabel("Note for Artist 1")
      if (laterFocus) await note.focus()
      await page.evaluate(() => window.finishCopy())
      await expect(page.getByRole("status")).toHaveText("Link copied.")
      await expect(copy).toBeEnabled()
      await expect(laterFocus ? note : copy).toBeFocused()
    })

  test("owner guide and artist names describe evidence and saved region choices", async ({
    page,
  }) => {
    await page.setViewportSize({ width: 390, height: 844 })
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
      path: test.info().outputPath("owner-guide-390.png"),
      fullPage: true,
    })
  })
})

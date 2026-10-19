const test = require("node:test")
const assert = require("node:assert/strict")
const { createHash } = require("node:crypto")
const { createMusicBetaStore } = require("../../api/_music-beta/store")
const {
  encryptSecret,
  decryptSecret,
} = require("../../api/_music-beta/security")
const { validatePublicSnapshot } = require("../../api/_music-beta/contracts")
const {
  refreshOwnerPortrait,
  refreshDueOwners,
} = require("../../api/_music-beta/refresh-service")
const {
  createRefreshHandler,
} = require("../../api/music-portrait-refresh-cron")
const {
  makeOwnerRecord,
  makePublicSnapshot,
  artistId,
  trackId,
} = require("./fixtures/music-beta")

const NOW = "2026-10-26T07:00:00.000Z"
const OLD = "2026-10-17T08:00:00.000Z"
const OWNER = "owner-fixture"
const KEY = Buffer.alloc(32, 7)
const SLUG = Buffer.alloc(32, 8).toString("base64url")
const ownerHash = createHash("sha256").update(OWNER).digest("hex")
const artist = i => ({ id: artistId(i), name: `Artist ${i}`, images: [] })
const track = i => ({
  id: trackId(i),
  name: `Track ${i}`,
  artists: [artist(0)],
  album: { images: [] },
})

async function setup({ published = true, owner = {} } = {}) {
  const data = new Map()
  const calls = []
  const blob = {
    fail: () => false,
    async get(path) {
      if (this.fail("get", path)) throw new Error("private failure details")
      return data.has(path)
        ? { statusCode: 200, stream: new Response(data.get(path)).body }
        : null
    },
    async put(path, body, options) {
      if (this.fail("put", path)) throw new Error("private failure details")
      if (data.has(path) && !options.allowOverwrite) throw new Error("exists")
      data.set(path, body)
    },
    async del(path) {
      data.delete(path)
    },
    async list({ prefix }) {
      return {
        blobs: [...data.keys()]
          .filter(path => path.startsWith(prefix))
          .map(pathname => ({ pathname })),
        hasMore: false,
      }
    },
  }
  const store = createMusicBetaStore(blob)
  await store.writeOwner(
    makeOwnerRecord({
      encryptedRefreshToken: encryptSecret("old-refresh", KEY, 1),
      ...owner,
    }),
  )
  if (published) await store.publishSnapshot(OWNER, SLUG, makePublicSnapshot())
  const waits = []
  const state = {
    artists: [artist(0), artist(1)],
    tracks: [track(0), track(1)],
    failure: null,
  }
  const deps = {
    store,
    tokenKey: KEY,
    clientId: "fixture-client",
    clientSecret: "fixture-secret",
    now: () => Date.parse(NOW),
    wait: async ms => waits.push(ms),
    fetchImpl: async (url, options) => {
      calls.push({ url, options })
      const failed = state.failure?.(url, options)
      if (failed) return failed
      const payload = url.includes("/api/token")
        ? {
            access_token: "new-access",
            refresh_token: "new-refresh",
            token_type: "Bearer",
            expires_in: 3600,
          }
        : {
            items: url.includes("/top/artists") ? state.artists : state.tracks,
            total: 2,
          }
      return { status: 200, ok: true, json: async () => payload }
    },
  }
  return {
    data,
    blob,
    store,
    calls,
    waits,
    state,
    deps,
    run: reason =>
      refreshOwnerPortrait({
        ownerKey: OWNER,
        reason: reason || "manual",
        deps,
      }),
  }
}

const failure = (status, seconds) => ({
  status,
  ok: false,
  headers: { get: () => seconds },
  json: async () => ({ private: "never expose" }),
})

test("complete refresh rotates credentials, fetches six bounded top lists and atomically replaces a valid snapshot", async () => {
  const h = await setup()
  assert.deepEqual(await h.run(), { status: "updated" })
  const top = h.calls.filter(call => call.url.includes("/me/top/"))
  assert.equal(top.length, 6)
  assert.deepEqual(
    new Set(
      top.map(call => new URL(call.url).pathname + new URL(call.url).search),
    ),
    new Set(
      ["artists", "tracks"].flatMap(kind =>
        ["short_term", "medium_term", "long_term"].map(
          range => `/v1/me/top/${kind}?time_range=${range}&limit=50`,
        ),
      ),
    ),
  )
  const owner = await h.store.readOwner(OWNER)
  assert.equal(
    decryptSecret(owner.encryptedRefreshToken, { 1: KEY }),
    "new-refresh",
  )
  assert.equal(owner.tokenExpiresAt, "2026-10-26T08:00:00.000Z")
  assert.equal(owner.lastSuccessfulUpdateAt, NOW)
  assert.equal(owner.lastManualRefreshAt, NOW)
  assert.equal(owner.refreshStatus, "idle")
  const snapshot = await h.store.readPublicSnapshot(SLUG)
  validatePublicSnapshot(snapshot)
  assert.equal(snapshot.generatedAt, NOW)
  assert.equal(snapshot.owner.initials, "FO")
  assert.equal(snapshot.planets.length, 2)
  assert.deepEqual((await h.store.readDraft(OWNER)).snapshot, snapshot)
  assert.equal(JSON.stringify(snapshot).includes("refresh"), false)
})

test("unpublished owners retain validated private drafts and never acquire a share", async () => {
  const h = await setup({ published: false })
  assert.deepEqual(await h.run("initial"), { status: "drafted" })
  assert.equal(await h.store.readPublishedSnapshot(OWNER), null)
  assert.equal((await h.store.readDraft(OWNER)).snapshot.generatedAt, NOW)
  assert.equal(
    [...h.data.keys()].some(path => path.includes("/shares/")),
    false,
  )
})

test("arrival timestamps follow track IDs across snapshots; only newly introduced moons are stamped", async () => {
  const h = await setup()
  const previous = makePublicSnapshot({ planetCount: 1 })
  previous.planets[0].moons = [
    {
      id: trackId(0),
      name: "Track 0",
      spotifyUrl: `https://open.spotify.com/track/${trackId(0)}`,
      artistIds: [artistId(0)],
      introducedAt: OLD,
    },
  ]
  await h.store.publishSnapshot(OWNER, SLUG, previous)
  await h.run()
  const snapshot = await h.store.readPublicSnapshot(SLUG)
  assert.deepEqual(
    snapshot.planets[0].moons.map(moon => moon.introducedAt),
    [OLD, NOW],
  )
  const layout = snapshot.planets[0].layoutSeed
  h.deps.now = () => Date.parse("2026-11-02T07:00:00.000Z")
  await h.run()
  assert.equal(
    (await h.store.readPublicSnapshot(SLUG)).planets[0].layoutSeed,
    layout,
  )
  assert.deepEqual(
    (await h.store.readPublicSnapshot(SLUG)).planets[0].moons.map(
      moon => moon.introducedAt,
    ),
    [OLD, NOW],
  )
})

test("complete overrides and private catalogue preserve absent pins over two refreshes without historical moons", async () => {
  const h = await setup({ published: false })
  await h.store.writeOverrides(OWNER, {
    [artistId(0)]: {
      pinned: true,
      region: "outer_reaches",
      note: "Retained note",
    },
  })
  await h.run()
  h.state.artists = [artist(1)]
  h.state.tracks = []
  for (const date of ["2026-11-02T07:00:00.000Z", "2026-11-09T07:00:00.000Z"]) {
    h.deps.now = () => Date.parse(date)
    await h.run()
    const pinned = (await h.store.readDraft(OWNER)).snapshot.planets.find(
      planet => planet.id === artistId(0),
    )
    assert.equal(pinned.note, "Retained note")
    assert.equal(pinned.region, "outer_reaches")
    assert.deepEqual(pinned.moons, [])
  }
})

test("429 retries only the failed top operation and respects Retry-After", async () => {
  const h = await setup()
  let attempts = 0
  h.state.failure = url =>
    url.includes("/top/tracks?time_range=medium_term") && ++attempts < 3
      ? failure(429, "4")
      : null
  assert.deepEqual(await h.run(), { status: "updated" })
  assert.equal(attempts, 3)
  assert.equal(h.calls.length, 9)
  assert.deepEqual(h.waits, [4000, 4000])
})

test("temporary token failures have three attempts without repeating successful top requests", async () => {
  const h = await setup()
  let attempts = 0
  h.state.failure = url =>
    url.includes("/api/token") && ++attempts < 3 ? failure(503) : null
  assert.deepEqual(await h.run(), { status: "updated" })
  assert.equal(h.calls.length, 9)
  assert.deepEqual(h.waits, [1000, 2000])
})

for (const [status, expected] of [
  [503, "failed"],
  [401, "reconnect_required"],
  [403, "failed"],
  [429, "retry_pending"],
]) {
  test(`top failure ${status} retains last public portrait and rotated credential`, async () => {
    const h = await setup()
    const previous = await h.store.readPublicSnapshot(SLUG)
    h.state.failure = url =>
      url.includes("/top/") ? failure(status, "1") : null
    assert.deepEqual(await h.run(), { status: expected })
    assert.deepEqual(await h.store.readPublicSnapshot(SLUG), previous)
    assert.equal(
      decryptSecret((await h.store.readOwner(OWNER)).encryptedRefreshToken, {
        1: KEY,
      }),
      "new-refresh",
    )
    assert.equal(
      h.calls.filter(call => call.url.includes("/top/")).length,
      [503, 429].includes(status) ? 3 : 1,
    )
    assert.equal((await h.store.readOwner(OWNER)).lastSuccessfulUpdateAt, null)
  })
}

test("rejected refresh credentials are never retried and require reconnection", async () => {
  const h = await setup()
  h.state.failure = () => failure(400)
  assert.deepEqual(await h.run(), { status: "reconnect_required" })
  assert.equal(h.calls.length, 1)
  assert.equal((await h.store.readOwner(OWNER)).reconnectRequired, true)
  assert.deepEqual(h.waits, [])
})

test("an excessive Retry-After defers without sleeping or retrying early", async () => {
  const h = await setup()
  h.state.failure = () => failure(429, "86400")
  assert.deepEqual(await h.run(), { status: "retry_pending" })
  assert.equal(h.calls.length, 1)
  assert.deepEqual(h.waits, [])
})

test("invalid top payloads are not retried and never change published data or prior private drafts", async () => {
  const h = await setup()
  await h.run()
  const previous = await h.store.readPublicSnapshot(SLUG)
  const draft = await h.store.readDraft(OWNER)
  h.calls.length = 0
  h.state.failure = url =>
    url.includes("/top/")
      ? {
          status: 200,
          ok: true,
          json: async () => ({ items: [{ id: "invalid" }], total: 1 }),
        }
      : null
  assert.deepEqual(await h.run(), { status: "failed" })
  assert.equal(h.calls.length, 2)
  assert.deepEqual(await h.store.readPublicSnapshot(SLUG), previous)
  assert.deepEqual(await h.store.readDraft(OWNER), draft)
})

test("token rotation persistence retries only the write and prevents top requests until durable", async () => {
  const h = await setup()
  let attempts = 0
  h.blob.fail = (op, path) =>
    op === "put" &&
    path.includes("/owners/") &&
    h.calls.length === 1 &&
    ++attempts < 3
  assert.deepEqual(await h.run(), { status: "updated" })
  assert.equal(attempts, 3)
  assert.equal(h.calls.length, 7)
  assert.deepEqual(h.waits, [1000, 2000])
})

test("failed credential persistence stops provider work and preserves the last-good public snapshot", async () => {
  const h = await setup()
  const previous = await h.store.readPublicSnapshot(SLUG)
  h.blob.fail = (op, path) =>
    op === "put" && path.includes("/owners/") && h.calls.length === 1
  assert.deepEqual(await h.run(), { status: "failed" })
  assert.equal(h.calls.length, 1)
  assert.deepEqual(await h.store.readPublicSnapshot(SLUG), previous)
})

test("scheduled refresh rechecks due and paused state under the lease; manual refresh remains available when paused", async () => {
  const h = await setup({ owner: { lastSuccessfulUpdateAt: NOW } })
  await h.store.publishSnapshot(
    OWNER,
    SLUG,
    makePublicSnapshot({ generatedAt: NOW, lastSuccessfulUpdateAt: NOW }),
  )
  assert.deepEqual(await h.run("scheduled"), { status: "skipped" })
  assert.equal(h.calls.length, 0)
  await h.store.writeOwner({
    ...(await h.store.readOwner(OWNER)),
    paused: true,
    lastSuccessfulUpdateAt: null,
  })
  assert.deepEqual(await h.run("scheduled"), { status: "skipped" })
  assert.equal(h.calls.length, 0)
  assert.deepEqual(await h.run("manual"), { status: "updated" })
})

test("weekly cadence includes owners whose previous Monday refresh finished after 07:00", async () => {
  const h = await setup({
    owner: { lastSuccessfulUpdateAt: "2026-10-19T07:00:12.000Z" },
  })
  await h.store.publishSnapshot(
    OWNER,
    SLUG,
    makePublicSnapshot({
      generatedAt: "2026-10-19T07:00:12.000Z",
      lastSuccessfulUpdateAt: "2026-10-19T07:00:12.000Z",
    }),
  )
  assert.deepEqual(await h.run("scheduled"), { status: "updated" })
  assert.equal((await h.store.readOwner(OWNER)).lastManualRefreshAt, null)
  assert.deepEqual(await h.run("scheduled"), { status: "skipped" })
  assert.equal(h.calls.length, 7)
})

test("a lease cleanup failure after a committed snapshot still reports the completed refresh", async () => {
  const h = await setup()
  const del = h.blob.del
  h.blob.del = async path => {
    if (path.includes("/leases/")) throw new Error("cleanup failed")
    return del(path)
  }
  assert.deepEqual(await h.run(), { status: "updated" })
  assert.equal((await h.store.readPublicSnapshot(SLUG)).generatedAt, NOW)
})

test("unexpected dependency rejection never executes error getters or exposes details", async () => {
  const h = await setup()
  let reads = 0
  const error = Object.defineProperty({}, "code", {
    get() {
      reads++
      throw new Error("private details")
    },
  })
  h.state.failure = () => failure(503)
  h.deps.wait = async () => {
    throw error
  }
  assert.deepEqual(await h.run(), { status: "failed" })
  assert.equal(reads, 0)
})

test("pointer failure cannot advance success metadata even when failure-status persistence also fails", async () => {
  const h = await setup()
  let pointerFailed = false
  h.blob.fail = (op, path) => {
    if (op === "put" && path.includes("/shares/")) {
      pointerFailed = true
      return true
    }
    return pointerFailed && op === "put" && path.includes("/owners/")
  }
  assert.deepEqual(await h.run(), { status: "failed" })
  assert.equal((await h.store.readOwner(OWNER)).lastSuccessfulUpdateAt, null)
  assert.equal((await h.store.readPublicSnapshot(SLUG)).generatedAt, OLD)
  h.blob.fail = () => false
  assert.deepEqual(await h.run("scheduled"), { status: "updated" })
})

test("owner metadata failure after public commit retains successful outcome and skips redundant scheduled provider work", async () => {
  const h = await setup()
  const replace = h.store.replacePublishedSnapshot
  h.store.replacePublishedSnapshot = async (...args) => {
    const result = await replace(...args)
    h.blob.fail = (op, path) => op === "put" && path.includes("/owners/")
    return result
  }
  assert.deepEqual(await h.run(), { status: "updated" })
  assert.equal((await h.store.readPublicSnapshot(SLUG)).generatedAt, NOW)
  assert.equal((await h.store.readOwner(OWNER)).lastSuccessfulUpdateAt, null)
  h.blob.fail = () => false
  h.calls.length = 0
  assert.deepEqual(await h.run("scheduled"), { status: "skipped" })
  assert.equal(h.calls.length, 0)
})

test("unpublished committed draft remains authoritative when the subsequent owner status write fails", async () => {
  const h = await setup({ published: false })
  const write = h.store.writeDraft
  h.store.writeDraft = async (...args) => {
    await write(...args)
    h.blob.fail = (op, path) => op === "put" && path.includes("/owners/")
  }
  assert.deepEqual(await h.run(), { status: "drafted" })
  assert.equal((await h.store.readDraft(OWNER)).snapshot.generatedAt, NOW)
  assert.equal((await h.store.readOwner(OWNER)).lastSuccessfulUpdateAt, null)
  h.blob.fail = () => false
  h.calls.length = 0
  assert.deepEqual(await h.run("scheduled"), { status: "skipped" })
  assert.equal(h.calls.length, 0)
})

for (const part of ["drafts/", "evidence/", "snapshots/", "shares/"]) {
  test(`${part} persistence failure preserves the public pointer`, async () => {
    const h = await setup()
    const previous = await h.store.readPublicSnapshot(SLUG)
    h.blob.fail = (op, path) => op === "put" && path.includes(part)
    assert.deepEqual(await h.run(), { status: "failed" })
    assert.deepEqual(await h.store.readPublicSnapshot(SLUG), previous)
  })
}

test("concurrent work shares the owner lease and deleted owners cannot refresh", async () => {
  const h = await setup()
  let release, started
  const gate = new Promise(resolve => (release = resolve))
  const ready = new Promise(resolve => (started = resolve))
  const originalFetch = h.deps.fetchImpl
  h.deps.fetchImpl = async (...args) => {
    started()
    await gate
    return originalFetch(...args)
  }
  const first = h.run()
  await ready
  assert.deepEqual(await h.run("scheduled"), { status: "busy" })
  release()
  assert.deepEqual(await first, { status: "updated" })
  await h.store.deleteOwnerData(OWNER)
  assert.deepEqual(await h.run(), { status: "skipped" })
  assert.equal(await h.store.readDraft(OWNER), null)
})

test("tombstone immediately before publication prevents pointer replacement", async () => {
  const h = await setup()
  const original = h.store.replacePublishedSnapshot
  h.store.replacePublishedSnapshot = async (...args) => {
    h.data.set(
      `music-beta/tombstones/${ownerHash}.json`,
      JSON.stringify({ deletedAt: NOW }),
    )
    return original(...args)
  }
  assert.deepEqual(await h.run(), { status: "skipped" })
  assert.equal(await h.store.readPublicSnapshot(SLUG), null)
})

test("due owners use concurrency two, skip recent/paused/reconnect owners and expose only counts", async () => {
  const h = await setup({ published: false })
  for (let i = 1; i < 5; i++)
    await h.store.writeOwner(
      makeOwnerRecord({
        ownerId: `owner-${i}`,
        boundUserNumber: i + 1,
        encryptedRefreshToken: encryptSecret("old-refresh", KEY, 1),
        lastSuccessfulUpdateAt: i === 4 ? NOW : null,
      }),
    )
  await refreshOwnerPortrait({
    ownerKey: "owner-4",
    reason: "initial",
    deps: h.deps,
  })
  let active = 0,
    maximum = 0
  const fetchImpl = h.deps.fetchImpl
  h.deps.fetchImpl = async (...args) => {
    active++
    maximum = Math.max(maximum, active)
    await new Promise(resolve => setImmediate(resolve))
    try {
      return await fetchImpl(...args)
    } finally {
      active--
    }
  }
  const result = await refreshDueOwners(h.deps)
  assert.equal(maximum, 2)
  assert.deepEqual(result, {
    status: "complete",
    processed: 4,
    updated: 0,
    drafted: 4,
    skipped: 0,
    busy: 0,
    failed: 0,
    reconnect_required: 0,
    retry_pending: 0,
  })
  await h.store.writeOwner({
    ...(await h.store.readOwner(OWNER)),
    paused: true,
    lastSuccessfulUpdateAt: null,
  })
  await h.store.writeOwner({
    ...(await h.store.readOwner("owner-1")),
    reconnectRequired: true,
    lastSuccessfulUpdateAt: null,
  })
  assert.equal((await refreshDueOwners(h.deps)).processed, 0)
})

function response() {
  return {
    headers: {},
    setHeader(key, value) {
      this.headers[key] = value
    },
    status(code) {
      this.code = code
      return this
    },
    json(body) {
      this.body = body
      return this
    },
  }
}

for (const broken of ["corrupt index", "publication read", "draft read"]) {
  test(`owner-specific ${broken} failure is counted without blocking a healthy due owner`, async () => {
    const h = await setup({ published: broken !== "draft read" })
    const healthy = "healthy-owner"
    const healthySlug = Buffer.alloc(32, 9).toString("base64url")
    await h.store.writeOwner(
      makeOwnerRecord({
        ownerId: healthy,
        boundUserNumber: 2,
        encryptedRefreshToken: encryptSecret("healthy-refresh", KEY, 1),
      }),
    )
    await h.store.publishSnapshot(healthy, healthySlug, makePublicSnapshot())
    if (broken === "corrupt index") {
      const path = `music-beta/publications/${ownerHash}.json`
      h.data.set(
        path,
        JSON.stringify({
          ...JSON.parse(h.data.get(path)),
          ownerKey: "b".repeat(64),
        }),
      )
    } else {
      const kind = broken === "draft read" ? "drafts" : "publications"
      h.blob.fail = (op, path) =>
        op === "get" && path === `music-beta/${kind}/${ownerHash}.json`
    }
    assert.deepEqual(await refreshDueOwners(h.deps), {
      status: "complete",
      processed: 2,
      updated: 1,
      drafted: 0,
      skipped: 0,
      busy: 0,
      failed: 1,
      reconnect_required: 0,
      retry_pending: 0,
    })
    assert.equal(
      (await h.store.readPublicSnapshot(healthySlug)).generatedAt,
      NOW,
    )
    assert.equal(h.calls.length, 7)
  })
}

test("global owner-list failure remains a generic batch failure without starting provider work", async () => {
  const h = await setup()
  h.store.listRefreshableOwners = async () => {
    throw new Error("private listing details")
  }
  const res = response()
  await createRefreshHandler({
    cronSecret: "expected",
    refresh: () => refreshDueOwners(h.deps),
  })({ method: "GET", headers: { authorization: "Bearer expected" } }, res)
  assert.equal(res.code, 502)
  assert.deepEqual(res.body, { status: "failed" })
  assert.equal(h.calls.length, 0)
})

test("weekly handler requires an exact secret, GET, and returns only safe aggregate counters", async () => {
  let calls = 0
  const handler = createRefreshHandler({
    cronSecret: "expected",
    refresh: async () => {
      calls++
      return {
        status: "complete",
        processed: 0,
        updated: 0,
        drafted: 0,
        skipped: 0,
        busy: 0,
        failed: 0,
        reconnect_required: 0,
        retry_pending: 0,
        secret: "must be omitted",
      }
    },
  })
  for (const authorization of [
    undefined,
    "Bearer wrong",
    "Bearer expected ",
    ["Bearer expected"],
  ]) {
    const res = response()
    await handler({ method: "GET", headers: { authorization } }, res)
    assert.equal(res.code, 401)
  }
  const post = response()
  await handler(
    { method: "POST", headers: { authorization: "Bearer expected" } },
    post,
  )
  assert.equal(post.code, 405)
  assert.equal(calls, 0)
  const success = response()
  await handler(
    { method: "GET", headers: { authorization: "Bearer expected" } },
    success,
  )
  assert.equal(success.code, 200)
  assert.equal(success.headers["Cache-Control"], "no-store")
  assert.equal(success.body.secret, undefined)
  const broken = response()
  await createRefreshHandler({
    cronSecret: "expected",
    refresh: async () => {
      throw new Error("private response")
    },
  })({ method: "GET", headers: { authorization: "Bearer expected" } }, broken)
  assert.equal(broken.code, 502)
  assert.deepEqual(broken.body, { status: "failed" })
})

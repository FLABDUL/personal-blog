const test = require("node:test")
const assert = require("node:assert/strict")
const { createHash } = require("node:crypto")
const {
  createPublicPortraitHandler,
} = require("../../api/music-portrait-public")
const { createMusicBetaStore } = require("../../api/_music-beta/store")
const { hashCapability } = require("../../api/_music-beta/security")
const { makeOwnerRecord, makePublicSnapshot } = require("./fixtures/music-beta")

const capability = Buffer.alloc(32, 11).toString("base64url")
const nextCapability = Buffer.alloc(32, 12).toString("base64url")
const owner = "owner-fixture"
const ownerKey = createHash("sha256").update(owner).digest("hex")
const prefix = "music-beta/"
const pointerPath = token => `${prefix}shares/${hashCapability(token)}.json`
const publicationPath = `${prefix}publications/${ownerKey}.json`
const missing = { error: "Portrait not found" }

async function invoke(
  store,
  query = { capability },
  method = "GET",
  extra = {},
) {
  const response = {
    headers: {},
    setHeader(name, value) {
      this.headers[name] = value
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
  await createPublicPortraitHandler({ store })(
    { method, query, ...extra },
    response,
  )
  assert.equal(response.headers["Cache-Control"], "no-store")
  assert.equal(response.headers["Referrer-Policy"], "no-referrer")
  assert.equal(
    response.headers["Content-Type"],
    "application/json; charset=utf-8",
  )
  assert.equal(response.headers["Set-Cookie"], undefined)
  return response
}

async function fixture() {
  const data = new Map()
  const calls = []
  const blob = {
    async get(path, options) {
      calls.push(path)
      assert.equal(options.useCache, false)
      return data.has(path)
        ? { statusCode: 200, stream: new Response(data.get(path)).body }
        : null
    },
    async put(path, body, options) {
      if (data.has(path) && !options.allowOverwrite)
        throw new Error("collision")
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
  const snapshot = makePublicSnapshot()
  await store.writeOwner(makeOwnerRecord())
  await store.publishSnapshot(owner, capability, snapshot, 1)
  calls.length = 0
  return { store, data, calls, snapshot, blob }
}

test("GET returns only the detached Task 1 public projection without owner authentication", async () => {
  const { store, snapshot, data } = await fixture()
  const before = JSON.stringify([...data])
  const response = await invoke(store, undefined, "GET", {
    headers: { cookie: "ignored-owner-cookie", "x-csrf-token": "ignored" },
    body: { ignored: true },
  })
  assert.equal(response.code, 200)
  assert.deepEqual(response.body, snapshot)
  const forbidden = new Set([
    "ownerId",
    "spotifyUserId",
    "email",
    "rank",
    "ranks",
    "accessToken",
    "refreshToken",
    "encryptedRefreshToken",
    "inviteHash",
    "sessionVersion",
    "overrides",
    "evidence",
    "catalogue",
    "diagnostics",
    "storagePath",
    "snapshotPath",
    "ownerKey",
    "shareHash",
    "shareVersion",
    "csrfToken",
  ])
  function inspect(value) {
    if (!value || typeof value !== "object") return
    for (const [key, child] of Object.entries(value)) {
      assert.equal(forbidden.has(key), false, key)
      inspect(child)
    }
  }
  inspect(response.body)
  response.body.owner.displayName = "Changed"
  response.body.planets[1].moons[0].artistIds.length = 0
  assert.equal(JSON.stringify([...data]), before)
  assert.deepEqual((await invoke(store)).body, snapshot)
})

for (const method of ["POST", "PATCH", "DELETE", "HEAD", "OPTIONS"])
  test(`${method} rejects before any storage access`, async () => {
    let calls = 0
    const response = await invoke(
      {
        readPublicSnapshot() {
          calls++
          throw new Error()
        },
      },
      {},
      method,
    )
    assert.equal(response.code, 405)
    assert.equal(response.headers.Allow, "GET")
    assert.deepEqual(response.body, { error: "Method not allowed" })
    assert.equal(calls, 0)
  })

for (const [label, query] of [
  ["missing", {}],
  ["empty", { capability: "" }],
  ["array", { capability: [capability] }],
  ["repeated", { capability: [capability, capability] }],
  ["short", { capability: "a".repeat(22) }],
  ["oversized", { capability: "a".repeat(100000) }],
  ["padding", { capability: `${capability}=` }],
  ["noncanonical", { capability: `${capability.slice(0, -1)}B` }],
  ["path", { capability: `../${capability}` }],
  ["trailing newline", { capability: `${capability}\n` }],
  ["unknown field", { capability, ownerId: owner }],
])
  test(`${label} capability is an ordinary 404 before storage`, async () => {
    let calls = 0
    const response = await invoke(
      {
        readPublicSnapshot() {
          calls++
        },
      },
      query,
    )
    assert.equal(response.code, 404)
    assert.deepEqual(response.body, missing)
    assert.equal(calls, 0)
  })

test("repeated raw query parameters cannot be hidden by a parsed query", async () => {
  let calls = 0
  const response = await invoke(
    {
      readPublicSnapshot() {
        calls++
      },
    },
    { capability },
    "GET",
    {
      url: `/api/music-portrait-public?capability=${capability}&capability=${capability}`,
    },
  )
  assert.equal(response.code, 404)
  assert.deepEqual(response.body, missing)
  assert.equal(calls, 0)
})

for (const condition of [
  "unknown",
  "revoked",
  "old",
  "prepared",
  "tombstoned",
  "deleted",
  "pointer",
  "index",
  "owner",
  "snapshot",
  "missing snapshot",
  "json",
])
  test(`${condition} publication gives the same generic 404`, async () => {
    const { store, data, snapshot } = await fixture()
    let token = capability
    const pointer = JSON.parse(data.get(pointerPath(capability)))
    if (condition === "unknown") token = nextCapability
    if (condition === "revoked") await store.revokeShare(owner, capability)
    if (condition === "old")
      await store.rotatePublishedSnapshot(owner, nextCapability, snapshot, 2)
    if (condition === "prepared") {
      data.set(pointerPath(nextCapability), JSON.stringify(pointer))
      token = nextCapability
    }
    if (condition === "tombstoned")
      data.set(`${prefix}tombstones/${ownerKey}.json`, "{}")
    if (condition === "deleted") await store.deleteOwnerData(owner)
    if (condition === "pointer")
      data.set(
        pointerPath(capability),
        JSON.stringify({ ownerKey, snapshotPath: "private/elsewhere" }),
      )
    if (condition === "index")
      data.set(
        publicationPath,
        JSON.stringify({ ownerKey, shareHash: "private" }),
      )
    if (condition === "owner")
      data.set(
        `${prefix}owners/${ownerKey}.json`,
        JSON.stringify({ private: capability }),
      )
    if (condition === "snapshot")
      data.set(
        pointer.snapshotPath,
        JSON.stringify({ ...snapshot, evidence: capability }),
      )
    if (condition === "missing snapshot") data.delete(pointer.snapshotPath)
    if (condition === "json")
      data.set(pointer.snapshotPath, "not JSON: PRIVATE_SENTINEL")
    const response = await invoke(store, { capability: token })
    assert.equal(response.code, 404)
    assert.deepEqual(response.body, missing)
    assert.equal(JSON.stringify(response).includes(token), false)
  })

test("unavailable dependencies return a fixed 503 without inspecting or logging secrets", async () => {
  for (const error of [
    new Error(`PRIVATE_SENTINEL ${capability}`),
    { category: "unavailable", message: capability },
  ]) {
    const response = await invoke({
      async readPublicSnapshot() {
        throw error
      },
    })
    assert.equal(response.code, 503)
    assert.deepEqual(response.body, { error: "Portrait unavailable" })
    assert.equal(JSON.stringify(response).includes(capability), false)
    assert.equal(JSON.stringify(response).includes("PRIVATE_SENTINEL"), false)
  }
})

test("an existing JSON-null tombstone returns the generic 404, unlike absence or a storage outage", async () => {
  const { store, blob, data, snapshot } = await fixture()
  const tombstone = `${prefix}tombstones/${ownerKey}.json`
  const request = { url: `/api/music-portrait-public?capability=${capability}` }
  assert.equal(data.has(tombstone), false)
  assert.equal((await invoke(store, undefined, "GET", request)).code, 200)
  data.set(tombstone, "null")
  assert.equal(data.get(tombstone), "null")
  const response = await invoke(store, undefined, "GET", request)
  assert.equal(response.code, 404)
  assert.deepEqual(response.body, missing)
  assert.equal(JSON.stringify(response).includes(capability), false)
  data.delete(tombstone)
  const restored = await invoke(store, undefined, "GET", request)
  assert.equal(restored.code, 200)
  assert.deepEqual(restored.body, snapshot)
  const get = blob.get.bind(blob)
  blob.get = async (path, options) => {
    if (path === tombstone) throw new Error("PRIVATE_SENTINEL storage outage")
    return get(path, options)
  }
  const unavailable = await invoke(store, undefined, "GET", request)
  assert.equal(unavailable.code, 503)
  assert.deepEqual(unavailable.body, { error: "Portrait unavailable" })
})

test("a genuine Blob outage remains a fixed 503", async () => {
  const { store, blob } = await fixture()
  blob.get = async () => {
    throw new Error(`PRIVATE_SENTINEL ${capability}`)
  }
  const response = await invoke(store)
  assert.equal(response.code, 503)
  assert.deepEqual(response.body, { error: "Portrait unavailable" })
})

test("invalid injected public output fails closed instead of projecting extra data", async () => {
  const snapshot = makePublicSnapshot()
  for (const value of [
    { ...snapshot, shareHash: "PRIVATE_SENTINEL" },
    { ...snapshot, owner: { ...snapshot.owner, ownerId: "PRIVATE_SENTINEL" } },
  ]) {
    const response = await invoke({
      async readPublicSnapshot() {
        return value
      },
    })
    assert.equal(response.code, 404)
    assert.deepEqual(response.body, missing)
  }
})

test("Gatsby registers only the generic client route and preserves ordinary pages", async () => {
  const { onCreatePage } = require("../../gatsby-node")
  const created = []
  const actions = { createPage: page => created.push(page) }
  onCreatePage({
    page: { path: "/music/galaxy/", component: "shared" },
    actions,
  })
  assert.deepEqual(created, [
    {
      path: "/music/galaxy/",
      component: "shared",
      matchPath: "/music/galaxy/*",
    },
  ])
  for (const path of ["/music/", "/music/create/", "/404/", "/blog/example/"])
    onCreatePage({ page: { path }, actions })
  assert.equal(created.length, 1)
  onCreatePage({ page: created[0], actions })
  assert.equal(created.length, 1)
})

const test = require("node:test")
const assert = require("node:assert/strict")
const { createHash } = require("node:crypto")
const { createMusicBetaStore } = require("../../api/_music-beta/store")
const { createOwnerHandler } = require("../../api/music-portrait-owner")
const { createPublishHandler } = require("../../api/music-portrait-publish")
const {
  createRefreshOwnerHandler,
} = require("../../api/music-portrait-refresh-owner")
const { createLinkHandler } = require("../../api/music-portrait-link")
const { createDeleteHandler } = require("../../api/music-portrait-delete")
const {
  createSession,
  createCsrfToken,
  encryptSecret,
  hashCapability,
  deriveShareCapability,
} = require("../../api/_music-beta/security")
const { SESSION_COOKIE } = require("../../api/_music-beta/http")
const {
  makeOwnerRecord,
  makeEvidence,
  makePublicSnapshot,
  artistId,
  NOW,
} = require("./fixtures/music-beta")

const OWNER = "owner-fixture"
const KEY = Buffer.alloc(32, 7)
const ORIGIN = "https://portrait.example"
const ownerHash = createHash("sha256").update(OWNER).digest("hex")
const indexPath = `music-beta/publications/${ownerHash}.json`
const sharePath = slug => `music-beta/shares/${hashCapability(slug)}.json`
const slugFrom = result => new URL(result.body.publicUrl).pathname.split("/")[3]

async function setup() {
  const data = new Map(),
    diagnostics = [],
    calls = []
  const blob = {
    fail: () => false,
    async get(path) {
      if (this.fail("get", path)) throw new Error("secret storage path")
      return data.has(path)
        ? { statusCode: 200, stream: new Response(data.get(path)).body }
        : null
    },
    async put(path, body, options) {
      if (this.fail("put", path)) throw new Error("secret storage path")
      if (data.has(path) && !options.allowOverwrite) throw new Error("exists")
      data.set(path, body)
    },
    async del(path) {
      if (this.fail("del", path)) throw new Error("secret storage path")
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
      encryptedRefreshToken: encryptSecret("refresh-secret", KEY, 1),
    }),
  )
  const snapshot = makePublicSnapshot({ planetCount: 1 })
  await store.writeDraft(OWNER, {
    schemaVersion: 1,
    evidence: makeEvidence(),
    catalogue: {
      artists: snapshot.planets.map(({ id, name, spotifyUrl }) => ({
        id,
        name,
        spotifyUrl,
      })),
      tracks: [],
    },
    snapshot,
  })
  const deps = {
    store,
    sessionKey: KEY,
    tokenKey: KEY,
    siteOrigin: ORIGIN,
    clientId: "fixture",
    clientSecret: "fixture",
    now: () => Date.parse(NOW),
    diagnostic: event => diagnostics.push(event),
    wait: async () => {},
    fetchImpl: async url => {
      calls.push(url)
      return {
        status: 200,
        ok: true,
        json: async () =>
          url.includes("/api/token")
            ? {
                access_token: "access-secret",
                refresh_token: "refresh-secret",
                token_type: "Bearer",
                expires_in: 3600,
              }
            : { items: [], total: 0 },
      }
    },
  }
  const session = createSession(
    {
      ownerId: OWNER,
      sessionVersion: 1,
      expiresAt: Date.parse(NOW) + 7 * 86400000,
    },
    KEY,
  )
  const headers = {
    cookie: `${SESSION_COOKIE}=${session}`,
    origin: ORIGIN,
    "content-type": "application/json",
    "x-csrf-token": createCsrfToken(session, KEY),
  }
  async function call(factory, method, body = {}, changes = {}) {
    const res = {
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
    await factory(deps)({ method, body, headers, ...changes }, res)
    return res
  }
  return { data, blob, store, deps, call, headers, diagnostics, calls }
}

const mutations = [
  ["overrides", createOwnerHandler, "PATCH", { overrides: {} }],
  ["paused", createOwnerHandler, "PATCH", { paused: true }],
  ["publish", createPublishHandler, "POST", {}],
  ["refresh", createRefreshOwnerHandler, "POST", {}],
  ["link", createLinkHandler, "POST", {}],
  ["delete", createDeleteHandler, "DELETE", {}],
]

for (const [name, factory, method, body] of mutations) {
  test(`${name}: method, JSON, origin, current session and exact-session CSRF guards`, async () => {
    const h = await setup()
    for (const [change, expected] of [
      [{ method: "PUT" }, 405],
      [{ headers: { ...h.headers, "content-type": "text/plain" } }, 415],
      [{ headers: { ...h.headers, origin: "https://other.example" } }, 403],
      [{ headers: { ...h.headers, cookie: "" } }, 401],
      [
        {
          headers: {
            ...h.headers,
            cookie: `${SESSION_COOKIE}=${createSession({ ownerId: OWNER, sessionVersion: 1, expiresAt: Date.parse(NOW) }, KEY)}`,
          },
        },
        401,
      ],
      [{ headers: { ...h.headers, "x-csrf-token": "wrong" } }, 403],
      [
        {
          headers: {
            ...h.headers,
            "x-csrf-token": createCsrfToken(
              createSession(
                {
                  ownerId: OWNER,
                  sessionVersion: 1,
                  expiresAt: Date.parse(NOW) + 1000,
                },
                KEY,
              ),
              KEY,
            ),
          },
        },
        403,
      ],
    ]) {
      const result = await h.call(factory, method, body, change)
      assert.equal(result.code, expected)
      assert.equal(result.headers["Cache-Control"], "no-store")
      assert.deepEqual(result.body, {
        error: "Unable to complete music portrait request",
      })
    }
    await h.store.writeOwner({
      ...(await h.store.readOwner(OWNER)),
      sessionVersion: 2,
    })
    assert.equal((await h.call(factory, method, body)).code, 401)
    assert.equal(h.calls.length, 0)
  })
  test(`${name}: rejects unexpected, accessor, proxy and oversized bodies before work`, async () => {
    const h = await setup()
    let traps = 0
    const accessor = Object.defineProperty({}, "overrides", {
      enumerable: true,
      get() {
        traps++
        throw new Error("private")
      },
    })
    const proxy = new Proxy(
      {},
      {
        ownKeys() {
          traps++
          throw new Error("private")
        },
      },
    )
    for (const value of [
      { surprise: "secret" },
      accessor,
      proxy,
      { extra: "x".repeat(70000) },
      [],
      null,
      "{}",
    ])
      assert.equal((await h.call(factory, method, value)).code, 400)
    assert.equal(traps, 0)
    assert.equal(h.calls.length, 0)
    assert.equal((await h.store.readOwner(OWNER)).paused, false)
  })
}

test("GET returns only safe projection and public draft; committed timestamps win", async () => {
  const h = await setup()
  const res = await h.call(createOwnerHandler, "GET")
  assert.equal(res.code, 200)
  assert.deepEqual(Object.keys(res.body).sort(), [
    "csrfToken",
    "draft",
    "owner",
    "publicUrl",
    "refreshStatus",
  ])
  assert.equal(res.body.owner.displayName, "Fixture owner")
  assert.equal(res.body.owner.lastSuccessfulUpdateAt, NOW)
  assert.equal(res.body.publicUrl, null)
  assert.deepEqual(res.body.draft, (await h.store.readDraft(OWNER)).snapshot)
  assert.equal(res.body.csrfToken, h.headers["x-csrf-token"])
  for (const field of [
    "spotifyUserId",
    "ownerId",
    "encryptedRefreshToken",
    "evidence",
    "catalogue",
    "ranks",
    "inviteHash",
    "sessionVersion",
  ])
    assert.equal(JSON.stringify(res.body).includes(`"${field}"`), false)
  assert.equal(
    (await h.call(createOwnerHandler, "GET", {}, { headers: {} })).code,
    401,
  )
})

test("complete override replacement regenerates private draft from existing evidence", async () => {
  const h = await setup()
  const evidence = (await h.store.readDraft(OWNER)).evidence
  const overrides = {
    [artistId(0)]: { pinned: true, region: "outer_reaches", note: "My note" },
  }
  const res = await h.call(createOwnerHandler, "PATCH", { overrides })
  assert.equal(res.code, 200)
  assert.deepEqual(await h.store.readOverrides(OWNER), overrides)
  assert.deepEqual((await h.store.readDraft(OWNER)).evidence, evidence)
  assert.equal(
    res.body.draft.planets.find(p => p.id === artistId(0)).note,
    "My note",
  )
  assert.equal(res.body.draft.generatedAt, NOW)
  assert.equal(h.calls.length, 0)
  assert.equal(
    (await h.call(createOwnerHandler, "PATCH", { overrides: {} })).code,
    200,
  )
  assert.deepEqual(await h.store.readOverrides(OWNER), {})
})

test("invalid overrides including unavailable artists and nested executable data are rejected", async () => {
  const h = await setup()
  let traps = 0
  for (const overrides of [
    { [artistId(0)]: { pinned: "yes" } },
    { [artistId(0)]: { pinned: true, note: "x".repeat(501) } },
    { [artistId(0)]: { pinned: true, region: "unknown" } },
    { [artistId(99)]: { pinned: true } },
    {
      [artistId(0)]: new Proxy(
        {},
        {
          ownKeys() {
            traps++
            return []
          },
        },
      ),
    },
    {
      [artistId(0)]: Object.defineProperty({}, "pinned", {
        enumerable: true,
        get() {
          traps++
          return true
        },
      }),
    },
  ])
    assert.equal(
      (await h.call(createOwnerHandler, "PATCH", { overrides })).code,
      400,
    )
  assert.equal(traps, 0)
  assert.deepEqual(await h.store.readOverrides(OWNER), {})
})

test("failed override draft write restores the previous complete overrides", async () => {
  const h = await setup()
  const previous = await h.store.readDraft(OWNER)
  h.blob.fail = (op, path) => op === "put" && path.includes("/drafts/")
  assert.equal(
    (
      await h.call(createOwnerHandler, "PATCH", {
        overrides: { [artistId(0)]: { pinned: true, note: "new" } },
      })
    ).code,
    503,
  )
  assert.deepEqual(await h.store.readOverrides(OWNER), {})
  assert.deepEqual(await h.store.readDraft(OWNER), previous)
})

test("first publish returns one high entropy URL, stores only hashes and pause keeps it visible", async () => {
  const h = await setup()
  const res = await h.call(createPublishHandler, "POST")
  assert.equal(res.code, 200)
  const slug = slugFrom(res)
  assert.equal(Buffer.from(slug, "base64url").length, 32)
  assert.equal(res.body.publicUrl, `${ORIGIN}/music/galaxy/${slug}/`)
  assert.deepEqual(await h.store.readPublicSnapshot(slug), res.body.draft)
  assert.equal([...h.data.values()].join("").includes(slug), false)
  assert.equal(await h.store.readPublicationHash(OWNER), hashCapability(slug))
  for (const paused of [true, false]) {
    const result = await h.call(createOwnerHandler, "PATCH", { paused })
    assert.equal(result.body.owner.paused, paused)
    assert.ok(await h.store.readPublicSnapshot(slug))
  }
  assert.equal(
    (await h.call(createPublishHandler, "POST")).body.publicUrl,
    res.body.publicUrl,
  )
  assert.equal(
    (await h.call(createOwnerHandler, "GET")).body.publicUrl,
    res.body.publicUrl,
  )
  assert.deepEqual(JSON.parse(h.data.get(indexPath)), {
    ownerKey: ownerHash,
    shareHash: hashCapability(slug),
    shareVersion: 1,
  })
})

test("manual refresh is limited per UTC date including failed and concurrent attempts", async () => {
  const h = await setup()
  let started, release
  const ready = new Promise(resolve => {
    started = resolve
  })
  const gate = new Promise(resolve => {
    release = resolve
  })
  const fetchImpl = h.deps.fetchImpl
  h.deps.fetchImpl = async (...args) => {
    started()
    await gate
    return fetchImpl(...args)
  }
  const first = h.call(createRefreshOwnerHandler, "POST")
  await ready
  assert.equal((await h.call(createRefreshOwnerHandler, "POST")).code, 409)
  release()
  assert.equal((await first).body.refreshStatus.status, "drafted")
  assert.equal((await h.call(createRefreshOwnerHandler, "POST")).code, 429)
  assert.equal(h.calls.length, 7)
  h.deps.now = () => Date.parse("2026-10-18T00:00:00.000Z")
  h.deps.fetchImpl = async () => ({ status: 503, ok: false })
  assert.equal(
    (await h.call(createRefreshOwnerHandler, "POST")).body.refreshStatus.status,
    "failed",
  )
  assert.equal((await h.call(createRefreshOwnerHandler, "POST")).code, 429)
})

test("reconnect-required state explains the issue and preserves the last portrait", async () => {
  const h = await setup()
  const slug = slugFrom(await h.call(createPublishHandler, "POST"))
  await h.store.writeOwner({
    ...(await h.store.readOwner(OWNER)),
    reconnectRequired: true,
    refreshStatus: "reconnect_required",
  })
  const res = await h.call(createRefreshOwnerHandler, "POST")
  assert.equal(res.body.refreshStatus.status, "reconnect_required")
  assert.match(res.body.refreshStatus.message, /Reconnect/)
  assert.ok(await h.store.readPublicSnapshot(slug))
  assert.equal(h.calls.length, 0)
})

test("regeneration switches index then revokes old URL even if old-pointer cleanup fails", async () => {
  const h = await setup()
  const old = slugFrom(await h.call(createPublishHandler, "POST"))
  h.blob.fail = (op, path) => op === "del" && path === sharePath(old)
  const res = await h.call(createLinkHandler, "POST")
  assert.equal(res.code, 200)
  const fresh = slugFrom(res)
  assert.notEqual(fresh, old)
  assert.equal(await h.store.readPublicSnapshot(old), null)
  assert.ok(await h.store.readPublicSnapshot(fresh))
  assert.equal(await h.store.readPublicationHash(OWNER), hashCapability(fresh))
  assert.equal(
    (await h.call(createOwnerHandler, "GET")).body.publicUrl,
    res.body.publicUrl,
  )
  assert.equal(JSON.parse(h.data.get(indexPath)).shareVersion, 2)
})

for (const stage of ["snapshots", "shares", "publications"])
  test(`failed regeneration ${stage} write preserves old link`, async () => {
    const h = await setup()
    const old = slugFrom(await h.call(createPublishHandler, "POST"))
    h.blob.fail = (op, path) => op === "put" && path.includes(`/${stage}/`)
    assert.equal((await h.call(createLinkHandler, "POST")).code, 503)
    assert.ok(await h.store.readPublicSnapshot(old))
    assert.equal(await h.store.readPublicationHash(OWNER), hashCapability(old))
    h.blob.fail = () => false
    const retry = await h.call(createLinkHandler, "POST")
    assert.equal(retry.code, 200)
    assert.equal(await h.store.readPublicSnapshot(old), null)
    assert.ok(await h.store.readPublicSnapshot(slugFrom(retry)))
  })

test("inert publication index is safely replaced; mismatched owner/pointer is rejected", async () => {
  const h = await setup()
  const old = slugFrom(await h.call(createPublishHandler, "POST"))
  h.data.delete(sharePath(old))
  assert.equal((await h.call(createLinkHandler, "POST")).code, 200)
  const index = JSON.parse(h.data.get(indexPath))
  h.data.set(indexPath, JSON.stringify({ ...index, ownerKey: "b".repeat(64) }))
  assert.equal((await h.call(createLinkHandler, "POST")).code, 503)
})

test("delete erases all owner data, tombstones late writes and only then clears cookie", async () => {
  const h = await setup()
  const old = slugFrom(await h.call(createPublishHandler, "POST"))
  await h.call(createOwnerHandler, "PATCH", {
    overrides: { [artistId(0)]: { pinned: true } },
  })
  const result = await h.call(createDeleteHandler, "DELETE")
  assert.equal(result.code, 200)
  assert.deepEqual(result.body, { deleted: true })
  assert.match(result.headers["Set-Cookie"], /Max-Age=0/)
  assert.equal(await h.store.readOwner(OWNER), null)
  assert.equal(await h.store.readPublicSnapshot(old), null)
  assert.equal(await h.store.readDraft(OWNER), null)
  assert.deepEqual(
    [...h.data.keys()],
    [`music-beta/tombstones/${ownerHash}.json`],
  )
  await assert.rejects(h.store.writeOwner(makeOwnerRecord()))
})

test("failed deletion does not clear cookie or claim completion", async () => {
  const h = await setup()
  h.blob.fail = (op, path) => op === "del" && path.includes("/owners/")
  const res = await h.call(createDeleteHandler, "DELETE")
  assert.equal(res.code, 503)
  assert.equal(res.headers["Set-Cookie"], undefined)
  assert.deepEqual(res.body, {
    error: "Unable to complete music portrait request",
  })
})

test("dependency errors and diagnostics never expose private data or execute error traps", async () => {
  const h = await setup()
  let traps = 0
  h.store.readOwner = async () => {
    throw new Proxy(
      {},
      {
        get() {
          traps++
          throw new Error("secret")
        },
      },
    )
  }
  const res = await h.call(createOwnerHandler, "GET")
  assert.equal(res.code, 503)
  assert.equal(traps, 0)
  assert.deepEqual(h.diagnostics, [
    { operation: "owner", category: "unavailable" },
  ])
})

test("share capabilities are reproducible, domain separated and change with owner, version and server key", () => {
  const original = deriveShareCapability(OWNER, 1, KEY)
  assert.deepEqual(
    deriveShareCapability(OWNER, 1, KEY.toString("base64url")),
    original,
  )
  assert.equal(Buffer.from(original.token, "base64url").length, 32)
  assert.equal(original.hash, hashCapability(original.token))
  const alternatives = [
    deriveShareCapability("another-owner", 1, KEY),
    deriveShareCapability(OWNER, 2, KEY),
    deriveShareCapability(OWNER, 1, Buffer.alloc(32, 8)),
  ]
  for (const alternative of alternatives)
    assert.notEqual(alternative.token, original.token)
  for (const version of [0, -1, 1.5, Number.MAX_SAFE_INTEGER + 1])
    assert.throws(() => deriveShareCapability(OWNER, version, KEY))
})

test("new pointer remains unreadable until publication index commit, and committed rotation has one live URL", async () => {
  const h = await setup()
  const old = slugFrom(await h.call(createPublishHandler, "POST"))
  const next = deriveShareCapability(OWNER, 2, KEY).token
  const put = h.blob.put.bind(h.blob)
  let checked = false
  h.blob.put = async (path, ...args) => {
    if (path === indexPath) {
      assert.equal(await h.store.readPublicSnapshot(next), null)
      assert.ok(await h.store.readPublicSnapshot(old))
      checked = true
    }
    return put(path, ...args)
  }
  const result = await h.call(createLinkHandler, "POST")
  assert.equal(result.code, 200)
  assert.equal(checked, true)
  assert.equal(await h.store.readPublicSnapshot(old), null)
  assert.ok(await h.store.readPublicSnapshot(next))
})

for (const stage of ["snapshots", "shares", "publications"])
  test(`failed first publication ${stage} write never exposes a pointer and is retryable`, async () => {
    const h = await setup()
    const slug = deriveShareCapability(OWNER, 1, KEY).token
    h.blob.fail = (op, path) => op === "put" && path.includes(`/${stage}/`)
    assert.equal((await h.call(createPublishHandler, "POST")).code, 503)
    assert.equal(await h.store.readPublicSnapshot(slug), null)
    h.blob.fail = () => false
    const result = await h.call(createPublishHandler, "POST")
    assert.equal(result.code, 200)
    assert.ok(await h.store.readPublicSnapshot(slug))
  })

test("publishing edits updates the current link and does not expose private override evidence", async () => {
  const h = await setup()
  const first = await h.call(createPublishHandler, "POST")
  const slug = slugFrom(first)
  const before = await h.store.readPublicSnapshot(slug)
  await h.call(createOwnerHandler, "PATCH", {
    overrides: { [artistId(0)]: { pinned: true, note: "Edited" } },
  })
  assert.deepEqual(await h.store.readPublicSnapshot(slug), before)
  const result = await h.call(createPublishHandler, "POST")
  assert.equal(result.body.publicUrl, first.body.publicUrl)
  assert.equal(
    (await h.store.readPublicSnapshot(slug)).planets[0].note,
    "Edited",
  )
  assert.equal(JSON.parse(h.data.get(indexPath)).shareVersion, 1)
})

test("deleted owners, corrupt share versions and altered hashes never receive a capability", async () => {
  const h = await setup()
  await h.call(createPublishHandler, "POST")
  const original = JSON.parse(h.data.get(indexPath))
  for (const version of [0, -1, "1", Number.MAX_SAFE_INTEGER + 1]) {
    h.data.set(
      indexPath,
      JSON.stringify({ ...original, shareVersion: version }),
    )
    assert.equal((await h.call(createOwnerHandler, "GET")).code, 503)
  }
  h.data.set(indexPath, JSON.stringify({ ...original, shareVersion: 2 }))
  assert.equal((await h.call(createOwnerHandler, "GET")).code, 503)
  h.data.set(indexPath, JSON.stringify(original))
  await h.store.deleteOwnerData(OWNER)
  assert.equal((await h.call(createOwnerHandler, "GET")).code, 401)
})

test("deletion waits for in-flight refresh and removes its final draft before clearing the cookie", async () => {
  const h = await setup()
  let started, release, deletionStarted
  const ready = new Promise(resolve => {
    started = resolve
  })
  const deleting = new Promise(resolve => {
    deletionStarted = resolve
  })
  const gate = new Promise(resolve => {
    release = resolve
  })
  const fetchImpl = h.deps.fetchImpl
  h.deps.fetchImpl = async (...args) => {
    started()
    await gate
    return fetchImpl(...args)
  }
  const refresh = h.call(createRefreshOwnerHandler, "POST")
  await ready
  const remove = h.store.deleteOwnerData
  h.store.deleteOwnerData = (...args) => {
    deletionStarted()
    return remove(...args)
  }
  let completed = false
  const deletion = h.call(createDeleteHandler, "DELETE").then(result => {
    completed = true
    return result
  })
  await deleting
  assert.equal(completed, false)
  release()
  assert.equal((await refresh).code, 200)
  assert.equal((await deletion).code, 200)
  assert.equal(await h.store.readDraft(OWNER), null)
  assert.equal(await h.store.readOwner(OWNER), null)
})

test("tombstone before rotation commit prevents a new public URL", async () => {
  const h = await setup()
  const old = slugFrom(await h.call(createPublishHandler, "POST"))
  const next = deriveShareCapability(OWNER, 2, KEY).token
  const put = h.blob.put.bind(h.blob)
  h.blob.put = async (path, ...args) => {
    await put(path, ...args)
    if (path === sharePath(next))
      h.data.set(
        `music-beta/tombstones/${ownerHash}.json`,
        JSON.stringify({ deletedAt: NOW }),
      )
  }
  assert.equal((await h.call(createLinkHandler, "POST")).code, 503)
  assert.equal(await h.store.readPublicSnapshot(old), null)
  assert.equal(await h.store.readPublicSnapshot(next), null)
})

test("all mutations reject an invalid configured origin even when the header matches it", async () => {
  const h = await setup()
  h.deps.siteOrigin = "http://portrait.example"
  for (const [, factory, method, body] of mutations) {
    const res = await h.call(factory, method, body, {
      headers: { ...h.headers, origin: h.deps.siteOrigin },
    })
    assert.equal(res.code, 503)
  }
  assert.equal(h.calls.length, 0)
  assert.equal((await h.store.readOwner(OWNER)).paused, false)
})

for (const change of ["revoked", "expired", "csrf", "session"])
  test(`queued deletion rechecks ${change} authorisation inside its acquired lease`, async () => {
    const h = await setup()
    let acquired, release, attempted
    const ready = new Promise(resolve => {
      acquired = resolve
    })
    const gate = new Promise(resolve => {
      release = resolve
    })
    const deleting = new Promise(resolve => {
      attempted = resolve
    })
    const holder = h.store.withOwnerLease(OWNER, async () => {
      acquired()
      await gate
      if (change === "revoked")
        await h.store.writeOwner({
          ...(await h.store.readOwner(OWNER)),
          sessionVersion: 2,
        })
    })
    await ready
    const remove = h.store.deleteOwnerData
    h.store.deleteOwnerData = (...args) => {
      attempted()
      return remove(...args)
    }
    let time = Date.parse(NOW)
    h.deps.now = () => time
    const deletion = h.call(createDeleteHandler, "DELETE")
    await deleting
    if (change === "expired") time += 7 * 86400000
    if (change === "csrf") h.headers["x-csrf-token"] = "revoked-during-wait"
    if (change === "session") {
      const replacement = createSession(
        { ownerId: OWNER, sessionVersion: 1, expiresAt: time + 86400000 },
        KEY,
      )
      h.headers.cookie = `${SESSION_COOKIE}=${replacement}`
      h.headers["x-csrf-token"] = createCsrfToken(replacement, KEY)
    }
    release()
    await holder
    const result = await deletion
    assert.equal(result.code, ["csrf", "session"].includes(change) ? 403 : 401)
    assert.equal(result.headers["Set-Cookie"], undefined)
    assert.ok(await h.store.readOwner(OWNER))
    assert.ok(await h.store.readDraft(OWNER))
    assert.equal(h.data.has(`music-beta/tombstones/${ownerHash}.json`), false)
  })

for (const rejection of ["false", "throws"])
  test(`deletion authorisation callback ${rejection} without exposing records or deleting data`, async () => {
    const h = await setup()
    let called = false
    await assert.rejects(
      h.store.deleteOwnerData(OWNER, async (...args) => {
        called = true
        assert.deepEqual(args, [])
        if (rejection === "throws") throw new Error("private callback details")
        return false
      }),
      error => !error.message.includes("private callback details"),
    )
    assert.equal(called, true)
    assert.ok(await h.store.readOwner(OWNER))
    assert.ok(await h.store.readDraft(OWNER))
    assert.equal(h.data.has(`music-beta/tombstones/${ownerHash}.json`), false)
  })

test("reload and unrelated note edit preserve saved pins and absent automatic-region choices", async () => {
  const h = await setup()
  const choices = {
    [artistId(0)]: { pinned: true },
    [artistId(1)]: { pinned: false, note: "Original note" },
  }
  assert.equal(
    (await h.call(createOwnerHandler, "PATCH", { overrides: choices })).code,
    200,
  )
  const reload = await h.call(createOwnerHandler, "GET")
  assert.deepEqual(reload.body.owner.overrides, choices)
  assert.equal(
    Object.hasOwn(reload.body.owner.overrides[artistId(0)], "region"),
    false,
  )
  const edited = structuredClone(reload.body.owner.overrides)
  edited[artistId(1)].note = "Updated note"
  assert.equal(
    (await h.call(createOwnerHandler, "PATCH", { overrides: edited })).code,
    200,
  )
  const stored = await h.store.readOverrides(OWNER)
  assert.equal(stored[artistId(0)].pinned, true)
  assert.equal(stored[artistId(1)].note, "Updated note")
  assert.equal(Object.hasOwn(stored[artistId(0)], "region"), false)
  assert.equal(Object.hasOwn(stored[artistId(1)], "region"), false)
  reload.body.owner.overrides[artistId(0)].pinned = false
  assert.equal((await h.store.readOverrides(OWNER))[artistId(0)].pinned, true)
})

test("refresh to absence keeps dormant overrides through reload and unrelated complete-map edits", async () => {
  const h = await setup()
  const dormant = artistId(0),
    retained = artistId(1)
  const choices = {
    [dormant]: { pinned: false, note: "Keep this when absent" },
    [retained]: { pinned: true },
  }
  assert.equal(
    (await h.call(createOwnerHandler, "PATCH", { overrides: choices })).code,
    200,
  )
  assert.equal((await h.call(createRefreshOwnerHandler, "POST")).code, 200)
  const draft = await h.store.readDraft(OWNER)
  assert.equal(
    draft.evidence.artists.some(artist => artist.id === dormant),
    false,
  )
  assert.equal(
    draft.catalogue.artists.some(artist => artist.id === dormant),
    false,
  )
  const reload = await h.call(createOwnerHandler, "GET")
  assert.deepEqual(reload.body.owner.overrides, choices)
  const edited = structuredClone(choices)
  edited[retained].note = "Unrelated edit"
  assert.equal(
    (await h.call(createOwnerHandler, "PATCH", { overrides: edited })).code,
    200,
  )
  assert.deepEqual(await h.store.readOverrides(OWNER), edited)
  const next = await h.store.readDraft(OWNER)
  assert.equal(
    next.snapshot.planets.some(artist => artist.id === dormant),
    false,
  )
  assert.equal(
    next.catalogue.artists.some(artist => artist.id === dormant),
    false,
  )
  assert.deepEqual(next.evidence, draft.evidence)
  assert.equal(
    (
      await h.call(createOwnerHandler, "PATCH", {
        overrides: {
          ...edited,
          [dormant]: { ...edited[dormant], pinned: true },
        },
      })
    ).code,
    400,
  )
  assert.equal(
    (
      await h.call(createOwnerHandler, "PATCH", {
        overrides: {
          ...edited,
          [artistId(99)]: { pinned: false, note: "New unknown" },
        },
      })
    ).code,
    400,
  )
  assert.deepEqual(await h.store.readOverrides(OWNER), edited)
  assert.equal(
    (await h.call(createOwnerHandler, "PATCH", { overrides: {} })).code,
    200,
  )
  assert.deepEqual(await h.store.readOverrides(OWNER), {})
})

test("owner editing projection rejects private, proxy and accessor choices without executing them", async () => {
  const h = await setup()
  let traps = 0
  for (const choices of [
    { [artistId(0)]: { pinned: true, secret: "private" } },
    new Proxy(
      {},
      {
        ownKeys() {
          traps++
          throw new Error("private")
        },
      },
    ),
    {
      [artistId(0)]: new Proxy(
        {},
        {
          ownKeys() {
            traps++
            throw new Error("private")
          },
        },
      ),
    },
    {
      [artistId(0)]: Object.defineProperty({}, "pinned", {
        enumerable: true,
        get() {
          traps++
          return true
        },
      }),
    },
  ]) {
    h.store.readOverrides = async () => choices
    const result = await h.call(createOwnerHandler, "GET")
    assert.equal(result.code, 503)
    assert.deepEqual(result.body, {
      error: "Unable to complete music portrait request",
    })
  }
  assert.equal(traps, 0)
})

test("owner editing projection returns a detached allowlisted copy of saved choices", async () => {
  const h = await setup()
  const stored = {
    [artistId(0)]: { pinned: true, note: "Saved", region: "outer_reaches" },
    [artistId(1)]: { pinned: false },
  }
  h.store.readOverrides = async () => stored
  const result = await h.call(createOwnerHandler, "GET")
  assert.deepEqual(result.body.owner.overrides, stored)
  assert.notEqual(result.body.owner.overrides, stored)
  assert.notEqual(result.body.owner.overrides[artistId(0)], stored[artistId(0)])
  result.body.owner.overrides[artistId(0)].note = "Changed only in the browser"
  assert.equal(stored[artistId(0)].note, "Saved")
  assert.equal(
    Object.hasOwn(result.body.owner.overrides[artistId(1)], "region"),
    false,
  )
})

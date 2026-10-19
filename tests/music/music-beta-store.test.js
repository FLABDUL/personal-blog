const test = require("node:test")
const assert = require("node:assert/strict")
const { createHash } = require("node:crypto")
const { createMusicBetaStore } = require("../../api/_music-beta/store")
const { hashCapability } = require("../../api/_music-beta/security")
const {
  makeOwnerRecord,
  makeEvidence,
  makeOverrides,
  makePublicSnapshot,
} = require("./fixtures/music-beta")

const TOKEN = Buffer.alloc(32, 1).toString("base64url")
const SLUG = Buffer.alloc(32, 2).toString("base64url")
const OWNER = "owner-fixture"
const ROOT = "music-beta/"
const ownerHash = id => createHash("sha256").update(id).digest("hex")
const ownerPath = id => `${ROOT}owners/${ownerHash(id)}.json`
const sharePath = slug => `${ROOT}shares/${hashCapability(slug)}.json`

// Mirrors SDK streams, prefix pagination and atomic non-overwriting put.
function fakeBlob() {
  const data = new Map()
  const calls = []
  return {
    data,
    calls,
    fail: null,
    async get(path, options) {
      calls.push({ operation: "get", path, options })
      if (this.fail?.("get", path)) throw new Error("private storage contents")
      if (!data.has(path)) return null
      return { statusCode: 200, stream: new Response(data.get(path)).body }
    },
    async put(path, body, options) {
      calls.push({ operation: "put", path, options })
      if (this.fail?.("put", path)) throw new Error("private storage contents")
      if (data.has(path) && !options.allowOverwrite)
        throw new Error("Blob already exists")
      assert.equal(options.access, "private")
      assert.equal(options.addRandomSuffix, false)
      data.set(path, body)
      return { pathname: path, url: "https://private.invalid/do-not-return" }
    },
    async list({ prefix, cursor }) {
      calls.push({ operation: "list", prefix, cursor })
      const paths = [...data.keys()]
        .filter(path => path.startsWith(prefix))
        .sort()
      const start = Number(cursor || 0)
      return {
        blobs: paths.slice(start, start + 2).map(pathname => ({ pathname })),
        hasMore: paths.length > start + 2,
        cursor: paths.length > start + 2 ? String(start + 2) : undefined,
      }
    },
    async del(paths) {
      for (const path of Array.isArray(paths) ? paths : [paths]) {
        calls.push({ operation: "del", path })
        if (this.fail?.("del", path))
          throw new Error("private storage contents")
        data.delete(path)
      }
    },
  }
}

function setup() {
  const blob = fakeBlob()
  const diagnostics = []
  const store = createMusicBetaStore(blob, event => diagnostics.push(event))
  return { blob, store, diagnostics }
}

test("public reads classify corrupt records as invalid and genuine storage failures as unavailable", async () => {
  for (const kind of [
    "pointer",
    "index",
    "owner",
    "snapshot",
    "json",
    "missing",
  ]) {
    const { store, blob, diagnostics } = setup()
    await store.writeOwner(makeOwnerRecord())
    await store.publishSnapshot(OWNER, SLUG, makePublicSnapshot())
    const pointer = JSON.parse(blob.data.get(sharePath(SLUG)))
    const pathname = {
      pointer: sharePath(SLUG),
      index: `${ROOT}publications/${ownerHash(OWNER)}.json`,
      owner: ownerPath(OWNER),
      snapshot: pointer.snapshotPath,
      json: pointer.snapshotPath,
      missing: pointer.snapshotPath,
    }[kind]
    blob.data.set(
      pathname,
      kind === "json"
        ? "PRIVATE_SENTINEL not JSON"
        : JSON.stringify({ private: SLUG }),
    )
    if (kind === "missing") blob.data.delete(pathname)
    await assert.rejects(
      store.readPublicSnapshot(SLUG),
      error => error.category === "invalid",
    )
    assert.equal(JSON.stringify(diagnostics).includes(SLUG), false)
    assert.equal(
      JSON.stringify(diagnostics).includes("PRIVATE_SENTINEL"),
      false,
    )
  }
  const { store, blob } = setup()
  await store.writeOwner(makeOwnerRecord())
  await store.publishSnapshot(OWNER, SLUG, makePublicSnapshot())
  blob.fail = () => true
  await assert.rejects(
    store.readPublicSnapshot(SLUG),
    error => error.category === "unavailable",
  )
})

function deferred() {
  let resolve
  const promise = new Promise(done => (resolve = done))
  return { promise, resolve }
}

test("an existing JSON-null tombstone rejects public reads while absence and outages remain distinct", async () => {
  const { store, blob } = setup()
  const snapshot = makePublicSnapshot()
  const tombstone = `${ROOT}tombstones/${ownerHash(OWNER)}.json`
  await store.writeOwner(makeOwnerRecord())
  await store.publishSnapshot(OWNER, SLUG, snapshot)
  assert.equal(blob.data.has(tombstone), false)
  assert.deepEqual(await store.readPublicSnapshot(SLUG), snapshot)
  blob.data.set(tombstone, "null")
  assert.equal(blob.data.get(tombstone), "null")
  await assert.rejects(
    store.readPublicSnapshot(SLUG),
    error => error.category === "invalid",
  )
  // Ordinary private reads retain their existing JSON-null semantics.
  assert.deepEqual(await store.readOwner(OWNER), makeOwnerRecord())
  blob.data.delete(tombstone)
  assert.deepEqual(await store.readPublicSnapshot(SLUG), snapshot)
  blob.fail = (operation, path) => operation === "get" && path === tombstone
  await assert.rejects(
    store.readPublicSnapshot(SLUG),
    error => error.category === "unavailable",
  )
})

function draftRecord() {
  const snapshot = makePublicSnapshot({ planetCount: 1 })
  return {
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
  }
}

test("private drafts are validated, independent, tombstone-aware and erased by deletion", async () => {
  const { store, blob } = setup()
  await store.writeOwner(makeOwnerRecord())
  const draft = draftRecord()
  await store.writeDraft(OWNER, draft)
  draft.snapshot.owner.displayName = "Changed after write"
  assert.equal(
    (await store.readDraft(OWNER)).snapshot.owner.displayName,
    "Fixture owner",
  )
  await assert.rejects(
    store.writeDraft(OWNER, { ...draftRecord(), token: TOKEN }),
  )
  const corrupt = draftRecord()
  corrupt.catalogue.artists[0].name = "Does not match snapshot"
  await assert.rejects(store.writeDraft(OWNER, corrupt))
  await store.deleteOwnerData(OWNER)
  assert.equal(await store.readDraft(OWNER), null)
  assert.equal(
    [...blob.data.keys()].some(path => path.includes("/drafts/")),
    false,
  )
  await assert.rejects(store.writeDraft(OWNER, draftRecord()))
})

test("draft outer fields reject accessors without invoking them", async () => {
  const { store } = setup()
  let reads = 0
  const draft = draftRecord()
  Object.defineProperty(draft, "schemaVersion", {
    enumerable: true,
    get() {
      reads++
      return 1
    },
  })
  await assert.rejects(store.writeDraft(OWNER, draft))
  assert.equal(reads, 0)
})

test("owner publication index contains hashed metadata only and replacement requires an existing live share", async () => {
  const { store, blob } = setup()
  await store.writeOwner(makeOwnerRecord())
  assert.equal(await store.readPublishedSnapshot(OWNER), null)
  assert.equal(
    await store.replacePublishedSnapshot(OWNER, makePublicSnapshot()),
    null,
  )
  await store.publishSnapshot(OWNER, SLUG, makePublicSnapshot())
  const indexPath = `${ROOT}publications/${ownerHash(OWNER)}.json`
  assert.deepEqual(JSON.parse(blob.data.get(indexPath)), {
    ownerKey: ownerHash(OWNER),
    shareHash: hashCapability(SLUG),
  })
  const next = makePublicSnapshot({ snapshotId: "next" })
  await store.replacePublishedSnapshot(OWNER, next)
  assert.deepEqual(await store.readPublishedSnapshot(OWNER), next)
  assert.deepEqual(await store.readPublicSnapshot(SLUG), next)
  await store.revokeShare(OWNER, SLUG)
  assert.equal(await store.readPublishedSnapshot(OWNER), null)
  assert.equal(await store.replacePublishedSnapshot(OWNER, next), null)
  assert.equal(blob.data.has(indexPath), false)
})

test("indexed replacement preserves last-good on candidate/pointer failure and rejects mismatched ownership", async () => {
  const { store, blob } = setup()
  await store.writeOwner(makeOwnerRecord())
  const previous = makePublicSnapshot()
  await store.publishSnapshot(OWNER, SLUG, previous)
  for (const part of ["snapshots/", "shares/"]) {
    blob.fail = (operation, path) => operation === "put" && path.includes(part)
    await assert.rejects(
      store.replacePublishedSnapshot(
        OWNER,
        makePublicSnapshot({ snapshotId: "failed" }),
      ),
    )
    assert.deepEqual(await store.readPublishedSnapshot(OWNER), previous)
  }
  blob.fail = null
  const indexPath = `${ROOT}publications/${ownerHash(OWNER)}.json`
  blob.data.set(
    indexPath,
    JSON.stringify({
      ownerKey: ownerHash("other-owner"),
      shareHash: hashCapability(SLUG),
    }),
  )
  await assert.rejects(store.readPublishedSnapshot(OWNER))
  await assert.rejects(store.replacePublishedSnapshot(OWNER, previous))
  await assert.rejects(store.readPublicSnapshot(SLUG))
})

test("deletion erases the publication index and blocks indexed publication", async () => {
  const { store, blob } = setup()
  await store.writeOwner(makeOwnerRecord())
  await store.publishSnapshot(OWNER, SLUG, makePublicSnapshot())
  await store.deleteOwnerData(OWNER)
  assert.equal(
    blob.data.has(`${ROOT}publications/${ownerHash(OWNER)}.json`),
    false,
  )
  assert.equal(await store.readPublishedSnapshot(OWNER), null)
  await assert.rejects(
    store.replacePublishedSnapshot(OWNER, makePublicSnapshot()),
  )
})

test("an indexed publication refuses a different owner record stored at its owner path", async () => {
  const { store, blob } = setup()
  await store.writeOwner(makeOwnerRecord())
  await store.publishSnapshot(OWNER, SLUG, makePublicSnapshot())
  blob.data.set(
    ownerPath(OWNER),
    JSON.stringify(makeOwnerRecord({ ownerId: "other-owner" })),
  )
  await assert.rejects(store.readPublishedSnapshot(OWNER))
  await assert.rejects(
    store.replacePublishedSnapshot(OWNER, makePublicSnapshot()),
  )
})

test("publication index failure does not change the public pointer and another live slug cannot be added", async () => {
  const { store, blob } = setup()
  await store.writeOwner(makeOwnerRecord())
  const previous = makePublicSnapshot()
  await store.publishSnapshot(OWNER, SLUG, previous)
  blob.fail = (op, path) => op === "put" && path.includes("/publications/")
  await assert.rejects(
    store.publishSnapshot(
      OWNER,
      SLUG,
      makePublicSnapshot({ snapshotId: "next" }),
    ),
  )
  assert.deepEqual(await store.readPublishedSnapshot(OWNER), previous)
  blob.fail = null
  await assert.rejects(store.publishSnapshot(OWNER, TOKEN, previous))
  assert.equal(await store.readPublicSnapshot(TOKEN), null)
})

test("capabilities use hashed paths and values, and all writes stay private", async () => {
  const { blob, store } = setup()
  await store.createInvite(TOKEN, "2099-01-01T00:00:00.000Z")
  await store.writeOwner(makeOwnerRecord())
  await store.writeEvidence(OWNER, makeEvidence())
  await store.writeOverrides(OWNER, makeOverrides())
  await store.publishSnapshot(OWNER, SLUG, makePublicSnapshot())
  assert.ok(blob.data.has(`${ROOT}invites/${hashCapability(TOKEN)}.json`))
  assert.ok(blob.data.has(ownerPath(OWNER)))
  assert.ok(blob.data.has(sharePath(SLUG)))
  const persisted = JSON.stringify([...blob.data])
  assert.ok(!persisted.includes(TOKEN))
  assert.ok(!persisted.includes(SLUG))
  assert.ok(![...blob.data.keys()].some(path => path.includes(OWNER)))
  for (const call of blob.calls.filter(call => call.operation === "get")) {
    assert.equal(call.options.access, "private")
    assert.equal(call.options.useCache, false)
  }
})

test("invites expire at the boundary and can only be consumed once", async () => {
  const { store } = setup()
  const expiry = "2099-01-01T00:00:00.000Z"
  await store.createInvite(TOKEN, expiry)
  assert.equal(
    (await store.readInvite(TOKEN)).inviteHash,
    hashCapability(TOKEN),
  )
  assert.equal(await store.readInvite(TOKEN, Date.parse(expiry)), null)
  await assert.rejects(store.consumeInvite(TOKEN, OWNER, Date.parse(expiry)))
  const results = await Promise.allSettled([
    store.consumeInvite(TOKEN, OWNER),
    store.consumeInvite(TOKEN, "other-owner"),
  ])
  assert.equal(
    results.filter(result => result.status === "fulfilled").length,
    1,
  )
  assert.equal(await store.readInvite(TOKEN), null)
  await assert.rejects(store.consumeInvite(TOKEN, OWNER))
  await assert.rejects(store.createInvite(TOKEN, expiry))
})

test("private records round-trip through Task 1 validators", async () => {
  const { store } = setup()
  assert.equal(await store.readOwner(OWNER), null)
  assert.equal(await store.readEvidence(OWNER), null)
  assert.deepEqual(await store.readOverrides(OWNER), {})
  await store.writeOwner(makeOwnerRecord())
  await store.writeEvidence(OWNER, makeEvidence())
  await store.writeOverrides(OWNER, makeOverrides())
  assert.deepEqual(await store.readOwner(OWNER), makeOwnerRecord())
  assert.deepEqual(await store.readEvidence(OWNER), makeEvidence())
  assert.deepEqual(await store.readOverrides(OWNER), makeOverrides())
  await assert.rejects(store.writeOwner(makeOwnerRecord({ sessionVersion: 0 })))
  await assert.rejects(store.writeEvidence(OWNER, { secret: "private" }))
  await assert.rejects(store.writeOverrides(OWNER, { bad: { pinned: true } }))
})

test("owner count includes paused owners and pagination, refresh list excludes blocked owners", async () => {
  const { store } = setup()
  for (let index = 0; index < 5; index++)
    await store.writeOwner(
      makeOwnerRecord({
        ownerId: `owner-${index}`,
        boundUserNumber: index + 1,
        paused: index === 1,
        reconnectRequired: index === 2,
      }),
    )
  assert.equal(await store.countActiveOwners(), 5)
  assert.deepEqual(
    (await store.listRefreshableOwners()).map(owner => owner.ownerId).sort(),
    ["owner-0", "owner-3", "owner-4"],
  )
  await store.deleteOwnerData("owner-0")
  assert.equal(await store.countActiveOwners(), 4)
})

test("publication validates, writes immutable candidate before pointer, and returns only snapshot", async () => {
  const { blob, store } = setup()
  await store.writeOwner(makeOwnerRecord())
  const snapshot = makePublicSnapshot()
  assert.deepEqual(await store.publishSnapshot(OWNER, SLUG, snapshot), snapshot)
  const writes = blob.calls.filter(call => call.operation === "put")
  const pointerIndex = writes.findIndex(call => call.path === sharePath(SLUG))
  assert.match(
    writes[pointerIndex - 1].path,
    /\/snapshots\/[a-f0-9]{64}\/[a-f0-9-]+\.json$/,
  )
  assert.equal(writes[pointerIndex - 1].options.allowOverwrite, false)
  assert.equal(writes[pointerIndex].options.allowOverwrite, false)
  assert.deepEqual(await store.readPublicSnapshot(SLUG), snapshot)
  await store.publishSnapshot(OWNER, SLUG, snapshot)
  assert.equal(
    blob.calls
      .filter(call => call.operation === "put" && call.path === sharePath(SLUG))
      .at(-1).options.allowOverwrite,
    true,
  )
  await assert.rejects(
    store.publishSnapshot(OWNER, SLUG, { ...snapshot, token: TOKEN }),
  )
  assert.deepEqual(await store.readPublicSnapshot(SLUG), snapshot)
})

test("candidate and pointer failures retain the last good snapshot", async () => {
  const { blob, store } = setup()
  await store.writeOwner(makeOwnerRecord())
  const original = makePublicSnapshot()
  await store.publishSnapshot(OWNER, SLUG, original)
  const next = makePublicSnapshot({ snapshotId: "next" })
  for (const failingPart of ["snapshots/", "shares/"]) {
    blob.fail = (operation, path) =>
      operation === "put" && path.includes(failingPart)
    await assert.rejects(store.publishSnapshot(OWNER, SLUG, next))
    blob.fail = null
    assert.deepEqual(await store.readPublicSnapshot(SLUG), original)
  }
})

test("a share cannot be taken over or revoked by a different owner", async () => {
  const { store } = setup()
  await store.writeOwner(makeOwnerRecord())
  await store.writeOwner(makeOwnerRecord({ ownerId: "other-owner" }))
  await store.publishSnapshot(OWNER, SLUG, makePublicSnapshot())
  await assert.rejects(
    store.publishSnapshot("other-owner", SLUG, makePublicSnapshot()),
  )
  await assert.rejects(store.revokeShare("other-owner", SLUG))
  assert.ok(await store.readPublicSnapshot(SLUG))
  await store.revokeShare(OWNER, SLUG)
  assert.equal(await store.readPublicSnapshot(SLUG), null)
})

test("overlapping external leases exclude across store instances and release in finally", async () => {
  const { blob, store } = setup()
  const otherStore = createMusicBetaStore(blob)
  const entered = deferred()
  const finish = deferred()
  const first = store.withOwnerLease(OWNER, async () => {
    entered.resolve()
    await finish.promise
    throw new Error("callback failure")
  })
  await entered.promise
  let ran = false
  await assert.rejects(
    otherStore.withOwnerLease(OWNER, () => (ran = true)),
    /busy/,
  )
  await assert.rejects(
    store.withOwnerLease(OWNER, () => (ran = true)),
    /busy/,
  )
  assert.equal(ran, false)
  const leaseWrite = blob.calls.find(call => call.path?.includes("leases/"))
  assert.equal(leaseWrite.options.allowOverwrite, false)
  assert.equal(leaseWrite.options.addRandomSuffix, false)
  finish.resolve()
  await assert.rejects(first, /callback failure/)
  assert.equal(await otherStore.withOwnerLease(OWNER, () => 42), 42)
})

test("internal writes and explicit nested leases reuse their current owner lease", async () => {
  const { blob, store } = setup()
  await store.withOwnerLease(OWNER, async () => {
    await store.writeOwner(makeOwnerRecord())
    await store.writeOverrides(OWNER, makeOverrides())
    await store.writeEvidence(OWNER, makeEvidence())
    await store.withOwnerLease(OWNER, () =>
      store.publishSnapshot(OWNER, SLUG, makePublicSnapshot()),
    )
  })
  assert.equal(
    blob.calls.filter(
      call => call.operation === "put" && call.path.includes("leases/"),
    ).length,
    1,
  )
})

test("deletion waits for refresh, tombstones before pointer removal, and blocks late recreation", async () => {
  const { blob, store } = setup()
  await store.writeOwner(makeOwnerRecord())
  await store.writeEvidence(OWNER, makeEvidence())
  await store.writeOverrides(OWNER, makeOverrides())
  await store.publishSnapshot(OWNER, SLUG, makePublicSnapshot())
  const entered = deferred()
  const finish = deferred()
  const refresh = store.withOwnerLease(OWNER, async () => {
    entered.resolve()
    await finish.promise
    await store.publishSnapshot(
      OWNER,
      SLUG,
      makePublicSnapshot({ snapshotId: "refresh" }),
    )
  })
  await entered.promise
  let deleted = false
  const deletion = store.deleteOwnerData(OWNER).then(() => (deleted = true))
  await new Promise(resolve => setImmediate(resolve))
  assert.equal(deleted, false)
  finish.resolve()
  await refresh
  await deletion
  const tombstonePath = `${ROOT}tombstones/${ownerHash(OWNER)}.json`
  assert.ok(blob.data.has(tombstonePath))
  assert.ok(!blob.data.has(sharePath(SLUG)))
  const tombstoneIndex = blob.calls.findIndex(
    call => call.operation === "put" && call.path === tombstonePath,
  )
  const removalIndex = blob.calls.findIndex(
    call => call.operation === "del" && call.path === sharePath(SLUG),
  )
  assert.ok(tombstoneIndex < removalIndex)
  assert.equal(await store.readPublicSnapshot(SLUG), null)
  assert.equal(await store.readOwner(OWNER), null)
  assert.equal(await store.readEvidence(OWNER), null)
  assert.deepEqual(await store.readOverrides(OWNER), {})
  await assert.rejects(
    store.publishSnapshot(OWNER, SLUG, makePublicSnapshot()),
    /deleted/,
  )
  await assert.rejects(store.writeOwner(makeOwnerRecord()), /deleted/)
  await assert.rejects(store.writeEvidence(OWNER, makeEvidence()), /deleted/)
  await assert.rejects(store.writeOverrides(OWNER, makeOverrides()), /deleted/)
  await store.deleteOwnerData(OWNER)
  assert.deepEqual([...blob.data.keys()], [tombstonePath])
})

test("failed deletion keeps tombstone authoritative and can be retried", async () => {
  const { blob, store } = setup()
  await store.writeOwner(makeOwnerRecord())
  await store.publishSnapshot(OWNER, SLUG, makePublicSnapshot())
  blob.fail = (operation, path) =>
    operation === "del" && path === sharePath(SLUG)
  await assert.rejects(store.deleteOwnerData(OWNER))
  assert.equal(await store.readPublicSnapshot(SLUG), null)
  assert.equal(await store.countActiveOwners(), 0)
  await assert.rejects(
    store.publishSnapshot(OWNER, SLUG, makePublicSnapshot()),
    /deleted/,
  )
  blob.fail = null
  await store.deleteOwnerData(OWNER)
  assert.ok(!blob.data.has(sharePath(SLUG)))
})

test("corrupt stored snapshots and private records are rejected without leaking diagnostics", async () => {
  const { blob, store, diagnostics } = setup()
  await store.writeOwner(makeOwnerRecord())
  await store.publishSnapshot(OWNER, SLUG, makePublicSnapshot())
  const candidate = [...blob.data.keys()].find(path =>
    path.includes("snapshots/"),
  )
  blob.data.set(candidate, JSON.stringify({ secret: TOKEN, slug: SLUG }))
  await assert.rejects(store.readPublicSnapshot(SLUG))
  blob.data.set(ownerPath(OWNER), JSON.stringify({ secret: TOKEN }))
  await assert.rejects(store.readOwner(OWNER))
  blob.fail = operation => operation === "get"
  await assert.rejects(
    store.readEvidence(OWNER),
    error => !error.message.includes("private storage contents"),
  )
  assert.ok(diagnostics.length >= 3)
  for (const event of diagnostics) {
    assert.deepEqual(Object.keys(event).sort(), ["category", "operation"])
    assert.match(event.category, /^[a-z_]+$/)
  }
  const output = JSON.stringify(diagnostics)
  for (const privateValue of [
    TOKEN,
    SLUG,
    OWNER,
    ROOT,
    "secret",
    "Artist",
    "private storage contents",
  ])
    assert.ok(!output.includes(privateValue))
})

test("diagnostic callback failure does not replace the safe store error", async () => {
  const blob = fakeBlob()
  const store = createMusicBetaStore(blob, () => {
    throw new Error(TOKEN)
  })
  blob.fail = () => true
  await assert.rejects(
    store.readOwner(OWNER),
    error => !error.message.includes(TOKEN),
  )
})

test("records are detached before awaiting Blob and deletion retains only an anonymous spent invite guard", async () => {
  const { blob, store } = setup()
  const record = makeOwnerRecord()
  const writing = store.writeOwner(record)
  record.displayName = "Changed after validation"
  await writing
  assert.equal((await store.readOwner(OWNER)).displayName, "Fixture owner")
  await store.createInvite(TOKEN, "2099-01-01T00:00:00.000Z")
  await store.consumeInvite(TOKEN, OWNER)
  await store.deleteOwnerData(OWNER)
  assert.equal(await store.readInvite(TOKEN), null)
  const spentPath = `${ROOT}invites/${hashCapability(TOKEN)}/consumed.json`
  assert.deepEqual(JSON.parse(blob.data.get(spentPath)), { spent: true })
  assert.deepEqual(
    [...blob.data.keys()].filter(path => path.includes("invite")),
    [spentPath],
  )
})

test("a paused second invite claim cannot succeed after the first consumer deletes its data", async () => {
  const { blob, store } = setup()
  await store.createInvite(TOKEN, "2099-01-01T00:00:00.000Z")
  const entered = deferred()
  const resume = deferred()
  const originalPut = blob.put.bind(blob)
  const spentPath = `${ROOT}invites/${hashCapability(TOKEN)}/consumed.json`
  let paused = false
  blob.put = async (path, body, options) => {
    if (path === spentPath && !paused) {
      paused = true
      entered.resolve()
      await resume.promise
    }
    return originalPut(path, body, options)
  }
  const secondConsumer = store.consumeInvite(TOKEN, "owner-b")
  await entered.promise
  try {
    await store.consumeInvite(TOKEN, OWNER)
    await store.deleteOwnerData(OWNER)
  } finally {
    resume.resolve()
  }
  await assert.rejects(secondConsumer)
  assert.deepEqual(JSON.parse(blob.data.get(spentPath)), { spent: true })
  assert.equal(
    blob.calls.filter(
      call => call.operation === "del" && call.path === spentPath,
    ).length,
    0,
  )
  assert.equal(await store.readInvite(TOKEN), null)
  assert.equal(
    [...blob.data.keys()].filter(path => path.includes("invite-bindings/"))
      .length,
    0,
  )
})

test("reissuing a consumed capability after deletion cannot restore its use", async () => {
  const { blob, store } = setup()
  await store.createInvite(TOKEN, "2099-01-01T00:00:00.000Z")
  await store.consumeInvite(TOKEN, OWNER)
  await store.deleteOwnerData(OWNER)
  await assert.rejects(store.createInvite(TOKEN, "2099-01-01T00:00:00.000Z"))
  assert.equal(await store.readInvite(TOKEN), null)
  await assert.rejects(store.consumeInvite(TOKEN, "owner-b"))
  const spentPath = `${ROOT}invites/${hashCapability(TOKEN)}/consumed.json`
  assert.deepEqual(JSON.parse(blob.data.get(spentPath)), { spent: true })
})

for (const kind of ["pointer", "evidence"]) {
  test(`nested deletion rejects while an inherited ${kind} write is paused`, async () => {
    const { blob, store } = setup()
    await store.writeOwner(makeOwnerRecord())
    const entered = deferred()
    const resume = deferred()
    const pathname =
      kind === "pointer"
        ? sharePath(SLUG)
        : `${ROOT}evidence/${ownerHash(OWNER)}.json`
    const originalPut = blob.put.bind(blob)
    blob.put = async (path, body, options) => {
      if (path === pathname) {
        entered.resolve()
        await resume.promise
      }
      return originalPut(path, body, options)
    }
    await store.withOwnerLease(OWNER, async () => {
      const writing =
        kind === "pointer"
          ? store.publishSnapshot(OWNER, SLUG, makePublicSnapshot())
          : store.writeEvidence(OWNER, makeEvidence())
      await entered.promise
      try {
        await assert.rejects(store.deleteOwnerData(OWNER), /nested_deletion/)
        assert.ok(!blob.data.has(`${ROOT}tombstones/${ownerHash(OWNER)}.json`))
      } finally {
        resume.resolve()
        await writing
      }
    })
    await store.deleteOwnerData(OWNER)
    assert.ok(!blob.data.has(pathname))
    assert.equal(await store.readPublicSnapshot(SLUG), null)
    assert.equal(await store.readEvidence(OWNER), null)
  })
}

test("inherited publication and revocation run serially", async () => {
  const { blob, store } = setup()
  await store.writeOwner(makeOwnerRecord())
  const entered = deferred()
  const resume = deferred()
  const originalPut = blob.put.bind(blob)
  blob.put = async (path, body, options) => {
    if (path === sharePath(SLUG)) {
      entered.resolve()
      await resume.promise
    }
    return originalPut(path, body, options)
  }
  await store.withOwnerLease(OWNER, async () => {
    const publishing = store.publishSnapshot(OWNER, SLUG, makePublicSnapshot())
    await entered.promise
    let revoked = false
    const revoking = store.revokeShare(OWNER, SLUG).then(() => {
      revoked = true
    })
    try {
      await new Promise(resolve => setImmediate(resolve))
      assert.equal(revoked, false)
    } finally {
      resume.resolve()
      await Promise.all([publishing, revoking])
    }
  })
  assert.equal(await store.readPublicSnapshot(SLUG), null)
})

for (const kind of ["owners", "evidence", "overrides"]) {
  test(`inherited ${kind} writes retain invocation order`, async () => {
    const { blob, store } = setup()
    const entered = deferred()
    const resume = deferred()
    const originalPut = blob.put.bind(blob)
    const pathname = `${ROOT}${kind}/${ownerHash(OWNER)}.json`
    let paused = false
    blob.put = async (path, body, options) => {
      if (path === pathname && !paused) {
        paused = true
        entered.resolve()
        await resume.promise
      }
      return originalPut(path, body, options)
    }
    const first =
      kind === "owners"
        ? makeOwnerRecord()
        : kind === "evidence"
          ? makeEvidence()
          : makeOverrides()
    const second = structuredClone(first)
    if (kind === "owners") second.displayName = "Second owner name"
    if (kind === "evidence") second.artists[0].name = "Second artist name"
    if (kind === "overrides") Object.values(second)[0].note = "Second note"
    const write = value =>
      kind === "owners"
        ? store.writeOwner(value)
        : kind === "evidence"
          ? store.writeEvidence(OWNER, value)
          : store.writeOverrides(OWNER, value)
    await store.withOwnerLease(OWNER, async () => {
      const writingFirst = write(first)
      await entered.promise
      let secondFinished = false
      const writingSecond = write(second).then(() => {
        secondFinished = true
      })
      try {
        await new Promise(resolve => setImmediate(resolve))
        assert.equal(secondFinished, false)
      } finally {
        resume.resolve()
        await Promise.all([writingFirst, writingSecond])
      }
    })
    assert.deepEqual(JSON.parse(blob.data.get(pathname)), second)
  })
}

test("lease release failure is safe and an orphaned lease stays fail-closed", async () => {
  const { blob, store } = setup()
  blob.fail = (operation, path) =>
    operation === "del" && path.includes("leases/")
  await assert.rejects(
    store.withOwnerLease(OWNER, () => 1),
    error => !error.message.includes("private storage contents"),
  )
  await assert.rejects(
    store.withOwnerLease(OWNER, () => 2),
    /busy/,
  )
})

test("deletion retries if the contending lease disappears before its read", async () => {
  const { blob, store } = setup()
  await store.writeOwner(makeOwnerRecord())
  const originalPut = blob.put.bind(blob)
  let collided = false
  blob.put = async (path, body, options) => {
    if (path.includes("leases/") && !collided) {
      collided = true
      throw new Error("Blob already exists but its holder just released it")
    }
    return originalPut(path, body, options)
  }
  await store.deleteOwnerData(OWNER)
  assert.equal(await store.readOwner(OWNER), null)
})

test("owner validation rejects accessor identity without invoking it", async () => {
  const { store } = setup()
  const record = makeOwnerRecord()
  let reads = 0
  Object.defineProperty(record, "ownerId", {
    enumerable: true,
    get() {
      reads++
      return OWNER
    },
  })
  await assert.rejects(store.writeOwner(record))
  assert.equal(reads, 0)
})

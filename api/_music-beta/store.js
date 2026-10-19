const { createHash, randomUUID } = require("node:crypto")
const { AsyncLocalStorage } = require("node:async_hooks")
const {
  isDeepStrictEqual,
  types: { isProxy },
} = require("node:util")
const { setTimeout: delay } = require("node:timers/promises")
const {
  validateOwnerRecord,
  validateEvidence,
  validateOverrides,
  toPublicSnapshot,
} = require("./contracts")
const { hashCapability } = require("./security")

const ROOT = "music-beta/"
const HASH = /^[a-f0-9]{64}$/

class StoreError extends Error {
  constructor(category) {
    super(`Music beta store ${category}`)
    this.category = category
  }
}

function ownerKey(ownerId) {
  if (
    typeof ownerId !== "string" ||
    !ownerId.trim() ||
    ownerId.length > 200 ||
    !ownerId.isWellFormed()
  )
    throw new StoreError("invalid")
  return createHash("sha256").update(ownerId).digest("hex")
}

function assertDraftData(value, depth = 0) {
  if (value === null || typeof value !== "object") {
    if (
      !["string", "number", "boolean"].includes(typeof value) &&
      value !== null
    )
      throw new StoreError("invalid")
    return
  }
  if (depth > 10 || isProxy(value)) throw new StoreError("invalid")
  const isArray = Array.isArray(value)
  if (
    Object.getPrototypeOf(value) !==
    (isArray ? Array.prototype : Object.prototype)
  )
    throw new StoreError("invalid")
  const descriptors = Object.getOwnPropertyDescriptors(value)
  const keys = Reflect.ownKeys(descriptors)
  if (isArray && keys.length !== value.length + 1)
    throw new StoreError("invalid")
  for (const key of keys) {
    if (isArray && key === "length") continue
    const field = descriptors[key]
    if (
      typeof key !== "string" ||
      !field.enumerable ||
      !("value" in field) ||
      (isArray &&
        (!/^(0|[1-9][0-9]*)$/.test(key) || Number(key) >= value.length))
    )
      throw new StoreError("invalid")
    assertDraftData(field.value, depth + 1)
  }
}

function validateDraft(value) {
  assertDraftData(value)
  if (
    !value ||
    Object.keys(value).sort().join() !==
      "catalogue,evidence,schemaVersion,snapshot" ||
    value.schemaVersion !== 1
  )
    throw new StoreError("invalid")
  validateEvidence(value.evidence)
  const snapshot = toPublicSnapshot(value.snapshot)
  if (value.evidence.fetchedAt !== snapshot.generatedAt)
    throw new StoreError("invalid")
  const entity = source => ({
    id: source.id,
    name: source.name,
    spotifyUrl: source.spotifyUrl,
    ...(source.imageUrl === undefined ? {} : { imageUrl: source.imageUrl }),
  })
  const byId = (a, b) => (a.id < b.id ? -1 : a.id > b.id ? 1 : 0)
  const tracks = new Map()
  for (const planet of snapshot.planets)
    for (const moon of planet.moons) {
      const track = { ...entity(moon), artistIds: [...moon.artistIds] }
      if (tracks.has(moon.id) && !isDeepStrictEqual(tracks.get(moon.id), track))
        throw new StoreError("invalid")
      tracks.set(moon.id, track)
    }
  if (
    !isDeepStrictEqual(value.catalogue, {
      artists: snapshot.planets.map(entity).sort(byId),
      tracks: [...tracks.values()].sort(byId),
    })
  )
    throw new StoreError("invalid")
  return value
}

function createMusicBetaStore(blobClient, diagnostic = () => {}) {
  const leases = new AsyncLocalStorage()
  const path = (kind, key) => `${ROOT}${kind}/${key}.json`

  async function storage(request) {
    try {
      return await request()
    } catch {
      throw new StoreError("unavailable")
    }
  }

  async function get(pathname, publicRead = false) {
    const text = await storage(async () => {
      const result = await blobClient.get(pathname, {
        access: "private",
        useCache: false,
      })
      if (result === null) return null
      if (result.statusCode !== 200 || !result.stream)
        throw new StoreError("unavailable")
      return new Response(result.stream).text()
    })
    if (text === null) return null
    try {
      const value = JSON.parse(text)
      if (publicRead && value === null) throw new StoreError("invalid")
      return value
    } catch {
      throw new StoreError(publicRead ? "invalid" : "unavailable")
    }
  }

  async function put(pathname, value, overwrite = true) {
    await storage(() =>
      blobClient.put(pathname, JSON.stringify(value), {
        access: "private",
        addRandomSuffix: false,
        allowOverwrite: overwrite,
        contentType: "application/json",
        cacheControlMaxAge: 60,
      }),
    )
  }

  async function remove(pathname) {
    await storage(() => blobClient.del(pathname))
  }

  async function list(prefix) {
    const paths = []
    let cursor
    do {
      const page = await storage(() => blobClient.list({ prefix, cursor }))
      for (const blob of page.blobs) {
        if (!blob.pathname.startsWith(prefix)) throw new StoreError("invalid")
        paths.push(blob.pathname)
      }
      if (page.hasMore && (!page.cursor || page.cursor === cursor))
        throw new StoreError("unavailable")
      cursor = page.hasMore ? page.cursor : undefined
    } while (cursor)
    return paths
  }

  async function assertLive(key) {
    if ((await get(path("tombstones", key))) !== null)
      throw new StoreError("deleted")
  }

  async function withLease(key, callback, wait = false) {
    const inherited = leases.getStore()
    if (inherited?.get(key)?.active) {
      if (wait) throw new StoreError("nested_deletion")
      if (!inherited.get(key).accepting) throw new StoreError("busy")
      return callback()
    }
    const pathname = path("leases", key)
    // shortcut: abandoned leases need manual recovery; add fenced recovery before unattended production use.
    const deadline = Date.now() + 30000
    let retriedMissing = false
    for (;;) {
      try {
        // The injected client must honour atomic create-if-absent at this path.
        await put(pathname, { leaseId: randomUUID() }, false)
        break
      } catch {
        if ((await get(pathname)) === null) {
          // A holder may release between the rejected create and this read.
          if (wait && !retriedMissing) {
            retriedMissing = true
            continue
          }
          throw new StoreError("unavailable")
        }
        retriedMissing = false
        if (!wait || Date.now() >= deadline) throw new StoreError("busy")
        await delay(25)
      }
    }
    const held = { active: true, accepting: true, tail: Promise.resolve() }
    const context = new Map(inherited)
    context.set(key, held)
    try {
      return await leases.run(context, callback)
    } finally {
      held.accepting = false
      await held.tail
      held.active = false
      await remove(pathname)
    }
  }

  function withMutation(key, callback) {
    return withLease(key, () => {
      const held = leases.getStore().get(key)
      const result = held.tail.then(callback)
      held.tail = result.catch(() => {})
      return result
    })
  }

  function validateRead(value, validate, publicRead) {
    try {
      return validate(value)
    } catch (error) {
      if (publicRead) throw new StoreError("invalid")
      throw error
    }
  }

  async function readRecord(
    kind,
    key,
    validate,
    fallback = null,
    publicRead = false,
  ) {
    if ((await get(path("tombstones", key), publicRead)) !== null)
      return fallback
    const value = await get(path(kind, key), publicRead)
    return value === null ? fallback : validateRead(value, validate, publicRead)
  }

  async function writeRecord(kind, id, value, validate) {
    validate(value)
    value = structuredClone(value)
    const key = ownerKey(id)
    return withMutation(key, async () => {
      await assertLive(key)
      await put(path(kind, key), value)
    })
  }

  function inviteRecord(value, hash) {
    if (
      !value ||
      value.inviteHash !== hash ||
      typeof value.expiresAt !== "string" ||
      !Number.isFinite(Date.parse(value.expiresAt)) ||
      new Date(value.expiresAt).toISOString() !== value.expiresAt ||
      Object.keys(value).sort().join() !== "expiresAt,inviteHash"
    )
      throw new StoreError("invalid")
    return value
  }

  async function readInvite(token, now = Date.now()) {
    if (!Number.isSafeInteger(now) || now < 0) throw new StoreError("invalid")
    const hash = hashCapability(token)
    const value = await get(path("invites", hash))
    if (value === null) return null
    inviteRecord(value, hash)
    if (Date.parse(value.expiresAt) <= now) return null
    if ((await get(`${ROOT}invites/${hash}/consumed.json`)) !== null)
      return null
    return value
  }

  function sharePointer(pointer) {
    if (
      !pointer ||
      !HASH.test(pointer.ownerKey) ||
      typeof pointer.snapshotPath !== "string" ||
      !new RegExp(
        `^${ROOT}snapshots/${pointer.ownerKey}/[a-f0-9-]{36}\\.json$`,
      ).test(pointer.snapshotPath) ||
      Object.keys(pointer).sort().join() !== "ownerKey,snapshotPath"
    )
      throw new StoreError("invalid")
    return pointer
  }

  async function publication(key, includeInert = false, publicRead = false) {
    if ((await get(path("tombstones", key), publicRead)) !== null) return null
    const owner = await readRecord(
      "owners",
      key,
      validateOwnerRecord,
      null,
      publicRead,
    )
    if (owner === null) return null
    if (ownerKey(owner.ownerId) !== key) throw new StoreError("invalid")
    const index = await get(path("publications", key), publicRead)
    if (index === null) return null
    if (
      !["ownerKey,shareHash", "ownerKey,shareHash,shareVersion"].includes(
        Object.keys(index).sort().join(),
      ) ||
      index.ownerKey !== key ||
      !HASH.test(index.shareHash) ||
      (Object.hasOwn(index, "shareVersion") &&
        (!Number.isSafeInteger(index.shareVersion) || index.shareVersion < 1))
    )
      throw new StoreError("invalid")
    const pointerPath = path("shares", index.shareHash)
    const pointer = await get(pointerPath, publicRead)
    // An interrupted first publication or revocation can leave an inert index.
    if (pointer === null)
      return includeInert ? { ...index, pointerPath, snapshot: null } : null
    if (sharePointer(pointer).ownerKey !== key) throw new StoreError("invalid")
    const snapshot = await get(pointer.snapshotPath, publicRead)
    if (snapshot === null)
      throw new StoreError(publicRead ? "invalid" : "unavailable")
    const candidate = validateRead(snapshot, toPublicSnapshot, publicRead)
    if ((await get(path("tombstones", key), publicRead)) !== null) return null
    return { ...index, pointerPath, snapshot: candidate }
  }

  async function replacePointer(key, pointerPath, candidate, overwrite) {
    const snapshotPath = `${ROOT}snapshots/${key}/${randomUUID()}.json`
    await put(snapshotPath, candidate, false)
    await assertLive(key)
    await put(pointerPath, { ownerKey: key, snapshotPath }, overwrite)
    return candidate
  }

  async function owners() {
    const records = []
    for (const pathname of await list(`${ROOT}owners/`)) {
      const key = pathname.slice(`${ROOT}owners/`.length, -5)
      if (!HASH.test(key) || pathname !== path("owners", key))
        throw new StoreError("invalid")
      const owner = await readRecord("owners", key, validateOwnerRecord)
      if (owner !== null) {
        if (ownerKey(owner.ownerId) !== key) throw new StoreError("invalid")
        records.push(owner)
      }
    }
    return records
  }

  const operations = {
    async createInvite(token, expiresAt) {
      const hash = hashCapability(token)
      const invite = inviteRecord({ inviteHash: hash, expiresAt }, hash)
      if (Date.parse(expiresAt) <= Date.now()) throw new StoreError("invalid")
      if ((await get(`${ROOT}invites/${hash}/consumed.json`)) !== null)
        throw new StoreError("invite_unavailable")
      await put(path("invites", hash), invite, false)
      return invite
    },
    readInvite,
    async consumeInvite(token, ownerId, now = Date.now()) {
      const key = ownerKey(ownerId)
      return withMutation(key, async () => {
        await assertLive(key)
        const invite = await readInvite(token, now)
        if (invite === null) throw new StoreError("invite_unavailable")
        const binding = `${ROOT}invite-bindings/${key}/${invite.inviteHash}.json`
        await put(binding, { inviteHash: invite.inviteHash })
        try {
          // This anonymous guard must never be removed, including on deletion.
          await put(
            `${ROOT}invites/${invite.inviteHash}/consumed.json`,
            { spent: true },
            false,
          )
        } catch (error) {
          await remove(binding)
          throw error
        }
        return invite
      })
    },
    async countActiveOwners() {
      return (await owners()).length
    },
    readOwner(id) {
      const key = ownerKey(id)
      return readRecord("owners", key, value => {
        validateOwnerRecord(value)
        if (ownerKey(value.ownerId) !== key) throw new StoreError("invalid")
        return value
      })
    },
    writeOwner(record) {
      validateOwnerRecord(record)
      return writeRecord("owners", record.ownerId, record, validateOwnerRecord)
    },
    readOverrides(id) {
      return readRecord("overrides", ownerKey(id), validateOverrides, {})
    },
    writeOverrides(id, record) {
      return writeRecord("overrides", id, record, validateOverrides)
    },
    readEvidence(id) {
      return readRecord("evidence", ownerKey(id), validateEvidence)
    },
    writeEvidence(id, record) {
      return writeRecord("evidence", id, record, validateEvidence)
    },
    readDraft(id) {
      return readRecord("drafts", ownerKey(id), validateDraft)
    },
    writeDraft(id, record) {
      return writeRecord("drafts", id, record, validateDraft)
    },
    async readPublishedSnapshot(id) {
      return (await publication(ownerKey(id)))?.snapshot || null
    },
    async readPublicationHash(id) {
      const current = await publication(ownerKey(id))
      return current
        ? current.pointerPath.slice(`${ROOT}shares/`.length, -5)
        : null
    },
    async readPublicationMetadata(id) {
      const current = await publication(ownerKey(id), true)
      return current
        ? {
            shareHash: current.shareHash,
            ...(current.shareVersion === undefined
              ? {}
              : { shareVersion: current.shareVersion }),
          }
        : null
    },
    async replacePublishedSnapshot(id, snapshot) {
      const candidate = toPublicSnapshot(snapshot)
      const key = ownerKey(id)
      return withMutation(key, async () => {
        await assertLive(key)
        const previous = await publication(key)
        if (previous === null) return null
        return replacePointer(key, previous.pointerPath, candidate, true)
      })
    },
    async publishSnapshot(id, slug, snapshot, shareVersion) {
      if (
        shareVersion !== undefined &&
        (!Number.isSafeInteger(shareVersion) || shareVersion < 1)
      )
        throw new StoreError("invalid")
      const candidate = toPublicSnapshot(snapshot)
      const key = ownerKey(id)
      const pointerPath = path("shares", hashCapability(slug))
      return withMutation(key, async () => {
        await assertLive(key)
        if ((await readRecord("owners", key, validateOwnerRecord)) === null)
          throw new StoreError("owner_unavailable")
        const previous = await get(pointerPath)
        if (previous !== null && sharePointer(previous).ownerKey !== key)
          throw new StoreError("share_unavailable")
        const existing = await publication(key)
        if (existing !== null && existing.pointerPath !== pointerPath)
          throw new StoreError("share_unavailable")
        const index = {
          ownerKey: key,
          shareHash: hashCapability(slug),
          ...(shareVersion === undefined ? {} : { shareVersion }),
        }
        if (existing) {
          if (existing.shareVersion !== shareVersion)
            throw new StoreError("invalid")
          await put(path("publications", key), index)
          return replacePointer(key, pointerPath, candidate, true)
        }
        const result = await replacePointer(
          key,
          pointerPath,
          candidate,
          previous !== null,
        )
        await assertLive(key)
        await put(path("publications", key), index)
        return result
      })
    },
    async rotatePublishedSnapshot(id, slug, snapshot, shareVersion) {
      if (
        shareVersion !== undefined &&
        (!Number.isSafeInteger(shareVersion) || shareVersion < 1)
      )
        throw new StoreError("invalid")
      const candidate = toPublicSnapshot(snapshot)
      const key = ownerKey(id)
      const shareHash = hashCapability(slug)
      const pointerPath = path("shares", shareHash)
      return withMutation(key, async () => {
        await assertLive(key)
        if ((await readRecord("owners", key, validateOwnerRecord)) === null)
          throw new StoreError("owner_unavailable")
        const previous = await publication(key)
        const prepared = await get(pointerPath)
        if (
          previous?.pointerPath === pointerPath ||
          (prepared !== null && sharePointer(prepared).ownerKey !== key)
        )
          throw new StoreError("share_unavailable")
        // A failed index commit can leave this version's prepared pointer behind.
        await replacePointer(key, pointerPath, candidate, prepared !== null)
        await assertLive(key)
        // The index is the sole public commit point; orphan pointers are inert.
        await put(path("publications", key), {
          ownerKey: key,
          shareHash,
          ...(shareVersion === undefined ? {} : { shareVersion }),
        })
        if (previous) {
          try {
            await remove(previous.pointerPath)
          } catch {
            // Public reads already reject the old hash after the committed switch.
          }
        }
        return candidate
      })
    },
    async readPublicSnapshot(slug) {
      const pointerPath = path("shares", hashCapability(slug))
      const pointer = await get(pointerPath, true)
      if (pointer === null) return null
      sharePointer(pointer)
      const current = await publication(pointer.ownerKey, false, true)
      return current?.pointerPath === pointerPath ? current.snapshot : null
    },
    async revokeShare(id, slug) {
      const key = ownerKey(id)
      const pathname = path("shares", hashCapability(slug))
      return withMutation(key, async () => {
        const pointer = await get(pathname)
        if (pointer === null) return
        if (sharePointer(pointer).ownerKey !== key)
          throw new StoreError("share_unavailable")
        await remove(pathname)
        const index = await get(path("publications", key))
        if (index?.ownerKey === key && index.shareHash === hashCapability(slug))
          await remove(path("publications", key))
      })
    },
    async listRefreshableOwners() {
      return (await owners()).filter(
        owner => !owner.paused && !owner.reconnectRequired,
      )
    },
    async deleteOwnerData(id, beforeDelete) {
      if (
        beforeDelete !== undefined &&
        (typeof beforeDelete !== "function" || isProxy(beforeDelete))
      )
        throw new StoreError("invalid")
      const key = ownerKey(id)
      return withLease(
        key,
        async () => {
          const tombstone = path("tombstones", key)
          const deleted = (await get(tombstone)) !== null
          // No records leave the store; callers must explicitly authorise under the lease.
          if (beforeDelete && (await beforeDelete()) !== true)
            throw new StoreError("unauthorised")
          if (!deleted)
            await put(tombstone, { deletedAt: new Date().toISOString() }, false)
          for (const pathname of await list(`${ROOT}shares/`)) {
            const pointer = await get(pathname)
            if (pointer !== null && sharePointer(pointer).ownerKey === key)
              await remove(pathname)
          }
          const bindingPrefix = `${ROOT}invite-bindings/${key}/`
          for (const pathname of await list(bindingPrefix)) {
            const hash = pathname.slice(bindingPrefix.length, -5)
            if (!HASH.test(hash) || pathname !== `${bindingPrefix}${hash}.json`)
              throw new StoreError("invalid")
            await remove(path("invites", hash))
            await remove(pathname)
          }
          for (const pathname of await list(`${ROOT}snapshots/${key}/`))
            await remove(pathname)
          for (const kind of [
            "owners",
            "evidence",
            "overrides",
            "drafts",
            "publications",
          ])
            await remove(path(kind, key))
        },
        true,
      )
    },
    withOwnerLease(id, callback) {
      if (typeof callback !== "function") throw new StoreError("invalid")
      return withLease(ownerKey(id), callback)
    },
  }

  return Object.fromEntries(
    Object.entries(operations).map(([operation, perform]) => [
      operation,
      async (...args) => {
        try {
          return await perform(...args)
        } catch (error) {
          const category =
            error instanceof StoreError ? error.category : "unavailable"
          try {
            diagnostic({ operation, category })
          } catch {
            // Diagnostics must never replace the safe failure response.
          }
          if (operation === "withOwnerLease" && !(error instanceof StoreError))
            throw error
          throw new StoreError(category)
        }
      },
    ]),
  )
}

module.exports = { createMusicBetaStore, validateDraft }

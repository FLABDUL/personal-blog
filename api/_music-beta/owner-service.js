const { isProxy } = require("node:util").types
const {
  validateOwnerRecord,
  validateOverrides,
  toPublicSnapshot,
} = require("./contracts")
const { validateDraft } = require("./store")
const { mergeOverrides } = require("./generator")
const { refreshOwnerPortrait, snapshotFrom } = require("./refresh-service")
const { deriveShareCapability, createCsrfToken } = require("./security")
const {
  requireOwnerSession,
  requireCsrf,
  SESSION_COOKIE,
  cookie,
  runtimeDependencies,
} = require("./http")

const ERROR = "Unable to complete music portrait request"
const errors = new WeakMap()
const METHODS = {
  owner: ["GET", "PATCH"],
  publish: ["POST"],
  refresh: ["POST"],
  link: ["POST"],
  delete: ["DELETE"],
}
const MESSAGES = {
  idle: "Your portrait is ready.",
  drafted: "Your private portrait has been updated.",
  updated: "Your shared portrait has been updated.",
  refreshing: "Your portrait is updating.",
  failed: "The update could not finish. Your last portrait is still available.",
  reconnect_required:
    "Reconnect Spotify to resume updates. Your last portrait is still available.",
  retry_pending:
    "Spotify is temporarily busy. Your last portrait is still available.",
  busy: "Another portrait update is in progress.",
  skipped: "No update was needed.",
}

function fail(code, category) {
  const error = new Error(ERROR)
  errors.set(error, { code, category })
  throw error
}

// Reject executable/non-JSON values without reading accessors or triggering proxy traps.
function bodyData(value, depth = 0, budget = { fields: 0, bytes: 0 }) {
  if (++budget.fields > 2000 || depth > 4) fail(400, "invalid_request")
  if (typeof value === "string") {
    budget.bytes += Buffer.byteLength(value)
    if (!value.isWellFormed() || budget.bytes > 65536)
      fail(400, "invalid_request")
    return
  }
  if (typeof value === "boolean") return
  if (
    !value ||
    typeof value !== "object" ||
    isProxy(value) ||
    ![Object.prototype, null].includes(Object.getPrototypeOf(value))
  )
    fail(400, "invalid_request")
  const descriptors = Object.getOwnPropertyDescriptors(value)
  for (const key of Reflect.ownKeys(descriptors)) {
    const field = descriptors[key]
    if (typeof key !== "string" || !field.enumerable || !("value" in field))
      fail(400, "invalid_request")
    budget.bytes += Buffer.byteLength(key)
    if (budget.bytes > 65536) fail(400, "invalid_request")
    bodyData(field.value, depth + 1, budget)
  }
}

function requestBody(operation, body) {
  if (!body || typeof body !== "object" || isProxy(body))
    fail(400, "invalid_request")
  bodyData(body)
  if (Buffer.byteLength(JSON.stringify(body)) > 65536)
    fail(400, "invalid_request")
  const fields = Object.keys(body)
  if (operation !== "owner") {
    if (fields.length) fail(400, "invalid_request")
  } else if (
    fields.length !== 1 ||
    !["overrides", "paused"].includes(fields[0])
  ) {
    fail(400, "invalid_request")
  } else if (fields[0] === "paused") {
    if (typeof body.paused !== "boolean") fail(400, "invalid_request")
  } else {
    try {
      validateOverrides(body.overrides)
    } catch {
      fail(400, "invalid_request")
    }
    if (Object.keys(body.overrides).length > 200) fail(400, "invalid_request")
  }
  return structuredClone(body)
}

function safeFailure(error) {
  if (!error || typeof error !== "object" || isProxy(error))
    return { code: 503, category: "unavailable" }
  if (errors.has(error)) return errors.get(error)
  const status = Object.getOwnPropertyDescriptor(error, "statusCode")?.value
  if ([401, 403].includes(status))
    return { code: status, category: "unauthorised" }
  const category = Object.getOwnPropertyDescriptor(error, "category")?.value
  return category === "busy"
    ? { code: 409, category: "busy" }
    : { code: 503, category: "unavailable" }
}

function createOwnerService(deps) {
  const { store, sessionKey, siteOrigin, now = Date.now } = deps
  function site() {
    try {
      const url = new URL(siteOrigin)
      if (
        url.protocol === "https:" &&
        url.origin === siteOrigin &&
        !url.username &&
        !url.password
      )
        return siteOrigin
    } catch {
      /* Return only the fixed service failure. */
    }
    fail(503, "unavailable")
  }

  async function savedOverrides(ownerId) {
    const value = await store.readOverrides(ownerId)
    try {
      // The same bounded allowlist applies to saved editing state and submitted choices.
      return requestBody("owner", { overrides: value }).overrides
    } catch {
      fail(503, "unavailable")
    }
  }

  async function projection(session, status) {
    const record = await store.readOwner(session.ownerId)
    if (!record || record.sessionVersion !== session.sessionVersion)
      fail(401, "unauthorised")
    validateOwnerRecord(record)
    const privateDraft = await store.readDraft(session.ownerId)
    const overrides = await savedOverrides(session.ownerId)
    const draft = privateDraft
      ? toPublicSnapshot(validateDraft(privateDraft).snapshot)
      : null
    const published = await store.readPublishedSnapshot(session.ownerId)
    const metadata = await store.readPublicationMetadata(session.ownerId)
    let publicUrl = null
    if (published) {
      const capability = deriveShareCapability(
        session.ownerId,
        metadata?.shareVersion,
        sessionKey,
      )
      if (capability.hash !== metadata.shareHash) fail(503, "unavailable")
      publicUrl = `${site()}/music/galaxy/${capability.token}/`
    }
    const committed = [draft, published]
      .filter(Boolean)
      .sort((a, b) =>
        b.lastSuccessfulUpdateAt.localeCompare(a.lastSuccessfulUpdateAt),
      )[0]
    const identity = draft?.owner || {
      displayName: record.displayName,
      initials: record.displayName
        .trim()
        .split(/\s+/)
        .slice(0, 2)
        .map(word => Array.from(word)[0])
        .join("")
        .toUpperCase(),
      ...(record.imageUrl ? { imageUrl: record.imageUrl } : {}),
    }
    status = record.reconnectRequired
      ? "reconnect_required"
      : status || record.refreshStatus
    if (!Object.hasOwn(MESSAGES, status)) fail(503, "unavailable")
    return {
      owner: {
        ...identity,
        paused: record.paused,
        reconnectRequired: record.reconnectRequired,
        published: !!published,
        lastSuccessfulUpdateAt: committed?.lastSuccessfulUpdateAt || null,
        lastManualRefreshAt: record.lastManualRefreshAt,
        overrides,
      },
      draft,
      // Only the authenticated owner receives the rederived capability URL.
      publicUrl,
      csrfToken: createCsrfToken(session.sessionToken, sessionKey),
      refreshStatus: { status, message: MESSAGES[status] },
    }
  }

  async function perform(operation, request) {
    if (!METHODS[operation].includes(request.method))
      fail(405, "method_not_allowed")
    let body
    if (request.method !== "GET") {
      if (
        typeof request.headers?.["content-type"] !== "string" ||
        !/^application\/json(?:\s*;\s*charset=utf-8)?$/i.test(
          request.headers["content-type"],
        )
      )
        fail(415, "unsupported_media_type")
      site()
    }
    let session = await requireOwnerSession(request, deps)
    if (request.method === "GET") return projection(session)
    requireCsrf(request, session, deps)
    body = requestBody(operation, request.body)
    if (operation === "delete") {
      // deleteOwnerData acquires/waits for the shared owner lease itself.
      let rejected
      try {
        await store.deleteOwnerData(session.ownerId, async () => {
          try {
            await requireOwnerSession(request, deps)
            requireCsrf(request, session, deps)
            return true
          } catch (error) {
            rejected = safeFailure(error)
            return false
          }
        })
      } catch (error) {
        if (rejected) fail(rejected.code, rejected.category)
        throw error
      }
      return { deleted: true }
    }
    return store.withOwnerLease(session.ownerId, async () => {
      session = await requireOwnerSession(request, deps)
      requireCsrf(request, session, deps)
      const owner = await store.readOwner(session.ownerId)
      if (operation === "owner") {
        if (Object.hasOwn(body, "paused")) {
          await store.writeOwner({
            ...owner,
            paused: body.paused,
            updatedAt: new Date(now()).toISOString(),
          })
        } else {
          const draft = await store.readDraft(session.ownerId)
          if (!draft) fail(409, "draft_required")
          validateDraft(draft)
          const previous = await savedOverrides(session.ownerId)
          const known = new Set(
            [...draft.evidence.artists, ...draft.catalogue.artists].map(
              artist => artist.id,
            ),
          )
          if (
            Object.entries(body.overrides).some(
              ([id, choice]) =>
                !known.has(id) &&
                (!Object.hasOwn(previous, id) ||
                  (choice.pinned && !previous[id].pinned)),
            )
          )
            fail(400, "invalid_request")
          let generated
          try {
            generated = mergeOverrides(draft, body.overrides)
          } catch {
            fail(400, "invalid_request")
          }
          const snapshot = snapshotFrom(
            owner,
            generated,
            draft.snapshot,
            draft.evidence.fetchedAt,
          )
          const next = validateDraft({
            schemaVersion: 1,
            evidence: generated.evidence,
            catalogue: generated.catalogue,
            snapshot,
          })
          await store.writeOverrides(session.ownerId, body.overrides)
          try {
            await store.writeDraft(session.ownerId, next)
          } catch (error) {
            await store.writeOverrides(session.ownerId, previous)
            throw error
          }
        }
        return projection(session)
      }
      if (operation === "refresh") {
        if (owner.reconnectRequired)
          return projection(session, "reconnect_required")
        const date = new Date(now()).toISOString().slice(0, 10)
        if (owner.lastManualRefreshAt?.slice(0, 10) === date)
          fail(429, "daily_limit")
        // Reserve the UTC date before provider work; failed attempts also consume it.
        await store.writeOwner({
          ...owner,
          lastManualRefreshAt: new Date(now()).toISOString(),
        })
        const result = await refreshOwnerPortrait({
          ownerKey: session.ownerId,
          reason: "manual",
          deps,
        })
        return projection(session, result.status)
      }
      const draft = await store.readDraft(session.ownerId)
      if (!draft) fail(409, "draft_required")
      validateDraft(draft)
      const metadata = await store.readPublicationMetadata(session.ownerId)
      if (
        operation === "publish" &&
        (await store.readPublicationHash(session.ownerId))
      ) {
        const current = deriveShareCapability(
          session.ownerId,
          metadata?.shareVersion,
          sessionKey,
        )
        if (current.hash !== metadata.shareHash) fail(503, "unavailable")
        await store.replacePublishedSnapshot(session.ownerId, draft.snapshot)
        return projection(session)
      }
      const shareVersion = (metadata?.shareVersion || 0) + 1
      if (!Number.isSafeInteger(shareVersion)) fail(503, "unavailable")
      const { token } = deriveShareCapability(
        session.ownerId,
        shareVersion,
        sessionKey,
      )
      const publish =
        operation === "publish"
          ? store.publishSnapshot
          : store.rotatePublishedSnapshot
      await publish(session.ownerId, token, draft.snapshot, shareVersion)
      return projection(session)
    })
  }
  return { perform }
}

function createOwnerApiHandler(operation, deps) {
  return async function ownerHandler(request, response) {
    response.setHeader("Cache-Control", "no-store")
    response.setHeader("Referrer-Policy", "no-referrer")
    if (!METHODS[operation].includes(request.method)) {
      response.setHeader("Allow", METHODS[operation].join(", "))
      return response.status(405).json({ error: ERROR })
    }
    let dependencies
    try {
      dependencies = deps || runtimeDependencies()
      const result = await createOwnerService(dependencies).perform(
        operation,
        request,
      )
      if (operation === "delete")
        response.setHeader("Set-Cookie", cookie(SESSION_COOKIE, "", 0, true))
      return response.status(200).json(result)
    } catch (error) {
      const failure = safeFailure(error)
      try {
        dependencies?.diagnostic?.({ operation, category: failure.category })
      } catch {
        /* Diagnostics cannot replace safe errors. */
      }
      return response.status(failure.code).json({
        error:
          failure.category === "daily_limit"
            ? "Manual refresh is available once per UTC calendar day."
            : ERROR,
      })
    }
  }
}

module.exports = { createOwnerService, createOwnerApiHandler }

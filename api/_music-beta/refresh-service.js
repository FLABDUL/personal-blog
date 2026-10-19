const { randomUUID } = require("node:crypto")
const { isProxy } = require("node:util").types
const { setTimeout: delay } = require("node:timers/promises")
const { encryptSecret, decryptSecret } = require("./security")
const {
  validateOwnerRecord,
  validateEvidence,
  toPublicSnapshot,
} = require("./contracts")
const { refreshAccessToken, getTopItems } = require("./spotify-user")
const { generatePortraitDraft } = require("./generator")
const { WEEK_MS } = require("./http")

const RANGES = ["short_term", "medium_term", "long_term"]
const COUNTERS = [
  "updated",
  "drafted",
  "skipped",
  "busy",
  "failed",
  "reconnect_required",
  "retry_pending",
]

function failureDetails(error) {
  if (!error || typeof error !== "object" || isProxy(error)) return {}
  const code =
    Object.getOwnPropertyDescriptor(error, "code")?.value ||
    Object.getOwnPropertyDescriptor(error, "category")?.value
  const retryAfterSeconds = Object.getOwnPropertyDescriptor(
    error,
    "retryAfterSeconds",
  )?.value
  return { code, retryAfterSeconds }
}

async function retry(operation, wait) {
  for (let attempt = 0; ; attempt++) {
    try {
      return await operation()
    } catch (error) {
      const { code, retryAfterSeconds: seconds } = failureDetails(error)
      if (
        attempt === 2 ||
        !["rate_limited", "unavailable", "timeout"].includes(code)
      )
        throw error
      const ms =
        Number.isSafeInteger(seconds) && seconds >= 0
          ? seconds * 1000
          : 1000 * (attempt + 1)
      // Defer long provider cooldowns instead of retrying early or overrunning the job.
      if (ms > 30000) throw error
      await wait(ms)
    }
  }
}

function statusFor(error) {
  const { code } = failureDetails(error)
  if (["refresh_rejected", "unauthorised"].includes(code))
    return "reconnect_required"
  if (code === "rate_limited") return "retry_pending"
  if (code === "deleted") return "skipped"
  if (code === "busy") return "busy"
  return "failed"
}

function due(owner, time, snapshot) {
  const mondayAtSeven = Date.UTC(1970, 0, 5, 7)
  const weeklyBoundary =
    mondayAtSeven + Math.floor((time - mondayAtSeven) / WEEK_MS) * WEEK_MS
  return (
    !owner.paused &&
    !owner.reconnectRequired &&
    (!snapshot || Date.parse(snapshot.lastSuccessfulUpdateAt) < weeklyBoundary)
  )
}

function snapshotFrom(owner, draft, previous, generatedAt) {
  const artists = new Map(draft.catalogue.artists.map(item => [item.id, item]))
  const tracks = new Map(draft.catalogue.tracks.map(item => [item.id, item]))
  const introduced = new Map(
    (previous?.planets || []).flatMap(planet =>
      planet.moons.map(moon => [moon.id, moon.introducedAt]),
    ),
  )
  const initials = Array.from(
    owner.displayName
      .trim()
      .split(/\s+/)
      .slice(0, 2)
      .map(word => Array.from(word)[0])
      .join("")
      .toUpperCase(),
  )
    .slice(0, 2)
    .join("")
  return toPublicSnapshot({
    schemaVersion: 1,
    rendererVersion: 1,
    generatorVersion: 1,
    snapshotId: randomUUID(),
    generatedAt,
    lastSuccessfulUpdateAt: generatedAt,
    owner: {
      displayName: owner.displayName,
      initials,
      ...(owner.imageUrl === undefined ? {} : { imageUrl: owner.imageUrl }),
    },
    planets: draft.planets.map(planet => ({
      ...artists.get(planet.id),
      size: planet.size,
      region: planet.region,
      note: planet.note,
      layoutSeed: planet.layoutSeed,
      moons: planet.trackIds.map(id => ({
        ...tracks.get(id),
        introducedAt: introduced.get(id) || generatedAt,
      })),
    })),
  })
}

async function refreshOwnerPortrait({ ownerKey, reason, deps }) {
  const {
    store,
    tokenKey,
    clientId,
    clientSecret,
    fetchImpl = fetch,
    now = Date.now,
    wait = delay,
  } = deps
  if (!["manual", "scheduled", "initial"].includes(reason))
    return { status: "failed" }
  let completed
  try {
    return await store.withOwnerLease(ownerKey, async () => {
      let owner = await store.readOwner(ownerKey)
      if (!owner || owner.reconnectRequired) return { status: "skipped" }
      const previousDraft = await store.readDraft(ownerKey)
      const published = await store.readPublishedSnapshot(ownerKey)
      if (
        reason === "scheduled" &&
        !due(owner, now(), published || previousDraft?.snapshot)
      )
        return { status: "skipped" }
      const previousSuccess = owner.lastSuccessfulUpdateAt
      try {
        owner = {
          ...owner,
          refreshStatus: "refreshing",
          updatedAt: new Date(now()).toISOString(),
          ...(reason === "manual"
            ? { lastManualRefreshAt: new Date(now()).toISOString() }
            : {}),
        }
        await store.writeOwner(owner)
        const refreshToken = decryptSecret(owner.encryptedRefreshToken, {
          1: tokenKey,
        })
        const tokens = await retry(
          () =>
            refreshAccessToken({
              clientId,
              clientSecret,
              refreshToken,
              fetchImpl,
            }),
          wait,
        )
        owner = validateOwnerRecord({
          ...owner,
          encryptedRefreshToken: encryptSecret(
            tokens.refreshToken,
            tokenKey,
            1,
          ),
          tokenExpiresAt: new Date(
            now() + tokens.expiresIn * 1000,
          ).toISOString(),
          updatedAt: new Date(now()).toISOString(),
        })
        // Persist rotation before any further provider request; retries reuse this ciphertext.
        await retry(() => store.writeOwner(owner), wait)
        const topArtistsByRange = {},
          topTracksByRange = {}
        for (const [kind, destination] of [
          ["artists", topArtistsByRange],
          ["tracks", topTracksByRange],
        ]) {
          for (const timeRange of RANGES)
            destination[timeRange] = await retry(
              () =>
                getTopItems({
                  accessToken: tokens.accessToken,
                  kind,
                  timeRange,
                  fetchImpl,
                }),
              wait,
            )
        }
        const overrides = await store.readOverrides(ownerKey)
        const previousEvidence =
          previousDraft?.evidence || (await store.readEvidence(ownerKey))
        const generatedAt = new Date(now()).toISOString()
        const draft = generatePortraitDraft({
          fetchedAt: generatedAt,
          topArtistsByRange,
          topTracksByRange,
          overrides,
          ...(previousEvidence ? { previousEvidence } : {}),
          ...(previousDraft
            ? { previousCatalogue: previousDraft.catalogue }
            : {}),
        })
        validateEvidence(draft.evidence)
        const snapshot = snapshotFrom(
          owner,
          draft,
          published || previousDraft?.snapshot,
          generatedAt,
        )
        await store.writeEvidence(ownerKey, draft.evidence)
        await store.writeDraft(ownerKey, {
          schemaVersion: 1,
          evidence: draft.evidence,
          catalogue: draft.catalogue,
          snapshot,
        })
        // The live owner read rechecks the tombstone; storage checks it again at the pointer.
        if (!(await store.readOwner(ownerKey))) return { status: "skipped" }
        if (published) {
          if (!(await store.replacePublishedSnapshot(ownerKey, snapshot)))
            return { status: "skipped" }
          completed = { status: "updated" }
        } else {
          completed = { status: "drafted" }
        }
        // Success metadata follows the commit; the persisted snapshot is authoritative.
        await store.writeOwner({
          ...owner,
          refreshStatus: "idle",
          updatedAt: generatedAt,
          lastSuccessfulUpdateAt: generatedAt,
        })
        return completed
      } catch (error) {
        if (completed) return completed
        const status = statusFor(error)
        if (!["skipped", "busy"].includes(status)) {
          try {
            await store.writeOwner({
              ...owner,
              updatedAt: new Date(now()).toISOString(),
              lastSuccessfulUpdateAt: previousSuccess,
              refreshStatus: status,
              reconnectRequired: status === "reconnect_required",
            })
          } catch {
            /* Preserve the original safe outcome if storage is unavailable. */
          }
        }
        return { status }
      }
    })
  } catch (error) {
    // Lease cleanup cannot undo an already committed public/private snapshot.
    return completed || { status: statusFor(error) }
  }
}

async function refreshDueOwners(deps) {
  const time = (deps.now || Date.now)()
  const owners = []
  let preflightFailures = 0
  for (const owner of await deps.store.listRefreshableOwners()) {
    try {
      const published = await deps.store.readPublishedSnapshot(owner.ownerId)
      const snapshot =
        published || (await deps.store.readDraft(owner.ownerId))?.snapshot
      if (due(owner, time, snapshot)) owners.push(owner)
    } catch {
      preflightFailures++
    }
  }
  const result = {
    status: "complete",
    processed: owners.length + preflightFailures,
    ...Object.fromEntries(COUNTERS.map(key => [key, 0])),
    failed: preflightFailures,
  }
  let index = 0
  async function worker() {
    while (index < owners.length) {
      const owner = owners[index++]
      const { status } = await refreshOwnerPortrait({
        ownerKey: owner.ownerId,
        reason: "scheduled",
        deps,
      })
      result[status]++
    }
  }
  await Promise.all([worker(), worker()])
  return result
}

module.exports = { refreshOwnerPortrait, refreshDueOwners, snapshotFrom }

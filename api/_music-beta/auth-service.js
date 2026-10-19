const { createHash, timingSafeEqual } = require("node:crypto")
const { MAX_BOUND_USERS } = require("./contracts")
const {
  generateCapability,
  hashCapability,
  encryptSecret,
  decryptSecret,
  createSession,
} = require("./security")
const {
  createPkcePair,
  buildAuthorizationUrl,
  exchangeAuthorizationCode,
  getCurrentUser,
} = require("./spotify-user")
const {
  SESSION_COOKIE,
  TRANSACTION_COOKIE,
  WEEK_MS,
  readCookie,
  cookie,
} = require("./http")

// Reserved lease identity; real owner IDs always start with "spotify-owner:".
const ADMISSION_LEASE = "music-beta-system:admission:v1"
const errorCategories = new WeakMap()

class AuthError extends Error {
  constructor(category = "authorisation_failed") {
    super("Unable to authorise music portrait")
    category = category === "already_bound" ? category : "authorisation_failed"
    errorCategories.set(this, category)
    this.category = category
  }
}

function check(condition) {
  if (!condition) throw new AuthError()
}

function singleText(value, max = 2048) {
  return (
    typeof value === "string" &&
    value.trim().length > 0 &&
    value.length <= max &&
    value.isWellFormed() &&
    !/[\r\n]/.test(value)
  )
}

function equalState(left, right) {
  if (!singleText(left, 100) || !singleText(right, 100)) return false
  const a = Buffer.from(left)
  const b = Buffer.from(right)
  return a.length === b.length && timingSafeEqual(a, b)
}

function createAuthService({
  store,
  siteOrigin,
  clientId,
  clientSecret,
  tokenKey,
  sessionKey,
  now = Date.now,
  fetchImpl = fetch,
  diagnostic = () => {},
}) {
  function origin() {
    const url = new URL(siteOrigin)
    check(
      url.protocol === "https:" &&
        url.origin === siteOrigin &&
        !url.username &&
        !url.password,
    )
    return url.origin
  }

  const operations = {
    async createInvite(label) {
      check(singleText(label, 200))
      const base = origin()
      return store.withOwnerLease(ADMISSION_LEASE, async () => {
        check((await store.countActiveOwners()) < MAX_BOUND_USERS)
        const { token } = generateCapability()
        await store.createInvite(token, new Date(now() + WEEK_MS).toISOString())
        return `${base}/music/create/?invite=${token}`
      })
    },

    async start(request) {
      const invite = request.query?.invite
      check(singleText(invite, 100))
      check(await store.readInvite(invite, now()))
      const redirectUri = `${origin()}/api/music-portrait-auth-callback`
      const { codeVerifier, codeChallenge } = createPkcePair()
      const state = generateCapability().token
      const time = now()
      const transaction = {
        invite,
        state,
        codeVerifier,
        expiresAt: time + WEEK_MS,
      }
      const encrypted = encryptSecret(JSON.stringify(transaction), tokenKey, 1)
      const location = buildAuthorizationUrl({
        clientId,
        redirectUri,
        state,
        codeChallenge,
      })
      return {
        location,
        cookies: cookie(
          TRANSACTION_COOKIE,
          Buffer.from(JSON.stringify(encrypted)).toString("base64url"),
          time,
        ),
      }
    },

    async callback(request) {
      check(!request.query?.error && singleText(request.query?.code))
      const raw = readCookie(request, TRANSACTION_COOKIE)
      check(
        typeof raw === "string" &&
          raw.length <= 4096 &&
          /^[A-Za-z0-9_-]+$/.test(raw),
      )
      const encrypted = JSON.parse(
        Buffer.from(raw, "base64url").toString("utf8"),
      )
      const transaction = JSON.parse(decryptSecret(encrypted, { 1: tokenKey }))
      check(
        transaction &&
          Object.keys(transaction).sort().join() ===
            "codeVerifier,expiresAt,invite,state",
      )
      check(
        Number.isSafeInteger(transaction.expiresAt) &&
          transaction.expiresAt > now() &&
          transaction.expiresAt <= now() + WEEK_MS,
      )
      check(equalState(transaction.state, request.query?.state))
      check(
        typeof transaction.codeVerifier === "string" &&
          /^[A-Za-z0-9._~-]{43,128}$/.test(transaction.codeVerifier),
      )
      hashCapability(transaction.invite)
      check(await store.readInvite(transaction.invite, now()))
      const redirectUri = `${origin()}/api/music-portrait-auth-callback`
      const tokens = await exchangeAuthorizationCode({
        clientId,
        clientSecret,
        redirectUri,
        code: request.query.code,
        codeVerifier: transaction.codeVerifier,
        fetchImpl,
      })
      const profile = await getCurrentUser({
        accessToken: tokens.accessToken,
        fetchImpl,
      })
      const ownerId = `spotify-owner:${createHash("sha256").update(profile.id).digest("hex")}`

      return store.withOwnerLease(ADMISSION_LEASE, () =>
        store.withOwnerLease(ownerId, async () => {
          const time = now()
          check(transaction.expiresAt > time)
          const invite = await store.readInvite(transaction.invite, time)
          check(invite)
          if (await store.readOwner(ownerId))
            throw new AuthError("already_bound")
          const count = await store.countActiveOwners()
          check(count < MAX_BOUND_USERS)
          const timestamp = new Date(time).toISOString()
          const owner = {
            schemaVersion: 1,
            ownerId,
            spotifyUserId: profile.id,
            boundUserNumber: count + 1,
            displayName: profile.displayName,
            ...(profile.imageUrl ? { imageUrl: profile.imageUrl } : {}),
            encryptedRefreshToken: encryptSecret(
              tokens.refreshToken,
              tokenKey,
              1,
            ),
            tokenExpiresAt: new Date(
              time + tokens.expiresIn * 1000,
            ).toISOString(),
            inviteHash: invite.inviteHash,
            sessionVersion: 1,
            paused: false,
            reconnectRequired: false,
            refreshStatus: "idle",
            createdAt: timestamp,
            updatedAt: timestamp,
            lastSuccessfulUpdateAt: null,
            lastManualRefreshAt: null,
          }
          const sessionToken = createSession(
            { ownerId, sessionVersion: 1, expiresAt: time + WEEK_MS },
            sessionKey,
          )
          // Spend first: an interrupted owner write must never reopen admission.
          await store.consumeInvite(transaction.invite, ownerId, time)
          await store.writeOwner(owner)
          return {
            location: "/music/create/",
            cookies: [
              cookie(SESSION_COOKIE, sessionToken, time),
              cookie(TRANSACTION_COOKIE, "", time, true),
            ],
          }
        }),
      )
    },
  }

  return Object.fromEntries(
    Object.entries(operations).map(([operation, perform]) => [
      operation,
      async (...args) => {
        try {
          return await perform(...args)
        } catch (error) {
          const category = errorCategories.get(error) || "authorisation_failed"
          try {
            diagnostic({
              operation: operation === "createInvite" ? "invite" : operation,
              category,
            })
          } catch {
            /* Diagnostics cannot replace a safe failure. */
          }
          throw new AuthError(category)
        }
      },
    ]),
  )
}

module.exports = { createAuthService }

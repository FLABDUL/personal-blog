const { verifySession, verifyCsrfToken } = require("./security")
const { createMusicBetaStore } = require("./store")

const SESSION_COOKIE = "__Host-music-owner"
const TRANSACTION_COOKIE = "__Host-music-oauth"
const WEEK_MS = 7 * 24 * 60 * 60 * 1000
const BROWSER_ERROR = "Unable to authorise music portrait"

function readCookie(request, name) {
  const header = request.headers?.cookie
  if (typeof header !== "string" || header.length > 16384) return null
  const matches = header
    .split(";")
    .map(value => value.trim())
    .filter(value => value.startsWith(`${name}=`))
  return matches.length === 1 ? matches[0].slice(name.length + 1) : null
}

function cookie(name, value, now, clear = false) {
  return `${name}=${value}; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=${clear ? 0 : WEEK_MS / 1000}; Expires=${new Date(clear ? 0 : now + WEEK_MS).toUTCString()}`
}

function guardFailure(statusCode) {
  const error = new Error("Music portrait request is not authorised")
  error.statusCode = statusCode
  return error
}

async function requireOwnerSession(
  request,
  { store, sessionKey, now = Date.now },
) {
  const sessionToken = readCookie(request, SESSION_COOKIE)
  const session = verifySession(sessionToken, sessionKey, now())
  if (!session) throw guardFailure(401)
  const owner = await store.readOwner(session.ownerId)
  if (!owner || owner.sessionVersion !== session.sessionVersion)
    throw guardFailure(401)
  return { ...session, sessionToken }
}

function requireCsrf(
  request,
  session,
  { sessionKey, siteOrigin, now = Date.now },
) {
  const sessionToken = readCookie(request, SESSION_COOKIE)
  const verified = verifySession(sessionToken, sessionKey, now())
  if (
    !["POST", "PUT", "PATCH", "DELETE"].includes(request.method) ||
    typeof siteOrigin !== "string" ||
    !siteOrigin ||
    request.headers?.origin !== siteOrigin ||
    !verified ||
    sessionToken !== session?.sessionToken ||
    verified.ownerId !== session.ownerId ||
    verified.sessionVersion !== session.sessionVersion ||
    !verifyCsrfToken(
      request.headers?.["x-csrf-token"],
      sessionToken,
      sessionKey,
    )
  )
    throw guardFailure(403)
}

function runtimeDependencies() {
  return {
    store: createMusicBetaStore(require("@vercel/blob")),
    siteOrigin: process.env.MUSIC_PORTRAIT_SITE_ORIGIN,
    clientId: process.env.SPOTIFY_CLIENT_ID,
    clientSecret: process.env.SPOTIFY_CLIENT_SECRET,
    tokenKey: process.env.MUSIC_PORTRAIT_TOKEN_KEY,
    sessionKey: process.env.MUSIC_PORTRAIT_SESSION_KEY,
    diagnostic: event => console.error("Music portrait auth", event),
  }
}

function createOAuthHandler(operation, deps) {
  return async function oauthHandler(request, response) {
    response.setHeader("Cache-Control", "no-store")
    response.setHeader("Referrer-Policy", "no-referrer")
    if (operation === "callback")
      response.setHeader("Set-Cookie", [
        cookie(TRANSACTION_COOKIE, "", 0, true),
      ])
    if (request.method !== "GET") {
      response.setHeader("Allow", "GET")
      return response.status(405).json({ error: "Method not allowed" })
    }
    try {
      const { createAuthService } = require("./auth-service")
      const result = await createAuthService(deps || runtimeDependencies())[
        operation
      ](request)
      response.setHeader("Set-Cookie", result.cookies)
      response.setHeader("Location", result.location)
      return response.status(302).end()
    } catch {
      return response.status(400).json({ error: BROWSER_ERROR })
    }
  }
}

module.exports = {
  SESSION_COOKIE,
  TRANSACTION_COOKIE,
  WEEK_MS,
  readCookie,
  cookie,
  requireOwnerSession,
  requireCsrf,
  runtimeDependencies,
  createOAuthHandler,
}

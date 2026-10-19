const { createHash, randomBytes } = require("node:crypto")
const { isProxy } = require("node:util").types
const { REQUEST_TIMEOUT_MS } = require("../_spotify/client")

const ACCOUNTS_BASE = "https://accounts.spotify.com"
const API_BASE = "https://api.spotify.com/v1"
const SCOPE = "user-top-read"
const RANGES = ["short_term", "medium_term", "long_term"]
const trustedErrors = new WeakMap()

function fail(code, retryAfterSeconds) {
  const identity = Object.create(null)
  trustedErrors.set(identity, {
    code,
    ...(retryAfterSeconds === undefined ? {} : { retryAfterSeconds }),
  })
  throw identity
}

function check(condition, code = "invalid_response") {
  if (!condition) fail(code)
}

function record(value) {
  check(
    value !== null &&
      typeof value === "object" &&
      !isProxy(value) &&
      (Object.getPrototypeOf(value) === Object.prototype ||
        Object.getPrototypeOf(value) === null),
  )
  const descriptors = Object.getOwnPropertyDescriptors(value)
  const captured = Object.create(null)
  for (const key of Reflect.ownKeys(descriptors)) {
    const descriptor = descriptors[key]
    check(
      typeof key === "string" && descriptor.enumerable && "value" in descriptor,
    )
    captured[key] = descriptor.value
  }
  return captured
}

function array(value) {
  check(
    value !== null &&
      typeof value === "object" &&
      !isProxy(value) &&
      Array.isArray(value) &&
      Object.getPrototypeOf(value) === Array.prototype,
  )
  const descriptors = Object.getOwnPropertyDescriptors(value)
  const length = descriptors.length.value
  check(Reflect.ownKeys(descriptors).length === length + 1)
  const captured = []
  for (let index = 0; index < length; index++) {
    const descriptor = descriptors[index]
    check(descriptor && descriptor.enumerable && "value" in descriptor)
    captured.push(descriptor.value)
  }
  return captured
}

function inputBoundary(input, validate) {
  try {
    const captured = record(input)
    check(
      captured.fetchImpl === undefined ||
        typeof captured.fetchImpl === "function",
    )
    validate(captured)
    return captured
  } catch {
    throw { code: "invalid_input" }
  }
}

async function responseBoundary(operation) {
  try {
    return await operation()
  } catch (error) {
    const trusted = trustedErrors.get(error)
    throw trusted ? { ...trusted } : { code: "invalid_response" }
  }
}

function text(value, max = 65536) {
  return (
    typeof value === "string" &&
    value.trim().length > 0 &&
    value.length <= max &&
    value.isWellFormed() &&
    !/[\r\n]/.test(value)
  )
}

function validRedirect(value) {
  if (!text(value, 2048)) return false
  try {
    const url = new URL(value)
    return (
      !url.username &&
      !url.password &&
      !url.hash &&
      (url.protocol === "https:" ||
        (url.protocol === "http:" &&
          ["127.0.0.1", "[::1]"].includes(url.hostname)))
    )
  } catch {
    return false
  }
}

function createPkcePair() {
  const codeVerifier = randomBytes(32).toString("base64url")
  return {
    codeVerifier,
    codeChallenge: createHash("sha256")
      .update(codeVerifier)
      .digest("base64url"),
  }
}

function buildAuthorizationUrl(input) {
  const { clientId, redirectUri, state, codeChallenge } = inputBoundary(
    input,
    value => {
      check(
        text(value.clientId) &&
          validRedirect(value.redirectUri) &&
          text(value.state),
      )
      check(
        text(value.codeChallenge) &&
          /^[A-Za-z0-9_-]{43}$/.test(value.codeChallenge),
      )
    },
  )
  const url = new URL(`${ACCOUNTS_BASE}/authorize`)
  url.search = new URLSearchParams({
    client_id: clientId,
    response_type: "code",
    redirect_uri: redirectUri,
    state,
    scope: SCOPE,
    code_challenge_method: "S256",
    code_challenge: codeChallenge,
  }).toString()
  return url.toString()
}

async function requestJson(url, options, fetchImpl, refreshing = false) {
  const signal = AbortSignal.timeout(REQUEST_TIMEOUT_MS)
  let response
  try {
    response = await fetchImpl(url, {
      ...options,
      signal,
      redirect: "error",
      cache: "no-store",
    })
  } catch {
    fail(signal.aborted ? "timeout" : "unavailable")
  }
  check(response !== null && typeof response === "object" && !isProxy(response))
  const status = response.status
  const ok = response.ok
  check(
    Number.isInteger(status) &&
      status >= 100 &&
      status <= 599 &&
      typeof ok === "boolean" &&
      ok === (status >= 200 && status < 300),
  )
  if (!ok) {
    if (status === 429) {
      const value = response.headers?.get("Retry-After")
      const seconds =
        typeof value === "string" && /^\d+$/.test(value) ? Number(value) : NaN
      fail("rate_limited", Number.isSafeInteger(seconds) ? seconds : undefined)
    }
    if (refreshing && [400, 401].includes(status)) fail("refresh_rejected")
    fail(
      status === 401
        ? "unauthorised"
        : status === 403
          ? "forbidden"
          : status >= 500
            ? "unavailable"
            : "request_rejected",
    )
  }
  let payload
  try {
    payload = await response.json()
  } catch {
    fail(signal.aborted ? "timeout" : "invalid_response")
  }
  return record(payload)
}

async function requestToken(
  { clientId, clientSecret, fetchImpl = fetch },
  parameters,
  previousRefreshToken,
) {
  const payload = await requestJson(
    `${ACCOUNTS_BASE}/api/token`,
    {
      method: "POST",
      headers: {
        Authorization: `Basic ${Buffer.from(`${clientId}:${clientSecret}`).toString("base64")}`,
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: new URLSearchParams({ ...parameters, client_id: clientId }),
    },
    fetchImpl,
    previousRefreshToken !== undefined,
  )
  const refreshToken =
    payload.refresh_token === undefined
      ? previousRefreshToken
      : payload.refresh_token
  check(
    text(payload.access_token) &&
      text(refreshToken) &&
      typeof payload.token_type === "string" &&
      payload.token_type.toLowerCase() === "bearer" &&
      Number.isSafeInteger(payload.expires_in) &&
      payload.expires_in > 0 &&
      (payload.scope === undefined || payload.scope === SCOPE),
    "invalid_response",
  )
  return {
    accessToken: payload.access_token,
    refreshToken,
    expiresIn: payload.expires_in,
    scope: SCOPE,
  }
}

async function exchangeAuthorizationCode(input) {
  const captured = inputBoundary(input, value => {
    check(
      text(value.clientId) &&
        text(value.clientSecret) &&
        text(value.code) &&
        validRedirect(value.redirectUri) &&
        text(value.codeVerifier) &&
        /^[A-Za-z0-9._~-]{43,128}$/.test(value.codeVerifier),
    )
  })
  const { code, redirectUri, codeVerifier } = captured
  return responseBoundary(() =>
    requestToken(captured, {
      grant_type: "authorization_code",
      code,
      redirect_uri: redirectUri,
      code_verifier: codeVerifier,
    }),
  )
}

async function refreshAccessToken(input) {
  const captured = inputBoundary(input, value => {
    check(
      text(value.clientId) &&
        text(value.clientSecret) &&
        text(value.refreshToken),
    )
  })
  return responseBoundary(() =>
    requestToken(
      captured,
      { grant_type: "refresh_token", refresh_token: captured.refreshToken },
      captured.refreshToken,
    ),
  )
}

async function requestUser(path, input) {
  const { accessToken, fetchImpl = fetch } = input
  return requestJson(
    `${API_BASE}${path}`,
    {
      method: "GET",
      headers: { Authorization: `Bearer ${accessToken}` },
    },
    fetchImpl,
  )
}

function artwork(images) {
  if (images === undefined || images === null) return undefined
  const captured = array(images)
  let selected
  for (let index = 0; index < captured.length; index++) {
    if (captured[index] === null) continue
    const { url } = record(captured[index])
    if (
      selected === undefined &&
      text(url, 2048) &&
      /^https:\/\/i\.scdn\.co\/image\/[A-Za-z0-9]+$/.test(url)
    )
      selected = url
  }
  return selected
}

function withArtwork(value, images) {
  const imageUrl = artwork(images)
  return imageUrl ? { ...value, imageUrl } : value
}

async function getCurrentUser(input) {
  const captured = inputBoundary(input, value => check(text(value.accessToken)))
  return responseBoundary(async () => {
    const payload = await requestUser("/me", captured)
    check(text(payload.id, 200), "invalid_response")
    return withArtwork(
      {
        id: payload.id,
        displayName: text(payload.display_name, 200)
          ? payload.display_name
          : payload.id,
      },
      payload.images,
    )
  })
}

function entity(value, kind, images) {
  check(
    typeof value.id === "string" &&
      value.id.length === 22 &&
      /^[A-Za-z0-9]{22}$/.test(value.id) &&
      text(value.name, 200),
    "invalid_response",
  )
  return withArtwork(
    {
      id: value.id,
      name: value.name,
      spotifyUrl: `https://open.spotify.com/${kind}/${value.id}`,
    },
    images,
  )
}

function normaliseItem(value, kind) {
  const captured = record(value)
  if (kind === "artists") return entity(captured, "artist", captured.images)
  const album =
    captured.album === undefined || captured.album === null
      ? null
      : record(captured.album)
  const track = entity(captured, "track", album?.images)
  const credits = array(captured.artists)
  check(credits.length > 0)
  const artists = new Map()
  for (let index = 0; index < credits.length; index++) {
    const credit = record(credits[index])
    const artist = entity(credit, "artist", credit.images)
    if (!artists.has(artist.id)) artists.set(artist.id, artist)
  }
  return {
    ...track,
    artists: [...artists.values()],
    artistIds: [...artists.keys()],
  }
}

async function getTopItems(input) {
  const captured = inputBoundary(input, value => {
    check(
      text(value.accessToken) &&
        ["artists", "tracks"].includes(value.kind) &&
        RANGES.includes(value.timeRange),
    )
  })
  const { kind, timeRange } = captured
  return responseBoundary(async () => {
    const query = new URLSearchParams({ time_range: timeRange, limit: "50" })
    const payload = await requestUser(`/me/top/${kind}?${query}`, captured)
    const source = array(payload.items)
    check(
      source.length <= 50 &&
        Number.isSafeInteger(payload.total) &&
        payload.total >= source.length,
      "invalid_response",
    )
    const items = []
    const seen = new Set()
    for (let index = 0; index < source.length; index++) {
      const item = normaliseItem(source[index], kind)
      check(!seen.has(item.id))
      seen.add(item.id)
      items.push(item)
    }
    return { items, total: payload.total }
  })
}

module.exports = {
  createPkcePair,
  buildAuthorizationUrl,
  exchangeAuthorizationCode,
  refreshAccessToken,
  getCurrentUser,
  getTopItems,
}

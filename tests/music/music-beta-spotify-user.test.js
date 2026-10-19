const test = require("node:test")
const assert = require("node:assert/strict")
const { createHash } = require("node:crypto")
const gateway = require("../../api/_music-beta/spotify-user")

// All credentials and provider data are synthetic; no environment is read.
const credentials = {
  clientId: "fixture-client",
  clientSecret: "fixture-secret",
}
const redirectUri = "https://example.test/api/music-beta/callback"
const accessToken = "fixture-access"
const refreshToken = "fixture-refresh"
const codeVerifier = "a".repeat(43)
const ranges = ["short_term", "medium_term", "long_term"]
const artistId = "a".repeat(22)
const trackId = "t".repeat(22)
const imageUrl = "https://i.scdn.co/image/fixture123"
const rawArtist = {
  id: artistId,
  name: "Fixture artist",
  external_urls: { spotify: `https://open.spotify.com/artist/${artistId}` },
  images: [{ url: imageUrl }],
  popularity: 99,
  privateExtra: "discard",
}
const artist = {
  id: artistId,
  name: "Fixture artist",
  spotifyUrl: `https://open.spotify.com/artist/${artistId}`,
  imageUrl,
}
const rawTrack = {
  id: trackId,
  name: "Fixture track",
  artists: [rawArtist],
  album: { images: [{ url: imageUrl }], name: "Discard album" },
  preview_url: "https://example.test/never-return",
  popularity: 99,
}
const tokenPayload = {
  access_token: accessToken,
  refresh_token: refreshToken,
  token_type: "Bearer",
  expires_in: 3600,
  scope: "user-top-read",
  privateExtra: "discard",
}

function response(payload, status = 200, retryAfter) {
  return {
    ok: status >= 200 && status < 300,
    status,
    headers: new Headers(
      retryAfter === undefined ? {} : { "Retry-After": retryAfter },
    ),
    json: async () => payload,
  }
}

function input(fetchImpl) {
  return {
    ...credentials,
    redirectUri,
    code: "fixture-code",
    codeVerifier,
    fetchImpl,
  }
}

function safeError(code, retryAfterSeconds) {
  return error => {
    assert.deepEqual(
      Reflect.ownKeys(error).sort(),
      retryAfterSeconds === undefined
        ? ["code"]
        : ["code", "retryAfterSeconds"],
    )
    assert.deepEqual(error, {
      code,
      ...(retryAfterSeconds === undefined ? {} : { retryAfterSeconds }),
    })
    return true
  }
}

test("PKCE uses fresh Node randomness and a base64url S256 challenge", () => {
  const first = gateway.createPkcePair()
  const second = gateway.createPkcePair()
  assert.deepEqual(Object.keys(first).sort(), ["codeChallenge", "codeVerifier"])
  assert.match(first.codeVerifier, /^[A-Za-z0-9_-]{43,128}$/)
  assert.ok(Buffer.from(first.codeVerifier, "base64url").length >= 32)
  assert.notEqual(first.codeVerifier, second.codeVerifier)
  assert.equal(
    first.codeChallenge,
    createHash("sha256").update(first.codeVerifier).digest("base64url"),
  )
})

test("authorisation URL has exactly the state, redirect, S256 and user-top-read parameters", () => {
  const { codeChallenge } = gateway.createPkcePair()
  const url = new URL(
    gateway.buildAuthorizationUrl({
      clientId: credentials.clientId,
      redirectUri,
      state: "fixture-state",
      codeChallenge,
      scope: "streaming user-read-playback-state",
    }),
  )
  assert.equal(
    url.origin + url.pathname,
    "https://accounts.spotify.com/authorize",
  )
  assert.deepEqual(Object.fromEntries(url.searchParams), {
    client_id: credentials.clientId,
    response_type: "code",
    redirect_uri: redirectUri,
    state: "fixture-state",
    scope: "user-top-read",
    code_challenge_method: "S256",
    code_challenge: codeChallenge,
  })
  assert.equal([...url.searchParams].length, 7)
})

test("code exchange uses form encoding and server client authentication", async () => {
  let request
  const result = await gateway.exchangeAuthorizationCode(
    input(async (url, options) => {
      request = { url, options }
      return response(tokenPayload)
    }),
  )
  assert.equal(request.url, "https://accounts.spotify.com/api/token")
  assert.equal(request.options.method, "POST")
  assert.deepEqual(request.options.headers, {
    Authorization: `Basic ${Buffer.from(`${credentials.clientId}:${credentials.clientSecret}`).toString("base64")}`,
    "Content-Type": "application/x-www-form-urlencoded",
  })
  assert.ok(request.options.body instanceof URLSearchParams)
  assert.deepEqual(Object.fromEntries(request.options.body), {
    grant_type: "authorization_code",
    client_id: credentials.clientId,
    code: "fixture-code",
    redirect_uri: redirectUri,
    code_verifier: codeVerifier,
  })
  assert.deepEqual(result, {
    accessToken,
    refreshToken,
    expiresIn: 3600,
    scope: "user-top-read",
  })
})

test("refresh preserves omitted refresh tokens and accepts explicit rotation", async () => {
  for (const replacement of [undefined, "fixture-rotated"]) {
    let request
    const payload = { ...tokenPayload }
    delete payload.refresh_token
    delete payload.scope
    if (replacement !== undefined) payload.refresh_token = replacement
    const result = await gateway.refreshAccessToken({
      ...credentials,
      refreshToken,
      fetchImpl: async (url, options) => {
        request = { url, options }
        return response(payload)
      },
    })
    assert.equal(request.url, "https://accounts.spotify.com/api/token")
    assert.equal(request.options.method, "POST")
    assert.equal(
      request.options.headers["Content-Type"],
      "application/x-www-form-urlencoded",
    )
    assert.equal(
      request.options.headers.Authorization,
      `Basic ${Buffer.from(`${credentials.clientId}:${credentials.clientSecret}`).toString("base64")}`,
    )
    assert.deepEqual(Object.fromEntries(request.options.body), {
      grant_type: "refresh_token",
      client_id: credentials.clientId,
      refresh_token: refreshToken,
    })
    assert.deepEqual(result, {
      accessToken,
      refreshToken: replacement ?? refreshToken,
      expiresIn: 3600,
      scope: "user-top-read",
    })
  }
})

test("profile returns only identity, display name and allowlisted artwork", async () => {
  let request
  const result = await gateway.getCurrentUser({
    accessToken,
    fetchImpl: async (url, options) => {
      request = { url, options }
      return response({
        id: "fixture-user",
        display_name: "Fixture User",
        images: [{ url: imageUrl }],
        email: "discard@example.test",
        country: "GB",
        product: "premium",
      })
    },
  })
  assert.equal(request.url, "https://api.spotify.com/v1/me")
  assert.equal(request.options.method, "GET")
  assert.deepEqual(request.options.headers, {
    Authorization: `Bearer ${accessToken}`,
  })
  assert.deepEqual(result, {
    id: "fixture-user",
    displayName: "Fixture User",
    imageUrl,
  })
  const fallback = await gateway.getCurrentUser({
    accessToken,
    fetchImpl: async () =>
      response({ id: "fixture-user", display_name: null, images: [] }),
  })
  assert.deepEqual(fallback, {
    id: "fixture-user",
    displayName: "fixture-user",
  })
})

test("top-item calls cover both kinds and all three ranges with exactly limit=50", async () => {
  const requests = []
  for (const kind of ["artists", "tracks"]) {
    for (const timeRange of ranges) {
      const result = await gateway.getTopItems({
        accessToken,
        kind,
        timeRange,
        fetchImpl: async (url, options) => {
          requests.push({ url, options })
          return response({
            items: [kind === "artists" ? rawArtist : rawTrack],
            total: 1,
            next: "discard",
          })
        },
      })
      assert.deepEqual(result, {
        items: [
          kind === "artists"
            ? artist
            : {
                id: trackId,
                name: "Fixture track",
                spotifyUrl: `https://open.spotify.com/track/${trackId}`,
                imageUrl,
                artists: [artist],
                artistIds: [artistId],
              },
        ],
        total: 1,
      })
      const request = requests.at(-1)
      const url = new URL(request.url)
      assert.equal(
        url.origin + url.pathname,
        `https://api.spotify.com/v1/me/top/${kind}`,
      )
      assert.deepEqual(
        [...url.searchParams],
        [
          ["time_range", timeRange],
          ["limit", "50"],
        ],
      )
      assert.equal(request.options.method, "GET")
      assert.deepEqual(request.options.headers, {
        Authorization: `Bearer ${accessToken}`,
      })
    }
  }
  assert.equal(requests.length, 6)
})

test("all network operations use the existing eight-second AbortSignal boundary", async t => {
  const durations = []
  const signals = []
  t.mock.method(AbortSignal, "timeout", duration => {
    durations.push(duration)
    const signal = new AbortController().signal
    signals.push(signal)
    return signal
  })
  const seen = []
  const fetchImpl = async (url, options) => {
    seen.push(options.signal)
    assert.equal(options.redirect, "error")
    assert.equal(options.cache, "no-store")
    return response(
      url.endsWith("/api/token")
        ? tokenPayload
        : url.endsWith("/me")
          ? { id: "fixture-user" }
          : { items: [], total: 0 },
    )
  }
  await gateway.exchangeAuthorizationCode(input(fetchImpl))
  await gateway.refreshAccessToken({ ...credentials, refreshToken, fetchImpl })
  await gateway.getCurrentUser({ accessToken, fetchImpl })
  await gateway.getTopItems({
    accessToken,
    kind: "artists",
    timeRange: "short_term",
    fetchImpl,
  })
  assert.deepEqual(durations, [8000, 8000, 8000, 8000])
  assert.deepEqual(seen, signals)
})

test("valid sparse results stay sparse and optional images never retain raw objects", async () => {
  for (const items of [[], [{ ...rawArtist, images: undefined }]]) {
    const result = await gateway.getTopItems({
      accessToken,
      kind: "artists",
      timeRange: "long_term",
      fetchImpl: async () => response({ items, total: items.length }),
    })
    assert.equal(result.total, items.length)
    assert.deepEqual(
      result.items,
      items.length
        ? [
            {
              id: artistId,
              name: "Fixture artist",
              spotifyUrl: `https://open.spotify.com/artist/${artistId}`,
            },
          ]
        : [],
    )
    if (items.length) {
      items[0].name = "Changed"
      assert.equal(result.items[0].name, "Fixture artist")
    }
  }
  const credits = [
    rawArtist,
    { ...rawArtist, name: "Duplicate credit" },
    {
      id: "b".repeat(22),
      name: "Second credit",
      external_urls: { spotify: "https://example.test/untrusted" },
    },
  ]
  const result = await gateway.getTopItems({
    accessToken,
    kind: "tracks",
    timeRange: "short_term",
    fetchImpl: async () =>
      response({
        items: [{ ...rawTrack, album: {}, artists: credits }],
        total: 8,
      }),
  })
  assert.equal(result.total, 8)
  assert.deepEqual(result.items[0], {
    id: trackId,
    name: "Fixture track",
    spotifyUrl: `https://open.spotify.com/track/${trackId}`,
    artistIds: [artistId, "b".repeat(22)],
    artists: [
      artist,
      {
        id: "b".repeat(22),
        name: "Second credit",
        spotifyUrl: `https://open.spotify.com/artist/${"b".repeat(22)}`,
      },
    ],
  })
  credits[0].images[0].url = "https://example.test/changed"
  assert.equal(result.items[0].artists[0].imageUrl, imageUrl)
  credits[0].images[0].url = imageUrl
})

test("invalid top-item routes fail before making a request", async () => {
  let calls = 0
  for (const [kind, timeRange] of [
    ["artist", "short_term"],
    ["../me", "short_term"],
    ["artists", "all_time"],
    ["tracks", undefined],
  ]) {
    await assert.rejects(
      gateway.getTopItems({
        accessToken,
        kind,
        timeRange,
        fetchImpl: async () => {
          calls++
          return response({ items: [], total: 0 })
        },
      }),
      safeError("invalid_input"),
    )
  }
  assert.equal(calls, 0)
})

test("401 refresh rejection and OAuth invalid_grant expose safe reconnect categories", async () => {
  for (const status of [400, 401]) {
    let parsed = false
    await assert.rejects(
      gateway.refreshAccessToken({
        ...credentials,
        refreshToken,
        fetchImpl: async () => ({
          ...response(null, status),
          json: async () => {
            parsed = true
            throw new Error("discard")
          },
        }),
      }),
      safeError("refresh_rejected"),
    )
    assert.equal(parsed, false)
  }
})

test("HTTP failures expose safe categories without reading provider error bodies", async () => {
  for (const [status, code, header, seconds] of [
    [401, "unauthorised"],
    [403, "forbidden"],
    [400, "request_rejected"],
    [500, "unavailable"],
    [429, "rate_limited", "17", 17],
    [429, "rate_limited", "0", 0],
    [429, "rate_limited", "-3"],
    [429, "rate_limited", "invalid"],
  ]) {
    let parsed = false
    await assert.rejects(
      gateway.getCurrentUser({
        accessToken,
        fetchImpl: async () => ({
          ...response(null, status, header),
          json: async () => {
            parsed = true
            throw new Error("discard")
          },
        }),
      }),
      safeError(code, seconds),
    )
    assert.equal(parsed, false)
  }
})

test("malformed JSON and network exceptions cannot leak provider messages or error properties", async () => {
  for (const fetchImpl of [
    async () => ({
      ...response(null),
      json: async () => {
        throw new SyntaxError("discard")
      },
    }),
    async () => response(null),
  ])
    await assert.rejects(
      gateway.getCurrentUser({ accessToken, fetchImpl }),
      safeError("invalid_response"),
    )
  await assert.rejects(
    gateway.getCurrentUser({
      accessToken,
      fetchImpl: async () => {
        throw {
          code: "rate_limited",
          retryAfterSeconds: 123,
          privateExtra: "discard",
        }
      },
    }),
    safeError("unavailable"),
  )
})

test("an aborted network request is a safe timeout", async t => {
  t.mock.method(AbortSignal, "timeout", () =>
    AbortSignal.abort(new DOMException("discard", "TimeoutError")),
  )
  await assert.rejects(
    gateway.getCurrentUser({
      accessToken,
      fetchImpl: async (url, options) => {
        options.signal.throwIfAborted()
      },
    }),
    safeError("timeout"),
  )
})

test("malformed token payloads fail safely, including invalid replacement refresh tokens", async () => {
  const cases = [
    null,
    {},
    { ...tokenPayload, access_token: "" },
    { ...tokenPayload, expires_in: 0 },
    { ...tokenPayload, expires_in: "3600" },
    { ...tokenPayload, token_type: "Other" },
    { ...tokenPayload, scope: "streaming" },
    { ...tokenPayload, refresh_token: null },
    { ...tokenPayload, refresh_token: "" },
  ]
  for (const payload of cases) {
    await assert.rejects(
      gateway.exchangeAuthorizationCode(input(async () => response(payload))),
      safeError("invalid_response"),
    )
    await assert.rejects(
      gateway.refreshAccessToken({
        ...credentials,
        refreshToken,
        fetchImpl: async () => response(payload),
      }),
      safeError("invalid_response"),
    )
  }
  const missingRefresh = { ...tokenPayload }
  delete missingRefresh.refresh_token
  await assert.rejects(
    gateway.exchangeAuthorizationCode(
      input(async () => response(missingRefresh)),
    ),
    safeError("invalid_response"),
  )
})

test("malformed top-item containers and required metadata fail without silently changing ranks", async () => {
  for (const payload of [
    null,
    {},
    { items: null, total: 0 },
    { items: [], total: -1 },
    { items: [], total: "0" },
    { items: [rawArtist], total: 0 },
    { items: [null], total: 1 },
    { items: [{ ...rawArtist, id: "bad" }], total: 1 },
    { items: [{ ...rawArtist, name: "" }], total: 1 },
    { items: [rawArtist, rawArtist], total: 2 },
    { items: Array(51).fill(rawArtist), total: 51 },
  ])
    await assert.rejects(
      gateway.getTopItems({
        accessToken,
        kind: "artists",
        timeRange: "short_term",
        fetchImpl: async () => response(payload),
      }),
      safeError("invalid_response"),
    )
  for (const artists of [
    undefined,
    [],
    [null],
    [{ id: "bad", name: "Invalid credit" }],
  ]) {
    await assert.rejects(
      gateway.getTopItems({
        accessToken,
        kind: "tracks",
        timeRange: "short_term",
        fetchImpl: async () =>
          response({ items: [{ ...rawTrack, artists }], total: 1 }),
      }),
      safeError("invalid_response"),
    )
  }
})

test("invalid credentials, redirect and PKCE values expose only invalid_input", async () => {
  for (const overrides of [
    { clientId: "" },
    { clientSecret: "" },
    { code: "" },
    { codeVerifier: "short" },
    { redirectUri: "invalid" },
    { clientId: "line\nbreak" },
  ]) {
    await assert.rejects(
      gateway.exchangeAuthorizationCode({
        ...input(async () => assert.fail("unexpected request")),
        ...overrides,
      }),
      safeError("invalid_input"),
    )
  }
  assert.throws(
    () =>
      gateway.buildAuthorizationUrl({
        clientId: credentials.clientId,
        redirectUri,
        state: "",
        codeChallenge: "a".repeat(43),
      }),
    safeError("invalid_input"),
  )
  await assert.rejects(
    gateway.getCurrentUser({
      accessToken: "",
      fetchImpl: async () => assert.fail("unexpected request"),
    }),
    safeError("invalid_input"),
  )
})

test("missing or non-object operation inputs never expose native exceptions", async () => {
  for (const value of [undefined, null, "invalid", []]) {
    assert.throws(
      () => gateway.buildAuthorizationUrl(value),
      safeError("invalid_input"),
    )
    for (const operation of [
      gateway.exchangeAuthorizationCode,
      gateway.refreshAccessToken,
      gateway.getCurrentUser,
      gateway.getTopItems,
    ]) {
      await assert.rejects(operation(value), safeError("invalid_input"))
    }
  }
})

test("the request signal also bounds response-body decoding", async t => {
  const originalTimeout = AbortSignal.timeout.bind(AbortSignal)
  t.mock.method(AbortSignal, "timeout", () => originalTimeout(5))
  const keepAlive = setTimeout(() => {}, 100)
  t.after(() => clearTimeout(keepAlive))
  await assert.rejects(
    gateway.getCurrentUser({
      accessToken,
      fetchImpl: async (url, options) => ({
        ...response(null),
        json: () =>
          new Promise((resolve, reject) => {
            options.signal.addEventListener(
              "abort",
              () => reject(options.signal.reason),
              { once: true },
            )
          }),
      }),
    }),
    safeError("timeout"),
  )
})

test("optional artwork skips unsafe images and missing profile identity fails safely", async () => {
  const result = await gateway.getCurrentUser({
    accessToken,
    fetchImpl: async () =>
      response({
        id: "fixture-user",
        images: [
          null,
          { url: "https://example.test/unsafe" },
          { url: imageUrl },
        ],
      }),
  })
  assert.deepEqual(result, {
    id: "fixture-user",
    displayName: "fixture-user",
    imageUrl,
  })
  for (const payload of [{}, { id: "" }, { id: 123 }]) {
    await assert.rejects(
      gateway.getCurrentUser({
        accessToken,
        fetchImpl: async () => response(payload),
      }),
      safeError("invalid_response"),
    )
  }
})

test("response, header and payload exceptions become fresh exact safe errors", async () => {
  const original = {
    code: "rate_limited",
    retryAfterSeconds: 99,
    privateExtra: "discard",
  }
  const throwing = (value, field) =>
    Object.defineProperty(value, field, {
      enumerable: true,
      get() {
        throw original
      },
    })
  const revoked = Proxy.revocable({}, {})
  revoked.revoke()
  const cases = [
    () => throwing(response(null), "status"),
    () => throwing(response(null), "ok"),
    () => throwing(response(null, 429), "headers"),
    () => ({
      ...response(null, 429),
      headers: {
        get() {
          throw original
        },
      },
    }),
    () => throwing(response(null), "json"),
    () => response(throwing({ id: "fixture-user" }, "id")),
    () => response(revoked.proxy),
  ]
  for (const makeResponse of cases) {
    await assert.rejects(
      gateway.getCurrentUser({
        accessToken,
        fetchImpl: async () => makeResponse(),
      }),
      error => {
        assert.notEqual(error, original)
        return safeError("invalid_response")(error)
      },
    )
  }
  // Async fetch cannot resolve a revoked proxy: Promise assimilation rejects first.
  await assert.rejects(
    gateway.getCurrentUser({
      accessToken,
      fetchImpl: async () => revoked.proxy,
    }),
    safeError("unavailable"),
  )
  await assert.rejects(
    gateway.refreshAccessToken({
      ...credentials,
      refreshToken,
      fetchImpl: async () =>
        response(throwing({ ...tokenPayload }, "refresh_token")),
    }),
    safeError("invalid_response"),
  )
  await assert.rejects(
    gateway.getTopItems({
      accessToken,
      kind: "tracks",
      timeRange: "short_term",
      fetchImpl: async () =>
        response({
          items: [{ ...rawTrack, album: throwing({}, "images") }],
          total: 1,
        }),
    }),
    safeError("invalid_response"),
  )
})

test("hostile and revoked operation inputs become fresh exact invalid_input errors", async () => {
  const original = { code: "invalid_input", privateExtra: "discard" }
  const revoked = Proxy.revocable({}, {})
  revoked.revoke()
  const changing = Object.defineProperty({}, "clientId", {
    enumerable: true,
    get() {
      throw original
    },
  })
  for (const value of [
    revoked.proxy,
    changing,
    new Proxy(
      {},
      {
        get() {
          throw original
        },
      },
    ),
  ]) {
    const expected = error => {
      assert.notEqual(error, original)
      return safeError("invalid_input")(error)
    }
    assert.throws(() => gateway.buildAuthorizationUrl(value), expected)
    for (const operation of [
      gateway.exchangeAuthorizationCode,
      gateway.refreshAccessToken,
      gateway.getCurrentUser,
      gateway.getTopItems,
    ]) {
      await assert.rejects(operation(value), expected)
    }
  }
})

test("provider-owned array methods and iterators cannot bypass projection", async () => {
  let calls = 0
  for (const [field, create] of [
    [
      "map",
      () => {
        const items = [rawArtist]
        items.map = () => {
          calls++
          return items
        }
        return { items, total: 1 }
      },
    ],
    [
      "find",
      () => {
        const images = [{ url: imageUrl }]
        images.find = () => {
          calls++
          return { url: imageUrl }
        }
        return { items: [{ ...rawArtist, images }], total: 1 }
      },
    ],
    [
      "iterator",
      () => {
        const items = [rawArtist]
        items[Symbol.iterator] = function* () {
          calls++
          yield rawArtist
        }
        return { items, total: 1 }
      },
    ],
  ]) {
    await assert.rejects(
      gateway.getTopItems({
        accessToken,
        kind: "artists",
        timeRange: "short_term",
        fetchImpl: async () => response(create()),
      }),
      error => {
        assert.equal(typeof field, "string")
        return safeError("invalid_response")(error)
      },
    )
  }
  assert.equal(calls, 0)
})

test("changing accessors are rejected before reading profile, token, item, credit or image fields", async () => {
  let reads = 0
  const changing = (value, field, first) =>
    Object.defineProperty(value, field, {
      enumerable: true,
      get() {
        reads++
        return reads === 1 ? first : { privateExtra: "discard" }
      },
    })
  await assert.rejects(
    gateway.getCurrentUser({
      accessToken,
      fetchImpl: async () =>
        response(changing({ id: "fixture-user" }, "id", "fixture-user")),
    }),
    safeError("invalid_response"),
  )
  await assert.rejects(
    gateway.exchangeAuthorizationCode(
      input(async () =>
        response(changing({ ...tokenPayload }, "access_token", accessToken)),
      ),
    ),
    safeError("invalid_response"),
  )
  const payloads = [
    changing({ items: [rawTrack], total: 1 }, "items", [rawTrack]),
    { items: [changing({ ...rawTrack }, "name", "Fixture track")], total: 1 },
    {
      items: [
        { ...rawTrack, artists: [changing({ ...rawArtist }, "id", artistId)] },
      ],
      total: 1,
    },
    {
      items: [
        { ...rawTrack, album: { images: [changing({}, "url", imageUrl)] } },
      ],
      total: 1,
    },
  ]
  for (const payload of payloads)
    await assert.rejects(
      gateway.getTopItems({
        accessToken,
        kind: "tracks",
        timeRange: "short_term",
        fetchImpl: async () => response(payload),
      }),
      safeError("invalid_response"),
    )
  assert.equal(reads, 0)
})

test("provider proxies at records and array boundaries are rejected without field traps", async () => {
  let reads = 0
  const proxy = value =>
    new Proxy(value, {
      get(target, field) {
        // Let async mock JSON resolve; the gateway must reject before other field reads.
        if (field === "then") return undefined
        reads++
        throw new Error("discard")
      },
    })
  for (const payload of [
    proxy({ items: [rawTrack], total: 1 }),
    { items: proxy([rawTrack]), total: 1 },
    { items: [proxy(rawTrack)], total: 1 },
    { items: [{ ...rawTrack, artists: proxy([rawArtist]) }], total: 1 },
    { items: [{ ...rawTrack, artists: [proxy(rawArtist)] }], total: 1 },
    { items: [{ ...rawTrack, album: proxy({ images: [] }) }], total: 1 },
    {
      items: [{ ...rawTrack, album: { images: proxy([{ url: imageUrl }]) } }],
      total: 1,
    },
    {
      items: [{ ...rawTrack, album: { images: [proxy({ url: imageUrl })] } }],
      total: 1,
    },
  ])
    await assert.rejects(
      gateway.getTopItems({
        accessToken,
        kind: "tracks",
        timeRange: "short_term",
        fetchImpl: async () => response(payload),
      }),
      safeError("invalid_response"),
    )
  assert.equal(reads, 0)
})

test("sparse or non-plain arrays and records fail instead of shifting ranks", async () => {
  const inherited = Object.create(rawTrack)
  const customItems = [rawTrack]
  Object.setPrototypeOf(customItems, null)
  let indexReads = 0
  const accessorItems = Object.defineProperty([rawTrack], "0", {
    enumerable: true,
    get() {
      indexReads++
      return rawTrack
    },
  })
  for (const payload of [
    { items: Array(1), total: 1 },
    { items: customItems, total: 1 },
    { items: accessorItems, total: 1 },
    { items: [inherited], total: 1 },
    { items: [{ ...rawTrack, artists: Array(1) }], total: 1 },
    { items: [{ ...rawTrack, album: { images: Array(1) } }], total: 1 },
  ])
    await assert.rejects(
      gateway.getTopItems({
        accessToken,
        kind: "tracks",
        timeRange: "short_term",
        fetchImpl: async () => response(payload),
      }),
      safeError("invalid_response"),
    )
  assert.equal(indexReads, 0)
})

test("native Response and Headers remain supported by the guarded provider boundary", async () => {
  const result = await gateway.getCurrentUser({
    accessToken,
    fetchImpl: async () =>
      new Response(
        JSON.stringify({ id: "fixture-user", images: [{ url: imageUrl }] }),
      ),
  })
  assert.deepEqual(result, {
    id: "fixture-user",
    displayName: "fixture-user",
    imageUrl,
  })
  await assert.rejects(
    gateway.getCurrentUser({
      accessToken,
      fetchImpl: async () =>
        new Response(null, { status: 429, headers: { "Retry-After": "4" } }),
    }),
    safeError("rate_limited", 4),
  )
})

test("multiple top items preserve non-alphabetical source order and contain only fresh metadata", async () => {
  const source = ["Zebra", "Alpha", "Middle"].map((name, index) => ({
    ...rawArtist,
    id: String(index).repeat(22),
    name,
  }))
  const result = await gateway.getTopItems({
    accessToken,
    kind: "artists",
    timeRange: "medium_term",
    fetchImpl: async () => response({ items: source, total: 12 }),
  })
  assert.deepEqual(result, {
    items: source.map(value => ({
      id: value.id,
      name: value.name,
      spotifyUrl: `https://open.spotify.com/artist/${value.id}`,
      imageUrl,
    })),
    total: 12,
  })
  assert.notEqual(result.items, source)
  for (let index = 0; index < source.length; index++) {
    assert.notEqual(result.items[index], source[index])
    source[index].name = "Changed"
  }
  assert.deepEqual(
    result.items.map(value => value.name),
    ["Zebra", "Alpha", "Middle"],
  )
})

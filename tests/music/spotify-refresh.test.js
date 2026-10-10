const test = require("node:test")
const assert = require("node:assert/strict")

const portrait = require("../../content/music/portrait.json")
const {
  REQUEST_TIMEOUT_MS,
  createSpotifyGateway,
  getSpotifyAppToken,
} = require("../../api/_spotify/client")
const { refreshSpotifyCatalogue } = require("../../api/_spotify/refresh")
const { createCatalogueHandler } = require("../../api/spotify-catalogue")
const { createRefreshHandler } = require("../../api/spotify-refresh")

const NOW = "2026-10-09T09:00:00.000Z"
const ARTIST_IDS = Object.values(portrait.artists).map(
  artist => artist.spotifyArtistId,
)
const TRACK_IDS = Object.values(portrait.tracks).map(
  track => track.spotifyTrackId,
)

const artistResponse = id => ({
  id,
  name: id,
  external_urls: { spotify: `https://open.spotify.com/artist/${id}` },
  images: [],
})
const trackResponse = id => ({
  id,
  name: id,
  external_urls: { spotify: `https://open.spotify.com/track/${id}` },
  album: { images: [] },
  artists: [artistResponse(ARTIST_IDS[0])],
})

function fakeResponse() {
  return {
    statusCode: 200,
    headers: {},
    body: null,
    setHeader(name, value) {
      this.headers[name] = value
    },
    status(value) {
      this.statusCode = value
      return this
    },
    json(value) {
      this.body = value
      return this
    },
  }
}

test("app authentication uses POST form encoding and an eight-second boundary", async () => {
  let request
  const token = await getSpotifyAppToken({
    clientId: "client-id",
    clientSecret: "client-secret",
    fetchImpl: async (url, options) => {
      request = { url, options }
      return {
        ok: true,
        json: async () => ({ access_token: "temporary-token" }),
      }
    },
  })

  assert.equal(token, "temporary-token")
  assert.equal(request.url, "https://accounts.spotify.com/api/token")
  assert.equal(request.options.method, "POST")
  assert.equal(
    request.options.headers["Content-Type"],
    "application/x-www-form-urlencoded",
  )
  assert.equal(request.options.body.toString(), "grant_type=client_credentials")
  assert.ok(request.options.signal instanceof AbortSignal)
  assert.equal(REQUEST_TIMEOUT_MS, 8000)
})

test("refresh never exceeds four active requests and writes one complete snapshot", async () => {
  let active = 0
  let maximum = 0
  const writes = []
  const gateway = {
    async getArtist(id) {
      active += 1
      maximum = Math.max(maximum, active)
      await new Promise(resolve => setImmediate(resolve))
      active -= 1
      return artistResponse(id)
    },
    async getTrack(id) {
      active += 1
      maximum = Math.max(maximum, active)
      await new Promise(resolve => setImmediate(resolve))
      active -= 1
      return trackResponse(id)
    },
  }

  const result = await refreshSpotifyCatalogue({
    getAccessToken: async () => "temporary-token",
    getSelection: async () => ({ artistIds: ARTIST_IDS, trackIds: TRACK_IDS }),
    createGateway: () => gateway,
    store: { write: async snapshot => writes.push(snapshot) },
    now: () => new Date(NOW),
  })

  assert.equal(maximum <= 4, true)
  assert.equal(writes.length, 1)
  assert.equal(Object.keys(writes[0].artists).length, 10)
  assert.equal(Object.keys(writes[0].tracks).length, 30)
  assert.deepEqual(result, {
    status: "updated",
    generatedAt: NOW,
    expiresAt: "2026-10-16T09:00:00.000Z",
  })
})

test("a failed or mismatched request never replaces the previous snapshot", async () => {
  const previous = { marker: "previous" }
  let current = previous
  const gateway = {
    getArtist: async id => artistResponse(id),
    getTrack: async id => ({ ...trackResponse(id), id: ARTIST_IDS[0] }),
  }

  await assert.rejects(
    refreshSpotifyCatalogue({
      getAccessToken: async () => "temporary-token",
      getSelection: async () => ({
        artistIds: ARTIST_IDS.slice(0, 1),
        trackIds: TRACK_IDS.slice(0, 1),
      }),
      createGateway: () => gateway,
      store: {
        write: async snapshot => {
          current = snapshot
        },
      },
      now: () => new Date(NOW),
    }),
    /Spotify catalogue refresh failed/,
  )
  assert.equal(current, previous)
})

test("public catalogue handler is GET-only and returns unavailable for missing data", async () => {
  const handler = createCatalogueHandler({
    store: { read: async () => null },
    now: () => Date.parse(NOW),
  })
  const post = fakeResponse()
  await handler({ method: "POST", headers: {} }, post)
  assert.equal(post.statusCode, 405)

  const get = fakeResponse()
  await handler({ method: "GET", headers: {} }, get)
  assert.equal(get.statusCode, 503)
  assert.deepEqual(get.body, { status: "unavailable" })
})

test("public catalogue handler rejects expired data", async () => {
  const generatedAt = "2026-10-01T09:00:00.000Z"
  const gateway = createSpotifyGateway({
    accessToken: "temporary-token",
    fetchImpl: async url => ({
      ok: true,
      status: 200,
      json: async () =>
        url.includes("/artists/")
          ? artistResponse(ARTIST_IDS[0])
          : trackResponse(TRACK_IDS[0]),
    }),
  })
  const snapshot = await refreshSpotifyCatalogue({
    getAccessToken: async () => "temporary-token",
    getSelection: async () => ({
      artistIds: ARTIST_IDS.slice(0, 1),
      trackIds: TRACK_IDS.slice(0, 1),
    }),
    createGateway: () => gateway,
    store: { write: async () => {} },
    now: () => new Date(generatedAt),
  }).then(async () => {
    const { mapSpotifyCatalogue } = require("../../api/_spotify/catalogue")
    return mapSpotifyCatalogue({
      artists: [artistResponse(ARTIST_IDS[0])],
      tracks: [trackResponse(TRACK_IDS[0])],
      generatedAt,
    })
  })
  const handler = createCatalogueHandler({
    store: { read: async () => snapshot },
    now: () => Date.parse("2026-10-09T09:00:00.000Z"),
  })
  const response = fakeResponse()
  await handler({ method: "GET", headers: {} }, response)
  assert.equal(response.statusCode, 503)
})

test("refresh handler rejects missing and incorrect cron credentials", async () => {
  let calls = 0
  const handler = createRefreshHandler({
    cronSecret: "expected-secret",
    refresh: async () => {
      calls += 1
      return { status: "updated" }
    },
  })

  for (const authorization of [undefined, "Bearer incorrect-secret"]) {
    const response = fakeResponse()
    await handler({ method: "GET", headers: { authorization } }, response)
    assert.equal(response.statusCode, 401)
    assert.deepEqual(response.body, { status: "unauthorised" })
  }
  assert.equal(calls, 0)
})

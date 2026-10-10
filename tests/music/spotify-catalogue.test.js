const test = require("node:test")
const assert = require("node:assert/strict")

const {
  mapSpotifyCatalogue,
  spotifyEntityUrl,
  toPublicCatalogue,
  validateCatalogueSnapshot,
} = require("../../api/_spotify/catalogue")

const ARTIST_ID = "2AyLrA3GFbgbrjOjVnGcny"
const TRACK_ID = "3NsZZpRmWNGvE0WmCuZPAu"
const GENERATED_AT = "2026-10-09T09:00:00.000Z"

function makeSnapshot() {
  return mapSpotifyCatalogue({
    generatedAt: GENERATED_AT,
    artists: [
      {
        id: ARTIST_ID,
        name: "Aukai",
        external_urls: { spotify: spotifyEntityUrl("artist", ARTIST_ID) },
        images: [{ url: "https://i.scdn.co/image/aukai" }],
      },
    ],
    tracks: [
      {
        id: TRACK_ID,
        name: "Slow Sun",
        external_urls: { spotify: spotifyEntityUrl("track", TRACK_ID) },
        album: { images: [{ url: "https://i.scdn.co/image/slow-sun" }] },
        artists: [
          {
            id: ARTIST_ID,
            name: "Aukai",
            external_urls: { spotify: spotifyEntityUrl("artist", ARTIST_ID) },
          },
        ],
      },
    ],
  })
}

test("maps a canonical seven-day Spotify catalogue snapshot", () => {
  const snapshot = makeSnapshot()

  assert.equal(snapshot.generatedAt, GENERATED_AT)
  assert.equal(snapshot.expiresAt, "2026-10-16T09:00:00.000Z")
  assert.equal(
    snapshot.artists[ARTIST_ID].spotifyUrl,
    spotifyEntityUrl("artist", ARTIST_ID),
  )
  assert.equal(
    snapshot.tracks[TRACK_ID].spotifyUrl,
    spotifyEntityUrl("track", TRACK_ID),
  )
  assert.deepEqual(
    validateCatalogueSnapshot(snapshot, { now: Date.parse(GENERATED_AT) }),
    snapshot,
  )
})

test("rejects malformed IDs, mismatched keys and non-canonical URLs", () => {
  const badId = makeSnapshot()
  badId.artists.bad = { ...badId.artists[ARTIST_ID], id: "short" }
  delete badId.artists[ARTIST_ID]
  assert.throws(() =>
    validateCatalogueSnapshot(badId, { now: Date.parse(GENERATED_AT) }),
  )

  const badKey = makeSnapshot()
  badKey.artists[TRACK_ID] = badKey.artists[ARTIST_ID]
  delete badKey.artists[ARTIST_ID]
  assert.throws(() =>
    validateCatalogueSnapshot(badKey, { now: Date.parse(GENERATED_AT) }),
  )

  const badUrl = makeSnapshot()
  badUrl.tracks[TRACK_ID].spotifyUrl = "https://example.com/track"
  assert.throws(() =>
    validateCatalogueSnapshot(badUrl, { now: Date.parse(GENERATED_AT) }),
  )
})

test("enforces catalogue limits and canonical expiry", () => {
  const tooManyArtists = makeSnapshot()
  tooManyArtists.artists = Object.fromEntries(
    Array.from({ length: 21 }, (_, index) => {
      const id = `${String(index).padStart(2, "0")}abcdefghijklmnopqrst`
      return [
        id,
        {
          id,
          name: `Artist ${index}`,
          spotifyUrl: spotifyEntityUrl("artist", id),
        },
      ]
    }),
  )
  assert.throws(() =>
    validateCatalogueSnapshot(tooManyArtists, {
      now: Date.parse(GENERATED_AT),
    }),
  )

  const wrongExpiry = makeSnapshot()
  wrongExpiry.expiresAt = "2026-10-15T09:00:00.000Z"
  assert.throws(() =>
    validateCatalogueSnapshot(wrongExpiry, { now: Date.parse(GENERATED_AT) }),
  )
})

test("rejects expired snapshots unless explicitly allowed", () => {
  const snapshot = makeSnapshot()
  const afterExpiry = Date.parse(snapshot.expiresAt) + 1

  assert.throws(() => validateCatalogueSnapshot(snapshot, { now: afterExpiry }))
  assert.deepEqual(
    validateCatalogueSnapshot(snapshot, {
      now: afterExpiry,
      allowExpired: true,
    }),
    snapshot,
  )
})

test("public projection drops unexpected private fields", () => {
  const snapshot = makeSnapshot()
  const projected = toPublicCatalogue({
    ...snapshot,
    accessToken: "not-public",
    storageKey: "not-public",
  })

  assert.equal(projected.accessToken, undefined)
  assert.equal(projected.storageKey, undefined)
  assert.deepEqual(projected.attribution, {
    provider: "Spotify",
    providerUrl: "https://www.spotify.com/",
  })
})

const SPOTIFY_ID = /^[A-Za-z0-9]{22}$/
const SNAPSHOT_FIELDS = new Set([
  "schemaVersion",
  "generatedAt",
  "expiresAt",
  "artists",
  "tracks",
  "attribution",
])
const ARTIST_FIELDS = new Set(["id", "name", "spotifyUrl", "imageUrl"])
const TRACK_FIELDS = new Set([
  "id",
  "name",
  "spotifyUrl",
  "imageUrl",
  "artists",
])
const CONTRIBUTOR_FIELDS = new Set(["id", "name", "spotifyUrl"])

function spotifyEntityUrl(kind, id) {
  return `https://open.spotify.com/${kind}/${id}`
}

function assert(condition, message) {
  if (!condition) throw new Error(`Spotify catalogue is invalid: ${message}`)
}

function assertStrictObject(value, fields, path) {
  assert(
    value && typeof value === "object" && !Array.isArray(value),
    `${path} must be an object`,
  )
  for (const key of Object.keys(value))
    assert(fields.has(key), `${path}.${key} is not allowed`)
}

function assertCanonicalTime(value, path) {
  const parsed = Date.parse(value)
  assert(
    Number.isFinite(parsed) && new Date(parsed).toISOString() === value,
    `${path} must be canonical ISO time`,
  )
  return parsed
}

function assertEntity(kind, key, value, fields, path) {
  assertStrictObject(value, fields, path)
  assert(SPOTIFY_ID.test(key), `${path} key must be a Spotify ID`)
  assert(value.id === key, `${path}.id must match its record key`)
  assert(
    typeof value.name === "string" && value.name.length > 0,
    `${path}.name is required`,
  )
  assert(
    value.spotifyUrl === spotifyEntityUrl(kind, key),
    `${path}.spotifyUrl must be canonical`,
  )
  if (value.imageUrl !== undefined) {
    assert(
      /^https:\/\//.test(value.imageUrl),
      `${path}.imageUrl must use HTTPS`,
    )
  }
}

function validateCatalogueSnapshot(
  value,
  { now = Date.now(), allowExpired = false } = {},
) {
  assertStrictObject(value, SNAPSHOT_FIELDS, "catalogue")
  assert(value.schemaVersion === 1, "schemaVersion must be 1")
  const generated = assertCanonicalTime(value.generatedAt, "generatedAt")
  const expires = assertCanonicalTime(value.expiresAt, "expiresAt")
  assert(
    expires - generated === 7 * 24 * 60 * 60 * 1000,
    "expiry must be exactly seven days",
  )
  if (!allowExpired) assert(expires > now, "snapshot is expired")

  assertStrictObject(
    value.artists,
    new Set(Object.keys(value.artists || {})),
    "artists",
  )
  assertStrictObject(
    value.tracks,
    new Set(Object.keys(value.tracks || {})),
    "tracks",
  )
  assert(
    Object.keys(value.artists).length <= 20,
    "supports at most twenty artists",
  )
  assert(
    Object.keys(value.tracks).length <= 30,
    "supports at most thirty tracks",
  )

  for (const [key, artist] of Object.entries(value.artists)) {
    assertEntity("artist", key, artist, ARTIST_FIELDS, `artists.${key}`)
  }
  for (const [key, track] of Object.entries(value.tracks)) {
    assertEntity("track", key, track, TRACK_FIELDS, `tracks.${key}`)
    assert(
      Array.isArray(track.artists) && track.artists.length > 0,
      `tracks.${key}.artists is required`,
    )
    track.artists.forEach((artist, index) => {
      const path = `tracks.${key}.artists.${index}`
      assertStrictObject(artist, CONTRIBUTOR_FIELDS, path)
      assert(SPOTIFY_ID.test(artist.id), `${path}.id must be a Spotify ID`)
      assert(
        typeof artist.name === "string" && artist.name.length > 0,
        `${path}.name is required`,
      )
      assert(
        artist.spotifyUrl === spotifyEntityUrl("artist", artist.id),
        `${path}.spotifyUrl must be canonical`,
      )
    })
  }

  assertStrictObject(
    value.attribution,
    new Set(["provider", "providerUrl"]),
    "attribution",
  )
  assert(value.attribution.provider === "Spotify", "provider must be Spotify")
  assert(
    value.attribution.providerUrl === "https://www.spotify.com/",
    "provider URL is invalid",
  )
  return value
}

function mapSpotifyCatalogue({ artists, tracks, generatedAt }) {
  const generated = assertCanonicalTime(generatedAt, "generatedAt")
  const snapshot = {
    schemaVersion: 1,
    generatedAt,
    expiresAt: new Date(generated + 7 * 24 * 60 * 60 * 1000).toISOString(),
    artists: Object.fromEntries(
      artists.map(artist => [
        artist.id,
        {
          id: artist.id,
          name: artist.name,
          spotifyUrl: spotifyEntityUrl("artist", artist.id),
          ...(artist.images?.[0]?.url
            ? { imageUrl: artist.images[0].url }
            : {}),
        },
      ]),
    ),
    tracks: Object.fromEntries(
      tracks.map(track => [
        track.id,
        {
          id: track.id,
          name: track.name,
          spotifyUrl: spotifyEntityUrl("track", track.id),
          ...(track.album?.images?.[0]?.url
            ? { imageUrl: track.album.images[0].url }
            : {}),
          artists: track.artists.map(artist => ({
            id: artist.id,
            name: artist.name,
            spotifyUrl: spotifyEntityUrl("artist", artist.id),
          })),
        },
      ]),
    ),
    attribution: {
      provider: "Spotify",
      providerUrl: "https://www.spotify.com/",
    },
  }
  return validateCatalogueSnapshot(snapshot, { now: generated })
}

function toPublicCatalogue(value) {
  const publicSnapshot = {
    schemaVersion: value.schemaVersion,
    generatedAt: value.generatedAt,
    expiresAt: value.expiresAt,
    artists: Object.fromEntries(
      Object.entries(value.artists).map(([id, artist]) => [
        id,
        Object.fromEntries(
          Object.entries(artist).filter(([key]) => ARTIST_FIELDS.has(key)),
        ),
      ]),
    ),
    tracks: Object.fromEntries(
      Object.entries(value.tracks).map(([id, track]) => [
        id,
        {
          ...Object.fromEntries(
            Object.entries(track).filter(([key]) => TRACK_FIELDS.has(key)),
          ),
          artists: track.artists.map(artist =>
            Object.fromEntries(
              Object.entries(artist).filter(([key]) =>
                CONTRIBUTOR_FIELDS.has(key),
              ),
            ),
          ),
        },
      ]),
    ),
    attribution: {
      provider: value.attribution.provider,
      providerUrl: value.attribution.providerUrl,
    },
  }
  return validateCatalogueSnapshot(publicSnapshot, {
    now: Date.parse(publicSnapshot.generatedAt),
    allowExpired: true,
  })
}

module.exports = {
  mapSpotifyCatalogue,
  spotifyEntityUrl,
  toPublicCatalogue,
  validateCatalogueSnapshot,
}

const MAX_BOUND_USERS = 5
const AUTOMATIC_PLANET_LIMIT = 16
const MAX_PLANETS = 20
const MAX_MOONS = 3
const SPOTIFY_ID = /^[A-Za-z0-9]{22}$/
const REGIONS = ["familiar_seas", "inner_waters", "outer_reaches"]
const RANGES = ["short_term", "medium_term", "long_term"]
const ENTITY_FIELDS = ["id", "name", "spotifyUrl", "imageUrl"]

function check(condition, message) {
  if (!condition) throw new Error(`Music beta record is invalid: ${message}`)
}

function object(value, fields) {
  check(
    value !== null && typeof value === "object" && !Array.isArray(value),
    "expected an object",
  )
  check(
    Object.getPrototypeOf(value) === Object.prototype ||
      Object.getPrototypeOf(value) === null,
    "expected a plain object",
  )
  check(
    Reflect.ownKeys(value).every(key => fields.includes(key)),
    "unexpected field",
  )
  check(
    Object.values(Object.getOwnPropertyDescriptors(value)).every(
      d => "value" in d && d.enumerable,
    ),
    "expected data fields",
  )
}

function text(value, max = 200, allowEmpty = false) {
  check(
    typeof value === "string" &&
      value.length <= max &&
      (allowEmpty || value.trim().length > 0),
    "invalid text",
  )
}

function integer(value, min, max) {
  check(
    Number.isSafeInteger(value) && value >= min && value <= max,
    "invalid integer",
  )
}

function time(value) {
  check(
    typeof value === "string" &&
      Number.isFinite(Date.parse(value)) &&
      new Date(value).toISOString() === value,
    "expected canonical ISO timestamp",
  )
}

function nullableTime(value) {
  if (value !== null) time(value)
}

function image(value) {
  if (value === undefined) return
  check(
    typeof value === "string" &&
      /^https:\/\/i\.scdn\.co\/image\/[A-Za-z0-9]+$/.test(value),
    "invalid Spotify image URL",
  )
}

function id(value) {
  check(
    typeof value === "string" && SPOTIFY_ID.test(value),
    "invalid Spotify ID",
  )
}

function entity(value, kind, fields) {
  object(value, fields)
  id(value.id)
  text(value.name)
  check(
    value.spotifyUrl === `https://open.spotify.com/${kind}/${value.id}`,
    "expected canonical Spotify URL",
  )
  image(value.imageUrl)
}

function unique(values, key = value => value) {
  const seen = new Set()
  for (let index = 0; index < values.length; index++) {
    const identity = key(values[index])
    check(!seen.has(identity), "duplicate identity")
    seen.add(identity)
  }
}

function array(value) {
  check(
    Array.isArray(value) && Object.getPrototypeOf(value) === Array.prototype,
    "invalid array prototype",
  )
  check(
    Reflect.ownKeys(value).length === value.length + 1,
    "invalid array fields",
  )
  for (let index = 0; index < value.length; index++) {
    const descriptor = Object.getOwnPropertyDescriptor(value, String(index))
    check(
      descriptor && descriptor.enumerable && "value" in descriptor,
      "invalid array index",
    )
  }
}

function ids(values) {
  array(values)
  check(values.length > 0, "invalid credited artists")
  const credited = new Set()
  for (let index = 0; index < values.length; index++) {
    id(values[index])
    credited.add(values[index])
  }
  unique(values)
  return credited
}

function validateOwnerRecord(value) {
  object(value, [
    "schemaVersion",
    "ownerId",
    "spotifyUserId",
    "boundUserNumber",
    "displayName",
    "imageUrl",
    "encryptedRefreshToken",
    "tokenExpiresAt",
    "inviteHash",
    "sessionVersion",
    "paused",
    "reconnectRequired",
    "refreshStatus",
    "createdAt",
    "updatedAt",
    "lastSuccessfulUpdateAt",
    "lastManualRefreshAt",
  ])
  check(value.schemaVersion === 1, "unsupported owner schema")
  text(value.ownerId)
  text(value.spotifyUserId)
  integer(value.boundUserNumber, 1, MAX_BOUND_USERS)
  text(value.displayName)
  image(value.imageUrl)
  const token = value.encryptedRefreshToken
  object(token, ["keyVersion", "iv", "ciphertext", "tag"])
  integer(token.keyVersion, 1, Number.MAX_SAFE_INTEGER)
  for (const [field, bytes] of [
    ["iv", 12],
    ["tag", 16],
    ["ciphertext", null],
  ]) {
    check(
      typeof token[field] === "string" && /^[A-Za-z0-9_-]+$/.test(token[field]),
      "invalid encrypted token",
    )
    const decoded = Buffer.from(token[field], "base64url")
    check(
      decoded.toString("base64url") === token[field] &&
        (bytes === null || decoded.length === bytes),
      "invalid encrypted token encoding",
    )
  }
  check(
    typeof value.inviteHash === "string" &&
      /^[a-f0-9]{64}$/.test(value.inviteHash),
    "invalid invite hash",
  )
  integer(value.sessionVersion, 1, Number.MAX_SAFE_INTEGER)
  check(
    typeof value.paused === "boolean" &&
      typeof value.reconnectRequired === "boolean",
    "invalid owner state",
  )
  check(
    [
      "idle",
      "refreshing",
      "retry_pending",
      "failed",
      "reconnect_required",
    ].includes(value.refreshStatus),
    "invalid refresh status",
  )
  for (const field of ["createdAt", "updatedAt", "tokenExpiresAt"])
    time(value[field])
  for (const field of ["lastSuccessfulUpdateAt", "lastManualRefreshAt"])
    nullableTime(value[field])
  check(value.updatedAt >= value.createdAt, "owner update precedes creation")
  return value
}

function validateEvidence(value) {
  object(value, [
    "schemaVersion",
    "generatorVersion",
    "fetchedAt",
    "artists",
    "tracks",
  ])
  check(
    value.schemaVersion === 1 && value.generatorVersion === 1,
    "unsupported evidence version",
  )
  time(value.fetchedAt)
  const creditedArtistIds = new Set()
  for (const kind of ["track", "artist"]) {
    const entries = value[`${kind}s`]
    array(entries)
    check(
      kind === "artist" || entries.length <= 150,
      "invalid evidence entries",
    )
    for (let index = 0; index < entries.length; index++) {
      const entry = entries[index]
      entity(entry, kind, [
        ...ENTITY_FIELDS,
        "ranks",
        ...(kind === "track" ? ["artistIds"] : []),
      ])
      if (kind === "track") {
        ids(entry.artistIds)
        for (let credit = 0; credit < entry.artistIds.length; credit++)
          creditedArtistIds.add(entry.artistIds[credit])
      }
      object(entry.ranks, RANGES)
      check(
        Object.keys(entry.ranks).length > 0 ||
          (kind === "artist" && creditedArtistIds.has(entry.id)),
        "missing rank evidence",
      )
      Object.values(entry.ranks).forEach(rank => integer(rank, 1, 50))
    }
    unique(entries, entry => entry.id)
    for (const range of RANGES) {
      const ranks = []
      for (let index = 0; index < entries.length; index++) {
        const rank = entries[index].ranks[range]
        if (rank !== undefined) ranks.push(rank)
      }
      unique(ranks)
    }
  }
  return value
}

function validateOverrides(value) {
  object(value, Object.keys(value || {}))
  for (const [artistId, choices] of Object.entries(value)) {
    id(artistId)
    object(choices, ["pinned", "region", "note"])
    check(typeof choices.pinned === "boolean", "invalid pin")
    if (choices.region !== undefined)
      check(REGIONS.includes(choices.region), "invalid region")
    if (choices.note !== undefined) text(choices.note, 500, true)
  }
  return value
}

function validatePublicOwner(value) {
  object(value, ["displayName", "initials", "imageUrl"])
  text(value.displayName)
  text(value.initials, 4)
  image(value.imageUrl)
  return value
}

function toPublicOwner(value) {
  validatePublicOwner(value)
  return copyFields(value, ["displayName", "initials", "imageUrl"])
}

function validatePublicSnapshot(value) {
  object(value, [
    "schemaVersion",
    "rendererVersion",
    "generatorVersion",
    "snapshotId",
    "generatedAt",
    "lastSuccessfulUpdateAt",
    "owner",
    "planets",
  ])
  check(
    value.schemaVersion === 1 &&
      value.rendererVersion === 1 &&
      value.generatorVersion === 1,
    "unsupported snapshot version",
  )
  text(value.snapshotId)
  time(value.generatedAt)
  time(value.lastSuccessfulUpdateAt)
  check(
    value.lastSuccessfulUpdateAt <= value.generatedAt,
    "update follows snapshot generation",
  )
  validatePublicOwner(value.owner)
  array(value.planets)
  check(value.planets.length <= MAX_PLANETS, "invalid planet count")
  for (let index = 0; index < value.planets.length; index++) {
    const planet = value.planets[index]
    entity(planet, "artist", [
      ...ENTITY_FIELDS,
      "size",
      "region",
      "note",
      "layoutSeed",
      "moons",
    ])
    integer(planet.size, 1, 5)
    integer(planet.layoutSeed, 0, Number.MAX_SAFE_INTEGER)
    check(REGIONS.includes(planet.region), "invalid region")
    text(planet.note, 500, true)
    array(planet.moons)
    check(planet.moons.length <= MAX_MOONS, "invalid moon count")
    for (let moonIndex = 0; moonIndex < planet.moons.length; moonIndex++) {
      const moon = planet.moons[moonIndex]
      entity(moon, "track", [...ENTITY_FIELDS, "artistIds", "introducedAt"])
      const credited = ids(moon.artistIds)
      check(credited.has(planet.id), "moon must credit its planet")
      time(moon.introducedAt)
      check(
        moon.introducedAt <= value.generatedAt,
        "track introduction follows snapshot",
      )
    }
    unique(planet.moons, moon => moon.id)
  }
  unique(value.planets, planet => planet.id)
  return value
}

function toPublicSnapshot(value) {
  validatePublicSnapshot(value)
  const snapshot = copyFields(value, [
    "schemaVersion",
    "rendererVersion",
    "generatorVersion",
    "snapshotId",
    "generatedAt",
    "lastSuccessfulUpdateAt",
  ])
  snapshot.owner = toPublicOwner(value.owner)
  snapshot.planets = []
  for (let index = 0; index < value.planets.length; index++) {
    const source = value.planets[index]
    const planet = copyFields(source, [
      ...ENTITY_FIELDS,
      "size",
      "region",
      "note",
      "layoutSeed",
    ])
    planet.moons = []
    for (let moonIndex = 0; moonIndex < source.moons.length; moonIndex++) {
      const sourceMoon = source.moons[moonIndex]
      const moon = copyFields(sourceMoon, [...ENTITY_FIELDS, "introducedAt"])
      moon.artistIds = []
      for (let credit = 0; credit < sourceMoon.artistIds.length; credit++)
        moon.artistIds.push(sourceMoon.artistIds[credit])
      planet.moons.push(moon)
    }
    snapshot.planets.push(planet)
  }
  return snapshot
}

function copyFields(value, fields) {
  const result = {}
  for (const field of fields) {
    if (Object.hasOwn(value, field)) result[field] = value[field]
  }
  return result
}

module.exports = {
  MAX_BOUND_USERS,
  AUTOMATIC_PLANET_LIMIT,
  MAX_PLANETS,
  MAX_MOONS,
  validateOwnerRecord,
  validateEvidence,
  validateOverrides,
  validatePublicSnapshot,
  validatePublicOwner,
  toPublicOwner,
  toPublicSnapshot,
}

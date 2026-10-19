const { createHash } = require("node:crypto")
const { isProxy } = require("node:util").types
const {
  AUTOMATIC_PLANET_LIMIT,
  MAX_PLANETS,
  MAX_MOONS,
  validateEvidence,
  validateOverrides,
} = require("./contracts")

const RANGES = ["short_term", "medium_term", "long_term"]
const WEIGHTS = [5, 3, 2]
const ID = /^[A-Za-z0-9]{22}$/
const byId = (a, b) => (a.id < b.id ? -1 : a.id > b.id ? 1 : 0)
const byScore = (a, b) => b.score - a.score || byId(a, b)

function record(value) {
  if (!value || typeof value !== "object" || isProxy(value)) return null
  if (![Object.prototype, null].includes(Object.getPrototypeOf(value)))
    return null
  const descriptors = Object.getOwnPropertyDescriptors(value)
  if (
    Reflect.ownKeys(descriptors).some(
      key =>
        typeof key !== "string" ||
        !descriptors[key].enumerable ||
        !("value" in descriptors[key]),
    )
  )
    return null
  return value
}

function array(value, allowHoles = false) {
  if (
    !value ||
    isProxy(value) ||
    !Array.isArray(value) ||
    Object.getPrototypeOf(value) !== Array.prototype
  )
    return []
  const descriptors = Object.getOwnPropertyDescriptors(value)
  if (!allowHoles && Reflect.ownKeys(descriptors).length !== value.length + 1)
    return []
  if (
    Reflect.ownKeys(descriptors).some(
      key =>
        key !== "length" &&
        (typeof key !== "string" ||
          !/^(0|[1-9][0-9]*)$/.test(key) ||
          !descriptors[key].enumerable ||
          !("value" in descriptors[key])),
    )
  )
    return []
  return value
}

function catalogueEntity(source, kind) {
  const value = record(source)
  if (
    !value ||
    typeof value.id !== "string" ||
    !ID.test(value.id) ||
    typeof value.name !== "string" ||
    !value.name.trim() ||
    value.name.length > 200 ||
    value.spotifyUrl !== `https://open.spotify.com/${kind}/${value.id}`
  )
    return null
  if (
    value.imageUrl !== undefined &&
    (typeof value.imageUrl !== "string" ||
      !/^https:\/\/i\.scdn\.co\/image\/[A-Za-z0-9]+$/.test(value.imageUrl))
  )
    return null
  return {
    id: value.id,
    name: value.name,
    spotifyUrl: value.spotifyUrl,
    ...(value.imageUrl === undefined ? {} : { imageUrl: value.imageUrl }),
  }
}

function itemsByRange(source, visit) {
  const ranges = record(source)
  if (!ranges) return
  for (const range of RANGES) {
    const source = ranges[range]
    const items = array(
      Array.isArray(source) ? source : record(source)?.items,
      true,
    )
    const seen = new Set()
    for (let index = 0; index < Math.min(items.length, 50); index++) {
      // Keep provider positions even when a malformed row is omitted.
      if (!Object.hasOwn(items, index)) continue
      const value = record(items[index])
      if (!value || seen.has(value.id)) continue
      if (visit(value, range, index + 1)) seen.add(value.id)
    }
  }
}

function collectEvidence(topArtistsByRange, topTracksByRange) {
  const artists = new Map()
  const tracks = new Map()
  itemsByRange(topArtistsByRange, (value, range, rank) => {
    const artist = catalogueEntity(value, "artist")
    if (!artist) return false
    if (!artists.has(artist.id))
      artists.set(artist.id, { ...artist, ranks: {} })
    artists.get(artist.id).ranks[range] = rank
    return true
  })
  itemsByRange(topTracksByRange, (value, range, rank) => {
    const track = catalogueEntity(value, "track")
    const credits = array(value.artists).map(item =>
      catalogueEntity(item, "artist"),
    )
    const ids = array(value.artistIds)
    if (
      !track ||
      !credits.length ||
      credits.some(item => !item) ||
      ids.length !== credits.length ||
      new Set(ids).size !== ids.length ||
      !credits.every((item, index) => item.id === ids[index])
    )
      return false
    const previous = tracks.get(track.id)
    if (
      previous &&
      (previous.artistIds.length !== ids.length ||
        previous.artistIds.some((id, index) => id !== ids[index]))
    )
      return false
    if (!tracks.has(track.id))
      tracks.set(track.id, { ...track, artistIds: [...ids], ranks: {} })
    tracks.get(track.id).ranks[range] = rank
    for (const artist of credits) {
      if (!artists.has(artist.id))
        artists.set(artist.id, { ...artist, ranks: {} })
    }
    return true
  })
  return {
    artists: [...artists.values()].sort(byId),
    tracks: [...tracks.values()].sort(byId),
  }
}

function rankScore(rank) {
  if (!Number.isInteger(rank) || rank < 1 || rank > 50)
    throw new Error("Rank must be an integer from 1 to 50")
  return (51 - rank) / 50
}

const rankUnits = rank => (rank === undefined ? 0 : 51 - rank)
const weighted = (values, divisor) =>
  values.reduce((sum, value, index) => sum + value * WEIGHTS[index], 0) /
  divisor
// Equal-width bands: (0,.2], (.2,.4], (.4,.6], (.6,.8], (.8,1].
const sizeFor = score => Math.max(1, Math.ceil(score * 5))

function scoreTrackEvidence(evidence) {
  return evidence.tracks
    .map(track => ({
      ...track,
      score: weighted(
        RANGES.map(range => rankUnits(track.ranks[range])),
        500,
      ),
    }))
    .sort(byScore)
}

function scoreArtistEvidence(evidence) {
  return evidence.artists
    .map(artist => {
      const values = RANGES.map(range => {
        const bestTrack = evidence.tracks.reduce(
          (best, track) =>
            track.artistIds.includes(artist.id)
              ? Math.max(best, rankUnits(track.ranks[range]))
              : best,
          0,
        )
        return 7 * rankUnits(artist.ranks[range]) + 3 * bestTrack
      })
      // Integer numerators make mathematical ties independent of float addition order.
      const score = weighted(values, 5000)
      return {
        ...artist,
        rangeScores: Object.fromEntries(
          RANGES.map((range, index) => [range, values[index] / 500]),
        ),
        score,
        size: sizeFor(score),
      }
    })
    .sort(byScore)
}

function scoreArtists(topArtistsByRange, topTracksByRange) {
  return scoreArtistEvidence(
    collectEvidence(topArtistsByRange, topTracksByRange),
  )
}

function scoreTracks(topTracksByRange) {
  return scoreTrackEvidence(collectEvidence({}, topTracksByRange))
}

function assignRegions(scoredArtists) {
  const familiar = new Set(
    scoredArtists
      .filter(
        artist =>
          artist.ranks.medium_term !== undefined &&
          artist.ranks.long_term !== undefined,
      )
      .map(artist => artist.id),
  )
  const inner = new Set(
    scoredArtists
      .filter(artist => !familiar.has(artist.id))
      .slice()
      .sort(
        (a, b) =>
          b.rangeScores.short_term - a.rangeScores.short_term || byId(a, b),
      )
      .slice(0, 6)
      .map(artist => artist.id),
  )
  return scoredArtists.map(artist => ({
    ...artist,
    region: familiar.has(artist.id)
      ? "familiar_seas"
      : inner.has(artist.id)
        ? "inner_waters"
        : "outer_reaches",
  }))
}

function copyCatalogue(source) {
  const value = record(source)
  if (!value) throw new Error("Invalid portrait catalogue")
  return Object.fromEntries(
    ["artists", "tracks"].map(kind => {
      const rows = array(value[kind])
      if (rows !== value[kind]) throw new Error("Invalid portrait catalogue")
      const seen = new Set()
      const entries = rows.map(row => {
        const entity = catalogueEntity(
          row,
          kind === "artists" ? "artist" : "track",
        )
        if (!entity || seen.has(entity.id))
          throw new Error("Invalid portrait catalogue entity")
        seen.add(entity.id)
        if (kind === "artists") return entity
        const artistIds = array(row.artistIds)
        if (
          !artistIds.length ||
          artistIds.some(id => typeof id !== "string" || !ID.test(id)) ||
          new Set(artistIds).size !== artistIds.length
        )
          throw new Error("Invalid portrait catalogue credits")
        return { ...entity, artistIds: [...artistIds] }
      })
      return [kind, entries.sort(byId)]
    }),
  )
}

function catalogueFrom(evidence, previousCatalogue) {
  return Object.fromEntries(
    ["artists", "tracks"].map(kind => {
      const entries = new Map()
      for (const item of [
        ...(previousCatalogue?.[kind] || []),
        ...evidence[kind],
      ]) {
        const entity = catalogueEntity(
          item,
          kind === "artists" ? "artist" : "track",
        )
        entries.set(item.id, {
          ...entity,
          ...(kind === "tracks" ? { artistIds: [...item.artistIds] } : {}),
        })
      }
      return [kind, [...entries.values()].sort(byId)]
    }),
  )
}

function mergeOverrides(draft, overrides = {}) {
  validateEvidence(draft.evidence)
  validateOverrides(overrides)
  const catalogue = catalogueFrom(
    draft.evidence,
    copyCatalogue(draft.catalogue),
  )
  const artists = scoreArtistEvidence(draft.evidence)
  const allArtists = new Map(artists.map(artist => [artist.id, artist]))
  const catalogueArtists = new Map(
    catalogue.artists.map(artist => [artist.id, artist]),
  )
  const pins = Object.entries(overrides)
    .filter(([id, choice]) => choice.pinned && catalogueArtists.has(id))
    .map(([id]) => id)
    .sort()
  if (pins.length > MAX_PLANETS)
    throw new Error("At most 20 evidenced artists can be pinned")
  const selected = new Map(
    artists.slice(0, AUTOMATIC_PLANET_LIMIT).map(artist => [artist.id, artist]),
  )
  for (const id of pins) {
    selected.set(
      id,
      allArtists.get(id) || {
        id,
        ranks: {},
        rangeScores: { short_term: 0, medium_term: 0, long_term: 0 },
        score: 0,
        size: 1,
      },
    )
  }
  const pinned = new Set(pins)
  const ordered = [...selected.values()].sort(byScore)
  for (
    let index = ordered.length - 1;
    selected.size > MAX_PLANETS && index >= 0;
    index--
  ) {
    if (!pinned.has(ordered[index].id)) selected.delete(ordered[index].id)
  }
  const tracks = scoreTrackEvidence(draft.evidence)
  const planets = assignRegions(
    ordered.filter(artist => selected.has(artist.id)),
  ).map(artist => ({
    id: artist.id,
    size: artist.size,
    region: overrides[artist.id]?.region || artist.region,
    note: overrides[artist.id]?.note || "",
    layoutSeed: createHash("sha256")
      .update(`music-portrait-v1:${artist.id}`)
      .digest()
      .readUInt32BE(0),
    trackIds: tracks
      .filter(track => track.artistIds.includes(artist.id))
      .slice(0, MAX_MOONS)
      .map(track => track.id),
  }))
  const usedTracks = new Set(planets.flatMap(planet => planet.trackIds))
  return {
    schemaVersion: 1,
    rendererVersion: 1,
    generatorVersion: 1,
    evidence: structuredClone(draft.evidence),
    catalogue: {
      artists: catalogue.artists.filter(artist => selected.has(artist.id)),
      tracks: catalogue.tracks.filter(track => usedTracks.has(track.id)),
    },
    overrides: structuredClone(overrides),
    planets,
  }
}

function generatePortraitDraft(input) {
  const value = record(input)
  if (!value) throw new Error("Invalid portrait input")
  const {
    fetchedAt,
    topArtistsByRange,
    topTracksByRange,
    overrides = {},
    previousEvidence,
    previousCatalogue,
  } = value
  if (previousEvidence !== undefined) validateEvidence(previousEvidence)
  const evidence = validateEvidence({
    schemaVersion: 1,
    generatorVersion: 1,
    fetchedAt,
    ...collectEvidence(topArtistsByRange, topTracksByRange),
  })
  const retained =
    previousCatalogue === undefined
      ? previousEvidence
      : copyCatalogue(previousCatalogue)
  return mergeOverrides(
    { evidence, catalogue: catalogueFrom(evidence, retained) },
    overrides,
  )
}

module.exports = {
  rankScore,
  scoreArtists,
  scoreTracks,
  assignRegions,
  mergeOverrides,
  generatePortraitDraft,
}

const test = require("node:test")
const assert = require("node:assert/strict")
const {
  rankScore,
  scoreArtists,
  scoreTracks,
  assignRegions,
  mergeOverrides,
  generatePortraitDraft,
} = require("../../api/_music-beta/generator")
const {
  validateEvidence,
  validatePublicSnapshot,
} = require("../../api/_music-beta/contracts")
const {
  NOW,
  artistId,
  trackId,
  makeEvidence,
  makePublicSnapshot,
} = require("./fixtures/music-beta")

const artist = index => ({
  id: artistId(index),
  name: `Artist ${index}`,
  spotifyUrl: `https://open.spotify.com/artist/${artistId(index)}`,
})
const track = (index, credits = [artist(0)]) => ({
  id: trackId(index),
  name: `Track ${index}`,
  spotifyUrl: `https://open.spotify.com/track/${trackId(index)}`,
  artistIds: credits.map(item => item.id),
  artists: credits,
})
const input = (extra = {}) => ({ fetchedAt: NOW, ...extra })
const close = (actual, expected) =>
  assert.ok(Math.abs(actual - expected) < 1e-12, `${actual} != ${expected}`)

function publicProjection(draft) {
  const snapshot = makePublicSnapshot({ planetCount: 0 })
  snapshot.planets = draft.planets.map(({ id, trackIds, ...planet }) => ({
    ...draft.catalogue.artists.find(item => item.id === id),
    ...planet,
    moons: trackIds.map(trackId => ({
      ...draft.catalogue.tracks.find(item => item.id === trackId),
      introducedAt: NOW,
    })),
  }))
  return snapshot
}

test("rank score has exact endpoints and rejects out-of-range ranks", () => {
  assert.equal(rankScore(1), 1)
  assert.equal(rankScore(50), 0.02)
  assert.equal(rankScore(26), 0.5)
  for (const value of [0, 51, -1, 1.5, NaN, "1", null])
    assert.throws(() => rankScore(value))
})

test("artist weights combine direct rank and best credited track per range", () => {
  const a = artist(0)
  const scored = scoreArtists(
    { short_term: [null, a], medium_term: [a], long_term: [null, null, a] },
    {
      short_term: [track(0), track(1)],
      medium_term: [null, track(0)],
      long_term: [track(0)],
    },
  )[0]
  close(scored.rangeScores.short_term, 0.7 * 0.98 + 0.3)
  close(scored.rangeScores.medium_term, 0.7 + 0.3 * 0.98)
  close(scored.rangeScores.long_term, 0.7 * 0.96 + 0.3)
  close(
    scored.score,
    0.5 * (0.7 * 0.98 + 0.3) +
      0.3 * (0.7 + 0.3 * 0.98) +
      0.2 * (0.7 * 0.96 + 0.3),
  )
  assert.deepEqual(scored.ranks, {
    short_term: 2,
    medium_term: 1,
    long_term: 3,
  })
})

test("track weights use ranks directly and stable IDs break artist and track ties", () => {
  const tracks = {
    short_term: [track(1), track(0)],
    medium_term: [track(0), track(1)],
    long_term: [track(0), track(1)],
  }
  const result = scoreTracks(tracks)
  assert.deepEqual(
    result.map(item => item.id),
    [trackId(0), trackId(1)],
  )
  close(result[0].score, 0.5 * 0.98 + 0.3 + 0.2)
  const artists = scoreArtists(
    {},
    { short_term: [track(0, [artist(8), artist(2)])] },
  )
  assert.deepEqual(
    artists.map(item => item.id),
    [artistId(2), artistId(8)],
  )
  close(artists[0].score, 0.15)
  assert.deepEqual(artists[0].ranks, {})
})

test("familiar seas require both direct longer ranges; inner waters use short scores", () => {
  const artists = Array.from({ length: 10 }, (_, i) => artist(i))
  const scored = scoreArtists(
    {
      short_term: artists,
      medium_term: [artists[8]],
      long_term: [artists[8], artists[9]],
    },
    {},
  )
  const before = structuredClone(scored)
  const regions = assignRegions(scored)
  assert.deepEqual(scored, before)
  assert.equal(
    regions.find(item => item.id === artistId(8)).region,
    "familiar_seas",
  )
  assert.deepEqual(
    regions
      .filter(item => item.region === "inner_waters")
      .map(item => item.id)
      .sort(),
    artists.slice(0, 6).map(item => item.id),
  )
  assert.equal(
    regions.find(item => item.id === artistId(9)).region,
    "outer_reaches",
  )
})

test("five fixed score bands give distinct size values", () => {
  const ranges = {}
  const trackRanges = {}
  const artists = Array.from({ length: 50 }, (_, i) => artist(i))
  const tracks = artists.map((item, i) => track(i, [item]))
  for (const range of ["short_term", "medium_term", "long_term"]) {
    ranges[range] = artists
    trackRanges[range] = tracks
  }
  const scored = scoreArtists(ranges, trackRanges)
  for (const [index, size] of [
    [0, 5],
    [10, 4],
    [20, 3],
    [30, 2],
    [40, 1],
    [49, 1],
  ]) {
    assert.equal(scored.find(item => item.id === artistId(index)).size, size)
  }
})

test("selects strongest 16; pins expand to 20 then displace weakest automatic planets", () => {
  const artists = Array.from({ length: 30 }, (_, i) => artist(i))
  const base = input({ topArtistsByRange: { short_term: artists } })
  const draft = generatePortraitDraft(base)
  assert.deepEqual(
    draft.planets.map(item => item.id),
    artists.slice(0, 16).map(item => item.id),
  )
  const overrides = Object.fromEntries(
    artists.slice(20, 26).map(item => [item.id, { pinned: true }]),
  )
  const pinned = mergeOverrides(draft, overrides)
  assert.equal(pinned.planets.length, 20)
  assert.equal(pinned.catalogue.artists.length, 20)
  assert.ok(
    artists
      .slice(20, 26)
      .every(item => pinned.planets.some(planet => planet.id === item.id)),
  )
  assert.ok(!pinned.planets.some(item => item.id === artistId(14)))
  assert.deepEqual(
    draft.planets.map(item => item.id),
    artists.slice(0, 16).map(item => item.id),
  )
  assert.deepEqual(pinned, generatePortraitDraft({ ...base, overrides }))
  const tooMany = Object.fromEntries(
    artists.slice(0, 21).map(item => [item.id, { pinned: true }]),
  )
  assert.throws(() => mergeOverrides(draft, tooMany), /20/)
})

test("moons only use ranked tracks, with zero to three and no popularity filler", () => {
  const artists = Array.from({ length: 5 }, (_, i) => artist(i))
  const tracks = artists.flatMap((item, i) =>
    Array.from({ length: i }, (_, j) => ({
      ...track(i * 10 + j, [item]),
      popularity: 100 - j,
    })),
  )
  const draft = generatePortraitDraft(
    input({
      topArtistsByRange: { short_term: artists },
      topTracksByRange: { short_term: tracks },
    }),
  )
  for (let i = 0; i < 5; i++) {
    const planet = draft.planets.find(item => item.id === artistId(i))
    assert.equal(planet.trackIds.length, Math.min(i, 3))
    assert.deepEqual(
      planet.trackIds,
      Array.from({ length: Math.min(i, 3) }, (_, j) => trackId(i * 10 + j)),
    )
  }
  validatePublicSnapshot(publicProjection(draft))
})

test("empty and small normalised Task 4 results produce valid sparse drafts", () => {
  for (const topArtistsByRange of [
    {},
    { short_term: { items: [artist(0)], total: 1 } },
  ]) {
    const draft = generatePortraitDraft(input({ topArtistsByRange }))
    assert.equal(draft.planets.length, topArtistsByRange.short_term ? 1 : 0)
    validateEvidence(draft.evidence)
    validatePublicSnapshot(publicProjection(draft))
  }
})

test("malformed rows, duplicates and missing ranges preserve original provider ranks", () => {
  const topArtistsByRange = {
    short_term: [
      null,
      artist(0),
      artist(0),
      { ...artist(1), spotifyUrl: "javascript:bad" },
      artist(2),
    ],
    medium_term: "invalid",
  }
  const topTracksByRange = {
    short_term: [
      null,
      track(0),
      { ...track(1), artistIds: [artistId(9)] },
      { ...track(2), artists: [] },
      track(3, [artist(3)]),
    ],
  }
  const draft = generatePortraitDraft(
    input({ topArtistsByRange, topTracksByRange }),
  )
  validateEvidence(draft.evidence)
  assert.deepEqual(
    draft.evidence.artists.map(item => [item.id, item.ranks]),
    [
      [artistId(0), { short_term: 2 }],
      [artistId(2), { short_term: 5 }],
      [artistId(3), {}],
    ],
  )
  assert.deepEqual(
    draft.evidence.tracks.map(item => [item.id, item.ranks.short_term]),
    [
      [trackId(0), 2],
      [trackId(3), 5],
    ],
  )
  assert.ok(
    draft.planets.every(item =>
      [artistId(0), artistId(2), artistId(3)].includes(item.id),
    ),
  )
})

test("pins survive from previous evidence; notes and manual regions reattach on return", () => {
  const overrides = {
    [artistId(0)]: { pinned: true, note: "Keep", region: "outer_reaches" },
    [artistId(1)]: { pinned: false, note: "Remember", region: "familiar_seas" },
    [artistId(99)]: { pinned: true, note: "Unknown" },
  }
  const absent = generatePortraitDraft(
    input({ previousEvidence: makeEvidence(), overrides }),
  )
  assert.deepEqual(
    absent.planets.map(item => item.id),
    [artistId(0)],
  )
  assert.equal(absent.planets[0].note, "Keep")
  assert.equal(absent.planets[0].region, "outer_reaches")
  assert.deepEqual(absent.planets[0].trackIds, [])
  assert.deepEqual(
    absent.catalogue.artists.map(item => item.id),
    [artistId(0)],
  )
  assert.deepEqual(absent.catalogue.tracks, [])
  assert.deepEqual(absent.overrides, overrides)
  assert.deepEqual(absent.evidence.artists, [])
  const returned = generatePortraitDraft(
    input({
      topArtistsByRange: { short_term: [artist(1)] },
      overrides: absent.overrides,
      previousEvidence: makeEvidence(),
    }),
  )
  const planet = returned.planets.find(item => item.id === artistId(1))
  assert.equal(planet.note, "Remember")
  assert.equal(planet.region, "familiar_seas")
})

test("generation is deterministic, independent and separates ranks from catalogue and planets", () => {
  const source = input({
    topArtistsByRange: {
      short_term: [
        {
          ...artist(0),
          imageUrl: "https://i.scdn.co/image/fixture",
          accessToken: "synthetic",
        },
      ],
    },
    topTracksByRange: { short_term: [track(0)] },
    overrides: { [artistId(0)]: { pinned: false, note: "Note" } },
  })
  const before = structuredClone(source)
  const a = generatePortraitDraft(source)
  assert.deepEqual(a, generatePortraitDraft(source))
  assert.deepEqual(source, before)
  assert.deepEqual(Object.keys(a.planets[0]).sort(), [
    "id",
    "layoutSeed",
    "note",
    "region",
    "size",
    "trackIds",
  ])
  assert.deepEqual(Object.keys(a.catalogue.artists[0]).sort(), [
    "id",
    "imageUrl",
    "name",
    "spotifyUrl",
  ])
  assert.equal(JSON.stringify(a).includes("synthetic"), false)
  assert.equal(a.schemaVersion, 1)
  assert.equal(a.rendererVersion, 1)
  assert.equal(a.generatorVersion, 1)
  assert.ok(
    Number.isSafeInteger(a.planets[0].layoutSeed) &&
      a.planets[0].layoutSeed >= 0,
  )
  const shifted = generatePortraitDraft(
    input({ topArtistsByRange: { short_term: [artist(1), artist(0)] } }),
  )
  assert.equal(
    shifted.planets.find(item => item.id === artistId(0)).layoutSeed,
    a.planets[0].layoutSeed,
  )
  a.overrides[artistId(0)].note = "Changed"
  a.catalogue.artists[0].name = "Changed"
  assert.deepEqual(source, before)
})

test("invalid prior evidence, timestamps and authored overrides fail validation", () => {
  for (const change of [
    { fetchedAt: "invalid" },
    { previousEvidence: makeEvidence({ generatorVersion: 2 }) },
    { overrides: { [artistId(0)]: { pinned: true, region: "bad" } } },
  ]) {
    assert.throws(() => generatePortraitDraft(input(change)))
  }
})

test("malformed image rows and accessor metadata never reach the catalogue", () => {
  let calls = 0
  const accessor = artist(0)
  Object.defineProperty(accessor, "name", {
    enumerable: true,
    get() {
      calls++
      return "Hidden"
    },
  })
  const draft = generatePortraitDraft(
    input({
      topArtistsByRange: {
        short_term: [
          accessor,
          { ...artist(1), imageUrl: "https://evil.test/image" },
          artist(2),
        ],
      },
    }),
  )
  assert.equal(calls, 0)
  assert.deepEqual(
    draft.planets.map(item => item.id),
    [artistId(2)],
  )
  assert.equal(draft.evidence.artists[0].ranks.short_term, 3)
})

test("retained catalogue keeps pins across repeated absent refreshes without stale evidence", () => {
  const overrides = { [artistId(0)]: { pinned: true } }
  const first = generatePortraitDraft(
    input({ topArtistsByRange: { short_term: [artist(0)] }, overrides }),
  )
  const second = generatePortraitDraft(
    input({ previousCatalogue: first.catalogue, overrides }),
  )
  const third = generatePortraitDraft(
    input({ previousCatalogue: second.catalogue, overrides }),
  )
  for (const draft of [second, third]) {
    assert.deepEqual(
      draft.planets.map(item => item.id),
      [artistId(0)],
    )
    assert.deepEqual(draft.evidence.artists, [])
    assert.equal(draft.planets[0].size, 1)
    validatePublicSnapshot(publicProjection(draft))
  }
})

test("catalogue boundaries reject invalid entities and strip non-catalogue fields", () => {
  const draft = generatePortraitDraft(
    input({ topArtistsByRange: { short_term: [artist(0)] } }),
  )
  draft.catalogue.artists[0].accessToken = "synthetic"
  const merged = mergeOverrides(draft, {})
  assert.equal(JSON.stringify(merged).includes("synthetic"), false)
  draft.catalogue.artists[0].spotifyUrl = "https://evil.test"
  assert.throws(() => mergeOverrides(draft, {}))
  assert.throws(() =>
    generatePortraitDraft(input({ previousCatalogue: draft.catalogue })),
  )
})

test("holes and conflicting track credits cannot fabricate unranked artist evidence", () => {
  const broken = track(0)
  delete broken.artists[0]
  const artists = [artist(0), artist(1)]
  delete artists[0]
  const draft = generatePortraitDraft(
    input({
      topArtistsByRange: { short_term: artists },
      topTracksByRange: {
        short_term: [broken, track(1)],
        long_term: [track(1, [artist(2)])],
      },
    }),
  )
  validateEvidence(draft.evidence)
  assert.equal(
    draft.evidence.artists.find(item => item.id === artistId(1)).ranks
      .short_term,
    2,
  )
  assert.ok(!draft.evidence.artists.some(item => item.id === artistId(2)))
  assert.deepEqual(
    draft.evidence.tracks.map(item => item.id),
    [trackId(1)],
  )
})

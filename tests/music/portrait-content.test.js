const test = require("node:test")
const assert = require("node:assert/strict")

const portrait = require("../../content/music/portrait.json")
const { loadMusicPortrait } = require("../../src/lib/music/content")
const {
  collectSpotifyCatalogueIds,
  validateMusicPortrait,
} = require("../../scripts/music/portrait")

const clone = value => JSON.parse(JSON.stringify(value))

test("the approved portrait contains ten artists and thirty tracks", () => {
  const result = validateMusicPortrait(portrait)

  assert.deepEqual(result, { valid: true, errors: [] })
  assert.equal(Object.keys(portrait.artists).length, 10)
  assert.equal(Object.keys(portrait.tracks).length, 30)
  assert.deepEqual(
    portrait.chapters.in_rotation.members
      .filter(member => member.artistId === "aukai")
      .map(member => member.artistId),
    ["aukai"],
  )
  assert.deepEqual(
    portrait.chapters.creative_fuel.members
      .filter(member => member.artistId === "aukai")
      .map(member => member.artistId),
    ["aukai"],
  )
})

test("each artist has three tracks and valid Spotify identifiers", () => {
  const ids = collectSpotifyCatalogueIds(portrait)
  const tracksByArtist = Object.values(portrait.tracks).reduce(
    (counts, track) => ({
      ...counts,
      [track.placement.artistId]: (counts[track.placement.artistId] || 0) + 1,
    }),
    {},
  )

  assert.equal(new Set(ids.artistIds).size, 10)
  assert.equal(new Set(ids.trackIds).size, 30)
  assert.ok(ids.artistIds.every(id => /^[A-Za-z0-9]{22}$/.test(id)))
  assert.ok(ids.trackIds.every(id => /^[A-Za-z0-9]{22}$/.test(id)))
  assert.ok(Object.values(tracksByArtist).every(count => count === 3))
  assert.ok(
    Object.values(portrait.chapters).every(chapter =>
      chapter.members.every(
        member => member.prominence >= 1 && member.prominence <= 5,
      ),
    ),
  )
})

test("duplicate Spotify identifiers fail with a path-specific error", () => {
  const invalid = clone(portrait)
  invalid.artists["kings-of-leon"].spotifyArtistId =
    invalid.artists["jadu-heart"].spotifyArtistId

  const result = validateMusicPortrait(invalid)

  assert.equal(result.valid, false)
  assert.ok(
    result.errors.some(error =>
      error.includes("artists.kings-of-leon.spotifyArtistId"),
    ),
  )
})

test("orphan tracks fail with a path-specific error", () => {
  const invalid = clone(portrait)
  invalid.tracks["aukai-slow-sun"].placement.artistId = "missing-artist"

  const result = validateMusicPortrait(invalid)

  assert.equal(result.valid, false)
  assert.ok(
    result.errors.some(error =>
      error.includes("tracks.aukai-slow-sun.placement.artistId"),
    ),
  )
})

test("draft content is available only when explicitly allowed", () => {
  assert.equal(loadMusicPortrait(portrait, { allowDraft: false }), null)
  assert.equal(loadMusicPortrait(portrait, { allowDraft: true }), portrait)
})

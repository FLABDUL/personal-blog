const test = require("node:test")
const assert = require("node:assert/strict")

const portrait = require("../../content/music/portrait.json")
const {
  buildMusicPortraitModel,
  spotifyEntityUrl,
} = require("../../src/lib/music/portrait")
const {
  computeAtlasLayout,
  computeDistantTrackLayout,
  computeMoonLayout,
} = require("../../src/lib/music/layout")

const aukai = portrait.artists.aukai
const slowSun = portrait.tracks["aukai-slow-sun"]
const catalogue = {
  artists: {
    [aukai.spotifyArtistId]: {
      id: aukai.spotifyArtistId,
      name: "Aukai",
      spotifyUrl: spotifyEntityUrl("artist", aukai.spotifyArtistId),
      imageUrl: "https://i.scdn.co/image/aukai",
    },
  },
  tracks: {
    [slowSun.spotifyTrackId]: {
      id: slowSun.spotifyTrackId,
      name: "Slow Sun",
      spotifyUrl: spotifyEntityUrl("track", slowSun.spotifyTrackId),
      imageUrl: "https://i.scdn.co/image/slow-sun",
      artists: [{ id: aukai.spotifyArtistId, name: "Aukai" }],
    },
  },
}

test("the portrait model creates one planet per artist", () => {
  const model = buildMusicPortraitModel(portrait, catalogue)
  const aukaiPlanets = model.planets.filter(
    planet => planet.artistId === "aukai",
  )

  assert.equal(model.planets.length, 10)
  assert.equal(aukaiPlanets.length, 1)
  assert.deepEqual(aukaiPlanets[0].chapters, ["in_rotation", "creative_fuel"])
  assert.deepEqual(aukaiPlanets[0].orbitLabels, [
    "Inner waters",
    "Outer reaches",
  ])
})

test("the portrait model explains the significance of each map region", () => {
  const model = buildMusicPortraitModel(portrait, catalogue)

  assert.deepEqual(
    model.chapters.map(chapter => [chapter.orbitLabel, chapter.description]),
    [
      ["Inner waters", "Music in my life right now."],
      ["Familiar seas", "Music connected to memory."],
      ["Outer reaches", "Music that fuels creativity."],
    ],
  )
})

test("prominence creates visibly different planet radii", () => {
  const layout = computeAtlasLayout(
    buildMusicPortraitModel(portrait, catalogue),
  )
  const aukaiPlanet = layout.planets.find(planet => planet.artistId === "aukai")
  const dojaPlanet = layout.planets.find(
    planet => planet.artistId === "doja-cat",
  )

  assert.ok(aukaiPlanet.radius > dojaPlanet.radius)
})

test("Spotify destinations are accepted only when canonical", () => {
  const valid = buildMusicPortraitModel(portrait, catalogue)
  const invalid = buildMusicPortraitModel(portrait, {
    artists: {
      [aukai.spotifyArtistId]: {
        ...catalogue.artists[aukai.spotifyArtistId],
        spotifyUrl: "https://example.com/not-spotify",
      },
    },
    tracks: {},
  })

  assert.equal(
    valid.planets.find(planet => planet.artistId === "aukai").spotifyUrl,
    spotifyEntityUrl("artist", aukai.spotifyArtistId),
  )
  assert.equal(
    invalid.planets.find(planet => planet.artistId === "aukai").spotifyUrl,
    undefined,
  )
})

test("moon and distant-track layouts are deterministic and bounded", () => {
  const model = buildMusicPortraitModel(portrait, catalogue)
  const atlas = computeAtlasLayout(model)
  const planet = atlas.planets.find(item => item.artistId === "aukai")
  const tracks = model.tracksByArtistId.aukai

  const moons = computeMoonLayout(planet, tracks)
  const distant = computeDistantTrackLayout(model)

  assert.equal(moons.length, 3)
  assert.deepEqual(moons, computeMoonLayout(planet, tracks))
  assert.deepEqual(distant, computeDistantTrackLayout(model))
  assert.ok(atlas.planets.every(item => item.x >= 0 && item.x <= atlas.size))
  assert.ok(atlas.planets.every(item => item.y >= 0 && item.y <= atlas.size))
  assert.ok(
    distant.every(
      item => item.x >= item.radius && item.x <= atlas.size - item.radius,
    ),
  )
  assert.ok(
    distant.every(
      item => item.y >= item.radius && item.y <= atlas.size - item.radius,
    ),
  )
})

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
const { resolvePortraitModel } = require("../../src/lib/music/snapshot")
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
  assert.equal(aukaiPlanet.prominence, 4)
  assert.equal(aukaiPlanet.radius, 52)
  assert.equal(dojaPlanet.prominence, 3)
  assert.equal(dojaPlanet.radius, 32)
})

test("authored source retains Hakim identity and the complete catalogue fallback", () => {
  const model = resolvePortraitModel({ portrait })
  assert.deepEqual(model.homeStar, {
    displayName: "Abdul Hakim Norazman",
    initials: "HN",
    imageUrl: "/profile.jpg",
    label: "HAKIM · HOME STAR",
  })
  const { homeStar, ...authored } = model
  assert.deepEqual(authored, buildMusicPortraitModel(portrait))
  assert.equal(model.catalogueAvailable, false)
  assert.equal(model.planets.length, 10)
  assert.equal(model.tracksByArtistId.aukai.length, 3)
  assert.ok(model.planets.every(p => p.name && !p.spotifyUrl && !p.imageUrl))
  assert.ok(Object.values(model.tracksById).every(t => t.name && !t.spotifyUrl))
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

test("authored moon geometry keeps its original rotating orbit positions", () => {
  const model = buildMusicPortraitModel(portrait, catalogue)
  const planet = computeAtlasLayout(model).planets.find(
    p => p.artistId === "aukai",
  )
  const moons = computeMoonLayout(planet, model.tracksByArtistId.aukai)
  assert.ok(Math.abs(moons[0].x) < 1e-10)
  assert.equal(moons[0].y, -112)
  assert.equal(moons[0].radius, 15)
  assert.equal(moons[0].hitRadius, undefined)
  assert.equal(moons[0].caption, undefined)
})

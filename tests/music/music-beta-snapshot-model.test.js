const test = require("node:test")
const assert = require("node:assert/strict")
const {
  buildSharedPortraitModel,
  resolvePortraitModel,
} = require("../../src/lib/music/snapshot")
const {
  computeAtlasLayout,
  computeMoonLayout,
} = require("../../src/lib/music/layout")
const { makePublicSnapshot } = require("./fixtures/music-beta")

const chapterFor = {
  inner_waters: "in_rotation",
  familiar_seas: "always_returning",
  outer_reaches: "creative_fuel",
}
const labelFor = {
  inner_waters: "Inner waters",
  familiar_seas: "Familiar seas",
  outer_reaches: "Outer reaches",
}

for (const count of [16, 20]) {
  test(`${count} snapshot artists retain public entities and renderer shape`, () => {
    const snapshot = makePublicSnapshot({ planetCount: count })
    snapshot.planets[1].imageUrl = "https://i.scdn.co/image/artistfixture"
    snapshot.planets[1].note = "A quiet morning."
    snapshot.planets[1].moons[0].imageUrl =
      "https://i.scdn.co/image/trackfixture"
    const original = structuredClone(snapshot)
    const model = buildSharedPortraitModel(snapshot)
    assert.deepEqual(snapshot, original)
    assert.equal(model.planets.length, count)
    assert.equal(
      new Set(model.planets.map(planet => planet.artistId)).size,
      count,
    )
    assert.deepEqual(model.homeStar, {
      ...snapshot.owner,
      label: "FIXTURE OWNER · HOME STAR",
    })
    assert.notEqual(model.homeStar, snapshot.owner)
    assert.deepEqual(model.relationships, [])
    assert.deepEqual(model.distantTracks, [])
    assert.equal(model.catalogueAvailable, true)
    assert.deepEqual(
      model.chapters.map(c => [c.id, c.orbitLabel]),
      [
        ["in_rotation", "Inner waters"],
        ["always_returning", "Familiar seas"],
        ["creative_fuel", "Outer reaches"],
      ],
    )
    for (const source of snapshot.planets) {
      const planet = model.planets.find(p => p.artistId === source.id)
      assert.equal(planet.spotifyArtistId, source.id)
      for (const field of [
        "name",
        "spotifyUrl",
        "imageUrl",
        "note",
        "layoutSeed",
        "region",
      ])
        assert.equal(planet[field], source[field])
      assert.equal(planet.prominence, source.size)
      assert.equal(planet.chapter, chapterFor[source.region])
      assert.deepEqual(planet.chapters, [chapterFor[source.region]])
      assert.deepEqual(planet.orbitLabels, [labelFor[source.region]])
      assert.deepEqual(
        planet.trackIds,
        source.moons.map(m => m.id),
      )
      assert.deepEqual(
        model.tracksByArtistId[source.id].map(m => m.id),
        planet.trackIds,
      )
      for (const moon of source.moons) {
        const track = model.tracksById[moon.id]
        for (const field of [
          "id",
          "name",
          "spotifyUrl",
          "imageUrl",
          "introducedAt",
        ])
          assert.equal(track[field], moon[field])
        assert.equal(track.spotifyTrackId, moon.id)
        assert.deepEqual(track.artistIds, moon.artistIds)
        assert.deepEqual(track.artists, [{ id: source.id, name: source.name }])
      }
    }
    assert.deepEqual(
      [...new Set(model.planets.map(p => p.trackIds.length))].sort(),
      [0, 1, 2, 3],
    )
    model.planets[0].chapters.push("test")
    assert.deepEqual(snapshot, original)
  })
}

test("twenty seeded planet nodes are deterministic, bounded and independent of input order", () => {
  const snapshot = makePublicSnapshot({ planetCount: 20 })
  const layout = computeAtlasLayout(buildSharedPortraitModel(snapshot), 1000)
  assert.deepEqual(
    layout,
    computeAtlasLayout(buildSharedPortraitModel(snapshot), 1000),
  )
  assert.equal(layout.planets.length, 20)
  assert.equal(new Set(layout.planets.map(p => p.key)).size, 20)
  assert.equal(new Set(layout.planets.map(p => `${p.x}:${p.y}`)).size, 20)
  for (const p of layout.planets) {
    assert.ok(Number.isFinite(p.radius) && p.radius >= 12 && p.radius <= 76)
    assert.ok(p.x >= p.radius && p.x <= 1000 - p.radius)
    assert.ok(p.y >= p.radius && p.y <= 1000 - p.radius)
  }
  snapshot.planets.reverse()
  assert.deepEqual(
    layout,
    computeAtlasLayout(buildSharedPortraitModel(snapshot), 1000),
  )
  snapshot.planets.find(planet => planet.layoutSeed === 1).layoutSeed = 999
  assert.notDeepEqual(
    layout.planets.map(({ key, x, y }) => ({ key, x, y })),
    computeAtlasLayout(buildSharedPortraitModel(snapshot), 1000).planets.map(
      ({ key, x, y }) => ({ key, x, y }),
    ),
  )
})

test("snapshot adapter rejects malformed versions, entities and private fields at the validator boundary", () => {
  const changes = [
    s => {
      s.schemaVersion = 2
    },
    s => {
      s.rendererVersion = 2
    },
    s => {
      s.generatorVersion = 2
    },
    s => {
      s.planets[1] = structuredClone(s.planets[0])
    },
    s => {
      s.planets[2].moons[1] = structuredClone(s.planets[2].moons[0])
    },
    s => {
      s.planets[0].spotifyUrl += "?si=tracking"
    },
    s => {
      s.planets[1].moons[0].spotifyUrl = "https://example.test/track"
    },
    s => {
      s.owner.imageUrl = "https://example.test/private.jpg"
    },
    s => {
      s.planets[0].size = 6
    },
    s => {
      delete s.owner.initials
    },
  ]
  for (const change of changes) {
    const snapshot = makePublicSnapshot()
    change(snapshot)
    assert.throws(
      () => buildSharedPortraitModel(snapshot),
      /Music beta record is invalid/,
    )
  }
  for (const path of [
    [],
    ["owner"],
    ["planets", 1],
    ["planets", 1, "moons", 0],
  ]) {
    for (const field of ["email", "refreshToken", "ranks", "unknown"]) {
      const snapshot = makePublicSnapshot()
      let target = snapshot
      for (const key of path) target = target[key]
      target[field] = "private fixture"
      assert.throws(
        () => buildSharedPortraitModel(snapshot),
        /unexpected field/,
      )
    }
  }
})

test("source resolution rejects ambiguous or missing input and resolves an explicit owner override", () => {
  const snapshot = makePublicSnapshot()
  assert.throws(
    () => resolvePortraitModel({ portrait: {}, snapshot }),
    /exactly one/,
  )
  assert.throws(() => resolvePortraitModel({}), /exactly one/)
  assert.throws(() => resolvePortraitModel({ snapshot: null }), /exactly one/)
  const ownerIdentity = { displayName: "Another listener", initials: "AL" }
  assert.deepEqual(resolvePortraitModel({ snapshot, ownerIdentity }).homeStar, {
    ...ownerIdentity,
    label: "ANOTHER LISTENER · HOME STAR",
  })
  assert.equal(snapshot.owner.displayName, "Fixture owner")
})

test("the same collaborative moon retains its planet associations", () => {
  const snapshot = makePublicSnapshot({ planetCount: 2 })
  const moon = snapshot.planets[1].moons[0]
  moon.artistIds = snapshot.planets.map(p => p.id)
  snapshot.planets[0].moons.push(structuredClone(moon))
  const model = buildSharedPortraitModel(snapshot)
  assert.equal(Object.keys(model.tracksById).length, 1)
  for (const p of model.planets)
    assert.deepEqual(
      model.tracksByArtistId[p.artistId].map(t => t.id),
      [moon.id],
    )
  assert.deepEqual(
    model.tracksById[moon.id].artists,
    snapshot.planets.map(p => ({ id: p.id, name: p.name })),
  )
})

test("owner overrides reject malformed or executable public identities without reading accessors", () => {
  const snapshot = makePublicSnapshot()
  const valid = { displayName: "Guest listener", initials: "GL" }
  for (const ownerIdentity of [
    null,
    false,
    "Guest",
    [],
    {},
    { ...valid, displayName: " " },
    { ...valid, displayName: 1 },
    { ...valid, initials: "TOOLONG" },
    { ...valid, initials: "" },
    { ...valid, imageUrl: "/profile.jpg" },
    { ...valid, imageUrl: "https://example.test/owner.jpg" },
    { ...valid, unknown: "private" },
    Object.assign(Object.create(valid), valid),
  ])
    assert.throws(
      () => resolvePortraitModel({ snapshot, ownerIdentity }),
      /Music beta record is invalid/,
    )
  for (const key of ["displayName", "initials", "imageUrl"]) {
    let reads = 0
    const ownerIdentity = { ...valid }
    Object.defineProperty(ownerIdentity, key, {
      enumerable: true,
      get() {
        reads++
        return valid[key]
      },
    })
    assert.throws(
      () => resolvePortraitModel({ snapshot, ownerIdentity }),
      /expected data fields/,
    )
    assert.equal(reads, 0)
  }
  const hidden = { ...valid }
  Object.defineProperty(hidden, "imageUrl", {
    value: "https://i.scdn.co/image/owner",
    enumerable: false,
  })
  assert.throws(
    () => resolvePortraitModel({ snapshot, ownerIdentity: hidden }),
    /expected data fields/,
  )
})

test("a valid public owner override is detached and does not replace the internal authored identity policy", () => {
  const snapshot = makePublicSnapshot()
  const ownerIdentity = {
    displayName: "Guest listener",
    initials: "GL",
    imageUrl: "https://i.scdn.co/image/owner",
  }
  const model = resolvePortraitModel({ snapshot, ownerIdentity })
  ownerIdentity.displayName = "Changed"
  assert.equal(model.homeStar.displayName, "Guest listener")
  model.homeStar.initials = "X"
  assert.equal(ownerIdentity.initials, "GL")
})

test("compact snapshot layouts give every target disjoint space for single and mixed crowded regions", () => {
  for (const regions of [
    Array(20).fill("inner_waters"),
    Array.from({ length: 20 }, (_, i) =>
      i < 12 ? "inner_waters" : i < 18 ? "familiar_seas" : "outer_reaches",
    ),
  ]) {
    const snapshot = makePublicSnapshot({ planetCount: 20 })
    snapshot.planets.forEach((p, i) => {
      p.size = 1
      p.region = regions[i]
    })
    const model = buildSharedPortraitModel(snapshot)
    const layout = computeAtlasLayout(model, 1000, { compact: true })
    assert.equal(layout.dense, true)
    for (const [i, p] of layout.planets.entries()) {
      assert.ok(p.x >= 90 && p.x <= 910 && p.y >= 90 && p.y <= 910)
      assert.equal(p.chapter, chapterFor[p.region])
      for (const other of layout.planets.slice(i + 1))
        assert.ok(Math.hypot(p.x - other.x, p.y - other.y) >= 180)
    }
    assert.deepEqual(
      layout,
      computeAtlasLayout(
        buildSharedPortraitModel({
          ...snapshot,
          planets: [...snapshot.planets].reverse(),
        }),
        1000,
        { compact: true },
      ),
    )
    assert.equal(computeAtlasLayout(model).dense, false)
  }
})

test("shared moon representatives are deterministic while each planet retains its own metadata", () => {
  const snapshot = makePublicSnapshot({ planetCount: 2 })
  const shared = snapshot.planets[1].moons[0]
  shared.artistIds = snapshot.planets.map(p => p.id)
  snapshot.planets[0].moons = [
    {
      ...shared,
      name: "Earlier collaboration",
      introducedAt: "2026-10-10T08:00:00.000Z",
    },
  ]
  const forward = buildSharedPortraitModel(snapshot)
  const reverse = buildSharedPortraitModel({
    ...snapshot,
    planets: [...snapshot.planets].reverse(),
  })
  assert.deepEqual(forward.tracksById, reverse.tracksById)
  assert.equal(
    forward.tracksByArtistId[snapshot.planets[0].id][0].name,
    "Earlier collaboration",
  )
  assert.equal(
    forward.tracksByArtistId[snapshot.planets[1].id][0].name,
    shared.name,
  )
})

test("all 231 twenty-planet region count distributions keep disjoint compact targets", () => {
  let distributions = 0
  for (let inner = 0; inner <= 20; inner++) {
    for (let familiar = 0; familiar <= 20 - inner; familiar++) {
      const snapshot = makePublicSnapshot({ planetCount: 20 })
      snapshot.planets.forEach((p, i) => {
        p.region =
          i < inner
            ? "inner_waters"
            : i < inner + familiar
              ? "familiar_seas"
              : "outer_reaches"
        p.moons = []
      })
      const layout = computeAtlasLayout(
        buildSharedPortraitModel(snapshot),
        1000,
        { compact: true },
      )
      for (let i = 0; i < 20; i++)
        for (let j = i + 1; j < 20; j++)
          assert.ok(
            Math.hypot(
              layout.planets[i].x - layout.planets[j].x,
              layout.planets[i].y - layout.planets[j].y,
            ) >= 180,
          )
      distributions++
    }
  }
  assert.equal(distributions, 231)
})

test("every compact slot, size and zero-to-three moon expansion has bounded distinct targets and captions", () => {
  const layout = computeAtlasLayout(
    buildSharedPortraitModel(makePublicSnapshot({ planetCount: 20 })),
    1000,
    { compact: true },
  )
  const slots = [
    ...layout.planets,
    ...[
      { x: 500, y: 100 },
      { x: 500, y: 900 },
      { x: 100, y: 500 },
      { x: 900, y: 500 },
    ],
  ]
  let configurations = 0
  for (const slot of slots)
    for (const radius of [12, 21, 32, 52, 76])
      for (let count = 0; count <= 3; count++) {
        const planet = { ...slot, radius }
        const tracks = Array.from({ length: count }, (_, i) => ({
          id: `moon-${i}`,
          name: "A long public song caption",
        }))
        const moons = computeMoonLayout(planet, tracks, {
          compact: true,
          size: 1000,
        })
        assert.equal(moons.length, count)
        for (const [i, moon] of moons.entries()) {
          const x = planet.x + moon.x,
            y = planet.y + moon.y
          assert.ok(
            x >= moon.hitRadius &&
              x <= 1000 - moon.hitRadius &&
              y >= moon.hitRadius &&
              y <= 1000 - moon.hitRadius,
          )
          assert.ok(
            Math.hypot(moon.x, moon.y) >= planet.radius + moon.radius + 24,
          )
          assert.ok(
            moon.labelBounds.x >= 0 &&
              moon.labelBounds.x + moon.labelBounds.width <= 1000,
          )
          assert.ok(
            moon.labelBounds.y >= 0 &&
              moon.labelBounds.y + moon.labelBounds.height <= 1000,
          )
          const label = moon.labelBounds
          assert.ok(
            label.y + label.height <= 550 ||
              label.y >= 590 ||
              label.x + label.width <= 200 ||
              label.x >= 800,
          )
          for (const other of moons.slice(i + 1))
            assert.ok(
              Math.hypot(moon.x - other.x, moon.y - other.y) >=
                moon.hitRadius + other.hitRadius,
            )
        }
        assert.deepEqual(
          moons,
          computeMoonLayout(planet, tracks, { compact: true, size: 1000 }),
        )
        configurations++
      }
  assert.equal(configurations, 480)
})

test("snapshot ID representatives and layout ties use ordinal rather than locale ordering", () => {
  const snapshot = makePublicSnapshot({ planetCount: 2 })
  const ids = ["i".repeat(22), "I".repeat(22)]
  const moon = snapshot.planets[1].moons[0]
  snapshot.planets.forEach((p, i) => {
    p.id = ids[i]
    p.spotifyUrl = `https://open.spotify.com/artist/${p.id}`
    p.layoutSeed = 0
    p.region = "inner_waters"
    p.moons = [
      {
        ...moon,
        name: i === 0 ? "Lowercase representative" : "Uppercase representative",
        artistIds: ids,
      },
    ]
  })
  const original = String.prototype.localeCompare
  String.prototype.localeCompare = function () {
    throw new Error("Locale-sensitive identifier ordering")
  }
  try {
    const model = buildSharedPortraitModel(snapshot)
    assert.equal(model.tracksById[moon.id].name, "Uppercase representative")
    assert.equal(model.planets[0].artistId, ids[1])
    assert.equal(computeAtlasLayout(model).planets[0].artistId, ids[1])
    assert.equal(
      computeAtlasLayout(model, 1000, { compact: true }).planets[0].artistId,
      ids[1],
    )
    const crowded = makePublicSnapshot({ planetCount: 20 })
    crowded.planets[0] = structuredClone(snapshot.planets[0])
    crowded.planets[1] = structuredClone(snapshot.planets[1])
    crowded.planets.forEach(planet => {
      planet.layoutSeed = 0
      planet.region = "inner_waters"
    })
    const compact = computeAtlasLayout(
      buildSharedPortraitModel(crowded),
      1000,
      { compact: true },
    )
    assert.equal(compact.dense, true)
    assert.ok(
      compact.planets.findIndex(p => p.artistId === ids[1]) <
        compact.planets.findIndex(p => p.artistId === ids[0]),
    )
  } finally {
    String.prototype.localeCompare = original
  }
})

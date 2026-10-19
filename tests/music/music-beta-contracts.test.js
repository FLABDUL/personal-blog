const test = require("node:test")
const assert = require("node:assert/strict")
const contracts = require("../../api/_music-beta/contracts")
const {
  NOW,
  artistId,
  trackId,
  makeOwnerRecord,
  makeEvidence,
  makeOverrides,
  makePublicSnapshot,
} = require("./fixtures/music-beta")

test("valid private and public records return their validated input", () => {
  for (const [validate, value] of [
    [contracts.validateOwnerRecord, makeOwnerRecord()],
    [contracts.validateEvidence, makeEvidence()],
    [contracts.validateOverrides, makeOverrides()],
    [contracts.validatePublicSnapshot, makePublicSnapshot()],
  ])
    assert.equal(validate(value), value)
  assert.equal(contracts.MAX_BOUND_USERS, 5)
  assert.equal(contracts.AUTOMATIC_PLANET_LIMIT, 16)
  assert.equal(contracts.MAX_PLANETS, 20)
  assert.equal(contracts.MAX_MOONS, 3)
})

test("owner binding rejects a sixth-user marker and unknown fields", () => {
  assert.throws(() =>
    contracts.validateOwnerRecord(makeOwnerRecord({ boundUserNumber: 6 })),
  )
  assert.throws(() =>
    contracts.validateOwnerRecord(
      makeOwnerRecord({ email: "private@example.test" }),
    ),
  )
})

test("snapshots support sparse drafts, 20 planets and zero to three moons", () => {
  for (const planetCount of [0, 1, 16, 20])
    contracts.validatePublicSnapshot(makePublicSnapshot({ planetCount }))
  assert.throws(() =>
    contracts.validatePublicSnapshot(makePublicSnapshot({ planetCount: 21 })),
  )
})

test("four otherwise valid distinct moons fail the moon count rule", () => {
  const snapshot = makePublicSnapshot()
  snapshot.planets[0].moons = Array.from({ length: 4 }, (_, index) => ({
    id: trackId(index),
    name: `Track ${index}`,
    spotifyUrl: `https://open.spotify.com/track/${trackId(index)}`,
    artistIds: [snapshot.planets[0].id],
    introducedAt: NOW,
  }))
  assert.throws(
    () => contracts.validatePublicSnapshot(snapshot),
    /invalid moon count/,
  )
  snapshot.planets[0].moons.pop()
  contracts.validatePublicSnapshot(snapshot)
})

test("duplicate otherwise valid planets fail the identity uniqueness rule", () => {
  const snapshot = makePublicSnapshot()
  snapshot.planets[1] = structuredClone(snapshot.planets[0])
  assert.throws(
    () => contracts.validatePublicSnapshot(snapshot),
    /duplicate identity/,
  )
  snapshot.planets.splice(1, 1)
  contracts.validatePublicSnapshot(snapshot)
})

test("public records reject private fields at every object boundary", () => {
  const forbidden = [
    "rank",
    "ranks",
    "email",
    "accessToken",
    "refreshToken",
    "sessionId",
    "inviteToken",
    "diagnostics",
    "storagePath",
    "unknown",
  ]
  for (const field of forbidden) {
    for (const path of [
      [],
      ["owner"],
      ["planets", 1],
      ["planets", 1, "moons", 0],
    ]) {
      const snapshot = makePublicSnapshot()
      let target = snapshot
      for (const key of path) target = target[key]
      target[field] = "private"
      assert.throws(
        () => contracts.validatePublicSnapshot(snapshot),
        `${path}.${field}`,
      )
      assert.throws(
        () => contracts.toPublicSnapshot(snapshot),
        `${path}.${field} projection`,
      )
    }
  }
})

test("canonical Spotify destinations must match entity kind and ID", () => {
  for (const spotifyUrl of [
    "http://open.spotify.com/artist/" + artistId(0),
    "https://evil.test/artist/" + artistId(0),
    "https://open.spotify.com/artist/" + artistId(0) + "?si=tracking",
    "https://open.spotify.com/track/" + artistId(0),
  ]) {
    const snapshot = makePublicSnapshot()
    snapshot.planets[0].spotifyUrl = spotifyUrl
    assert.throws(() => contracts.validatePublicSnapshot(snapshot))
  }
  const snapshot = makePublicSnapshot()
  snapshot.planets[1].moons[0].spotifyUrl += "/"
  assert.throws(() => contracts.validatePublicSnapshot(snapshot))
})

test("timestamps, versions, relationships and unique IDs are strict", () => {
  for (const change of [
    s => {
      s.generatedAt = "2026-10-17"
    },
    s => {
      s.rendererVersion = 2
    },
    s => {
      s.schemaVersion = 2
    },
    s => {
      s.planets[1].moons[0].artistIds = [artistId(9)]
    },
    s => {
      delete s.owner.initials
    },
    s => {
      s.planets[0].imageUrl = "javascript:alert(1)"
    },
    s => {
      s.owner.imageUrl = "https://example.test/private.png"
    },
  ]) {
    const snapshot = makePublicSnapshot()
    change(snapshot)
    assert.throws(() => contracts.validatePublicSnapshot(snapshot))
  }
  assert.throws(() =>
    contracts.validateOwnerRecord(
      makeOwnerRecord({ createdAt: NOW.replace(".000", "") }),
    ),
  )
})

test("evidence accepts only bounded ranks, ranges and credited IDs", () => {
  for (const change of [
    e => {
      e.artists[0].ranks.short_term = 0
    },
    e => {
      e.artists[0].ranks.short_term = 51
    },
    e => {
      e.artists[0].ranks.other = 1
    },
    e => {
      e.tracks[0].artistIds = []
    },
    e => {
      e.artists[0].private = true
    },
  ]) {
    const evidence = makeEvidence()
    change(evidence)
    assert.throws(() => contracts.validateEvidence(evidence))
  }
  contracts.validateEvidence(makeEvidence({ artists: [], tracks: [] }))
})

test("overrides preserve only authored choices for valid artist IDs", () => {
  for (const value of [
    { bad: { pinned: true } },
    { [artistId(0)]: { pinned: true, rank: 1 } },
    { [artistId(0)]: { pinned: "yes" } },
    { [artistId(0)]: { pinned: false, region: "unknown" } },
  ])
    assert.throws(() => contracts.validateOverrides(value))
  contracts.validateOverrides({})
})

test("public projection validates then returns an independent allowlisted copy", () => {
  const input = makePublicSnapshot()
  const output = contracts.toPublicSnapshot(input)
  assert.deepEqual(output, input)
  output.planets[0].name = "Changed"
  assert.notEqual(input.planets[0].name, output.planets[0].name)
  output.owner.displayName = "Changed owner"
  output.planets[1].moons[0].name = "Changed track"
  output.planets[1].moons[0].artistIds.push(artistId(99))
  assert.notEqual(input.owner.displayName, output.owner.displayName)
  assert.notEqual(
    input.planets[1].moons[0].name,
    output.planets[1].moons[0].name,
  )
  assert.equal(input.planets[1].moons[0].artistIds.length, 1)
})

test("private records reject missing fields, unsafe token envelopes and malformed values", () => {
  for (const change of [
    o => {
      delete o.inviteHash
    },
    o => {
      o.encryptedRefreshToken.iv = "invalid"
    },
    o => {
      o.encryptedRefreshToken.accessToken = "private"
    },
    o => {
      o.sessionVersion = 0
    },
    o => {
      o.refreshStatus = "unknown"
    },
  ]) {
    const owner = makeOwnerRecord()
    change(owner)
    assert.throws(() => contracts.validateOwnerRecord(owner))
  }
  for (const value of [null, [], "bad", 1]) {
    for (const validate of [
      contracts.validateOwnerRecord,
      contracts.validateEvidence,
      contracts.validateOverrides,
      contracts.validatePublicSnapshot,
    ])
      assert.throws(() => validate(value))
  }
})

test("projection rejects non-JSON and accessor properties without invoking them", () => {
  const snapshot = makePublicSnapshot()
  snapshot[Symbol("private")] = "private"
  assert.throws(() => contracts.toPublicSnapshot(snapshot))
  delete snapshot[Object.getOwnPropertySymbols(snapshot)[0]]
  Object.defineProperty(snapshot.owner, "displayName", {
    enumerable: true,
    get() {
      throw new Error("must not run")
    },
  })
  assert.throws(
    () => contracts.toPublicSnapshot(snapshot),
    /expected data fields/,
  )
})

test("artists with no direct ranks require evidenced track credit", () => {
  const evidence = makeEvidence()
  evidence.artists[0].ranks = {}
  contracts.validateEvidence(evidence)
  evidence.tracks = []
  assert.throws(() => contracts.validateEvidence(evidence))
})

test("credited artist unions are not capped at the directly ranked artist count", () => {
  const evidence = makeEvidence()
  const credited = Array.from({ length: 151 }, (_, index) => artistId(index))
  evidence.tracks[0].artistIds = credited
  evidence.artists = credited.map(id => ({
    id,
    name: "Credited artist",
    spotifyUrl: `https://open.spotify.com/artist/${id}`,
    ranks: {},
  }))
  contracts.validateEvidence(evidence)
})

const arrayCases = [
  {
    make: makePublicSnapshot,
    locate: s => s.planets,
    validate: contracts.validatePublicSnapshot,
  },
  {
    make: makePublicSnapshot,
    locate: s => s.planets[1].moons,
    validate: contracts.validatePublicSnapshot,
  },
  {
    make: makePublicSnapshot,
    locate: s => s.planets[1].moons[0].artistIds,
    validate: contracts.validatePublicSnapshot,
  },
  {
    make: makeEvidence,
    locate: e => e.artists,
    validate: contracts.validateEvidence,
  },
  {
    make: makeEvidence,
    locate: e => e.tracks,
    validate: contracts.validateEvidence,
  },
  {
    make: makeEvidence,
    locate: e => e.tracks[0].artistIds,
    validate: contracts.validateEvidence,
  },
]

test("all array boundaries reject toJSON, custom iterators and methods without calling them", () => {
  for (const { make, locate, validate } of arrayCases) {
    for (const key of [
      "toJSON",
      Symbol.iterator,
      "map",
      "forEach",
      "flatMap",
      "includes",
    ]) {
      const input = make()
      let calls = 0
      locate(input)[key] = () => {
        calls++
        return [{ email: "synthetic@example.test", refreshToken: "synthetic" }]
      }
      assert.throws(() => validate(input), /invalid array/)
      if (make === makePublicSnapshot)
        assert.throws(() => contracts.toPublicSnapshot(input), /invalid array/)
      assert.equal(calls, 0)
    }
  }
})

test("all array boundaries reject accessor indices with zero getter calls", () => {
  for (const { make, locate, validate } of arrayCases) {
    const input = make()
    const array = locate(input)
    const original = array[0]
    let calls = 0
    Object.defineProperty(array, "0", {
      enumerable: true,
      get() {
        calls++
        return original
      },
    })
    assert.throws(() => validate(input), /invalid array/)
    if (make === makePublicSnapshot)
      assert.throws(() => contracts.toPublicSnapshot(input), /invalid array/)
    assert.equal(calls, 0)
  }
})

test("all array boundaries reject holes, hidden indices, extra keys and custom prototypes", () => {
  for (const { make, locate, validate } of arrayCases) {
    for (const mutate of [
      a => {
        delete a[0]
      },
      a => {
        Object.defineProperty(a, "0", { enumerable: false })
      },
      a => {
        a.extra = "private"
      },
      a => {
        a[Symbol("private")] = "private"
      },
      a => {
        Object.setPrototypeOf(a, Object.create(Array.prototype))
      },
      a => {
        Object.defineProperty(a, "toJSON", {
          value: () => [],
          enumerable: false,
        })
      },
    ]) {
      const input = make()
      mutate(locate(input))
      assert.throws(() => validate(input), /invalid array/)
    }
  }
})

test("custom iterator cannot conceal a private planet in public projection", () => {
  const input = makePublicSnapshot()
  const valid = input.planets[0]
  input.planets[0] = { ...valid, email: "synthetic@example.test" }
  input.planets[Symbol.iterator] = function* () {
    yield valid
  }
  assert.throws(() => contracts.toPublicSnapshot(input), /invalid array/)
})

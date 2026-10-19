const test = require("node:test")
const assert = require("node:assert/strict")
const { selectArrivals } = require("../../src/lib/music/arrivals")
const { toPublicSnapshot } = require("../../api/_music-beta/contracts")
const { NOW, makePublicSnapshot } = require("./fixtures/music-beta")

const DAY = 24 * 60 * 60 * 1000
const at = offset => new Date(Date.parse(NOW) + offset).toISOString()

test("arrivals include the exact seven-day boundary but exclude older introductions", () => {
  const snapshot = makePublicSnapshot({ planetCount: 3 })
  snapshot.planets[1].moons[0].introducedAt = at(-7 * DAY)
  snapshot.planets[2].moons[0].introducedAt = at(-7 * DAY - 1)
  snapshot.planets[2].moons[1].introducedAt = at(-DAY)
  assert.deepEqual(
    selectArrivals(snapshot, NOW).map(t => t.id),
    [snapshot.planets[2].moons[1].id, snapshot.planets[1].moons[0].id],
  )
})

test("arrivals are at most three, newest first with ordinal ID ties regardless of input order", () => {
  const snapshot = makePublicSnapshot({ planetCount: 4 })
  snapshot.planets[1].moons[0].introducedAt = at(-DAY)
  const selected = selectArrivals(snapshot, Date.parse(NOW))
  assert.equal(selected.length, 3)
  assert.deepEqual(
    selected.map(t => t.id),
    [
      snapshot.planets[2].moons[0].id,
      snapshot.planets[2].moons[1].id,
      snapshot.planets[3].moons[0].id,
    ],
  )
  snapshot.planets.reverse().forEach(p => p.moons.reverse())
  assert.deepEqual(selectArrivals(snapshot, NOW), selected)
})

test("collaborative moons animate once with deterministic newest introduction metadata", () => {
  const snapshot = makePublicSnapshot({ planetCount: 3 })
  const shared = snapshot.planets[1].moons[0]
  shared.artistIds = snapshot.planets.slice(1).map(p => p.id)
  snapshot.planets[2].moons = [{ ...shared, introducedAt: at(-DAY) }]
  assert.deepEqual(selectArrivals(snapshot, NOW), [shared])
  snapshot.planets.reverse()
  assert.deepEqual(selectArrivals(snapshot, NOW), [shared])
})

test("seen snapshots and reduced motion produce no arrivals", () => {
  const snapshot = makePublicSnapshot()
  assert.deepEqual(selectArrivals(snapshot, NOW, snapshot.snapshotId), [])
  assert.deepEqual(
    selectArrivals(snapshot, NOW, null, { reducedMotion: true }),
    [],
  )
})

test("missing, invalid, stale and future snapshots or clocks produce no arrivals", () => {
  for (const snapshot of [
    undefined,
    null,
    {},
    makePublicSnapshot({ generatedAt: at(DAY) }),
    makePublicSnapshot({
      generatedAt: at(-8 * DAY),
      lastSuccessfulUpdateAt: at(-8 * DAY),
      planets: [],
    }),
  ])
    assert.deepEqual(selectArrivals(snapshot, NOW), [])
  for (const now of ["invalid", NaN, undefined])
    assert.deepEqual(selectArrivals(makePublicSnapshot(), now), [])
})

test("invalid and future introduction timestamps are never animated", () => {
  for (const introducedAt of ["invalid", at(1), "2026-10-17"]) {
    const snapshot = makePublicSnapshot({ planetCount: 2 })
    snapshot.planets[1].moons[0].introducedAt = introducedAt
    assert.deepEqual(selectArrivals(snapshot, NOW), [])
  }
})

test("canonical expanded-year future introductions are excluded even when the snapshot contract accepts them", () => {
  const snapshot = makePublicSnapshot({ planetCount: 2 })
  snapshot.planets[1].moons[0].introducedAt = "+010000-01-01T00:00:00.000Z"
  assert.doesNotThrow(() => toPublicSnapshot(snapshot))
  assert.deepEqual(selectArrivals(snapshot, NOW), [])
})

test("zero planets or zero moons produce no arrivals and returned data is detached", () => {
  assert.deepEqual(
    selectArrivals(makePublicSnapshot({ planetCount: 0 }), NOW),
    [],
  )
  assert.deepEqual(
    selectArrivals(makePublicSnapshot({ planetCount: 1 }), NOW),
    [],
  )
  const snapshot = makePublicSnapshot({ planetCount: 2 })
  const [track] = selectArrivals(snapshot, NOW)
  track.artistIds.push("changed")
  assert.equal(snapshot.planets[1].moons[0].artistIds.length, 1)
})

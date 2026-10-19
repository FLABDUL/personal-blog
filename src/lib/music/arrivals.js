const { toPublicSnapshot } = require("../../../api/_music-beta/contracts")
const { compareIds } = require("./portrait")

const WINDOW = 7 * 24 * 60 * 60 * 1000

function selectArrivals(
  value,
  now,
  seenSnapshotId,
  { reducedMotion = false } = {},
) {
  if (!value || reducedMotion) return []
  let snapshot
  try {
    snapshot = toPublicSnapshot(value)
  } catch {
    return []
  }
  const currentTime = typeof now === "number" ? now : Date.parse(now)
  const generatedAt = Date.parse(snapshot.generatedAt)
  if (
    !Number.isFinite(currentTime) ||
    snapshot.snapshotId === seenSnapshotId ||
    generatedAt > currentTime ||
    generatedAt < currentTime - WINDOW
  )
    return []
  const seen = new Set()
  return [...snapshot.planets]
    .sort((a, b) => compareIds(a.id, b.id))
    .flatMap(planet => planet.moons)
    .filter(track => {
      const introducedAt = Date.parse(track.introducedAt)
      return (
        Number.isFinite(introducedAt) &&
        introducedAt >= currentTime - WINDOW &&
        introducedAt <= generatedAt
      )
    })
    .sort(
      (a, b) =>
        Date.parse(b.introducedAt) - Date.parse(a.introducedAt) ||
        compareIds(a.id, b.id),
    )
    .filter(track => {
      if (seen.has(track.id)) return false
      seen.add(track.id)
      return true
    })
    .slice(0, 3)
}

module.exports = { selectArrivals }

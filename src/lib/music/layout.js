const { CHAPTERS, ORBIT_DESCRIPTIONS, ORBIT_LABELS } = require("./portrait")

const ORBIT_SPECS = {
  in_rotation: { radius: 175, durationSeconds: 72, direction: "normal" },
  always_returning: { radius: 285, durationSeconds: 108, direction: "reverse" },
  creative_fuel: { radius: 380, durationSeconds: 156, direction: "normal" },
}
const PLANET_RADIUS = { 1: 12, 2: 21, 3: 32, 4: 52, 5: 76 }
const START_ANGLE = {
  in_rotation: -Math.PI / 2,
  always_returning: -Math.PI / 2 + 0.28,
  creative_fuel: -Math.PI / 2 - 0.2,
}

const pointOnCircle = (radius, angle, centre) => ({
  x: centre + Math.cos(angle) * radius,
  y: centre + Math.sin(angle) * radius,
})

function computeAtlasLayout(model, size = 1000) {
  const centre = size / 2
  const scale = size / 1000
  const orbits = CHAPTERS.map(chapter => ({
    chapter,
    label: ORBIT_LABELS[chapter],
    description: ORBIT_DESCRIPTIONS[chapter],
    ...ORBIT_SPECS[chapter],
    radius: ORBIT_SPECS[chapter].radius * scale,
    centre,
  }))
  const planets = []

  for (const chapter of CHAPTERS) {
    const members = model.planets.filter(planet => planet.chapter === chapter)
    members.forEach((planet, index) => {
      const angle =
        START_ANGLE[chapter] +
        (Math.PI * 2 * index) / Math.max(1, members.length)
      const point = pointOnCircle(
        ORBIT_SPECS[chapter].radius * scale,
        angle,
        centre,
      )
      planets.push({
        ...planet,
        ...point,
        angle,
        radius: PLANET_RADIUS[planet.prominence] * scale,
        labelAnchor: point.x >= centre ? "end" : "start",
      })
    })
  }

  return { size, centre, orbits, planets, relationships: model.relationships }
}

function computeMoonLayout(planet, tracks) {
  return tracks.map((track, index) => {
    const ring = Math.floor(index / 8)
    const position = index % 8
    const count = Math.min(8, tracks.length - ring * 8)
    const angle = -Math.PI / 2 + (position * (Math.PI * 2)) / count
    const distance = planet.radius + 60 + ring * 44
    const radius = Math.max(9, 15 - ring * 2)
    const horizontal = Math.cos(angle)
    const vertical = Math.sin(angle)
    const labelAnchor =
      horizontal > 0.45 ? "start" : horizontal < -0.45 ? "end" : "middle"
    return {
      trackId: track.id,
      angle,
      x: Math.cos(angle) * distance,
      y: Math.sin(angle) * distance,
      radius,
      labelX:
        labelAnchor === "start"
          ? radius + 10
          : labelAnchor === "end"
            ? -radius - 10
            : 0,
      labelY:
        labelAnchor !== "middle"
          ? 5
          : vertical < 0
            ? -radius - 10
            : radius + 20,
      labelAnchor,
    }
  })
}

function stableHash(value) {
  return [...value].reduce(
    (hash, character) => (hash * 31 + character.charCodeAt(0)) >>> 0,
    2166136261,
  )
}

function computeDistantTrackLayout(model, size = 1000) {
  const centre = size / 2
  const scale = size / 1000
  return model.distantTracks.map(track => {
    const hash = stableHash(track.id)
    const angle = ((hash % 3600) / 3600) * Math.PI * 2
    const distance = (410 + ((hash >>> 12) % 56)) * scale
    const radius = (18 + ((hash >>> 20) % 7)) * scale
    const point = pointOnCircle(distance, angle, centre)
    return {
      trackId: track.id,
      x: Math.max(radius, Math.min(size - radius, point.x)),
      y: Math.max(radius, Math.min(size - radius, point.y)),
      radius,
    }
  })
}

module.exports = {
  ORBIT_SPECS,
  computeAtlasLayout,
  computeDistantTrackLayout,
  computeMoonLayout,
}

const {
  toPublicSnapshot,
  toPublicOwner,
} = require("../../../api/_music-beta/contracts")
const {
  buildMusicPortraitModel,
  CHAPTERS,
  ORBIT_LABELS,
  compareIds,
} = require("./portrait")

const CHAPTER_FOR_REGION = {
  inner_waters: "in_rotation",
  familiar_seas: "always_returning",
  outer_reaches: "creative_fuel",
}
const HAKIM_HOME_STAR = {
  displayName: "Abdul Hakim Norazman",
  initials: "HN",
  imageUrl: "/profile.jpg",
  label: "HAKIM · HOME STAR",
}

function homeStarFor(owner) {
  return {
    displayName: owner.displayName,
    initials: owner.initials,
    ...(owner.imageUrl ? { imageUrl: owner.imageUrl } : {}),
    label: `${owner.displayName.toUpperCase()} · HOME STAR`,
  }
}

function buildSharedPortraitModel(value) {
  const snapshot = toPublicSnapshot(value)
  const names = new Map(
    snapshot.planets.map(planet => [planet.id, planet.name]),
  )
  const tracksById = {}
  const tracksByArtistId = {}
  const planets = [...snapshot.planets]
    .sort((a, b) => compareIds(a.id, b.id))
    .map(planet => {
      const chapter = CHAPTER_FOR_REGION[planet.region]
      const tracks = planet.moons.map(moon => ({
        id: moon.id,
        spotifyTrackId: moon.id,
        name: moon.name,
        spotifyUrl: moon.spotifyUrl,
        ...(moon.imageUrl ? { imageUrl: moon.imageUrl } : {}),
        introducedAt: moon.introducedAt,
        artistIds: [...moon.artistIds],
        artists: moon.artistIds
          .filter(id => names.has(id))
          .map(id => ({ id, name: names.get(id) })),
      }))
      tracksByArtistId[planet.id] = tracks
      // A repeated track uses the lowest artist ID as its global representative.
      for (const track of tracks)
        if (!Object.hasOwn(tracksById, track.id)) tracksById[track.id] = track
      return {
        key: `${chapter}:${planet.id}`,
        artistId: planet.id,
        spotifyArtistId: planet.id,
        chapter,
        chapters: [chapter],
        orbitLabel: ORBIT_LABELS[chapter],
        orbitLabels: [ORBIT_LABELS[chapter]],
        name: planet.name,
        note: planet.note,
        prominence: planet.size,
        region: planet.region,
        layoutSeed: planet.layoutSeed,
        spotifyUrl: planet.spotifyUrl,
        ...(planet.imageUrl ? { imageUrl: planet.imageUrl } : {}),
        trackIds: tracks.map(track => track.id),
      }
    })
  return {
    chapters: CHAPTERS.map(id => ({
      id,
      label: ORBIT_LABELS[id],
      orbitLabel: ORBIT_LABELS[id],
      description: {
        in_rotation:
          "Automatic placement favours short-term listening evidence.",
        always_returning:
          "Automatic placement groups artists ranked in both medium- and long-term artist windows.",
        creative_fuel:
          "Automatic placement holds the remaining evidenced artists.",
      }[id],
    })),
    planets,
    relationships: [],
    tracksById,
    tracksByArtistId,
    distantTracks: [],
    catalogueAvailable: true,
    homeStar: homeStarFor(snapshot.owner),
  }
}

function resolvePortraitModel(
  { portrait, snapshot, ownerIdentity },
  catalogue = null,
) {
  if (Boolean(portrait) === Boolean(snapshot))
    throw new Error("MusicPortrait requires exactly one portrait or snapshot")
  const model = snapshot
    ? buildSharedPortraitModel(snapshot)
    : buildMusicPortraitModel(portrait, catalogue)
  return {
    ...model,
    homeStar:
      ownerIdentity !== undefined
        ? homeStarFor(toPublicOwner(ownerIdentity))
        : model.homeStar || { ...HAKIM_HOME_STAR },
  }
}

module.exports = { buildSharedPortraitModel, resolvePortraitModel }

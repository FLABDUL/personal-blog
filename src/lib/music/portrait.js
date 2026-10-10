const CHAPTERS = ["in_rotation", "always_returning", "creative_fuel"]
const ORBIT_LABELS = {
  in_rotation: "Inner waters",
  always_returning: "Familiar seas",
  creative_fuel: "Outer reaches",
}
const ORBIT_DESCRIPTIONS = {
  in_rotation: "Music in my life right now.",
  always_returning: "Music connected to memory.",
  creative_fuel: "Music that fuels creativity.",
}

function spotifyEntityUrl(kind, id) {
  return `https://open.spotify.com/${kind}/${id}`
}

function validMetadata(kind, id, metadata) {
  return metadata?.id === id &&
    metadata.spotifyUrl === spotifyEntityUrl(kind, id)
    ? metadata
    : null
}

function buildMusicPortraitModel(portrait, catalogue = null) {
  const tracksByArtistId = Object.fromEntries(
    Object.keys(portrait.artists).map(id => [id, []]),
  )
  const tracksById = {}
  const distantTracks = []

  for (const track of Object.values(portrait.tracks)) {
    const metadata = validMetadata(
      "track",
      track.spotifyTrackId,
      catalogue?.tracks?.[track.spotifyTrackId],
    )
    const mapped = {
      id: track.id,
      spotifyTrackId: track.spotifyTrackId,
      name: metadata?.name || track.name,
      ...(track.note ? { note: track.note } : {}),
      ...(metadata ? { spotifyUrl: metadata.spotifyUrl } : {}),
      ...(metadata?.imageUrl ? { imageUrl: metadata.imageUrl } : {}),
      artists:
        metadata?.artists?.map(artist => ({
          id: artist.id,
          name: artist.name,
        })) || [],
    }
    tracksById[track.id] = mapped
    if (track.placement.kind === "moon")
      tracksByArtistId[track.placement.artistId].push(mapped)
    else distantTracks.push(mapped)
  }

  const planets = []
  const planetByArtistId = new Map()

  for (const chapter of CHAPTERS) {
    for (const member of portrait.chapters[chapter].members) {
      const existing = planetByArtistId.get(member.artistId)
      if (existing) {
        existing.chapters.push(chapter)
        existing.orbitLabels.push(ORBIT_LABELS[chapter])
        existing.prominence = Math.max(existing.prominence, member.prominence)
        continue
      }

      const artist = portrait.artists[member.artistId]
      const metadata = validMetadata(
        "artist",
        artist.spotifyArtistId,
        catalogue?.artists?.[artist.spotifyArtistId],
      )
      const planet = {
        key: `${chapter}:${artist.id}`,
        artistId: artist.id,
        spotifyArtistId: artist.spotifyArtistId,
        chapter,
        chapters: [chapter],
        orbitLabel: ORBIT_LABELS[chapter],
        orbitLabels: [ORBIT_LABELS[chapter]],
        name: metadata?.name || artist.name,
        note: artist.note,
        prominence: member.prominence,
        ...(metadata ? { spotifyUrl: metadata.spotifyUrl } : {}),
        ...(metadata?.imageUrl ? { imageUrl: metadata.imageUrl } : {}),
        trackIds: tracksByArtistId[artist.id].map(track => track.id),
      }
      planets.push(planet)
      planetByArtistId.set(artist.id, planet)
    }
  }

  return {
    chapters: CHAPTERS.map(id => ({
      id,
      label: portrait.chapters[id].label,
      orbitLabel: ORBIT_LABELS[id],
      description: ORBIT_DESCRIPTIONS[id],
    })),
    planets,
    relationships: portrait.relationships,
    tracksById,
    tracksByArtistId,
    distantTracks,
    catalogueAvailable: catalogue !== null,
  }
}

module.exports = {
  CHAPTERS,
  ORBIT_DESCRIPTIONS,
  ORBIT_LABELS,
  buildMusicPortraitModel,
  spotifyEntityUrl,
}

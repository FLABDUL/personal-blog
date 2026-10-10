const Ajv = require("ajv")

const schema = require("../../content/music/schema.json")

const validateSchema = new Ajv({ allErrors: true, jsonPointers: true }).compile(
  schema,
)
const pathFor = error =>
  `${error.dataPath.replace(/^\//, "").replaceAll("/", ".") || "portrait"}: ${error.message}`

function validateMusicPortrait(value) {
  const errors = []
  if (!validateSchema(value)) {
    errors.push(...validateSchema.errors.map(pathFor))
    return { valid: false, errors }
  }

  const artistSpotifyIds = new Map()
  for (const [key, artist] of Object.entries(value.artists)) {
    if (artist.id !== key)
      errors.push(`artists.${key}.id: must match its record key`)
    if (artistSpotifyIds.has(artist.spotifyArtistId)) {
      errors.push(`artists.${key}.spotifyArtistId: must be unique`)
    }
    artistSpotifyIds.set(artist.spotifyArtistId, key)
  }

  for (const [chapterId, chapter] of Object.entries(value.chapters)) {
    const seen = new Set()
    chapter.members.forEach((member, index) => {
      if (!value.artists[member.artistId]) {
        errors.push(
          `chapters.${chapterId}.members.${index}.artistId: unknown artist`,
        )
      }
      if (seen.has(member.artistId)) {
        errors.push(
          `chapters.${chapterId}.members.${index}.artistId: duplicate artist`,
        )
      }
      seen.add(member.artistId)
    })
  }

  const trackSpotifyIds = new Map()
  const trackCounts = new Map(Object.keys(value.artists).map(id => [id, 0]))
  for (const [key, track] of Object.entries(value.tracks)) {
    if (track.id !== key)
      errors.push(`tracks.${key}.id: must match its record key`)
    if (trackSpotifyIds.has(track.spotifyTrackId)) {
      errors.push(`tracks.${key}.spotifyTrackId: must be unique`)
    }
    trackSpotifyIds.set(track.spotifyTrackId, key)
    if (!value.artists[track.placement.artistId]) {
      errors.push(`tracks.${key}.placement.artistId: unknown artist`)
    } else {
      trackCounts.set(
        track.placement.artistId,
        trackCounts.get(track.placement.artistId) + 1,
      )
    }
  }
  for (const [artistId, count] of trackCounts) {
    if (count !== 3)
      errors.push(`artists.${artistId}: must have exactly three tracks`)
  }

  const relationshipIds = new Set()
  value.relationships.forEach((relationship, index) => {
    if (relationshipIds.has(relationship.id))
      errors.push(`relationships.${index}.id: must be unique`)
    relationshipIds.add(relationship.id)
    if (!value.artists[relationship.source])
      errors.push(`relationships.${index}.source: unknown artist`)
    if (!value.artists[relationship.target])
      errors.push(`relationships.${index}.target: unknown artist`)
  })

  if (value.status === "published") {
    for (const [kind, records] of [
      ["artists", Object.values(value.artists)],
      ["tracks", Object.values(value.tracks)],
      ["relationships", value.relationships],
    ]) {
      records.forEach((record, index) => {
        if (record.status !== "published")
          errors.push(`${kind}.${index}.status: must be published`)
      })
    }
  }

  return { valid: errors.length === 0, errors }
}

function collectSpotifyCatalogueIds(portrait) {
  const result = validateMusicPortrait(portrait)
  if (!result.valid) throw new Error("Music portrait is invalid")
  return {
    artistIds: Object.values(portrait.artists).map(
      artist => artist.spotifyArtistId,
    ),
    trackIds: Object.values(portrait.tracks).map(track => track.spotifyTrackId),
  }
}

module.exports = { collectSpotifyCatalogueIds, validateMusicPortrait }

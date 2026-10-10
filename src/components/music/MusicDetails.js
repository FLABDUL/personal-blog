import React from "react"

import * as styles from "./MusicPortrait.module.css"

export default function MusicDetails({ model, selection }) {
  if (!selection) return null
  if (selection.kind === "artist") {
    const planet = model.planets.find(item => item.key === selection.nodeKey)
    if (!planet) return null
    return (
      <aside
        className={styles.atlasDetails}
        role="region"
        aria-label="Selected music details"
      >
        <p className={styles.detailEyebrow}>{planet.orbitLabels.join(" · ")}</p>
        <h2>{planet.name}</h2>
        <p>{planet.note || "This artist has a place in Hakim's music map."}</p>
        {planet.spotifyUrl ? (
          <a href={planet.spotifyUrl} target="_blank" rel="noopener noreferrer">
            Open {planet.name} in Spotify
          </a>
        ) : null}
      </aside>
    )
  }
  if (selection.kind === "track") {
    const track = model.tracksById[selection.trackId]
    if (!track) return null
    return (
      <aside
        className={styles.atlasDetails}
        role="region"
        aria-label="Selected music details"
      >
        <p className={styles.detailEyebrow}>Selected song</p>
        <h2>{track.name}</h2>
        {track.note ? <p>{track.note}</p> : null}
        {track.artists.length > 0 ? (
          <p>By {track.artists.map(artist => artist.name).join(", ")}.</p>
        ) : null}
        {track.spotifyUrl ? (
          <a href={track.spotifyUrl} target="_blank" rel="noopener noreferrer">
            Open {track.name} in Spotify
          </a>
        ) : null}
      </aside>
    )
  }
  const relationship = model.relationships.find(
    item => item.id === selection.relationshipId,
  )
  if (!relationship) return null
  const source = model.planets.find(
    planet => planet.artistId === relationship.source,
  )
  const target = model.planets.find(
    planet => planet.artistId === relationship.target,
  )
  return (
    <aside
      className={styles.atlasDetails}
      role="region"
      aria-label="Selected music details"
    >
      <p className={styles.detailEyebrow}>Charted connection</p>
      <h2>
        {source?.name} and {target?.name}
      </h2>
      <p>{relationship.text}</p>
    </aside>
  )
}

import React from "react"

import * as styles from "./MusicPortrait.module.css"

export default function SpotifyEmbed({ track }) {
  const id = track?.spotifyTrackId || track?.id
  if (typeof id !== "string" || !/^[A-Za-z0-9]{22}$/.test(id)) return null
  const destination = `https://open.spotify.com/track/${id}`
  if (track.spotifyUrl && track.spotifyUrl !== destination) return null
  const artists = track.artists?.map(artist => artist.name).join(", ")
  return (
    <div className={styles.spotifyEmbed}>
      <iframe
        src={`https://open.spotify.com/embed/track/${id}`}
        title={`Spotify player for ${track.name}${artists ? ` by ${artists}` : ""}`}
        width="100%"
        height="152"
        allow="autoplay; clipboard-write; encrypted-media; fullscreen; picture-in-picture"
        allowFullScreen
      />
      <a href={destination} target="_blank" rel="noopener noreferrer">
        Open {track.name} in Spotify
      </a>
    </div>
  )
}

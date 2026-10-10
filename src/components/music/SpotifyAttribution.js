import React from "react"

import * as styles from "./MusicPortrait.module.css"

export default function SpotifyAttribution() {
  return (
    <div
      className={styles.catalogueAttribution}
      aria-label="Spotify catalogue attribution"
    >
      <img
        className={styles.spotifyLogo}
        src="/music/spotify-mark.svg"
        alt="Spotify"
        width="146"
        height="40"
      />
      <p>Catalogue details and artwork from Spotify.</p>
      <a
        href="https://open.spotify.com/"
        target="_blank"
        rel="noopener noreferrer"
      >
        Continue exploring on Spotify
      </a>
    </div>
  )
}

import React, { useEffect } from "react"

import * as styles from "./MusicPortrait.module.css"

export default function ShootingStars({ tracks, onComplete }) {
  useEffect(() => {
    if (!tracks.length) return undefined
    // Finish even when animation events are unavailable or the document is hidden.
    const timeout = window.setTimeout(onComplete, 2100)
    return () => window.clearTimeout(timeout)
  }, [tracks, onComplete])
  if (!tracks.length) return null
  return (
    <g
      className={styles.shootingStars}
      data-shooting-stars
      aria-hidden="true"
      pointerEvents="none"
    >
      {tracks.map((track, index) => (
        <g
          key={track.id}
          data-arrival-track={track.id}
          className={styles.shootingStar}
          style={{
            "--arrival-y": `${130 + index * 240}px`,
            "--arrival-delay": `${index * 200}ms`,
          }}
          onAnimationEnd={index === tracks.length - 1 ? onComplete : undefined}
        >
          <path d="M -85 -25 L 0 0" />
          <circle r="4" />
        </g>
      ))}
    </g>
  )
}

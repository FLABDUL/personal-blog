import React from "react"

import PlanetArtwork from "./PlanetArtwork"
import * as styles from "./MusicPortrait.module.css"

export default function TrackNode({
  track,
  x,
  y,
  radius,
  selected = false,
  onActivate,
  showLabel = true,
  labelX = 0,
  labelY = radius + 18,
  labelAnchor = "middle",
  bounded = false,
  hitRadius = Math.max(22, radius),
  caption = track.name,
  labelWidth,
}) {
  return (
    <g
      className={styles.trackNode}
      data-track-id={track.id}
      data-bounded-moon={bounded}
      transform={`translate(${x} ${y})`}
    >
      <g
        className={styles.nodeSelector}
        role="button"
        tabIndex="0"
        data-node-selector
        aria-label={`Track ${track.name}${track.artists.length ? ` by ${track.artists.map(artist => artist.name).join(", ")}` : ""}`}
        aria-pressed={selected}
        onClick={event => {
          event.currentTarget.focus()
          onActivate?.(track)
        }}
        onKeyDown={event => {
          if (event.key === "Enter" || event.key === " ") onActivate?.(track)
        }}
      >
        {!bounded ? (
          <rect
            className={styles.mobileSelectorHitTarget}
            x="-100"
            y="80"
            width="200"
            height="160"
            rx="24"
            fill="transparent"
          />
        ) : null}
        <circle
          data-hit-target
          r={hitRadius}
          fill="transparent"
          pointerEvents="all"
        />
        <circle className={styles.trackBody} r={radius} />
        <PlanetArtwork
          variant="catalogue"
          imageUrl={track.imageUrl}
          initials="♪"
          size={radius * 2}
        />
        {showLabel ? (
          <text
            className={styles.trackLabel}
            x={labelX}
            y={labelY}
            textAnchor={labelAnchor}
            textLength={labelWidth}
            lengthAdjust={labelWidth ? "spacingAndGlyphs" : undefined}
          >
            {caption}
          </text>
        ) : null}
      </g>
    </g>
  )
}

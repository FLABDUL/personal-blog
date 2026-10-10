import React from "react"

import PlanetArtwork from "./PlanetArtwork"
import * as styles from "./MusicPortrait.module.css"

const initialsFor = name =>
  name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map(part => part[0])
    .join("")
    .toUpperCase()

const activateOnKey = (event, activate) => {
  if (event.key !== "Enter" && event.key !== " ") return
  event.preventDefault()
  activate()
}

export default function ArtistPlanet({
  planet,
  selected = false,
  regionSpotlighted = false,
  regionQuiet = false,
  onActivate,
}) {
  const activate = () => onActivate?.(planet)
  return (
    <g
      className={styles.atlasPlanet}
      data-artist-id={planet.artistId}
      data-node-key={planet.key}
      data-label-anchor={planet.labelAnchor}
      transform={`translate(${planet.x} ${planet.y})`}
    >
      <g
        className={styles.nodeSelector}
        role="button"
        tabIndex="0"
        data-node-selector
        data-region-spotlighted={regionSpotlighted}
        data-region-quiet={regionQuiet}
        aria-label={`Explore ${planet.name}, ${planet.orbitLabels.join(" and ")}, authored prominence ${planet.prominence} out of 5`}
        aria-pressed={selected}
        onClick={event => {
          event.currentTarget.focus()
          activate()
        }}
        onKeyDown={event => activateOnKey(event, activate)}
      >
        <rect
          className={styles.mobileSelectorHitTarget}
          x={planet.labelAnchor === "start" ? 80 : -280}
          y="-80"
          width="200"
          height="160"
          rx="24"
          fill="transparent"
        />
        <circle
          data-hit-target
          r={Math.max(22, planet.radius)}
          fill="transparent"
          pointerEvents="all"
        />
        <circle
          className={styles.atlasPlanetBody}
          data-planet-body
          r={planet.radius}
        />
        <PlanetArtwork
          variant="catalogue"
          imageUrl={planet.imageUrl}
          initials={initialsFor(planet.name)}
          size={planet.radius * 2}
        />
        {planet.chapters.length > 1 ? (
          <g
            className={styles.regionMembershipMarker}
            data-region-count={planet.chapters.length}
          >
            {planet.chapters.map((chapter, index) => (
              <circle
                key={chapter}
                data-region-chapter={chapter}
                cx={planet.radius * 0.66}
                cy={-planet.radius * 0.66 + index * 13}
                r="5"
              />
            ))}
          </g>
        ) : null}
        <text
          className={styles.atlasPlanetLabel}
          x={
            planet.labelAnchor === "end"
              ? -planet.radius - 12
              : planet.radius + 12
          }
          y="5"
          textAnchor={planet.labelAnchor}
        >
          {planet.name}
        </text>
      </g>
    </g>
  )
}

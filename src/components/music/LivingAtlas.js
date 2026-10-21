import React, { useState } from "react"

import { computeDistantTrackLayout } from "../../lib/music/layout"
import OrbitLayer from "./OrbitLayer"
import PlanetArtwork from "./PlanetArtwork"
import TrackNode from "./TrackNode"
import * as styles from "./MusicPortrait.module.css"

// Fixed positions keep the decorative sky identical during server rendering and hydration.
const stars = (() => {
  let seed = 1747
  const coordinate = () => {
    seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0
    return 35 + (seed % 930)
  }
  return Array.from({ length: 96 }, (_, index) => ({
    x: coordinate(),
    y: coordinate(),
    radius: 0.8 + (index % 4) * 0.45,
  }))
})()

export default function LivingAtlas({
  model,
  layout,
  spotlight,
  selection,
  allPaused,
  onSelect,
  onReset,
}) {
  const [pausedOrbit, setPausedOrbit] = useState(null)
  const distantTracks = computeDistantTrackLayout(model, layout.size)
  const selectedNodeKey =
    selection?.kind === "artist" || selection?.kind === "track"
      ? selection.nodeKey
      : undefined
  const selectedChapter = selectedNodeKey
    ? layout.planets.find(planet => planet.key === selectedNodeKey)?.chapter
    : undefined
  const orderedOrbits = selectedChapter
    ? [...layout.orbits].sort(
        (first, second) =>
          Number(first.chapter === selectedChapter) -
          Number(second.chapter === selectedChapter),
      )
    : layout.orbits

  return (
    <svg
      className={styles.livingAtlas}
      viewBox={`0 0 ${layout.size} ${layout.size}`}
      role="group"
      aria-label="Living Atlas music map"
    >
      <rect
        data-atlas-background
        x="0"
        y="0"
        width={layout.size}
        height={layout.size}
        fill="transparent"
        onClick={onReset}
      />
      <g className={styles.atlasGrid} aria-hidden="true">
        {Array.from({ length: 9 }, (_, index) => {
          const position = (layout.size / 10) * (index + 1)
          return (
            <path
              key={position}
              d={`M ${position} 40 V ${layout.size - 40} M 40 ${position} H ${layout.size - 40}`}
            />
          )
        })}
      </g>
      <g
        className={styles.starField}
        data-atlas-stars
        aria-hidden="true"
        focusable="false"
        transform={`scale(${layout.size / 1000})`}
      >
        {stars.map((star, index) => (
          <circle key={index} cx={star.x} cy={star.y} r={star.radius} />
        ))}
        {stars
          .filter((_, index) => index % 12 === 5)
          .map((star, index) => (
            <path
              key={index}
              className={styles.twinkle}
              d={`M ${star.x} ${star.y - 7} Q ${star.x + 1} ${star.y - 1} ${star.x + 5} ${star.y} Q ${star.x + 1} ${star.y + 1} ${star.x} ${star.y + 7} Q ${star.x - 1} ${star.y + 1} ${star.x - 5} ${star.y} Q ${star.x - 1} ${star.y - 1} ${star.x} ${star.y - 7}`}
              style={{
                "--twinkle-duration": `${7 + (index % 4)}s`,
                "--twinkle-delay": `${-index * 1.7}s`,
              }}
            />
          ))}
      </g>
      {orderedOrbits.map(orbit => (
        <OrbitLayer
          key={orbit.chapter}
          orbit={orbit}
          planets={layout.planets.filter(
            planet => planet.chapter === orbit.chapter,
          )}
          model={model}
          spotlight={spotlight}
          selection={selection}
          paused={allPaused || pausedOrbit === orbit.chapter}
          onPauseChange={paused =>
            setPausedOrbit(current =>
              paused
                ? orbit.chapter
                : current === orbit.chapter
                  ? null
                  : current,
            )
          }
          onSelect={onSelect}
        />
      ))}
      {distantTracks.map(position => {
        const track = model.tracksById[position.trackId]
        return track ? (
          <TrackNode
            key={track.id}
            track={track}
            x={position.x}
            y={position.y}
            radius={position.radius}
            selected={
              selection?.kind === "track" && selection.trackId === track.id
            }
            onActivate={() => onSelect({ kind: "track", trackId: track.id })}
          />
        ) : null
      })}
      <g
        className={styles.atlasHomeStar}
        role="button"
        tabIndex="0"
        aria-label="Reset music map · Hakim · Home star"
        transform={`translate(${layout.centre} ${layout.centre})`}
        onClick={event => {
          event.currentTarget.focus()
          onReset()
        }}
        onKeyDown={event => {
          if (event.key !== "Enter" && event.key !== " ") return
          event.preventDefault()
          onReset()
        }}
      >
        <rect
          className={styles.mobileSelectorHitTarget}
          x="-80"
          y="-80"
          width="160"
          height="160"
          rx="80"
          fill="transparent"
        />
        <circle r="58" />
        <circle r="40" />
        <g role="img" aria-label="Abdul Hakim Norazman">
          <PlanetArtwork
            variant="home"
            imageUrl="/profile.jpg"
            initials="HN"
            size={80}
          />
        </g>
        <text className={styles.atlasHomeStarLabel} textAnchor="middle" y="82">
          HAKIM · HOME STAR
        </text>
      </g>
    </svg>
  )
}

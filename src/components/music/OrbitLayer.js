import React from "react"

import { computeMoonLayout } from "../../lib/music/layout"
import ArtistPlanet from "./ArtistPlanet"
import TrackNode from "./TrackNode"
import * as styles from "./MusicPortrait.module.css"

const LABEL_POSITION = {
  in_rotation: { x: 72, y: 104 },
  always_returning: { x: 72, y: 232 },
  creative_fuel: { x: 72, y: 360 },
}
const activateOnKey = (event, activate) => {
  if (event.key !== "Enter" && event.key !== " ") return
  event.preventDefault()
  activate()
}

export default function OrbitLayer({
  orbit,
  planets,
  model,
  spotlight,
  selection,
  paused,
  onPauseChange,
  onSpotlight,
  onSelect,
}) {
  const position = LABEL_POSITION[orbit.chapter]
  const quiet = spotlight !== null && spotlight !== orbit.chapter
  const planetByArtistId = new Map(
    planets.map(planet => [planet.artistId, planet]),
  )
  const relationships = model.relationships.filter(
    relationship =>
      relationship.chapters.includes(orbit.chapter) &&
      planetByArtistId.has(relationship.source) &&
      planetByArtistId.has(relationship.target),
  )

  return (
    <g
      className={styles.orbitLayer}
      role="group"
      aria-label={orbit.label}
      data-orbit-chapter={orbit.chapter}
      data-spotlighted={spotlight === orbit.chapter}
      data-quiet={quiet}
      data-paused={paused}
      style={{
        "--orbit-duration": `${orbit.durationSeconds}s`,
        "--orbit-direction": orbit.direction,
      }}
      onPointerEnter={() => onPauseChange(true)}
      onPointerLeave={() => onPauseChange(false)}
      onFocus={() => onPauseChange(true)}
      onBlur={event => {
        if (
          event.relatedTarget instanceof Node &&
          event.currentTarget.contains(event.relatedTarget)
        )
          return
        onPauseChange(false)
      }}
    >
      <circle
        className={styles.atlasOrbit}
        cx={orbit.centre}
        cy={orbit.centre}
        r={orbit.radius}
        aria-hidden="true"
      />
      <g
        className={styles.orbitLabelControl}
        role="button"
        tabIndex="0"
        aria-label={`Spotlight ${orbit.label}`}
        aria-pressed={spotlight === orbit.chapter}
        transform={`translate(${position.x} ${position.y})`}
        onClick={event => {
          event.currentTarget.focus()
          onSpotlight(orbit.chapter)
        }}
        onKeyDown={event =>
          activateOnKey(event, () => onSpotlight(orbit.chapter))
        }
      >
        <rect
          data-hit-target
          x="-18"
          y="-80"
          width="160"
          height="160"
          rx="24"
          fill="transparent"
        />
        <rect x="-18" y="-24" width="150" height="42" rx="18" />
        <text x="0" y="3">
          {orbit.label}
        </text>
      </g>
      <g className={styles.orbitMotion}>
        {relationships.map(relationship => {
          const source = planetByArtistId.get(relationship.source)
          const target = planetByArtistId.get(relationship.target)
          const selected =
            selection?.kind === "relationship" &&
            selection.relationshipId === relationship.id
          const activate = () =>
            onSelect({ kind: "relationship", relationshipId: relationship.id })
          return (
            <g
              key={relationship.id}
              className={styles.atlasRelationship}
              role="button"
              tabIndex="0"
              aria-label={`${source.name} and ${target.name}: ${relationship.text}`}
              aria-pressed={selected}
              onClick={event => {
                event.currentTarget.focus()
                activate()
              }}
              onKeyDown={event => activateOnKey(event, activate)}
            >
              <path
                d={`M ${source.x} ${source.y} Q ${orbit.centre} ${orbit.centre} ${target.x} ${target.y}`}
              />
              <path
                d={`M ${source.x} ${source.y} Q ${orbit.centre} ${orbit.centre} ${target.x} ${target.y}`}
                stroke="transparent"
                strokeWidth="22"
                fill="none"
                pointerEvents="stroke"
              />
            </g>
          )
        })}
        {planets.map(planet => {
          const selected =
            selection?.kind === "artist" && selection.nodeKey === planet.key
          const showMoons =
            (selection?.kind === "artist" || selection?.kind === "track") &&
            selection.nodeKey === planet.key
          return (
            <g
              key={planet.key}
              className={styles.planetUpright}
              style={{
                "--planet-x": `${planet.x}px`,
                "--planet-y": `${planet.y}px`,
              }}
            >
              <ArtistPlanet
                planet={planet}
                selected={selected}
                regionSpotlighted={
                  spotlight !== null && planet.chapters.includes(spotlight)
                }
                regionQuiet={
                  spotlight !== null && !planet.chapters.includes(spotlight)
                }
                onActivate={() =>
                  onSelect({
                    kind: "artist",
                    nodeKey: planet.key,
                    artistId: planet.artistId,
                  })
                }
              />
              {showMoons ? (
                <g
                  className={styles.moonSystem}
                  role="group"
                  aria-label={`Songs orbiting ${planet.name}`}
                  data-paused={selection?.kind === "track"}
                  style={{
                    "--moon-centre-x": `${planet.x}px`,
                    "--moon-centre-y": `${planet.y}px`,
                    "--moon-duration": "18s",
                  }}
                >
                  {computeMoonLayout(
                    planet,
                    planet.trackIds.map(id => model.tracksById[id]),
                  ).map(moon => {
                    const track = model.tracksById[moon.trackId]
                    const moonX = planet.x + moon.x
                    const moonY = planet.y + moon.y
                    return track ? (
                      <g
                        key={track.id}
                        className={styles.moonUpright}
                        style={{
                          "--moon-x": `${moonX}px`,
                          "--moon-y": `${moonY}px`,
                          "--moon-duration": "18s",
                        }}
                      >
                        <TrackNode
                          track={track}
                          x={moonX}
                          y={moonY}
                          radius={moon.radius}
                          labelX={moon.labelX}
                          labelY={moon.labelY}
                          labelAnchor={moon.labelAnchor}
                          selected={
                            selection?.kind === "track" &&
                            selection.trackId === track.id
                          }
                          onActivate={() =>
                            onSelect({
                              kind: "track",
                              trackId: track.id,
                              nodeKey: planet.key,
                            })
                          }
                        />
                      </g>
                    ) : null
                  })}
                </g>
              ) : null}
            </g>
          )
        })}
      </g>
    </g>
  )
}

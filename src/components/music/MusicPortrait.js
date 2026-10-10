import React, { useEffect, useMemo, useRef, useState } from "react"

import { computeAtlasLayout } from "../../lib/music/layout"
import { buildMusicPortraitModel } from "../../lib/music/portrait"
import LivingAtlas from "./LivingAtlas"
import MusicDetails from "./MusicDetails"
import SpotifyAttribution from "./SpotifyAttribution"
import useSpotifyCatalogue from "./useSpotifyCatalogue"
import * as styles from "./MusicPortrait.module.css"

export default function MusicPortrait({ portrait }) {
  const previewCatalogueUrl =
    process.env.GATSBY_MUSIC_DRAFT_PREVIEW === "1"
      ? "/music/catalogue-preview.json"
      : null
  const { status, catalogue } = useSpotifyCatalogue(
    "/api/spotify-catalogue",
    previewCatalogueUrl,
  )
  const model = useMemo(
    () => buildMusicPortraitModel(portrait, catalogue),
    [portrait, catalogue],
  )
  const layout = useMemo(() => computeAtlasLayout(model), [model])
  const [spotlight, setSpotlight] = useState(null)
  const [selection, setSelection] = useState(null)
  const [prefersReducedMotion, setPrefersReducedMotion] = useState(false)
  const [pageVisible, setPageVisible] = useState(true)
  const artistTriggerRef = useRef(null)

  const selectFromTrigger = next => {
    if (next.kind === "artist")
      artistTriggerRef.current = document.activeElement
    setSelection(current => {
      if (current?.kind !== next.kind) return next
      if (next.kind === "artist" && current.nodeKey === next.nodeKey)
        return null
      if (next.kind === "track" && current.trackId === next.trackId) return null
      if (
        next.kind === "relationship" &&
        current.relationshipId === next.relationshipId
      )
        return null
      return next
    })
  }

  useEffect(() => {
    if (!selection) return undefined
    const closeOnEscape = event => {
      if (event.key !== "Escape") return
      event.preventDefault()
      if (selection.kind === "track" && selection.nodeKey) {
        const planet = model.planets.find(
          item => item.key === selection.nodeKey,
        )
        setSelection(
          planet
            ? { kind: "artist", nodeKey: planet.key, artistId: planet.artistId }
            : null,
        )
      } else {
        setSelection(null)
      }
      window.setTimeout(
        () => artistTriggerRef.current?.focus({ preventScroll: true }),
        0,
      )
    }
    document.addEventListener("keydown", closeOnEscape)
    return () => document.removeEventListener("keydown", closeOnEscape)
  }, [model, selection])

  useEffect(() => {
    const mediaQuery = window.matchMedia?.("(prefers-reduced-motion: reduce)")
    if (!mediaQuery) return undefined
    const update = () => setPrefersReducedMotion(mediaQuery.matches)
    update()
    mediaQuery.addEventListener?.("change", update)
    return () => mediaQuery.removeEventListener?.("change", update)
  }, [])

  useEffect(() => {
    const update = () => setPageVisible(document.visibilityState === "visible")
    update()
    document.addEventListener("visibilitychange", update)
    return () => document.removeEventListener("visibilitychange", update)
  }, [])

  const allPaused = selection !== null || !pageVisible || prefersReducedMotion
  const message =
    status === "available"
      ? "Catalogue details and artwork from Spotify."
      : "Catalogue details are unavailable; the authored map remains complete."

  return (
    <section
      className={styles.portrait}
      aria-label="Interactive music portrait"
      data-catalogue-status={status}
      data-selection={selection?.kind || "none"}
      data-all-paused={allPaused}
      data-reduced-motion={prefersReducedMotion}
      data-page-visible={pageVisible}
    >
      <p className={styles.atlasStatus}>{message}</p>
      <div className={styles.atlasFrame}>
        <LivingAtlas
          model={model}
          layout={layout}
          spotlight={spotlight}
          selection={selection}
          allPaused={allPaused}
          onSpotlight={chapter =>
            setSpotlight(current => (current === chapter ? null : chapter))
          }
          onSelect={selectFromTrigger}
          onReset={() => {
            setSelection(null)
            setSpotlight(null)
          }}
        />
        <MusicDetails model={model} selection={selection} />
        <details className={styles.atlasGuide}>
          <summary>How to read this map</summary>
          <p>
            Each orbit is a part of Hakim&apos;s listening life. Select its name
            to bring that region forward.
          </p>
          <p>Planet size shows authored prominence from 1 to 5.</p>
          <p>Choose an artist to reveal songs as orbiting moons.</p>
          <div className={styles.regionGuide}>
            {model.chapters.map(chapter => (
              <p key={chapter.id}>
                <strong>{chapter.orbitLabel}</strong>
                <span>{chapter.description}</span>
              </p>
            ))}
          </div>
        </details>
        <SpotifyAttribution />
      </div>
    </section>
  )
}

import React, { useCallback, useEffect, useMemo, useRef, useState } from "react"

import { selectArrivals } from "../../lib/music/arrivals"
import { computeAtlasLayout } from "../../lib/music/layout"
import { resolvePortraitModel } from "../../lib/music/snapshot"
import LivingAtlas from "./LivingAtlas"
import MusicDetails from "./MusicDetails"
import SpotifyAttribution from "./SpotifyAttribution"
import useSpotifyCatalogue from "./useSpotifyCatalogue"
import * as styles from "./MusicPortrait.module.css"

// Only browser effects update this tab-lifetime fallback when storage is denied.
const seenSnapshots = new Set()

function reconcileSelection(selection, model, source) {
  if (!selection || selection.source !== source) return null
  if (selection.kind === "artist" || selection.nodeKey) {
    const planet = model.planets.find(p => p.artistId === selection.artistId)
    if (!planet) return null
    if (
      selection.kind === "track" &&
      !planet.trackIds.includes(selection.trackId)
    )
      return {
        kind: "artist",
        nodeKey: planet.key,
        artistId: planet.artistId,
        source,
      }
    return selection.nodeKey === planet.key
      ? selection
      : { ...selection, nodeKey: planet.key }
  }
  if (selection.kind === "track")
    return model.distantTracks.some(t => t.id === selection.trackId)
      ? selection
      : null
  return model.relationships.some(r => r.id === selection.relationshipId)
    ? selection
    : null
}

export default function MusicPortrait({ portrait, snapshot, ownerIdentity }) {
  const previewCatalogueUrl =
    process.env.GATSBY_MUSIC_DRAFT_PREVIEW === "1"
      ? "/music/catalogue-preview.json"
      : null
  const { status, catalogue } = useSpotifyCatalogue(
    snapshot ? null : "/api/spotify-catalogue",
    previewCatalogueUrl,
  )
  const model = useMemo(
    () =>
      resolvePortraitModel({ portrait, snapshot, ownerIdentity }, catalogue),
    [portrait, snapshot, ownerIdentity, catalogue],
  )
  const [compact, setCompact] = useState(false)
  const layout = useMemo(
    () => computeAtlasLayout(model, 1000, { compact }),
    [model, compact],
  )
  const [spotlight, setSpotlight] = useState(null)
  const [storedSelection, setSelection] = useState(null)
  const source = snapshot ? "snapshot" : "authored"
  const selection = useMemo(
    () => reconcileSelection(storedSelection, model, source),
    [storedSelection, model, source],
  )
  const [prefersReducedMotion, setPrefersReducedMotion] = useState(false)
  const [pageVisible, setPageVisible] = useState(true)
  const artistTriggerRef = useRef(null)
  const portraitRef = useRef(null)
  const focusedControlRef = useRef(null)
  const [arrivals, setArrivals] = useState(null)

  useEffect(() => {
    if (
      !snapshot ||
      window.matchMedia?.("(prefers-reduced-motion: reduce)").matches
    ) {
      setArrivals(null)
      return
    }
    if (seenSnapshots.has(snapshot.snapshotId)) {
      setArrivals(current =>
        current?.snapshotId === snapshot.snapshotId ? current : null,
      )
      return
    }
    let lastSeen
    try {
      lastSeen = window.sessionStorage.getItem("music-portrait-seen-snapshot")
    } catch {
      // Storage denial must not prevent selection or finite motion.
    }
    const tracks = selectArrivals(snapshot, Date.now(), lastSeen)
    seenSnapshots.add(snapshot.snapshotId)
    setArrivals(
      tracks.length ? { snapshotId: snapshot.snapshotId, tracks } : null,
    )
  }, [snapshot, prefersReducedMotion])

  const completeArrivals = useCallback(() => {
    if (!arrivals) return
    try {
      window.sessionStorage.setItem(
        "music-portrait-seen-snapshot",
        arrivals.snapshotId,
      )
    } catch {
      // The tab's seen set also prevents replay when storage fails.
    }
    setArrivals(null)
  }, [arrivals])

  useEffect(() => {
    const media = window.matchMedia("(max-width: 30rem)")
    const update = () => setCompact(media.matches)
    update()
    media.addEventListener("change", update)
    return () => media.removeEventListener("change", update)
  }, [])

  useEffect(() => {
    const rememberFocus = event => {
      if (event.type === "focusin")
        focusedControlRef.current = portraitRef.current?.contains(event.target)
          ? event.target
          : null
      else {
        const focused = focusedControlRef.current
        // Removal can emit focusout before the SVG node disconnects.
        queueMicrotask(() => {
          if (
            focusedControlRef.current === focused &&
            focused?.isConnected &&
            document.activeElement !== focused
          )
            focusedControlRef.current = null
        })
      }
    }
    document.addEventListener("focusin", rememberFocus)
    document.addEventListener("focusout", rememberFocus)
    return () => {
      document.removeEventListener("focusin", rememberFocus)
      document.removeEventListener("focusout", rememberFocus)
    }
  }, [])

  useEffect(() => {
    if (storedSelection !== selection) setSelection(selection)
    const disconnected =
      artistTriggerRef.current && !artistTriggerRef.current.isConnected
    if (disconnected || storedSelection !== selection) {
      const node =
        selection?.nodeKey &&
        [...portraitRef.current.querySelectorAll("[data-node-key]")].find(
          n => n.getAttribute("data-node-key") === selection.nodeKey,
        )
      const trigger = node?.querySelector("[data-node-selector]") || null
      artistTriggerRef.current = trigger
      if (
        storedSelection &&
        focusedControlRef.current &&
        !focusedControlRef.current.isConnected &&
        document.activeElement === document.body
      )
        (
          trigger ||
          portraitRef.current.querySelector('[aria-label="Reset music map"]')
        )?.focus({ preventScroll: true })
    }
    if (!selection) artistTriggerRef.current = null
  }, [model, storedSelection, selection])

  const selectFromTrigger = next => {
    const planet = model.planets.find(p => p.key === next.nodeKey)
    next = { ...next, source, ...(planet ? { artistId: planet.artistId } : {}) }
    if (next.kind === "artist")
      artistTriggerRef.current = document.activeElement
    setSelection(current => {
      if (current?.source !== source || current?.kind !== next.kind) return next
      if (next.kind === "artist" && current.nodeKey === next.nodeKey)
        return null
      if (
        next.kind === "track" &&
        current.trackId === next.trackId &&
        current.nodeKey === next.nodeKey
      )
        return null
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
      if (
        event.key !== "Escape" ||
        event.defaultPrevented ||
        !portraitRef.current?.contains(event.target)
      )
        return
      event.preventDefault()
      const trigger = artistTriggerRef.current
      if (selection.kind === "track" && selection.nodeKey) {
        const planet = model.planets.find(
          item => item.key === selection.nodeKey,
        )
        setSelection(
          planet
            ? {
                kind: "artist",
                nodeKey: planet.key,
                artistId: planet.artistId,
                source,
              }
            : null,
        )
      } else {
        setSelection(null)
      }
      ;(trigger?.isConnected
        ? trigger
        : portraitRef.current?.querySelector('[aria-label="Reset music map"]')
      )?.focus({ preventScroll: true })
    }
    document.addEventListener("keydown", closeOnEscape)
    return () => document.removeEventListener("keydown", closeOnEscape)
  }, [model, selection, source])

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
    snapshot || status === "available"
      ? "Catalogue details and artwork from Spotify."
      : "Catalogue details are unavailable; the authored map remains complete."

  return (
    <section
      ref={portraitRef}
      className={styles.portrait}
      aria-label="Interactive music portrait"
      data-source={snapshot ? "snapshot" : "authored"}
      data-dense-layout={layout.dense}
      data-compact-expanded={Boolean(snapshot && compact && selection?.nodeKey)}
      data-catalogue-status={snapshot ? "available" : status}
      data-selection={selection?.kind || "none"}
      data-all-paused={allPaused}
      data-reduced-motion={prefersReducedMotion}
      data-page-visible={pageVisible}
    >
      <p className={styles.atlasStatus}>{message}</p>
      <div className={styles.atlasFrame}>
        <div
          className={styles.regionFilters}
          role="group"
          aria-label="Music map regions"
        >
          {model.chapters.map(chapter => (
            <button
              key={chapter.id}
              type="button"
              aria-label={`Spotlight ${chapter.orbitLabel}`}
              aria-pressed={spotlight === chapter.id}
              onClick={() =>
                setSpotlight(current =>
                  current === chapter.id ? null : chapter.id,
                )
              }
            >
              {chapter.orbitLabel}
            </button>
          ))}
        </div>
        <details className={styles.atlasGuide}>
          <summary>How to read this map</summary>
          <p>
            {snapshot ? (
              <>
                Automatic regions interpret listening evidence; saved owner
                choices can override their placement. Select a region name to
                bring it forward.
              </>
            ) : (
              <>
                Each orbit is a part of Hakim&apos;s listening life. Select its
                name to bring that region forward.
              </>
            )}
          </p>
          <p>
            {snapshot
              ? "Planet size summarises listening evidence in five bands, from 1 to 5."
              : "Planet size shows authored prominence from 1 to 5."}
          </p>
          <p>Choose an artist to reveal songs as orbiting moons.</p>
          {snapshot && layout.dense ? (
            <p>
              This compact view spreads artists across the chart. Use the region
              controls to spotlight their listening regions.
            </p>
          ) : null}
          <div className={styles.regionGuide}>
            {model.chapters.map(chapter => (
              <p key={chapter.id}>
                <strong>{chapter.orbitLabel}</strong>
                <span>{chapter.description}</span>
              </p>
            ))}
          </div>
        </details>
        <div className={styles.atlasCanvas}>
          <LivingAtlas
            model={model}
            homeStar={model.homeStar}
            layout={layout}
            spotlight={spotlight}
            selection={selection}
            allPaused={allPaused}
            arrivals={
              arrivals?.snapshotId === snapshot?.snapshotId
                ? arrivals?.tracks
                : undefined
            }
            onArrivalsComplete={completeArrivals}
            onSelect={selectFromTrigger}
            onReset={() => {
              setSelection(null)
              setSpotlight(null)
            }}
          />
        </div>
        <MusicDetails
          model={model}
          selection={selection}
          ownerName={snapshot ? model.homeStar.displayName : undefined}
        />
        <SpotifyAttribution />
      </div>
    </section>
  )
}

import React, { useEffect, useRef, useState } from "react"
import MusicPortrait from "./MusicPortrait"
import useMusicPortraitOwner from "./useMusicPortraitOwner"
import * as styles from "./MusicPortraitStudio.module.css"

export default function MusicPortraitStudio() {
  const {
    data,
    pending,
    status,
    deleted,
    authStart,
    perform: request,
    announce,
  } = useMusicPortraitOwner()
  const [choices, setChoices] = useState({})
  const dirty = useRef(false)
  const urlRef = useRef(null)
  const headingRef = useRef(null)
  const [copying, setCopying] = useState(false)
  const copyAttempt = useRef(null)
  const lifetime = useRef(null)
  const currentUrl = useRef(null)
  const actionFocus = useRef(null)
  currentUrl.current = data?.publicUrl || null
  useEffect(() => {
    lifetime.current = {}
    return () => {
      lifetime.current = null
      copyAttempt.current = null
    }
  }, [])
  useEffect(() => {
    copyAttempt.current = null
    setCopying(false)
  }, [data?.publicUrl])
  useEffect(() => {
    const attempt = copyAttempt.current
    if (copying || !attempt?.copied) return
    attempt.copied = false
    if (
      lifetime.current === attempt.lifetime &&
      currentUrl.current === attempt.url &&
      attempt.trigger?.isConnected &&
      !attempt.trigger.disabled &&
      document.activeElement === document.body
    )
      attempt.trigger.focus({ preventScroll: true })
  }, [copying])
  useEffect(() => {
    if (data && !dirty.current) setChoices(data.owner.overrides)
  }, [data])
  useEffect(() => {
    if (deleted) {
      setChoices({})
      dirty.current = false
      headingRef.current?.focus()
    }
  }, [deleted])
  const busy = Boolean(pending)
  const perform = (...args) => {
    const trigger = document.activeElement
    actionFocus.current = trigger?.tagName === "BUTTON" ? trigger : null
    return request(...args)
  }
  useEffect(() => {
    if (busy || !actionFocus.current) return
    const trigger = actionFocus.current
    actionFocus.current = null
    // Disabling a pending control can drop focus; respect any later move.
    if (
      trigger.isConnected &&
      !trigger.disabled &&
      document.activeElement === document.body
    )
      trigger.focus({ preventScroll: true })
  }, [busy])
  const update = (id, key, value) => {
    dirty.current = true
    setChoices(previous => {
      const choice = { pinned: false, ...previous[id], [key]: value }
      if (key === "region" && !value) delete choice.region
      return { ...previous, [id]: choice }
    })
  }
  const copyLink = async () => {
    const url = data?.publicUrl
    if (!url || !lifetime.current || copyAttempt.current?.pending) return
    const attempt = {
      url,
      lifetime: lifetime.current,
      trigger:
        document.activeElement?.tagName === "BUTTON"
          ? document.activeElement
          : null,
      pending: true,
    }
    copyAttempt.current = attempt
    setCopying(true)
    const stillCurrent = () =>
      lifetime.current === attempt.lifetime &&
      currentUrl.current === attempt.url &&
      copyAttempt.current === attempt
    try {
      await navigator.clipboard.writeText(url)
      if (stillCurrent()) {
        attempt.copied = true
        announce("Link copied.")
      }
    } catch {
      if (stillCurrent()) {
        urlRef.current?.focus()
        urlRef.current?.select()
        announce("Please select and copy the unlisted portrait URL below.")
      }
    } finally {
      if (copyAttempt.current === attempt) {
        attempt.pending = false
        if (lifetime.current === attempt.lifetime) setCopying(false)
      }
    }
  }
  return (
    <div className={styles.studio}>
      <header>
        <p>Music · Private studio</p>
        <h1 ref={headingRef} tabIndex={-1}>
          Your Music Portrait
        </h1>
        <p>
          Connect, generate, personalise, share and evolve your listening map.
        </p>
      </header>
      <p
        id="studio-status"
        role="status"
        aria-live="polite"
        aria-atomic="true"
        className={styles.status}
      >
        {status}
      </p>
      {!data ? (
        deleted ? (
          <p>
            Your unlisted link no longer works. Your Spotify Developer Dashboard
            access is managed separately.
          </p>
        ) : pending ? (
          <p>Please wait while your studio loads.</p>
        ) : (
          <div>
            <p>
              This private beta needs a current invitation and a Spotify
              connection.
            </p>
            {authStart ? (
              <a
                className={styles.connect}
                href={authStart}
                referrerPolicy="no-referrer"
              >
                Connect Spotify
              </a>
            ) : (
              <button
                className={styles.entryButton}
                type="button"
                onClick={() => perform("load")}
              >
                Try again
              </button>
            )}
          </div>
        )
      ) : (
        <>
          <p>
            Current step:{" "}
            {data.draft
              ? data.publicUrl
                ? "Evolve your portrait"
                : "Personalise, then share"
              : "Generate your portrait"}
            .
          </p>
          {data.draft ? (
            <MusicPortrait snapshot={data.draft} />
          ) : (
            <p>
              No portrait yet. Generate your automatic map from your Spotify
              listening.
            </p>
          )}
          <section aria-label="Portrait controls" className={styles.controls}>
            <section aria-labelledby="personalise-heading">
              <h2 id="personalise-heading">Personalise</h2>
              <p>
                Automatic regions follow your listening. Pins keep an artist in
                your portrait. Notes are included whenever your saved portrait
                is published or updated.
              </p>
              {data.draft ? (
                <form
                  onSubmit={async event => {
                    event.preventDefault()
                    if (await perform("save", { overrides: choices }))
                      dirty.current = false
                  }}
                >
                  <fieldset
                    disabled={busy}
                    aria-describedby="studio-status studio-save-help"
                  >
                    <legend>Artist choices</legend>
                    {data.draft.planets.map(artist => (
                      <details
                        key={artist.id}
                        open={data.draft.planets.length <= 3}
                      >
                        <summary>{artist.name}</summary>
                        <div className={styles.artist}>
                          <label>
                            <input
                              type="checkbox"
                              aria-describedby="studio-status"
                              checked={choices[artist.id]?.pinned || false}
                              onChange={event =>
                                update(
                                  artist.id,
                                  "pinned",
                                  event.target.checked,
                                )
                              }
                            />{" "}
                            Pin {artist.name}
                          </label>
                          <label htmlFor={`region-${artist.id}`}>
                            Region for {artist.name}
                          </label>
                          <select
                            aria-describedby="studio-status"
                            id={`region-${artist.id}`}
                            value={choices[artist.id]?.region || ""}
                            onChange={event =>
                              update(artist.id, "region", event.target.value)
                            }
                          >
                            <option value="">Automatic</option>
                            <option value="inner_waters">Inner waters</option>
                            <option value="familiar_seas">Familiar seas</option>
                            <option value="outer_reaches">Outer reaches</option>
                          </select>
                          <label htmlFor={`note-${artist.id}`}>
                            Note for {artist.name}
                          </label>
                          <textarea
                            id={`note-${artist.id}`}
                            maxLength={500}
                            value={choices[artist.id]?.note || ""}
                            aria-describedby={`limit-${artist.id} studio-save-help studio-status`}
                            onChange={event =>
                              update(artist.id, "note", event.target.value)
                            }
                          />
                          <small id={`limit-${artist.id}`}>
                            {choices[artist.id]?.note?.length || 0}/500
                            characters
                          </small>
                        </div>
                      </details>
                    ))}
                    <p id="studio-save-help">
                      Saved choices for artists outside this map are retained.
                      Saving updates your private draft immediately. Once
                      shared, saved choices and notes are included in manual
                      refresh, scheduled updates and link regeneration.
                    </p>
                    <div className={styles.actions}>
                      <button type="submit">Save choices</button>
                      <button
                        type="button"
                        onClick={() => {
                          if (
                            window.confirm(
                              "Clear all saved artist choices, including dormant choices? Save choices to apply this reset.",
                            )
                          ) {
                            dirty.current = true
                            setChoices({})
                            announce(
                              "Choices cleared locally. Save choices to apply.",
                            )
                          }
                        }}
                      >
                        Clear all choices
                      </button>
                    </div>
                  </fieldset>
                </form>
              ) : null}
            </section>
            <section aria-labelledby="share-heading">
              <h2 id="share-heading">Share</h2>
              <p>An unlisted link is visible to anyone you give it to.</p>
              <p>
                Once shared, manual refresh, scheduled updates and link
                regeneration publish your saved choices and notes.
              </p>
              {data.draft ? (
                <button
                  type="button"
                  disabled={busy}
                  onClick={() => perform("publish")}
                >
                  {data.publicUrl
                    ? "Update shared portrait"
                    : "Publish portrait"}
                </button>
              ) : null}
              {data.publicUrl ? (
                <div className={styles.share}>
                  <label htmlFor="portrait-url">Unlisted portrait URL</label>
                  <input
                    ref={urlRef}
                    id="portrait-url"
                    readOnly
                    value={data.publicUrl}
                    onFocus={event => event.target.select()}
                  />
                  <div className={styles.actions}>
                    <a href={data.publicUrl} target="_blank" rel="noreferrer">
                      Open shared portrait
                    </a>
                    <button
                      type="button"
                      disabled={busy || copying}
                      onClick={copyLink}
                    >
                      Copy link
                    </button>
                    <button
                      type="button"
                      disabled={busy}
                      onClick={() => {
                        if (
                          window.confirm(
                            "Regenerate your unlisted link? This publishes your current saved portrait, including saved choices and notes. The old link stops working immediately after success.",
                          )
                        )
                          perform("link")
                      }}
                    >
                      Regenerate link
                    </button>
                  </div>
                </div>
              ) : null}
            </section>
            <section aria-labelledby="evolve-heading">
              <h2 id="evolve-heading">Evolve</h2>
              <p>
                Last successful update:{" "}
                {data.owner.lastSuccessfulUpdateAt ? (
                  <time dateTime={data.owner.lastSuccessfulUpdateAt}>
                    {new Date(data.owner.lastSuccessfulUpdateAt).toLocaleString(
                      "en-GB",
                      { timeZone: "UTC" },
                    )}{" "}
                    UTC
                  </time>
                ) : (
                  "Not yet generated"
                )}
                .
              </p>
              <p>{data.refreshStatus.message}</p>
              <p>
                Scheduled updates are {data.owner.paused ? "paused" : "enabled"}
                . Pausing keeps your shared link available.
              </p>
              <p>
                Manual refresh is available once per UTC calendar day, including
                unsuccessful attempts.
              </p>
              {data.publicUrl ? (
                <p>
                  Manual refresh updates your shared portrait with saved choices
                  and notes. Resuming includes saved choices and notes in the
                  next scheduled update.
                </p>
              ) : null}
              {data.owner.reconnectRequired ? (
                <p>
                  Reconnection and returning-owner sign-in are not currently
                  supported in this beta. Contact the beta organiser for help.
                </p>
              ) : null}
              <div className={styles.actions}>
                <button
                  type="button"
                  disabled={busy}
                  onClick={() =>
                    perform("pause", { paused: !data.owner.paused })
                  }
                >
                  {data.owner.paused
                    ? "Resume scheduled updates"
                    : "Pause scheduled updates"}
                </button>
                <button
                  type="button"
                  disabled={busy || data.owner.reconnectRequired}
                  onClick={() => perform("refresh")}
                >
                  {data.draft ? "Refresh portrait" : "Generate portrait"}
                </button>
              </div>
            </section>
            <section aria-labelledby="delete-heading">
              <h2 id="delete-heading">Delete</h2>
              <p>
                Delete your portrait and stored data, and unpublish its shared
                link. This cannot be undone.
              </p>
              <button
                type="button"
                disabled={busy}
                onClick={() => {
                  if (
                    window.confirm(
                      "Delete your portrait and stored data, and unpublish the shared link? This cannot be undone.",
                    )
                  )
                    perform("delete")
                }}
              >
                Delete portrait and data
              </button>
            </section>
          </section>
        </>
      )}
    </div>
  )
}

import { useCallback, useEffect, useRef, useState } from "react"
import {
  toPublicOwner,
  toPublicSnapshot,
  validateOverrides,
} from "../../../api/_music-beta/contracts"

const MESSAGES = {
  idle: "Your portrait is ready.",
  drafted: "Your private portrait has been updated.",
  updated: "Your shared portrait has been updated.",
  refreshing: "Your portrait is updating.",
  failed: "The update could not finish. Your last portrait is still available.",
  reconnect_required:
    "Reconnection is not currently supported in this beta. Contact the beta organiser for help. Your last portrait is still available.",
  retry_pending:
    "Spotify is temporarily busy. Your last portrait is still available.",
  busy: "Another portrait update is in progress.",
  skipped: "No update was needed.",
}
const NO_DRAFT_MESSAGES = {
  idle: "Generate your first portrait from your Spotify listening.",
  drafted:
    "No private portrait is available yet. Please try generating it again.",
  updated:
    "No private portrait is available yet. Please try generating it again.",
  refreshing: "Your first portrait is being generated.",
  failed:
    "The first generation could not finish. No portrait has been generated yet. Please try again.",
  reconnect_required:
    "Reconnection is not currently supported in this beta. Contact the beta organiser for help. No portrait has been generated yet.",
  retry_pending:
    "Spotify is temporarily busy. No portrait has been generated yet. Please try again later.",
  busy: "Another portrait generation is in progress. No portrait has been generated yet.",
  skipped:
    "No portrait has been generated yet. Generate your first portrait to continue.",
}
const FAILURE =
  "The request could not finish. Your portrait and choices are still available. Please try again."
const NO_DRAFT_FAILURE =
  "The request could not finish. No portrait has been generated yet. Please try again."
const ROUTES = {
  load: ["owner", "GET"],
  save: ["owner", "PATCH"],
  pause: ["owner", "PATCH"],
  publish: ["publish", "POST"],
  refresh: ["refresh-owner", "POST"],
  link: ["link", "POST"],
  delete: ["delete", "DELETE"],
}

function check(condition) {
  if (!condition) throw new Error("Invalid owner response")
}
function fields(value, required, optional = []) {
  check(value && typeof value === "object" && !Array.isArray(value))
  check(required.every(key => Object.hasOwn(value, key)))
  check(
    Object.keys(value).every(key => [...required, ...optional].includes(key)),
  )
}
function timestamp(value) {
  check(
    value === null ||
      (typeof value === "string" &&
        Number.isFinite(Date.parse(value)) &&
        new Date(value).toISOString() === value),
  )
}

function safeProjection(value) {
  fields(value, ["owner", "draft", "publicUrl", "csrfToken", "refreshStatus"])
  const owner = value.owner
  fields(
    owner,
    [
      "displayName",
      "initials",
      "paused",
      "reconnectRequired",
      "published",
      "lastSuccessfulUpdateAt",
      "lastManualRefreshAt",
      "overrides",
    ],
    ["imageUrl"],
  )
  const identity = toPublicOwner({
    displayName: owner.displayName,
    initials: owner.initials,
    ...(owner.imageUrl !== undefined ? { imageUrl: owner.imageUrl } : {}),
  })
  check(
    [owner.paused, owner.reconnectRequired, owner.published].every(
      value => typeof value === "boolean",
    ),
  )
  timestamp(owner.lastSuccessfulUpdateAt)
  timestamp(owner.lastManualRefreshAt)
  validateOverrides(owner.overrides)
  check(Object.keys(owner.overrides).length <= 200)
  check(
    typeof value.csrfToken === "string" &&
      /^[A-Za-z0-9_-]{43}$/.test(value.csrfToken),
  )
  fields(value.refreshStatus, ["status", "message"])
  check(Object.hasOwn(MESSAGES, value.refreshStatus.status))
  check(
    typeof value.refreshStatus.message === "string" &&
      value.refreshStatus.message.length <= 500,
  )
  check(owner.published === (value.publicUrl !== null))
  if (value.publicUrl !== null) {
    const url = new URL(value.publicUrl)
    check(
      url.protocol === "https:" &&
        [
          window.location.origin,
          "https://www.madebyhakim.com",
          "https://madebyhakim.com",
        ].includes(url.origin),
    )
    check(
      !url.username &&
        !url.password &&
        !url.search &&
        !url.hash &&
        /^\/music\/galaxy\/[A-Za-z0-9_-]{43}\/$/.test(url.pathname),
    )
    check(url.href === value.publicUrl)
  }
  const draft = value.draft === null ? null : toPublicSnapshot(value.draft)
  return {
    owner: {
      ...identity,
      paused: owner.paused,
      reconnectRequired: owner.reconnectRequired,
      published: owner.published,
      lastSuccessfulUpdateAt: owner.lastSuccessfulUpdateAt,
      lastManualRefreshAt: owner.lastManualRefreshAt,
      overrides: JSON.parse(JSON.stringify(owner.overrides)),
    },
    draft,
    publicUrl: value.publicUrl,
    csrfToken: value.csrfToken,
    refreshStatus: {
      status: value.refreshStatus.status,
      message: (draft ? MESSAGES : NO_DRAFT_MESSAGES)[
        value.refreshStatus.status
      ],
    },
  }
}

export default function useMusicPortraitOwner() {
  const [data, setData] = useState(null)
  const [pending, setPending] = useState("load")
  const [status, setStatus] = useState("Loading your private studio…")
  const [deleted, setDeleted] = useState(false)
  const [authStart, setAuthStart] = useState(null)
  const current = useRef(null)
  const request = useRef(null)
  const mounted = useRef(false)

  const perform = useCallback(async (operation, body) => {
    if (!mounted.current || request.current) return false
    const controller = new AbortController()
    request.current = controller
    setPending(operation)
    setStatus(
      operation === "load"
        ? "Loading your private studio…"
        : "Please wait while your request completes…",
    )
    const [route, method] = ROUTES[operation]
    try {
      const response = await fetch(`/api/music-portrait-${route}`, {
        method,
        credentials: "same-origin",
        cache: "no-store",
        referrerPolicy: "no-referrer",
        signal: controller.signal,
        ...(method !== "GET"
          ? {
              headers: {
                "Content-Type": "application/json",
                "X-CSRF-Token": current.current.csrfToken,
              },
              body: JSON.stringify(body || {}),
            }
          : {}),
      })
      if (controller.signal.aborted || !mounted.current) return false
      if (response.status !== 200) {
        setStatus(
          response.status === 429
            ? "Manual refresh is available once per UTC calendar day."
            : response.status === 409
              ? "Another portrait update is in progress. Please try again shortly."
              : response.status === 401 || response.status === 403
                ? "Your studio session is unavailable. Returning-owner access is not currently supported in this beta. Please contact the beta organiser for help."
                : current.current
                  ? current.current.draft
                    ? FAILURE
                    : NO_DRAFT_FAILURE
                  : "This invitation may have expired, already been used, or the beta may be full. The studio is currently unavailable.",
        )
        return false
      }
      const json = await response.json()
      if (controller.signal.aborted || !mounted.current) return false
      if (operation === "delete") {
        fields(json, ["deleted"])
        check(json.deleted === true)
        current.current = null
        setData(null)
        setDeleted(true)
        setStatus("Your portrait is unpublished and deleted.")
      } else {
        const next = safeProjection(json)
        // Only a confirmed deletion may remove a portrait already shown here.
        check(!current.current?.draft || next.draft !== null)
        if (operation === "publish" || operation === "link")
          check(next.publicUrl !== null)
        if (operation === "link")
          check(next.publicUrl !== current.current.publicUrl)
        current.current = next
        setData(next)
        setStatus(
          operation === "save"
            ? next.publicUrl
              ? "Choices saved to your private draft; refreshes and link regeneration can publish them to your shared portrait."
              : "Choices saved to your private draft. Publish when ready to share."
            : operation === "publish"
              ? "Shared portrait updated."
              : operation === "link"
                ? "New link ready with your current saved portrait. The old link no longer works."
                : operation === "pause"
                  ? next.owner.paused
                    ? "Scheduled updates paused. Manual refresh and link regeneration can still publish saved choices and notes to an existing shared portrait."
                    : "Scheduled updates resumed. The next scheduled update includes saved choices and notes in an existing shared portrait."
                  : next.refreshStatus.message,
        )
      }
      return true
    } catch {
      if (!controller.signal.aborted && mounted.current)
        setStatus(
          current.current
            ? current.current.draft
              ? FAILURE
              : NO_DRAFT_FAILURE
            : "The studio is currently unavailable. Please try again.",
        )
      return false
    } finally {
      if (request.current === controller) {
        request.current = null
        if (mounted.current) setPending(null)
      }
    }
  }, [])

  useEffect(() => {
    mounted.current = true
    const invite = new URLSearchParams(window.location.search).getAll("invite")
    if (invite.length === 1 && /^[A-Za-z0-9_-]{43}$/.test(invite[0]))
      setAuthStart(
        `/api/music-portrait-auth-start?invite=${encodeURIComponent(invite[0])}`,
      )
    // Keep invitation capabilities out of subsequent navigation/referrers.
    if (window.location.search)
      window.history.replaceState(null, "", window.location.pathname)
    perform("load")
    return () => {
      mounted.current = false
      request.current?.abort()
      request.current = null
    }
  }, [perform])

  return {
    data,
    pending,
    status,
    deleted,
    authStart,
    perform,
    announce: setStatus,
  }
}

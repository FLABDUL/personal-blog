import { useCallback, useEffect, useState } from "react"
import { toPublicSnapshot } from "../../../api/_music-beta/contracts"

function capabilityFrom(pathname) {
  if (typeof pathname !== "string" || pathname.length !== 58) return null
  return (
    /^\/music\/galaxy\/([A-Za-z0-9_-]{42}[AEIMQUYcgkosw048])\/$/.exec(
      pathname,
    )?.[1] || null
  )
}

export default function useSharedMusicPortrait(pathname) {
  const capability = capabilityFrom(pathname)
  const [attempt, setAttempt] = useState(0)
  const [result, setResult] = useState(null)
  const retry = useCallback(() => setAttempt(value => value + 1), [])

  useEffect(() => {
    if (!capability) {
      setResult({ capability, attempt, status: "not-found" })
      return
    }
    const controller = new AbortController()
    setResult(null)
    async function load() {
      try {
        const response = await fetch(
          `/api/music-portrait-public?capability=${capability}`,
          {
            method: "GET",
            credentials: "omit",
            cache: "no-store",
            referrerPolicy: "no-referrer",
            signal: controller.signal,
          },
        )
        if (controller.signal.aborted) return
        if (response.status === 404) {
          setResult({ capability, attempt, status: "not-found" })
          return
        }
        if (response.status !== 200) throw new Error("Portrait unavailable")
        const value = await response.json()
        if (controller.signal.aborted) return
        const snapshot = toPublicSnapshot(value)
        setResult({ capability, attempt, status: "ready", snapshot })
      } catch {
        if (!controller.signal.aborted)
          setResult({ capability, attempt, status: "unavailable" })
      }
    }
    load()
    return () => controller.abort()
  }, [capability, attempt])

  // Do not paint the previous listener while the next route's effect starts.
  if (result?.capability !== capability || result?.attempt !== attempt)
    return { status: "loading", retry }
  return { status: result.status, snapshot: result.snapshot, retry }
}

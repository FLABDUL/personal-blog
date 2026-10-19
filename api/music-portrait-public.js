const { isProxy } = require("node:util").types
const { toPublicSnapshot } = require("./_music-beta/contracts")
const { createMusicBetaStore } = require("./_music-beta/store")

function capabilityFrom(request) {
  const query = request.query
  if (!query || Object.keys(query).join() !== "capability") return null
  const value = query.capability
  if (
    typeof value !== "string" ||
    value.length !== 43 ||
    !/^[A-Za-z0-9_-]{42}[AEIMQUYcgkosw048]$/.test(value)
  )
    return null
  if (request.url) {
    const entries = [
      ...new URL(request.url, "https://local.invalid").searchParams,
    ]
    if (
      entries.length !== 1 ||
      entries[0][0] !== "capability" ||
      entries[0][1] !== value
    )
      return null
  }
  return value
}

function createPublicPortraitHandler(deps) {
  return async function publicPortraitHandler(request, response) {
    response.setHeader("Cache-Control", "no-store")
    response.setHeader("Referrer-Policy", "no-referrer")
    response.setHeader("Content-Type", "application/json; charset=utf-8")
    const notFound = () =>
      response.status(404).json({ error: "Portrait not found" })
    if (request.method !== "GET") {
      response.setHeader("Allow", "GET")
      return response.status(405).json({ error: "Method not allowed" })
    }
    let capability
    try {
      capability = capabilityFrom(request)
    } catch {
      return notFound()
    }
    if (!capability) return notFound()
    let snapshot
    try {
      const store = deps?.store || createMusicBetaStore(require("@vercel/blob"))
      snapshot = await store.readPublicSnapshot(capability)
    } catch (error) {
      const category =
        error && typeof error === "object" && !isProxy(error)
          ? Object.getOwnPropertyDescriptor(error, "category")?.value
          : null
      if (category === "invalid" || category === "deleted") return notFound()
      return response.status(503).json({ error: "Portrait unavailable" })
    }
    if (snapshot === null) return notFound()
    try {
      snapshot = toPublicSnapshot(snapshot)
    } catch {
      return notFound()
    }
    return response.status(200).json(snapshot)
  }
}

module.exports = createPublicPortraitHandler()
module.exports.createPublicPortraitHandler = createPublicPortraitHandler

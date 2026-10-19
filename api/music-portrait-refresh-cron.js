const { refreshDueOwners } = require("./_music-beta/refresh-service")
const { runtimeDependencies } = require("./_music-beta/http")

function createRefreshHandler({ cronSecret, refresh }) {
  return async function refreshHandler(request, response) {
    response.setHeader("Cache-Control", "no-store")
    if (request.method !== "GET") {
      response.setHeader("Allow", "GET")
      return response.status(405).json({ error: "Method not allowed" })
    }
    const authorization =
      request.headers?.authorization || request.headers?.Authorization
    if (
      typeof cronSecret !== "string" ||
      !cronSecret ||
      authorization !== `Bearer ${cronSecret}`
    )
      return response.status(401).json({ status: "unauthorised" })
    try {
      const result = await refresh()
      const summary = { status: "complete" }
      for (const key of [
        "processed",
        "updated",
        "drafted",
        "skipped",
        "busy",
        "failed",
        "reconnect_required",
        "retry_pending",
      ]) {
        if (!Number.isSafeInteger(result[key]) || result[key] < 0)
          throw new Error("Invalid refresh summary")
        summary[key] = result[key]
      }
      return response.status(200).json(summary)
    } catch {
      return response.status(502).json({ status: "failed" })
    }
  }
}

module.exports = createRefreshHandler({
  cronSecret: process.env.CRON_SECRET,
  refresh: () => refreshDueOwners(runtimeDependencies()),
})
module.exports.createRefreshHandler = createRefreshHandler

const { mapSpotifyCatalogue } = require("./catalogue")

async function mapWithConcurrency(items, limit, worker) {
  const results = new Array(items.length)
  let nextIndex = 0

  async function runWorker() {
    while (nextIndex < items.length) {
      const index = nextIndex
      nextIndex += 1
      results[index] = await worker(items[index])
    }
  }

  await Promise.all(
    Array.from({ length: Math.min(limit, items.length) }, runWorker),
  )
  return results
}

async function refreshSpotifyCatalogue(deps) {
  try {
    const generatedAt = deps.now().toISOString()
    const [accessToken, selection] = await Promise.all([
      deps.getAccessToken(),
      deps.getSelection(),
    ])
    const gateway = deps.createGateway(accessToken)
    const requests = [
      ...selection.artistIds.map(id => ({ kind: "artist", id })),
      ...selection.trackIds.map(id => ({ kind: "track", id })),
    ]
    const results = await mapWithConcurrency(requests, 4, async request => {
      const value =
        request.kind === "artist"
          ? await gateway.getArtist(request.id)
          : await gateway.getTrack(request.id)
      if (value.id !== request.id)
        throw new Error("Spotify catalogue ID mismatch")
      return { kind: request.kind, value }
    })
    const candidate = mapSpotifyCatalogue({
      artists: results
        .filter(result => result.kind === "artist")
        .map(result => result.value),
      tracks: results
        .filter(result => result.kind === "track")
        .map(result => result.value),
      generatedAt,
    })

    await deps.store.write(candidate)
    return {
      status: "updated",
      generatedAt: candidate.generatedAt,
      expiresAt: candidate.expiresAt,
    }
  } catch {
    throw new Error("Spotify catalogue refresh failed")
  }
}

module.exports = { refreshSpotifyCatalogue }

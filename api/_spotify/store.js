const { validateCatalogueSnapshot } = require("./catalogue")

const CURRENT_CATALOGUE_PATHNAME = "spotify-catalogue/current.json"

function validateForStorage(snapshot) {
  return validateCatalogueSnapshot(snapshot, {
    now: Date.parse(snapshot.generatedAt),
    allowExpired: true,
  })
}

function createBlobCatalogueStore(blobClient = require("@vercel/blob")) {
  return {
    async read() {
      try {
        const result = await blobClient.get(CURRENT_CATALOGUE_PATHNAME, {
          access: "private",
          useCache: false,
        })
        if (result === null) return null
        if (result.stream === null) throw new Error("Missing catalogue stream")
        return validateForStorage(
          JSON.parse(await new Response(result.stream).text()),
        )
      } catch {
        throw new Error("Current Spotify catalogue is unavailable")
      }
    },
    async write(snapshot) {
      try {
        const validated = validateForStorage(snapshot)
        await blobClient.put(
          CURRENT_CATALOGUE_PATHNAME,
          JSON.stringify(validated),
          {
            access: "private",
            allowOverwrite: true,
            contentType: "application/json",
            cacheControlMaxAge: 60,
          },
        )
      } catch {
        throw new Error("Current Spotify catalogue is unavailable")
      }
    },
    async clear() {
      try {
        await blobClient.del(CURRENT_CATALOGUE_PATHNAME)
      } catch {
        throw new Error("Current Spotify catalogue is unavailable")
      }
    },
  }
}

module.exports = { CURRENT_CATALOGUE_PATHNAME, createBlobCatalogueStore }

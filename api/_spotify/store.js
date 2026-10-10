const { validateCatalogueSnapshot } = require("./catalogue")

const CURRENT_CATALOGUE_PATHNAME = "spotify-catalogue/current.json"

function validateForStorage(snapshot) {
  return validateCatalogueSnapshot(snapshot, {
    now: Date.parse(snapshot.generatedAt),
    allowExpired: true,
  })
}

function safeStoreDiagnostic(operation, error) {
  const diagnostic = { operation }
  if (!error || typeof error !== "object") return diagnostic
  if (typeof error.name === "string") diagnostic.name = error.name
  if (
    typeof error.code === "string" &&
    /^[A-Za-z0-9_-]{1,80}$/.test(error.code)
  )
    diagnostic.code = error.code
  if (Number.isInteger(error.statusCode))
    diagnostic.statusCode = error.statusCode
  if (
    typeof error.message === "string" &&
    error.message.startsWith("Spotify catalogue is invalid:")
  )
    diagnostic.validation = error.message
  return diagnostic
}

function reportStoreFailure(diagnostic) {
  console.error("Spotify catalogue store failure", diagnostic)
}

function createBlobCatalogueStore(
  blobClient = require("@vercel/blob"),
  reportFailure = reportStoreFailure,
) {
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
      } catch (error) {
        reportFailure(safeStoreDiagnostic("read", error))
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
      } catch (error) {
        reportFailure(safeStoreDiagnostic("write", error))
        throw new Error("Current Spotify catalogue is unavailable")
      }
    },
    async clear() {
      try {
        await blobClient.del(CURRENT_CATALOGUE_PATHNAME)
      } catch (error) {
        reportFailure(safeStoreDiagnostic("clear", error))
        throw new Error("Current Spotify catalogue is unavailable")
      }
    },
  }
}

module.exports = { CURRENT_CATALOGUE_PATHNAME, createBlobCatalogueStore }

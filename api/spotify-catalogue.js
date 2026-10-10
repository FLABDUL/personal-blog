const {
  toPublicCatalogue,
  validateCatalogueSnapshot,
} = require("./_spotify/catalogue")
const { createBlobCatalogueStore } = require("./_spotify/store")

function createCatalogueHandler({ store, now = Date.now }) {
  return async function catalogueHandler(request, response) {
    response.setHeader("Cache-Control", "no-store")
    if (request.method !== "GET") {
      response.setHeader("Allow", "GET")
      return response.status(405).json({ error: "Method not allowed" })
    }

    try {
      const snapshot = await store.read()
      if (snapshot === null) throw new Error("No snapshot")
      validateCatalogueSnapshot(snapshot, { now: now() })
      return response.status(200).json(toPublicCatalogue(snapshot))
    } catch {
      return response.status(503).json({ status: "unavailable" })
    }
  }
}

async function handler(request, response) {
  const configured =
    Boolean(process.env.BLOB_READ_WRITE_TOKEN) ||
    (Boolean(process.env.VERCEL_OIDC_TOKEN) &&
      Boolean(process.env.BLOB_STORE_ID))
  if (!configured) {
    response.setHeader("Cache-Control", "no-store")
    return response.status(503).json({ status: "unavailable" })
  }
  return createCatalogueHandler({ store: createBlobCatalogueStore() })(
    request,
    response,
  )
}

module.exports = handler
module.exports.createCatalogueHandler = createCatalogueHandler

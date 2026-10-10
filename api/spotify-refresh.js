const portrait = require("../content/music/portrait.json")
const { collectSpotifyCatalogueIds } = require("../scripts/music/portrait")
const { loadMusicPortrait } = require("../src/lib/music/content")
const {
  createSpotifyGateway,
  getSpotifyAppToken,
} = require("./_spotify/client")
const { refreshSpotifyCatalogue } = require("./_spotify/refresh")
const { createBlobCatalogueStore } = require("./_spotify/store")

function authorizationHeader(request) {
  return request.headers?.authorization || request.headers?.Authorization
}

function createRefreshHandler({ cronSecret, refresh }) {
  return async function refreshHandler(request, response) {
    if (request.method !== "GET") {
      response.setHeader("Allow", "GET")
      return response.status(405).json({ error: "Method not allowed" })
    }
    if (
      !cronSecret ||
      authorizationHeader(request) !== `Bearer ${cronSecret}`
    ) {
      return response.status(401).json({ status: "unauthorised" })
    }
    try {
      return response.status(200).json(await refresh())
    } catch {
      console.error("Spotify catalogue refresh failed")
      return response.status(502).json({ status: "failed" })
    }
  }
}

async function refresh() {
  const publishedPortrait = loadMusicPortrait(portrait)
  if (!publishedPortrait)
    throw new Error("Published music portrait unavailable")
  return refreshSpotifyCatalogue({
    getAccessToken: () =>
      getSpotifyAppToken({
        clientId: process.env.SPOTIFY_CLIENT_ID,
        clientSecret: process.env.SPOTIFY_CLIENT_SECRET,
      }),
    getSelection: async () => collectSpotifyCatalogueIds(publishedPortrait),
    createGateway: accessToken => createSpotifyGateway({ accessToken }),
    store: createBlobCatalogueStore(),
    now: () => new Date(),
  })
}

const handler = createRefreshHandler({
  cronSecret: process.env.CRON_SECRET,
  refresh,
})

module.exports = handler
module.exports.createRefreshHandler = createRefreshHandler

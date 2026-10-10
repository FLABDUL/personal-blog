const REQUEST_TIMEOUT_MS = 8000
const API_BASE = "https://api.spotify.com/v1"

async function getSpotifyAppToken({
  clientId,
  clientSecret,
  fetchImpl = fetch,
}) {
  if (!clientId || !clientSecret)
    throw new Error("Spotify configuration unavailable")
  try {
    const response = await fetchImpl("https://accounts.spotify.com/api/token", {
      method: "POST",
      headers: {
        Authorization: `Basic ${Buffer.from(`${clientId}:${clientSecret}`).toString("base64")}`,
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: new URLSearchParams({ grant_type: "client_credentials" }),
      signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
    })
    if (!response.ok) throw new Error("Spotify authentication rejected")
    const payload = await response.json()
    if (typeof payload.access_token !== "string" || !payload.access_token) {
      throw new Error("Spotify authentication response invalid")
    }
    return payload.access_token
  } catch {
    throw new Error("Spotify app authentication failed")
  }
}

function createSpotifyGateway({ accessToken, fetchImpl = fetch }) {
  async function request(kind, id) {
    try {
      const response = await fetchImpl(
        `${API_BASE}/${kind === "artist" ? "artists" : "tracks"}/${encodeURIComponent(id)}`,
        {
          headers: { Authorization: `Bearer ${accessToken}` },
          signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
        },
      )
      if (!response.ok) throw new Error("Spotify request rejected")
      const payload = await response.json()
      if (!payload || typeof payload !== "object")
        throw new Error("Spotify response invalid")
      return payload
    } catch {
      throw new Error(`Spotify API request failed for ${kind}`)
    }
  }

  return {
    getArtist: id => request("artist", id),
    getTrack: id => request("track", id),
  }
}

module.exports = {
  REQUEST_TIMEOUT_MS,
  createSpotifyGateway,
  getSpotifyAppToken,
}

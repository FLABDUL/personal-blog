const NOW = "2026-10-17T08:00:00.000Z"
const artistId = index => String(index + 1).padStart(22, "0")
const trackId = index => String(index + 1001).padStart(22, "0")
const entity = (kind, id, name) => ({
  id,
  name,
  spotifyUrl: `https://open.spotify.com/${kind}/${id}`,
})

function makeOwnerRecord(overrides = {}) {
  return {
    schemaVersion: 1,
    ownerId: "owner-fixture",
    spotifyUserId: "spotify-fixture",
    boundUserNumber: 1,
    displayName: "Fixture owner",
    encryptedRefreshToken: {
      keyVersion: 1,
      iv: "AAAAAAAAAAAAAAAA",
      ciphertext: "Zml4dHVyZQ",
      tag: "AAAAAAAAAAAAAAAAAAAAAA",
    },
    tokenExpiresAt: NOW,
    inviteHash: "a".repeat(64),
    sessionVersion: 1,
    paused: false,
    reconnectRequired: false,
    refreshStatus: "idle",
    createdAt: NOW,
    updatedAt: NOW,
    lastSuccessfulUpdateAt: null,
    lastManualRefreshAt: null,
    ...overrides,
  }
}

function makeEvidence(overrides = {}) {
  return {
    schemaVersion: 1,
    generatorVersion: 1,
    fetchedAt: NOW,
    artists: Array.from({ length: 20 }, (_, i) => ({
      ...entity("artist", artistId(i), `Artist ${i + 1}`),
      ranks: { short_term: i + 1, medium_term: i + 1, long_term: i + 1 },
    })),
    tracks: Array.from({ length: 6 }, (_, i) => ({
      ...entity("track", trackId(i), `Track ${i + 1}`),
      artistIds: [artistId(Math.floor(i / 3))],
      ranks: { short_term: i + 1 },
    })),
    ...overrides,
  }
}

function makeOverrides() {
  return {
    [artistId(0)]: {
      pinned: true,
      region: "inner_waters",
      note: "A quiet morning.",
    },
  }
}

function makePublicSnapshot({ planetCount = 16, ...overrides } = {}) {
  return {
    schemaVersion: 1,
    rendererVersion: 1,
    generatorVersion: 1,
    snapshotId: "snapshot-fixture-1",
    generatedAt: NOW,
    lastSuccessfulUpdateAt: NOW,
    owner: {
      displayName: "Fixture owner",
      initials: "FO",
      imageUrl: "https://i.scdn.co/image/fixtureowner",
    },
    planets: Array.from({ length: planetCount }, (_, i) => ({
      ...entity("artist", artistId(i), `Artist ${i + 1}`),
      size: (i % 5) + 1,
      region: ["familiar_seas", "inner_waters", "outer_reaches"][i % 3],
      note: "",
      layoutSeed: i,
      moons: Array.from({ length: i % 4 }, (_, j) => ({
        ...entity("track", trackId(i * 3 + j), `Track ${i * 3 + j + 1}`),
        artistIds: [artistId(i)],
        introducedAt: NOW,
      })),
    })),
    ...overrides,
  }
}

module.exports = {
  NOW,
  artistId,
  trackId,
  makeOwnerRecord,
  makeEvidence,
  makeOverrides,
  makePublicSnapshot,
}

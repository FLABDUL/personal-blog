const test = require("node:test")
const assert = require("node:assert/strict")
const { createHash, createHmac } = require("node:crypto")
const security = require("../../api/_music-beta/security")
const { validateOwnerRecord } = require("../../api/_music-beta/contracts")
const { makeOwnerRecord } = require("./fixtures/music-beta")

// Synthetic keys only; no environment values are read by these tests.
const KEY = Buffer.alloc(32, 17)
const OTHER_KEY = Buffer.alloc(32, 29)
const NOW = 1_800_000_000_000
const PAYLOAD = {
  ownerId: "test-owner",
  sessionVersion: 2,
  expiresAt: NOW + 1000,
}

function signedEnvelope(envelope) {
  const body = Buffer.from(JSON.stringify(envelope)).toString("base64url")
  const signature = createHmac("sha256", KEY)
    .update(`music-beta-session:${body}`)
    .digest("base64url")
  return `${body}.${signature}`
}

test("capabilities use at least 128 random bits and stable SHA-256 hashes", () => {
  let requestedBytes
  const capability = security.generateCapability(size => {
    requestedBytes = size
    return Buffer.alloc(size, 7)
  })
  assert.ok(requestedBytes >= 16)
  assert.equal(
    Buffer.from(capability.token, "base64url").length,
    requestedBytes,
  )
  assert.equal(
    capability.hash,
    createHash("sha256").update(capability.token).digest("hex"),
  )
  assert.equal(security.hashCapability(capability.token), capability.hash)
  assert.match(capability.hash, /^[a-f0-9]{64}$/)
  assert.notEqual(
    security.generateCapability().token,
    security.generateCapability().token,
  )
  for (const token of [
    null,
    "",
    "short",
    "invalid token",
    "a".repeat(44) + "=",
  ])
    assert.throws(() => security.hashCapability(token))
  assert.throws(() => security.generateCapability(() => Buffer.alloc(8)))
})

test("AES-256-GCM round-trips with fresh nonces and the contract envelope", () => {
  const first = security.encryptSecret("synthetic-refresh-value", KEY, 2)
  const second = security.encryptSecret(
    "synthetic-refresh-value",
    KEY.toString("base64url"),
    2,
  )
  assert.deepEqual(Object.keys(first).sort(), [
    "ciphertext",
    "iv",
    "keyVersion",
    "tag",
  ])
  assert.equal(Buffer.from(first.iv, "base64url").length, 12)
  assert.equal(Buffer.from(first.tag, "base64url").length, 16)
  assert.notEqual(first.iv, second.iv)
  assert.notEqual(first.ciphertext, second.ciphertext)
  assert.equal(
    security.decryptSecret(first, { 1: OTHER_KEY, 2: KEY }),
    "synthetic-refresh-value",
  )
  assert.equal(
    security.decryptSecret(second, { 2: KEY.toString("base64url") }),
    "synthetic-refresh-value",
  )
  validateOwnerRecord(makeOwnerRecord({ encryptedRefreshToken: first }))
})

test("encrypted secrets reject tampering, unknown key versions and malformed input", () => {
  const encrypted = security.encryptSecret("synthetic-refresh-value", KEY, 2)
  for (const field of ["iv", "ciphertext", "tag"]) {
    const bytes = Buffer.from(encrypted[field], "base64url")
    bytes[0] ^= 1
    assert.throws(() =>
      security.decryptSecret(
        { ...encrypted, [field]: bytes.toString("base64url") },
        { 2: KEY },
      ),
    )
  }
  assert.throws(() =>
    security.decryptSecret({ ...encrypted, keyVersion: 1 }, { 1: KEY, 2: KEY }),
  )
  assert.throws(() => security.decryptSecret(encrypted, { 1: KEY }))
  assert.throws(() => security.decryptSecret(encrypted, { 2: OTHER_KEY }))
  for (const record of [
    null,
    [],
    {},
    { ...encrypted, iv: "bad=" },
    { ...encrypted, tag: "a" },
    { ...encrypted, extra: true },
  ])
    assert.throws(() => security.decryptSecret(record, { 2: KEY }))
  for (const key of [undefined, "short", Buffer.alloc(16)])
    assert.throws(() => security.encryptSecret("synthetic", key, 1))
  for (const version of [0, -1, 1.5, Number.MAX_SAFE_INTEGER + 1])
    assert.throws(() => security.encryptSecret("synthetic", KEY, version))
  for (const value of ["", null, 123])
    assert.throws(() => security.encryptSecret(value, KEY, 1))
  assert.throws(() => security.encryptSecret("x".repeat(65537), KEY, 1))
})

test("signed sessions verify payload, version and exact expiry boundary", () => {
  const token = security.createSession(PAYLOAD, KEY)
  assert.deepEqual(security.verifySession(token, KEY, NOW), PAYLOAD)
  assert.deepEqual(
    security.verifySession(token, KEY.toString("base64url"), NOW + 999),
    PAYLOAD,
  )
  assert.equal(security.verifySession(token, KEY, NOW + 1000), null)
  assert.equal(security.verifySession(token, OTHER_KEY, NOW), null)
  assert.equal(security.verifySession(token, KEY, NaN), null)
  assert.equal(security.verifySession(token, KEY, new Date(NOW)), null)
  for (const version of [0, -1, 1.5, "2", Number.MAX_SAFE_INTEGER + 1]) {
    assert.throws(() =>
      security.createSession({ ...PAYLOAD, sessionVersion: version }, KEY),
    )
    assert.equal(
      security.verifySession(
        signedEnvelope({
          version: 1,
          payload: { ...PAYLOAD, sessionVersion: version },
        }),
        KEY,
        NOW,
      ),
      null,
    )
  }
  assert.equal(
    security.verifySession(
      signedEnvelope({ version: 2, payload: PAYLOAD }),
      KEY,
      NOW,
    ),
    null,
  )
  for (const payload of [
    { ...PAYLOAD, ownerId: "" },
    { ...PAYLOAD, expiresAt: "later" },
    { ...PAYLOAD, extra: true },
  ])
    assert.throws(() => security.createSession(payload, KEY))
})

test("sessions reject altered signatures, altered payloads and malformed encodings", () => {
  const token = security.createSession(PAYLOAD, KEY)
  const [body, signature] = token.split(".")
  const alteredBody = Buffer.from(
    JSON.stringify({ version: 1, payload: { ...PAYLOAD, sessionVersion: 3 } }),
  ).toString("base64url")
  for (const value of [
    null,
    "",
    "a.b",
    `${body}.a`,
    `${body}.${signature}=`,
    `${alteredBody}.${signature}`,
    `${token}.extra`,
    `${body}.${Buffer.alloc(32).toString("base64url")}`,
    signedEnvelope({ version: 1, payload: PAYLOAD, extra: true }),
  ])
    assert.equal(security.verifySession(value, KEY, NOW), null)
})

test("CSRF tokens bind to the exact signed session and use a separate HMAC domain", () => {
  const session = security.createSession(PAYLOAD, KEY)
  const otherSession = security.createSession(
    { ...PAYLOAD, expiresAt: NOW + 2000 },
    KEY,
  )
  const token = security.createCsrfToken(session, KEY)
  assert.equal(security.createCsrfToken(session, KEY), token)
  assert.equal(security.verifyCsrfToken(token, session, KEY), true)
  assert.equal(security.verifyCsrfToken(token, otherSession, KEY), false)
  assert.equal(security.verifyCsrfToken(token, session, OTHER_KEY), false)
  assert.notEqual(token, session.split(".")[1])
  for (const value of [
    null,
    "",
    "a",
    `${token}=`,
    Buffer.alloc(32).toString("base64url"),
  ])
    assert.equal(security.verifyCsrfToken(value, session, KEY), false)
  assert.equal(security.verifyCsrfToken(token, "malformed", KEY), false)
  assert.throws(() => security.createCsrfToken("malformed", KEY))
})

test("security boundaries reject accessor fields without executing them", () => {
  let reads = 0
  const payload = { ...PAYLOAD }
  Object.defineProperty(payload, "ownerId", {
    enumerable: true,
    get() {
      reads++
      return "unexpected"
    },
  })
  assert.throws(() => security.createSession(payload, KEY))
  const record = security.encryptSecret("synthetic", KEY, 1)
  const keys = Object.defineProperty({}, "1", {
    get() {
      reads++
      return KEY
    },
  })
  assert.throws(() => security.decryptSecret(record, keys))
  assert.equal(reads, 0)
})

test("sessions sign captured claims without reading Proxy fields or hidden toJSON", () => {
  let hookCalls = 0
  let reads = 0
  const payload = new Proxy(
    { ...PAYLOAD },
    {
      get(target, field) {
        reads++
        if (field === "toJSON")
          return () => {
            hookCalls++
            return { ...PAYLOAD, ownerId: "changed-owner", sessionVersion: 99 }
          }
        return Reflect.get(target, field)
      },
    },
  )
  const token = security.createSession(payload, KEY)
  assert.equal(hookCalls, 0)
  assert.equal(reads, 0)
  assert.deepEqual(security.verifySession(token, KEY, NOW), PAYLOAD)
})

test("encrypted envelopes use captured descriptor values without Proxy field reads", () => {
  let reads = 0
  const encrypted = security.encryptSecret("synthetic", KEY, 1)
  const record = new Proxy(encrypted, {
    get() {
      reads++
      throw new Error("Unexpected field read")
    },
  })
  assert.equal(security.decryptSecret(record, { 1: KEY }), "synthetic")
  assert.equal(reads, 0)
})

test("encryption rejects lone surrogates and preserves well-formed Unicode", () => {
  for (const plaintext of [
    String.fromCharCode(0xd800),
    String.fromCharCode(0xdc00),
  ])
    assert.throws(() => security.encryptSecret(plaintext, KEY, 1))
  const plaintext = "synthetic café \uD83C\uDFB5 日本語"
  const encrypted = security.encryptSecret(plaintext, KEY, 1)
  assert.equal(security.decryptSecret(encrypted, { 1: KEY }), plaintext)
})

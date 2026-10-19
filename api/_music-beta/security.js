const {
  randomBytes,
  createHash,
  createCipheriv,
  createDecipheriv,
  createHmac,
  timingSafeEqual,
} = require("node:crypto")

function check(condition) {
  if (!condition) throw new Error("Invalid music beta security input")
}

function object(value, fields) {
  check(value !== null && typeof value === "object")
  check(
    Object.getPrototypeOf(value) === Object.prototype ||
      Object.getPrototypeOf(value) === null,
  )
  const descriptors = Object.getOwnPropertyDescriptors(value)
  check(Reflect.ownKeys(descriptors).length === fields.length)
  const snapshot = Object.create(null)
  for (const field of fields) {
    check(
      Object.hasOwn(descriptors, field) &&
        "value" in descriptors[field] &&
        descriptors[field].enumerable,
    )
    snapshot[field] = descriptors[field].value
  }
  return snapshot
}

function positiveInteger(value) {
  check(Number.isSafeInteger(value) && value > 0)
}

function decode(value, min, max = min) {
  check(
    typeof value === "string" &&
      value.length <= Math.ceil((max * 4) / 3) &&
      /^[A-Za-z0-9_-]+$/.test(value),
  )
  const bytes = Buffer.from(value, "base64url")
  check(
    bytes.length >= min &&
      bytes.length <= max &&
      bytes.toString("base64url") === value,
  )
  return bytes
}

// Callers supply server-only environment keys as 32 raw bytes or base64url.
// No environment is read here, including MUSIC_PORTRAIT_LOG_KEY.
function keyBytes(key) {
  if (Buffer.isBuffer(key)) {
    check(key.length === 32)
    return key
  }
  return decode(key, 32)
}

function hashCapability(token) {
  decode(token, 16, 64)
  return createHash("sha256").update(token).digest("hex")
}

function generateCapability(source = randomBytes) {
  check(typeof source === "function")
  const bytes = source(32)
  check(Buffer.isBuffer(bytes) && bytes.length === 32)
  const token = bytes.toString("base64url")
  return { token, hash: hashCapability(token) }
}

function deriveShareCapability(ownerId, shareVersion, key) {
  check(
    typeof ownerId === "string" &&
      ownerId.trim().length > 0 &&
      ownerId.length <= 200 &&
      ownerId.isWellFormed(),
  )
  positiveInteger(shareVersion)
  const token = mac(
    "music-beta-share-v1",
    JSON.stringify([ownerId, shareVersion]),
    keyBytes(key),
  ).toString("base64url")
  return { token, hash: hashCapability(token) }
}

function encryptSecret(plaintext, key, keyVersion) {
  check(
    typeof plaintext === "string" &&
      plaintext.length > 0 &&
      plaintext.isWellFormed() &&
      Buffer.byteLength(plaintext, "utf8") <= 65536,
  )
  positiveInteger(keyVersion)
  const secretKey = keyBytes(key)
  const iv = randomBytes(12)
  const cipher = createCipheriv("aes-256-gcm", secretKey, iv)
  // Bind the key version too, even when two versions share the same key.
  cipher.setAAD(Buffer.from(`music-beta-secret:${keyVersion}`))
  const ciphertext = Buffer.concat([
    cipher.update(plaintext, "utf8"),
    cipher.final(),
  ])
  return {
    keyVersion,
    iv: iv.toString("base64url"),
    ciphertext: ciphertext.toString("base64url"),
    tag: cipher.getAuthTag().toString("base64url"),
  }
}

function decryptSecret(record, keysByVersion) {
  try {
    record = object(record, ["keyVersion", "iv", "ciphertext", "tag"])
    positiveInteger(record.keyVersion)
    const iv = decode(record.iv, 12)
    const tag = decode(record.tag, 16)
    const ciphertext = decode(record.ciphertext, 1, 65536)
    check(keysByVersion !== null && typeof keysByVersion === "object")
    const descriptor = Object.getOwnPropertyDescriptor(
      keysByVersion,
      record.keyVersion,
    )
    check(descriptor && "value" in descriptor)
    const key = keyBytes(descriptor.value)
    const decipher = createDecipheriv("aes-256-gcm", key, iv)
    decipher.setAAD(Buffer.from(`music-beta-secret:${record.keyVersion}`))
    decipher.setAuthTag(tag)
    return Buffer.concat([
      decipher.update(ciphertext),
      decipher.final(),
    ]).toString("utf8")
  } catch {
    throw new Error("Invalid music beta encrypted secret")
  }
}

function sessionPayload(payload) {
  payload = object(payload, ["ownerId", "sessionVersion", "expiresAt"])
  check(
    typeof payload.ownerId === "string" &&
      payload.ownerId.trim().length > 0 &&
      payload.ownerId.length <= 200,
  )
  positiveInteger(payload.sessionVersion)
  positiveInteger(payload.expiresAt)
  return payload
}

function mac(domain, value, key) {
  return createHmac("sha256", key).update(`${domain}:${value}`).digest()
}

function sessionParts(token) {
  check(typeof token === "string" && token.length <= 4096)
  const parts = token.split(".")
  check(parts.length === 2)
  const body = decode(parts[0], 1, 3000)
  const signature = decode(parts[1], 32)
  const envelope = object(JSON.parse(body.toString("utf8")), [
    "version",
    "payload",
  ])
  check(envelope.version === 1)
  const payload = sessionPayload(envelope.payload)
  return { body: parts[0], signature, payload: { ...payload } }
}

function createSession(payload, key) {
  payload = sessionPayload(payload)
  const secretKey = keyBytes(key)
  const envelope = Object.assign(Object.create(null), { version: 1, payload })
  const body = Buffer.from(JSON.stringify(envelope)).toString("base64url")
  return `${body}.${mac("music-beta-session", body, secretKey).toString("base64url")}`
}

// expiresAt and now are epoch milliseconds; invalid/expired sessions return null.
// Callers must compare sessionVersion with the current owner record to revoke it.
function verifySession(token, key, now = Date.now()) {
  try {
    check(Number.isSafeInteger(now) && now >= 0)
    const { body, signature, payload } = sessionParts(token)
    const secretKey = keyBytes(key)
    if (!timingSafeEqual(signature, mac("music-beta-session", body, secretKey)))
      return null
    return payload.expiresAt > now ? payload : null
  } catch {
    return null
  }
}

function createCsrfToken(sessionToken, key) {
  sessionParts(sessionToken)
  return mac("music-beta-csrf", sessionToken, keyBytes(key)).toString(
    "base64url",
  )
}

function verifyCsrfToken(token, sessionToken, key) {
  try {
    const supplied = decode(token, 32)
    const expected = Buffer.from(
      createCsrfToken(sessionToken, key),
      "base64url",
    )
    return timingSafeEqual(supplied, expected)
  } catch {
    return false
  }
}

module.exports = {
  generateCapability,
  deriveShareCapability,
  hashCapability,
  encryptSecret,
  decryptSecret,
  createSession,
  verifySession,
  createCsrfToken,
  verifyCsrfToken,
}

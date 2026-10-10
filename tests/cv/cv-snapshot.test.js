const test = require("node:test")
const assert = require("node:assert/strict")
const crypto = require("node:crypto")
const fs = require("node:fs")
const os = require("node:os")
const path = require("node:path")

const { createSnapshot } = require("../../scripts/cv/snapshot")

const sha256 = value =>
  crypto.createHash("sha256").update(value).digest("hex")

const makeFixture = () => {
  const rootDir = fs.mkdtempSync(path.join(os.tmpdir(), "cv-snapshot-"))
  const variant = {
    schemaVersion: 1,
    id: "test-variant",
    outputFile: "test-cv",
    expectedPages: 1,
  }
  fs.mkdirSync(path.join(rootDir, "content", "cv", "variants"), {
    recursive: true,
  })
  fs.mkdirSync(path.join(rootDir, "cv-exports", "latex"), { recursive: true })
  fs.mkdirSync(path.join(rootDir, "output", "pdf"), { recursive: true })
  fs.writeFileSync(
    path.join(rootDir, "content", "cv", "variants", "test-variant.json"),
    JSON.stringify(variant, null, 2)
  )
  fs.writeFileSync(
    path.join(rootDir, "cv-exports", "latex", "test-cv.tex"),
    "exact latex"
  )
  fs.writeFileSync(path.join(rootDir, "output", "pdf", "test-cv.pdf"), "exact pdf")
  return rootDir
}

test("creates a complete dated snapshot with content hashes", t => {
  const rootDir = makeFixture()
  t.after(() => fs.rmSync(rootDir, { recursive: true, force: true }))

  const destination = createSnapshot({
    rootDir,
    variantId: "test-variant",
    slug: "backend-role",
    date: "2026-10-10",
    sourceRevision: "abc123",
  })
  const manifest = JSON.parse(
    fs.readFileSync(path.join(destination, "manifest.json"), "utf8")
  )

  assert.equal(manifest.variantId, "test-variant")
  assert.equal(manifest.sourceRevision, "abc123")
  assert.equal(manifest.files["test-cv.pdf"], sha256("exact pdf"))
  assert.equal(manifest.files["test-cv.tex"], sha256("exact latex"))
  assert.ok(fs.existsSync(path.join(destination, "test-variant.json")))
})

test("refuses to overwrite an existing snapshot", t => {
  const rootDir = makeFixture()
  t.after(() => fs.rmSync(rootDir, { recursive: true, force: true }))
  const options = {
    rootDir,
    variantId: "test-variant",
    slug: "backend-role",
    date: "2026-10-10",
    sourceRevision: "abc123",
  }

  createSnapshot(options)
  assert.throws(() => createSnapshot(options), /Snapshot already exists/)
})

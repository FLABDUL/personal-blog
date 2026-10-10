const test = require("node:test")
const assert = require("node:assert/strict")
const fs = require("node:fs")
const path = require("node:path")
const { spawnSync } = require("node:child_process")

const {
  assertExpectedPages,
  readMasterCv,
  root,
  validateVariant,
} = require("../../scripts/cv/lib")

const readJson = filePath => JSON.parse(fs.readFileSync(filePath, "utf8"))
const readVariant = id =>
  readJson(path.join(root, "content", "cv", "variants", `${id}.json`))

test("master and comparison variants declare exact page counts", () => {
  assert.equal(readVariant("master-v2").expectedPages, 2)
  assert.equal(readVariant("swe").expectedPages, 1)
})

test("rejects a successful compile with the wrong page count", () => {
  assert.doesNotThrow(() => assertExpectedPages({ id: "swe", expectedPages: 1 }, 1))
  assert.throws(
    () => assertExpectedPages({ id: "swe", expectedPages: 1 }, 2),
    /swe compiled to 2 pages; expected 1/
  )
})

test("variants reference confirmed achievements and existing projects", () => {
  const cv = readMasterCv()

  assert.deepEqual(validateVariant(cv, readVariant("master-v2")), [])
  assert.deepEqual(validateVariant(cv, readVariant("swe")), [])

  const unsafeCv = structuredClone(cv)
  unsafeCv.achievements[0].ownership = "unconfirmed"
  assert.match(
    validateVariant(unsafeCv, readVariant("master-v2")).join("\n"),
    /must have confirmed ownership/
  )
})

test("master variant renders selected projects and achievement text", () => {
  const result = spawnSync(
    process.execPath,
    ["scripts/cv/generate-latex.js", "--variant", "master-v2"],
    { cwd: root, encoding: "utf8" }
  )

  assert.equal(result.status, 0, result.stderr || result.stdout)
  const tex = fs.readFileSync(
    path.join(
      root,
      "cv-exports",
      "latex",
      "abdul-hakim-norazman-master-v2-cv.tex"
    ),
    "utf8"
  )
  assert.match(tex, /\\section\*\{Selected Projects\}/)
  assert.match(
    tex,
    /\\newpage\s+\\textbf\{J\.P\. Morgan Asset Management/
  )
  assert.match(tex, /Residue Lens/)
  assert.match(tex, /Budget V2/)
  assert.match(tex, /220,000/)
  assert.match(tex, /production database round-trips/)
})

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

test("canonical CV declares an exact one-page count", () => {
  assert.equal(readVariant("master-v2").expectedPages, 1)
})

test("master variant stays selective enough for a one-page application CV", () => {
  const variant = readVariant("master-v2")

  assert.equal(variant.experience[0].highlights.length, 4)
  assert.equal(variant.experience[1].highlights.length, 2)
  assert.equal(variant.projects.length, 2)
  assert.equal(variant.pageBreakBeforeExperienceIndex, undefined)
  assert.ok(variant.summary.trim().split(/\s+/).length <= 30)
})

test("rejects a successful compile with the wrong page count", () => {
  assert.doesNotThrow(() =>
    assertExpectedPages({ id: "master-v2", expectedPages: 1 }, 1)
  )
  assert.throws(
    () => assertExpectedPages({ id: "master-v2", expectedPages: 1 }, 2),
    /master-v2 compiled to 2 pages; expected 1/
  )
})

test("variants reference confirmed achievements and existing projects", () => {
  const cv = readMasterCv()

  assert.deepEqual(validateVariant(cv, readVariant("master-v2")), [])

  const unsafeCv = structuredClone(cv)
  unsafeCv.achievements[0].ownership = "unconfirmed"
  assert.match(
    validateVariant(unsafeCv, readVariant("master-v2")).join("\n"),
    /must have confirmed ownership/
  )
})

test("default LaTeX generation produces the canonical CV", () => {
  const result = spawnSync(
    process.execPath,
    ["scripts/cv/generate-latex.js"],
    { cwd: root, encoding: "utf8" }
  )

  assert.equal(result.status, 0, result.stderr || result.stdout)
  assert.match(result.stdout, /abdul-hakim-norazman-master-v2-cv\.tex/)
})

test("canonical CV renders approved project and education evidence", () => {
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
  assert.match(tex, /\\section\*\{Projects\}/)
  assert.doesNotMatch(tex, /\\section\*\{Selected Projects\}/)
  assert.match(tex, /\\section\*\{Projects\}\s+\\begin\{itemize\}/)
  assert.match(tex, /\\item \\textbf\{Budget V2\}/)
  assert.match(tex, /\\item \\textbf\{Dependency Agent\}/)
  assert.doesNotMatch(tex, /\\newpage/)
  assert.match(tex, /220,000/)
  assert.match(tex, /production database round-trips/)
  assert.match(tex, /2019 \\textbf\{SpaceX Hyperloop Pod Competition\} IV/)
  assert.match(tex, /uCreate Studio/)
  assert.match(tex, /10,000 3D-printed face shields/)
  assert.match(tex, /Dependency Agent[\s\S]*\\end\{itemize\}\s+\\section\*\{Education\}/)
})

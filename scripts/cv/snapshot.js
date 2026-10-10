const crypto = require("crypto")
const fs = require("fs")
const path = require("path")
const { execFileSync } = require("child_process")
const { root } = require("./lib")

const getArgument = name => {
  const index = process.argv.indexOf(name)
  return index === -1 ? undefined : process.argv[index + 1]
}

const sha256 = filePath =>
  crypto.createHash("sha256").update(fs.readFileSync(filePath)).digest("hex")

const createSnapshot = ({
  rootDir = root,
  variantId,
  slug,
  date,
  sourceRevision,
}) => {
  if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(variantId || "")) {
    throw new Error("variantId must be a lowercase slug")
  }
  if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug || "")) {
    throw new Error("slug must be a lowercase slug")
  }
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date || "")) {
    throw new Error("date must use YYYY-MM-DD")
  }

  const variantPath = path.join(
    rootDir,
    "content",
    "cv",
    "variants",
    `${variantId}.json`
  )
  const variant = JSON.parse(fs.readFileSync(variantPath, "utf8"))
  const sources = [
    variantPath,
    path.join(rootDir, "cv-exports", "latex", `${variant.outputFile}.tex`),
    path.join(rootDir, "output", "pdf", `${variant.outputFile}.pdf`),
  ]
  for (const source of sources) {
    if (!fs.existsSync(source)) throw new Error(`Snapshot source is missing: ${source}`)
  }

  const destination = path.join(rootDir, "output", "applications", date, slug)
  if (fs.existsSync(destination)) {
    throw new Error(`Snapshot already exists: ${destination}`)
  }
  fs.mkdirSync(destination, { recursive: true })

  const copiedNames = [
    `${variantId}.json`,
    `${variant.outputFile}.tex`,
    `${variant.outputFile}.pdf`,
  ]
  sources.forEach((source, index) =>
    fs.copyFileSync(source, path.join(destination, copiedNames[index]))
  )

  const revision =
    sourceRevision ||
    execFileSync("git", ["rev-parse", "HEAD"], {
      cwd: rootDir,
      encoding: "utf8",
    }).trim()
  const files = Object.fromEntries(
    copiedNames.map(fileName => [fileName, sha256(path.join(destination, fileName))])
  )
  fs.writeFileSync(
    path.join(destination, "manifest.json"),
    `${JSON.stringify(
      {
        schemaVersion: 1,
        variantId,
        outputFile: variant.outputFile,
        snapshotDate: date,
        slug,
        sourceRevision: revision,
        files,
      },
      null,
      2
    )}\n`
  )

  return destination
}

if (require.main === module) {
  const destination = createSnapshot({
    variantId: getArgument("--variant"),
    slug: getArgument("--slug"),
    date: getArgument("--date"),
  })
  console.log(`Created immutable CV snapshot at ${path.relative(root, destination)}`)
}

module.exports = { createSnapshot }

const fs = require("node:fs")
const path = require("node:path")

const {
  toPublicCatalogue,
  validateCatalogueSnapshot,
} = require("../../api/_spotify/catalogue")

const outputPath = path.resolve("static/music/catalogue-preview.json")

if (process.env.GATSBY_MUSIC_DRAFT_PREVIEW !== "1") {
  fs.rmSync(outputPath, { force: true })
  process.exit(0)
}

const sourcePath = path.resolve(
  process.env.SPOTIFY_LOCAL_CATALOGUE_PATH || ".spotify-catalogue.local.json",
)

if (!fs.existsSync(sourcePath)) {
  fs.rmSync(outputPath, { force: true })
  console.warn(
    "Local Spotify catalogue unavailable; preview will use fallbacks.",
  )
  process.exit(0)
}

const catalogue = validateCatalogueSnapshot(
  JSON.parse(fs.readFileSync(sourcePath, "utf8")),
)
fs.mkdirSync(path.dirname(outputPath), { recursive: true })
fs.writeFileSync(
  outputPath,
  `${JSON.stringify(toPublicCatalogue(catalogue), null, 2)}\n`,
  "utf8",
)
console.log("Local Spotify catalogue prepared for the draft preview.")

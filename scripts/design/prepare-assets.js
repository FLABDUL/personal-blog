const fs = require("node:fs")
const path = require("node:path")
const sharp = require("sharp")
const manifest = require("../../content/studio/items.json")
async function prepare() {
  const target = path.resolve("static/design")
  fs.mkdirSync(path.join(target, "art"), { recursive: true })
  for (const item of manifest.items.filter(
    item => item.status === "published",
  )) {
    for (const width of [480, 1000]) {
      const suffix = width === 480 ? "-480" : ""
      await sharp(path.join("static", item.media.path))
        .rotate()
        .resize({ width, withoutEnlargement: true })
        .webp({ quality: 78 })
        .toFile(path.join(target, "art", item.title + suffix + ".webp"))
    }
  }
  await sharp("static/profile.jpg")
    .rotate()
    .resize(640, 800, { fit: "cover", position: "attention" })
    .webp({ quality: 85 })
    .toFile(path.join(target, "portrait.webp"))
  console.log("Prepared responsive derivatives from existing published media.")
}
prepare().catch(error => {
  console.error(error.message)
  process.exitCode = 1
})

const Ajv = require("ajv")
const fs = require("fs")
const path = require("path")

const root = path.resolve(__dirname, "..", "..")
const manifestPath = path.join(root, "content", "studio", "items.json")
const schemaPath = path.join(root, "content", "studio", "schema.json")
const staticDirectory = path.join(root, "static")
const artDirectory = path.join(staticDirectory, "art")
const imageWarningBytes = 1024 * 1024
const videoWarningBytes = 25 * 1024 * 1024

const readJson = filePath => JSON.parse(fs.readFileSync(filePath, "utf8"))
const errors = []
const warnings = []
let manifest
let schema

try {
  manifest = readJson(manifestPath)
  schema = readJson(schemaPath)
} catch (error) {
  console.error(`Studio validation failed:\n- ${error.message}`)
  process.exit(1)
}

const ajv = new Ajv({ allErrors: true, jsonPointers: true, format: "full" })
const validate = ajv.compile(schema)

if (!validate(manifest)) {
  errors.push(
    ...validate.errors.map(
      error =>
        `${error.dataPath || "/"} ${error.message}${
          error.params?.missingProperty
            ? `: ${error.params.missingProperty}`
            : ""
        }`
    )
  )
}

const items = Array.isArray(manifest?.items) ? manifest.items : []
const seenIds = new Set()
const referencedMedia = new Set()

const checkLocalMedia = (item, publicPath, label) => {
  if (typeof publicPath !== "string" || !publicPath.startsWith("/")) return

  const relativePath = publicPath.slice(1).replaceAll("/", path.sep)
  const resolvedPath = path.resolve(staticDirectory, relativePath)
  const relativeToStatic = path.relative(staticDirectory, resolvedPath)

  if (relativeToStatic.startsWith("..") || path.isAbsolute(relativeToStatic)) {
    errors.push(
      `Unsafe ${label} path for ${item.id || "unknown item"}: ${publicPath}`
    )
    return
  }

  referencedMedia.add(publicPath)
  if (!fs.existsSync(resolvedPath) || !fs.statSync(resolvedPath).isFile()) {
    errors.push(
      `Missing ${label} for ${item.id || "unknown item"}: ${publicPath}`
    )
    return
  }

  const size = fs.statSync(resolvedPath).size
  if (size === 0) {
    errors.push(
      `Empty ${label} for ${item.id || "unknown item"}: ${publicPath}`
    )
  } else if (/\.(?:jpg|jpeg|png|webp|gif|avif)$/i.test(publicPath)) {
    if (size > imageWarningBytes) {
      warnings.push(
        `Large image source for ${item.id}: ${publicPath} (${(
          size /
          1024 /
          1024
        ).toFixed(1)} MB). Aim for 1 MB or less.`
      )
    }
  } else if (size > videoWarningBytes) {
    warnings.push(
      `Large video source for ${item.id}: ${publicPath} (${(
        size /
        1024 /
        1024
      ).toFixed(1)} MB). Aim for 25 MB or less.`
    )
  }
}

const collectArtFiles = (directory, relativeDirectory = "") => {
  const files = []

  for (const entry of fs.readdirSync(directory, { withFileTypes: true })) {
    const relativePath = path.join(relativeDirectory, entry.name)
    if (entry.isDirectory()) {
      files.push(
        ...collectArtFiles(path.join(directory, entry.name), relativePath)
      )
    } else if (entry.isFile()) {
      files.push(`/art/${relativePath.replaceAll(path.sep, "/")}`)
    }
  }

  return files
}

for (const item of items) {
  if (!item || typeof item !== "object" || Array.isArray(item)) continue

  if (typeof item.id === "string") {
    if (seenIds.has(item.id))
      errors.push(`Duplicate Studio item id: ${item.id}`)
    seenIds.add(item.id)
  }

  checkLocalMedia(item, item.media?.path, "media")
  checkLocalMedia(item, item.media?.poster, "video poster")
}

for (const publicPath of collectArtFiles(artDirectory)) {
  if (!referencedMedia.has(publicPath)) {
    warnings.push(`Unreferenced file in static/art: ${publicPath}`)
  }
}

for (const warning of warnings) console.warn(`Studio warning: ${warning}`)

if (errors.length > 0) {
  console.error(`Studio validation failed:\n- ${errors.join("\n- ")}`)
  process.exitCode = 1
} else {
  const publishedCount = items.filter(
    item => item.status === "published"
  ).length
  const draftCount = items.filter(item => item.status === "draft").length
  console.log(
    `Studio validation passed: ${items.length} items (${publishedCount} published, ${draftCount} draft) and ${referencedMedia.size} media files checked.`
  )
}

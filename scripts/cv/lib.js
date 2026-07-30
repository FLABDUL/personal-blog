const fs = require("fs")
const path = require("path")

const root = path.resolve(__dirname, "..", "..")
const masterPath = path.join(root, "content", "cv", "master.json")
const schemaPath = path.join(root, "content", "cv", "schema.json")
const exportsDirectory = path.join(root, "cv-exports")
const reportsDirectory = path.join(root, "cv-reports")

const readJson = filePath => JSON.parse(fs.readFileSync(filePath, "utf8"))

const readMasterCv = () => readJson(masterPath)
const readSchema = () => readJson(schemaPath)

const getIdentifiedRecords = cv => [
  ...cv.overview,
  ...cv.professionalExperience,
  ...cv.engineeringWork,
  ...cv.engineeringWork.flatMap(group => group.items),
  cv.education,
  cv.universityLeadership,
  ...cv.impact,
  ...cv.professionalDevelopment,
  ...cv.skills,
]

const collectContentStrings = value => {
  if (typeof value === "string") {
    if (
      value.startsWith("http://") ||
      value.startsWith("https://") ||
      value.startsWith("mailto:") ||
      value.startsWith("#")
    ) {
      return []
    }
    return [value]
  }

  if (Array.isArray(value)) {
    return value.flatMap(collectContentStrings)
  }

  if (value && typeof value === "object") {
    return Object.entries(value).flatMap(([key, child]) =>
      ["id", "updated", "period", "location"].includes(key)
        ? []
        : collectContentStrings(child)
    )
  }

  return []
}

const writeGeneratedFile = (filePath, content, checkOnly) => {
  const normalized = `${content.trim()}\n`

  if (checkOnly) {
    if (!fs.existsSync(filePath)) {
      throw new Error(
        `${path.relative(root, filePath)} is missing. Run npm run cv:generate.`
      )
    }

    const existing = fs.readFileSync(filePath, "utf8").replace(/\r\n/g, "\n")
    if (existing !== normalized) {
      throw new Error(
        `${path.relative(
          root,
          filePath
        )} is stale. Run npm run cv:generate and commit the result.`
      )
    }
    return
  }

  fs.mkdirSync(path.dirname(filePath), { recursive: true })
  fs.writeFileSync(filePath, normalized)
}

module.exports = {
  collectContentStrings,
  exportsDirectory,
  getIdentifiedRecords,
  masterPath,
  readMasterCv,
  readSchema,
  reportsDirectory,
  root,
  writeGeneratedFile,
}

const Ajv = require("ajv")
const fs = require("fs")
const path = require("path")
const {
  getIdentifiedRecords,
  masterPath,
  readMasterCv,
  readSchema,
  root,
  validateAchievementData,
  validateVariant,
  variantsDirectory,
} = require("./lib")

const cv = readMasterCv()
const schema = readSchema()
const ajv = new Ajv({ allErrors: true, jsonPointers: true })
const validate = ajv.compile(schema)

const errors = []

if (!validate(cv)) {
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

errors.push(...validateAchievementData(cv))

for (const fileName of fs
  .readdirSync(variantsDirectory)
  .filter(fileName => fileName.endsWith(".json"))) {
  const variant = JSON.parse(
    fs.readFileSync(path.join(variantsDirectory, fileName), "utf8")
  )
  errors.push(...validateVariant(cv, variant))
}

const seenIds = new Set()
for (const record of getIdentifiedRecords(cv)) {
  if (seenIds.has(record.id)) {
    errors.push(`Duplicate record id: ${record.id}`)
  }
  seenIds.add(record.id)
}

if (!cv.professionalExperience.some(item => item.includeInBrief)) {
  errors.push("At least one professional experience must appear in the brief CV")
}

if (!cv.skills.some(item => item.includeInBrief)) {
  errors.push("At least one skill group must appear in the brief CV")
}

if (errors.length > 0) {
  console.error(
    `CV validation failed for ${path.relative(root, masterPath)}:\n- ${errors.join(
      "\n- "
    )}`
  )
  process.exitCode = 1
} else {
  console.log(
    `CV validation passed: ${seenIds.size} stable record IDs checked.`
  )
}

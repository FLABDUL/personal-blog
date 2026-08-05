const Ajv = require("ajv")
const {
  getIdentifiedRecords,
  masterPath,
  readMasterCv,
  readSchema,
  root,
} = require("./lib")
const path = require("path")

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

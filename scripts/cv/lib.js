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

const allowedAchievementValidations = new Set([
  "production",
  "uat",
  "load-tested",
  "not-production",
])

const getAchievementMap = cv =>
  new Map((cv.achievements || []).map(achievement => [achievement.id, achievement]))

const validateAchievementData = cv => {
  const errors = []
  const seenIds = new Set()

  for (const achievement of cv.achievements || []) {
    if (seenIds.has(achievement.id)) {
      errors.push(`Duplicate achievement id: ${achievement.id}`)
    }
    seenIds.add(achievement.id)

    if (achievement.ownership !== "confirmed") {
      errors.push(
        `Achievement ${achievement.id} must have confirmed ownership`
      )
    }
    if (!allowedAchievementValidations.has(achievement.validation)) {
      errors.push(
        `Achievement ${achievement.id} has unsupported validation: ${achievement.validation}`
      )
    }
  }

  for (const role of cv.professionalExperience || []) {
    for (const achievementId of role.achievementIds || []) {
      if (!seenIds.has(achievementId)) {
        errors.push(
          `Role ${role.id} references unknown achievement: ${achievementId}`
        )
      }
    }
  }

  return errors
}

const hydrateProfessionalExperience = cv => {
  const achievements = getAchievementMap(cv)

  return cv.professionalExperience.map(role => ({
    ...role,
    highlights: [
      ...(role.achievementIds || []).map(achievementId => {
        const achievement = achievements.get(achievementId)
        if (!achievement) {
          throw new Error(
            `Role ${role.id} references unknown achievement: ${achievementId}`
          )
        }
        return achievement.text
      }),
      ...role.highlights,
    ],
  }))
}

const getIdentifiedRecords = cv => [
  ...cv.overview,
  ...(cv.achievements || []),
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
  getAchievementMap,
  getIdentifiedRecords,
  hydrateProfessionalExperience,
  masterPath,
  readMasterCv,
  readSchema,
  reportsDirectory,
  root,
  validateAchievementData,
  writeGeneratedFile,
}

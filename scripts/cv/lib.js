const fs = require("fs")
const path = require("path")
const {
  getAchievementMap,
  hydrateProfessionalExperience,
} = require("../../content/cv/model")

const root = path.resolve(__dirname, "..", "..")
const masterPath = path.join(root, "content", "cv", "master.json")
const schemaPath = path.join(root, "content", "cv", "schema.json")
const exportsDirectory = path.join(root, "cv-exports")
const reportsDirectory = path.join(root, "cv-reports")
const variantsDirectory = path.join(root, "content", "cv", "variants")

const readJson = filePath => JSON.parse(fs.readFileSync(filePath, "utf8"))

const readMasterCv = () => readJson(masterPath)
const readSchema = () => readJson(schemaPath)

const allowedAchievementValidations = new Set([
  "production",
  "uat",
  "load-tested",
  "not-production",
])

const assertExpectedPages = (variant, actualPages) => {
  if (actualPages !== variant.expectedPages) {
    throw new Error(
      `${variant.id} compiled to ${actualPages} pages; expected ${variant.expectedPages}`
    )
  }
}

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

const validateVariant = (cv, variant) => {
  const errors = []
  const achievements = getAchievementMap(cv)
  const roles = new Map(cv.professionalExperience.map(role => [role.id, role]))
  const workGroups = new Map(cv.engineeringWork.map(group => [group.id, group]))
  const developmentGroups = new Map(
    cv.professionalDevelopment.map(group => [group.id, group])
  )

  if (!Number.isInteger(variant.expectedPages) || variant.expectedPages < 1) {
    errors.push(`Variant ${variant.id} must declare a positive expectedPages`)
  }

  const validateReference = reference => {
    if (reference.source === "achievement") {
      const achievement = achievements.get(reference.achievementId)
      if (!achievement) {
        errors.push(
          `Variant ${variant.id} references unknown achievement: ${reference.achievementId}`
        )
      } else if (achievement.ownership !== "confirmed") {
        errors.push(`Achievement ${achievement.id} must have confirmed ownership`)
      }
      return
    }

    if (reference.source === "experience") {
      const role = roles.get(reference.roleId)
      if (
        !role ||
        !Number.isInteger(reference.highlightIndex) ||
        reference.highlightIndex < 0 ||
        reference.highlightIndex >= role.highlights.length
      ) {
        errors.push(
          `Variant ${variant.id} has invalid experience reference: ${reference.roleId}`
        )
      }
      return
    }

    if (reference.source === "engineeringWork") {
      const group = workGroups.get(reference.groupId)
      if (!group || !group.items.some(item => item.id === reference.itemId)) {
        errors.push(
          `Variant ${variant.id} has invalid engineering-work reference: ${reference.itemId}`
        )
      }
      return
    }

    if (reference.source === "professionalDevelopment") {
      const group = developmentGroups.get(reference.groupId)
      if (
        !group ||
        !Number.isInteger(reference.itemIndex) ||
        reference.itemIndex < 0 ||
        reference.itemIndex >= group.items.length
      ) {
        errors.push(
          `Variant ${variant.id} has invalid professional-development reference: ${reference.groupId}`
        )
      }
      return
    }

    if (reference.source === "education") {
      if (
        !Number.isInteger(reference.detailIndex) ||
        reference.detailIndex < 0 ||
        reference.detailIndex >= cv.education.details.length
      ) {
        errors.push(`Variant ${variant.id} has invalid education reference`)
      }
      return
    }

    if (reference.source === "universityLeadership") {
      if (
        !Number.isInteger(reference.highlightIndex) ||
        reference.highlightIndex < 0 ||
        reference.highlightIndex >= cv.universityLeadership.highlights.length
      ) {
        errors.push(
          `Variant ${variant.id} has invalid university-leadership reference`
        )
      }
      return
    }

    errors.push(
      `Variant ${variant.id} has unsupported content source: ${reference.source}`
    )
  }

  for (const entry of variant.experience || []) {
    for (const references of entry.highlights || []) {
      references.forEach(validateReference)
    }
  }
  ;(variant.development || []).forEach(validateReference)
  for (const references of variant.educationBullets || []) {
    references.forEach(validateReference)
  }
  for (const project of variant.projects || []) {
    validateReference({ source: "engineeringWork", ...project })
  }

  for (const row of variant.skillRows || []) {
    const skill = cv.skills.find(candidate => candidate.id === row.skillId)
    if (!skill) {
      errors.push(`Variant ${variant.id} references unknown skill: ${row.skillId}`)
      continue
    }
    for (const value of row.values || []) {
      if (!skill.detail.includes(value)) {
        errors.push(
          `Variant ${variant.id} value ${value} is absent from skill ${row.skillId}`
        )
      }
    }
  }

  return errors
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
  assertExpectedPages,
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
  validateVariant,
  variantsDirectory,
  writeGeneratedFile,
}

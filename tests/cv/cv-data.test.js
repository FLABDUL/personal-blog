const test = require("node:test")
const assert = require("node:assert/strict")

const {
  getAchievementMap,
  hydrateProfessionalExperience,
  validateAchievementData,
} = require("../../scripts/cv/lib")

const makeCv = () => ({
  achievements: [
    {
      id: "measured-production-change",
      roleId: "current-role",
      text: "Reduced production database work.",
      ownership: "confirmed",
      validation: "production",
      scope: "Per request",
      tags: ["database", "performance"],
    },
  ],
  professionalExperience: [
    {
      id: "current-role",
      achievementIds: ["measured-production-change"],
      highlights: ["Kept an existing responsibility."],
    },
  ],
})

test("indexes achievement records by stable ID", () => {
  const map = getAchievementMap(makeCv())

  assert.equal(map.get("measured-production-change").validation, "production")
})

test("hydrates achievement text before legacy role highlights", () => {
  const [role] = hydrateProfessionalExperience(makeCv())

  assert.deepEqual(role.highlights, [
    "Reduced production database work.",
    "Kept an existing responsibility.",
  ])
})

test("reports duplicate IDs, unknown references and unconfirmed ownership", () => {
  const cv = makeCv()
  cv.achievements.push({
    ...cv.achievements[0],
    ownership: "unconfirmed",
    validation: "unsupported",
  })
  cv.professionalExperience[0].achievementIds.push("missing-achievement")

  assert.deepEqual(validateAchievementData(cv), [
    "Duplicate achievement id: measured-production-change",
    "Achievement measured-production-change must have confirmed ownership",
    "Achievement measured-production-change has unsupported validation: unsupported",
    "Role current-role references unknown achievement: missing-achievement",
  ])
})

test("throws when hydration encounters an unknown achievement", () => {
  const cv = makeCv()
  cv.professionalExperience[0].achievementIds = ["missing-achievement"]

  assert.throws(
    () => hydrateProfessionalExperience(cv),
    /Role current-role references unknown achievement: missing-achievement/
  )
})

test("rejects an achievement attributed to the wrong role", () => {
  const cv = makeCv()
  cv.professionalExperience.push({
    id: "previous-role",
    achievementIds: ["measured-production-change"],
    highlights: [],
  })

  assert.deepEqual(validateAchievementData(cv), [
    "Role previous-role references achievement measured-production-change owned by current-role",
  ])
})

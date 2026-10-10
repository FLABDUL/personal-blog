const getAchievementMap = cv =>
  new Map((cv.achievements || []).map(achievement => [achievement.id, achievement]))

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

module.exports = { getAchievementMap, hydrateProfessionalExperience }

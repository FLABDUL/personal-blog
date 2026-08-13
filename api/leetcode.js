const profile = require("../content/leetcode.json")

const LEETCODE_ENDPOINT = "https://leetcode.com/graphql"
const CACHE_SECONDS = 60 * 60 * 24

const PROFILE_QUERY = `
  query userProfile($username: String!) {
    matchedUser(username: $username) {
      username
      submitStatsGlobal {
        acSubmissionNum {
          difficulty
          count
        }
      }
      languageProblemCount {
        languageName
        problemsSolved
      }
      tagProblemCounts {
        advanced {
          tagName
          problemsSolved
        }
        intermediate {
          tagName
          problemsSolved
        }
        fundamental {
          tagName
          problemsSolved
        }
      }
    }
  }
`

const focusAreaNames = new Set([
  "Array",
  "Hash Table",
  "Two Pointers",
  "Depth-First Search",
  "Dynamic Programming",
])

const fallbackResponse = () => ({
  username: profile.username,
  profileUrl: profile.profileUrl,
  ...profile.fallback,
  source: "fallback",
  updatedAt: null,
})

const normalizeProfile = matchedUser => {
  const solvedCounts = Object.fromEntries(
    matchedUser.submitStatsGlobal.acSubmissionNum.map(item => [
      item.difficulty.toLowerCase(),
      item.count,
    ])
  )
  const tagCounts = Object.values(matchedUser.tagProblemCounts)
    .flat()
    .filter(tag => focusAreaNames.has(tag.tagName))
    .sort((left, right) => right.problemsSolved - left.problemsSolved)

  return {
    username: matchedUser.username,
    profileUrl: profile.profileUrl,
    totalSolved: solvedCounts.all,
    difficulty: {
      easy: solvedCounts.easy,
      medium: solvedCounts.medium,
      hard: solvedCounts.hard,
    },
    languages: matchedUser.languageProblemCount
      .map(language => ({
        name: language.languageName,
        solved: language.problemsSolved,
      }))
      .sort((left, right) => right.solved - left.solved),
    focusAreas: tagCounts.map(tag => ({
      name: tag.tagName,
      solved: tag.problemsSolved,
    })),
    source: "leetcode",
    updatedAt: new Date().toISOString(),
  }
}

module.exports = async function handler(request, response) {
  if (request.method !== "GET") {
    response.setHeader("Allow", "GET")
    return response.status(405).json({ error: "Method not allowed" })
  }

  try {
    const controller = new AbortController()
    const timeout = setTimeout(() => controller.abort(), 8000)
    const leetcodeResponse = await fetch(LEETCODE_ENDPOINT, {
      method: "POST",
      headers: {
        Accept: "application/json",
        "Content-Type": "application/json",
        "User-Agent": "madebyhakim.com profile card",
      },
      body: JSON.stringify({
        query: PROFILE_QUERY,
        variables: { username: profile.username },
      }),
      signal: controller.signal,
    })
    clearTimeout(timeout)

    if (!leetcodeResponse.ok) {
      throw new Error(`LeetCode returned ${leetcodeResponse.status}`)
    }

    const payload = await leetcodeResponse.json()
    if (payload.errors || !payload.data?.matchedUser) {
      throw new Error("LeetCode profile data was unavailable")
    }

    response.setHeader(
      "Cache-Control",
      `public, s-maxage=${CACHE_SECONDS}, stale-while-revalidate=${
        CACHE_SECONDS * 7
      }`
    )
    return response.status(200).json(normalizeProfile(payload.data.matchedUser))
  } catch (error) {
    response.setHeader(
      "Cache-Control",
      "public, s-maxage=900, stale-while-revalidate=86400"
    )
    return response.status(200).json(fallbackResponse())
  }
}

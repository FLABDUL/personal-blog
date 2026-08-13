import React, { useEffect, useState } from "react"
import leetcodeProfile from "../../content/leetcode.json"

const initialStats = {
  username: leetcodeProfile.username,
  profileUrl: leetcodeProfile.profileUrl,
  ...leetcodeProfile.fallback,
  source: "fallback",
  updatedAt: null,
}

const number = value => new Intl.NumberFormat("en-GB").format(value)

const LeetCodeCard = () => {
  const [stats, setStats] = useState(initialStats)
  const isLive = stats.source === "leetcode"

  useEffect(() => {
    const controller = new AbortController()

    fetch("/api/leetcode", {
      headers: { Accept: "application/json" },
      signal: controller.signal,
    })
      .then(response => {
        if (!response.ok) throw new Error("LeetCode stats were unavailable")
        return response.json()
      })
      .then(setStats)
      .catch(() => {})

    return () => controller.abort()
  }, [])

  return (
    <article className="leetcode-card">
      <header className="leetcode-card__header">
        <div>
          <p className="leetcode-card__eyebrow">Ongoing coding practice</p>
          <h2>LeetCode practice</h2>
        </div>
        <span
          className={`leetcode-card__status${isLive ? " is-live" : ""}`}
          aria-live="polite"
          title={
            stats.updatedAt
              ? `Retrieved ${new Date(stats.updatedAt).toLocaleString("en-GB")}`
              : "Using the saved profile snapshot"
          }
        >
          <span aria-hidden="true" />
          {isLive ? "Live stats" : "Saved snapshot"}
        </span>
      </header>

      <p className="leetcode-card__intro">
        Regular algorithm and data-structure practice across Java, Python and
        Pandas, building fluency through consistent problem solving.
      </p>

      <div className="leetcode-card__scoreboard">
        <div className="leetcode-card__total">
          <strong>{number(stats.totalSolved)}</strong>
          <span>problems solved</span>
        </div>
        <dl className="leetcode-card__difficulty">
          <div className="is-easy">
            <dt>Easy</dt>
            <dd>{number(stats.difficulty.easy)}</dd>
          </div>
          <div className="is-medium">
            <dt>Medium</dt>
            <dd>{number(stats.difficulty.medium)}</dd>
          </div>
          <div className="is-hard">
            <dt>Hard</dt>
            <dd>{number(stats.difficulty.hard)}</dd>
          </div>
        </dl>
      </div>

      <div className="leetcode-card__details">
        <div>
          <h4>Languages</h4>
          <ul className="leetcode-card__pills" aria-label="Languages used">
            {stats.languages.map(language => (
              <li key={language.name}>
                {language.name} <span>{number(language.solved)}</span>
              </li>
            ))}
          </ul>
        </div>
        <div>
          <h4>Practised areas</h4>
          <ul
            className="leetcode-card__pills"
            aria-label="Frequently practised problem areas"
          >
            {stats.focusAreas.map(area => (
              <li key={area.name}>
                {area.name} <span>{number(area.solved)}</span>
              </li>
            ))}
          </ul>
        </div>
      </div>

      <footer className="leetcode-card__footer">
        <span>Automatically refreshed daily</span>
        <a href={stats.profileUrl} target="_blank" rel="noreferrer">
          View LeetCode profile <span aria-hidden="true">↗</span>
        </a>
      </footer>
    </article>
  )
}

export default LeetCodeCard

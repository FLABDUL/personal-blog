import React from "react"
import { Link } from "gatsby"

import Layout from "../../components/Layout"
import Seo from "../../components/Seo"
import * as styles from "../../components/music/MusicCaseStudy.module.css"

const architectureSteps = [
  {
    label: "Authored manifest",
    detail: "The artists, songs, notes, prominence and relationships I choose.",
  },
  {
    label: "Server refresh",
    detail:
      "Exact Spotify IDs are enriched through a server-only catalogue request.",
  },
  {
    label: "Validated snapshot",
    detail:
      "A bounded schema is checked before one temporary snapshot is replaced.",
  },
  {
    label: "Living atlas",
    detail:
      "The interface combines editorial meaning with current catalogue artwork.",
  },
]

export default function MusicCaseStudyPage() {
  return (
    <Layout wide>
      <article className={styles.caseStudy}>
        <header className={styles.hero}>
          <p className={styles.eyebrow}>
            Music Portrait · Creative frontend case study
          </p>
          <h1>Turning listening into a living atlas</h1>
          <p className={styles.lede}>
            I designed and built an interactive portrait that treats music as
            personal geography: artists become planets, favourite songs become
            moons and meaningful connections become routes through a hand-drawn
            solar system.
          </p>
          <div className={styles.heroActions}>
            <Link className={styles.primaryAction} to="/music/">
              Explore the portrait
            </Link>
            <a href="#data-flow">See how the Spotify data moves</a>
          </div>
        </header>

        <section className={styles.projectSummary} aria-label="Project summary">
          <div>
            <p>Role</p>
            <strong>Creative direction and frontend development</strong>
          </div>
          <div>
            <p>Stack</p>
            <strong>Gatsby · React · Vercel Functions · Spotify Web API</strong>
          </div>
          <div>
            <p>Outcome</p>
            <strong>A personal, explorable music portrait</strong>
          </div>
        </section>

        <Chapter number="01" kicker="Framing the work" title="The challenge">
          <p>
            A conventional artist grid could show names and artwork, but not why
            the music matters to me. My objective was an expressive portfolio
            piece that carries memories, habits and creative influences while
            demonstrating thoughtful API and interface work.
          </p>
          <p>
            That meant keeping editorial judgement separate from Spotify. I
            choose the artists, prominence, notes and connections; Spotify
            supplies catalogue names, links and artwork for those exact
            selections.
          </p>
        </Chapter>

        <Chapter
          number="02"
          kicker="Visual language"
          title="Creative direction"
        >
          <p>
            The visual direction combines an old celestial chart with a warm,
            colourful solar system. Brass rules, deep ocean blues and map-like
            labels connect the project with the Bookshelf and Studio areas
            without making it feel like a generic music dashboard.
          </p>
          <aside className={styles.designPrinciple}>
            <span>Design principle</span>
            <p>
              The interface should explain my relationship with music through
              movement and scale before it asks someone to read a list.
            </p>
          </aside>
        </Chapter>

        <Chapter
          number="03"
          kicker="Interaction system"
          title="Designing the interaction"
        >
          <div className={styles.decisionGrid}>
            <article>
              <span>Planets</span>
              <h3>Prominence becomes scale</h3>
              <p>
                Artists use deliberately different sizes, so personal favourites
                read immediately.
              </p>
            </article>
            <article>
              <span>Moons</span>
              <h3>Songs stay attached to meaning</h3>
              <p>
                When an artist is selected, songs orbit their artist as moons
                using album artwork.
              </p>
            </article>
            <article>
              <span>Regions</span>
              <h3>One artist, several affinities</h3>
              <p>
                An artist has one planet with several region affinities,
                avoiding misleading duplicates.
              </p>
            </article>
          </div>
          <p>
            Selecting an artist pauses the wider solar system while its songs
            continue moving. Selecting a song pauses that local moon system as
            well. Spotify links live in the details panel, leaving the chart
            focused on exploration.
          </p>
        </Chapter>

        <Chapter
          number="04"
          kicker="Technical architecture"
          title="How the data moves"
          id="data-flow"
        >
          <p>
            The frontend never asks Spotify to decide what belongs in the
            portrait. A small authored manifest is the source of meaning;
            catalogue data is optional enrichment. If Spotify is unavailable or
            the snapshot expires, the personal map remains intact.
          </p>
          <div
            className={styles.architecture}
            role="region"
            aria-label="Spotify catalogue architecture"
          >
            {architectureSteps.map((step, index) => (
              <div className={styles.architectureStep} key={step.label}>
                <span>{String(index + 1).padStart(2, "0")}</span>
                <strong>{step.label}</strong>
                <p>{step.detail}</p>
              </div>
            ))}
          </div>
          <p>
            Gatsby and React render the portrait. A protected Vercel Function
            uses Spotify&apos;s Client Credentials flow, validates the response
            and stores one current snapshot in private Blob storage. Artist and
            track IDs—not display names—join the two sources.
          </p>
        </Chapter>

        <Chapter number="05" kicker="Boundaries" title="Privacy and resilience">
          <p>
            No Spotify user account is connected, and the application does not
            read personal listening history. Visitors can explore the portrait
            without authentication or playback permissions.
          </p>
          <p>
            A candidate response must pass schema validation before it can
            replace the current snapshot. Failed refreshes leave the previous
            data intact, the snapshot expires after seven days and credentials
            remain server-side.
          </p>
        </Chapter>

        <Chapter
          number="06"
          kicker="Quality"
          title="Accessibility and verification"
        >
          <p>
            Every artist, song, region and relationship is keyboard-operable.
            Selection pauses the wider solar system, Escape restores focus and
            reduced-motion preferences make the atlas static. Text explains
            meaning that colour and movement alone cannot carry.
          </p>
          <p>
            Node tests and Playwright cover the content model, deterministic
            geometry, keyboard journeys, mobile layouts and unavailable
            catalogue states. Manifest validation and a production build
            complete the local verification gate.
          </p>
        </Chapter>

        <Chapter
          number="07"
          kicker="Honest scope"
          title="Limitations and next steps"
        >
          <p>
            The portrait is intentionally curated rather than inferred from
            private listening history. It does not calculate rankings, stream
            audio or require a Spotify login. Its next useful step is periodic
            catalogue refresh and continued editorial refinement as my listening
            changes.
          </p>
        </Chapter>

        <section
          className={`${styles.chapter} ${styles.learning}`}
          aria-labelledby="learning"
        >
          <div className={styles.chapterMarker} aria-hidden="true">
            08
          </div>
          <div>
            <p className={styles.kicker}>Reflection</p>
            <h2 id="learning">What I learned</h2>
            <p>
              The strongest version emerged when the API became supporting
              material rather than the concept itself. Separating authored
              meaning from catalogue enrichment made the interface more
              personal, the privacy boundary clearer and failure states safer.
            </p>
            <Link className={styles.primaryAction} to="/music/">
              Explore the portrait
            </Link>
          </div>
        </section>
      </article>
    </Layout>
  )
}

function Chapter({ number, kicker, title, id, children }) {
  const headingId = id || title.toLowerCase().replace(/[^a-z0-9]+/g, "-")
  return (
    <section id={id} className={styles.chapter} aria-labelledby={headingId}>
      <div className={styles.chapterMarker} aria-hidden="true">
        {number}
      </div>
      <div>
        <p className={styles.kicker}>{kicker}</p>
        <h2 id={headingId}>{title}</h2>
        {children}
      </div>
    </section>
  )
}

export const Head = ({ location }) => (
  <Seo
    title="Music Portrait case study"
    description="How Abdul Hakim Norazman designed and built an interactive music portrait with Gatsby, React and Spotify catalogue enrichment."
    pathname={location.pathname}
  />
)

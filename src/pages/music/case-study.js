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
            For the public authored portrait, that meant keeping editorial
            judgement separate from Spotify. I choose the artists, prominence,
            notes and connections; Spotify supplies catalogue names, links and
            artwork for those exact selections. The invited beta adds a second
            source: an owner&apos;s top-item evidence, shaped by their own saved
            choices.
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
            focused on exploration. A selected-song Spotify embed loads only
            after explicit selection, with no autoplay. Recent song arrivals
            appear as finite decorative shooting stars; reduced-motion
            preferences suppress them without hiding songs or controls.
          </p>
        </Chapter>

        <Chapter
          number="04"
          kicker="Technical architecture"
          title="How the data moves"
          id="data-flow"
        >
          <p>
            In the public authored portrait, a small manifest is the source of
            meaning; catalogue data is optional enrichment. If Spotify is
            unavailable or the snapshot expires, the personal map remains
            intact.
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
          <p>
            The beta uses deterministic evidence-to-snapshot generation. Ranked
            artists and tracks from three Spotify time windows produce stable
            sizes, regions and song selections. Inner waters favours current
            evidence; Familiar seas groups artists present in both medium and
            long windows; Outer reaches holds the remainder. These are map
            rules, not measurements of memory or creativity.
          </p>
          <p>
            The same shared renderer preserves Portrait 1&apos;s visual language
            while supporting 16–20 dynamic artists when evidence and pins allow;
            fewer appear when evidence is sparse. A stable seed keeps each
            artist&apos;s geometry reproducible. The private studio retains the
            complete set of saved choices, including choices for artists
            temporarily outside the map.
          </p>
          <p>
            Invite-only Spotify OAuth connects up to five owners. They generate
            a private draft, personalise pins, regions and notes, then
            explicitly publish an unlisted capability link. Weekly evolution and
            a manual refresh can update an existing shared portrait with saved
            choices; link regeneration also publishes the saved portrait and
            revokes the old link. Saving alone updates the private draft
            immediately.
          </p>
        </Chapter>

        <Chapter number="05" kicker="Boundaries" title="Privacy and resilience">
          <p>
            Browsing the authored portrait reads no visitor listening history.
            Invited owners grant user-top-read permission; their encrypted
            refresh credential stays on the server with private ranked evidence.
            Session and CSRF checks protect owner actions.
          </p>
          <p>
            A strict public allowlist excludes credentials and ranked evidence
            from shared snapshots. The unlisted route uses noindex and needs no
            viewer login; anyone with the link can view it. Unknown, revoked and
            deleted links receive a generic not-found page. See the{" "}
            <Link to="/privacy/">privacy information</Link> for what is shared.
          </p>
          <p>
            Owner deletion unpublishes the link and removes app-held beta data,
            with a retained deletion marker and possible manual recovery if
            storage cleanup fails. Spotify access and its Developer Dashboard
            allowlist are managed separately. Last-good snapshots survive failed
            refreshes. The authored catalogue snapshot expires after seven days;
            the beta retains its last successful portrait until deletion.
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
            Escape is scoped to the portrait so studio fields and outside links
            keep focus. Keyboard behaviour inside Spotify&apos;s cross-origin
            player belongs to that player and has not been verified here.
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
            Spotify supplies top-item windows rather than exact per-artist play
            counts or an artist&apos;s top-three songs. The beta&apos;s weighted
            selection is an interpretation of that evidence. It cannot promise a
            complete history or precise listening totals.
          </p>
          <p>
            Local tests use controlled provider responses. Deployed routing,
            OAuth, storage recovery, scheduled updates and real player behaviour
            still need staged preview verification and a real friend pilot.
            Returning-owner sign-in and reconnection are not currently
            supported. Physical-device and assistive-technology checks also
            remain to be done.
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
  const headingId = id
    ? `${id}-heading`
    : title.toLowerCase().replace(/[^a-z0-9]+/g, "-")
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

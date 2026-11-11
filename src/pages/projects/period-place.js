import React from "react"
import { Link } from "gatsby"
import Layout from "../../components/Layout"
import Seo from "../../components/Seo"
import { profile } from "../../data/cv"

const architecture = [
  "Official and partner sources",
  "Evidence-aware location records",
  "Map and postcode search",
  "Moderated community reports",
  "Visible coverage gaps",
]

const decisions = [
  "Show uncertainty instead of guessing",
  "Keep community reports moderated",
  "Preserve an audit history",
  "Measure adoption before expanding scope",
]

export default function PeriodPlacePage() {
  const linkedIn = profile.contacts.find(
    contact => contact.label === "LinkedIn",
  )

  return (
    <Layout wide world="projects">
      <article className="engineering-study">
        <div className="study-mastline">
          <Link to="/projects/">← All projects</Link>
          <span>Period Place / Product case study</span>
        </div>

        <header className="engineering-study__hero">
          <p className="engineering-study__eyebrow">
            Product engineering case study · Evidence-led public service
          </p>
          <h1>Building—and responsibly closing—a UK period-product finder</h1>
          <p className="engineering-study__disclosure">
            Shipped product · Measured launch · Archived after limited adoption
          </p>
          <p>
            Period Place helped people find free period products while making
            the quality and limits of its evidence clear. I built the service,
            launched it, tested its distribution and used the resulting data to
            decide when further investment was no longer justified.
          </p>
        </header>

        <nav className="study-index" aria-label="In this study">
          <a href="#context">
            <span>01</span> The problem
          </a>
          <a href="#system">
            <span>02</span> The product
          </a>
          <a href="#launch">
            <span>03</span> The launch
          </a>
          <a href="#decision">
            <span>04</span> The decision
          </a>
        </nav>

        <section className="engineering-study__intro" id="context">
          <div>
            <h2>Finding products should not require perfect information</h2>
            <p>
              Public provision is distributed across councils, charities and
              individual venues. Stock can change faster than official lists, so
              a useful finder has to distinguish confirmed coverage from recent
              community knowledge.
            </p>
          </div>
          <div>
            <h2>Evidence was part of the interface</h2>
            <p>
              Period Place exposed source strength and gaps instead of turning
              incomplete data into false certainty. Visitors could report a
              change, but contributions remained moderated before affecting the
              public record.
            </p>
          </div>
        </section>

        <section
          className="study-method"
          id="system"
          aria-label="Product architecture and decisions"
        >
          <p className="eyebrow">System / From source to useful guidance</p>
          <ol
            className="engineering-study__architecture"
            aria-label="Product flow"
          >
            {architecture.map(item => (
              <li key={item}>{item}</li>
            ))}
          </ol>
          <ul
            className="engineering-study__decisions"
            aria-label="Product decisions"
          >
            {decisions.map(item => (
              <li key={item}>{item}</li>
            ))}
          </ul>
        </section>

        <section
          className="engineering-study__evidence"
          aria-label="Product glimpse"
        >
          <section className="engineering-study__evidence-item">
            <div>
              <p className="engineering-study__label">Product glimpse</p>
              <h2>A clear route from need to evidence</h2>
              <p>
                The Next.js and TypeScript service combined MapLibre search with
                a Turso/libSQL data model, authenticated moderation and guarded
                operational workflows. The interface led with the immediate task
                while explaining what the underlying evidence could—and could
                not—confirm.
              </p>
            </div>
            <figure>
              <img
                src="/projects/period-place.webp"
                alt="Period Place homepage introducing its UK free period-product finder"
                width="1280"
                height="720"
                loading="lazy"
                decoding="async"
              />
              <figcaption>
                The shipped homepage framed free products and clear evidence as
                equal parts of the experience.
              </figcaption>
              <a
                className="engineering-study__evidence-link"
                href="/projects/period-place.webp"
                aria-label="Open full-size evidence: Period Place homepage"
                target="_blank"
                rel="noreferrer"
              >
                Open full-size evidence
              </a>
            </figure>
          </section>
        </section>

        <section className="engineering-study__intro" id="launch">
          <div>
            <h2>The launch produced measurable use, not sustained adoption</h2>
            <p>
              Across the measured 28-day launch window, the service recorded 48
              visitors and 89 pageviews. The finder received 22 visitors and 28
              views; location-detail pages received 6 visitors and 10 views.
            </p>
          </div>
          <div>
            <h2>Discovery remained weak</h2>
            <p>
              Google Search Console recorded 6 impressions and no clicks.
              Outreach produced useful data-source conversations, but no
              verified durable referral placement. One unverified feedback
              submission asked how the information was gathered; it did not
              establish repeat use.
            </p>
          </div>
        </section>

        <section className="engineering-study__limitations">
          <h2>What the numbers do not prove</h2>
          <p>
            The service was reliable, but organic reach was incomplete: only 4
            pages were indexed, 8 were unindexed, and the sitemap omitted
            location-detail pages. The launch therefore did not prove that the
            underlying need was absent. It showed that the current product and
            distribution approach had not earned enough use to justify another
            development cycle.
          </p>
        </section>

        <section id="decision">
          <h2>Stopping was a product decision</h2>
          <p>
            I chose to archive the service rather than add speculative features
            to weak adoption. The code and launch evidence remain useful, but
            hosting and operational attention can be reclaimed while this static
            case study preserves the work for review.
          </p>
        </section>

        <section className="engineering-study__downstream">
          <h2>What I would carry forward</h2>
          <p>
            Validate a durable distribution route earlier, treat indexing as a
            launch dependency and set an adoption threshold before expanding a
            public-service product. Technical reliability is necessary, but it
            is not evidence of product traction.
          </p>
        </section>

        <section className="engineering-study__closing">
          <h2>Good product judgement includes knowing when to stop.</h2>
          <div>
            <Link
              className="project-button project-button--primary"
              to="/experience/"
            >
              View experience
            </Link>{" "}
            <a
              className="project-button project-button--secondary"
              href={linkedIn.href}
              target="_blank"
              rel="noreferrer"
            >
              Connect on LinkedIn
            </a>
          </div>
        </section>
      </article>
    </Layout>
  )
}

export const Head = ({ location }) => (
  <Seo
    title="Period Place Product Case Study"
    description="A product engineering case study about building, launching, measuring and responsibly closing a UK free period-product finder."
    pathname={location.pathname}
  />
)

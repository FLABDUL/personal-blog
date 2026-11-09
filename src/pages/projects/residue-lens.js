import React from "react"
import { Link } from "gatsby"
import Layout from "../../components/Layout"
import Seo from "../../components/Seo"
import { profile } from "../../data/cv"

const architecture = [
  "Official programme files",
  "Python import and validation",
  "Programme-aware dataset",
  "Next.js comparison",
  "Local or optional synced shortlist",
]

const decisions = [
  "Keep programmes and years separate",
  "Show sample sizes",
  "Explain MRLs carefully",
  "Make no medical safety claims",
]

const evidence = [
  {
    id: "framing",
    eyebrow: "Product decision 01",
    title: "Start with a household question",
    body: "The interface began with the decision a shopper was trying to make, while keeping the underlying evidence close enough to inspect. It deliberately avoided turning a detected residue into a claim that a food was unsafe.",
    image: "/projects/residue-lens.webp",
    width: 1280,
    height: 720,
    alt: "Residue Lens homepage asking which foods may be worth buying organic",
    caption:
      "The public homepage framed the product around an ordinary shopping decision and linked directly to the evidence and methodology.",
  },
  {
    id: "comparison",
    eyebrow: "Product decision 02",
    title: "Keep context attached to every number",
    body: "People could change the foods and the question being compared. Results retained the programme, year and sample size, and unlike monitoring programmes were not pooled into a single reassuring-looking score.",
    image: "/projects/residue-lens/comparison.png",
    width: 1080,
    height: 1350,
    alt: "Residue Lens comparison showing grapes, broccoli and garlic alongside sample-aware monitoring results",
    caption:
      "A live comparison from the validation period. The priority labels described monitoring patterns, not health risk or nutritional value.",
  },
]

export default function ResidueLensPage() {
  const linkedIn = profile.contacts.find(
    contact => contact.label === "LinkedIn",
  )

  return (
    <Layout wide world="projects">
      <article className="engineering-study">
        <div className="study-mastline">
          <Link to="/projects/">← All projects</Link>
          <span>Residue Lens / Product study</span>
        </div>

        <header className="engineering-study__hero">
          <p className="engineering-study__eyebrow">
            Product case study · Public-interest data
          </p>
          <h1>
            Turning pesticide monitoring into a careful shopping comparison
          </h1>
          <p className="engineering-study__disclosure">
            Validation concluded · November 2026
          </p>
          <p>
            I designed, built and launched Residue Lens to help shoppers compare
            official pesticide-monitoring results without turning detection data
            into a health claim. I concluded active development when the
            validation period did not show enough sustained use or feedback to
            justify operating the full service.
          </p>
        </header>

        <nav className="study-index" aria-label="In this study">
          <a href="#context">
            <span>01</span> The problem
          </a>
          <a href="#method">
            <span>02</span> The evidence model
          </a>
          <a href="#framing">
            <span>03</span> The product
          </a>
          <a href="#decision">
            <span>04</span> The decision
          </a>
        </nav>

        <section className="engineering-study__intro" id="context">
          <div>
            <h2>Official data is useful but easy to misread</h2>
            <p>
              A residue detection, an exceedance of a maximum residue level and
              evidence of harm are different things. Programme coverage, sample
              size and reporting year also affect what a comparison can support.
            </p>
          </div>
          <div>
            <h2>The job was context, not alarm</h2>
            <p>
              Residue Lens translated monitoring results into a practical
              interface while preserving the route back to methodology, sources
              and limitations. It supported a shopping judgement rather than
              presenting medical advice.
            </p>
          </div>
        </section>

        <section
          className="study-method"
          id="method"
          aria-label="Architecture and evidence decisions"
        >
          <p className="eyebrow">System / From source file to comparison</p>
          <ol
            className="engineering-study__architecture"
            aria-label="Architecture flow"
          >
            {architecture.map(item => (
              <li key={item}>{item}</li>
            ))}
          </ol>
          <ul
            className="engineering-study__decisions"
            aria-label="Evidence decisions"
          >
            {decisions.map(item => (
              <li key={item}>{item}</li>
            ))}
          </ul>
        </section>

        <section className="engineering-study__evidence" aria-label="Product">
          {evidence.map(item => (
            <section
              className="engineering-study__evidence-item"
              key={item.id}
              id={item.id}
            >
              <div>
                <p className="engineering-study__label">{item.eyebrow}</p>
                <h2>{item.title}</h2>
                <p>{item.body}</p>
              </div>
              <figure>
                <img
                  src={item.image}
                  alt={item.alt}
                  width={item.width}
                  height={item.height}
                  loading="lazy"
                  decoding="async"
                />
                <figcaption>{item.caption}</figcaption>
                <a
                  className="engineering-study__evidence-link"
                  href={item.image}
                  aria-label={`Open full-size evidence: ${item.title}`}
                  target="_blank"
                  rel="noreferrer"
                >
                  Open full-size evidence
                </a>
              </figure>
            </section>
          ))}
        </section>

        <section id="decision">
          <h2>Validation changed the product decision</h2>
          <p>
            The public launch generated visibility, but much of the headline
            traffic was automated crawling. Search Console recorded 904
            impressions and eight organic clicks by 7 November 2026, while
            direct outreach produced no substantive product feedback or live
            customers. Reach did not become evidence of continuing demand.
          </p>
        </section>

        <dl className="study-results" aria-label="Validation snapshot">
          <div>
            <dt>Search impressions</dt>
            <dd>904</dd>
          </div>
          <div>
            <dt>Organic clicks</dt>
            <dd>8</dd>
          </div>
          <div>
            <dt>Live customers</dt>
            <dd>0</dd>
          </div>
          <div>
            <dt>Substantive feedback</dt>
            <dd>0</dd>
          </div>
        </dl>

        <section className="engineering-study__limitations">
          <h2>What the comparison did not claim</h2>
          <p>
            Residue Lens was not a food-safety rating, toxicity model, medical
            recommendation or instruction to buy organic. Monitoring programmes
            were not pooled across unlike regions and years, and small samples
            remained visible rather than being hidden behind a universal score.
          </p>
        </section>

        <section>
          <h2>Stopping was part of the product work</h2>
          <p>
            The final decision was to preserve the design, data pipeline and
            lessons as a case study, while retiring the authentication, database
            and payment-test infrastructure. That keeps the useful engineering
            evidence without maintaining a service whose demand was not proven.
          </p>
        </section>

        <section className="engineering-study__closing">
          <h2>A useful experiment still needs a stopping rule.</h2>
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
    title="Residue Lens Product Case Study"
    description="How Residue Lens turned official pesticide-monitoring results into a careful shopping comparison, and what its public validation revealed."
    pathname={location.pathname}
  />
)

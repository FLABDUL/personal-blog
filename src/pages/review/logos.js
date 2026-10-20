import React from "react"
import { Link } from "gatsby"
import Layout from "../../components/Layout"
import Seo from "../../components/Seo"
import * as styles from "./logos.module.css"

const concepts = [
  {
    id: "jade-signature",
    letter: "A",
    title: "Jade Signature",
    verdict: "Quietest / The name as a signature",
    description:
      "Your Arabic name leads, drawn in flowing jade-green strokes above a small English wordmark. The open composition feels personal and sits naturally beside the writing and paintings.",
    tradeoff:
      "The most restrained option. It carries the green and Arabic direction with very little decoration; the fine strokes and paired dots need care at small sizes.",
    alt: "A: حكيم in flowing jade-green Arabic lettering above made by hakim, with two smaller wordmark studies",
    height: 853,
  },
  {
    id: "structured-script",
    letter: "B",
    title: "Structured Script",
    verdict: "Architectural / A precise maker’s mark",
    description:
      "The same name becomes a continuous geometric wordmark in deep forest green. A fine brass rule separates it from the English name. The strong horizontal rhythm brings the engineering side of the portfolio forward.",
    tradeoff:
      "The boldest silhouette, with the least pen-like warmth. The geometric letterforms need a final Arabic typography proof before becoming a finished identity.",
    alt: "B: حكيم in connected geometric forest-green Arabic lettering beside Made by Hakim, separated by a brass rule",
    height: 853,
  },
  {
    id: "woven-roots",
    letter: "C",
    title: "Woven Roots",
    verdict: "Recommended / The strongest link to your brief",
    description:
      "Green Arabic lettering sits above an original brass-coloured border inspired by Malaysian songket. The stepped triangles and diamonds bring a textile rhythm to the identity while keeping your name at the centre.",
    tradeoff:
      "The richest connection to your Malaysian roots. Keep the border for larger settings and use the plain wordmark in the masthead; a small favicon would need its own carefully drawn treatment.",
    alt: "C: حكيم in rainforest-green Arabic lettering above made by hakim, with a gold geometric woven border and two plain wordmark studies",
    height: 853,
  },
]

export default function LogosPage() {
  return (
    <Layout wide world="review">
      <Link className="back-link" to="/review/">
        ← Back to design review
      </Link>
      <header className="review-heading">
        <p className="eyebrow">Identity study / Round two / Preview only</p>
        <h1>
          A name. <br />A sense of belonging.
        </h1>
        <p>
          Three new directions, centred on your Malaysian roots, the green you
          associate with Islam, and your Arabic name. These replace the earlier
          monogram and flower proposals. The current site logo stays in place
          while you choose.
        </p>
        <p className={styles.nameProof}>
          <span lang="ar" dir="rtl">
            حكيم
          </span>
          <span>Hakim · Your confirmed personal name, without a prefix.</span>
        </p>
        <nav className={styles.index} aria-label="Logo concepts">
          {concepts.map(concept => (
            <a key={concept.id} href={`#${concept.id}`}>
              {concept.letter} / {concept.title}
            </a>
          ))}
        </nav>
      </header>
      <div>
        {concepts.map((concept, index) => (
          <section
            className={styles.concept}
            id={concept.id}
            key={concept.id}
            aria-labelledby={`${concept.id}-title`}
          >
            <div>
              <p className="eyebrow">
                {concept.letter} / {concept.verdict}
              </p>
              <h2 id={`${concept.id}-title`}>{concept.title}</h2>
              <p>{concept.description}</p>
              <p className={styles.tradeoff}>{concept.tradeoff}</p>
              <a href={`/review/logos/${concept.id}.webp`}>
                Open concept {concept.letter} at full size ↗
              </a>
            </div>
            <figure>
              <img
                src={`/review/logos/${concept.id}.webp`}
                alt={concept.alt}
                width="1280"
                height={concept.height}
                loading={index === 0 ? "eager" : "lazy"}
              />
              <figcaption>
                Concept {concept.letter} · Arabic wordmark and smaller studies
              </figcaption>
            </figure>
          </section>
        ))}
      </div>
      <aside className={styles.note}>
        <h2>A direction to choose, then refine.</h2>
        <p>
          These are AI-generated identity concepts, created for this review. The
          chosen direction would next receive a final Arabic lettering proof and
          a crisp vector redraw, with dedicated light, dark and favicon
          versions. None has been installed as the final identity.
        </p>
        <p>
          The woven border is an original interpretation, not a copied textile.
          Its craft reference is{" "}
          <a href="https://ich.unesco.org/en/RL/songket-01505">
            Malaysian songket and its geometric and nature-inspired patterns
          </a>
          .
        </p>
        <Link to="/music/">See the updated Music Portrait ↗</Link>
      </aside>
    </Layout>
  )
}

export const Head = ({ location }) => (
  <Seo
    title="Logo concepts — preview only"
    pathname={location.pathname}
    noIndex
  />
)

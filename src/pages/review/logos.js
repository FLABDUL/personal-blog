import React from "react"
import { Link } from "gatsby"
import Layout from "../../components/Layout"
import Seo from "../../components/Seo"
import * as styles from "./logos.module.css"

const concepts = [
  {
    id: "courtyard-grid",
    letter: "A",
    title: "Courtyard Grid",
    verdict: "Geometric / Precise and interlaced",
    description:
      "An H appears in the open centre of a jade lattice. Interlocking ribbons turn the geometry into a personal initial, paired with confident, widely spaced lettering.",
    tradeoff:
      "A strong square emblem for the engineering side of the portfolio. The narrow crossings need simplifying at favicon size; it is the most formal of the five.",
    alt: "A: a jade interlaced geometric emblem with a white H at its centre, beside MADE BY HAKIM",
    height: 853,
  },
  {
    id: "hibiscus-imprint",
    letter: "B",
    title: "Hibiscus Imprint",
    verdict: "Botanical / Colourful and expressive",
    description:
      "A coral hibiscus and deep-green leaves sweep into a lively silhouette beside a sculpted lowercase name. It brings the garden, colour and handmade character to the foreground.",
    tradeoff:
      "The most personal botanical direction. Its fine veins and long stamen need a simpler small-size version; the full flower is better for a larger signature.",
    alt: "B: a coral hibiscus with green stem and leaves beside a bold lowercase made by hakim wordmark",
    height: 853,
  },
  {
    id: "blue-vine",
    letter: "C",
    title: "Blue Vine",
    verdict: "Typographic / The name becomes the ornament",
    description:
      "Hakim becomes a cobalt-blue vine, with curling leaves growing from the first and last strokes and a small flower over the i. The lettering carries the identity without a separate emblem.",
    tradeoff:
      "The clearest departure from the earlier proposals. Its long flourishes need shortening in navigation; the H-and-leaf study suggests a compact companion mark.",
    alt: "C: the name Hakim in flowing cobalt lettering with leaf flourishes and a flower above the i",
    height: 853,
  },
  {
    id: "petal-portal",
    letter: "D",
    title: "Petal Portal",
    verdict: "Abstract / The simplest silhouette",
    description:
      "Two broad petals make a small opening between them. Forest green and terracotta bring warmth to an abstract mark that can suggest a flower, a threshold or a quiet H rhythm.",
    tradeoff:
      "The strongest starting point for a small icon. Its connection to your name and the art reference is less explicit, so it needs the wordmark beside it while becoming familiar.",
    alt: "D: two simple green and terracotta petals forming an arched opening above made by hakim",
    height: 853,
  },
  {
    id: "night-garden",
    letter: "E",
    title: "Night Garden",
    verdict: "Illuminated / Closest to the ornate reference",
    description:
      "A ring of gold and jade flowers surrounds your Arabic name on deep green. The illuminated composition puts ornamental craft at the centre of the identity.",
    tradeoff:
      "The richest visual world, but the least practical unchanged at small sizes. Treat this as a larger signature and simplify the floral H study for navigation and the favicon.",
    alt: "E: حكيم inside an ivory medallion surrounded by gold and jade flowers on deep green, above Made by Hakim",
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
        <p className="eyebrow">Identity study / Round three / Preview only</p>
        <h1>
          Five directions. <br />A wider imagination.
        </h1>
        <p>
          Geometry, flowers, flowing letters, a simple symbol and an illuminated
          garden. Five deliberately different ways to bring your name and the
          art you are drawn to together. These replace the earlier proposals;
          the current site logo stays in place while you choose.
        </p>
        <p className={styles.nameProof}>
          <span lang="ar" dir="rtl">
            حكيم
          </span>
          <span>
            Only concept E uses Arabic: your confirmed name, without a prefix.
          </span>
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
                Concept {concept.letter} · Identity and smaller studies
              </figcaption>
            </figure>
          </section>
        ))}
      </div>
      <aside className={styles.note}>
        <h2>A direction to choose, then refine.</h2>
        <p>
          These are AI-generated identity concepts, created for this review. The
          chosen direction would next receive a crisp vector redraw, small-size
          simplification and dedicated light, dark and favicon versions. Concept
          E also needs a final Arabic lettering proof. None has been installed
          as the final identity.
        </p>
        <p>
          The reference is the interplay of{" "}
          <a href="https://www.metmuseum.org/fr/essays/geometric-patterns-in-islamic-art">
            geometric
          </a>{" "}
          and{" "}
          <a href="https://www.metmuseum.org/es/essays/vegetal-patterns-in-islamic-art">
            vegetal ornament in Islamic art
          </a>
          . All five are original interpretations. No artwork or inscription
          from the supplied search screenshot was copied.
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

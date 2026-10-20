import React from "react"
import { Link } from "gatsby"
import Layout from "../../components/Layout"
import Seo from "../../components/Seo"
import * as styles from "./logos.module.css"

const concepts = [
  {
    id: "editorial-monogram",
    letter: "A",
    title: "The editorial monogram",
    verdict: "Recommended / Closest to the selected direction",
    description:
      "A refined m/h seal beside a generous serif wordmark. It connects naturally with the editorial About and exhibition Studio, and keeps the recognisable initials already in the masthead.",
    tradeoff:
      "The finest strokes need simplifying for a tiny favicon. This is the most elegant, least disruptive evolution.",
    alt: "A: a circular serif m slash h monogram beside Made by Hakim, with three smaller monogram proofs",
    height: 853,
  },
  {
    id: "makers-ligature",
    letter: "B",
    title: "The maker’s ligature",
    verdict: "Bolder / Strongest compact mark",
    description:
      "A continuous, softly geometric mh joins the two initials. The heavier silhouette feels practical and contemporary, bringing the software and making sides of the portfolio forward.",
    tradeoff:
      "The compact shape has presence at small sizes, but the joined letters are more abstract. It moves furthest from the current editorial identity.",
    alt: "B: a bold joined lowercase mh mark beside Made by Hakim in a rounded sans serif, with three smaller mark proofs",
    height: 720,
  },
  {
    id: "printers-flower",
    letter: "C",
    title: "The printer’s flower",
    verdict: "Artistic / An independent imprint",
    description:
      "Four ink-like petals gather around a small centre. Paired with a warm lowercase wordmark, it feels like the imprint of an art book: personal, tactile and at home beside the paintings and writing.",
    tradeoff:
      "The symbol is less directly connected to your name. It is the most expressive choice, but needs the wordmark alongside it while the identity becomes familiar.",
    alt: "C: four dark leaf-shaped petals forming a printer’s flower beside lowercase made by hakim, with three smaller symbol proofs",
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
        <p className="eyebrow">
          Identity study / Preview only / Awaiting your choice
        </p>
        <h1>
          Three ways <br />
          to leave a mark.
        </h1>
        <p>
          One name, three different signatures. Each is shown in a single ink so
          the shape and typography can do the talking. The current site logo
          stays in place while you choose.
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
                Concept {concept.letter} · Wordmark and small-mark explorations
              </figcaption>
            </figure>
          </section>
        ))}
      </div>
      <aside className={styles.note}>
        <h2>A direction to choose, then refine.</h2>
        <p>
          These are AI-generated identity concepts, created for this review. The
          chosen direction would next be redrawn as a crisp vector logo, with
          dedicated light, dark and favicon versions. None has been installed as
          the final identity.
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

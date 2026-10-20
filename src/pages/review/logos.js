import React from "react"
import { Link } from "gatsby"
import Layout from "../../components/Layout"
import Seo from "../../components/Seo"
import * as styles from "./logos.module.css"

const concepts = [
  {
    id: "botanical-seal",
    letter: "A",
    title: "Botanical Seal",
    verdict: "Restrained / Closest to the original monogram",
    description:
      "The familiar circular m/h gains a small gold-and-green branch along its edge. The open space, slash and calm English typography remain the focus.",
    tradeoff:
      "My first choice for everyday website use. Keep the full branch at larger sizes and use the plain monogram where the finer leaves would disappear.",
    alt: "A: a green circular m slash h monogram with a small gold and jade flowering branch, beside Made by Hakim",
    height: 853,
  },
  {
    id: "illuminated-monogram",
    letter: "B",
    title: "Illuminated Monogram",
    verdict: "Rich / The two favourites combined directly",
    description:
      "The m/h sits inside Night Garden’s floral language, with ivory lettering on deep green. Four tulips and a lighter leaf ring connect the ornate emblem to the editorial name.",
    tradeoff:
      "The richest fusion of your two references. It works as a larger signature; the plain circle or simplified outline should take over in a small masthead or favicon.",
    alt: "B: an ivory m slash h monogram surrounded by gold and jade tulips on deep green beside Made by Hakim",
    height: 853,
  },
  {
    id: "garden-slash",
    letter: "C",
    title: "Garden Slash",
    verdict: "Inventive / The divider becomes a stem",
    description:
      "The circle disappears and the diagonal slash becomes a flowering stem between the m and h. Ornament becomes part of the monogram’s construction rather than a frame around it.",
    tradeoff:
      "My alternative to A if you want a more distinctive signature. A final drawing should simplify the bud and keep the two letters clearly separated at small sizes.",
    alt: "C: an open green m slash h monogram with the slash drawn as a gold flowering stem, beside Made by Hakim",
    height: 853,
  },
  {
    id: "twin-script",
    letter: "D",
    title: "Twin Script",
    verdict: "Bilingual / A lighter Arabic seal",
    description:
      "Your Arabic name sits in a spacious ring with four small floral accents, paired with the English wordmark. It keeps the personal name from Night Garden while borrowing the first reference’s restraint.",
    tradeoff:
      "The clearest bilingual direction. The Arabic lettering needs final professional proof, and the small emblem needs fewer petal details before becoming a finished logo.",
    alt: "D: حكيم inside a thin gold floral ring beside the English Made by Hakim wordmark",
    height: 853,
  },
  {
    id: "floral-initial",
    letter: "E",
    title: "Floral Initial",
    verdict: "Compact / Ornament grows into the letter",
    description:
      "A single serif H becomes the structure for a gold vine and jade tulip. The large initial and English wordmark share the same typographic character.",
    tradeoff:
      "A useful compact direction if you prefer one initial to m/h. The tall flower should shorten in navigation, with a simpler two-leaf version for tiny uses.",
    alt: "E: a green serif H entwined with a gold and jade flowering vine beside Made by Hakim",
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
          Identity study / Combining your favourites / Preview only
        </p>
        <h1>
          A little ornament. <br />A familiar signature.
        </h1>
        <p>
          Five permutations of the two directions you prefer: the restrained
          editorial monogram and the green-and-gold Night Garden. Each keeps the
          calm typography and explores a different amount of floral detail. The
          current site logo stays in place while you choose.
        </p>
        <p>
          Your references:{" "}
          <a href="/review/logos/editorial-monogram.webp">
            the editorial monogram
          </a>{" "}
          and <a href="/review/logos/night-garden.webp">Night Garden</a>.
        </p>
        <p className={styles.nameProof}>
          <span lang="ar" dir="rtl">
            حكيم
          </span>
          <span>
            Only concept D uses Arabic: your confirmed name, without a prefix.
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
          D also needs a final Arabic lettering proof. None has been installed
          as the final identity.
        </p>
        <p>
          These variations were generated from your two preferred concepts, both
          created during this design review. The changes are in the lettering,
          floral structure and balance of ornament; no external artwork or
          sacred inscription has been added.
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

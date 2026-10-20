import React from "react"
import { Link } from "gatsby"
import Layout from "../../components/Layout"
import Seo from "../../components/Seo"

export default function ReviewPage() {
  return (
    <Layout wide world="review">
      <header className="review-heading">
        <p className="eyebrow">Design review / Experimental preview</p>
        <h1>
          One collection.
          <br />A direction chosen.
        </h1>
        <p>
          The editorial About and exhibition Studio are the selected direction.
          Light and dark themes and the engineering studies extend that design.
          The earlier alternatives remain here for reference. Nothing here
          changes the live site.
        </p>
        <p className="text-actions">
          <Link to="/review/logos/">
            Revised: compare three logo concepts ↗
          </Link>
          <Link to="/music/">Explore the updated Music Portrait ↗</Link>
        </p>
      </header>
      <div className="review-options">
        <Link className="review-option" to="/">
          <div className="review-preview">
            <span>
              Software,
              <br />
              art &amp; the
              <br />
              <em>
                spaces
                <br />
                between.
              </em>
            </span>
            <img
              src="/design/portrait.webp"
              alt="Portrait in the editorial About treatment"
              width="640"
              height="800"
            />
          </div>
          <div>
            <p className="eyebrow">A / Integrated candidate / Selected</p>
            <h2>Collected Works</h2>
            <p>
              An editorial entrance and distinct settings for each discipline. A
              journal for writing, a workbench for software, a ledger for
              experience and a dark exhibition for paintings.
            </p>
            <span className="review-option__action">
              Explore the complete candidate ↗
            </span>
          </div>
        </Link>
        <Link className="review-option" to="/review/about-table/">
          <div className="review-preview review-preview--table">
            <img
              src="/design/art/furl.webp"
              alt="furl painting"
              width="300"
              height="300"
            />
            <img
              src="/books/dune.jpg"
              alt="Dune cover"
              width="200"
              height="300"
            />
            <img
              src="/design/portrait.webp"
              alt="Portrait"
              width="240"
              height="300"
            />
          </div>
          <div>
            <p className="eyebrow">B / About alternative / Not selected</p>
            <h2>The specimen table</h2>
            <p>
              A more playful entrance built from things already in the
              collection. Links become labelled objects; the biography remains
              direct. More discovery, less immediate professional emphasis.
            </p>
            <span className="review-option__action">
              Try the alternative About ↗
            </span>
          </div>
        </Link>
        <Link className="review-option" to="/review/studio-daylight/">
          <div className="review-preview review-preview--salon">
            <img
              src="/design/art/abyss.webp"
              alt="abyss"
              width="240"
              height="300"
            />
            <img
              src="/design/art/agony.webp"
              alt="agony"
              width="240"
              height="300"
            />
            <img
              src="/design/art/furl.webp"
              alt="furl"
              width="300"
              height="300"
            />
          </div>
          <div>
            <p className="eyebrow">C / Studio alternative / Not selected</p>
            <h2>The daylight salon</h2>
            <p>
              All nine paintings share a warm, light wall. A faster overview
              with less theatrical pacing. Open any painting to test the same
              close-viewing interaction as the candidate.
            </p>
            <span className="review-option__action">
              Visit the alternative Studio ↗
            </span>
          </div>
        </Link>
      </div>
      <section className="review-notes">
        <h2>The selected direction</h2>
        <p>
          <strong>About:</strong> keep the direct editorial opening, portrait
          and painting detail.
        </p>
        <p>
          <strong>Studio:</strong> keep the exhibition layout, varied scale and
          close-viewing interaction. The Light button changes the palette while
          preserving this selected composition.
        </p>
        <p>
          <strong>Across the site:</strong> the masthead, type, numbering and
          measured motion provide continuity. The palette and layout change with
          the content.
        </p>
        <p>
          The alternatives and this review ribbon are controlled by one review
          switch and are excluded from production builds. This remains a preview
          for a separate release review, which has not started.
        </p>
        <div className="text-actions">
          <Link to="/studio/">Compare the selected Studio ↗</Link>
          <Link to="/projects/">Inspect Projects ↗</Link>
          <Link to="/projects/budget-v2/">Budget V2 study ↗</Link>
          <Link to="/projects/backtest-library/">Backtest Library study ↗</Link>
        </div>
      </section>
    </Layout>
  )
}
export const Head = ({ location }) => (
  <Seo
    title="Design review — preview only"
    pathname={location.pathname}
    noIndex
  />
)

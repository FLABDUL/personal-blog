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
          <br />
          Three ways to see it.
        </h1>
        <p>
          A complete candidate, with two focused alternatives for the decisions
          that change the character of the site most. These are working pages.
          Nothing here changes the live site.
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
            <p className="eyebrow">A / Integrated candidate / Recommended</p>
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
            <p className="eyebrow">B / About alternative</p>
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
            <p className="eyebrow">C / Studio alternative</p>
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
        <h2>What to decide</h2>
        <p>
          <strong>About:</strong> does the direct editorial opening feel like
          you, or does the object-led table invite a better first encounter?
        </p>
        <p>
          <strong>Studio:</strong> do the paintings benefit more from the space
          and contrast of the dark exhibition, or the ease of comparing them in
          daylight?
        </p>
        <p>
          <strong>Across the site:</strong> the masthead, type, numbering and
          measured motion provide continuity. The palette and layout change with
          the content.
        </p>
        <p>
          The alternatives and this review ribbon are controlled by one review
          switch and are excluded from production builds. This remains a preview
          for your decision.
        </p>
        <div className="text-actions">
          <Link to="/studio/">Compare the selected Studio ↗</Link>
          <Link to="/projects/">Inspect Projects ↗</Link>
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

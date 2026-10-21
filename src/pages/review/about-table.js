import React from "react"
import { Link } from "gatsby"
import Layout from "../../components/Layout"
import Seo from "../../components/Seo"
import AboutStory from "../../components/AboutStory"

export default function AboutTable() {
  return (
    <Layout wide world="review">
      <div className="concept-strip">
        <strong>Alternative B / About / The specimen table</strong>
        <Link to="/review/">← Back to design review</Link>
        <Link to="/">Compare selected About ↗</Link>
      </div>
      <header className="specimen-header">
        <p className="eyebrow">Abdul Hakim Norazman</p>
        <h1>
          A few things
          <br />
          <em>I spend time with.</em>
        </h1>
        <p>
          Software, paintings, books and music. Pick something up, follow a
          thread, or start with the person behind the collection.
        </p>
      </header>
      <section className="specimen-table" aria-label="Explore the collection">
        <Link to="/projects/" className="specimen-object">
          <img
            src="/projects/residue-lens.webp"
            alt="Residue Lens public product"
            width="450"
            height="280"
          />
          <strong>Things I build ↗</strong>
          <span>Independent software &amp; open-source work</span>
        </Link>
        <Link to="/studio/" className="specimen-object">
          <img
            src="/design/art/furl.webp"
            alt="furl"
            width="300"
            height="300"
          />
          <strong>Things I paint ↗</strong>
          <span>Nine paintings in the Studio</span>
        </Link>
        <Link to="/bookshelf/" className="specimen-object">
          <img
            src="/books/dune.jpg"
            alt="Dune by Frank Herbert"
            width="200"
            height="300"
          />
          <strong>Things I read ↗</strong>
          <span>Browse the bookshelf</span>
        </Link>
        <Link to="/blog/" className="specimen-object specimen-object--text">
          <span>Notes from the journal</span>
          <strong>
            The Walk
            <br />I Keep Missing
          </strong>
          <span>Writing about noticing, learning and making ↗</span>
        </Link>
        <a href="#about-story-title" className="specimen-object">
          <img
            src="/design/portrait.webp"
            alt="Abdul Hakim Norazman"
            width="240"
            height="300"
          />
          <strong>A little about me ↓</strong>
          <span>Engineer, maker, electric-guitar player</span>
        </a>
        <Link to="/music/" className="specimen-object specimen-object--text">
          <span>A personal music atlas</span>
          <strong>
            Inner waters.
            <br />
            Familiar seas.
            <br />
            Outer reaches.
          </strong>
          <span>Explore the listening room ↗</span>
        </Link>
      </section>
      <AboutStory />
      <div className="text-actions">
        <Link to="/experience/">Follow the career record ↗</Link>
        <Link to="/review/">Return to the review hub ↗</Link>
      </div>
    </Layout>
  )
}
export const Head = ({ location }) => (
  <Seo
    title="Alternative About — specimen table"
    pathname={location.pathname}
    noIndex
  />
)

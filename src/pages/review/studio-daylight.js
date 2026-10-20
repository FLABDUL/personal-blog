import React from "react"
import { Link } from "gatsby"
import Layout from "../../components/Layout"
import Seo from "../../components/Seo"
import StudioCollection from "../../components/StudioCollection"

export default function StudioDaylight() {
  return (
    <Layout wide world="salon">
      <div className="concept-strip">
        <strong>Alternative C / Studio / The daylight salon</strong>
        <Link to="/review/">← Back to design review</Link>
        <Link to="/studio/">Compare selected Studio ↗</Link>
      </div>
      <header className="salon-header">
        <div>
          <p className="eyebrow">Paintings by Abdul Hakim Norazman</p>
          <h1>
            A little
            <br />
            <em>more light.</em>
          </h1>
        </div>
        <p>
          Nine paintings, together on one wall. Take in the collection, then
          open a work to see its colour and texture up close.
        </p>
      </header>
      <StudioCollection variant="salon" />
      <section className="review-notes">
        <h2>Same work. Different atmosphere.</h2>
        <p>
          This alternative trades the candidate’s slower, individual encounters
          for a compact view of the whole collection. No artwork, title or
          attribution has changed.
        </p>
        <Link to="/studio/">Walk through the dark exhibition ↗</Link>
      </section>
    </Layout>
  )
}
export const Head = ({ location }) => (
  <Seo
    title="Alternative Studio — daylight salon"
    pathname={location.pathname}
    noIndex
  />
)

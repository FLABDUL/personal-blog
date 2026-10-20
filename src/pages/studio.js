import React from "react"
import Layout from "../components/Layout"
import Seo from "../components/Seo"
import StudioCollection from "../components/StudioCollection"

export default function StudioPage() {
  return (
    <Layout wide world="studio">
      <header className="studio-header">
        <div>
          <p className="eyebrow">Made by hand / A collection of paintings</p>
          <h1>
            Studio<span aria-hidden="true">.</span>
          </h1>
        </div>
        <p>
          A different kind
          <br />
          of making.
        </p>
      </header>
      <StudioCollection />
      <div className="studio-end">
        <span aria-hidden="true">m/h</span>
        <p>Thank you for taking a look.</p>
        <a href="#main-content">Back to the beginning ↑</a>
      </div>
    </Layout>
  )
}
export const Head = ({ location }) => (
  <Seo
    title="Studio"
    description="Paintings by Abdul Hakim Norazman. Explore the collection and view each work in detail."
    pathname={location.pathname}
  />
)

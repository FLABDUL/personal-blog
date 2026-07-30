import React from "react"
import { Link } from "gatsby"
import Layout from "../components/Layout"

export default function NotFoundPage() {
  return (
    <Layout>
      <p className="cv-eyebrow">404</p>
      <h1>Page not found</h1>
      <p>
        That page does not exist, or it may have moved as the site has evolved.
      </p>
      <p>
        <Link to="/">Return to the homepage</Link> or{" "}
        <Link to="/experience/">read my full career record</Link>.
      </p>
    </Layout>
  )
}

export const Head = () => (
  <>
    <title>Page not found | Abdul Hakim Norazman</title>
    <meta name="robots" content="noindex" />
  </>
)

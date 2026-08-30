import React, { useEffect } from "react"
import { Link, navigate } from "gatsby"
import Layout from "../components/Layout"
import Seo from "../components/Seo"

export default function ProjectsPage() {
  useEffect(() => {
    navigate("/experience/#engineering-work", { replace: true })
  }, [])

  return (
    <Layout>
      <h1>Projects have moved</h1>
      <p>
        Projects now sit alongside my professional experience, university work
        and technical development in one long-form career record.
      </p>
      <p>
        <Link to="/experience/#engineering-work">View engineering work</Link>
      </p>
    </Layout>
  )
}

export const Head = ({ location }) => (
  <Seo title="Projects moved" pathname={location.pathname} noIndex />
)

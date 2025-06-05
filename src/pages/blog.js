import React from "react"
import Layout from "../components/Layout"
import { Link } from "gatsby"

export default function BlogPage() {
  return (
    <Layout>
      <h1>Blog</h1>
      <p>Here’s where I post ideas, walkthroughs, and thoughts on performance engineering, dev workflows, and more.</p>

      <div style={{ border: "1px solid #444", padding: "1rem", marginTop: "2rem" }}>
        <h2>How I built this blog with React & Gatsby</h2>
        <p>A step-by-step guide to creating this site, with code snippets and deploy tips.</p>
        <Link to="/blog/post" style={{ color: "#4fc3f7" }}>Read More →</Link>
      </div>
    </Layout>
  )
}

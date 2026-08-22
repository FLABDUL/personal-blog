import * as React from "react"
import { graphql, Link } from "gatsby"
import Layout from "../components/Layout"

export default function BlogPost({ data }) {
  const post = data.markdownRemark
  const { title, date, dateRaw } = post.frontmatter

  return (
    <Layout>
      <article className="blog-post">
        <header className="blog-post__header">
          <Link className="blog-post__back" to="/blog/">
            ← All writing
          </Link>
          <h1>{title}</h1>
          <time dateTime={dateRaw}>{date}</time>
        </header>
        <div
          className="blog-post__body"
          dangerouslySetInnerHTML={{ __html: post.html }}
        />
      </article>
    </Layout>
  )
}

export const query = graphql`
  query BlogPostBySlug($slug: String!) {
    markdownRemark(frontmatter: { slug: { eq: $slug } }) {
      html
      frontmatter {
        title
        date(formatString: "MMMM D, YYYY")
        dateRaw: date
      }
    }
  }
`

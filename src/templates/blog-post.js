import * as React from "react"
import { graphql } from "gatsby"
import Layout from "../components/Layout"

export default function BlogPost({ data }) {
  const post = data.markdownRemark
  const { title, date } = post.frontmatter

  return (
    <Layout>
      <article>
        <h1>{title}</h1>
        <p><em>{date}</em></p>
        <div dangerouslySetInnerHTML={{ __html: post.html }} />
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
      }
    }
  }
`

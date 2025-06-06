import React from "react"
import { graphql } from "gatsby"
import Layout from "../components/Layout"
import { MDXProvider } from "@mdx-js/react"
import { MDXRenderer } from "gatsby-plugin-mdx"

export const query = graphql`
  query BlogPost($id: String!) {
    mdx(id: { eq: $id }) {
      frontmatter {
        title
        date(formatString: "MMMM D, YYYY")
      }
      body
    }
  }
`

export default function BlogPost({ data }) {
  const { frontmatter, body } = data.mdx

  return (
    <Layout>
      <article>
        <h1>{frontmatter.title}</h1>
        <p><em>{frontmatter.date}</em></p>
        <MDXProvider>
          <MDXRenderer>{body}</MDXRenderer>
        </MDXProvider>
      </article>
    </Layout>
  )
}

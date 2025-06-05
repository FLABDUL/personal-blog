import React from "react"
import { graphql } from "gatsby"
import Layout from "../components/Layout"
import { MDXProvider } from "@mdx-js/react"
import { mdx } from "@mdx-js/react"

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
      <h1>{frontmatter.title}</h1>
      <p><em>{frontmatter.date}</em></p>
      <MDXProvider>
        <div dangerouslySetInnerHTML={{ __html: body }} />
      </MDXProvider>
    </Layout>
  )
}

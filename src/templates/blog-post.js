import * as React from "react"
import { graphql } from "gatsby"
import Layout from "../components/Layout"
import { MDXProvider } from "@mdx-js/react"
import { loadMDX } from "gatsby-plugin-mdx"

export const query = graphql`
  query BlogPost($id: String!) {
    mdx(id: { eq: $id }) {
      frontmatter {
        title
        date(formatString: "MMMM D, YYYY")
      }
      internal {
        contentFilePath
      }
    }
  }
`

export default function BlogPost({ data }) {
  const { frontmatter, internal } = data.mdx
  const [MDXContent, setMDXContent] = React.useState(null)

  React.useEffect(() => {
    if (internal?.contentFilePath) {
      loadMDX(internal.contentFilePath).then(setMDXContent)
    }
  }, [internal.contentFilePath])

  return (
    <Layout>
      <article>
        <h1>{frontmatter.title}</h1>
        <p><em>{frontmatter.date}</em></p>
        <MDXProvider>
          {MDXContent ? <MDXContent /> : <p>Loading…</p>}
        </MDXProvider>
      </article>
    </Layout>
  )
}

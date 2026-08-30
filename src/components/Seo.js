import React from "react"
import { graphql, useStaticQuery } from "gatsby"

export default function Seo({ title, description, pathname, noIndex = false }) {
  const { site } = useStaticQuery(graphql`
    query SeoSiteMetadata {
      site {
        siteMetadata {
          author
          description
          siteUrl
        }
      }
    }
  `)

  const metadata = site.siteMetadata
  const pageTitle = title ? `${title} | ${metadata.author}` : metadata.author
  const pageDescription = description || metadata.description
  const canonicalUrl = pathname
    ? new URL(pathname, metadata.siteUrl).toString()
    : metadata.siteUrl

  return (
    <>
      <title>{pageTitle}</title>
      <meta name="description" content={pageDescription} />
      <link rel="canonical" href={canonicalUrl} />
      {noIndex && <meta name="robots" content="noindex" />}
    </>
  )
}

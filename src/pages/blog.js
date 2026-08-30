import React from "react"
import { graphql, Link } from "gatsby"
import Layout from "../components/Layout"
import Seo from "../components/Seo"

export const query = graphql`
  query {
    allMarkdownRemark(sort: { frontmatter: { date: DESC } }) {
      nodes {
        frontmatter {
          title
          date(formatString: "MMMM D, YYYY")
          slug
          description
        }
        id
      }
    }
  }
`

export default function BlogPage({ data }) {
  const markdownPosts = data.allMarkdownRemark.nodes

  const externalPosts = [
    {
      title: "Working with Traders in London",
      date: "May 20, 2024",
      source: "LinkedIn",
      description:
        "What I learned from working closely with traders and navigating the pace, pressure, and communication of a London trading floor.",
      link: "https://www.linkedin.com/pulse/working-traders-london-abdul-hakim-norazman",
    },
    {
      title: "Nurturing the New Joiner",
      date: "April 15, 2024",
      source: "LinkedIn",
      description:
        "A reflection on helping new colleagues find their feet and the small actions that make an unfamiliar team feel welcoming.",
      link: "https://www.linkedin.com/pulse/nurturing-new-joiner-abdul-hakim-norazman",
    },
    {
      title: "Greenhorn Software Engineer",
      date: "March 10, 2024",
      source: "LinkedIn",
      description:
        "Thoughts from the early stages of becoming a software engineer: learning in public, asking questions, and growing through the work.",
      link: "https://www.linkedin.com/pulse/greenhorn-software-engineer-abdul-hakim-norazman",
    },
    {
      title: "Meet the Makers – University of Edinburgh Bulletin",
      date: "November 2, 2021",
      source: "University of Edinburgh",
      description:
        "A conversation about making, engineering, and the experiences that shaped my path through university.",
      link: "https://bulletin.ed.ac.uk/2021/11/02/meet-the-makers/",
    },
    {
      title: "Engineering Alumni Profile – Abdul Hakim Norazman",
      date: "October 2021",
      source: "University of Edinburgh",
      description:
        "An alumni profile covering my journey from Edinburgh engineering student to software engineer.",
      link: "https://employ.eng.ed.ac.uk/alumni-profiles/abdul-hakim-norazman-jp-morgan-chase-co",
    },
  ]

  return (
    <Layout wide>
      <div className="blog-page">
        <header className="blog-hero">
          <p className="blog-eyebrow">Notes, projects, and observations</p>
          <h1>Blog</h1>
          <p>
            Writing about software, work, curiosity, and the things I notice
            along the way.
          </p>
        </header>

        <section className="blog-section" aria-labelledby="writing-heading">
          <div className="blog-section__header">
            <div>
              <p className="blog-section__label">From this site</p>
              <h2 id="writing-heading">Writing</h2>
            </div>
            <span>{markdownPosts.length} posts</span>
          </div>

          <div className="blog-grid">
            {markdownPosts.map(post => (
              <Link
                className="blog-card blog-card--local"
                key={post.id}
                to={`/blog/${post.frontmatter.slug}`}
              >
                <time>{post.frontmatter.date}</time>
                <h3>{post.frontmatter.title}</h3>
                <p>{post.frontmatter.description}</p>
                <span className="blog-card__action">
                  Read article <span aria-hidden="true">→</span>
                </span>
              </Link>
            ))}
          </div>
        </section>

        <section className="blog-section" aria-labelledby="elsewhere-heading">
          <div className="blog-section__header">
            <div>
              <p className="blog-section__label">Published elsewhere</p>
              <h2 id="elsewhere-heading">Features &amp; posts</h2>
            </div>
          </div>

          <div className="blog-external-list">
            {externalPosts.map(post => (
              <a
                className="blog-card blog-card--external"
                href={post.link}
                key={post.link}
                target="_blank"
                rel="noopener noreferrer"
              >
                <div className="blog-card__meta">
                  <span>{post.source}</span>
                  <time>{post.date}</time>
                </div>
                <h3>{post.title}</h3>
                <p>{post.description}</p>
                <span className="blog-card__action">
                  Read elsewhere <span aria-hidden="true">↗</span>
                </span>
              </a>
            ))}
          </div>
        </section>
      </div>
    </Layout>
  )
}

export const Head = ({ location }) => (
  <Seo title="Blog" pathname={location.pathname} />
)

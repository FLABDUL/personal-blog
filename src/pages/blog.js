import React from "react";
import { graphql, Link } from "gatsby";
import Layout from "../components/Layout";

export const query = graphql`
  query {
    allMarkdownRemark(sort: { frontmatter: { date: DESC } }) {
      nodes {
        frontmatter {
          title
          date(formatString: "MMMM D, YYYY")
          slug
        }
        excerpt
        id
      }
    }
  }
`;

export default function BlogPage({ data }) {
  const markdownPosts = data.allMarkdownRemark.nodes;

  const externalPosts = [
    {
      title: "Working with Traders in London",
      date: "May 20, 2024",
      link: "https://www.linkedin.com/pulse/working-traders-london-abdul-hakim-norazman"
    },
    {
      title: "Nurturing the New Joiner",
      date: "April 15, 2024",
      link: "https://www.linkedin.com/pulse/nurturing-new-joiner-abdul-hakim-norazman"
    },
    {
      title: "Greenhorn Software Engineer",
      date: "March 10, 2024",
      link: "https://www.linkedin.com/pulse/greenhorn-software-engineer-abdul-hakim-norazman"
    }
  ];

  return (
    <Layout>
      <h1>Blog</h1>

      {/* Local Markdown Blog Posts */}
      {markdownPosts.map(post => (
        <div key={post.id} style={{ marginBottom: "2rem" }}>
          <h2>
            <Link to={`/blog/${post.frontmatter.slug}`} style={{ color: "#4fc3f7" }}>
              {post.frontmatter.title}
            </Link>
          </h2>
          <small>{post.frontmatter.date}</small>
          <p>{post.excerpt}</p>
        </div>
      ))}

      {/* External LinkedIn Blog Posts */}
      {externalPosts.map((post, idx) => (
        <div key={`external-${idx}`} style={{ marginBottom: "2rem" }}>
          <h2>
            <a href={post.link} target="_blank" rel="noopener noreferrer" style={{ color: "#4fc3f7" }}>
              {post.title}
            </a>
          </h2>
          <small>{post.date}</small>
          <p>Read on LinkedIn →</p>
        </div>
      ))}
    </Layout>
  );
}

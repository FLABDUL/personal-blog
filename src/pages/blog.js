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
    },
    {
      title: "Meet the Makers – University of Edinburgh Bulletin",
      date: "November 2, 2021",
      link: "https://bulletin.ed.ac.uk/2021/11/02/meet-the-makers/"
    },
    {
      title: "Engineering Alumni Profile – Abdul Hakim Norazman",
      date: "October 2021",
      link: "https://employ.eng.ed.ac.uk/alumni-profiles/abdul-hakim-norazman-jp-morgan-chase-co"
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

      {/* External Posts */}
      <h2 style={{ marginTop: "4rem" }}>External Features & Posts</h2>
      {externalPosts.map((post, idx) => (
        <div key={`external-${idx}`} style={{ marginBottom: "2rem" }}>
          <h3>
            <a href={post.link} target="_blank" rel="noopener noreferrer" style={{ color: "#4fc3f7" }}>
              {post.title}
            </a>
          </h3>
          <small>{post.date}</small>
          <p>Read more →</p>
        </div>
      ))}
    </Layout>
  );
}

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
  const posts = data.allMarkdownRemark.nodes;

  return (
    <Layout>
      <h1>Blog</h1>
      {posts.map(post => (
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
    </Layout>
  );
}

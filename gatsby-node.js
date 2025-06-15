const path = require("path");

exports.createPages = async ({ graphql, actions, reporter }) => {
  const { createPage } = actions;

  const result = await graphql(`
    {
      allMarkdownRemark {
        nodes {
          frontmatter {
            slug
          }
          id
        }
      }
    }
  `);

  if (result.errors) {
    reporter.panicOnBuild("🚨 GraphQL query failed.", result.errors);
    return;
  }

  const posts = result.data.allMarkdownRemark.nodes;

  posts.forEach(post => {
    if (!post.frontmatter?.slug) {
      reporter.warn(`⚠️ Missing slug in frontmatter for post with ID: ${post.id}`);
      return;
    }

    createPage({
      path: `/blog/${post.frontmatter.slug}`,
      component: path.resolve(`./src/templates/blog-post.js`),
      context: {
        slug: post.frontmatter.slug,
      },
    });
  });
};

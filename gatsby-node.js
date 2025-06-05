exports.createPages = async ({ graphql, actions }) => {
  const { createPage } = actions
  const result = await graphql(`
    query {
      allMdx {
        nodes {
          frontmatter {
            slug
          }
          id
        }
      }
    }
  `)

  result.data.allMdx.nodes.forEach(node => {
    createPage({
      path: `/blog/${node.frontmatter.slug}`,
      component: require.resolve(`./src/templates/blog-post.js`),
      context: { id: node.id },
    })
  })
}

const path = require("path")

exports.createPages = async ({ graphql, actions, reporter }) => {
  const { createPage } = actions

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
  `)

  if (result.errors) {
    reporter.panicOnBuild("🚨 GraphQL query failed.", result.errors)
    return
  }

  const posts = result.data.allMarkdownRemark.nodes

  posts.forEach(post => {
    if (!post.frontmatter?.slug) {
      reporter.warn(
        `⚠️ Missing slug in frontmatter for post with ID: ${post.id}`,
      )
      return
    }

    createPage({
      path: `/blog/${post.frontmatter.slug}`,
      component: path.resolve(`./src/templates/blog-post.js`),
      context: {
        slug: post.frontmatter.slug,
      },
    })
  })
}

exports.onCreateDevServer = ({ app }) => {
  app.get("/api/leetcode", require("./api/leetcode"))
}

// Review routes are disposable and must never appear in a production build.
exports.onCreatePage = ({ page, actions }) => {
  const review = require("./config/design-review.json")
  if (
    page.path.startsWith("/review") &&
    (!review.enabled || process.env.VERCEL_ENV === "production")
  )
    actions.deletePage(page)
}

exports.onPostBuild = () => {
  // These legacy static files are draft candidates, not published Studio work.
  for (const name of ["fox.jpg", "pottery.jpg"]) {
    const file = path.resolve("public", "art", name)
    if (require("fs").existsSync(file)) require("fs").unlinkSync(file)
  }
}

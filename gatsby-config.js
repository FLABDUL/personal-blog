module.exports = {
  siteMetadata: {
    title: `Personal Blog`,
    description: `A blog about performance tuning, tech and life.`,
    author: `Abdul Hakim Nor Azman`,
  },
  plugins: [
    `gatsby-plugin-react-helmet`,
    {
      resolve: `gatsby-source-filesystem`,
      options: {
        name: `blog`,
        path: `${__dirname}/src/content/blog`,
      },
    },
    `gatsby-plugin-mdx`,
  ],
}

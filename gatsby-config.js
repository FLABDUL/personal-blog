const path = require("path");

module.exports = {
  siteMetadata: {
    title: "Personal Blog",
    description: "A blog about performance tuning, tech and life.",
    author: "Abdul Hakim Norazman",
  },
  plugins: [
    `gatsby-plugin-image`,
    `gatsby-plugin-sharp`,
    `gatsby-transformer-sharp`,
    `gatsby-plugin-react-helmet`,
    {
      resolve: `gatsby-source-filesystem`,
      options: {
        name: `blog`,
        path: path.resolve(__dirname, "src/content/blog"),
      },
    },
    {
      resolve: `gatsby-transformer-remark`,
      options: {
        plugins: [
          {
            resolve: `gatsby-remark-prismjs`,
            options: {
              showLineNumbers: true,
            },
          },
          {
            resolve: `gatsby-remark-images`,
            options: {
              maxWidth: 1035,
              quality: 90,
              linkImagesToOriginal: false,
            },
          },
        ],
      },
    },
  ],
};

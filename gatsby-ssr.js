/**
 * Implement Gatsby's SSR (Server Side Rendering) APIs in this file.
 *
 * See: https://www.gatsbyjs.com/docs/reference/config-files/gatsby-ssr/
 */

/**
 * @type {import('gatsby').GatsbySSR['onRenderBody']}
 */
const React = require("react")

exports.onRenderBody = ({ setHtmlAttributes, setHeadComponents }) => {
  setHtmlAttributes({ lang: `en` })
  // Apply an explicit preference before the first paint, without hiding content.
  setHeadComponents([
    React.createElement("script", {
      key: "colour-theme",
      dangerouslySetInnerHTML: {
        __html:
          'try{var t=localStorage.getItem("madebyhakim-theme");if(t==="light"||t==="dark")document.documentElement.dataset.theme=t}catch(e){}',
      },
    }),
  ])
}

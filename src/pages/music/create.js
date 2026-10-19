import React from "react"
import Layout from "../../components/Layout"
import Seo from "../../components/Seo"
import MusicPortraitStudio from "../../components/music/MusicPortraitStudio"

export default function MusicCreatePage() {
  return (
    <Layout wide>
      <MusicPortraitStudio />
    </Layout>
  )
}

export const Head = () => (
  <>
    <Seo
      title="Your Music Portrait"
      description="Your private music portrait studio."
      pathname="/music/create/"
      noIndex
    />
    <meta name="referrer" content="no-referrer" />
  </>
)

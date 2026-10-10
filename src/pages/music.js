import React from "react"
import { Link } from "gatsby"

import Layout from "../components/Layout"
import MusicPortrait from "../components/music/MusicPortrait"
import Seo from "../components/Seo"
import portraitManifest from "../../content/music/portrait.json"
import { loadMusicPortrait } from "../lib/music/content"

const allowDraft = process.env.GATSBY_MUSIC_DRAFT_PREVIEW === "1"
const portrait = loadMusicPortrait(portraitManifest, { allowDraft })

export default function MusicPage() {
  return (
    <Layout wide>
      <header>
        <p>Abdul Hakim Norazman · Music</p>
        <h1>Music Portrait</h1>
        <p>
          A personal chart of the music that moves, grounds and inspires me.
        </p>
        <Link to="/music/case-study/">How this was made</Link>
      </header>
      {portrait ? (
        <MusicPortrait portrait={portrait} />
      ) : (
        <p>The music portrait is being curated. Please check back later.</p>
      )}
    </Layout>
  )
}

export const Head = ({ location }) => (
  <Seo
    title="Music Portrait"
    description="An interactive portrait of the artists and songs that move, ground and inspire Abdul Hakim Norazman."
    pathname={location.pathname}
  />
)

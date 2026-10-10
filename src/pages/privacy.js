import React from "react"

import Layout from "../components/Layout"
import Seo from "../components/Seo"

export default function PrivacyPage() {
  return (
    <Layout>
      <article>
        <h1>Privacy</h1>
        <p>
          This personal portfolio does not ask visitors to create an account.
        </p>
        <h2>Music Portrait</h2>
        <p>
          Spotify supplies public catalogue details such as artist and track
          names, artwork and links for selections I have authored.
        </p>
        <p>
          The Music Portrait does not connect a visitor&apos;s Spotify account,
          read anyone&apos;s listening history or request playback permissions.
        </p>
        <p>
          This site does not use Music-specific analytics. Standard hosting logs
          may still be processed by the hosting provider for security and
          reliability.
        </p>
        <h2>External links</h2>
        <p>
          Choosing an external link, including a Spotify link, takes you to that
          provider and its own privacy practices.
        </p>
      </article>
    </Layout>
  )
}

export const Head = ({ location }) => (
  <Seo
    title="Privacy"
    description="Privacy information for madebyhakim.com and the Music Portrait."
    pathname={location.pathname}
  />
)

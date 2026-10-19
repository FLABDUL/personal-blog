import React from "react"

import Layout from "../components/Layout"
import Seo from "../components/Seo"

export default function PrivacyPage() {
  return (
    <Layout>
      <article>
        <h1>Privacy</h1>
        <p>
          You can browse this personal portfolio without an account. A separate,
          invited Music Portrait beta connects its owners to Spotify.
        </p>
        <h2>The authored Music Portrait</h2>
        <p>
          The authored portrait at /music/ uses Spotify&apos;s public catalogue
          integration for artist and track names, artwork and links for my
          selections. It does not read a visitor&apos;s listening history.
        </p>
        <p>
          This site does not use music-specific analytics. Standard hosting logs
          may still be processed by the hosting provider for security and
          reliability.
        </p>
        <h2>The invited owner beta</h2>
        <p>
          The closed beta is limited to five people: Hakim and up to four
          friends. Invited owners authorise Spotify OAuth with the user-top-read
          scope to read top artists and tracks across Spotify&apos;s time
          windows. These are ranked items, not exact play counts or a complete
          listening log.
        </p>
        <p>
          An encrypted refresh token is held on the server. Ranked evidence, the
          private draft and saved choices stay in app-held private storage.
          Weekly updates and manual refreshes use that connection; owners can
          pause scheduled updates. Owner actions use a session cookie and CSRF
          protection. Returning-owner sign-in and reconnection are not currently
          supported; contact the beta organiser if access is lost.
        </p>
        <h2>Saving and sharing</h2>
        <p>
          Sharing creates a high-entropy unlisted capability link: anyone with
          the link can view the portrait, including someone it is forwarded to.
          Viewers need no login. The route uses noindex to discourage search
          indexing; this is not access control. Regenerating the link revokes
          the old link after success.
        </p>
        <p>
          Shared snapshots contain only an explicit public projection: the
          owner&apos;s display name, initials and optional image, the update
          date, artists, song credits, catalogue artwork and links, regions,
          sizes, arrival dates and saved artist notes. Tokens, private ranked
          evidence and studio controls are excluded.
        </p>
        <p>
          Saving updates the private draft immediately. Publish shares the saved
          portrait. After sharing, manual refresh, scheduled updates and link
          regeneration can also publish saved choices and notes. Review notes
          with these later updates in mind.
        </p>
        <h2>The Spotify player</h2>
        <p>
          Selecting a song explicitly loads its Spotify embed; there is no
          autoplay. Spotify&apos;s own player, privacy practices and account
          behaviour apply, including any cookies or sign-in it requires. A
          canonical Spotify link remains available if the player cannot load.
        </p>
        <h2>Retention and deletion</h2>
        <p>
          The last good portrait may remain available through provider failures,
          and pausing updates keeps an existing shared link available. Beta
          portraits, private evidence and saved choices are retained until owner
          deletion; there is no automatic time-based expiry for these records.
        </p>
        <p>
          Owner deletion unpublishes the portrait and removes app-held owner,
          credential, evidence, choices, draft and shared snapshot records. A
          deletion marker is retained to prevent surviving records being served,
          along with an anonymous guard against reusing a spent invitation. If
          storage cleanup fails, records may remain and manual recovery may be
          needed; interrupted storage operations can also need manual recovery.
          Copies already saved by viewers are outside this deletion.
        </p>
        <p>
          Deletion does not automatically remove the Spotify Developer Dashboard
          allowlist entry or revoke Spotify-side access. These are administered
          separately by the beta organiser and through Spotify&apos;s account
          settings.
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

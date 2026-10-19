import React from "react"
import Layout from "../../components/Layout"
import Seo from "../../components/Seo"
import MusicPortrait from "../../components/music/MusicPortrait"
import useSharedMusicPortrait from "../../components/music/useSharedMusicPortrait"
import NotFoundPage from "../404"

export default function SharedMusicPortraitPage({ location }) {
  const { status, snapshot, retry } = useSharedMusicPortrait(location?.pathname)
  if (status === "not-found") return <NotFoundPage />
  return (
    <Layout wide>
      {status === "ready" ? (
        <>
          <header>
            <h1 style={{ overflowWrap: "anywhere" }}>
              {snapshot.owner.displayName}’s Music Portrait
            </h1>
            <p>
              Last successful update:{" "}
              <time dateTime={snapshot.lastSuccessfulUpdateAt}>
                {new Date(snapshot.lastSuccessfulUpdateAt).toLocaleDateString(
                  "en-GB",
                  {
                    day: "numeric",
                    month: "long",
                    year: "numeric",
                    timeZone: "UTC",
                  },
                )}
              </time>
              .
            </p>
          </header>
          <MusicPortrait key={snapshot.snapshotId} snapshot={snapshot} />
        </>
      ) : (
        <>
          <h1>Music Portrait</h1>
          <p role="status">
            {status === "loading"
              ? "Loading this portrait…"
              : "This portrait is currently unavailable. Please try again."}
          </p>
          {status === "unavailable" && (
            <button type="button" onClick={retry}>
              Try again
            </button>
          )}
        </>
      )}
    </Layout>
  )
}

export const Head = () => (
  <>
    <Seo
      title="Shared Music Portrait"
      description="An unlisted music portrait."
      pathname="/music/galaxy/"
    />
    <meta name="robots" content="noindex, nofollow" />
    <meta name="referrer" content="no-referrer" />
  </>
)

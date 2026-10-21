import React from "react"
import { Link } from "gatsby"
import Layout from "../components/Layout"
import Seo from "../components/Seo"
import AboutStory from "../components/AboutStory"

const chapters = [
  [
    "01",
    "Projects",
    "Useful things, built from the ground up.",
    "/projects/",
    "Build",
  ],
  [
    "02",
    "Blog",
    "Notes on software, work and paying attention.",
    "/blog/",
    "Read",
  ],
  [
    "03",
    "Studio",
    "Paintings. Colour, texture and a different pace.",
    "/studio/",
    "Look",
  ],
  [
    "04",
    "Bookshelf",
    "Books I have read and kept within reach.",
    "/bookshelf/",
    "Browse",
  ],
  ["05", "Music", "An atlas of the music that moves me.", "/music/", "Explore"],
  [
    "06",
    "Experience",
    "The longer story of my engineering work.",
    "/experience/",
    "Follow",
  ],
]
export default function HomePage() {
  return (
    <Layout wide world="about">
      <section className="home-intro" aria-labelledby="home-title">
        <div className="home-intro__type">
          <p className="eyebrow">
            Abdul Hakim Norazman · A personal collection
          </p>
          <h1 id="home-title">
            Software, art
            <br />
            &amp; the spaces
            <br />
            <em>between.</em>
          </h1>
          <p className="home-intro__lead">
            Software engineer. Maker. A little of everything else.
          </p>
          <div className="text-actions">
            <Link to="/projects/">
              Explore my work <span aria-hidden="true">↗</span>
            </Link>
            <a href="#about-story-title">
              A little about me <span aria-hidden="true">↓</span>
            </a>
          </div>
        </div>
        <div className="home-intro__portrait">
          <figure>
            <img
              src="/design/portrait.webp"
              width="640"
              height="800"
              alt="Abdul Hakim Norazman"
              fetchPriority="high"
            />
            <figcaption>01 / The person behind the work</figcaption>
          </figure>
          <Link className="home-art-note" to="/studio/">
            <img
              src="/design/art/furl-480.webp"
              alt="furl"
              width="220"
              height="220"
            />
            <span>
              A different kind <br />
              of making <span aria-hidden="true">↗</span>
            </span>
          </Link>
        </div>
        <div className="home-intro__folio" aria-hidden="true">
          <span>Made with curiosity.</span>
          <span>Scroll to explore ↓</span>
        </div>
      </section>
      <section className="chapter-index" aria-labelledby="chapter-title">
        <div className="section-label">
          <p className="eyebrow">An index of interests</p>
          <h2 id="chapter-title">Choose a way in.</h2>
        </div>
        <div>
          {chapters.map(([n, title, description, to, action]) => (
            <Link
              className={`chapter-link chapter-link--${title.toLowerCase()}`}
              to={to}
              key={title}
            >
              <span className="chapter-link__number">{n}</span>
              <h3>{title}</h3>
              <p>{description}</p>
              <span className="chapter-link__action">{action} ↗</span>
            </Link>
          ))}
        </div>
      </section>
      <AboutStory />
    </Layout>
  )
}
export const Head = ({ location }) => (
  <Seo title="About" pathname={location.pathname} />
)

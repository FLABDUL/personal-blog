import React from "react"
export default function AboutStory() {
  return (
    <section className="about-story" aria-labelledby="about-story-title">
      <div>
        <p className="eyebrow">A little context</p>
        <h2 id="about-story-title">
          Hello, I’m
          <br />
          <em>Hakim.</em>
        </h2>
      </div>
      <div className="about-story__copy">
        <p>
          Hi, I'm Abdul Hakim NORAZMAN — a technology consultant at Detillens,
          contracted to Morgan Stanley as a software engineer in Client Fund
          Services Technology. I enjoy solving problems that sit at the
          intersection of technology and finance.
        </p>
        <p>
          I studied Electrical and Mechanical Engineering at the University of
          Edinburgh, where I was fortunate to work on some pretty cool things —
          including developing Hyperloop pod technology with the{" "}
          <a
            href="https://hyp-ed.com"
            target="_blank"
            rel="noopener noreferrer"
          >
            HYPED
          </a>{" "}
          team at SpaceX, and mentoring makers at the{" "}
          <a
            href="https://ucreate.ed.ac.uk/"
            target="_blank"
            rel="noopener noreferrer"
          >
            uCreate Studio
          </a>
          .
        </p>
        <p>
          Outside of work, I spend much of my time cycling, coding, and playing
          the electric guitar. These hobbies keep me grounded and remind me that
          progress — whether in fitness, music, or software — is usually
          incremental and earned over time.
        </p>
        <p>
          If you're into tech, finance, or just want to chat, feel free to
          connect with me on{" "}
          <a
            href="https://linkedin.com/in/flabdul"
            target="_blank"
            rel="noopener noreferrer"
          >
            LinkedIn
          </a>
          , check out my work on{" "}
          <a
            href="https://github.com/FLABDUL"
            target="_blank"
            rel="noopener noreferrer"
          >
            GitHub
          </a>
          , or follow my activities on{" "}
          <a
            href="https://www.strava.com/athletes/88805607"
            target="_blank"
            rel="noopener noreferrer"
          >
            Strava
          </a>
          .
        </p>
      </div>
    </section>
  )
}

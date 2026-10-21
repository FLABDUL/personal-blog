import React from "react"
import { Link } from "gatsby"

const socials = [
  ["Email", "mailto:ahnorazman@gmail.com"],
  ["LinkedIn", "https://www.linkedin.com/in/abdulhakimnorazman/"],
  ["GitHub", "https://github.com/FLABDUL"],
  ["Strava", "https://www.strava.com/athletes/88805607"],
  ["Instagram", "https://www.instagram.com/e3m_hakim/"],
]
export default function Footer() {
  return (
    <footer className="site-footer">
      <div className="site-footer__identity">
        <p>
          Made by Hakim<span aria-hidden="true">.</span>
        </p>
        <span>Software, art &amp; everything in between.</span>
      </div>
      <nav aria-label="Find me elsewhere" className="footer-links">
        {socials.map(([label, href]) => (
          <a
            key={label}
            href={href}
            target={href.startsWith("mailto:") ? undefined : "_blank"}
            rel="noopener noreferrer"
          >
            {label} <span aria-hidden="true">↗</span>
          </a>
        ))}
      </nav>
      <div className="footer-small">
        <span>© Abdul Hakim Norazman {new Date().getFullYear()}</span>
        <Link to="/privacy/">Privacy</Link>
        <a href="#main-content">Back to top ↑</a>
      </div>
    </footer>
  )
}

import React from "react"
import { Link } from "gatsby"

const links = [
  ["/", "About"],
  ["/experience/", "Experience"],
  ["/projects/", "Projects"],
  ["/blog/", "Blog"],
  ["/bookshelf/", "Bookshelf"],
  ["/music/", "Music"],
  ["/studio/", "Studio"],
]

export default function Navbar() {
  return (
    <header className="masthead">
      <Link to="/" className="wordmark">
        <span className="wordmark__symbol" aria-hidden="true">
          m/h
        </span>
        <span>
          Made by <br />
          <strong>Hakim.</strong>
        </span>
      </Link>
      <nav className="site-nav" aria-label="Primary navigation">
        {links.map(([to, label]) => (
          <Link
            key={to}
            to={to}
            className="site-nav__link"
            activeClassName="site-nav__link--active"
            partiallyActive={to !== "/"}
          >
            {label}
          </Link>
        ))}
      </nav>
    </header>
  )
}

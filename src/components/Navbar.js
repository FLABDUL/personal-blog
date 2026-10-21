import React from "react"
import { Link } from "gatsby"
import ThemeControls from "./ThemeControls"
import BrandIdentity from "./BrandIdentity"

const links = [
  ["/", "About"],
  ["/experience/", "Experience"],
  ["/projects/", "Projects"],
  ["/blog/", "Blog"],
  ["/bookshelf/", "Bookshelf"],
  ["/music/", "Music"],
  ["/studio/", "Studio"],
]

export default function Navbar({ defaultTheme = "light" }) {
  return (
    <header className="masthead">
      <Link to="/" className="wordmark" aria-label="Made by Hakim — home">
        <BrandIdentity />
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
      <ThemeControls defaultTheme={defaultTheme} />
    </header>
  )
}

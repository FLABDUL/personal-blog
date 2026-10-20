import React from "react"
import { Link } from "gatsby"
import Navbar from "./Navbar"
import Footer from "./Footer"
import review from "../../config/design-review.json"

const Layout = ({ children, wide = false, world = "default" }) => (
  <div className={`site-shell world-${world}`}>
    <a className="skip-link" href="#main-content">
      Skip to content
    </a>
    <Navbar />
    {review.enabled && process.env.GATSBY_REVIEW_ALLOWED !== "0" && (
      <aside className="review-ribbon" aria-label="Experimental preview">
        <span>
          <span className="review-dot" aria-hidden="true" /> Design study ·
          Preview only
        </span>
        <Link to="/review/">
          Review the directions <span aria-hidden="true">↗</span>
        </Link>
      </aside>
    )}
    <main
      id="main-content"
      tabIndex={-1}
      className={wide ? "site-main site-main--wide" : "site-main"}
    >
      {children}
    </main>
    <Footer />
  </div>
)
export default Layout

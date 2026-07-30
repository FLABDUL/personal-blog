import React from "react"
import Navbar from "./Navbar"
import Footer from "./Footer"

const Layout = ({ children, wide = false }) => (
  <div className="site-shell">
    <Navbar />
    <main className={wide ? "site-main site-main--wide" : "site-main"}>
      {children}
    </main>
    <Footer />
  </div>
)

export default Layout

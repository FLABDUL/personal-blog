import React from "react"
import Navbar from "./Navbar"
import Footer from "./Footer"

const Layout = ({ children }) => (
  <div style={{ backgroundColor: "#111", color: "#eee", minHeight: "100vh", fontFamily: "Arial, sans-serif" }}>
    <Navbar />
    <main style={{
      maxWidth: "700px",
      margin: "2rem auto",
      padding: "0 1rem",
      lineHeight: "1.6"
    }}>
      {children}
    </main>
    <Footer />
  </div>
)

export default Layout

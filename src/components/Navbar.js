import React, { useState, useEffect } from "react"
import { Link } from "gatsby"

const Navbar = () => {
  const [visible, setVisible] = useState(true)
  const [lastScrollY, setLastScrollY] = useState(0)

  const handleScroll = () => {
    const currentScrollY = window.scrollY
    if (currentScrollY > lastScrollY) {
      setVisible(false)
    } else {
      setVisible(true)
    }
    setLastScrollY(currentScrollY)
  }

  useEffect(() => {
    window.addEventListener("scroll", handleScroll)
    return () => window.removeEventListener("scroll", handleScroll)
  }, [lastScrollY])

  const navStyle = {
    position: "sticky",
    top: 0,
    zIndex: 999,
    backgroundColor: "#111",
    padding: "1rem",
    display: "flex",
    gap: "2rem",
    justifyContent: "center",
    transform: visible ? "translateY(0)" : "translateY(-100%)",
    transition: "transform 0.3s ease-in-out",
  }

  const linkStyle = {
    color: "#eee",
    textDecoration: "none",
    fontWeight: "500"
  }

  return (
    <nav style={navStyle}>
      <Link to="/" style={linkStyle}>About</Link>
      <Link to="/blog" style={linkStyle}>Blog</Link>
      <Link to="/tools" style={linkStyle}>Tools</Link>
    </nav>
  )
}

export default Navbar

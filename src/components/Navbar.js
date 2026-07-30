import React, { useState, useEffect } from "react"
import { Link } from "gatsby"

const links = [
  { to: "/", label: "About" },
  { to: "/experience", label: "Experience" },
  { to: "/blog", label: "Blog" },
  { to: "/bookshelf", label: "Bookshelf" },
  { to: "/studio", label: "Studio" },
]

const Navbar = () => {
  const [visible, setVisible] = useState(true)
  const [lastScrollY, setLastScrollY] = useState(0)

  useEffect(() => {
    const handleScroll = () => {
      const currentY = window.scrollY
      setVisible(currentY < lastScrollY)
      setLastScrollY(currentY)
    }

    window.addEventListener("scroll", handleScroll)
    return () => window.removeEventListener("scroll", handleScroll)
  }, [lastScrollY])

  return (
    <nav
      className="site-nav"
      style={{
        transform: visible ? "translateY(0)" : "translateY(-100%)",
      }}
      aria-label="Primary navigation"
    >
      {links.map(({ to, label }) => (
        <Link
          key={to}
          to={to}
          className="site-nav__link"
          activeClassName="site-nav__link--active"
        >
          {label}
        </Link>
      ))}
    </nav>
  )
}

export default Navbar

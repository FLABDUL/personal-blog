import React, { useState, useEffect } from "react";
import { Link } from "gatsby";

const Navbar = () => {
  const [visible, setVisible] = useState(true);
  const [lastScrollY, setLastScrollY] = useState(0);

  useEffect(() => {
    const handleScroll = () => {
      const currentY = window.scrollY;
      setVisible(currentY < lastScrollY);
      setLastScrollY(currentY);
    };

    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, [lastScrollY]);

  return (
    <nav style={{
      position: "sticky",
      top: 0,
      zIndex: 999,
      backgroundColor: "#111",
      padding: "1rem",
      display: "flex",
      gap: "2rem",
      justifyContent: "center",
      transform: visible ? "translateY(0)" : "translateY(-100%)",
      transition: "transform 0.3s ease-in-out"
    }}>
      {["/", "/blog", "/projects", "/bookshelf", "/studio"].map((path, i) => (
        <Link key={i} to={path} style={{ color: "#eee", textDecoration: "none", fontWeight: "500" }}>
          {path === "/" ? "About" : path.replace("/", "").charAt(0).toUpperCase() + path.slice(2)}
        </Link>
      ))}
    </nav>
  );
};

export default Navbar;

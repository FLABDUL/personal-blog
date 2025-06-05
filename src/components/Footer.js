import React from "react"

const Footer = () => (
  <footer style={{
    textAlign: "center",
    padding: "1rem 0",
    fontSize: "0.8rem",
    color: "#888",
    borderTop: "1px solid #333",
    marginTop: "3rem",
    backgroundColor: "#111",
  }}>
    <div style={{ marginBottom: "0.3rem" }}>
      © Abdul Hakim Nor Azman {new Date().getFullYear()}
    </div>
    <div style={{ fontSize: "1.2rem" }}>
      <a
        href="mailto:ahnorazman@gmail.com"
        style={{ color: "#4fc3f7", margin: "0 0.5rem" }}
        aria-label="Email"
      >
        📧
      </a>
      <a
        href="https://www.linkedin.com/in/abdulhakimnorazman/"
        target="_blank"
        rel="noopener noreferrer"
        style={{ color: "#4fc3f7", margin: "0 0.5rem" }}
        aria-label="LinkedIn"
      >
        💼
      </a>
      <a
        href="https://www.instagram.com/e3m_hakim/"
        target="_blank"
        rel="noopener noreferrer"
        style={{ color: "#4fc3f7", margin: "0 0.5rem" }}
        aria-label="Instagram"
      >
        📸
      </a>
    </div>
  </footer>
)

export default Footer

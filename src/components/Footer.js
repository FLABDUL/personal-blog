import React from "react"
import { FaLinkedin, FaGithub, FaStrava } from "react-icons/fa"
import { SiGmail } from "react-icons/si"

const Footer = () => (
  <footer style={{
    textAlign: "center",
    padding: "2rem 1rem",
    fontSize: "0.9rem",
    color: "#ccc",
    borderTop: "1px solid #333",
    marginTop: "4rem",
    backgroundColor: "#111"
  }}>
    <div>© Abdul Hakim Norazman {new Date().getFullYear()}</div>

    <div style={{ marginTop: "0.5rem", fontSize: "1.5rem" }}>
      <a href="mailto:ahnorazman@gmail.com" aria-label="Email" style={{ margin: "0 1rem", color: "#db4437" }}>
        <SiGmail />
      </a>
      <a href="https://www.linkedin.com/in/abdulhakimnorazman/" target="_blank" rel="noopener noreferrer" aria-label="LinkedIn" style={{ margin: "0 1rem", color: "#0077b5" }}>
        <FaLinkedin />
      </a>
      <a href="https://github.com/FLABDUL" target="_blank" rel="noopener noreferrer" aria-label="GitHub" style={{ margin: "0 1rem", color: "#ccc" }}>
        <FaGithub />
      </a>
      <a href="https://www.strava.com/athletes/88805607" target="_blank" rel="noopener noreferrer" aria-label="Strava" style={{ margin: "0 1rem", color: "#fc4c02" }}>
        <FaStrava />
      </a>
    </div>
  </footer>
)

export default Footer

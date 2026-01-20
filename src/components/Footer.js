import React from "react"
import { FaLinkedin, FaGithub } from "react-icons/fa"
import { SiGmail, SiGarmin } from "react-icons/si"

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
      <a href="https://connect.garmin.com/app/profile/86c7a0bb-2e9b-4793-a9a3-1cb0884ec934" target="_blank" rel="noopener noreferrer" aria-label="Garmin Connect" style={{ margin: "0 1rem", color: "#007cba" }}>
        <SiGarmin />
      </a>
    </div>
  </footer>
)

export default Footer

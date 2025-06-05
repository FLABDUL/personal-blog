import React from "react"

const ProjectCard = ({ title, description, link }) => (
  <div style={{
    border: "1px solid #333",
    borderRadius: "8px",
    padding: "1rem",
    backgroundColor: "#1c1c1c",
    width: "100%",
    maxWidth: "320px",
    margin: "1rem auto"
  }}>
    <h3 style={{ color: "#4fc3f7" }}>{title}</h3>
    <p>{description}</p>
    {link && (
      <a href={link} target="_blank" rel="noopener noreferrer" style={{ color: "#4fc3f7" }}>
        View Project →
      </a>
    )}
  </div>
)

export default ProjectCard

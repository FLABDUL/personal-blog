import React from "react"
import Layout from "../components/Layout"
import ProjectCard from "../components/ProjectCard"

export default function ProjectsPage() {
  const projects = [
    {
      title: "Dependency Agent",
      description: "Hackathon tool that uses OpenAI to resolve Maven dependency conflicts using changelog intelligence.",
      link: "https://github.com/jathoms/dependency-agent"
    },
    {
      title: "BEng Thesis – CAD Filter with ML",
      description: "Final year thesis on developing a machine learning–based CAD filter using computational geometry techniques.",
      link: "https://github.com/FLABDUL/beng-thesis"
    }
  ]

  return (
    <Layout>
      <h1>Projects</h1>
      <div
        style={{
          display: "grid",
          gridGap: "2rem",
          gridTemplateColumns: "repeat(auto-fit, minmax(300px, 1fr))"
        }}
      >
        {projects.map((proj, idx) => (
          <ProjectCard key={idx} {...proj} />
        ))}
      </div>
    </Layout>
  )
}

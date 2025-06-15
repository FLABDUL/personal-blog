import React from "react";
import Layout from "../components/Layout";
import ProjectCard from "../components/ProjectCard";

const projects = [
  {
    title: "Performance Profiler",
    description: "Tool for measuring and visualizing React component re-renders.",
    link: "https://github.com/FLABDUL/performance-profiler"
  },
  {
    title: "Quant Tools Dashboard",
    description: "Internal dashboard for portfolio management tools and research utilities.",
    link: null
  }
];

export default function ProjectsPage() {
  return (
    <Layout>
      <h1>Projects</h1>
      <div style={{ display: "grid", gap: "2rem", gridTemplateColumns: "repeat(auto-fit, minmax(300px, 1fr))" }}>
        {projects.map((proj, idx) => (
          <ProjectCard key={idx} {...proj} />
        ))}
      </div>
    </Layout>
  );
}

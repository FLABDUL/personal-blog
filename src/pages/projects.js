import React from "react";
import Layout from "../components/Layout";
import ProjectCard from "../components/ProjectCard";

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
    },
    {
      title: "Go/TeamDiversity – Pierpont Award Winner",
      description: "An internal JPMorgan app that calculates Diversity Scores to help teams track, compare, and improve diversity metrics. Developed during the AWS Hackathon and deployed to production to support DE&I hiring strategies.",
      link: "https://www.linkedin.com/in/abdulhakimnorazman/overlay/1635522683594/single-media-viewer/?profileId=ACoAACVc01QB5OJBS7gD45f-9HRVkiQeveyODyA"
    },
    {
      title: "Strava Dashboard",
      description: "A full-stack fitness tracker that visualizes Strava activity data with custom weekly/monthly stats, interactive filters, and distance charts. Built with Node.js, PostgreSQL, and React.",
      link: "https://github.com/FLABDUL/strava-dashboard"
    }
  ];

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
  );
}

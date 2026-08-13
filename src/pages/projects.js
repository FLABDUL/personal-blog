import React from "react"
import Layout from "../components/Layout"
import LeetCodeCard from "../components/LeetCodeCard"
import ProjectCard from "../components/ProjectCard"
import { engineeringWork } from "../data/cv"

export default function ProjectsPage() {
  const personalProjects = engineeringWork.find(
    group => group.id === "independent-and-open-source"
  ).items

  return (
    <Layout wide>
      <article className="projects-showcase">
        <header className="projects-hero">
          <p className="projects-eyebrow">Selected independent work</p>
          <h1>Projects built to be explored.</h1>
          <p>
            Public tools, technical experiments and open-source contributions.
            The visuals below come from the working demos themselves—open one to
            try the product, or inspect the source where it is available.
          </p>
          <dl className="projects-summary" aria-label="Project collection">
            <div>
              <dt>{personalProjects.length}</dt>
              <dd>public projects</dd>
            </div>
            <div>
              <dt>
                {personalProjects.filter(project => project.sourceHref).length}
              </dt>
              <dd>interactive demos</dd>
            </div>
            <div>
              <dt>1</dt>
              <dd>open-source contribution</dd>
            </div>
          </dl>
        </header>

        <section className="projects-grid" aria-label="Personal projects">
          {personalProjects.map(project => (
            <ProjectCard project={project} visual key={project.id} />
          ))}
        </section>

        <section className="projects-practice" aria-label="Coding practice">
          <LeetCodeCard />
        </section>
      </article>
    </Layout>
  )
}

export const Head = () => (
  <>
    <title>Projects | Abdul Hakim Norazman</title>
    <meta
      name="description"
      content="Interactive software projects and open-source work by Abdul Hakim Norazman, with live demos, source code and product visuals."
    />
  </>
)

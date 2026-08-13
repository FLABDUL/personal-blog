import React from "react"

const ProjectCard = ({ project, visual = false }) => {
  const primaryLabel = project.sourceHref ? "Live demo" : "View source"

  return (
    <article
      className={`cv-card cv-project project-card${
        visual ? " project-card--visual" : ""
      }`}
    >
      {visual && project.image && (
        <a
          className="project-card__media"
          href={project.href}
          target="_blank"
          rel="noreferrer"
          aria-label={`${primaryLabel}: ${project.name}`}
        >
          <img
            src={project.image}
            alt={project.imageAlt || ""}
            loading="lazy"
          />
          <span className="project-card__media-action" aria-hidden="true">
            Open {project.sourceHref ? "demo" : "project"} ↗
          </span>
        </a>
      )}

      <div className={visual ? "project-card__body" : undefined}>
        <div className="project-card__meta">
          <p className="cv-card__eyebrow">{project.context}</p>
          {visual && project.showcaseLabel && (
            <span className="project-card__status">
              {project.showcaseLabel}
            </span>
          )}
        </div>
        <h4>
          {visual && project.href ? (
            <a href={project.href} target="_blank" rel="noreferrer">
              {project.name}
            </a>
          ) : (
            project.name
          )}
        </h4>
        <p>{project.description}</p>
        <ul className="cv-tags" aria-label="Technologies and themes">
          {project.tags.map(tag => (
            <li key={tag}>{tag}</li>
          ))}
        </ul>
        {(project.href || project.sourceHref) && (
          <div className="cv-card__actions">
            {project.href && (
              <a
                className="project-button project-button--primary"
                href={project.href}
                target="_blank"
                rel="noreferrer"
              >
                {primaryLabel}
              </a>
            )}
            {project.sourceHref && (
              <a
                className="project-button project-button--secondary"
                href={project.sourceHref}
                target="_blank"
                rel="noreferrer"
              >
                Source code
              </a>
            )}
          </div>
        )}
      </div>
    </article>
  )
}

export default ProjectCard

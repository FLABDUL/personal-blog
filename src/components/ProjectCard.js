import React from "react"
import { Link } from "gatsby"

const ProjectLink = ({ href, children, ...props }) =>
  href.startsWith("/") ? (
    <Link to={href} {...props}>
      {children}
    </Link>
  ) : (
    <a href={href} target="_blank" rel="noreferrer" {...props}>
      {children}
    </a>
  )

const ProjectCard = ({ project, visual = false }) => {
  const linkLabels = {
    demo: "Live demo",
    product: "Visit product",
    source: "View source",
  }
  const linkTargets = {
    demo: "demo",
    product: "product",
    source: "source",
  }
  const primaryLabel =
    project.actionLabel || linkLabels[project.linkType] || "View project"
  const linkTarget = project.href?.startsWith("/")
    ? "case study"
    : linkTargets[project.linkType] || "project"

  return (
    <article
      className={`cv-card cv-project project-card${
        visual ? " project-card--visual" : ""
      }`}
    >
      {visual && project.image && (
        <ProjectLink
          className="project-card__media"
          href={project.href}
          aria-label={`${primaryLabel}: ${project.name}`}
        >
          <img
            src={project.image}
            alt={project.imageAlt || ""}
            loading="lazy"
          />
          <span className="project-card__media-action" aria-hidden="true">
            Open {linkTarget} ↗
          </span>
        </ProjectLink>
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
            <ProjectLink href={project.href}>
              {project.name}
            </ProjectLink>
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
              <ProjectLink
                className="project-button project-button--primary"
                href={project.href}
              >
                {primaryLabel}
              </ProjectLink>
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

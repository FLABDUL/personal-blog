import React from "react"
import { Link } from "gatsby"
import Layout from "../components/Layout"
import ProjectCard from "../components/ProjectCard"
import Seo from "../components/Seo"
import {
  development,
  education,
  engineeringWork,
  experience,
  impact,
  jumpLinks,
  overview,
  profile,
  skills,
  universityLeadership,
} from "../data/cv"

const SectionHeading = ({ children, id, intro }) => (
  <div className="cv-section__header">
    <div className="cv-section__heading">
      <h2 id={id}>{children}</h2>
    </div>
    {intro && <p className="cv-section__intro">{intro}</p>}
  </div>
)

const RoleCard = ({ role }) => (
  <article className="cv-role">
    <div className="cv-role__header">
      <div>
        <h3>{role.role}</h3>
        <p className="cv-role__company">{role.company}</p>
        <p className="cv-meta">{role.team}</p>
      </div>
      <p className="cv-role__meta">
        {role.period}
        <br />
        {role.location}
      </p>
    </div>
    {role.summary && <p className="cv-role__summary">{role.summary}</p>}
    <ul>
      {role.highlights.map(highlight => (
        <li key={highlight}>{highlight}</li>
      ))}
    </ul>
  </article>
)

export default function ExperiencePage() {
  return (
    <Layout wide>
      <article className="cv">
        <header className="cv-hero">
          <p className="cv-eyebrow">Long-form career record</p>
          <h1>{profile.name}</h1>
          <p className="cv-kicker">{profile.title}</p>
          <p className="cv-hero__summary">{profile.summary}</p>
          <div className="cv-contact" aria-label="Contact links">
            {profile.contacts.map(contact => (
              <a
                key={contact.label}
                href={contact.href}
                target={
                  contact.href.startsWith("mailto:") ? undefined : "_blank"
                }
                rel={
                  contact.href.startsWith("mailto:") ? undefined : "noreferrer"
                }
              >
                {contact.label}
              </a>
            ))}
            <button
              type="button"
              className="cv-action"
              onClick={() => window.print()}
            >
              Print / Save as PDF
            </button>
          </div>
          <div className="cv-overview" aria-label="Career overview">
            {overview.map(item => (
              <div className="cv-overview__item" key={item.value}>
                <strong>{item.value}</strong>
                <span>{item.label}</span>
              </div>
            ))}
          </div>
          <p className="cv-meta">
            A fuller record than my one-page CV or LinkedIn profile · Last
            updated {profile.updated}
          </p>
        </header>

        <nav className="cv-jump-nav" aria-label="On this page">
          <span>Jump to</span>
          {jumpLinks.map(link => (
            <a key={link.href} href={link.href}>
              {link.label}
            </a>
          ))}
        </nav>

        <section
          className="cv-section"
          aria-labelledby="professional-experience"
        >
          <SectionHeading
            id="professional-experience"
            intro="Each role is shown as its own chapter so that responsibilities, systems and progression are not compressed into a single application-sized entry."
          >
            Professional experience
          </SectionHeading>
          <div className="cv-timeline">
            {experience.map(role => (
              <RoleCard
                role={role}
                key={`${role.company}-${role.team}-${role.period}`}
              />
            ))}
          </div>
        </section>

        <section className="cv-section" aria-labelledby="engineering-work">
          <SectionHeading
            id="engineering-work"
            intro="Public projects, professional systems and internal innovation are grouped separately to show both what I built and the setting in which it mattered."
          >
            Engineering work
          </SectionHeading>
          <div className="cv-work">
            {engineeringWork.map(group => {
              const isPersonal = group.id === "independent-and-open-source"
              const items = isPersonal
                ? group.items.filter(item => item.featured)
                : group.items

              return (
                <section className="cv-work__group" key={group.title}>
                  <div className="cv-work__heading">
                    <h3>
                      {isPersonal ? "Selected personal projects" : group.title}
                    </h3>
                    <p>
                      {isPersonal
                        ? "A concise selection of public work. The Projects page includes visuals, every demo and source links."
                        : group.intro}
                    </p>
                  </div>
                  <div className="cv-grid">
                    {items.map(item => (
                      <ProjectCard project={item} key={item.id} />
                    ))}
                  </div>
                  {isPersonal && (
                    <Link className="cv-work__more cv-action" to="/projects/">
                      Explore all projects and live demos →
                    </Link>
                  )}
                </section>
              )
            })}
          </div>
        </section>

        <section className="cv-section" aria-labelledby="university">
          <SectionHeading
            id="university"
            intro="My university years combined formal engineering study, industry-linked software work and hands-on technical leadership."
          >
            University engineering
          </SectionHeading>
          <div className="cv-timeline">
            <article className="cv-role">
              <div className="cv-role__header">
                <div>
                  <h3>{education.qualification}</h3>
                  <p className="cv-role__company">{education.institution}</p>
                </div>
                <p className="cv-role__meta">{education.period}</p>
              </div>
              <ul>
                {education.details.map(detail => (
                  <li key={detail}>{detail}</li>
                ))}
              </ul>
              <dl className="cv-definition-list">
                {education.coursework.map(item => (
                  <div key={item.label}>
                    <dt>{item.label}</dt>
                    <dd>{item.value}</dd>
                  </div>
                ))}
              </dl>
            </article>
            <RoleCard
              role={{
                ...universityLeadership,
                company: universityLeadership.organisation,
                team: "SpaceX Hyperloop Pod Competition",
              }}
            />
          </div>
        </section>

        <section className="cv-section" aria-labelledby="leadership-impact">
          <SectionHeading
            id="leadership-impact"
            intro="A record of technical leadership, teaching, community work and operational responsibility alongside core software delivery."
          >
            Leadership & impact
          </SectionHeading>
          <div className="cv-grid cv-grid--three">
            {impact.map(item => (
              <article className="cv-card" key={item.title}>
                <h3>{item.title}</h3>
                <p>{item.detail}</p>
              </article>
            ))}
          </div>
        </section>

        <section
          className="cv-section"
          aria-labelledby="professional-development"
        >
          <SectionHeading
            id="professional-development"
            intro="Structured programmes and self-directed learning across software engineering, markets, cloud technology and communication."
          >
            Professional development
          </SectionHeading>
          <div className="cv-grid">
            {development.map(group => (
              <article className="cv-card" key={group.title}>
                <h3>{group.title}</h3>
                <ul>
                  {group.items.map(item => (
                    <li key={item}>{item}</li>
                  ))}
                </ul>
              </article>
            ))}
          </div>
        </section>

        <section className="cv-section" aria-labelledby="technical-skills">
          <SectionHeading
            id="technical-skills"
            intro="Current professional tools are separated from earlier academic and makerspace technologies so the depth is visible without overstating recency."
          >
            Technical skills
          </SectionHeading>
          <div className="cv-skills">
            {skills.map(skill => (
              <article className="cv-card" key={skill.category}>
                <h3>{skill.category}</h3>
                <p>{skill.detail}</p>
              </article>
            ))}
          </div>
        </section>
      </article>
    </Layout>
  )
}

export const Head = ({ location }) => (
  <Seo
    title="Experience"
    description="The long-form career record of Abdul Hakim Norazman: professional software engineering, projects, university leadership, community impact and continuing development."
    pathname={location.pathname}
  />
)

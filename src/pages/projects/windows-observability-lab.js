import React from "react"
import { Link } from "gatsby"
import Layout from "../../components/Layout"
import Seo from "../../components/Seo"

const dashboards = [
  {
    file: "pc-overview",
    title: "PC Overview",
    description:
      "A view of the whole machine: CPU activity alongside the processor queue, available memory, committed memory, paging and disk behaviour. The aim was to read related signals together before choosing where to investigate.",
    alt: "Grafana PC Overview showing synthetic CPU bursts, processor queues, memory pressure and disk activity",
  },
  {
    file: "workload-explorer",
    title: "Workload Explorer",
    description:
      "A closer look at application families. CPU, memory and I/O were grouped into categories such as browser, notes, virtual desktop and monitoring, without exposing individual process command lines.",
    alt: "Grafana Workload Explorer comparing synthetic CPU, memory and I/O across four application families",
  },
  {
    file: "incident-experiment-review",
    title: "Incident and Experiment Review",
    description:
      "A workspace for comparing a selected time window: pressure on the machine, application activity and the monitoring system's own overhead. This was intended to support experiments; the demonstration shown here does not establish a performance improvement.",
    alt: "Grafana incident review with synthetic pressure timelines, application activity, monitoring overhead and summary statistics",
  },
  {
    file: "observability-concepts",
    title: "Observability Concepts",
    description:
      "Learning notes beside working charts: gauges, counters, rates, sampling and the difference between symptoms and causes. It also made the limits explicit, including short spikes missed between samples and the cost of monitoring itself.",
    alt: "Grafana learning dashboard pairing explanations of observability concepts with synthetic charts",
  },
]

export default function ObservabilityRetrospective() {
  return (
    <Layout wide world="projects">
      <article className="engineering-study">
        <div className="study-mastline">
          <Link to="/projects/">← All projects</Link>
          <span>Windows Observability Lab / Retired project</span>
        </div>
        <header className="engineering-study__hero">
          <p className="engineering-study__eyebrow">
            Engineering retrospective · Retired project
          </p>
          <h1>Building—and retiring—a Windows observability lab</h1>
          <p className="engineering-study__disclosure">
            October–November 2026
            <br />
            Grafana · Prometheus · PowerShell
          </p>
          <p>
            I wanted to understand why my laptop sometimes took so long to
            become usable for work. I built a monitoring system to collect
            evidence over time. It worked as a learning project, but I never
            established a measured improvement to my working day. Eventually, I
            removed it.
          </p>
        </header>
        <nav className="study-index" aria-label="In this retrospective">
          <a href="#problem">
            <span>01</span> The starting point
          </a>
          <a href="#system">
            <span>02</span> What I built
          </a>
          <a href="#dashboards">
            <span>03</span> The dashboards
          </a>
          <a href="#findings">
            <span>04</span> What it showed
          </a>
          <a href="#retirement">
            <span>05</span> Why I stopped
          </a>
        </nav>
        <section className="engineering-study__intro" id="problem">
          <div>
            <h2>A snapshot was not enough</h2>
            <p>
              My normal workload combined a remote work desktop, a browser, AI
              tools and everyday background apps. Task Manager could show high
              CPU or memory use, but only while I was looking. Passing
              screenshots back and forth was a poor way to investigate an
              intermittent problem.
            </p>
            <p>
              I wanted the laptop to record what happened automatically, so I
              could review it later. The practical question was straightforward:
              what could I change to make starting work faster and more
              reliable?
            </p>
          </div>
          <div>
            <h2>Learning through a real problem</h2>
            <p>
              The project also gave me a reason to learn Grafana, Prometheus and
              observability beyond their names. I developed it with Codex, using
              PowerShell to install, validate and run the local components.
            </p>
            <p>
              That second aim was easier to satisfy. I could build dashboards,
              understand the measurements and test the system. Proving that it
              improved my laptop required a separate experiment.
            </p>
          </div>
        </section>
        <section className="study-method" id="system">
          <p className="eyebrow">The retired system</p>
          <h2>Collection, storage and presentation</h2>
          <ol
            className="engineering-study__architecture"
            aria-label="Former monitoring flow"
          >
            <li>Windows counters</li>
            <li>Local exporter</li>
            <li>Prometheus history</li>
            <li>Grafana dashboards</li>
            <li>Review and experiment</li>
          </ol>
          <p>
            The exporter exposed measurements locally. Prometheus collected them
            every thirty seconds and retained a bounded history. Grafana could
            stay closed while collection continued. I also measured the
            monitoring stack's own resource use: a diagnostic tool still
            consumes resources.
          </p>
          <p>
            Privacy shaped the design. The services listened only on the laptop,
            and the dashboards grouped selected processes into application
            families. Command lines, document names, browser history and window
            titles were outside the collection scope. A separate synthetic
            demonstration used fictional scenarios to exercise the dashboards
            without sharing personal telemetry. Its charts were demonstrations,
            not evidence about my laptop.
          </p>
        </section>
        <section
          className="engineering-study__evidence"
          id="dashboards"
          aria-labelledby="dashboards-heading"
        >
          <h2 id="dashboards-heading">The dashboards I built</h2>
          <p>
            These are original screenshots from the project's October 2026
            demonstration, recovered from the retained project discussion. They
            show the actual Grafana boards with synthetic data: the values are
            fictional, not measurements from my laptop. The images are archived
            captures, not a live dashboard.
          </p>
          {dashboards.map((dashboard, index) => {
            const src = `/projects/windows-observability-lab/${dashboard.file}.png`
            return (
              <section
                className="engineering-study__evidence-item"
                key={dashboard.file}
              >
                <div>
                  <p className="engineering-study__label">
                    Dashboard {String(index + 1).padStart(2, "0")}
                  </p>
                  <h3>{dashboard.title}</h3>
                  <p>{dashboard.description}</p>
                </div>
                <figure>
                  <img
                    src={src}
                    alt={dashboard.alt}
                    width="1600"
                    height="1000"
                    loading="lazy"
                    decoding="async"
                  />
                  <figcaption>
                    {dashboard.title} · Original Grafana capture · Synthetic
                    demonstration data · October 2026
                  </figcaption>
                  <a
                    className="engineering-study__evidence-link"
                    href={src}
                    target="_blank"
                    rel="noreferrer"
                    aria-label={`Open full-size screenshot: ${dashboard.title}`}
                  >
                    Open full-size screenshot
                  </a>
                </figure>
              </section>
            )
          })}
        </section>
        <section className="engineering-study__intro" id="findings">
          <div>
            <h2>Capturing the right event</h2>
            <p>
              One revealing failure was in the monitoring itself. I said that
              startup had happened, but the capture had missed it. What I called
              starting the laptop was sometimes resuming from sleep. A
              login-only task did not cover that event.
            </p>
            <p>
              The capture was extended to login and resume, with a
              fifteen-minute observation window. Later resume reports arrived
              successfully. This fixed a gap in the evidence; it did not fix the
              underlying slowdown.
            </p>
          </div>
          <div>
            <h2>Evidence without a confirmed remedy</h2>
            <p>
              One reviewed resume showed brief CPU saturation alongside more
              persistent pressure on available physical memory. Disk service
              times remained comparatively comfortable. Reading those signals
              together was more informative than a single high utilisation
              percentage.
            </p>
            <p>
              Browser and music-app activity suggested a possible comparison:
              delay the music app for the first fifteen minutes and repeat a
              similar work start. That remained a hypothesis. I did not complete
              a controlled before-and-after comparison or demonstrate a faster
              startup.
            </p>
          </div>
        </section>
        <section className="study-method" id="retirement">
          <h2>The useful question remained unanswered</h2>
          <p>
            I eventually asked what benefit I could take from the observations.
            The project had accumulated working infrastructure, dashboards and
            validation, but I still lacked a reliable answer about what to
            change. I had also considered richer dashboards, AWS and Kubernetes.
            Those would have added learning opportunities without resolving that
            gap.
          </p>
          <p>
            I chose to decommission the lab. Its scheduled jobs, exporter
            service, review automation, local telemetry and source files were
            removed. The retirement included checking that its processes and
            listening ports were gone, rather than simply deleting the
            dashboard.
          </p>
        </section>
        <section className="engineering-study__limitations">
          <h2>What this case study can claim</h2>
          <p>
            A working local monitoring pipeline, tested privacy boundaries and a
            repaired resume-capture workflow. It cannot claim improved startup
            performance or a confirmed cause for the original delay. This
            account is based on the retained project discussion; the original
            source and telemetry were deleted during retirement. The screenshots
            above preserve the demonstration boards only. There is no
            live lab or runnable source release behind this page.
          </p>
        </section>
        <section className="engineering-study__closing">
          <h2>Measure the outcome, too</h2>
          <p>
            Looking back, the missing step was the comparison experiment. A
            smaller project could have started with one question, one repeatable
            work-start window and one reversible change. The dashboards would
            then have had a specific decision to support. That is the part I
            would prioritise before adding another metric or another platform.
          </p>
        </section>
      </article>
    </Layout>
  )
}

export const Head = () => (
  <Seo
    title="Building—and retiring—a Windows observability lab"
    description="A retrospective on a local monitoring project: privacy, resume capture, unproven performance gains and the decision to retire it."
    pathname="/projects/windows-observability-lab/"
  />
)

import React from "react"
import { Link } from "gatsby"
import Layout from "../../components/Layout"
import Seo from "../../components/Seo"

const evidence = [
  {
    id: "backtest",
    eyebrow: "Evidence 01",
    title: "Compare against the matched baseline",
    body: "The three-stock fundamental portfolio and its equal-weight comparator used the same dates, decision schedule and starting capital. The fundamental rule returned 157.80% with a 0.67 Sharpe ratio; the comparator returned 166.27% with a 0.82 Sharpe ratio.",
    image: "/projects/backtest-library/nav-comparison.svg",
    width: 932,
    height: 498,
    alt: "NAV comparison between the point-in-time fundamental strategy and its equal-weight comparator",
    caption:
      "Derived live result: the comparator finished ahead, so the evidence is retained without an alpha claim.",
  },
  {
    id: "data-quality",
    eyebrow: "Evidence 02",
    title: "Audit the inputs before trusting the output",
    body: "A frozen twelve-company cohort was assessed against predeclared coverage, completeness, filing-timing and provenance checks. Nine companies passed; JPM, BAC and XOM failed narrow checks in the returned trial data.",
    image: "/projects/backtest-library/data-quality.svg",
    width: 668,
    height: 561,
    alt: "Data-quality audit showing pass and fail checks across a twelve-company cohort",
    caption:
      "Derived live audit: nine companies passed and three failed, exposing where broader research would need stronger controls.",
  },
]

const architecture = [
  "Bounded StockFit reads",
  "Point-in-time fact reconstruction",
  "MarketView signals",
  "Monthly portfolio decisions",
  "Derived evidence only",
]

const decisions = [
  "Filing-date gates",
  "Amendment rollback",
  "Missing facts mean ineligible",
  "Raw responses are not retained",
]

const metrics = [
  { label: "Fundamental return", value: "157.80%" },
  { label: "Comparator return", value: "166.27%" },
  { label: "Sharpe ratio", value: "0.67 vs 0.82" },
  { label: "Data-quality audit", value: "9 pass · 3 fail" },
]

export default function BacktestLibraryPage() {
  return (
    <Layout wide world="projects">
      <article className="engineering-study engineering-study--research">
        <div className="study-mastline">
          <Link to="/projects/">← All projects</Link>
          <span>Backtest Library / Research study</span>
        </div>
        <header className="engineering-study__hero">
          <p className="engineering-study__eyebrow">
            Engineering case study · Point-in-time research
          </p>
          <h1>Testing a point-in-time fundamental strategy</h1>
          <p className="engineering-study__disclosure">
            Derived live results · Raw provider data not redistributed
          </p>
          <p>
            I extended Backtest Library with a small StockFit integration that
            reconstructs annual fundamentals as they were available on each
            decision date, compares a transparent ranking rule with an
            equal-weight baseline and audits a broader cohort before treating
            its data as research-ready.
          </p>
        </header>

        <nav className="study-index" aria-label="In this study">
          <a href="#context">
            <span>01</span> The question
          </a>
          <a href="#method">
            <span>02</span> The method
          </a>
          <a href="#backtest">
            <span>03</span> The evidence
          </a>
          <a href="#limitations">
            <span>04</span> The boundaries
          </a>
        </nav>

        <section className="engineering-study__intro" id="context">
          <div>
            <h2>Timing is part of the strategy</h2>
            <p>
              A backtest can accidentally look into the future by using a fact
              before its filing date or applying a later amendment to an earlier
              decision. The integration gates original filings and rolls
              amendments back to the value known at the time.
            </p>
          </div>
          <div>
            <h2>Unfavourable results still count</h2>
            <p>
              The fundamental rule finished behind its comparator, while the
              data audit found material gaps in three companies. Keeping both
              results makes the engineering evidence more credible than a
              selectively positive performance story.
            </p>
          </div>
        </section>

        <section
          className="study-method"
          id="method"
          aria-label="Architecture and engineering decisions"
        >
          <p className="eyebrow">System / From source to evidence</p>
          <ol
            className="engineering-study__architecture"
            aria-label="Architecture flow"
          >
            {architecture.map(item => (
              <li key={item}>{item}</li>
            ))}
          </ol>
          <ul
            className="engineering-study__decisions"
            aria-label="Engineering decisions"
          >
            {decisions.map(item => (
              <li key={item}>{item}</li>
            ))}
          </ul>
        </section>

        <dl className="study-results" aria-label="Results">
          {metrics.map(metric => (
            <div key={metric.label}>
              <dt>{metric.label}</dt>
              <dd>{metric.value}</dd>
            </div>
          ))}
        </dl>

        <section
          className="engineering-study__evidence"
          aria-label="Research evidence"
        >
          {evidence.map(item => (
            <section
              className="engineering-study__evidence-item"
              key={item.id}
              id={item.id}
            >
              <div>
                <p className="engineering-study__label">{item.eyebrow}</p>
                <h2>{item.title}</h2>
                <p>{item.body}</p>
              </div>
              <figure>
                <img
                  src={item.image}
                  alt={item.alt}
                  width={item.width}
                  height={item.height}
                  loading="lazy"
                  decoding="async"
                />
                <figcaption>{item.caption}</figcaption>
                <a
                  className="engineering-study__evidence-link"
                  href={item.image}
                  aria-label={`Open full-size evidence: ${item.title}`}
                  target="_blank"
                  rel="noreferrer"
                >
                  Open full-size evidence
                </a>
              </figure>
            </section>
          ))}
        </section>

        <section className="engineering-study__limitations" id="limitations">
          <h2>What this does not claim</h2>
          <p>
            This is not evidence of investment alpha. The backtest uses three
            current tickers and omits costs, spread, slippage, liquidity, taxes
            and market impact. The twelve-company audit cannot certify
            provider-wide quality, and neither cohort reconstructs a historical
            investment universe.
          </p>
        </section>

        <section>
          <h2>Engineering takeaway</h2>
          <p>
            Data timing and data quality belong inside strategy logic. Narrow
            interfaces and pure transformations make restatements, missing facts
            and incomplete sector coverage testable without repeated live calls,
            while a matched comparator keeps the result interpretable.
          </p>
        </section>

        <section className="engineering-study__closing">
          <h2>Research credibility starts with visible constraints.</h2>
          <div>
            <a
              className="project-button project-button--primary"
              href="https://github.com/FLABDUL/backtest-lib"
              target="_blank"
              rel="noreferrer"
            >
              View source code
            </a>{" "}
            <Link
              className="project-button project-button--secondary"
              to="/experience/"
            >
              View experience
            </Link>
          </div>
        </section>
      </article>
    </Layout>
  )
}

export const Head = ({ location }) => (
  <Seo
    title="Backtest Library Point-in-Time Research Case Study"
    description="A case study of filing-date-aware fundamental signals, matched backtest comparison and a predeclared StockFit data-quality audit."
    pathname={location.pathname}
  />
)

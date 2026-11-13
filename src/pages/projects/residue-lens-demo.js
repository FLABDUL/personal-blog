import React, { useEffect, useState } from "react"
import { Link } from "gatsby"
import Layout from "../../components/Layout"
import Seo from "../../components/Seo"
import foods from "../../data/residue-demo.json"
import "../../styles/residue-demo.css"

const metrics = {
  detectedPct: ["Any residue", "Samples with at least one quantified residue."],
  residueFreePct: [
    "No quantified residue",
    "Samples with no residue quantified by the monitoring programme; this does not mean absolute absence.",
  ],
  multiplePct: [
    "Multiple residues",
    "Samples with more than one quantified residue.",
  ],
  aboveMrlPct: [
    "Above MRL",
    "Samples above a maximum residue level. MRLs are regulatory limits, not direct toxicity thresholds.",
  ],
  medianResidues: [
    "Median residue count",
    "Median number of quantified residues per sample. Chemicals and concentrations are not added together.",
  ],
}
const titles = {
  detectedPct: "Samples with residues detected",
  residueFreePct: "Samples with no quantified residue",
  multiplePct: "Samples with multiple residues",
  aboveMrlPct: "Above MRL",
  medianResidues: "Typical residue count per sample",
}
const priorityLabels = {
  lower: "Lower",
  moderate: "Moderate",
  higher: "Higher",
}
// Frozen bands come from the original rankPriorityBands function and the full UK catalogue.
const artwork = food => (
  <img
    src={`/projects/residue-lens/food-art/${food.id}.svg`}
    alt=""
    width="56"
    height="56"
  />
)

export default function ResidueDemo() {
  const [ready, setReady] = useState(false)
  const [selected, setSelected] = useState(["grapes", "broccoli", "garlic"])
  const [metric, setMetric] = useState("detectedPct")
  const [cohort, setCohort] = useState("conventional")
  const [saved, setSaved] = useState([])
  const [focused, setFocused] = useState("grapes")
  useEffect(() => {
    setReady(true)
  }, [])
  const toggle = (id, items, setter) =>
    setter(items.includes(id) ? items.filter(x => x !== id) : [...items, id])
  const ordered = foods
    .filter(food => selected.includes(food.id))
    .sort((a, b) => b[cohort][metric] - a[cohort][metric])
  const maximum =
    metric === "medianResidues"
      ? Math.max(1, ...ordered.map(food => food[cohort][metric]))
      : 100
  const detail = ordered.find(food => food.id === focused) || ordered[0]
  const format = value =>
    `${value.toLocaleString("en-GB", { maximumFractionDigits: 1 })}${metric === "medianResidues" ? "" : "%"}`
  return (
    <Layout wide world="projects">
      <article className="residue-demo">
        <div className="residue-demo__masthead">
          <span className="residue-demo__brand">
            <svg
              viewBox="0 0 120 120"
              width="43"
              height="43"
              aria-hidden="true"
            >
              <circle
                cx="48"
                cy="48"
                r="31"
                fill="none"
                stroke="#0d4f3c"
                strokeWidth="8"
              />
              <path
                d="M70 70 101 101"
                stroke="#0d4f3c"
                strokeWidth="10"
                strokeLinecap="round"
              />
              <path
                d="M34 55c2-18 14-27 31-26-1 18-11 29-31 26Z"
                fill="#0d4f3c"
              />
              <path
                d="M39 51c8-2 14-7 20-15-4 10-10 17-20 20Z"
                fill="#fffaf0"
              />
              <circle cx="74" cy="24" r="6" fill="#e1a33d" />
            </svg>
            Residue Lens
          </span>
          <nav aria-label="Demo navigation">
            <a href="#residue-comparison">Compare</a>
            <a href="#residue-shortlist">My list</a>
            <Link to="/projects/residue-lens/">Case study</Link>
          </nav>
          <span className="residue-demo__badge">Interactive archive</span>
        </div>
        <header className="residue-demo__intro">
          <p className="residue-demo__eyebrow">Interactive comparison</p>
          <h1>Choose foods. Change the question.</h1>
          <p>
            Try the core comparison with ten foods from the original UK dataset.
            This is a frozen demonstration of the retired product, not an
            updated shopping service.
          </p>
        </header>
        <div className="residue-demo__explorer" id="residue-comparison">
          <fieldset className="residue-demo__picker" disabled={!ready}>
            <legend>Choose foods to compare</legend>
            <p>
              {selected.length} of {foods.length} selected
            </p>
            <div className="residue-demo__choices">
              {foods.map(food => (
                <label key={food.id} data-selected={selected.includes(food.id)}>
                  <input
                    type="checkbox"
                    checked={selected.includes(food.id)}
                    onChange={() => toggle(food.id, selected, setSelected)}
                  />
                  {artwork(food)}
                  <span>{food.name}</span>
                </label>
              ))}
            </div>
          </fieldset>
          <div className="residue-demo__panel">
            <div className="residue-demo__controls">
              <div className="residue-demo__measures">
                <span className="residue-demo__eyebrow">Compare by</span>
                <div
                  className="residue-demo__tabs"
                  role="group"
                  aria-label="Comparison measures"
                >
                  {Object.entries(metrics).map(([key, [label]]) => (
                    <button
                      key={key}
                      disabled={!ready}
                      aria-pressed={metric === key}
                      onClick={() => setMetric(key)}
                    >
                      {label}
                    </button>
                  ))}
                </div>
              </div>
              <label>
                Growing method{" "}
                <select
                  disabled={!ready}
                  value={cohort}
                  onChange={e => setCohort(e.target.value)}
                >
                  <option value="conventional">Standard-grown</option>
                  <option value="organic">Organic</option>
                </select>
              </label>
            </div>
            <section aria-label="Comparison results" aria-live="polite">
              <div className="residue-demo__chart-heading">
                <p className="residue-demo__eyebrow">
                  {cohort === "conventional" ? "Standard-grown" : "Organic"}{" "}
                  food
                </p>
                <h2>{titles[metric]}</h2>
                <p>{metrics[metric][1]}</p>
              </div>
              <div className="residue-demo__scale" aria-hidden="true">
                <span>0</span>
                <span>{format(maximum / 2)}</span>
                <span>{format(maximum)}</span>
              </div>
              {selected.length === 0 && (
                <p>Choose a food above to see its monitoring results.</p>
              )}
              {ordered.map(food => {
                const result = food[cohort]
                const band =
                  cohort === "conventional"
                    ? food.priorityBands[metric]
                    : "lower"
                return (
                  <button
                    key={food.id}
                    disabled={!ready}
                    className="residue-demo__row"
                    aria-pressed={detail?.id === food.id}
                    aria-label={`Show ${food.name} evidence`}
                    aria-describedby={`residue-${food.id}-samples residue-${food.id}-value`}
                    onClick={() => setFocused(food.id)}
                  >
                    <span className="residue-demo__food">
                      <span>
                        {artwork(food)}
                        <strong>{food.name}</strong>
                      </span>
                      <small id={`residue-${food.id}-samples`}>
                        United Kingdom · {food.year} · n={result.samples}
                      </small>
                    </span>
                    {result.samples > 0 ? (
                      <>
                        <span
                          className="residue-demo__track"
                          aria-hidden="true"
                        >
                          <span
                            data-priority={band}
                            style={{
                              width: `${(result[metric] / maximum) * 100}%`,
                            }}
                          />
                        </span>
                        <span
                          className="residue-demo__value"
                          id={`residue-${food.id}-value`}
                        >
                          <strong>{format(result[metric])}</strong>
                          <small>
                            {cohort === "conventional"
                              ? `${priorityLabels[band]} organic-buying priority`
                              : "Organic samples"}
                          </small>
                        </span>
                      </>
                    ) : (
                      <span
                        className="residue-demo__unavailable"
                        id={`residue-${food.id}-value`}
                      >
                        No samples in this cohort. A value is not available.
                      </span>
                    )}
                  </button>
                )
              })}
              {cohort === "conventional" ? (
                <div
                  className="residue-demo__legend"
                  aria-label="Organic-buying priority colours"
                >
                  <div>
                    {Object.entries(priorityLabels).map(([band, label]) => (
                      <span key={band}>
                        <i data-priority={band} aria-hidden="true" />
                        {label} organic-buying priority
                      </span>
                    ))}
                  </div>
                  <p>
                    Priority reflects monitoring patterns and sample
                    coverage—not health risk, nutritional value, price or an
                    instruction to buy organic.
                  </p>
                  <p>
                    Colours use the full archived UK catalogue as their
                    reference, so removing a food does not change the other
                    foods’ bands.
                  </p>
                </div>
              ) : (
                <p className="residue-demo__legend">
                  Organic samples are shown separately in green. Small samples
                  do not establish a reliable difference from standard-grown
                  foods.
                </p>
              )}
              <p className="residue-demo__hint">
                Select a bar to inspect its evidence. Programmes, regions and
                years are not pooled.
              </p>
            </section>
          </div>
        </div>
        {detail && (
          <section
            className="residue-demo__evidence"
            aria-label="Selected food evidence"
          >
            <div>
              <p className="residue-demo__eyebrow">Behind the bar</p>
              <h2>{detail.name}: the evidence</h2>
              <p>
                {detail.year} · {detail.period} · {detail[cohort].samples}{" "}
                {cohort === "conventional" ? "standard-grown" : "organic"}{" "}
                samples
              </p>
              {detail[cohort].samples > 0 && detail[cohort].samples < 30 && (
                <p>Small sample: interpret cautiously.</p>
              )}
            </div>
            <div className="residue-demo__actions">
              <a href={detail.sourceUrl}>Original monitoring workbook ↗</a>
              <button
                disabled={!ready}
                aria-pressed={saved.includes(detail.id)}
                onClick={() => toggle(detail.id, saved, setSaved)}
              >
                {saved.includes(detail.id)
                  ? "Remove from shortlist"
                  : "Save to shortlist"}
              </button>
            </div>
          </section>
        )}
        <aside aria-label="Demo shortlist" id="residue-shortlist">
          <h2>Your demo shortlist</h2>
          {saved.length ? (
            <ul className="residue-demo__saved">
              {saved.map(id => {
                const food = foods.find(x => x.id === id)
                return (
                  <li key={id}>
                    {artwork(food)}
                    {food.name}
                  </li>
                )
              })}
            </ul>
          ) : (
            <p>Save a food from the comparison to start a shortlist.</p>
          )}
          <p>Held in this page only; refreshing resets it.</p>
        </aside>
        <footer>
          <h2>Keep the evidence in context</h2>
          <p>
            A detected residue does not automatically mean a food is unsafe.
            Different survey years and sample sizes are shown separately; the
            results are not a health-risk ranking or medical advice.
          </p>
          <p>
            Frozen from the archived dataset on 13 November 2026, covering these
            foods’ latest included surveys in 2024–2026. Targeted monitoring
            does not represent every item on sale.
          </p>
          <p>
            Source:{" "}
            <a href="https://www.data.gov.uk/dataset/5d5028ef-9918-4ab7-8755-81f3ad06f308/pesticide-residues-in-food">
              UK pesticide-residue monitoring
            </a>
            . Contains public sector information licensed under the{" "}
            <a href="https://www.nationalarchives.gov.uk/doc/open-government-licence/version/3/">
              Open Government Licence v3.0
            </a>
            .
          </p>
          <a href="https://github.com/FLABDUL/residue-lens">
            Explore the source on GitHub →
          </a>
        </footer>
      </article>
    </Layout>
  )
}

export const Head = ({ location }) => (
  <Seo
    title="Residue Lens Interactive Demo"
    description="Try a frozen demonstration of Residue Lens: compare foods, inspect sample sizes and build a temporary shortlist."
    pathname={location.pathname}
  />
)

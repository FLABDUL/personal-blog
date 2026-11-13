import React, { useEffect, useState } from "react"
import { Link } from "gatsby"
import Layout from "../../components/Layout"
import Seo from "../../components/Seo"
import foods from "../../data/residue-demo.json"
import "../../styles/residue-demo.css"

const metrics = {
  detectedPct: ["Any quantified residue", "Samples with at least one quantified residue."],
  residueFreePct: ["No quantified residue", "Samples with no residue quantified by the monitoring programme; this does not mean absolute absence."],
  multiplePct: ["Multiple residues", "Samples with more than one quantified residue."],
  aboveMrlPct: ["Above MRL", "Samples above a maximum residue level. MRLs are regulatory limits, not direct toxicity thresholds."],
}

export default function ResidueDemo() {
  const [ready, setReady] = useState(false)
  const [selected, setSelected] = useState(["grapes", "broccoli", "garlic"])
  const [metric, setMetric] = useState("detectedPct")
  const [cohort, setCohort] = useState("conventional")
  const [saved, setSaved] = useState([])
  useEffect(() => { setReady(true) }, [])
  const toggle = (id, items, setter) => setter(items.includes(id) ? items.filter(x => x !== id) : [...items, id])
  return <Layout wide world="projects">
    <article className="residue-demo">
      <Link to="/projects/residue-lens/">← Read the case study</Link>
      <header>
        <p className="eyebrow">Residue Lens · Interactive archive</p>
        <h1>Choose foods. Change the question.</h1>
        <p>Try the core comparison with ten foods from the original UK dataset. This is a frozen demonstration of the retired product, not an updated shopping service.</p>
      </header>
      <fieldset disabled={!ready}>
        <legend>Choose foods to compare</legend>
        <div className="residue-demo__choices">{foods.map(food => <label key={food.id}>
          <input type="checkbox" checked={selected.includes(food.id)} onChange={() => toggle(food.id, selected, setSelected)} /> {food.name}
        </label>)}</div>
      </fieldset>
      <div className="residue-demo__controls">
        <label>Compare by <select disabled={!ready} value={metric} onChange={e => setMetric(e.target.value)}>{Object.entries(metrics).map(([key, [label]]) => <option key={key} value={key}>{label}</option>)}</select></label>
        <label>Growing method <select disabled={!ready} value={cohort} onChange={e => setCohort(e.target.value)}><option value="conventional">Standard-grown</option><option value="organic">Organic</option></select></label>
      </div>
      <section aria-label="Comparison results" aria-live="polite">
        <h2>{metrics[metric][0]}</h2><p>{metrics[metric][1]}</p>
        {selected.length === 0 && <p>Choose a food above to see its monitoring results.</p>}
        {selected.map(id => {
          const food = foods.find(x => x.id === id)
          const result = food[cohort]
          return <article key={id} className="residue-demo__row">
            <h3>{food.name}</h3>
            <p>UK · {food.year} · {food.period} · {result.samples} samples</p>
            {result.samples > 0 ? <>
              <div className="residue-demo__track" aria-hidden="true"><span style={{ width: `${result[metric]}%` }} /></div>
              <strong>{result[metric]}%</strong>
              {result.samples < 30 && <p className="residue-demo__small">Small sample: interpret cautiously.</p>}
            </> : <p>No samples in this cohort. A percentage is not available.</p>}
            <div className="residue-demo__actions"><a href={food.sourceUrl}>Original monitoring workbook</a><button disabled={!ready} aria-pressed={saved.includes(id)} onClick={() => toggle(id, saved, setSaved)}>{saved.includes(id) ? "Remove from shortlist" : "Save to shortlist"}</button></div>
          </article>
        })}
      </section>
      <aside aria-label="Demo shortlist"><h2>Your demo shortlist</h2><p>{saved.length ? saved.map(id => foods.find(x => x.id === id).name).join(", ") : "Save a food from the comparison to start a shortlist."}</p><p>Held in this page only; refreshing resets it.</p></aside>
      <footer>
        <h2>Keep the evidence in context</h2>
        <p>A detected residue does not automatically mean a food is unsafe. Different survey years and sample sizes are shown separately; the results are not a health-risk ranking or medical advice.</p>
        <p>Frozen from the archived dataset on 13 November 2026, covering these foods’ latest included surveys in 2024–2026. Targeted monitoring does not represent every item on sale.</p>
        <p>Source: <a href="https://www.data.gov.uk/dataset/5d5028ef-9918-4ab7-8755-81f3ad06f308/pesticide-residues-in-food">UK pesticide-residue monitoring</a>. Contains public sector information licensed under the <a href="https://www.nationalarchives.gov.uk/doc/open-government-licence/version/3/">Open Government Licence v3.0</a>.</p>
        <a href="https://github.com/FLABDUL/residue-lens">Explore the source on GitHub →</a>
      </footer>
    </article>
  </Layout>
}

export const Head = ({ location }) => <Seo title="Residue Lens Interactive Demo" description="Try a frozen demonstration of Residue Lens: compare foods, inspect sample sizes and build a temporary shortlist." pathname={location.pathname} />

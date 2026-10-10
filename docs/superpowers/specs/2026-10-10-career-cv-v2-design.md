# Career CV v2 Design

## Outcome

Create a reviewable Career CV v2 system inside the public personal-blog repository. The system must produce a strong two-page Senior Backend/Platform master CV and a one-page comparison from the existing canonical career record, while keeping the Experience page and all generated documents consistent.

## Evidence and privacy

- `content/cv/master.json` remains the public source of truth.
- Morgan Stanley claims must be traceable to the supplied October 2026 screenshots. Items 1-9 were assigned to Hakim in Jira; the user separately confirmed items 10-13 are theirs.
- Production, UAT, load-test and not-yet-production qualifiers must remain explicit. Scope and ownership must not be broadened.
- Internal names, Jira keys, fund/client identifiers and raw screenshots must not enter the public repository.
- The stored-procedure achievement may say Hakim led adoption, never that he built the procedures.
- Private contact data stays in ignored `content/cv/private.local.json` or `CV_MOBILE`.

## CV products

- `master-v2`: two A4 pages, focused on senior backend/platform engineering, with quantified Morgan Stanley work, selected earlier experience, and verified personal projects.
- `swe`: one A4 page retained as the comparison CV, updated from the same evidence.
- Variant files select stable evidence/project IDs. The generator must reject missing, unsafe or unconfirmed references.
- The existing LaTeX/Tectonic visual language remains the baseline; no Word conversion is introduced.

## Project selection

Use only claims verified against connected GitHub repository contents. Prioritise:

- Residue Lens: Next.js/TypeScript and Python data import/validation across official UK, US and EU monitoring programmes.
- Period Place: Next.js/TypeScript, libSQL/Turso, MapLibre, moderation, audit history and guarded environment/data operations.
- Budget V2: Python/PostgreSQL, immutable evidence, idempotent provider refresh, deterministic reconciliation, guarded delivery and backup/restore verification.
- Dependency Agent: Python/FastAPI developer tooling that diagnoses a bounded Maven/SLF4J failure from source evidence and produces a minimal verified patch.

Do not imply these projects are broader than their repositories demonstrate.

## Snapshots and publication boundary

- An application snapshot contains the exact variant JSON, generated LaTeX, PDF, manifest and SHA-256 hashes in a dated ignored directory.
- Snapshot creation must fail rather than overwrite an existing snapshot.
- Generated PDFs and private contact data remain ignored and are never committed.
- The branch and draft pull request are review artefacts only. Do not merge, deploy, publish the website or submit applications.

## Verification

- Validate schema, stable IDs, evidence references, allowed statuses and variant references.
- Unit-test evidence hydration, variant generation, page-count enforcement and no-overwrite snapshots.
- Compile both PDFs with Tectonic, require exactly two pages for `master-v2` and one page for `swe`, extract text, and compare source/PDF claims.
- Render every page to PNG and visually inspect for clipping, overlap, broken glyphs and weak page transitions.
- Run the repository tests and production Gatsby build.
- Review the whole branch before pushing and creating the draft PR.

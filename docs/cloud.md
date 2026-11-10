# Cloud development and context

Use repository `FLABDUL/personal-blog` with Node.js 24 (also specified in
`.nvmrc`). The Cloud setup command is `bash scripts/cloud/setup.sh`.
The verification command is `bash scripts/cloud/verify.sh`.

For a phone-accessible development preview, run
`npm run serve -- --host 0.0.0.0 --port 9000` after building and use the Cloud
interface's supported port preview. `localhost` on a phone is the phone itself.
If this Cloud interface has no port preview, use the existing Vercel branch
preview workflow. Access protection remains enabled.

For local browser checks, install Chromium with `npx playwright install chromium`
and run `npm run test:smoke`. The Playwright configuration starts its own local
server. Read `tests/smoke/AGENTS.md` before editing those tests. A Cloud preview
does not establish that the website has been released to production.

## Resume context

- `README.md`: canonical CV, bookshelf, website and PDF workflows.
- `docs/reinvention/HANDOFF.md`: the Collected Works redesign, selected identity,
  review evidence, original laptop worktree and preview branch.
- `content/cv/master.json`: public career record, with variants under
  `content/cv/variants/`.
- `content/books.json`: canonical bookshelf.
- `docs/cloud-status.md`: dated Cloud setup verification and remaining work.

The redesign hand-off identifies branch `codex/madebyhakim-reinvention` and the
laptop worktree `C:/Users/hakim/.codex/worktrees/madebyhakim-reinvention/personal-blog`.
Read that hand-off before continuing redesign work. Its dated release status
must be checked against current GitHub and Vercel state.

The original ChatGPT/Codex chat URL is not recorded here. On the laptop, search
chat history for `madebyhakim`, `Collected Works` or
`codex/madebyhakim-reinvention`; these are search terms, not verified chat titles.
Suggested Cloud environment label: **Website — personal-blog**. This label is
a recommendation; repository setup does not create or rename a ChatGPT Project.

## Private and laptop-only files

Cloud checkouts include pushed Git files. Uncommitted laptop changes, ignored
CV inputs, generated PDFs and other local worktrees are separate.
Use public content for the initial Cloud setup. PDF compilation needs a separate
Linux Tectonic installation: `npm run cv:setup-pdf` currently invokes PowerShell.
Keep private contact details in environment secrets or ignored local inputs.

Keep each task on its own branch and record the result and next action in the
repository. Merging into `main` can publish the site through the existing
deployment integration, so a Cloud setup task should remain on its review branch.

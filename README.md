# madebyhakim.com

Abdul Hakim Norazman's Gatsby website, deployed to Vercel from this GitHub
repository.

## Master CV

The canonical career record is:

[`content/cv/master.json`](content/cv/master.json)

It feeds the website's `/experience/` page and the generated Markdown exports.
Do not edit `src/data/cv.js`; that file is only the adapter used by the Gatsby
page.

Each reusable record has:

- A stable `id`, which should not change when wording changes.
- An `includeInBrief` flag controlling whether it appears in the concise
  export.
- The content displayed on the website or in generated CVs.

Only public information belongs in `master.json`. This repository is public, so
hiding a field in the UI would not make it private.

### Quick browser-based update

1. Open `content/cv/master.json` on GitHub.
2. Select the pencil icon or open it in `github.dev`.
3. Edit the relevant record and update `profile.updated`.
4. Commit to a new branch.
5. Review the Vercel preview.
6. Merge the branch into `main` to publish it.

Vercel automatically builds branch previews and deploys `main` to the live
domain.

### Local update

```powershell
npm run cv:validate
npm run cv:generate
npm run build
```

`npm run build` refuses to continue when the master record is invalid and
regenerates both CV exports before building the site. This means an edit made
entirely through GitHub can still deploy without running anything locally.

Generated local outputs (ignored by Git because they are reproducible):

- `cv-exports/full-cv.md` contains the complete career record.
- `cv-exports/brief-cv.md` contains records selected with `includeInBrief`.

## Compare existing or new CV files

The comparison command accepts a DOCX, PDF, Markdown or plain-text file, or a
folder containing those formats:

```powershell
npm run cv:compare -- "C:\Users\hakim\OneDrive\Documents\career"
```

The command:

- Runs locally and does not upload CV files.
- Never edits `master.json`.
- Extracts substantial text from supported files.
- Compares it with the master record.
- Writes possible additions or conflicting wording to
  `cv-reports/latest.md`.

The reports directory is ignored by Git because source CVs and reports may
contain private information. Review suggestions manually before adding public
facts to the master record.

## Development

```powershell
npm install
npm run develop
```

The local site is normally available at `http://localhost:8000`.

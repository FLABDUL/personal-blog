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

`npm run build` validates the master record and regenerates both CV exports
before building the site. This means an edit made entirely through GitHub can
still deploy without committing generated files.

### From CV edit to the live website

1. Create a branch from `main`.
2. Update `content/cv/master.json` and `profile.updated`.
3. Push the branch and review its Vercel preview, especially `/experience/`.
4. Merge the branch into `main` when the preview is correct.
5. Vercel builds `main` and publishes the updated Experience page to
   `madebyhakim.com` automatically.

The website imports the master CV directly. There is no second website copy to
update, and `cv-exports/` remains untracked because Vercel recreates it during
every clean build.

Generated local outputs (ignored by Git because they are reproducible):

- `cv-exports/full-cv.md` contains the complete career record.
- `cv-exports/brief-cv.md` contains records selected with `includeInBrief`.

## Generate the software-engineering CV PDF

The SWE CV is generated from the same master record using the selection and
layout rules in `content/cv/variants/swe.json`. The generated LaTeX retains the
one-page A4 design from the original Overleaf project, but Overleaf is no
longer required for routine updates.

Private contact data is deliberately separate from the public master record.
For the initial setup:

```powershell
Copy-Item content/cv/private.local.example.json content/cv/private.local.json
```

Add the real mobile number to `private.local.json`. The file is ignored by Git.
Alternatively, set `CV_MOBILE` in the environment for one build.

Install the pinned, checksum-verified Tectonic compiler once:

```powershell
npm run cv:setup-pdf
```

Then generate the LaTeX and compile the PDF with one command:

```powershell
npm run cv:pdf
```

Outputs:

- `cv-exports/latex/abdul-hakim-norazman-swe-cv.tex`
- `output/pdf/abdul-hakim-norazman-swe-cv.pdf`

Both outputs are ignored because the generated document may contain private
contact information. To update the CV:

1. Edit `content/cv/master.json`.
2. Adjust `content/cv/variants/swe.json` only when the one-page selection or
   emphasis should change.
3. Run `npm run cv:pdf`.
4. Review the generated PDF before sending it.

The generated `.tex` can still be copied into Overleaf for collaborative
editing or comparison, but edits made only in Overleaf will not update the
master record and will be overwritten by the next generation.

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

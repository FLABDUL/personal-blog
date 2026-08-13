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

## Bookshelf

The canonical bookshelf record is [`content/books.json`](content/books.json).
The website reads this file directly, so there is no generated copy to update.
Books are displayed newest first using their `added` date; keep existing stable
IDs unchanged when editing titles or authors.

To add a book:

1. Save an optimized portrait cover in `static/books/` using a lowercase,
   hyphenated filename such as `my-book.jpg`. If a cover is not yet available,
   omit the `cover` field and the page will show a text fallback.
2. Add a record to `content/books.json` with a unique `id`, `title`, `author`,
   ISO `added` date, one of the established recruiter-friendly `category`
   values and an optional `/books/...` cover path.
3. Run `npm run books:validate`.
4. Run `npm run build` and review `/bookshelf/` in the Vercel preview.
5. Merge the branch into `main` to publish it.

The validator rejects malformed records, duplicate IDs/books, missing categories
and missing cover paths. It warns about books using the fallback and
unreferenced files in the cover directory. The production build runs this
validation automatically.

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

### Where the generated CV is saved

The finished PDF is saved inside this project at:

`output/pdf/abdul-hakim-norazman-swe-cv.pdf`

On the current Windows machine, the full path is:

`C:\Users\hakim\OneDrive\Documents\Coding\personal-blog\output\pdf\abdul-hakim-norazman-swe-cv.pdf`

The generated LaTeX source is saved at:

`cv-exports/latex/abdul-hakim-norazman-swe-cv.tex`

The PDF compilation log is stored beside the PDF in `output/pdf/`. Running
`npm run cv:pdf` again overwrites the generated `.tex`, `.pdf` and `.log` with
the latest version.

These generated files are ignored by Git because the PDF and LaTeX may contain
private contact information. The project is inside OneDrive, but the generated
files are not deployed to the website or stored in GitHub. When using the CV
for an application, copy the finished PDF into the relevant application folder
and rename that copy if a dated or company-specific snapshot is needed.

Do not edit the generated PDF or LaTeX as the source of truth. The next build
will overwrite those edits.

### Future CV update checklist

For a normal career update that should appear on both the website and CV:

1. Create a branch from the latest `main` branch.
2. Edit the relevant record in `content/cv/master.json`.
3. Update `profile.updated` in `master.json`.
4. Run `npm run cv:validate` to check the master record.
5. Run `npm run cv:pdf` to regenerate the one-page SWE CV.
6. Open `output/pdf/abdul-hakim-norazman-swe-cv.pdf` and check its wording,
   page count and layout.
7. Run `npm run build` to verify the website and regenerate its CV exports.
8. Commit and push the branch, then review the Vercel preview of `/experience/`.
9. Merge into `main` to deploy the website update.
10. Copy the finished PDF to the relevant application folder when needed.

If the new master-record content does not fit the one-page CV, edit
`content/cv/variants/swe.json`. This file decides which master-record bullets
are selected, combined or emphasised in the SWE version. Removing a point from
the SWE variant does not remove it from the master record or website.

For CV-only tailoring, such as changing the summary, selecting different
achievements or changing emphasis, edit `content/cv/variants/swe.json` and run
`npm run cv:pdf`. The website changes only when `master.json` changes.

For a private mobile-number change, edit
`content/cv/private.local.json` and run `npm run cv:pdf`. Never commit that file.
Public contact details such as the email address and LinkedIn URL remain in
`master.json` because the public website uses them.

To create another generated CV version, copy `content/cv/variants/swe.json` to
a new file such as `content/cv/variants/backend.json`, give it a unique `id` and
`outputFile`, then tailor its selections. Generate it with:

```powershell
npm run cv:validate
node scripts/cv/generate-latex.js --variant backend
node scripts/cv/compile-pdf.js --variant backend
```

The new PDF will use its configured `outputFile` and appear in `output/pdf/`.

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

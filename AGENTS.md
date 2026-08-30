# madebyhakim.com repository contract

This Gatsby repository powers the public `madebyhakim.com` website and deploys through Vercel. Keep public website data, private CV data, generated outputs, and deployment actions clearly separated.

## Sources of truth

- `content/cv/master.json` is the public career source of truth. Do not edit generated CV exports or `src/data/cv.js` as source data.
- `content/cv/variants/*.json` controls generated CV selection and emphasis.
- `content/books.json` is the bookshelf source of truth; keep stable IDs unchanged.
- Never commit `content/cv/private.local.json`, generated PDFs, CV comparison inputs or reports, local logs, credentials, or other private data.
- Do not invent personal experience, employment facts, opinions, book completion, or biographical details. Mark missing input and ask Hakim.

## Change rules

- Preserve existing content tone and use British English for new prose unless the subject requires otherwise.
- Keep changes scoped to the requested site, content, CV, or bookshelf task.
- Do not merge, deploy, publish, or modify production settings unless explicitly requested.
- Treat Vercel previews as review environments; production follows `main`.

## Verification

- Bookshelf changes: run `npm run books:validate` and `npm run build`.
- Public CV data changes: run `npm run cv:validate`, `npm run cv:check`, and `npm run build`.
- Generated CV/PDF changes: run `npm run cv:validate` and `npm run cv:pdf`, then visually inspect the generated PDF.
- General website changes: run `npm run build`; use a browser check for affected pages when practical.
- Formatting-only work may use `npm run format`, but do not reformat unrelated files.


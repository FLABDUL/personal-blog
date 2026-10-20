# Morning hand-off — Collected Works

All four requested stages are done: audit and competing directions; selected site-wide direction; integrated implementation; desktop/mobile critique and refinement. Production release is not started and requires Hakim's separate decision.

## Open the candidate

- Integrated Preview: https://personal-blog-git-codex-madebyhakim-re-aabbd1-flabduls-projects.vercel.app/
- Review hub: https://personal-blog-git-codex-madebyhakim-re-aabbd1-flabduls-projects.vercel.app/review/
- Alternative About: https://personal-blog-git-codex-madebyhakim-re-aabbd1-flabduls-projects.vercel.app/review/about-table/
- Alternative Studio: https://personal-blog-git-codex-madebyhakim-re-aabbd1-flabduls-projects.vercel.app/review/studio-daylight/

These branch Preview links retain the project's existing Vercel authentication protection. The chat hand-off includes the final immutable deployment URL and commit ID.

## Revision and boundaries

- Repository: FLABDUL/personal-blog.
- Branch: codex/madebyhakim-reinvention.
- Worktree: C:/Users/hakim/.codex/worktrees/madebyhakim-reinvention/personal-blog.
- Baseline and unchanged production SHA: df581f093488c90fe6e79f3a5d8cd00c5befb48c.
- Integrated design commit: 3cdf00ff2caffd1b619c8f18518220c8ff360cd2.
- The branch also includes the final Studio image/mobile-order refinement and a clean-build correction.
- Vercel project: personal-blog (prj_Gl1jBuHyYujIwyRAOxJDmayrvINp), flabduls-projects.
- Configured production branch: main. Protection: prod_deployment_urls_and_all_previews.
- Only the isolated branch was pushed. No merge, promotion, production deployment, domain change or protection change.
- The dirty main checkout and other unfinished worktrees remain untouched. In particular, the unpublished Windows Observability Lab and private Studio intake were not included.

## Design decision and page-by-page work

Collected Works uses the content itself to establish each setting. Shared navigation, a compact m/h monogram, editorial display typography, readable text, caption styling and restrained motion keep the portfolio recognisable. It avoids depending on fictional rooms, stock artwork or interaction puzzles.

| Page       | Candidate                                                                                                                                                           |
| ---------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| About      | Large, direct editorial introduction, existing portrait and painting detail, a six-section index, original factual biography.                                       |
| Blog       | Warm journal hierarchy and ruled article rows, retaining posts, dates, categories and destinations.                                                                 |
| Projects   | Ink-blue, alternating image/text rows with clear product and case-study links.                                                                                      |
| Experience | Sage career ledger, chronology, quieter evidence, retained section navigation, links and print action.                                                              |
| Studio     | Dark exhibition of nine published paintings, varied scale, a painting-led mobile opening, responsive image sizes and keyboard/touch lightbox.                       |
| Bookshelf  | All 26 current books as front-facing covers; title/author search, category filters, cover/index switch, deep-linked details and correct browser history.            |
| Music      | Listening-room typography and palette around the existing atlas; clearer accessible names and small-screen centre, retained live catalogue and selection behaviour. |

The substantial alternative About uses a clickable specimen table. The substantial alternative Studio presents all nine paintings on a daylight salon wall. Both retain real content and working interactions. See REVIEW.md for trade-offs, provenance and removal instructions; AUDIT.md records the other directions and unfinished work found before editing.

## Checks and evidence

- Clean Gatsby build passed on Node 24.15.0.
- Full browser suite: 87 passed, 1 intentionally skipped draft-only catalogue test.
- After the final Studio refinement: all 16 relevant Studio, accessibility, image-loading and dialog checks passed.
- Axe: 22 scans across ten routes at 390/1440px and the two detail dialogs, no detected violations under the selected WCAG A/AA rules.
- Reflow: main sections at 320/768px; full route screenshots and overflow checks at 390/1440px.
- Keyboard: skip link, dialog containment, Escape, focus return, next/previous paintings and bookshelf history.
- Touch: emulated phone interactions for both collections.
- Reduced motion and Experience print action/styles passed.
- Music unit tests: 23 passed. CV unit tests: 14 passed. CV validation: 60 stable IDs; generated exports current.
- Source CV, book data and article bodies were not changed.
- Deployed About, review hub, both alternatives and Music were opened in the browser. Alternative Studio next/previous interaction worked; Music loaded real catalogue artwork and artist/track details.
- Authenticated deployed HTTP checks: About and Studio 200; canonical LeetCode and Spotify API routes 200. LeetCode reported live data. Spotify returned 10 artist and 30 track records.
- Draft asset URLs fox.jpg and pottery.jpg returned 404. Published-only output and no draft text were checked.
- Initial deployed HTML referenced the same stylesheet hash as the clean local build. Deployment metadata matched the isolated branch and commit.
- git diff --check passed.
- npm audit reported 0 critical, 48 high, 33 moderate and 7 low advisories. No broad dependency upgrade was attempted as part of this design change.

Local evidence is in output/reinvention (ignored by Git): route screenshots, full-page and viewport images, studio-dialog-1280.png, studio-dialog-390.png, experience-print.png, deployed Preview screenshots and Lighthouse JSON. Key images: preview-home.png, --390-viewport.png, -studio--390-viewport.png, -review-about-table--1440.png and -review-studio-daylight--1440.png.

## Performance and remaining uncertainty

Lighthouse mobile laboratory results on the local clean build: About 99 (LCP 2.1 s, CLS 0, TBT 50 ms); refined Studio 84 (LCP 4.5 s, CLS 0, TBT 50 ms). Studio previously scored 61. Machine benchmark variation means that score improvement cannot be attributed solely to the code change. The intermediate painting set is approximately 40% smaller than the large set and is selected on the tested mobile profile. Original large derivatives remain available.

Studio's slower simulated image paint is a remaining performance concern for a later release review. These are local simulated results, not field measurements or deployment performance scores.

Not verified: Safari/Firefox, physical phones, a full screen-reader audit, printed PDF pagination, production-target deployment behaviour and field Core Web Vitals. Review-route production suppression has a unit check; no production deployment was performed. A clean release build with the review switch disabled still needs to be checked when a release is explicitly authorised.

The moving Music atlas can still produce dense labels in some positions; its existing spatial model was preserved. It remains a candidate for a focused later readability pass.

Two obstacles were resolved: early interaction before hydration, and Gatsby incremental HTML referencing a stale CSS hash locally and on Vercel. Controls now wait for hydration; regression tests cover the interactions and generated stylesheet consistency. Every build now cleans Gatsby's cache and output before compiling, preventing mixed stylesheet versions across routes. One Studio Lighthouse attempt lost the test-owned local server; the reported measurements use a persistent server.

Usage was monitored. The last check showed approximately 57% remaining. No reset was redeemed; the specifically authorised reset remains unused.

## Recommendation

Keep the integrated identity and editorial About. Keep the unboxed Blog, Projects and Experience and the new collection interactions. Compare dark Studio with daylight before choosing its final treatment. Revise Studio performance and review the remaining dependency advisories before a production release. Discard fake book spines and additional decorative room metaphors.

Recommended next action: open the protected review hub and choose the preferred About and Studio treatments. Advance to a separate release review only after that decision; do not flip production from this experiment automatically.

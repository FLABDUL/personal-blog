# Website working context

Read `README.md` and `docs/cloud.md` when starting a Cloud task.
Read `docs/reinvention/HANDOFF.md` before resuming redesign work.

- Edit canonical content, not generated CV exports or Gatsby output.
- Only public information belongs in this public repository.
- Preserve private Studio inputs and unfinished work in other laptop worktrees.
- Cloud setup: `bash scripts/cloud/setup.sh`.
- Verification: `bash scripts/cloud/verify.sh`; add relevant browser checks for
  UI changes and follow `tests/smoke/AGENTS.md`.
- Keep setup changes on their own branch; merging `main` can publish the site.

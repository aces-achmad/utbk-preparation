---
title: Implement submit, scoring, and result review
labels:
  - ready-for-agent
type: issue
status: open
---

# Implement submit, scoring, and result review

## Parent

- [0001-prd-utbk-preparation-v1.md](./0001-prd-utbk-preparation-v1.md)

## What to build

Implement final `Attempt` submission, scoring, and result review from runtime snapshots. This slice should make submit behavior idempotent, evaluate results immediately, enforce unanswered-question behavior, produce the final result summary, and expose per-question review that compares user selections to the correct answer set.

## Acceptance criteria

- [ ] Submitting an `Attempt` finalizes scoring immediately and produces the agreed counts and percentage summary.
- [ ] Submit behaves consistently if repeated for an already submitted `Attempt`.
- [ ] Result review reads from runtime snapshots and exposes per-question correctness and detailed answer comparison behavior, including `multiple_response`.

## Blocked by

- [0007-implement-practice-start-or-resume-and-attempt-runtime-snapshots.md](./0007-implement-practice-start-or-resume-and-attempt-runtime-snapshots.md)
- [0008-implement-autosave-and-in-progress-attempt-state.md](./0008-implement-autosave-and-in-progress-attempt-state.md)

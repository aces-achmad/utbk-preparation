---
title: Implement autosave and in-progress Attempt state
labels:
  - ready-for-agent
type: issue
status: open
---

# Implement autosave and in-progress Attempt state

## Parent

- [0001-prd-utbk-preparation-v1.md](./0001-prd-utbk-preparation-v1.md)

## What to build

Implement debounced autosave for in-progress `Attempts` keyed by `Attempt` plus question snapshot identity. This slice should persist selected option keys, support the single answer shape for both scoped question types, expose sync status back to the UI, and enforce the rule that autosave cannot continue after submit. The result should make an in-progress `Attempt` resilient and resumable.

## Acceptance criteria

- [ ] Practice answers are persisted through autosave using the agreed `Attempt` plus snapshot identity seam.
- [ ] The frontend can represent saving, saved, and error states while keeping local answer state available during sync problems.
- [ ] Autosave requests for already submitted `Attempts` are rejected explicitly and do not mutate final state.

## Blocked by

- [0007-implement-practice-start-or-resume-and-attempt-runtime-snapshots.md](./0007-implement-practice-start-or-resume-and-attempt-runtime-snapshots.md)

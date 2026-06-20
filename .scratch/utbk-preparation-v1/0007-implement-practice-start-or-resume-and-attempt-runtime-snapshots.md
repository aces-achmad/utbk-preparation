---
title: Implement practice start-or-resume and Attempt runtime snapshots
labels:
  - ready-for-agent
type: issue
status: open
---

# Implement practice start-or-resume and Attempt runtime snapshots

## Parent

- [0001-prd-utbk-preparation-v1.md](./0001-prd-utbk-preparation-v1.md)

## What to build

Implement the end-to-end ability to begin or resume practice from a `QuestionPackage`, while creating isolated runtime snapshots for the resulting `Attempt`. This slice should enforce the single active `Attempt` rule per package, create the per-question runtime snapshot structure, preserve randomized runtime order, and expose the practice payload needed for the frontend question-per-page flow.

## Acceptance criteria

- [ ] The backend provides a start-or-resume behavior that either returns an active `Attempt` or creates a new one for a valid package.
- [ ] A new `Attempt` creates stable runtime snapshots per question that isolate prompt, explanation, options, and randomized order from active content.
- [ ] The frontend can open a valid package into a question-per-page practice flow using the returned attempt runtime payload.

## Blocked by

- [0006-build-question-package-authoring-and-validity-rules.md](./0006-build-question-package-authoring-and-validity-rules.md)

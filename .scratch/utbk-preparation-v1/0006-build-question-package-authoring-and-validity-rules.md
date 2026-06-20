---
title: Build Question Package authoring and validity rules
labels:
  - ready-for-agent
type: issue
status: open
---

# Build Question Package authoring and validity rules

## Parent

- [0001-prd-utbk-preparation-v1.md](./0001-prd-utbk-preparation-v1.md)

## What to build

Implement `QuestionPackage` authoring as a manual curated workflow. This slice should support package creation, editing, canonical ordering, duplicate behavior, archive behavior, publish/draft semantics, and persisted invalidation rules based on underlying `Questions`. The backend should also become authoritative for whether a package is available for practice.

## Acceptance criteria

- [ ] `QuestionPackage` authoring supports manual composition from valid `published` `Questions`, canonical ordering, duplicate behavior, and archive behavior.
- [ ] Package publish semantics and invalidation rules are enforced according to the documented domain rules.
- [ ] The backend exposes authoritative package availability for practice rather than leaving the rule to the frontend.

## Blocked by

- [0005-deliver-subject-topic-and-question-bank-authoring.md](./0005-deliver-subject-topic-and-question-bank-authoring.md)

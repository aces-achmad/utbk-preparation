---
title: Build canonical import contract and preview workflow
labels:
  - ready-for-agent
type: issue
status: open
---

# Build canonical import contract and preview workflow

## Parent

- [0001-prd-utbk-preparation-v1.md](./0001-prd-utbk-preparation-v1.md)

## What to build

Implement the canonical JSON import seam and `ImportSession` preview workflow end to end. This slice should accept a JSON file upload, persist the raw payload as an `ImportSession`, validate the canonical contract, compute insert/update preview results, expose detailed validation errors, and support the preview state needed before commit. The slice should also establish the reconfirmation semantics for sensitive updates to `published` `Questions`.

## Acceptance criteria

- [ ] The system accepts canonical JSON upload as a new `ImportSession` and stores the raw payload for audit.
- [ ] Preview validation reports valid versus invalid records, insert versus update counts, and detailed field-level errors.
- [ ] Sensitive preview outcomes involving updates to `published` `Questions` are surfaced in a way that can require reconfirmation before commit in later slices.

## Blocked by

- [0002-scaffold-monorepo-and-runtime-foundation.md](./0002-scaffold-monorepo-and-runtime-foundation.md)
- [0003-implement-single-admin-auth-and-session-protection.md](./0003-implement-single-admin-auth-and-session-protection.md)

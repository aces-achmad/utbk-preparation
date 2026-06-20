---
title: Deliver Subject, Topic, and Question bank authoring
labels:
  - ready-for-agent
type: issue
status: open
---

# Deliver Subject, Topic, and Question bank authoring

## Parent

- [0001-prd-utbk-preparation-v1.md](./0001-prd-utbk-preparation-v1.md)

## What to build

Deliver the authoring experience for `Subject`, `Topic`, and `Question` management. This slice should cover imported and manual content paths, search and filtering, server-side pagination, manual create/edit/archive/duplicate behavior, stable identity handling, publish validation, and bulk `Question` actions. The result should be a usable question bank workbench for a single internal `Admin`.

## Acceptance criteria

- [ ] `Subject`, `Topic`, and `Question` data can be created, read, edited, archived, and filtered according to the v1 domain rules.
- [ ] `Question` authoring supports the scoped question types, publish rules, and generated internal `external_id` behavior for manual creation.
- [ ] Question bank list views use server-side pagination and support the agreed authoring filters and safe bulk actions.

## Blocked by

- [0002-scaffold-monorepo-and-runtime-foundation.md](./0002-scaffold-monorepo-and-runtime-foundation.md)
- [0003-implement-single-admin-auth-and-session-protection.md](./0003-implement-single-admin-auth-and-session-protection.md)
- [0004-build-canonical-import-contract-and-preview-workflow.md](./0004-build-canonical-import-contract-and-preview-workflow.md)

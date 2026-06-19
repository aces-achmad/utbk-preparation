# Project Rules

## Agent skills

### Issue tracker

This repo currently uses local markdown planning and review documents inside the repository. No GitHub or GitLab issue workflow is assumed yet. See `docs/agents/issue-tracker.md`.

### Triage labels

Canonical labels follow the default engineering-skill vocabulary and should be used consistently if an issue tracker is added later. See `docs/agents/triage-labels.md`.

### Domain docs

This repo uses a single-context layout with one root `CONTEXT.md` and ADRs under `docs/adr/`. See `docs/agents/domain.md`.

## Working rules

This repository is for a simple UTBK preparation web application using:

- `Bun`
- `Hono`
- `Drizzle ORM`
- `MySQL`
- `Vue 3`
- `Vite`
- `PrimeVue`
- `Tailwind CSS`
- `Pinia`
- `Zod`

Project work should follow these rules:

1. Clarify the product shape before adding infrastructure.
2. Keep the first release focused on bank soal, paket latihan, attempt, result, and explanation.
3. Treat domain language as a first-class artifact. When terms change, update `CONTEXT.md` in the same change.
4. Record only hard-to-reverse architectural decisions in `docs/adr/`.
5. Prefer deep modules with small interfaces and concentrated business logic.
6. Keep frontend and backend separated by a clean HTTP JSON seam.
7. Put validation close to boundaries using `Zod`.
8. Design database changes through explicit Drizzle schema and migrations.
9. Avoid framework-driven complexity until the product review is complete.
10. Optimize for maintainability and reviewability over premature completeness.

## Codebase design rules

1. Keep business rules in modules, not in route handlers or UI event handlers.
2. Route handlers should parse input, call a module, and map the result to HTTP responses.
3. Stores should coordinate UI state, not own business rules that belong in the backend.
4. Shared code must exist only when it reduces duplication without coupling unrelated layers.
5. A seam is real only when something actually varies across it. Do not add indirection early.
6. Tests should primarily exercise module interfaces, not internal implementation details.

## Domain modeling rules

1. Use the terms in `CONTEXT.md` consistently.
2. Do not use one term for two concepts, or two terms for one concept, without updating the glossary.
3. Separate `Question`, `QuestionPackage`, and `Attempt` clearly in both code and docs.
4. Keep `CONTEXT.md` free of implementation details. It is a glossary, not a spec.

## Delivery rules

1. Prefer iterative vertical slices.
2. Every substantial change should leave the repo easier to understand than before.
3. Documentation changes are required when domain terms, architecture direction, or operator workflow changes.
4. Docker is for local runtime orchestration in this phase, not for production-hardening yet.

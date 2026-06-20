---
title: PRD - UTBK Preparation v1
labels:
  - ready-for-agent
type: prd
status: draft
---

# PRD - UTBK Preparation v1

## Problem Statement

The user needs an internal web application for self-study that can reliably manage a UTBK question bank, ingest questions through a strict canonical JSON contract, assemble `Question Packages`, run `Attempts`, and preserve consistent reviewable results over time. The main problem is not just storing questions, but creating a stable end-to-end learning workflow where content ingestion, authoring corrections, package curation, and practice results do not drift or corrupt each other.

## Solution

Build an internal, login-protected web application with one `Admin` account that supports an import-first content workflow, minimal web authoring, manual `Question Package` curation, and a stable `Attempt` runtime model. The app will accept canonical JSON uploads through `Import Sessions`, validate and preview changes before commit, allow light authoring corrections in the UI, and let the same internal user complete practice sessions with autosave, randomized delivery, final scoring, and per-question review from runtime snapshots.

## User Stories

1. As an `Admin`, I want to log in to the application, so that access to the internal question bank is protected on the network.
2. As an `Admin`, I want to change the default password from the UI, so that bootstrap credentials do not remain operational forever.
3. As an `Admin`, I want the application to reject invalid configuration at startup, so that broken runtime assumptions fail early.
4. As an `Admin`, I want to upload one canonical JSON file as an `Import Session`, so that question content enters the system through a single controlled seam.
5. As an `Admin`, I want the uploaded payload to be stored as audit data, so that I can trace exactly what content was submitted.
6. As an `Admin`, I want import preview validation before commit, so that I can inspect the effect of an import before it changes active content.
7. As an `Admin`, I want import preview to show `insert` versus `update`, so that I understand whether content is new or revising existing `Questions`.
8. As an `Admin`, I want import validation errors reported per record and per field, so that I can fix the upstream normalization process efficiently.
9. As an `Admin`, I want failed imports to remain visible as `Import Sessions`, so that unsuccessful ingestion attempts are still auditable.
10. As an `Admin`, I want import commit to revalidate from stored payload, so that final content changes are based on current system state rather than stale preview assumptions.
11. As an `Admin`, I want commit to require reconfirmation when it would update `published` `Questions`, so that sensitive content changes are never applied silently.
12. As an `Admin`, I want `Subject` and `Topic` to have stable slugs, so that import identity and authoring filters remain consistent over time.
13. As an `Admin`, I want `Question` identity to be driven by global stable `external_id`, so that imports can safely upsert content.
14. As an `Admin`, I want `Question` content to support `single_choice` and `multiple_response`, so that the bank reflects the chosen scope of UTBK practice.
15. As an `Admin`, I want `true_false` content to be modeled as `single_choice`, so that question type branching remains minimal.
16. As an `Admin`, I want `multiple_response` to require multiple correct options, so that it remains domain-distinct from `single_choice`.
17. As an `Admin`, I want `published` `Questions` to require explanations, so that any practice-ready content is also study-ready.
18. As an `Admin`, I want to create `Questions` manually in the UI, so that small additions do not require rebuilding an import payload.
19. As an `Admin`, I want manual `Questions` to receive generated internal `external_id` values, so that identity remains stable without manual ID entry.
20. As an `Admin`, I want to edit `Questions` in the UI except for `external_id`, so that I can correct content without breaking import identity.
21. As an `Admin`, I want to duplicate a `Question`, so that I can create variants quickly from an existing base item.
22. As an `Admin`, I want to archive a `Question` instead of deleting it permanently, so that historical references and auditability are preserved.
23. As an `Admin`, I want archived `Questions` to stay visible through authoring filters, so that I can inspect and manage past content.
24. As an `Admin`, I want `Subject` and `Topic` to be creatable manually, so that UI authoring remains viable alongside import-first ingestion.
25. As an `Admin`, I want `Subject` and `Topic` archiving to be blocked when active `Questions` still depend on them, so that classification data does not become dangling.
26. As an `Admin`, I want to search and filter `Questions` by `status`, `Subject`, `Topic`, `difficulty`, text, and `external_id`, so that the bank remains usable as it grows.
27. As an `Admin`, I want server-side pagination for question lists, so that authoring scales without moving all data into the browser.
28. As an `Admin`, I want bulk `Question` actions for safe operational tasks, so that repetitive content management work is reduced.
29. As an `Admin`, I want bulk publish to succeed partially with item-level feedback, so that valid content is not blocked by unrelated invalid items.
30. As an `Admin`, I want `Question Packages` to be curated manually, so that practice sets are intentionally assembled rather than derived by opaque rules.
31. As an `Admin`, I want `Question Packages` to hold only `published` `Questions`, so that practice content is always based on valid study material.
32. As an `Admin`, I want `Question Packages` to support mixed `Subject` and `Topic` composition, so that I can create both focused and mixed practice sets.
33. As an `Admin`, I want `Question Packages` to keep canonical order, so that the authored sequence is reviewable and meaningful even if runtime randomization exists.
34. As an `Admin`, I want `Question Package` composition changes to force the package back to `draft`, so that active practice sets are not silently altered.
35. As an `Admin`, I want `Question Packages` to be duplicable, so that I can produce new practice variants from an existing package.
36. As an `Admin`, I want archived or invalid `Question Packages` hidden from practice availability, so that only safe packages can be started.
37. As an `Admin`, I want package invalidation to happen immediately when underlying `Questions` become unsuitable, so that the practice list never exposes unsafe sets.
38. As an `Admin`, I want package availability to be decided by the backend, so that frontend views cannot misapply domain rules.
39. As an `Admin`, I want one endpoint to start or resume practice for a `Question Package`, so that frontend logic stays thin.
40. As an `Admin`, I want only one active `Attempt` per `Question Package`, so that autosave and resume behavior remain deterministic.
41. As an `Admin`, I want reopening a package with an active `Attempt` to resume that `Attempt`, so that in-progress study is not duplicated.
42. As an `Admin`, I want to retry a completed `Question Package` with a new `Attempt`, so that I can practice the same set repeatedly.
43. As an `Admin`, I want each `Attempt` to use a runtime snapshot of the package’s effective content, so that historical review remains stable even if active content changes later.
44. As an `Admin`, I want randomized question order and randomized option order stored in the `Attempt`, so that review matches exactly what was seen during practice.
45. As an `Admin`, I want one question per page in practice with free navigation, so that the study flow stays focused but flexible.
46. As an `Admin`, I want autosave while answering, so that work is not lost if I navigate or refresh unexpectedly.
47. As an `Admin`, I want autosave to fail clearly and block submit until resynced, so that result integrity is not compromised by hidden sync errors.
48. As an `Admin`, I want unanswered questions to be submittable with confirmation, so that I can end practice deliberately even if not every item is filled.
49. As an `Admin`, I want unanswered questions scored as incorrect, so that scoring remains simple and explicit.
50. As an `Admin`, I want `multiple_response` review to show what I picked versus what was correct, so that I can learn from partial mistakes even with all-or-nothing scoring.
51. As an `Admin`, I want attempt submission to evaluate results immediately, so that final scores and review are available without deferred processing.
52. As an `Admin`, I want submit to behave idempotently in practice, so that double-clicks or repeated requests do not corrupt attempt state.
53. As an `Admin`, I want autosave requests after submit to be rejected explicitly, so that completed attempts stay immutable.
54. As an `Admin`, I want practice results to show totals, counts, and percentage, so that study outcomes are easy to understand without weighted scoring.
55. As an `Admin`, I want per-question review to read from runtime snapshots instead of active `Question` records, so that explanations and options match the original attempt.
56. As an implementer, I want the primary test seam to be the backend API and backend service behavior, so that business rules can be verified independently of frontend rendering details.
57. As an implementer, I want `Vitest` with MySQL-backed tests to be part of the architecture, so that domain and repository behavior are exercised against realistic persistence.
58. As an implementer, I want module boundaries for `auth`, `imports`, `subjects`, `topics`, `questions`, `packages`, and `attempts`, so that code ownership and orchestration stay clear.
59. As an implementer, I want DTO mapping separated from database models, so that API shape can evolve without leaking persistence structure.
60. As an implementer, I want environment validation and structured logs from the beginning, so that operations stay debuggable in an internal network setup.

## Implementation Decisions

- The product is internal-only for v1, with one network-accessible `Admin` account and no multi-user workflow.
- The main seams are backend API behavior, `Import Session` preview/commit behavior, and `Attempt` runtime behavior.
- Content ingestion is `import-first` through a strict canonical JSON contract with `schema_version`, self-contained `Subject`, `Topic`, and `Question` data, and stable IDs.
- `packages/shared` is allowed for canonical schemas and DTOs, but not for backend domain rules or frontend-local form schemas.
- The frontend is a Vue SPA. The backend is a Hono API. MySQL is the system of record. These are kept as separate components in a light monorepo.
- The backend architecture is layered as routes → services → repositories. Routes do not call repositories directly.
- `repositories` are persistence-only. Domain behavior remains in service methods.
- Transactions are owned at the use-case level, not hidden inside repositories.
- Backend module boundaries are explicit: `auth`, `imports`, `subjects`, `topics`, `questions`, `packages`, and `attempts`.
- `ImportSession` is a first-class domain concept that begins at preview time, stores raw payload, stores preview output, and survives failure.
- Import preview and commit are separate use cases. Commit revalidates from the stored payload against current database state.
- Sensitive import updates to `published` `Questions` require explicit user confirmation, and stale or changed preview state can force reconfirmation.
- `Question` types are limited to `single_choice` and `multiple_response`. `true_false` is modeled as `single_choice`.
- `multiple_response` uses all-or-nothing scoring and must have at least two correct options.
- `Subject` and `Topic` use stable slugs. `Question` uses stable global `external_id`.
- `Question` and `QuestionPackage` use draft/published publish semantics. Archiving is soft-delete style, not hard deletion.
- `QuestionPackage` validity is persisted as domain state rather than recomputed ad hoc in the frontend.
- `Attempt` runtime is isolated from active content through per-question snapshots that capture prompt, explanation, options, and randomized order.
- `AttemptAnswer` stores selected option keys in a single shape that works for both supported question types.
- Autosave is debounced and keyed by `Attempt` plus question snapshot identity.
- Auth uses application-owned cookie sessions stored in MySQL rather than JWT-first auth.
- The frontend uses route-level domain structure, a single app shell, `fetch` wrapper networking, and `Pinia` only for truly global state.
- The API uses REST JSON with plural resource names and explicit action endpoints where the use case is command-heavy.
- Response envelopes are minimal and consistent. Errors use explicit codes and are mapped centrally.
- Search/filter list behavior is server-driven, with server-side pagination and simple MySQL `LIKE` search for v1.
- Testing centers on backend service and repository behavior with `Vitest` and a dedicated MySQL test environment.
- Development runtime assumes `Nginx Proxy Manager` provides the primary single-origin browser access path, with the frontend using relative `/api` calls.

## Testing Decisions

- Good tests should verify externally observable behavior at the highest stable seam, not internal implementation details.
- The primary test seam is backend API and backend service behavior because the highest-risk rules live in import validation, publish semantics, package invalidation, attempt orchestration, autosave persistence, and scoring.
- Backend service tests and repository tests are both required, but both run against real MySQL rather than fake persistence.
- The MySQL test environment is separate from the dev database, and the test suite applies migrations itself before execution.
- Reset/seed should happen per suite to keep state explicit and reproducible.
- Frontend component tests are not the first priority for v1; frontend correctness initially relies more on type checking, manual review, and stable backend behavior.

## Out of Scope

- Public or multi-tenant access
- Multi-user role management
- OAuth or social login
- Rich text explanations
- Media/image support in question content
- Math rendering support
- Timer-based tryout mode
- Weighted scoring
- Dashboard analytics across many `Attempts`
- Automatic package generation from topic filters
- Drag-and-drop package ordering as a v1 requirement
- Full-text search
- Production-grade image build pipeline as a prerequisite for starting work

## Further Notes

- The current document set in `docs/draft-review/` and `docs/adr/` should be treated as the design basis for this PRD.
- The next step after this PRD is issue breakdown into tracer-bullet vertical slices that each cut through schema, API, UI, and tests end to end.
- The implementation should respect ADRs for canonical JSON import, runtime snapshots, and single-admin cookie-session auth.

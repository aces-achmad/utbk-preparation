## UTBK Preparation

Current state:

- product and architecture review docs are available under `docs/draft-review/`;
- ADRs are available under `docs/adr/`;
- issue tracker artifacts are available under `.scratch/utbk-preparation-v1/`;
- scaffold work starts from issue `0002`.

Scaffold runtime:

- `apps/backend`: Hono + Bun skeleton with env validation and structured logs
- `apps/frontend`: Vue + Vite skeleton with single-origin `/api` assumption
- `packages/shared`: small shared boundary for canonical schemas and DTO types
- `infra/docker`: Docker Compose dev runtime

Testing foundation:

- `Vitest` is the backend test runner
- backend tests target a dedicated test database on the existing MySQL server
- test startup applies SQL migrations and resets state per suite

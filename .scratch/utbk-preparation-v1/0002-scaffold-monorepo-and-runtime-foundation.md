---
title: Scaffold monorepo and runtime foundation
labels:
  - ready-for-agent
type: issue
status: open
---

# Scaffold monorepo and runtime foundation

## Parent

- [0001-prd-utbk-preparation-v1.md](./0001-prd-utbk-preparation-v1.md)

## What to build

Create the implementation foundation for the UTBK Preparation v1 monorepo. This slice should establish the light monorepo structure, runtime composition, shared package boundary, backend/frontend startup shape, environment validation, structured logging baseline, and Docker-based development runtime assumptions. The result should be a runnable but mostly empty system skeleton that respects the architecture decisions already recorded.

## Acceptance criteria

- [ ] The repo has the target top-level structure for `apps/frontend`, `apps/backend`, `packages/shared`, and `infra/docker`.
- [ ] Backend and frontend both start with validated environment configuration and a minimal structured logging baseline.
- [ ] Docker dev runtime is defined for frontend, backend, and MySQL in a way that matches the single-origin reverse-proxy assumption.

## Blocked by

None - can start immediately

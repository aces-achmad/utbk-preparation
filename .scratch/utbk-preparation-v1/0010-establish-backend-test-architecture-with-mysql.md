---
title: Establish backend test architecture with MySQL
labels:
  - ready-for-agent
type: issue
status: open
---

# Establish backend test architecture with MySQL

## Parent

- [0001-prd-utbk-preparation-v1.md](./0001-prd-utbk-preparation-v1.md)

## What to build

Establish the backend testing foundation using `Vitest` and a dedicated MySQL test environment. This slice should make MySQL-backed service and repository tests a first-class part of the repo, with migration application owned by the test runtime and reproducible reset/seed behavior per suite. Later slices should be able to extend this foundation rather than invent new test patterns.

## Acceptance criteria

- [ ] The repo can run backend tests with `Vitest` against a dedicated MySQL test service rather than the dev database.
- [ ] Test startup applies migrations automatically and provides a reproducible reset or seed strategy per suite.
- [ ] The test structure clearly supports both backend service tests and repository tests as separate layers on top of the same MySQL-backed foundation.

## Blocked by

- [0002-scaffold-monorepo-and-runtime-foundation.md](./0002-scaffold-monorepo-and-runtime-foundation.md)

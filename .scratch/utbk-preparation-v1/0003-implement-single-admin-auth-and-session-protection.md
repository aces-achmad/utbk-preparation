---
title: Implement single-admin auth and session protection
labels:
  - ready-for-agent
type: issue
status: open
---

# Implement single-admin auth and session protection

## Parent

- [0001-prd-utbk-preparation-v1.md](./0001-prd-utbk-preparation-v1.md)

## What to build

Implement the v1 authentication model for one internal `Admin` account using username/password login and MySQL-backed cookie sessions. The slice should cover bootstrap credentials, login, logout, password change, session persistence, and route protection for the application shell so that all authoring and practice behavior sits behind a valid session.

## Acceptance criteria

- [ ] A bootstrap `Admin` account can be created from environment-backed startup behavior without hardcoding credentials in source.
- [ ] The backend supports login, logout, password change, and MySQL-backed cookie session persistence.
- [ ] Frontend routes for the application are protected and require a valid session before authoring or practice flows can be used.

## Blocked by

- [0002-scaffold-monorepo-and-runtime-foundation.md](./0002-scaffold-monorepo-and-runtime-foundation.md)

# Docker Dev Runtime

This scaffold expects:

- `mysql`, `backend`, and `frontend` to run in Docker during development;
- `mysql_test` to be available for backend test execution;
- browser access to go through an external reverse proxy such as `Nginx Proxy Manager`;
- the frontend to call the API through the relative path `/api`.

Important:

- opening the frontend directly on the raw Vite port is not the primary workflow assumption;
- if the reverse proxy is not in place, `/api` routing will need an alternate setup.

Testing notes:

- backend tests use `Vitest` against `mysql_test`, not the main dev database;
- copy `apps/backend/.env.test.example` into a local `.env.test` flow as needed when running tests outside Docker;
- test startup is responsible for applying migrations before execution.

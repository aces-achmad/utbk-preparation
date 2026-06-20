# Docker Dev Runtime

This scaffold expects:

- `mysql`, `backend`, and `frontend` to run in Docker during development;
- browser access to go through an external reverse proxy such as `Nginx Proxy Manager`;
- the frontend to call the API through the relative path `/api`.

Important:

- opening the frontend directly on the raw Vite port is not the primary workflow assumption;
- if the reverse proxy is not in place, `/api` routing will need an alternate setup.

Testing notes:

- backend tests use `Vitest` against a dedicated test database on the existing MySQL server;
- set `TEST_DATABASE_NAME` or `TEST_DATABASE_URL` when you need to override the default `${MYSQL_DATABASE}_test` naming convention;
- test startup is responsible for applying migrations before execution.

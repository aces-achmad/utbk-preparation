# Single-admin cookie session for v1

Version 1 will use one internal `Admin` account with username/password login and server-backed cookie sessions for the whole application. We chose this over no-auth, JWT-first auth, or full multi-user role management because the app is network-accessible, needs basic protection immediately, and is still a single-user internal system where session-based auth is simpler and more honest about the actual operational risk.

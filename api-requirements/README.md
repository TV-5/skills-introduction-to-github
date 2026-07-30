# API Requirements

A page for gathering API requirements from multiple stakeholders in
parallel. Each stakeholder (e.g. the payload/data owner, the security team,
a third-party integration owner) gets a private link to fill in just their
section. Once every section for an API requirement is submitted, a
consolidated API Requirements Document can be generated.

## Structure

- `server/` — Express + SQLite API (`better-sqlite3`). Owns the data model
  for requirements, section definitions, and per-stakeholder section
  assignments, plus the document generator.
- `client/` — Vite + React single-page app: a dashboard, a form to create a
  requirement and assign stakeholders per section, the per-stakeholder fill
  form (accessed via a private link), and the compiled document view.

## Admin access

Creating requirements, assigning stakeholders, and viewing/managing them
(dashboard, requirement detail, document) require an admin login - a single
shared password, not per-user accounts. The per-stakeholder `/fill/:token`
links are intentionally unauthenticated: they're the thing you hand out.

Configure it via environment variables before running the server:

- `ADMIN_PASSWORD` — the shared admin password. Defaults to `admin` outside
  of production (with a startup warning); **required** when
  `NODE_ENV=production`.
- `SESSION_SECRET` — signs the session cookie. If unset, a random one is
  generated at boot (sessions won't survive a server restart).
- `CLIENT_ORIGIN` — the exact origin allowed to make credentialed CORS
  requests to the API. Defaults to `http://localhost:5173` (the Vite dev
  server). Set this if the client is ever served from a different origin
  than the API.

Login attempts are rate-limited (5 bad attempts locks an IP out for a
minute) and the password is compared with a constant-time hash comparison.

## Running locally

```bash
cd api-requirements
ADMIN_PASSWORD=your-password npm run dev:server   # http://localhost:4000
npm run dev:client                                # http://localhost:5173 (proxies /api to :4000)
```

(`npm install` first, if you haven't - installs both workspaces.)

Open http://localhost:5173, log in with the admin password, create a new
requirement, and assign a stakeholder to each section you want filled. Send
each stakeholder their generated `/fill/:token` link (no login needed on
their end) so they can fill and submit their section independently. Once
every assigned section is marked complete, the "View Document" link on the
requirement page becomes available.

From the requirement's detail page you can also, as admin: edit a
stakeholder's name/email in place, regenerate a section's link (revokes the
old one and resets that section's progress - useful if a link leaked or
needs resending), or delete the whole requirement.

## Testing

```bash
cd api-requirements/server && npm test   # node --test + supertest
cd api-requirements/client && npm test   # vitest + React Testing Library
```

The server suite is the thorough one (auth, every route, edge cases like
duplicate/invalid input, cross-tenant access, and the completed-section
immutability guard). The client suite is small and targeted at the handful
of client-only behaviors (validation UX, the auth redirect gate) rather than
exhaustive component coverage.

## Adding a new section

Section definitions (label, description, and field schema) live in
`server/src/sections.js` and are seeded into the `sections` table on
startup — add an entry there to introduce a new stakeholder section without
any UI changes.

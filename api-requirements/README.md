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

## Running locally

```bash
cd api-requirements
npm install                # installs both workspaces
npm run dev:server         # http://localhost:4000
npm run dev:client         # http://localhost:5173 (proxies /api to :4000)
```

Open http://localhost:5173, create a new requirement, assign a stakeholder
to each section you want filled, then open the generated `/fill/:token`
links (one per stakeholder) to fill and submit each section independently.
Once every assigned section is marked complete, the "View Document" link on
the requirement page becomes available.

## Adding a new section

Section definitions (label, description, and field schema) live in
`server/src/sections.js` and are seeded into the `sections` table on
startup — add an entry there to introduce a new stakeholder section without
any UI changes.

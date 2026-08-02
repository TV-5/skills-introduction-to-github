import { Router } from "express";
import { db } from "../db.js";

export const assignmentsRouter = Router();

function getByToken(token) {
  return db
    .prepare(
      `SELECT sa.*, s.key AS section_key, s.label AS section_label, s.description AS section_description,
              s.field_schema AS section_field_schema,
              r.name AS requirement_name, r.id AS requirement_id
       FROM section_assignments sa
       JOIN sections s ON s.id = sa.section_id
       JOIN api_requirements r ON r.id = sa.api_requirement_id
       WHERE sa.access_token = ?`
    )
    .get(token);
}

function serialize(row) {
  return {
    requirementId: row.requirement_id,
    requirementName: row.requirement_name,
    sectionKey: row.section_key,
    sectionLabel: row.section_label,
    sectionDescription: row.section_description,
    fields: JSON.parse(row.section_field_schema),
    stakeholderName: row.stakeholder_name,
    stakeholderEmail: row.stakeholder_email,
    status: row.status,
    data: JSON.parse(row.data),
    completedAt: row.completed_at,
  };
}

// GET /api/assignments/:token - fetch the one section this stakeholder owns
assignmentsRouter.get("/assignments/:token", (req, res) => {
  const row = getByToken(req.params.token);
  if (!row) return res.status(404).json({ error: "invalid link" });
  res.json(serialize(row));
});

// PUT /api/assignments/:token - save a draft or submit as complete
assignmentsRouter.put("/assignments/:token", (req, res) => {
  const row = getByToken(req.params.token);
  if (!row) return res.status(404).json({ error: "invalid link" });
  if (row.status === "completed") {
    return res.status(409).json({ error: "section already submitted" });
  }

  const { data, submit } = req.body ?? {};
  if (typeof data !== "object" || data === null || Array.isArray(data)) {
    return res.status(400).json({ error: "data must be an object" });
  }

  const fields = JSON.parse(row.section_field_schema);

  if (submit) {
    const missing = fields.filter((f) => f.required && !String(data[f.key] ?? "").trim());
    if (missing.length > 0) {
      return res.status(400).json({
        error: "missing required fields",
        missingFields: missing.map((f) => f.label),
      });
    }

    const invalidSelect = fields.filter(
      (f) => f.type === "select" && data[f.key] && !f.options.includes(data[f.key])
    );
    if (invalidSelect.length > 0) {
      return res.status(400).json({
        error: "invalid value for a select field",
        invalidFields: invalidSelect.map((f) => f.label),
      });
    }
  }

  const status = submit ? "completed" : "in_progress";
  db.prepare(
    `UPDATE section_assignments
     SET data = ?, status = ?, completed_at = ?
     WHERE access_token = ?`
  ).run(JSON.stringify(data), status, submit ? new Date().toISOString() : null, req.params.token);

  res.json(serialize(getByToken(req.params.token)));
});

import { Router } from "express";
import { nanoid } from "nanoid";
import { db } from "../db.js";
import { generateDocument } from "../documentGenerator.js";
import { generatePdf } from "../pdfGenerator.js";
import { requireAdmin } from "../adminAuth.js";
import { sendMail } from "../mailer.js";
import { computeEditWindow } from "../editWindow.js";

const CLIENT_ORIGIN = process.env.CLIENT_ORIGIN || "http://localhost:5173";

export const requirementsRouter = Router();
// Every route here manages requirement/stakeholder data (names, emails, links) - admin only.
// requireAdmin is applied per-route (not via router.use) because this router is mounted at the
// same "/api" prefix as the public, token-gated assignments router - a router-wide `.use()` would
// run for every "/api/*" request Express forwards into this router, including ones meant for
// the other router, and block them before they ever get there.

function isValidEmail(email) {
  return /^\S+@\S+$/.test(email);
}

function getSectionRows() {
  return db.prepare("SELECT * FROM sections ORDER BY sort_order").all();
}

function assignmentsForRequirement(requirementId) {
  return db
    .prepare(
      `SELECT sa.*, s.key AS section_key, s.label AS section_label, s.description AS section_description,
              s.sort_order AS section_sort_order, s.field_schema AS section_field_schema
       FROM section_assignments sa
       JOIN sections s ON s.id = sa.section_id
       WHERE sa.api_requirement_id = ?
       ORDER BY s.sort_order`
    )
    .all(requirementId);
}

function serializeRequirement(requirement, assignments) {
  const sections = assignments.map((row) => {
    const { editableUntil, canEdit } = computeEditWindow(row.status, row.completed_at);
    return {
      assignmentId: row.id,
      sectionId: row.section_id,
      key: row.section_key,
      label: row.section_label,
      description: row.section_description,
      stakeholderName: row.stakeholder_name,
      stakeholderEmail: row.stakeholder_email,
      status: row.status,
      completedAt: row.completed_at,
      lastEditedAt: row.last_edited_at,
      editableUntil,
      canEdit,
      accessToken: row.access_token,
    };
  });
  const totalSections = sections.length;
  const completedSections = sections.filter((s) => s.status === "completed").length;
  return {
    id: requirement.id,
    name: requirement.name,
    description: requirement.description,
    createdAt: requirement.created_at,
    totalSections,
    completedSections,
    isComplete: totalSections > 0 && completedSections === totalSections,
    sections,
  };
}

// GET /api/sections - available section definitions, for building the assignment form
requirementsRouter.get("/sections", requireAdmin, (req, res) => {
  const sections = getSectionRows().map((s) => ({
    id: s.id,
    key: s.key,
    label: s.label,
    description: s.description,
    fields: JSON.parse(s.field_schema),
  }));
  res.json(sections);
});

// GET /api/requirements - list with progress summary
requirementsRouter.get("/requirements", requireAdmin, (req, res) => {
  // created_at has only second resolution, so requirements created within the same
  // second need a tiebreaker to sort predictably as "most recently created first".
  const requirements = db.prepare("SELECT * FROM api_requirements ORDER BY created_at DESC, id DESC").all();
  const result = requirements.map((r) => serializeRequirement(r, assignmentsForRequirement(r.id)));
  res.json(result);
});

// POST /api/requirements - create a requirement with per-section stakeholder assignments
requirementsRouter.post("/requirements", requireAdmin, (req, res) => {
  const { name, description, assignments } = req.body ?? {};

  if (!name || typeof name !== "string" || !name.trim()) {
    return res.status(400).json({ error: "name is required" });
  }
  if (name.trim().length > 200) {
    return res.status(400).json({ error: "name must be 200 characters or fewer" });
  }
  if (typeof description === "string" && description.length > 5000) {
    return res.status(400).json({ error: "description must be 5000 characters or fewer" });
  }
  if (!Array.isArray(assignments) || assignments.length === 0) {
    return res.status(400).json({ error: "at least one section assignment is required" });
  }

  const sectionsByKey = new Map(getSectionRows().map((s) => [s.key, s]));
  const seenSectionKeys = new Set();

  for (const a of assignments) {
    if (!sectionsByKey.has(a.sectionKey)) {
      return res.status(400).json({ error: `unknown section: ${a.sectionKey}` });
    }
    if (seenSectionKeys.has(a.sectionKey)) {
      return res.status(400).json({ error: `duplicate section: ${a.sectionKey}` });
    }
    seenSectionKeys.add(a.sectionKey);

    if (!a.stakeholderName?.trim() || !a.stakeholderEmail?.trim()) {
      return res.status(400).json({ error: "each assignment needs a stakeholder name and email" });
    }
    if (a.stakeholderName.trim().length > 200) {
      return res.status(400).json({ error: "stakeholder name must be 200 characters or fewer" });
    }
    if (!isValidEmail(a.stakeholderEmail.trim()) || a.stakeholderEmail.trim().length > 320) {
      return res.status(400).json({ error: `invalid stakeholder email: ${a.stakeholderEmail}` });
    }
  }

  const insertRequirement = db.prepare(
    "INSERT INTO api_requirements (name, description) VALUES (?, ?)"
  );
  const insertAssignment = db.prepare(`
    INSERT INTO section_assignments
      (api_requirement_id, section_id, stakeholder_name, stakeholder_email, access_token)
    VALUES (?, ?, ?, ?, ?)
  `);

  const requirementId = db.transaction(() => {
    const { lastInsertRowid } = insertRequirement.run(name.trim(), description ?? "");
    for (const a of assignments) {
      const section = sectionsByKey.get(a.sectionKey);
      insertAssignment.run(lastInsertRowid, section.id, a.stakeholderName.trim(), a.stakeholderEmail.trim(), nanoid(24));
    }
    return lastInsertRowid;
  })();

  const requirement = db.prepare("SELECT * FROM api_requirements WHERE id = ?").get(requirementId);
  res.status(201).json(serializeRequirement(requirement, assignmentsForRequirement(requirementId)));
});

// GET /api/requirements/:id - single requirement with section statuses
requirementsRouter.get("/requirements/:id", requireAdmin, (req, res) => {
  const requirement = db.prepare("SELECT * FROM api_requirements WHERE id = ?").get(req.params.id);
  if (!requirement) return res.status(404).json({ error: "not found" });
  res.json(serializeRequirement(requirement, assignmentsForRequirement(requirement.id)));
});

// Shared by the markdown and PDF document routes: loads the requirement, confirms every
// section is completed, and shapes assignments into what the generators expect. Returns
// { error } (already-sent res aside) when not ready, or { requirement, sectionsWithAssignments }.
function loadCompiledDocumentInputs(req, res) {
  const requirement = db.prepare("SELECT * FROM api_requirements WHERE id = ?").get(req.params.id);
  if (!requirement) {
    res.status(404).json({ error: "not found" });
    return null;
  }

  const assignments = assignmentsForRequirement(requirement.id);
  const incomplete = assignments.filter((a) => a.status !== "completed");
  if (assignments.length === 0 || incomplete.length > 0) {
    res.status(409).json({
      error: "document not ready - all sections must be completed first",
      incompleteSections: incomplete.map((a) => a.section_label),
    });
    return null;
  }

  const sectionsWithAssignments = assignments.map((row) => ({
    label: row.section_label,
    fields: JSON.parse(row.section_field_schema),
    assignment: {
      stakeholderName: row.stakeholder_name,
      stakeholderEmail: row.stakeholder_email,
      data: JSON.parse(row.data),
    },
  }));

  return { requirement, sectionsWithAssignments };
}

// GET /api/requirements/:id/document - compiled document, only once every section is completed
requirementsRouter.get("/requirements/:id/document", requireAdmin, (req, res) => {
  const inputs = loadCompiledDocumentInputs(req, res);
  if (!inputs) return;

  const markdown = generateDocument(inputs.requirement, inputs.sectionsWithAssignments);
  res.json({ markdown });
});

// GET /api/requirements/:id/document/pdf - same document, formatted as a downloadable PDF
requirementsRouter.get("/requirements/:id/document/pdf", requireAdmin, (req, res) => {
  const inputs = loadCompiledDocumentInputs(req, res);
  if (!inputs) return;

  res.setHeader("Content-Type", "application/pdf");
  res.setHeader(
    "Content-Disposition",
    `attachment; filename="api-requirements-${inputs.requirement.id}.pdf"`
  );
  const doc = generatePdf(inputs.requirement, inputs.sectionsWithAssignments);
  doc.pipe(res);
  doc.end();
});

function getAssignment(requirementId, assignmentId) {
  return db
    .prepare("SELECT * FROM section_assignments WHERE id = ? AND api_requirement_id = ?")
    .get(assignmentId, requirementId);
}

// PATCH /api/requirements/:id/assignments/:assignmentId - fix a stakeholder's name/email
// without touching their progress or link.
requirementsRouter.patch("/requirements/:id/assignments/:assignmentId", requireAdmin, (req, res) => {
  const assignment = getAssignment(req.params.id, req.params.assignmentId);
  if (!assignment) return res.status(404).json({ error: "not found" });

  const { stakeholderName, stakeholderEmail } = req.body ?? {};
  if (!stakeholderName?.trim() || !stakeholderEmail?.trim()) {
    return res.status(400).json({ error: "stakeholderName and stakeholderEmail are required" });
  }
  if (stakeholderName.trim().length > 200) {
    return res.status(400).json({ error: "stakeholder name must be 200 characters or fewer" });
  }
  if (!isValidEmail(stakeholderEmail.trim()) || stakeholderEmail.trim().length > 320) {
    return res.status(400).json({ error: `invalid stakeholder email: ${stakeholderEmail}` });
  }

  db.prepare("UPDATE section_assignments SET stakeholder_name = ?, stakeholder_email = ? WHERE id = ?").run(
    stakeholderName.trim(),
    stakeholderEmail.trim(),
    assignment.id
  );

  const requirement = db.prepare("SELECT * FROM api_requirements WHERE id = ?").get(req.params.id);
  res.json(serializeRequirement(requirement, assignmentsForRequirement(requirement.id)));
});

// POST /api/requirements/:id/assignments/:assignmentId/regenerate-link - revoke the old link and
// issue a new one. Used when a link leaked or needs to be re-sent; resets that section's progress.
requirementsRouter.post("/requirements/:id/assignments/:assignmentId/regenerate-link", requireAdmin, (req, res) => {
  const assignment = getAssignment(req.params.id, req.params.assignmentId);
  if (!assignment) return res.status(404).json({ error: "not found" });

  db.prepare(
    "UPDATE section_assignments SET access_token = ?, status = 'pending', data = '{}', completed_at = NULL, last_edited_at = NULL WHERE id = ?"
  ).run(nanoid(24), assignment.id);

  const requirement = db.prepare("SELECT * FROM api_requirements WHERE id = ?").get(req.params.id);
  res.json(serializeRequirement(requirement, assignmentsForRequirement(requirement.id)));
});

// POST /api/requirements/:id/assignments/:assignmentId/send-link - email the stakeholder (or an
// admin-supplied override address) their private fill link.
requirementsRouter.post("/requirements/:id/assignments/:assignmentId/send-link", requireAdmin, async (req, res) => {
  const assignment = getAssignment(req.params.id, req.params.assignmentId);
  if (!assignment) return res.status(404).json({ error: "not found" });

  const email = (req.body?.email ?? assignment.stakeholder_email ?? "").trim();
  if (!isValidEmail(email) || email.length > 320) {
    return res.status(400).json({ error: `invalid email: ${email}` });
  }

  const requirement = db.prepare("SELECT * FROM api_requirements WHERE id = ?").get(req.params.id);
  const link = `${CLIENT_ORIGIN}/fill/${assignment.access_token}`;
  const text = `Here's the link to the API requirement ${requirement.id}, please fill it: ${link}`;

  try {
    await sendMail({ to: email, subject: `API Requirement #${requirement.id}: ${requirement.name}`, text });
  } catch (err) {
    return res.status(502).json({ error: err.message });
  }

  res.json({ sent: true, to: email });
});

// DELETE /api/requirements/:id - remove a requirement and all of its section assignments
requirementsRouter.delete("/requirements/:id", requireAdmin, (req, res) => {
  const result = db.prepare("DELETE FROM api_requirements WHERE id = ?").run(req.params.id);
  if (result.changes === 0) return res.status(404).json({ error: "not found" });
  res.status(204).end();
});

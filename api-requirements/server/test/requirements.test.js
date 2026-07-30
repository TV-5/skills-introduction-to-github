import test, { beforeEach } from "node:test";
import assert from "node:assert/strict";
import { freshApp, request, loginAgent, resetDb } from "./helpers.js";

const app = freshApp();
let agent;

beforeEach(async () => {
  resetDb();
  agent = await loginAgent(app);
});

async function createRequirement(overrides = {}) {
  return agent.post("/api/requirements").send({
    name: "Orders API",
    description: "Internal",
    assignments: [
      { sectionKey: "payload", stakeholderName: "Alice", stakeholderEmail: "alice@example.com" },
      { sectionKey: "security", stakeholderName: "Bob", stakeholderEmail: "bob@example.com" },
    ],
    ...overrides,
  });
}

test("GET /api/sections lists 5 sections in sort_order, security has the expected classification options", async () => {
  const res = await agent.get("/api/sections");
  assert.equal(res.status, 200);
  assert.equal(res.body.length, 5);
  assert.deepEqual(
    res.body.map((s) => s.key),
    ["overview", "payload", "security", "nfr", "integration"]
  );
  const security = res.body.find((s) => s.key === "security");
  const classification = security.fields.find((f) => f.key === "data_classification");
  assert.deepEqual(classification.options, ["Public", "Internal", "Confidential", "Restricted"]);
});

test("GET /api/sections unauthenticated -> 401", async () => {
  const res = await request(app).get("/api/sections");
  assert.equal(res.status, 401);
});

test("POST /api/requirements happy path", async () => {
  const res = await createRequirement();
  assert.equal(res.status, 201);
  assert.equal(res.body.totalSections, 2);
  assert.equal(res.body.completedSections, 0);
  assert.equal(res.body.isComplete, false);
  for (const section of res.body.sections) {
    assert.equal(section.accessToken.length, 24);
    assert.equal(section.status, "pending");
  }
});

test("POST /api/requirements blank/whitespace/absent name -> 400", async () => {
  for (const name of [undefined, "", "   "]) {
    const res = await createRequirement({ name });
    assert.equal(res.status, 400);
  }
});

test("POST /api/requirements name over 200 chars -> 400", async () => {
  const res = await createRequirement({ name: "x".repeat(201) });
  assert.equal(res.status, 400);
});

test("POST /api/requirements description over 5000 chars -> 400", async () => {
  const res = await createRequirement({ description: "x".repeat(5001) });
  assert.equal(res.status, 400);
});

test("POST /api/requirements empty/absent assignments -> 400", async () => {
  for (const assignments of [undefined, []]) {
    const res = await createRequirement({ assignments });
    assert.equal(res.status, 400);
  }
});

test("POST /api/requirements unknown sectionKey -> 400, no row created", async () => {
  const res = await createRequirement({
    assignments: [{ sectionKey: "not-a-real-section", stakeholderName: "A", stakeholderEmail: "a@example.com" }],
  });
  assert.equal(res.status, 400);
  assert.match(res.body.error, /unknown section/);

  const list = await agent.get("/api/requirements");
  assert.equal(list.body.length, 0);
});

test("POST /api/requirements duplicate sectionKey in one request -> 400", async () => {
  const res = await createRequirement({
    assignments: [
      { sectionKey: "payload", stakeholderName: "Alice", stakeholderEmail: "alice@example.com" },
      { sectionKey: "payload", stakeholderName: "Carol", stakeholderEmail: "carol@example.com" },
    ],
  });
  assert.equal(res.status, 400);
  assert.match(res.body.error, /duplicate section/);
});

test("POST /api/requirements blank stakeholder name/email -> 400", async () => {
  const res = await createRequirement({
    assignments: [{ sectionKey: "payload", stakeholderName: "  ", stakeholderEmail: "a@example.com" }],
  });
  assert.equal(res.status, 400);
});

test("POST /api/requirements malformed stakeholder email -> 400", async () => {
  const res = await createRequirement({
    assignments: [{ sectionKey: "payload", stakeholderName: "Alice", stakeholderEmail: "not-an-email" }],
  });
  assert.equal(res.status, 400);
  assert.match(res.body.error, /invalid stakeholder email/);
});

test("GET /api/requirements orders by created_at desc", async () => {
  await createRequirement({ name: "First" });
  await createRequirement({ name: "Second" });
  const res = await agent.get("/api/requirements");
  assert.equal(res.body.length, 2);
  assert.equal(res.body[0].name, "Second");
  assert.equal(res.body[1].name, "First");
});

test("GET /api/requirements/:id happy path and 404 for nonexistent id", async () => {
  const created = await createRequirement();
  const res = await agent.get(`/api/requirements/${created.body.id}`);
  assert.equal(res.status, 200);
  assert.equal(res.body.name, "Orders API");

  const missing = await agent.get("/api/requirements/999999");
  assert.equal(missing.status, 404);
});

test("GET /api/requirements/:id with a non-numeric id -> 404, not 500", async () => {
  const res = await agent.get("/api/requirements/abc");
  assert.equal(res.status, 404);
});

test("GET /api/requirements/:id/document: 409 while incomplete, 200 once all sections are completed, 404 for unknown id", async () => {
  const created = await createRequirement();

  const missing = await agent.get("/api/requirements/999999/document");
  assert.equal(missing.status, 404);

  const notReady = await agent.get(`/api/requirements/${created.body.id}/document`);
  assert.equal(notReady.status, 409);
  assert.deepEqual(notReady.body.incompleteSections.sort(), ["Payload & Data Model", "Security & Compliance"].sort());

  for (const section of created.body.sections) {
    const requiredData =
      section.key === "payload"
        ? { request_payload: "{id}", response_payload: "{id,status}" }
        : { auth_mechanism: "OAuth2", authorization_model: "RBAC", data_classification: "Confidential" };
    await request(app).put(`/api/assignments/${section.accessToken}`).send({ data: requiredData, submit: true });
  }

  const ready = await agent.get(`/api/requirements/${created.body.id}/document`);
  assert.equal(ready.status, 200);
  assert.match(ready.body.markdown, /# API Requirements Document: Orders API/);
  assert.match(ready.body.markdown, /Provided by Alice \(alice@example\.com\)/);
  assert.match(ready.body.markdown, /Provided by Bob \(bob@example\.com\)/);
});

test("PATCH assignment: happy path updates name/email, leaves status/token/data untouched", async () => {
  const created = await createRequirement();
  const section = created.body.sections[0];

  const res = await agent
    .patch(`/api/requirements/${created.body.id}/assignments/${section.assignmentId}`)
    .send({ stakeholderName: "Alice Updated", stakeholderEmail: "alice.updated@example.com" });

  assert.equal(res.status, 200);
  const updated = res.body.sections.find((s) => s.assignmentId === section.assignmentId);
  assert.equal(updated.stakeholderName, "Alice Updated");
  assert.equal(updated.stakeholderEmail, "alice.updated@example.com");
  assert.equal(updated.status, "pending");
  assert.equal(updated.accessToken, section.accessToken);
});

test("PATCH assignment: blank fields -> 400, nonexistent assignment -> 404", async () => {
  const created = await createRequirement();
  const section = created.body.sections[0];

  const blank = await agent
    .patch(`/api/requirements/${created.body.id}/assignments/${section.assignmentId}`)
    .send({ stakeholderName: "", stakeholderEmail: "a@example.com" });
  assert.equal(blank.status, 400);

  const missing = await agent
    .patch(`/api/requirements/${created.body.id}/assignments/999999`)
    .send({ stakeholderName: "A", stakeholderEmail: "a@example.com" });
  assert.equal(missing.status, 404);
});

test("PATCH/regenerate-link scope by requirement id: cross-tenant assignmentId -> 404", async () => {
  const reqA = await createRequirement({ name: "Requirement A" });
  const reqB = await createRequirement({ name: "Requirement B" });
  const assignmentFromB = reqB.body.sections[0].assignmentId;

  const patchRes = await agent
    .patch(`/api/requirements/${reqA.body.id}/assignments/${assignmentFromB}`)
    .send({ stakeholderName: "X", stakeholderEmail: "x@example.com" });
  assert.equal(patchRes.status, 404);

  const regenRes = await agent.post(`/api/requirements/${reqA.body.id}/assignments/${assignmentFromB}/regenerate-link`);
  assert.equal(regenRes.status, 404);
});

test("POST regenerate-link resets a completed section and kills the old token", async () => {
  const created = await createRequirement();
  const section = created.body.sections[0];

  await request(app)
    .put(`/api/assignments/${section.accessToken}`)
    .send({ data: { request_payload: "a", response_payload: "b" }, submit: true });

  const res = await agent.post(`/api/requirements/${created.body.id}/assignments/${section.assignmentId}/regenerate-link`);
  assert.equal(res.status, 200);
  const updated = res.body.sections.find((s) => s.assignmentId === section.assignmentId);
  assert.notEqual(updated.accessToken, section.accessToken);
  assert.equal(updated.status, "pending");
  assert.equal(updated.completedAt, null);

  const oldTokenRes = await request(app).get(`/api/assignments/${section.accessToken}`);
  assert.equal(oldTokenRes.status, 404);
});

test("DELETE /api/requirements/:id removes the requirement and cascades to assignments", async () => {
  const created = await createRequirement();
  const token = created.body.sections[0].accessToken;

  const del = await agent.delete(`/api/requirements/${created.body.id}`);
  assert.equal(del.status, 204);

  const getRes = await agent.get(`/api/requirements/${created.body.id}`);
  assert.equal(getRes.status, 404);

  const tokenRes = await request(app).get(`/api/assignments/${token}`);
  assert.equal(tokenRes.status, 404);
});

test("DELETE /api/requirements/:id nonexistent -> 404", async () => {
  const res = await agent.delete("/api/requirements/999999");
  assert.equal(res.status, 404);
});

test("every requirements route rejects requests with no admin session", async () => {
  const created = await createRequirement();
  const section = created.body.sections[0];

  const cases = [
    () => request(app).get("/api/sections"),
    () => request(app).get("/api/requirements"),
    () => request(app).post("/api/requirements").send({ name: "x", assignments: [] }),
    () => request(app).get(`/api/requirements/${created.body.id}`),
    () => request(app).get(`/api/requirements/${created.body.id}/document`),
    () =>
      request(app)
        .patch(`/api/requirements/${created.body.id}/assignments/${section.assignmentId}`)
        .send({ stakeholderName: "x", stakeholderEmail: "x@example.com" }),
    () => request(app).post(`/api/requirements/${created.body.id}/assignments/${section.assignmentId}/regenerate-link`),
    () => request(app).delete(`/api/requirements/${created.body.id}`),
  ];

  for (const makeRequest of cases) {
    const res = await makeRequest();
    assert.equal(res.status, 401);
  }
});

test("unknown /api route -> JSON 404", async () => {
  const res = await agent.get("/api/does-not-exist");
  assert.equal(res.status, 404);
  assert.equal(res.body.error, "not found");
});

import test, { beforeEach } from "node:test";
import assert from "node:assert/strict";
import { freshApp, request, loginAgent, resetDb } from "./helpers.js";

const app = freshApp();
let agent;

beforeEach(async () => {
  resetDb();
  agent = await loginAgent(app);
});

async function createPayloadAssignment() {
  const created = await agent.post("/api/requirements").send({
    name: "Orders API",
    assignments: [{ sectionKey: "payload", stakeholderName: "Alice", stakeholderEmail: "alice@example.com" }],
  });
  return created.body.sections[0];
}

async function createSecurityAssignment() {
  const created = await agent.post("/api/requirements").send({
    name: "Orders API",
    assignments: [{ sectionKey: "security", stakeholderName: "Bob", stakeholderEmail: "bob@example.com" }],
  });
  return created.body.sections[0];
}

test("GET /api/assignments/:token happy path and unknown token", async () => {
  const section = await createPayloadAssignment();

  const res = await request(app).get(`/api/assignments/${section.accessToken}`);
  assert.equal(res.status, 200);
  assert.equal(res.body.sectionKey, "payload");
  assert.deepEqual(res.body.data, {});

  const missing = await request(app).get("/api/assignments/not-a-real-token");
  assert.equal(missing.status, 404);
  assert.equal(missing.body.error, "invalid link");
});

test("draft save (submit omitted) sets status to in_progress without required-field validation", async () => {
  const section = await createPayloadAssignment();

  const res = await request(app).put(`/api/assignments/${section.accessToken}`).send({ data: {} });
  assert.equal(res.status, 200);
  assert.equal(res.body.status, "in_progress");
  assert.equal(res.body.completedAt, null);
});

test("submit:true with all required fields completes the section", async () => {
  const section = await createPayloadAssignment();

  const res = await request(app)
    .put(`/api/assignments/${section.accessToken}`)
    .send({ data: { request_payload: "a", response_payload: "b" }, submit: true });

  assert.equal(res.status, 200);
  assert.equal(res.body.status, "completed");
  assert.ok(res.body.completedAt);
});

test("submit:true missing a required field -> 400 with missingFields, status not advanced", async () => {
  const section = await createPayloadAssignment();

  const res = await request(app)
    .put(`/api/assignments/${section.accessToken}`)
    .send({ data: { request_payload: "a" }, submit: true });

  assert.equal(res.status, 400);
  assert.deepEqual(res.body.missingFields, ["Response payload"]);

  const stillPending = await request(app).get(`/api/assignments/${section.accessToken}`);
  assert.equal(stillPending.body.status, "pending");
});

test("submit:true with a whitespace-only required field is treated as missing", async () => {
  const section = await createPayloadAssignment();

  const res = await request(app)
    .put(`/api/assignments/${section.accessToken}`)
    .send({ data: { request_payload: "a", response_payload: "   " }, submit: true });

  assert.equal(res.status, 400);
  assert.deepEqual(res.body.missingFields, ["Response payload"]);
});

test("submit:true with an out-of-range select value is rejected", async () => {
  const section = await createSecurityAssignment();

  const res = await request(app)
    .put(`/api/assignments/${section.accessToken}`)
    .send({
      data: {
        auth_mechanism: "OAuth2",
        authorization_model: "RBAC",
        data_classification: "Top Secret",
      },
      submit: true,
    });

  assert.equal(res.status, 400);
  assert.deepEqual(res.body.invalidFields, ["Data classification"]);
});

test("data must be a plain object: null, missing, string, number, and array are all rejected", async () => {
  const section = await createPayloadAssignment();

  const nullRes = await request(app).put(`/api/assignments/${section.accessToken}`).send({ data: null });
  assert.equal(nullRes.status, 400);

  const missingRes = await request(app).put(`/api/assignments/${section.accessToken}`).send({});
  assert.equal(missingRes.status, 400);

  const stringRes = await request(app).put(`/api/assignments/${section.accessToken}`).send({ data: "nope" });
  assert.equal(stringRes.status, 400);

  const numberRes = await request(app).put(`/api/assignments/${section.accessToken}`).send({ data: 5 });
  assert.equal(numberRes.status, 400);

  const arrayRes = await request(app).put(`/api/assignments/${section.accessToken}`).send({ data: [] });
  assert.equal(arrayRes.status, 400);
});

test("PUT on an already-completed assignment is rejected and does not overwrite the data", async () => {
  const section = await createPayloadAssignment();

  await request(app)
    .put(`/api/assignments/${section.accessToken}`)
    .send({ data: { request_payload: "original", response_payload: "original" }, submit: true });

  const secondAttempt = await request(app)
    .put(`/api/assignments/${section.accessToken}`)
    .send({ data: { request_payload: "overwritten", response_payload: "overwritten" }, submit: true });
  assert.equal(secondAttempt.status, 409);

  const stillOriginal = await request(app).get(`/api/assignments/${section.accessToken}`);
  assert.equal(stillOriginal.body.data.request_payload, "original");
  assert.equal(stillOriginal.body.status, "completed");
});

test("PUT with an unknown token -> 404", async () => {
  const res = await request(app).put("/api/assignments/not-a-real-token").send({ data: {} });
  assert.equal(res.status, 404);
});

test("a token is dead immediately after its parent requirement is deleted", async () => {
  const section = await createPayloadAssignment();
  const listRes = await agent.get("/api/requirements");
  const requirementId = listRes.body[0].id;

  await agent.delete(`/api/requirements/${requirementId}`);

  const getRes = await request(app).get(`/api/assignments/${section.accessToken}`);
  assert.equal(getRes.status, 404);
});
